<?php
class User {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.id = :id LIMIT 1"
        );
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findByEmail(string $email): ?array {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = :email LIMIT 1"
        );
        $stmt->execute([':email' => $email]);
        return $stmt->fetch() ?: null;
    }

    public function findByUsername(string $username): ?array {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.username = :username LIMIT 1"
        );
        $stmt->execute([':username' => $username]);
        return $stmt->fetch() ?: null;
    }

    public function findByEmailOrUsername(string $identifier): ?array {
        $stmt = $this->db->prepare(
            "SELECT u.*, r.name AS role FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE u.email = :id1 OR u.username = :id2 LIMIT 1"
        );
        $stmt->execute([':id1' => $identifier, ':id2' => $identifier]);
        return $stmt->fetch() ?: null;
    }

    public function create(array $data): int {
        $stmt = $this->db->prepare(
            "INSERT INTO users (role_id, first_name, last_name, email, username, password_hash,
             phone, department, position, is_active, email_verified)
             VALUES (:role_id, :first_name, :last_name, :email, :username, :password_hash,
             :phone, :department, :position, :is_active, :email_verified)"
        );
        $stmt->execute([
            ':role_id'        => $data['role_id']        ?? 2,
            ':first_name'     => $data['first_name'],
            ':last_name'      => $data['last_name'],
            ':email'          => $data['email'],
            ':username'       => $data['username'],
            ':password_hash'  => $data['password_hash'],
            ':phone'          => $data['phone']          ?? null,
            ':department'     => $data['department']     ?? null,
            ':position'       => $data['position']       ?? null,
            ':is_active'      => $data['is_active']      ?? 1,
            ':email_verified' => $data['email_verified'] ?? 1,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool {
        $fields = [];
        $params = [':id' => $id];
        $allowed = ['first_name','last_name','email','username','phone','department',
                    'position','is_active','password_hash','avatar','role_id'];
        foreach ($allowed as $f) {
            if (array_key_exists($f, $data)) {
                $fields[] = "$f = :$f";
                $params[":$f"] = $data[$f];
            }
        }
        if (empty($fields)) return false;
        $stmt = $this->db->prepare(
            "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id"
        );
        return $stmt->execute($params);
    }

    public function updateLastLogin(int $id): void {
        $this->db->prepare("UPDATE users SET last_login = NOW() WHERE id = :id")
                 ->execute([':id' => $id]);
    }

    public function getAll(int $page = 1, int $perPage = 20, string $search = ''): array {
        $offset = ($page - 1) * $perPage;
        $like   = "%$search%";
        $stmt   = $this->db->prepare(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.username,
                    u.phone, u.department, u.position, u.is_active, u.last_login,
                    u.created_at, r.name AS role
             FROM users u JOIN roles r ON r.id = u.role_id
             WHERE (u.first_name LIKE :s OR u.last_name LIKE :s2
                    OR u.email LIKE :s3 OR u.username LIKE :s4)
             ORDER BY u.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        $stmt->bindValue(':s',      $like);
        $stmt->bindValue(':s2',     $like);
        $stmt->bindValue(':s3',     $like);
        $stmt->bindValue(':s4',     $like);
        $stmt->bindValue(':limit',  $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset,  PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $cStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM users u
             WHERE (u.first_name LIKE :s OR u.last_name LIKE :s2
                    OR u.email LIKE :s3 OR u.username LIKE :s4)"
        );
        $cStmt->execute([':s'=>$like,':s2'=>$like,':s3'=>$like,':s4'=>$like]);
        $total = (int) $cStmt->fetchColumn();
        return ['rows' => $rows, 'total' => $total];
    }

    public function emailExists(string $email, int $excludeId = 0): bool {
        $stmt = $this->db->prepare(
            "SELECT id FROM users WHERE email = :email AND id != :id LIMIT 1"
        );
        $stmt->execute([':email' => $email, ':id' => $excludeId]);
        return (bool) $stmt->fetch();
    }

    public function usernameExists(string $username, int $excludeId = 0): bool {
        $stmt = $this->db->prepare(
            "SELECT id FROM users WHERE username = :u AND id != :id LIMIT 1"
        );
        $stmt->execute([':u' => $username, ':id' => $excludeId]);
        return (bool) $stmt->fetch();
    }

    public function delete(int $id): bool {
        return $this->db->prepare("DELETE FROM users WHERE id = :id AND role_id != 1")
                        ->execute([':id' => $id]);
    }

    public function safeProfile(array $user): array {
        unset($user['password_hash'], $user['password_reset_token'], $user['password_reset_expires']);
        return $user;
    }
}
