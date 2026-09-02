<?php
class Database {
    private $host     = 'sql209.infinityfree.com';
    private $db_name  = 'if0_42815483_dms';
    private $username = 'if0_42815483';
    private $password = 'Marge500';
    private $charset  = 'utf8mb4';
    private $conn     = null;

    public function getConnection(): PDO {
        if ($this->conn !== null) return $this->conn;

        try {
            $dsn = "mysql:host={$this->host};port=3306;dbname={$this->db_name};charset={$this->charset}";

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            $this->conn = new PDO(
                $dsn,
                $this->username,
                $this->password,
                $options
            );

        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed.'
            ]);
            exit();
        }

        return $this->conn;
    }
}
