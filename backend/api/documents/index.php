<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/DocumentController.php';

$db         = (new Database())->getConnection();
$controller = new DocumentController($db);
$method     = $_SERVER['REQUEST_METHOD'];
$uri        = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments   = array_values(array_filter(explode('/', trim($uri, '/')), fn($s) => $s !== ''));

// Routes:
// /documents/search                    → search
// /documents/stats                     → stats (admin)
// /projects/{pid}/documents            → index / upload
// /projects/{pid}/documents/{did}      → show / update / delete
// /projects/{pid}/documents/{did}/archive
// /projects/{pid}/documents/{did}/restore
// /projects/{pid}/documents/{did}/versions
// /projects/{pid}/documents/{did}/versions/{vid}/download
// /projects/{pid}/documents/{did}/download
// /projects/{pid}/documents/archived

$auth = authenticate();

$docBase = array_search('documents', $segments);
$projBase = array_search('projects', $segments);

// Global search
if ($docBase !== false && ($segments[$docBase + 1] ?? null) === 'search') {
    $controller->search($auth);
    exit();
}

// Stats
if ($docBase !== false && ($segments[$docBase + 1] ?? null) === 'stats') {
    requireAdmin();
    $controller->stats($auth);
    exit();
}

// Project-scoped
if ($projBase !== false) {
    $projectId = (int)($segments[$projBase + 1] ?? 0);
    $seg2      = $segments[$docBase + 1] ?? null;   // doc id or 'archived'
    $docId     = is_numeric($seg2) ? (int)$seg2 : null;
    $seg3      = $segments[$docBase + 2] ?? null;   // 'download'|'archive'|'restore'|'versions'
    $seg4      = $segments[$docBase + 3] ?? null;   // version id
    $seg5      = $segments[$docBase + 4] ?? null;   // 'download' (for version)

    match (true) {
        $method === 'GET'    && $seg2 === 'archived'                                                              => $controller->getArchived($auth, $projectId),
        $method === 'GET'    && $docId === null                                                                   => $controller->index($auth, $projectId),
        $method === 'POST'   && $docId === null                                                                   => $controller->upload($auth, $projectId),
        // version download MUST come before getVersions (more specific first)
        $method === 'GET'    && $docId !== null && $seg3 === 'versions' && is_numeric($seg4) && $seg5 === 'download' => $controller->downloadVersion($auth, $projectId, $docId, (int)$seg4),
        $method === 'GET'    && $docId !== null && $seg3 === 'versions'                                           => $controller->getVersions($auth, $projectId, $docId),
        $method === 'POST'   && $docId !== null && $seg3 === 'versions'                                           => $controller->uploadVersion($auth, $projectId, $docId),
        $method === 'GET'    && $docId !== null && $seg3 === 'download'                                           => $controller->download($auth, $projectId, $docId),
        $method === 'POST'   && $docId !== null && $seg3 === 'archive'                                            => $controller->archive($auth, $projectId, $docId),
        $method === 'POST'   && $docId !== null && $seg3 === 'restore'                                            => $controller->restore($auth, $projectId, $docId),
        $method === 'GET'    && $docId !== null && $seg3 === null                                                  => $controller->show($auth, $projectId, $docId),
        $method === 'PUT'    && $docId !== null && $seg3 === null                                                  => $controller->update($auth, $projectId, $docId),
        $method === 'PATCH'  && $docId !== null && $seg3 === null                                                  => $controller->update($auth, $projectId, $docId),
        $method === 'DELETE' && $docId !== null && $seg3 === null                                                  => $controller->destroy($auth, $projectId, $docId),
        default => (function(){ http_response_code(404); echo json_encode(['success'=>false,'message'=>'Not found']); })()
    };
    exit();
}

http_response_code(404);
echo json_encode(['success' => false, 'message' => 'Not found']);
