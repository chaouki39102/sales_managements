<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\EmailTemplate;
use App\Services\EmailTemplateService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class EmailTemplateController extends BaseApiController
{
    protected string  $resourceName  = 'email_template';
    protected ?string $resourceClass = null;

    /**
     * قائمة القوالب (اختيارياً مصفّاة بنوع مستند).
     * `doc_type_code=generic` يُرجع القالب العام (doc_type_code = null).
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = EmailTemplate::query();

            if ($request->has('doc_type_code')) {
                $code = $request->input('doc_type_code');
                if ($code === 'generic' || $code === null || $code === '') {
                    $query->whereNull('doc_type_code');
                } else {
                    $query->where('doc_type_code', $code);
                }
            }

            $templates = $query->orderBy('is_default', 'desc')
                ->orderBy('id', 'asc')
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
            $template = EmailTemplate::whereKey($resolvedId)->firstOrFail();
            return $this->successResponse($template, 'تم جلب القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    /**
     * قائمة الرموز المدعومة في subject/body (مفتاح + تسمية عربية) —
     * مصدر وحيد تعرضه الواجهة للمستخدم.
     */
    public function placeholders(): JsonResponse
    {
        try {
            $labels = EmailTemplateService::placeholderLabels();
            $items = [];
            foreach ($labels as $key => $label) {
                $items[] = ['key' => $key, 'label' => $label];
            }
            return $this->successResponse($items, 'تم جلب الرموز');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'placeholders');
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validator = Validator::make($request->all(), [
                'name'          => 'required|string|max:255',
                'doc_type_code' => 'nullable|string|max:10',
                'subject'       => 'nullable|string',
                'body'          => 'nullable|string',
                'is_default'    => 'boolean',
                'is_active'     => 'boolean',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $data = $request->all();
            // company_id لا يُقبل من العميل أبداً — HasCompany يملؤه من سياق
            // الشركة فقط؛ قبوله يسمح بكتابة قوالب في شركة أخرى (cross-tenant).
            unset($data['company_id'], $data['id']);
            // '' (فارغ) في doc_type_code يعني «قالب عام» (غير مرتبط بنوع مستند).
            if (isset($data['doc_type_code']) && ($data['doc_type_code'] === null || $data['doc_type_code'] === '')) {
                $data['doc_type_code'] = null;
            }

            $template = EmailTemplate::create($data);
            return $this->successResponse($template, 'تم إنشاء القالب', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $resolvedId = $this->extractId($id);
            $template = EmailTemplate::whereKey($resolvedId)->first();

            if (!$template) {
                return $this->errorResponse('القالب غير موجود', 404);
            }

            $validator = Validator::make($request->all(), [
                'name'          => 'sometimes|string|max:255',
                'doc_type_code' => 'nullable|string|max:10',
                'subject'       => 'nullable|string',
                'body'          => 'nullable|string',
                'is_default'    => 'boolean',
                'is_active'     => 'boolean',
            ]);

            if ($validator->fails()) {
                return $this->errorResponse($validator->errors()->first(), 422);
            }

            $data = $request->all();
            // نفس الحماية: لا نقل ملكية بين الشركات ولا تجاوز id عبر fill.
            unset($data['company_id'], $data['id']);
            if (array_key_exists('doc_type_code', $data) && ($data['doc_type_code'] === null || $data['doc_type_code'] === '')) {
                $data['doc_type_code'] = null;
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
            $template = EmailTemplate::whereKey($resolvedId)->firstOrFail();
            $template->delete();
            return $this->successResponse(null, 'تم حذف القالب');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function setDefault($company, int $id): JsonResponse
    {
        try {
            $template = DB::transaction(function () use ($id) {
                $tpl = EmailTemplate::whereKey($id)->firstOrFail();
                $tpl->is_default = true;
                $tpl->save();
                return $tpl->fresh();
            });
            return $this->successResponse($template, 'تم تعيين القالب الافتراضي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'setDefault');
        }
    }
}