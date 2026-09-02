<?php
// Allow React dev server (Vite default port 5173) and production origin
$allowed = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:5173");
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, X-Auth-Token');
header('Access-Control-Expose-Headers: Content-Disposition');
header('Content-Type: application/json; charset=utf-8');

// Configure session cookie BEFORE session starts so cross-origin cookies work
ini_set('session.cookie_samesite', 'None');
ini_set('session.cookie_secure', '0');   // set to 1 only on HTTPS
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_path', '/');
ini_set('session.gc_maxlifetime', 28800);

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
