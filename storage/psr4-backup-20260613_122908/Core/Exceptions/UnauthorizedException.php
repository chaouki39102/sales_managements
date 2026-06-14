<?php

namespace App\Core\Exceptions;

class UnauthorizedException extends ApiException
{
    public function __construct($message = 'Unauthorized')
    {
        parent::__construct($message, 401);
    }
}
