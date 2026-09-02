<?php
require_once __DIR__ . '/../models/Project.php';
require_once __DIR__ . '/../models/ProjectMember.php';
require_once __DIR__ . '/../models/Folder.php';
require_once __DIR__ . '/../models/ActivityLog.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../config/config.php';

class ProjectController {
    private Project $model;
    private ProjectMember $memberModel;
    private Folder $folderModel;
    private ActivityLog $log;
    private Notification $notif;
    private User $userModel;

    public function __construct(PDO $db) {
        $this->model       = new Project($db);
        $this->memberModel = new ProjectMember($db);
        $this->folderModel = new Folder($db);
        $this->log         = new ActivityLog($db);
        $this->notif       = new Notification($db);
        $this->userModel   = new User($db);
    }

    // ─── PROJECTS ────────────────────────────────────────────────

    public function index(array $auth): void {
        if ($auth['role'] === 'admin') {
            $page    = max(1, (int)($_GET['page']     ?? 1));
            $perPage = min(100, (int)($_GET['per_page'] ?? DEFAULT_PAGE_SIZE));
            $search  = trim($_GET['search'] ?? '');
            $status  = trim($_GET['status'] ?? '');
            $result  = $this->model->getAll($page, $perPage, $search, $status);
            Response::paginate($result['rows'], $result['total'], $page, $perPage);
        } else {
            $projects = $this->model->getForUser($auth['id']);
            Response::success($projects);
        }
    }

    public function show(array $auth, int $id): void {
        $project = $this->model->findById($id);
        if (!$project) Response::error('Project not found.', 404);

        if ($auth['role'] !== 'admin' && !$this->memberModel->isMember($id, $auth['id'])) {
            Response::error('Access denied.', 403);
        }

        $project['folders'] = $this->folderModel->getByProject($id);
        if ($auth['role'] !== 'admin') {
            $project['permissions'] = $this->memberModel->getPermissions($id, $auth['id']);
        }
        Response::success($project);
    }

    public function store(array $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $v = new Validator();
        $v->required('name', $body['name'] ?? null)
          ->required('code', $body['code'] ?? null)
          ->maxLength('code', $body['code'] ?? '', 50);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        if ($this->model->codeExists($body['code'])) Response::error('Project code already exists.', 409);

        $id = $this->model->create([
            'name'        => $body['name'],
            'code'        => $body['code'],
            'description' => $body['description'] ?? null,
            'category'    => $body['category']    ?? null,
            'start_date'  => $body['start_date']  ?? null,
            'end_date'    => $body['end_date']     ?? null,
            'status'      => $body['status']       ?? 'active',
            'created_by'  => $auth['id'],
        ]);

        // Create default folders
        $defaultFolders = ['Documents', 'Reports', 'Requirements', 'Designs', 'Presentations', 'Other'];
        foreach ($defaultFolders as $fname) {
            $this->folderModel->create(['project_id' => $id, 'name' => $fname, 'created_by' => $auth['id']]);
        }

        $this->log->log(['user_id' => $auth['id'], 'action' => 'create_project', 'entity_type' => 'project',
                         'entity_id' => $id, 'entity_name' => $body['name']]);
        Response::success($this->model->findById($id), 'Project created.', 201);
    }

    public function update(array $auth, int $id): void {
        $project = $this->model->findById($id);
        if (!$project) Response::error('Project not found.', 404);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!empty($body['code']) && $this->model->codeExists($body['code'], $id))
            Response::error('Project code already exists.', 409);

