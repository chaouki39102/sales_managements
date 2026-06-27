<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\PrintTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PrintTemplateController extends BaseApiController
{
    protected string  $resourceName  = 'print_template';
    protected ?string $resourceClass = null;

    public function index(Request $request): JsonResponse
    {
        try {
            $query = PrintTemplate::query();

            if ($request->has('doc_type_code')) {
                $query->where('doc_type_code', $request->doc_type_code);
            }

            $templates = $query->orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();

            return $this->successResponse($templates, 'تم جلب القوالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $template = PrintTemplate::findOrFail($id);
            return $this->successResponse($template, 'تم جلب القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name'          => 'required|string|max:255',
                'doc_type_code' => 'required|string|max:10',
                'paper_size'    => 'required|string|max:10',
                'is_default'    => 'boolean',
                'is_active'     => 'boolean',
                'config'        => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $template = PrintTemplate::create($request->all());
            return $this->successResponse($template, 'تم إنشاء القالب', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $template = PrintTemplate::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'name'          => 'sometimes|string|max:255',
                'doc_type_code' => 'sometimes|string|max:10',
                'paper_size'    => 'sometimes|string|max:10',
                'is_default'    => 'boolean',
                'is_active'     => 'boolean',
                'config'        => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $template->update($request->all());
            return $this->successResponse($template->fresh(), 'تم تحديث القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $template = PrintTemplate::findOrFail($id);
            $template->delete();
            return $this->successResponse(null, 'تم حذف القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function setDefault(int $id): JsonResponse
    {
        try {
            $template = PrintTemplate::findOrFail($id);
            $template->is_default = true;
            $template->save();
            return $this->successResponse($template->fresh(), 'تم تعيين القالب الافتراضي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'setDefault');
        }
    }

    public function duplicate(Request $request, int $id): JsonResponse
    {
        try {
            $original = PrintTemplate::findOrFail($id);
            $name = $request->input('name', 'نسخة من ' . $original->name);

            $duplicate = $original->replicate();
            $duplicate->name = $name;
            $duplicate->is_default = false;
            $duplicate->save();

            return $this->successResponse($duplicate, 'تم نسخ القالب', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'duplicate');
        }
    }
}
