<?php
class ActivityLog {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function log(array $d): void {
        $stmt = $this->db->prepare(
            "INSERT INTO activity_logs
             (user_id, action, entity_type, entity_id, entity_name, description, ip_address, user_agent, metadata)
             VALUES (:user_id, :action, :entity_type, :entity_id, :entity_name, :description, :ip, :ua, :meta)"
        );
        $stmt->execute([
            ':user_id'     => $d['user_id'],
            ':action'      => $d['action'],
            ':entity_type' => $d['entity_type']  ?? null,
            ':entity_id'   => $d['entity_id']    ?? null,
            ':entity_name' => $d['entity_name']  ?? null,
            ':description' => $d['description']  ?? null,
            ':ip'          => $d['ip']            ?? ($_SERVER['REMOTE_ADDR'] ?? null),
            ':ua'          => $d['ua']            ?? ($_SERVER['HTTP_USER_AGENT'] ?? null),
            ':meta'        => isset($d['metadata']) ? json_encode($d['metadata']) : null,
        ]);
    }

    public function getAll(int $page = 1, int $perPage = 50, array $filters = []): array {
        $where  = '1=1'; $params = [];
        if (!empty($filters['user_id'])) { $where .= " AND a.user_id=:uid"; $params[':uid'] = $filters['user_id']; }
        if (!empty($filters['action']))  { $where .= " AND a.action=:act";  $params[':act'] = $filters['action']; }
        if (!empty($filters['entity_type'])) { $where .= " AND a.entity_type=:et"; $params[':et'] = $filters['entity_type']; }
        if (!empty($filters['from'])) { $where .= " AND DATE(a.created_at)>=:from"; $params[':from'] = $filters['from']; }
        if (!empty($filters['to']))   { $where .= " AND DATE(a.created_at)<=:to";   $params[':to']   = $filters['to']; }

        $offset = ($page - 1) * $perPage;
        $stmt = $this->db->prepare(
            "SELECT a.*, CONCAT(u.first_name,' ',u.last_name) AS user_name, u.username
             FROM activity_logs a JOIN users u ON u.id=a.user_id
             WHERE $where ORDER BY a.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) $stmt->bindValue($k, $v);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $cStmt = $this->db->prepare("SELECT COUNT(*) FROM activity_logs a WHERE $where");
        $cStmt->execute($params);
        return ['rows' => $rows, 'total' => (int)$cStmt->fetchColumn()];
    }
}
