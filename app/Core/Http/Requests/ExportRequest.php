<?php

namespace App\Core\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Anyone who can access the endpoint is authorized to request an export.
        // The controller's 'authorize' method will handle resource-level permissions.
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'format' => ['sometimes', 'in:xlsx,csv'],
            'columns' => ['sometimes', 'array'],
            'columns.*' => ['string', 'alpha_dash'],
            // We don't define filter/sort rules here, as they are dynamic and handled
            // by ApiListService. We let them pass through to be validated there.
        ];
    }

    /**
     * Get the validated data from the request, but also include all other query params.
     *
     * @param string|null $key
     * @param mixed $default
     * @return mixed
     */
    public function validated($key = null, $default = null)
    {
        // We want all query parameters (filters, sorts, etc.) to be passed to the job.
        return array_merge(parent::validated(), $this->query());
    }

    /**
     * Get specific export options from the validated data.
     *
     * @return array
     */
    public function getExportOptions(): array
    {
        return [
            'format' => $this->validated('format', 'xlsx'),
            'columns' => $this->validated('columns'),
        ];
    }
}
