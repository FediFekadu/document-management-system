<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/UserController.php';

$db         = (new Database())->getConnection();
$controller = new UserController($db);
$method     = $_SERVER['REQUEST_METHOD'];
$uri        = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments   = explode('/', trim($uri, '/'));
$base       = array_search('users', $segments);
$sub        = $segments[$base + 1] ?? null;  // numeric ID or 'profile'
$id         = (is_numeric($sub)) ? (int)$sub : null;

// Profile route (any user)
if ($sub === 'profile') {
    $auth = authenticate();
    match ($method) {
        'GET'  => (function() use ($controller, $auth) {
                    require_once __DIR__ . '/../../helpers/Response.php';
                    require_once __DIR__ . '/../../models/User.php';
                    $db2 = (new Database())->getConnection();
                    $m   = new User($db2);
                    Response::success($m->safeProfile($m->findById($auth['id'])));
                  })(),
        'PUT'  => $controller->updateProfile($auth),
        'PATCH'=> $controller->updateProfile($auth),
        default=> (function(){ http_response_code(405); echo json_encode(['success'=>false,'message'=>'Method not allowed']); })()
    };
    exit();
}

// Admin-only routes
$auth = requireAdmin();

match (true) {
    $method === 'GET'    && $id === null => $controller->index($auth),
    $method === 'POST'   && $id === null => $controller->store($auth),
    $method === 'GET'    && $id !== null => $controller->show($auth, $id),
    $method === 'PUT'    && $id !== null => $controller->update($auth, $id),
    $method === 'PATCH'  && $id !== null => $controller->update($auth, $id),
    $method === 'DELETE' && $id !== null => $controller->destroy($auth, $id),
    default => (function(){ http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found']); })()
};
