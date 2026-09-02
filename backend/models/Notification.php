<?php
class Notification {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function create(array $d): int {
        $stmt = $this->db->prepare(
            "INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
             VALUES (:user_id, :type, :title, :message, :related_id, :related_type)"
        );
        $stmt->execute([
            ':user_id'      => $d['user_id'],
            ':type'         => $d['type'],
            ':title'        => $d['title'],
            ':message'      => $d['message'],
            ':related_id'   => $d['related_id']   ?? null,
            ':related_type' => $d['related_type'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function getForUser(int $userId, bool $unreadOnly = false): array {
        $where = $unreadOnly ? "AND is_read=0" : "";
        $stmt = $this->db->prepare(
            "SELECT * FROM notifications WHERE user_id=:uid $where ORDER BY created_at DESC LIMIT 50"
        );
        $stmt->execute([':uid' => $userId]);
        return $stmt->fetchAll();
    }

    public function markRead(int $id, int $userId): bool {
        return $this->db->prepare(
            "UPDATE notifications SET is_read=1 WHERE id=:id AND user_id=:uid"
        )->execute([':id' => $id, ':uid' => $userId]);
    }

    public function markAllRead(int $userId): bool {
        return $this->db->prepare(
            "UPDATE notifications SET is_read=1 WHERE user_id=:uid"
        )->execute([':uid' => $userId]);
    }

    public function unreadCount(int $userId): int {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM notifications WHERE user_id=:uid AND is_read=0"
        );
        $stmt->execute([':uid' => $userId]);
        return (int) $stmt->fetchColumn();
    }

    public function delete(int $id, int $userId): bool {
        return $this->db->prepare(
            "DELETE FROM notifications WHERE id=:id AND user_id=:uid"
        )->execute([':id' => $id, ':uid' => $userId]);
    }
}
