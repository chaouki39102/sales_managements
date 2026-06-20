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
                'message' => 'nullable|string|max:5000',
            ]);

            $document = CommercialDocument::findOrFail($documentId);
            $success = $this->mailService->sendToParty($document, $validated['message'] ?? null);

            if ($success) {
                return response()->json(['message' => 'تم إرسال المستند للزبون بنجاح']);
            }

            return response()->json(['message' => 'فشل إرسال البريد — الزبون لا يوجد لديه بريد إلكتروني'], 400);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}
