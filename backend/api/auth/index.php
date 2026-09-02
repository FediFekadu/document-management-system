<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/AuthController.php';

$db         = (new Database())->getConnection();
$controller = new AuthController($db);
$method     = $_SERVER['REQUEST_METHOD'];
$path       = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$segments   = explode('/', $path);
// last meaningful segment after 'auth'
$action     = $segments[array_search('auth', $segments) + 1] ?? '';

match (true) {
    $method === 'POST' && $action === 'login'            => $controller->login(),
    $method === 'POST' && $action === 'logout'           => $controller->logout(),
    $method === 'GET'  && $action === 'me'               => $controller->me(),
    $method === 'POST' && $action === 'change-password'  => $controller->changePassword(),
    default => (function() { http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found']); })()
};
