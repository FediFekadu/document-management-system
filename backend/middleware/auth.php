<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../helpers/Response.php';

/**
 * Extract token from multiple possible sources.
 *
 * Priority:
 *  1. X-Auth-Token header  (most reliable on XAMPP — never stripped)
 *  2. Authorization: Bearer <token> header
 *  3. REDIRECT_HTTP_AUTHORIZATION (set by Apache rewrite env)
 *  4. ?token= query param  (for download links in new tab)
 */
function getBearerToken(): ?string {

    // 1. X-Auth-Token custom header (set by React frontend — never stripped by Apache)
    if (!empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        return trim($_SERVER['HTTP_X_AUTH_TOKEN']);
    }

    // 2. Standard Authorization header (works when Apache passes it through)
    $auth = $_SERVER['HTTP_AUTHORIZATION']
         ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
         ?? null;

    // 3. getallheaders() fallback
    if (!$auth && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) {
            if (strtolower($k) === 'authorization') { $auth = $v; break; }
            if (strtolower($k) === 'x-auth-token')  { return trim($v); }
        }
    }

    if ($auth && preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
        return trim($m[1]);
    }

    // 4. Query string (for file downloads)
    if (!empty($_GET['token'])) {
        return trim($_GET['token']);
    }

    return null;
}

/**
 * Validate the token and return user info.
 */
function authenticate(): array {
    $token = getBearerToken();

    if (!$token) {
        Response::error('Unauthorized. No token provided.', 401);
    }

    $db   = (new Database())->getConnection();
    $stmt = $db->prepare(
        "SELECT u.*, r.name AS role
         FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         JOIN roles r ON r.id = u.role_id
         WHERE t.token = :token
           AND t.expires_at > NOW()
         LIMIT 1"
    );
    $stmt->execute([':token' => $token]);
    $user = $stmt->fetch();

    if (!$user) {
        Response::error('Unauthorized. Invalid or expired token.', 401);
    }

    if (!$user['is_active']) {
        Response::error('Account is deactivated.', 403);
    }

    // Extend token expiry on activity
    $db->prepare(
        "UPDATE auth_tokens SET expires_at = DATE_ADD(NOW(), INTERVAL 8 HOUR) WHERE token = :token"
    )->execute([':token' => $token]);

    return [
        'id'       => (int)$user['id'],
        'role'     => $user['role'],
        'username' => $user['username'],
    ];
}

function requireAdmin(): array {
    $user = authenticate();
    if ($user['role'] !== 'admin') {
        Response::error('Forbidden. Admin access required.', 403);
    }
    return $user;
}
