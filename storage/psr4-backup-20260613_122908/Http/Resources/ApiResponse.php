<?php

namespace App\Http\Resources;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;

class ApiResponse extends JsonResource
{
    /**
     * Response status
     */
    protected $success;
    protected $message;
    protected $code;
    protected $meta;

    public function __construct($data = null, $success = true, $message = '', $code = 200, $meta = [])
    {
        parent::__construct($data);

        $this->success = $success;
        $this->message = $message;
        $this->code = $code;
        $this->meta = $meta;
    }

    /**
     * Transform the resource into an array
     */
    public function toArray($request)
    {
        return [
            'success' => $this->success,
            'message' => $this->message,
            'data' => parent::toArray($request),
            'meta' => $this->meta ?: new \stdClass(),
        ];
    }

    /**
     * Customize the response
     */
    public function with($request)
    {
        return [
            'status' => $this->code,
        ];
    }

    /**
     * Success Response
     */
    public static function success($data = null, $message = 'Success', $code = 200, $meta = [])
    {
        return new self($data, true, $message, $code, $meta);
    }

    /**
     * Error Response
     */
    public static function error($message = 'Error', $code = 400, $data = null, $meta = [])
    {
        return new self($data, false, $message, $code, $meta);
    }
}
