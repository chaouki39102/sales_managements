<?php

namespace App\Core\Exceptions;

class ValidationException extends ApiException
{
    public function __construct($message = 'Validation failed', $errors = [])
    {
        parent::__construct($message, 422, $errors);
    }
}
