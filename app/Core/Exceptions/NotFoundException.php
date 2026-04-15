<?php

namespace App\Core\Exceptions;

class NotFoundException extends ApiException
{
    public function __construct($message = 'Resource not found')
    {
        parent::__construct($message, 404);
    }
}
