<?php
class ProjectMember {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function isMember(int $projectId, int $userId): bool {
        $stmt = $this->db->prepare(
            "SELECT id FROM project_members WHERE project_id=:p AND user_id=:u AND is_active=1 LIMIT 1"
        );
        $stmt->execute([':p' => $projectId, ':u' => $userId]);
        return (bool) $stmt->fetch();
    }

    public function getPermissions(int $projectId, int $userId): ?array {
        $stmt = $this->db->prepare(
            "SELECT * FROM project_members WHERE project_id=:p AND user_id=:u AND is_active=1 LIMIT 1"
        );
        $stmt->execute([':p' => $projectId, ':u' => $userId]);
        return $stmt->fetch() ?: null;
    }

    public function getMembers(int $projectId): array {
        $stmt = $this->db->prepare(
            "SELECT pm.*, u.first_name, u.last_name, u.email, u.username, u.department, u.position,
                    CONCAT(u.first_name,' ',u.last_name) AS full_name,
                    g.first_name AS granted_first, g.last_name AS granted_last
             FROM project_members pm
             JOIN users u ON u.id = pm.user_id
             JOIN users g ON g.id = pm.granted_by
             WHERE pm.project_id = :p
             ORDER BY pm.granted_at DESC"
        );
        $stmt->execute([':p' => $projectId]);
        return $stmt->fetchAll();
    }

    public function addMember(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO project_members
             (project_id, user_id, can_view, can_upload, can_edit, can_download, can_delete, granted_by, is_active)
             VALUES (:project_id, :user_id, :can_view, :can_upload, :can_edit, :can_download, :can_delete, :granted_by, 1)
             ON DUPLICATE KEY UPDATE
                can_view=VALUES(can_view), can_upload=VALUES(can_upload), can_edit=VALUES(can_edit),
                can_download=VALUES(can_download), can_delete=VALUES(can_delete),
                granted_by=VALUES(granted_by), is_active=1, updated_at=NOW()"
        );
        $stmt->execute([
            ':project_id'  => $d['project_id'],
            ':user_id'     => $d['user_id'],
            ':can_view'    => $d['can_view']     ?? 1,
            ':can_upload'  => $d['can_upload']   ?? 0,
            ':can_edit'    => $d['can_edit']      ?? 0,
            ':can_download'=> $d['can_download'] ?? 0,
            ':can_delete'  => $d['can_delete']   ?? 0,
            ':granted_by'  => $d['granted_by'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function updatePermissions(int $projectId, int $userId, array $perms): bool {
        $allowed = ['can_view','can_upload','can_edit','can_download','can_delete','is_active'];
        $fields = []; $params = [':p' => $projectId, ':u' => $userId];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $perms)) {
                $fields[] = "$f = :$f";
                $params[":$f"] = (int)(bool)$perms[$f];
            }
        }
        if (empty($fields)) return false;
        return $this->db->prepare(
            "UPDATE project_members SET " . implode(', ', $fields) .
            " WHERE project_id=:p AND user_id=:u"
        )->execute($params);
    }

    public function removeMember(int $projectId, int $userId): bool {
        return $this->db->prepare(
            "DELETE FROM project_members WHERE project_id=:p AND user_id=:u"
        )->execute([':p' => $projectId, ':u' => $userId]);
    }
}
