<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/ProjectController.php';

$db         = (new Database())->getConnection();
$controller = new ProjectController($db);
$method     = $_SERVER['REQUEST_METHOD'];
$uri        = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments   = array_values(array_filter(explode('/', trim($uri, '/')), fn($s) => $s !== ''));
$base       = array_search('projects', $segments);

// /projects                        → index / store
// /projects/{id}                   → show / update / archive / delete
// /projects/{id}/members           → getMembers / addMember
// /projects/{id}/members/{uid}     → updateMember / removeMember
// /projects/{id}/folders           → getFolders / createFolder
// /projects/{id}/folders/{fid}     → updateFolder / deleteFolder
// /projects/{id}/archive           → archive
// /projects/{id}/restore           → restore
// /projects/stats                  → stats

$seg1 = $segments[$base + 1] ?? null;  // project ID or 'stats'
$seg2 = $segments[$base + 2] ?? null;  // 'members' | 'folders' | 'archive' | 'restore'
$seg3 = $segments[$base + 3] ?? null;  // user_id or folder_id
$projectId = is_numeric($seg1) ? (int)$seg1 : null;

// Stats — admin only
if ($seg1 === 'stats') {
    $auth = requireAdmin();
    $controller->stats($auth);
    exit();
}

$auth = authenticate();

match (true) {
    // projects list / create
    $method === 'GET'  && $projectId === null && $seg1 === null => $controller->index($auth),
    $method === 'POST' && $projectId === null => $controller->store($auth),

    // single project
    $method === 'GET'    && $projectId !== null && $seg2 === null => $controller->show($auth, $projectId),
    $method === 'PUT'    && $projectId !== null && $seg2 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->update($auth, $projectId); })(),
    $method === 'PATCH'  && $projectId !== null && $seg2 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->update($auth, $projectId); })(),
    $method === 'DELETE' && $projectId !== null && $seg2 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->destroy($auth, $projectId); })(),

    // archive / restore
    $method === 'POST' && $projectId !== null && $seg2 === 'archive' => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->archive($auth, $projectId); })(),
    $method === 'POST' && $projectId !== null && $seg2 === 'restore' => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->restore($auth, $projectId); })(),

    // members
    $method === 'GET'    && $projectId !== null && $seg2 === 'members' && $seg3 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->getMembers($auth,$projectId); })(),
    $method === 'POST'   && $projectId !== null && $seg2 === 'members' && $seg3 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->addMember($auth,$projectId); })(),
    $method === 'PUT'    && $projectId !== null && $seg2 === 'members' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->updateMember($auth,$projectId,(int)$seg3); })(),
    $method === 'PATCH'  && $projectId !== null && $seg2 === 'members' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->updateMember($auth,$projectId,(int)$seg3); })(),
    $method === 'DELETE' && $projectId !== null && $seg2 === 'members' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->removeMember($auth,$projectId,(int)$seg3); })(),

    // folders
    $method === 'GET'    && $projectId !== null && $seg2 === 'folders' && $seg3 === null => $controller->getFolders($auth,$projectId),
    $method === 'POST'   && $projectId !== null && $seg2 === 'folders' && $seg3 === null => (function() use ($controller,$auth,$projectId){ requireAdmin(); $controller->createFolder($auth,$projectId); })(),
    $method === 'PUT'    && $projectId !== null && $seg2 === 'folders' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->updateFolder($auth,$projectId,(int)$seg3); })(),
    $method === 'PATCH'  && $projectId !== null && $seg2 === 'folders' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->updateFolder($auth,$projectId,(int)$seg3); })(),
    $method === 'DELETE' && $projectId !== null && $seg2 === 'folders' && is_numeric($seg3) => (function() use ($controller,$auth,$projectId,$seg3){ requireAdmin(); $controller->deleteFolder($auth,$projectId,(int)$seg3); })(),

    default => (function(){ http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found']); })()
};
