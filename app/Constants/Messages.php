<?php

namespace App\Constants;

class Messages
{
    // Success Messages
    const SUCCESS = 'Operation completed successfully';
    const CREATED = 'Resource created successfully';
    const UPDATED = 'Resource updated successfully';
    const DELETED = 'Resource deleted successfully';

    // Auth Messages
    const LOGIN_SUCCESS = 'تم دخولك بنجاح';
    const LOGOUT_SUCCESS = 'تم تسجيل الخروج بنجاح';
    const REGISTER_SUCCESS = 'تم التسجيل بنجاح';
    const PASSWORD_CHANGED = 'تم تغيير كلمة المرور بنجاح';

    // Error Messages
    const NOT_FOUND = 'Resource not found';
    const UNAUTHORIZED = 'Unauthorized access';
    const INVALID_CREDENTIALS = 'Invalid credentials';
    const VALIDATION_ERROR = 'Validation failed';
    const INTERNAL_ERROR = 'Internal server error';
}
