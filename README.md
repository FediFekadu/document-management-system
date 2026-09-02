# Document Management System

A full-stack Project-Based Document Management System with role-based access control.

**Stack:** React + Vite (frontend) · PHP (backend API) · MySQL (database) · XAMPP

---

## Quick Setup

### 1. XAMPP

1. Download and install [XAMPP](https://www.apachefriends.org/)
2. Start **Apache** and **MySQL** from XAMPP Control Panel

### 2. Database

1. Open **phpMyAdmin** → `http://localhost/phpmyadmin`
2. Import the file: `database/schema.sql`
   - Click **Import** → Choose file → **Go**
3. The database `dms_db` will be created with all tables and a default admin user

### 3. Backend (PHP)

1. Copy the entire `backend/` folder to your XAMPP htdocs:
   ```
   C:\xampp\htdocs\dms\backend\
   ```
2. Verify the uploads directories exist (they are already created):
   ```
   backend/uploads/documents/
   backend/uploads/avatars/
   ```
3. If your MySQL credentials differ, edit `backend/config/database.php`

### 4. Frontend (React)

Open a terminal in the `frontend/` directory:

```bash
npm install        # already done — skip if node_modules exists
npm run dev        # starts dev server at http://localhost:5173
```

For production build:
```bash
npm run build      # outputs to frontend/dist/
```

---

## Default Login

| Role  | Username | Password   |
|-------|----------|------------|
| Admin | admin    | Admin@1234 |

---

## API Base URL

All PHP API endpoints are at:
```
http://localhost/dms/backend/api/
```

The React dev server proxies `/api` requests to PHP automatically via `vite.config.js`.

---

## Project Structure

```
document Management system/
├── database/
│   └── schema.sql              ← Import this into MySQL
│
├── backend/                    ← Copy to C:\xampp\htdocs\dms\backend\
│   ├── .htaccess
│   ├── config/
│   │   ├── database.php
│   │   ├── config.php
│   │   └── cors.php
│   ├── middleware/
│   │   └── auth.php
│   ├── models/                 ← Database models
│   ├── controllers/            ← Business logic
│   ├── api/                    ← Route entry points
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   ├── documents/
│   │   ├── notifications/
│   │   ├── favorites/
│   │   ├── activity/
│   │   ├── search/
│   │   ├── tags/
│   │   └── dashboard/
│   ├── helpers/
│   └── uploads/                ← Uploaded files stored here
│
└── frontend/                   ← React application
    ├── src/
    │   ├── api/                ← API client functions
    │   ├── context/            ← AuthContext
    │   ├── components/         ← Layout + UI components
    │   ├── pages/
    │   │   ├── auth/           ← Login
    │   │   ├── admin/          ← Admin pages
    │   │   ├── user/           ← User dashboard
    │   │   ├── projects/       ← Project pages
    │   │   ├── documents/      ← Document panels
    │   │   └── shared/         ← Search, Notifications, Favorites, Profile
    │   └── utils/
    └── dist/                   ← Production build output
```

---

## Features

### Admin
- Dashboard with stats (projects, documents, users, activity)
- Create / edit / archive / delete projects with auto-created folders
- Upload documents (drag & drop), manage versions, tags
- Manage all users (create, edit, activate/deactivate)
- Grant per-project access with granular permissions (View / Upload / Edit / Download / Delete)
- Activity/audit log with filters
- Archive management (restore or permanently delete)

### User
- Personalized dashboard showing accessible projects and recent documents
- Browse only assigned projects and documents
- Upload / edit / download documents per granted permissions
- Document version history
- Favorites (star/unstar documents)
- Notifications (access granted, new documents, updates)
- Global search within authorized content
- Profile management and password change

### Security
- Server-side permission checks on every request
- Password hashing (bcrypt cost 12)
- Session-based authentication with HttpOnly cookies
- Role-based access control (admin / user)
- Project-level + document-level permissions
- File upload validation (type + size)
- Direct file URL access blocked via .htaccess
- SQL injection prevention (PDO prepared statements)
