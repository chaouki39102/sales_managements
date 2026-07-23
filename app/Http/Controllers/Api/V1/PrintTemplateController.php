<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\PrintTemplate;
use App\Services\TemplateLibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            $resolvedId = $this->extractId($id);
            $template = PrintTemplate::whereKey($resolvedId)->firstOrFail();
            return $this->successResponse($template, 'تم جلب القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name'             => 'required|string|max:255',
                'doc_type_code'    => 'required|string|max:10',
                'paper_size'       => 'required|string|max:10',
                'is_default'       => 'boolean',
                'is_active'        => 'boolean',
                'template_version' => 'integer|min:1',
                'config'           => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $data = $request->all();
            if (!isset($data['config']) || !is_array($data['config'])) {
                $data['config'] = [];
            }

            $template = PrintTemplate::create($data);
            return $this->successResponse($template, 'تم إنشاء القالب', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $template = PrintTemplate::whereKey($resolvedId)->first();

            if (!$template) {
                return $this->errorResponse('القالب غير موجود', 404);
            }

            $validator = Validator::make($request->all(), [
                'name'             => 'sometimes|string|max:255',
                'doc_type_code'    => 'sometimes|string|max:10',
                'paper_size'       => 'sometimes|string|max:10',
                'is_default'       => 'boolean',
                'is_active'        => 'boolean',
                'template_version' => 'integer|min:1',
                'config'           => 'nullable|array',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $data = $request->all();
            if (isset($data['config']) && !is_array($data['config'])) {
                unset($data['config']);
            }
            // Guard: never replace config with empty array (partial update safety)
            if (isset($data['config']) && is_array($data['config']) && empty($data['config'])) {
                unset($data['config']);
            }

            $template->fill($data);
            $template->save();

            return $this->successResponse($template->fresh(), 'تم تحديث القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $template = PrintTemplate::whereKey($resolvedId)->firstOrFail();
            $template->delete();
            return $this->successResponse(null, 'تم حذف القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function setDefault($company, int $id): JsonResponse
    {
        try {
            $template = PrintTemplate::whereKey($id)->firstOrFail();
            $template->is_default = true;
            $template->save();
            return $this->successResponse($template->fresh(), 'تم تعيين القالب الافتراضي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'setDefault');
        }
    }

    public function duplicate(Request $request, $company, int $id): JsonResponse
    {
        try {
            $original = PrintTemplate::whereKey($id)->firstOrFail();
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

    public function uploadLogo(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'logo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $path = $request->file('logo')->store('print-logos', 'public');
            $url  = Storage::disk('public')->url($path);

            return $this->successResponse(['path' => $path, 'url' => $url], 'تم رفع الشعار');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'uploadLogo');
        }
    }

    // ─── Template Library ───────────────────────────────────────────────────

    public function library(): JsonResponse
    {
        try {
            $templates = TemplateLibraryService::getMetadata();
            return $this->successResponse($templates, 'تم جلب قوالب المكتبة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'library');
        }
    }

    public function installLibrary(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'template_id' => 'required|string|max:50',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $templateId = $request->input('template_id');

            if (!TemplateLibraryService::exists($templateId)) {
                return $this->errorResponse('القالب غير موجود في المكتبة', 404);
            }

            $payload = TemplateLibraryService::getFlatPayload($templateId);

            if (!$payload) {
                return $this->errorResponse('فشل تحميل القالب', 500);
            }

            if ($request->has('doc_type_code') && $request->input('doc_type_code')) {
                $payload['doc_type_code'] = $request->input('doc_type_code');
            }

            $template = PrintTemplate::create($payload);

            return $this->successResponse($template, 'تم تثبيت القالب من المكتبة', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'installLibrary');
        }
    }
}
