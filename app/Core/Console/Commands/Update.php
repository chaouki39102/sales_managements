<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\File;


class Update{{ModelName}}Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
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

    protected function getDefaultResourceStub(): string
    {
        return <<<'STUB'
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class {{ModelName}}Resource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}

STUB;
    }
}
