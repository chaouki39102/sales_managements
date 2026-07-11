# 🖨️ Backend — Routes (print-templates section from api.php)


## FILE: ./routes/api.php (print-templates section)

```php
50:use App\Http\Controllers\Api\V1\PrintTemplateController;
580:            // ✅ print-templates: قوالب الطباعة — لكل أعضاء الشركة (قراءة وكتابة)
581:            Route::get('print-templates',                    [PrintTemplateController::class, 'index']);
582:            Route::get('print-templates/{id}',               [PrintTemplateController::class, 'show']);
583:            Route::post('print-templates',                   [PrintTemplateController::class, 'store']);
584:            Route::put('print-templates/{id}',               [PrintTemplateController::class, 'update']);
585:            Route::delete('print-templates/{id}',            [PrintTemplateController::class, 'destroy']);
586:            Route::post('print-templates/{id}/set-default',  [PrintTemplateController::class, 'setDefault']);
587:            Route::post('print-templates/{id}/duplicate',    [PrintTemplateController::class, 'duplicate']);
588:            Route::post('print-templates/upload-logo',       [PrintTemplateController::class, 'uploadLogo']);
590:            Route::get('print-templates/library',            [PrintTemplateController::class, 'library']);
591:            Route::post('print-templates/library/install',   [PrintTemplateController::class, 'installLibrary']);

```
