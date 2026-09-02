<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/ActivityLog.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../middleware/auth.php';

class AuthController {
    private User       $userModel;
    private ActivityLog $logModel;
    private PDO        $db;

    public function __construct(PDO $db) {
        $this->db        = $db;
        $this->userModel = new User($db);
        $this->logModel  = new ActivityLog($db);
    }

    // ─── Generate a secure random token ──────────────────────────

    private function generateToken(): string {
        return bin2hex(random_bytes(32));   // 64-char hex string
    }

    // ─── Persist token to DB ──────────────────────────────────────

    private function createToken(int $userId): string {
        $token = $this->generateToken();
        $this->db->prepare(
            "INSERT INTO auth_tokens (user_id, token, expires_at)
             VALUES (:uid, :token, DATE_ADD(NOW(), INTERVAL 8 HOUR))"
        )->execute([':uid' => $userId, ':token' => $token]);
        return $token;
    }

    // ─── LOGIN ────────────────────────────────────────────────────

    public function login(): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator();
        $v->required('identifier', $body['identifier'] ?? null)
          ->required('password',   $body['password']   ?? null);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        $user = $this->userModel->findByEmailOrUsername($body['identifier']);

        if (!$user || !password_verify($body['password'], $user['password_hash'])) {
            $this->logModel->log([
                'user_id'     => $user['id'] ?? 0,
                'action'      => 'login_failed',
                'entity_type' => 'auth',
                'description' => 'Failed login attempt for: ' . ($body['identifier'] ?? ''),
            ]);
            Response::error('Invalid credentials.', 401);
        }

        if (!$user['is_active']) {
            Response::error('Your account has been deactivated. Contact an administrator.', 403);
        }

        // Clean up expired tokens for this user
        $this->db->prepare(
            "DELETE FROM auth_tokens WHERE user_id = :uid AND expires_at <= NOW()"
        )->execute([':uid' => $user['id']]);

        $token = $this->createToken($user['id']);
        $this->userModel->updateLastLogin($user['id']);

        $this->logModel->log([
            'user_id'     => $user['id'],
            'action'      => 'login',
            'entity_type' => 'auth',
            'description' => 'User logged in',
        ]);

        $profile = $this->userModel->safeProfile($user);
        $profile['token'] = $token;

        Response::success($profile, 'Login successful.');
    }

    // ─── LOGOUT ───────────────────────────────────────────────────

    public function logout(): void {
        $token = getBearerToken();

        if ($token) {
            $stmt = $this->db->prepare(
                "SELECT t.user_id FROM auth_tokens t WHERE t.token = :token LIMIT 1"
            );
            $stmt->execute([':token' => $token]);
            $row = $stmt->fetch();

            // Revoke this specific token
            $this->db->prepare(
                "DELETE FROM auth_tokens WHERE token = :token"
            )->execute([':token' => $token]);

            if ($row) {
                $this->logModel->log([
                    'user_id'     => $row['user_id'],
                    'action'      => 'logout',
                    'entity_type' => 'auth',
                    'description' => 'User logged out',
                ]);
            }
        }

        Response::success(null, 'Logged out successfully.');
    }

    // ─── ME (validate current token) ─────────────────────────────

    public function me(): void {
        $auth = authenticate();   // throws 401 if invalid
        $user = $this->userModel->findById($auth['id']);
        if (!$user) Response::error('User not found.', 404);
        Response::success($this->userModel->safeProfile($user));
    }

    // ─── CHANGE PASSWORD ──────────────────────────────────────────

    public function changePassword(): void {
        $auth = authenticate();
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        $v = new Validator();
        $v->required('current_password', $body['current_password'] ?? null)
          ->required('new_password',     $body['new_password']     ?? null)
          ->minLength('new_password',    $body['new_password'] ?? '', 8);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        $user = $this->userModel->findById($auth['id']);
        if (!password_verify($body['current_password'], $user['password_hash'])) {
            Response::error('Current password is incorrect.', 400);
        }

        $this->userModel->update($auth['id'], [
            'password_hash' => password_hash($body['new_password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST])
        ]);

        $this->logModel->log([
            'user_id'     => $auth['id'],
            'action'      => 'password_changed',
            'entity_type' => 'auth',
            'description' => 'User changed their password',
        ]);

        Response::success(null, 'Password changed successfully.');
    }
}
