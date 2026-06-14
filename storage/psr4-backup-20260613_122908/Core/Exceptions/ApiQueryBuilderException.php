<?php

namespace App\Core\Exceptions;

use Exception;
use Throwable;

/**
 * Custom exception for handling user-facing query builder errors.
 *
 * This exception is thrown when a user provides an invalid parameter for
 * filtering, sorting, or including data, allowing for a specific
 * 400 Bad Request response instead of a generic 500 Server Error.
 */
class ApiQueryBuilderException extends Exception
{
    /**
     * ApiQueryBuilderException constructor.
     *
     * @param string $message The exception message.
     * @param int $code The HTTP status code (defaults to 400).
     * @param Throwable|null $previous The previous throwable used for the exception chaining.
     */
    public function __construct(string $message = "", int $code = 400, ?Throwable $previous = null)
    {
        parent::__construct($message, $code, $previous);
    }
}
