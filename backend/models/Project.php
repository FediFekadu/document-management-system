<?php
class Project {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO projects (name, code, description, category, start_date, end_date, status, created_by)
             VALUES (:name, :code, :description, :category, :start_date, :end_date, :status, :created_by)"
        );
        $stmt->execute([
            ':name'        => $d['name'],
            ':code'        => strtoupper($d['code']),
            ':description' => $d['description'] ?? null,
            ':category'    => $d['category']    ?? null,
            ':start_date'  => $d['start_date']  ?? null,
            ':end_date'    => $d['end_date']     ?? null,
            ':status'      => $d['status']       ?? 'active',
            ':created_by'  => $d['created_by'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT p.*, u.first_name, u.last_name,
                    CONCAT(u.first_name,' ',u.last_name) AS created_by_name,
                    (SELECT COUNT(*) FROM documents d WHERE d.project_id = p.id AND d.status='active') AS doc_count,
                    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.is_active=1) AS member_count
             FROM projects p JOIN users u ON u.id = p.created_by
             WHERE p.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function getAll(int $page = 1, int $perPage = 20, string $search = '', string $status = ''): array {
        $offset = ($page - 1) * $perPage;
        $like   = "%$search%";

        $where  = "(p.name LIKE :s OR p.code LIKE :s2 OR p.description LIKE :s3)";
        $params = [':s' => $like, ':s2' => $like, ':s3' => $like];
        if ($status) { $where .= " AND p.status = :status"; $params[':status'] = $status; }

        $stmt = $this->db->prepare(
            "SELECT p.*, CONCAT(u.first_name,' ',u.last_name) AS created_by_name,
                    (SELECT COUNT(*) FROM documents d WHERE d.project_id=p.id AND d.status='active') AS doc_count,
                    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id=p.id AND pm.is_active=1) AS member_count
             FROM projects p JOIN users u ON u.id = p.created_by
             WHERE $where
             ORDER BY p.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $cStmt = $this->db->prepare("SELECT COUNT(*) FROM projects p WHERE $where");
        $cStmt->execute($params);
        $total = (int) $cStmt->fetchColumn();
        return ['rows' => $rows, 'total' => $total];
    }

    public function getForUser(int $userId): array {
        $stmt = $this->db->prepare(
            "SELECT p.*, pm.can_view, pm.can_upload, pm.can_edit, pm.can_download, pm.can_delete,
                    CONCAT(u.first_name,' ',u.last_name) AS created_by_name,
                    (SELECT COUNT(*) FROM documents d WHERE d.project_id=p.id AND d.status='active') AS doc_count
             FROM projects p
             JOIN project_members pm ON pm.project_id = p.id
             JOIN users u ON u.id = p.created_by
             WHERE pm.user_id = :uid AND pm.is_active = 1
               AND p.status != 'archived' AND p.is_archived = 0
             ORDER BY p.name ASC"
        );
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll();
    }

    public function update(int $id, array $d): bool {
        $fields = []; $params = [':id' => $id];
        $allowed = ['name','code','description','category','start_date','end_date','status','cover_image'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $d)) {
                $fields[] = "$f = :$f";
                $params[":$f"] = ($f === 'code') ? strtoupper($d[$f]) : $d[$f];
            }
        }
        if (empty($fields)) return false;
        return $this->db->prepare(
            "UPDATE projects SET " . implode(', ', $fields) . " WHERE id = :id"
        )->execute($params);
    }

    public function archive(int $id): bool {
        return $this->db->prepare(
            "UPDATE projects SET status='archived', is_archived=1, archived_at=NOW() WHERE id=:id"
        )->execute([':id' => $id]);
    }

    public function restore(int $id): bool {
        return $this->db->prepare(
            "UPDATE projects SET status='active', is_archived=0, archived_at=NULL WHERE id=:id"
        )->execute([':id' => $id]);
    }

    public function delete(int $id): bool {
        return $this->db->prepare("DELETE FROM projects WHERE id = :id")->execute([':id' => $id]);
    }

    public function codeExists(string $code, int $excludeId = 0): bool {
        $stmt = $this->db->prepare(
            "SELECT id FROM projects WHERE code = :code AND id != :id LIMIT 1"
        );
        $stmt->execute([':code' => strtoupper($code), ':id' => $excludeId]);
        return (bool) $stmt->fetch();
    }

    public function getStats(): array {
        $row = $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN status='active'    THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN is_archived=1      THEN 1 ELSE 0 END) AS archived
             FROM projects"
        )->fetch();
        return $row;
    }
}
