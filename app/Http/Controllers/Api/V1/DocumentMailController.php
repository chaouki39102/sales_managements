<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\CommercialDocument;
use App\Services\DocumentMailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentMailController extends BaseApiController
{
    public function __construct(
        private DocumentMailService $mailService,
    ) {
        parent::__construct();
    }

    public function send(Request $request, $company, int $documentId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'message'     => 'nullable|string|max:5000',
                'subject'     => 'nullable|string|max:200',
                'body'        => 'nullable|string|max:20000',
                'template_id' => 'nullable|integer',
                'attach_pdf'  => 'nullable|boolean',
            ]);

            $document = CommercialDocument::findOrFail($documentId);
            $options = [
                'template_id' => $validated['template_id'] ?? null,
                'subject'     => $validated['subject'] ?? null,
                'body'        => $validated['body'] ?? null,
                'attach_pdf'  => $validated['attach_pdf'] ?? true,
            ];
            $success = $this->mailService->sendToParty(
                $document,
                $validated['message'] ?? null,
                $options,
            );

            if ($success) {
                return response()->json(['message' => 'تم إرسال المستند للزبون بنجاح']);
            }

            return response()->json(['message' => 'فشل إرسال البريد — الزبون لا يوجد لديه بريد إلكتروني'], 400);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
