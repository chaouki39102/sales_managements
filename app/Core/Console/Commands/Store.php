<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;


class Store{{ModelName}}Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Name is required',
        ];
    }
}

STUB;
    }

    protected function getDefaultUpdateRequestStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

