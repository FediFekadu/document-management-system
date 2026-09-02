<?php
class DocumentVersion {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO document_versions (document_id, version_number, file_name, file_path, file_size, change_notes, uploaded_by)
             VALUES (:document_id, :version_number, :file_name, :file_path, :file_size, :change_notes, :uploaded_by)"
        );
        $stmt->execute([
            ':document_id'    => $d['document_id'],
            ':version_number' => $d['version_number'],
            ':file_name'      => $d['file_name'],
            ':file_path'      => $d['file_path'],
            ':file_size'      => $d['file_size'],
            ':change_notes'   => $d['change_notes'] ?? null,
            ':uploaded_by'    => $d['uploaded_by'],
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getByDocument(int $docId): array {
        $stmt = $this->db->prepare(
            "SELECT dv.*, CONCAT(u.first_name,' ',u.last_name) AS uploaded_by_name
             FROM document_versions dv JOIN users u ON u.id=dv.uploaded_by
             WHERE dv.document_id=:id ORDER BY dv.version_number DESC"
        );
        $stmt->execute([':id' => $docId]);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM document_versions WHERE id=:id LIMIT 1");
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }
}
