<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/ActivityLog.php';
require_once __DIR__ . '/../helpers/Response.php';
require_once __DIR__ . '/../helpers/Validator.php';
require_once __DIR__ . '/../config/config.php';

class UserController {
    private User $model;
    private ActivityLog $log;

    public function __construct(PDO $db) {
        $this->model = new User($db);
        $this->log   = new ActivityLog($db);
    }

    public function index(array $auth): void {
        $page    = max(1, (int)($_GET['page']    ?? 1));
        $perPage = min(100, max(1, (int)($_GET['per_page'] ?? DEFAULT_PAGE_SIZE)));
        $search  = trim($_GET['search'] ?? '');
        $result  = $this->model->getAll($page, $perPage, $search);
        Response::paginate($result['rows'], $result['total'], $page, $perPage);
    }

    public function show(array $auth, int $id): void {
        $user = $this->model->findById($id);
        if (!$user) Response::error('User not found.', 404);
        Response::success($this->model->safeProfile($user));
    }

    public function store(array $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $v = new Validator();
        $v->required('first_name', $body['first_name'] ?? null)
          ->required('last_name',  $body['last_name']  ?? null)
          ->required('email',      $body['email']      ?? null)->email('email', $body['email'] ?? null)
          ->required('username',   $body['username']   ?? null)
          ->required('password',   $body['password']   ?? null)->minLength('password', $body['password'] ?? '', 8);
        if ($v->fails()) Response::error('Validation failed.', 422, $v->errors());

        if ($this->model->emailExists($body['email'])) Response::error('Email already in use.', 409);
        if ($this->model->usernameExists($body['username'])) Response::error('Username already taken.', 409);

        $id = $this->model->create([
            'role_id'       => ($body['role'] ?? 'user') === 'admin' ? 1 : 2,
            'first_name'    => $body['first_name'],
            'last_name'     => $body['last_name'],
            'email'         => $body['email'],
            'username'      => $body['username'],
            'password_hash' => password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]),
            'phone'         => $body['phone']       ?? null,
            'department'    => $body['department']  ?? null,
            'position'      => $body['position']    ?? null,
            'is_active'     => isset($body['is_active']) ? (int)(bool)$body['is_active'] : 1,
            'email_verified'=> 1,
        ]);

        $user = $this->model->findById($id);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'create_user', 'entity_type' => 'user',
                         'entity_id' => $id, 'entity_name' => $body['username']]);
        Response::success($this->model->safeProfile($user), 'User created.', 201);
    }

    public function update(array $auth, int $id): void {
        $user = $this->model->findById($id);
        if (!$user) Response::error('User not found.', 404);

        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if (!empty($body['email']) && $this->model->emailExists($body['email'], $id))
            Response::error('Email already in use.', 409);
        if (!empty($body['username']) && $this->model->usernameExists($body['username'], $id))
            Response::error('Username already taken.', 409);

        $update = array_intersect_key($body, array_flip(
            ['first_name','last_name','email','username','phone','department','position','is_active']
        ));
        if (!empty($body['role'])) {
            $update['role_id'] = ($body['role'] === 'admin') ? 1 : 2;
        }
        if (!empty($body['password'])) {
            if (strlen($body['password']) < 8) Response::error('Password must be at least 8 characters.', 422);
            $update['password_hash'] = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => BCRYPT_COST]);
        }

        $this->model->update($id, $update);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'update_user', 'entity_type' => 'user',
                         'entity_id' => $id, 'entity_name' => $user['username']]);
        Response::success($this->model->safeProfile($this->model->findById($id)), 'User updated.');
    }

    public function destroy(array $auth, int $id): void {
        if ($id === $auth['id']) Response::error('Cannot delete your own account.', 400);
        $user = $this->model->findById($id);
        if (!$user) Response::error('User not found.', 404);
        $this->model->delete($id);
        $this->log->log(['user_id' => $auth['id'], 'action' => 'delete_user', 'entity_type' => 'user',
                         'entity_id' => $id, 'entity_name' => $user['username']]);
        Response::success(null, 'User deleted.');
    }

    public function updateProfile(array $auth): void {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $id   = $auth['id'];

        if (!empty($body['email']) && $this->model->emailExists($body['email'], $id))
            Response::error('Email already in use.', 409);
        if (!empty($body['username']) && $this->model->usernameExists($body['username'], $id))
            Response::error('Username already taken.', 409);

        $update = array_intersect_key($body, array_flip(['first_name','last_name','phone','department','position']));
        if (!empty($body['email']))    $update['email']    = $body['email'];
        if (!empty($body['username'])) $update['username'] = $body['username'];

        $this->model->update($id, $update);
        Response::success($this->model->safeProfile($this->model->findById($id)), 'Profile updated.');
    }
}
