<?php
require_once __DIR__ . '/../models/Document.php';
require_once __DIR__ . '/../models/DocumentVersion.php';
require_once __DIR__ . '/../models/Project.php';
require_once __DIR__ . '/../models/ProjectMember.php';
require_once __DIR__ . '/../models/ActivityLog.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../config/config.php';

class DocumentController {
    private Document $model;
    private DocumentVersion $versionModel;
    private Project $projectModel;
    private ProjectMember $memberModel;
    private ActivityLog $log;
    private Notification $notif;

    public function __construct(PDO $db) {
        $this->model        = new Document($db);
        $this->versionModel = new DocumentVersion($db);
        $this->projectModel = new Project($db);
        $this->memberModel  = new ProjectMember($db);
        $this->log          = new ActivityLog($db);
        $this->notif        = new Notification($db);
    }

    // ─── Permission helpers ───────────────────────────────────────

    private function checkProjectAccess(array $auth, int $projectId): ?array {
        if ($auth['role'] === 'admin') return null; // admin has all
        $perms = $this->memberModel->getPermissions($projectId, $auth['id']);
        if (!$perms || !$perms['is_active']) Response::error('Access denied.', 403);
        return $perms;
    }

    private function requirePerm(array $auth, int $projectId, string $perm): void {
        if ($auth['role'] === 'admin') return;
        $perms = $this->memberModel->getPermissions($projectId, $auth['id']);
        if (!$perms || !$perms['is_active'] || !$perms[$perm]) {
            Response::error("You don't have '$perm' permission for this project.", 403);
        }
    }

    // ─── LIST ─────────────────────────────────────────────────────

    public function index(array $auth, int $projectId): void {
        $this->checkProjectAccess($auth, $projectId);
        $opts = [
            'page'      => (int)($_GET['page']      ?? 1),
            'per_page'  => (int)($_GET['per_page']  ?? DEFAULT_PAGE_SIZE),
            'search'    => trim($_GET['search']      ?? ''),
            'folder_id' => !empty($_GET['folder_id']) ? (int)$_GET['folder_id'] : null,
        ];
        $result = $this->model->getByProject($projectId, $opts);
        Response::paginate($result['rows'], $result['total'], $opts['page'], $opts['per_page']);
    }

    // ─── SHOW ─────────────────────────────────────────────────────

    public function show(array $auth, int $projectId, int $docId): void {
        $this->checkProjectAccess($auth, $projectId);
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);

