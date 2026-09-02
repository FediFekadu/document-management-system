<?php
require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../middleware/auth.php';
require_once __DIR__ . '/../../controllers/MiscController.php';

$auth       = authenticate();
$db         = (new Database())->getConnection();
$controller = new MiscController($db);

if ($auth['role'] === 'admin') {
    $controller->adminStats($auth);
} else {
    $controller->userStats($auth);
}
