<?php
class Response {
    public static function json($data, int $code = 200): void {
        http_response_code($code);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit();
    }

    public static function success($data = null, string $message = 'Success', int $code = 200): void {
        $body = ['success' => true, 'message' => $message];
        if ($data !== null) $body['data'] = $data;
        self::json($body, $code);
    }

    public static function error(string $message = 'Error', int $code = 400, $errors = null): void {
        $body = ['success' => false, 'message' => $message];
        if ($errors !== null) $body['errors'] = $errors;
        self::json($body, $code);
    }

    public static function paginate($items, int $total, int $page, int $perPage): void {
        self::json([
            'success' => true,
            'data'    => $items,
            'pagination' => [
                'total'        => $total,
                'per_page'     => $perPage,
                'current_page' => $page,
                'last_page'    => (int) ceil($total / max($perPage, 1)),
            ]
        ]);
    }
}