        $this->model->incrementViews($docId);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'view_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title']]);
        Response::success($doc);
    }

    // ─── UPLOAD ───────────────────────────────────────────────────

    public function upload(array $auth, int $projectId): void {
        $this->requirePerm($auth, $projectId, 'can_upload');
        $project = $this->projectModel->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);

        if (empty($_FILES['file'])) Response::error('No file uploaded.', 400);
        $file = $_FILES['file'];

        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) Response::error('File upload error.', 400);
        if ($file['size'] > MAX_FILE_SIZE) Response::error('File exceeds maximum size of 50MB.', 400);

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!array_key_exists($ext, ALLOWED_FILE_TYPES)) {
            Response::error('File type not allowed.', 400);
        }

        // Generate unique filename
        $safeName  = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $newName   = $safeName . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
        $destDir   = UPLOAD_DIR . $projectId . '/';
        if (!is_dir($destDir)) mkdir($destDir, 0755, true);
        $destPath  = $destDir . $newName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) {
            Response::error('Failed to save file.', 500);
        }

        $title     = trim($_POST['title'] ?? '') ?: pathinfo($file['name'], PATHINFO_FILENAME);
        $folderId  = !empty($_POST['folder_id']) ? (int)$_POST['folder_id'] : null;
        $tags      = !empty($_POST['tags']) ? array_map('trim', explode(',', $_POST['tags'])) : [];

        $docId = $this->model->create([
            'project_id'   => $projectId,
            'folder_id'    => $folderId,
            'title'        => $title,
            'description'  => $_POST['description'] ?? null,
            'file_name'    => $file['name'],
            'file_path'    => 'uploads/documents/' . $projectId . '/' . $newName,
            'file_type'    => $ext,
            'file_size'    => $file['size'],
            'mime_type'    => $file['type'],
            'uploaded_by'  => $auth['id'],
            'access_level' => $_POST['access_level'] ?? 'project',
        ]);

        // Save tags
        if ($tags) $this->model->syncTags($docId, $tags);

        // Save initial version
        $this->versionModel->create([
            'document_id'    => $docId,
            'version_number' => 1,
            'file_name'      => $file['name'],
            'file_path'      => 'uploads/documents/' . $projectId . '/' . $newName,
            'file_size'      => $file['size'],
            'change_notes'   => 'Initial upload',
            'uploaded_by'    => $auth['id'],
        ]);

        // Notify all project members
        $members = $this->memberModel->getMembers($projectId);
        foreach ($members as $m) {
            if ($m['user_id'] != $auth['id']) {
                $this->notif->create([
                    'user_id'      => $m['user_id'],
                    'type'         => 'new_document',
                    'title'        => 'New Document Uploaded',
                    'message'      => "A new document \"{$title}\" was uploaded to {$project['name']}.",
                    'related_id'   => $docId,
                    'related_type' => 'document',
                ]);
            }
        }

        $this->log->log(['user_id' => $auth['id'], 'action' => 'upload_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $title]);
        Response::success($this->model->findById($docId), 'Document uploaded.', 201);
    }

    // ─── UPDATE INFO ──────────────────────────────────────────────

    public function update(array $auth, int $projectId, int $docId): void {
        $this->requirePerm($auth, $projectId, 'can_edit');
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $update = array_intersect_key($body, array_flip(['title','description','folder_id','access_level']));
        $this->model->update($docId, $update);

        if (isset($body['tags'])) {
            $tags = is_array($body['tags']) ? $body['tags'] : array_map('trim', explode(',', $body['tags']));
            $this->model->syncTags($docId, $tags);
        }

        $this->log->log(['user_id' => $auth['id'], 'action' => 'edit_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title']]);
        Response::success($this->model->findById($docId), 'Document updated.');
    }

    // ─── NEW VERSION ──────────────────────────────────────────────

    public function uploadVersion(array $auth, int $projectId, int $docId): void {
        $this->requirePerm($auth, $projectId, 'can_upload');
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);

        if (empty($_FILES['file'])) Response::error('No file uploaded.', 400);
        $file = $_FILES['file'];
        if ($file['error'] !== UPLOAD_ERR_OK) Response::error('File upload error.', 400);
        if ($file['size'] > MAX_FILE_SIZE) Response::error('File too large.', 400);

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!array_key_exists($ext, ALLOWED_FILE_TYPES)) Response::error('File type not allowed.', 400);

        $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
        $newName  = $safeName . '_v' . ($doc['version'] + 1) . '_' . time() . '.' . $ext;
        $destDir  = UPLOAD_DIR . $projectId . '/';
        if (!is_dir($destDir)) mkdir($destDir, 0755, true);
        $destPath = $destDir . $newName;

        if (!move_uploaded_file($file['tmp_name'], $destPath)) Response::error('Failed to save file.', 500);

        $newVersion = $doc['version'] + 1;
        $relPath    = 'uploads/documents/' . $projectId . '/' . $newName;

        // Update main document
        $this->model->update($docId, [
            'file_name' => $file['name'],
            'file_path' => $relPath,
            'file_type' => $ext,
            'file_size' => $file['size'],
            'mime_type' => $file['type'],
            'version'   => $newVersion,
        ]);

        $this->versionModel->create([
            'document_id'    => $docId,
            'version_number' => $newVersion,
            'file_name'      => $file['name'],
            'file_path'      => $relPath,
            'file_size'      => $file['size'],
            'change_notes'   => $_POST['change_notes'] ?? null,
            'uploaded_by'    => $auth['id'],
        ]);

        // Notify members
        $project = $this->projectModel->findById($projectId);
        $members = $this->memberModel->getMembers($projectId);
        foreach ($members as $m) {
            if ($m['user_id'] != $auth['id']) {
                $this->notif->create([
                    'user_id'      => $m['user_id'],
                    'type'         => 'document_updated',
                    'title'        => 'Document Updated',
                    'message'      => "\"{$doc['title']}\" has a new version (v{$newVersion}) in {$project['name']}.",
                    'related_id'   => $docId,
                    'related_type' => 'document',
                ]);
            }
        }

        $this->log->log(['user_id' => $auth['id'], 'action' => 'upload_version', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title'],
                         'metadata' => ['version' => $newVersion]]);
        Response::success($this->model->findById($docId), "Version $newVersion uploaded.");
    }

    public function getVersions(array $auth, int $projectId, int $docId): void {
        $this->checkProjectAccess($auth, $projectId);
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);
        Response::success($this->versionModel->getByDocument($docId));
    }

    // ─── DOWNLOAD ─────────────────────────────────────────────────

    public function download(array $auth, int $projectId, int $docId): void {
        $this->requirePerm($auth, $projectId, 'can_download');
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);

        // Build absolute path — file_path stored as 'uploads/documents/1/filename.ext'
        // __DIR__ = backend/controllers, so go up ONE level to reach backend/
        $backendRoot = realpath(__DIR__ . '/..');
        $filePath    = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $doc['file_path']);

        if (!file_exists($filePath)) {
            // Log for debugging
            error_log("Download 404: $filePath");
            Response::error('File not found on server.', 404);
        }

        $this->model->incrementDownloads($docId);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'download_document',
                         'entity_type' => 'document', 'entity_id' => $docId, 'entity_name' => $doc['title']]);

        // Clear any output buffers so file bytes aren't mixed with HTML
        while (ob_get_level()) ob_end_clean();

        header('Content-Description: File Transfer');
        header('Content-Type: ' . ($doc['mime_type'] ?: 'application/octet-stream'));
        header('Content-Disposition: attachment; filename="' . rawurlencode($doc['file_name']) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
        header('Pragma: public');
        header('Expires: 0');
        // Add CORS headers for download
        $origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173';
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Expose-Headers: Content-Disposition, Content-Length');

        readfile($filePath);
        exit();
    }

    public function downloadVersion(array $auth, int $projectId, int $docId, int $versionId): void {
        $this->requirePerm($auth, $projectId, 'can_download');
        $version = $this->versionModel->findById($versionId);
        if (!$version || $version['document_id'] != $docId) Response::error('Version not found.', 404);

        $backendRoot = realpath(__DIR__ . '/..');
        $filePath    = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $version['file_path']);
        if (!file_exists($filePath)) Response::error('File not found on server.', 404);

        while (ob_get_level()) ob_end_clean();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? 'http://localhost:5173';
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Expose-Headers: Content-Disposition, Content-Length');
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . rawurlencode($version['file_name']) . '"');
        header('Content-Transfer-Encoding: binary');
        header('Content-Length: ' . filesize($filePath));
        header('Cache-Control: must-revalidate');
        readfile($filePath);
        exit();
    }

    // ─── ARCHIVE / DELETE ─────────────────────────────────────────

    public function archive(array $auth, int $projectId, int $docId): void {
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);
        if ($auth['role'] !== 'admin') $this->requirePerm($auth, $projectId, 'can_delete');
        $this->model->archive($docId);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'archive_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title']]);
        Response::success(null, 'Document archived.');
    }

    public function restore(array $auth, int $projectId, int $docId): void {
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);
        $this->model->restore($docId);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'restore_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title']]);
        Response::success(null, 'Document restored.');
    }

    public function destroy(array $auth, int $projectId, int $docId): void {
        $doc = $this->model->findById($docId);
        if (!$doc || $doc['project_id'] != $projectId) Response::error('Document not found.', 404);
        $filePath = $this->model->delete($docId);
        if ($filePath) {
            $backendRoot = realpath(__DIR__ . '/..');
            $abs = $backendRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $filePath);
            if (file_exists($abs)) @unlink($abs);
        }
        $this->log->log(['user_id' => $auth['id'], 'action' => 'delete_document', 'entity_type' => 'document',
                         'entity_id' => $docId, 'entity_name' => $doc['title']]);
        Response::success(null, 'Document deleted.');
    }

    public function getArchived(array $auth, int $projectId): void {
        $project = $this->projectModel->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        Response::success($this->model->getArchivedByProject($projectId));
    }

    public function stats(array $auth): void {
        Response::success($this->model->getStats());
    }

    public function search(array $auth): void {
        $keyword = trim($_GET['q'] ?? '');
        if (!$keyword) Response::error('Search keyword required.', 400);
        $page    = max(1, (int)($_GET['page'] ?? 1));
        $results = $this->model->search($keyword, $auth['id'], $auth['role'] === 'admin', $page);
        Response::success($results);
    }
}
