<?php
class Folder {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO folders (project_id, parent_id, name, description, color, created_by)
             VALUES (:project_id, :parent_id, :name, :description, :color, :created_by)"
        );
        $stmt->execute([
            ':project_id'  => $d['project_id'],
            ':parent_id'   => $d['parent_id']   ?? null,
            ':name'        => $d['name'],
            ':description' => $d['description'] ?? null,
            ':color'       => $d['color']        ?? '#4A90E2',
            ':created_by'  => $d['created_by'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM folders WHERE id=:id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function getByProject(int $projectId): array {
        $stmt = $this->db->prepare(
            "SELECT f.*, COUNT(d.id) AS doc_count
             FROM folders f
             LEFT JOIN documents d ON d.folder_id = f.id AND d.status='active'
             WHERE f.project_id = :pid AND f.is_archived = 0
             GROUP BY f.id
             ORDER BY f.name ASC"
        );
        $stmt->execute([':pid' => $projectId]);
        return $stmt->fetchAll();
    }

    public function update(int $id, array $d): bool {
        $fields = []; $params = [':id' => $id];
        foreach (['name','description','color','parent_id'] as $f) {
            if (array_key_exists($f, $d)) { $fields[] = "$f=:$f"; $params[":$f"] = $d[$f]; }
        }
        if (empty($fields)) return false;
        return $this->db->prepare(
            "UPDATE folders SET " . implode(', ', $fields) . " WHERE id=:id"
        )->execute($params);
    }

    public function delete(int $id): bool {
        // Move documents to no folder before deleting
        $this->db->prepare("UPDATE documents SET folder_id=NULL WHERE folder_id=:id")->execute([':id' => $id]);
        return $this->db->prepare("DELETE FROM folders WHERE id=:id")->execute([':id' => $id]);
    }
}
