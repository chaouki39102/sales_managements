# Sales Management API Documentation

## Overview
This is a RESTful API for Sales Management System built with Laravel 13.

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
The API uses Laravel Sanctum for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer {token}
```

---

## Authentication Endpoints

### 1. Register
**POST** `/auth/register`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "admin@mail.com",
  "password": "password",
  "password_confirmation": "password"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "تم التسجيل بنجاح",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "admin@mail.com",
      "created_at": "2026-04-14T10:30:00.000000Z",
      "updated_at": "2026-04-14T10:30:00.000000Z"
    },
    "token": "1|abc123xyz789...",
    "token_type": "Bearer"
  },
  "status": 201
}
```

---

### 2. Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم دخولك بنجاح",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2026-04-14T10:30:00.000000Z",
      "updated_at": "2026-04-14T10:30:00.000000Z"
    },
    "token": "1|abc123xyz789...",
    "token_type": "Bearer"
  },
  "status": 200
}
```

---

### 3. Get Current User
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم استرجاع البيانات بنجاح",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2026-04-14T10:30:00.000000Z",
    "updated_at": "2026-04-14T10:30:00.000000Z"
  },
  "status": 200
}
```

---

### 4. Update User
**PUT** `/auth/update`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم التحديث بنجاح",
  "data": {
    "id": 1,
    "name": "Jane Doe",
    "email": "jane@example.com",
    "created_at": "2026-04-14T10:30:00.000000Z",
    "updated_at": "2026-04-14T10:30:00.000000Z"
  },
  "status": 200
}
```

---

### 5. Change Password
**POST** `/auth/change-password`

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "current_password": "password123",
  "new_password": "newpassword123",
  "new_password_confirmation": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم تغيير كلمة المرور بنجاح",
  "data": null,
  "status": 200
}
```

---

### 6. Logout
**POST** `/auth/logout`

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الخروج بنجاح",
  "data": null,
  "status": 200
}
```

---

## Error Responses

### Validation Error (422)
```json
{
  "success": false,
  "message": "Validation failed",
  "data": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  },
  "status": 422
}
```

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Unauthorized",
  "data": null,
  "status": 401
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Resource not found",
  "data": null,
  "status": 404
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error",
  "data": null,
  "status": 500
}
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable Entity |
| 500 | Internal Server Error |

---

## Rate Limiting
API requests are rate-limited to prevent abuse. Limits are:
- **60 requests per minute** for authenticated users
- **20 requests per minute** for unauthenticated requests

---

## Best Practices
1. Always use HTTPS in production
2. Keep your API token secure
3. Include proper error handling in your client
4. Use appropriate HTTP methods (GET, POST, PUT, DELETE)
5. Validate input before sending requests

---

## Support
For issues or questions, please contact the development team.