        $this->model->update($id, array_intersect_key($body, array_flip(
            ['name','code','description','category','start_date','end_date','status']
        )));
        $this->log->log(['user_id' => $auth['id'], 'action' => 'update_project', 'entity_type' => 'project',
                         'entity_id' => $id, 'entity_name' => $project['name']]);
        Response::success($this->model->findById($id), 'Project updated.');
    }

    public function archive(array $auth, int $id): void {
        $project = $this->model->findById($id);
        if (!$project) Response::error('Project not found.', 404);
        $this->model->archive($id);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'archive_project', 'entity_type' => 'project',
                         'entity_id' => $id, 'entity_name' => $project['name']]);
        Response::success(null, 'Project archived.');
    }

    public function restore(array $auth, int $id): void {
        $project = $this->model->findById($id);
        if (!$project) Response::error('Project not found.', 404);
        $this->model->restore($id);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'restore_project', 'entity_type' => 'project',
                         'entity_id' => $id, 'entity_name' => $project['name']]);
        Response::success(null, 'Project restored.');
    }

    public function destroy(array $auth, int $id): void {
        $project = $this->model->findById($id);
        if (!$project) Response::error('Project not found.', 404);
        $this->model->delete($id);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'delete_project', 'entity_type' => 'project',
                         'entity_id' => $id, 'entity_name' => $project['name']]);
        Response::success(null, 'Project deleted.');
    }

    // ─── MEMBERS ─────────────────────────────────────────────────

    public function getMembers(array $auth, int $projectId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        Response::success($this->memberModel->getMembers($projectId));
    }

    public function addMember(array $auth, int $projectId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator();
        $v->required('user_id', $body['user_id'] ?? null);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        $targetUser = $this->userModel->findById((int)$body['user_id']);
        if (!$targetUser) Response::error('User not found.', 404);

        $this->memberModel->addMember([
            'project_id'  => $projectId,
            'user_id'     => (int)$body['user_id'],
            'can_view'    => $body['can_view']     ?? 1,
            'can_upload'  => $body['can_upload']   ?? 0,
            'can_edit'    => $body['can_edit']      ?? 0,
            'can_download'=> $body['can_download'] ?? 0,
            'can_delete'  => $body['can_delete']   ?? 0,
            'granted_by'  => $auth['id'],
        ]);

        $this->notif->create([
            'user_id'      => (int)$body['user_id'],
            'type'         => 'project_access',
            'title'        => 'Project Access Granted',
            'message'      => "You have been given access to project: {$project['name']}",
            'related_id'   => $projectId,
            'related_type' => 'project',
        ]);

        $this->log->log(['user_id' => $auth['id'], 'action' => 'grant_access', 'entity_type' => 'project',
                         'entity_id' => $projectId, 'entity_name' => $project['name'],
                         'metadata' => ['target_user_id' => (int)$body['user_id']]]);
        Response::success($this->memberModel->getMembers($projectId), 'Member added.');
    }

    public function updateMember(array $auth, int $projectId, int $userId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $this->memberModel->updatePermissions($projectId, $userId, $body);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'update_permissions', 'entity_type' => 'project',
                         'entity_id' => $projectId, 'entity_name' => $project['name'],
                         'metadata' => ['target_user_id' => $userId]]);
        Response::success($this->memberModel->getMembers($projectId), 'Permissions updated.');
    }

    public function removeMember(array $auth, int $projectId, int $userId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        $this->memberModel->removeMember($projectId, $userId);

        $this->notif->create([
            'user_id'      => $userId,
            'type'         => 'project_access_removed',
            'title'        => 'Project Access Removed',
            'message'      => "Your access to project \"{$project['name']}\" has been removed.",
            'related_id'   => $projectId,
            'related_type' => 'project',
        ]);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'revoke_access', 'entity_type' => 'project',
                         'entity_id' => $projectId, 'entity_name' => $project['name'],
                         'metadata' => ['target_user_id' => $userId]]);
        Response::success(null, 'Member removed.');
    }

    // ─── STATS ───────────────────────────────────────────────────

    public function stats(array $auth): void {
        Response::success($this->model->getStats());
    }

    // ─── FOLDERS ─────────────────────────────────────────────────

    public function getFolders(array $auth, int $projectId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        if ($auth['role'] !== 'admin' && !$this->memberModel->isMember($projectId, $auth['id']))
            Response::error('Access denied.', 403);
        Response::success($this->folderModel->getByProject($projectId));
    }

    public function createFolder(array $auth, int $projectId): void {
        $project = $this->model->findById($projectId);
        if (!$project) Response::error('Project not found.', 404);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $v = new Validator();
        $v->required('name', $body['name'] ?? null);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        $id = $this->folderModel->create([
            'project_id'  => $projectId,
            'parent_id'   => $body['parent_id']  ?? null,
            'name'        => $body['name'],
            'description' => $body['description'] ?? null,
            'color'       => $body['color']        ?? '#4A90E2',
            'created_by'  => $auth['id'],
        ]);
        Response::success($this->folderModel->findById($id), 'Folder created.', 201);
    }

    public function updateFolder(array $auth, int $projectId, int $folderId): void {
        $folder = $this->folderModel->findById($folderId);
        if (!$folder || $folder['project_id'] != $projectId) Response::error('Folder not found.', 404);
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $this->folderModel->update($folderId, $body);
        Response::success($this->folderModel->findById($folderId), 'Folder updated.');
    }

    public function deleteFolder(array $auth, int $projectId, int $folderId): void {
        $folder = $this->folderModel->findById($folderId);
        if (!$folder || $folder['project_id'] != $projectId) Response::error('Folder not found.', 404);
        $this->folderModel->delete($folderId);
        Response::success(null, 'Folder deleted.');
    }
}
