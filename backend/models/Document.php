<?php
class Document {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO documents
             (project_id, folder_id, title, description, file_name, file_path, file_type,
              file_size, mime_type, version, status, uploaded_by, access_level)
             VALUES
             (:project_id, :folder_id, :title, :description, :file_name, :file_path, :file_type,
              :file_size, :mime_type, 1, 'active', :uploaded_by, :access_level)"
        );
        $stmt->execute([
            ':project_id'   => $d['project_id'],
            ':folder_id'    => $d['folder_id']    ?? null,
            ':title'        => $d['title'],
            ':description'  => $d['description']  ?? null,
            ':file_name'    => $d['file_name'],
            ':file_path'    => $d['file_path'],
            ':file_type'    => $d['file_type'],
            ':file_size'    => $d['file_size'],
            ':mime_type'    => $d['mime_type']     ?? null,
            ':uploaded_by'  => $d['uploaded_by'],
            ':access_level' => $d['access_level']  ?? 'project',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT d.*,
                    CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name,
                    p.name AS project_name, p.code AS project_code,
                    f.name AS folder_name,
                    GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags
             FROM documents d
             JOIN users u ON u.id = d.uploaded_by
             JOIN projects p ON p.id = d.project_id
             LEFT JOIN folders f ON f.id = d.folder_id
             LEFT JOIN document_tags dt ON dt.document_id = d.id
             LEFT JOIN tags t ON t.id = dt.tag_id
             WHERE d.id = :id
             GROUP BY d.id
             LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        $row = $stmt->fetch();
        if ($row) $row['tags'] = $row['tags'] ? explode(',', $row['tags']) : [];
        return $row ?: null;
    }

    public function getByProject(int $projectId, array $opts = []): array {
        $where  = "d.project_id = :pid AND d.status = 'active'";
        $params = [':pid' => $projectId];

        if (!empty($opts['folder_id'])) {
            $where .= " AND d.folder_id = :fid";
            $params[':fid'] = $opts['folder_id'];
        } elseif (isset($opts['no_folder']) && $opts['no_folder']) {
            $where .= " AND d.folder_id IS NULL";
        }
        if (!empty($opts['search'])) {
            $like = "%{$opts['search']}%";
            $where .= " AND (d.title LIKE :s OR d.file_name LIKE :s2 OR d.description LIKE :s3)";
            $params[':s'] = $like; $params[':s2'] = $like; $params[':s3'] = $like;
        }

        $page    = max(1, (int)($opts['page'] ?? 1));
        $perPage = (int)($opts['per_page'] ?? DEFAULT_PAGE_SIZE);
        $offset  = ($page - 1) * $perPage;

        $stmt = $this->db->prepare(
            "SELECT d.*, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name,
                    f.name AS folder_name,
                    GROUP_CONCAT(t.name ORDER BY t.name SEPARATOR ',') AS tags
             FROM documents d
             JOIN users u ON u.id = d.uploaded_by
             LEFT JOIN folders f ON f.id = d.folder_id
             LEFT JOIN document_tags dt ON dt.document_id = d.id
             LEFT JOIN tags t ON t.id = dt.tag_id
             WHERE $where
             GROUP BY d.id
             ORDER BY d.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) $r['tags'] = $r['tags'] ? explode(',', $r['tags']) : [];

        $cStmt = $this->db->prepare("SELECT COUNT(DISTINCT d.id) FROM documents d LEFT JOIN document_tags dt ON dt.document_id=d.id LEFT JOIN tags t ON t.id=dt.tag_id WHERE $where");
        $cStmt->execute($params);
        return ['rows' => $rows, 'total' => (int)$cStmt->fetchColumn()];
    }

    public function update(int $id, array $d): bool {
        $fields = []; $params = [':id' => $id];
        $allowed = ['title','description','folder_id','status','access_level'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $d)) {
                $fields[] = "$f = :$f"; $params[":$f"] = $d[$f];
            }
        }
        if (empty($fields)) return false;
        return $this->db->prepare(
            "UPDATE documents SET " . implode(', ', $fields) . " WHERE id = :id"
        )->execute($params);
    }

    public function incrementViews(int $id): void {
        $this->db->prepare("UPDATE documents SET view_count = view_count+1 WHERE id=:id")
                 ->execute([':id' => $id]);
    }

    public function incrementDownloads(int $id): void {
        $this->db->prepare("UPDATE documents SET download_count = download_count+1 WHERE id=:id")
                 ->execute([':id' => $id]);
    }

    public function archive(int $id): bool {
        return $this->db->prepare(
            "UPDATE documents SET status='archived', is_archived=1, archived_at=NOW() WHERE id=:id"
        )->execute([':id' => $id]);
    }

    public function restore(int $id): bool {
        return $this->db->prepare(
            "UPDATE documents SET status='active', is_archived=0, archived_at=NULL WHERE id=:id"
        )->execute([':id' => $id]);
    }

    public function delete(int $id): ?string {
        $doc = $this->findById($id);
        if (!$doc) return null;
        $this->db->prepare("DELETE FROM documents WHERE id=:id")->execute([':id' => $id]);
        return $doc['file_path'];
    }

    public function getArchivedByProject(int $projectId): array {
        $stmt = $this->db->prepare(
            "SELECT d.*, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
             FROM documents d JOIN users u ON u.id=d.uploaded_by
             WHERE d.project_id=:pid AND d.is_archived=1
             ORDER BY d.archived_at DESC"
        );
        $stmt->execute([':pid' => $projectId]);
        return $stmt->fetchAll();
    }

    public function syncTags(int $docId, array $tagNames): void {
        $this->db->prepare("DELETE FROM document_tags WHERE document_id=:id")->execute([':id' => $docId]);
        foreach ($tagNames as $name) {
            $name = trim($name);
            if (!$name) continue;
            $this->db->prepare("INSERT IGNORE INTO tags (name) VALUES (:n)")->execute([':n' => $name]);
            $tagId = $this->db->query("SELECT id FROM tags WHERE name='".addslashes($name)."' LIMIT 1")->fetchColumn();
            if ($tagId) {
                $this->db->prepare("INSERT IGNORE INTO document_tags (document_id,tag_id) VALUES (:d,:t)")
                         ->execute([':d' => $docId, ':t' => $tagId]);
            }
        }
    }

    public function search(string $keyword, int $userId, bool $isAdmin, int $page = 1): array {
        $like   = "%$keyword%";
        $offset = ($page - 1) * DEFAULT_PAGE_SIZE;

        if ($isAdmin) {
            $stmt = $this->db->prepare(
                "SELECT d.*, p.name AS project_name, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
                 FROM documents d
                 JOIN projects p ON p.id = d.project_id
                 JOIN users u ON u.id = d.uploaded_by
                 WHERE d.status='active'
                   AND (d.title LIKE :s OR d.file_name LIKE :s2 OR d.description LIKE :s3)
                 ORDER BY d.created_at DESC
                 LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':s',  $like); $stmt->bindValue(':s2', $like); $stmt->bindValue(':s3', $like);
        } else {
            $stmt = $this->db->prepare(
                "SELECT d.*, p.name AS project_name, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
                 FROM documents d
                 JOIN projects p ON p.id = d.project_id
                 JOIN users u ON u.id = d.uploaded_by
                 JOIN project_members pm ON pm.project_id=d.project_id AND pm.user_id=:uid AND pm.is_active=1
                 WHERE d.status='active'
                   AND (d.title LIKE :s OR d.file_name LIKE :s2 OR d.description LIKE :s3)
                 ORDER BY d.created_at DESC
                 LIMIT :limit OFFSET :offset"
            );
            $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
            $stmt->bindValue(':s',  $like); $stmt->bindValue(':s2', $like); $stmt->bindValue(':s3', $like);
        }
        $stmt->bindValue(':limit',  DEFAULT_PAGE_SIZE, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getStats(): array {
        return $this->db->query(
            "SELECT COUNT(*) AS total,
                    SUM(CASE WHEN status='active'  THEN 1 ELSE 0 END) AS active,
                    SUM(CASE WHEN is_archived=1    THEN 1 ELSE 0 END) AS archived,
                    COALESCE(SUM(file_size), 0) AS total_size
             FROM documents"
        )->fetch();
    }
}
