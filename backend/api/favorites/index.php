<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/MiscController.php';

$auth       = authenticate();
$db         = (new Database())->getConnection();
$controller = new MiscController($db);
$method     = $_SERVER['REQUEST_METHOD'];
$uri        = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments   = array_values(array_filter(explode('/', trim($uri, '/')), fn($s)=>$s!==''));
$base       = array_search('favorites', $segments);
$seg1       = $segments[$base + 1] ?? null;
$docId      = is_numeric($seg1) ? (int)$seg1 : null;

match (true) {
    $method === 'GET'                           => $controller->favIndex($auth),
    ($method === 'POST' || $method === 'DELETE') && $docId !== null => $controller->favToggle($auth, $docId),
    default => (function(){ http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found']); })()
};
