<?php
require_once __DIR__ . '/../models/ActivityLog.php';
require_once __DIR__ . '/../models/Notification.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Project.php';
require_once __DIR__ . '/../models/Document.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../config/config.php';

class MiscController {
    private ActivityLog  $logModel;
    private Notification $notifModel;
    private PDO          $db;

    public function __construct(PDO $db) {
        $this->db         = $db;
        $this->logModel   = new ActivityLog($db);
        $this->notifModel = new Notification($db);
    }

    // ─── ACTIVITY LOGS ───────────────────────────────────────────

    public function activityIndex(array $auth): void {
        $page    = max(1, (int)($_GET['page']      ?? 1));
        $perPage = min(100, (int)($_GET['per_page'] ?? 50));
        $filters = array_intersect_key($_GET, array_flip(['user_id','action','entity_type','from','to']));
        $result  = $this->logModel->getAll($page, $perPage, $filters);
        Response::paginate($result['rows'], $result['total'], $page, $perPage);
    }

    // ─── NOTIFICATIONS ───────────────────────────────────────────

    public function notifIndex(array $auth): void {
        $unread = isset($_GET['unread']) && $_GET['unread'] === '1';
        Response::success($this->notifModel->getForUser($auth['id'], $unread));
    }

    public function notifMarkRead(array $auth, int $id): void {
        $this->notifModel->markRead($id, $auth['id']);
        Response::success(null, 'Marked as read.');
    }

    public function notifMarkAllRead(array $auth): void {
        $this->notifModel->markAllRead($auth['id']);
        Response::success(null, 'All marked as read.');
    }

    public function notifDelete(array $auth, int $id): void {
        $this->notifModel->delete($id, $auth['id']);
        Response::success(null, 'Notification deleted.');
    }

    public function notifUnreadCount(array $auth): void {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM notifications WHERE user_id = :uid AND is_read = 0"
        );
        $stmt->execute([':uid' => $auth['id']]);
        Response::success(['count' => (int) $stmt->fetchColumn()]);
    }

    // ─── FAVORITES ───────────────────────────────────────────────

    public function favIndex(array $auth): void {
        $stmt = $this->db->prepare(
            "SELECT f.*, d.title, d.file_name, d.file_type, d.file_size,
                    p.name AS project_name, p.id AS project_id
             FROM favorites f
             JOIN documents d ON d.id = f.document_id
             JOIN projects  p ON p.id = d.project_id
             WHERE f.user_id = :uid AND d.status = 'active'
             ORDER BY f.created_at DESC"
        );
        $stmt->execute([':uid' => $auth['id']]);
        Response::success($stmt->fetchAll());
    }

    public function favToggle(array $auth, int $docId): void {
        $stmt = $this->db->prepare(
            "SELECT id FROM favorites WHERE user_id = :uid AND document_id = :did"
        );
        $stmt->execute([':uid' => $auth['id'], ':did' => $docId]);
        $existing = $stmt->fetch();

        if ($existing) {
            $this->db->prepare("DELETE FROM favorites WHERE user_id=:uid AND document_id=:did")
                     ->execute([':uid' => $auth['id'], ':did' => $docId]);
            Response::success(['favorited' => false], 'Removed from favorites.');
        } else {
            $this->db->prepare("INSERT IGNORE INTO favorites (user_id, document_id) VALUES (:uid, :did)")
                     ->execute([':uid' => $auth['id'], ':did' => $docId]);
            Response::success(['favorited' => true], 'Added to favorites.');
        }
    }

    // ─── DASHBOARD STATS ─────────────────────────────────────────

    public function adminStats(array $auth): void {
        // Projects
        $pRow = $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN status='active'    THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN is_archived=1      THEN 1 ELSE 0 END) AS archived
             FROM projects"
        )->fetch();

        // Documents
        $dRow = $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN status='active'   THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN is_archived=1     THEN 1 ELSE 0 END) AS archived,
                    COALESCE(SUM(file_size), 0) AS total_size
             FROM documents"
        )->fetch();

        // Users
        $uRow = $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN is_active=0 THEN 1 ELSE 0 END) AS inactive
             FROM users"
        )->fetch();

        // Recent activity
        $actStmt = $this->db->query(
            "SELECT a.*, CONCAT(u.first_name,' ',u.last_name) AS user_name, u.username
             FROM activity_logs a JOIN users u ON u.id = a.user_id
             ORDER BY a.created_at DESC LIMIT 10"
        );
        $recentActivity = $actStmt->fetchAll();

        // Recent documents
        $docStmt = $this->db->query(
            "SELECT d.id, d.title, d.file_type, d.file_size, d.created_at,
                    p.name AS project_name,
                    CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
             FROM documents d
             JOIN projects p ON p.id = d.project_id
             JOIN users    u ON u.id = d.uploaded_by
             WHERE d.status = 'active'
             ORDER BY d.created_at DESC LIMIT 5"
        );
        $recentDocs = $docStmt->fetchAll();

        Response::success([
            'projects'         => $pRow,
            'documents'        => $dRow,
            'users'            => $uRow,
            'recent_activity'  => $recentActivity,
            'recent_documents' => $recentDocs,
        ]);
    }

    public function userStats(array $auth): void {
        $uid = $auth['id'];

        $pStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM project_members WHERE user_id=:uid AND is_active=1"
        );
        $pStmt->execute([':uid' => $uid]);
        $projectCount = (int) $pStmt->fetchColumn();

        $dStmt = $this->db->prepare(
            "SELECT COUNT(DISTINCT d.id)
             FROM documents d
             JOIN project_members pm ON pm.project_id = d.project_id
             WHERE pm.user_id=:uid AND pm.is_active=1 AND d.status='active'"
        );
        $dStmt->execute([':uid' => $uid]);
        $docCount = (int) $dStmt->fetchColumn();

        $fStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM favorites WHERE user_id=:uid"
        );
        $fStmt->execute([':uid' => $uid]);
        $favCount = (int) $fStmt->fetchColumn();

        $rStmt = $this->db->prepare(
            "SELECT d.id, d.title, d.file_type, d.file_size, d.created_at,
                    p.name AS project_name, p.id AS project_id
             FROM documents d
             JOIN projects p ON p.id = d.project_id
             JOIN project_members pm ON pm.project_id = d.project_id
             WHERE pm.user_id=:uid AND pm.is_active=1 AND d.status='active'
             ORDER BY d.created_at DESC LIMIT 5"
        );
        $rStmt->execute([':uid' => $uid]);

        Response::success([
            'project_count'    => $projectCount,
            'document_count'   => $docCount,
            'favorite_count'   => $favCount,
            'recent_documents' => $rStmt->fetchAll(),
        ]);
    }

    // ─── TAGS ────────────────────────────────────────────────────

    public function tagsIndex(): void {
        $tags = $this->db->query("SELECT * FROM tags ORDER BY name ASC")->fetchAll();
        Response::success($tags);
    }
}
