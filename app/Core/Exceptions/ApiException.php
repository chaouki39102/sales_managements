<?php

namespace App\Core\Exceptions;

class ApiException extends \Exception
{
    /**
     * Status code
     */
    protected $statusCode;

    /**
     * Error data
     */
    protected $data;

    public function __construct(
        $message = 'An error occurred',
        $statusCode = 400,
        $data = [],
        $code = 0,
        \Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous);

        $this->statusCode = $statusCode;
        $this->data = $data;
    }

    public function getStatusCode()
    {
        return $this->statusCode;
    }

    public function getData()
    {
        return $this->data;
    }
}
