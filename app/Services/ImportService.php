<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Party;
use App\Models\Brand;
use App\Models\Family;
use App\Models\Tva;
use App\Models\Unit;
use App\Models\PriceLevel;
use App\Models\Wilaya;
use App\Models\Commune;
use App\Models\LegalForm;
use App\Models\PartyType;
use App\Models\ProductPrice;
use App\Models\ProductType;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class ImportService
{
    // ═════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ═════════════════════════════════════════════════════════════════

    public function validateProducts(array $rows, int $companyId): array
    {
        $errors = [];
        $families = Family::where('company_id', $companyId)->get()->keyBy(fn($f) => mb_strtolower(trim($f->name)));
        $brands   = Brand::where('company_id', $companyId)->get()->keyBy(fn($b) => mb_strtolower(trim($b->name)));
        $tvas     = Tva::where('company_id', $companyId)->get();
        $units    = Unit::where('company_id', $companyId)->get()->keyBy(fn($u) => mb_strtolower(trim($u->name)));
        $allRefs  = Product::where('company_id', $companyId)->pluck('id', 'ref')->map(fn($v, $k) => mb_strtolower(trim($k)));
        $allBarcodes = Product::where('company_id', $companyId)->pluck('id', 'barcode')->filter()->map(fn($v, $k) => mb_strtolower(trim($k)));
        $pendingFamilies = [];
        $pendingBrands = [];
        $pendingUnits = [];

        $validated = [];
        foreach ($rows as $i => $row) {
            $line = $i + 1;
            $rowErrors = [];
            $data = [];

            // اسم المنتج (مطلوب)
            $name = $this->extract($row, 'name');
            if (empty($name)) {
                $rowErrors[] = 'اسم المنتج مطلوب';
            } else {
                $data['name'] = $name;
            }

            // المرجع
            $ref = $this->extract($row, 'ref');
            if ($ref) {
                $refKey = mb_strtolower(trim($ref));
                if ($allRefs->has($refKey)) {
                    $rowErrors[] = "المرجع '$ref' موجود مسبقاً";
                }
                $data['ref'] = $ref;
            }

            // الباركود
            $barcode = $this->extract($row, 'barcode');
            if ($barcode) {
                $bcKey = mb_strtolower(trim($barcode));
                if ($allBarcodes->has($bcKey)) {
                    $rowErrors[] = "الباركود '$barcode' موجود مسبقاً";
                }
                $data['barcode'] = $barcode;
            }

            // الوصف
            $desc = $this->extract($row, 'description');
            if ($desc) $data['description'] = $desc;

            // الفئة (family) — auto-create if missing
            $familyName = $this->extract($row, 'family');
            if ($familyName) {
                $key = mb_strtolower(trim($familyName));
                if ($families->has($key)) {
                    $data['family_id'] = $families[$key]->id;
                } else {
                    $pendingFamilies[$key] = trim($familyName);
                    $data['_pending_family'] = trim($familyName);
                }
            }

            // الماركة (brand) — auto-create if missing
            $brandName = $this->extract($row, 'brand');
            if ($brandName) {
                $key = mb_strtolower(trim($brandName));
                if ($brands->has($key)) {
                    $data['brand_id'] = $brands[$key]->id;
                } else {
                    $pendingBrands[$key] = trim($brandName);
                    $data['_pending_brand'] = trim($brandName);
                }
            }

            // الضريبة (tva)
            $tvaVal = $this->extract($row, 'tva');
            if ($tvaVal !== '') {
                $tva = $this->resolveTva($tvaVal, $tvas, $companyId);
                if ($tva) {
                    $data['tva_id'] = $tva->id;
                } else {
                    $rowErrors[] = "نسبة الضريبة '$tvaVal' غير صالحة";
                }
            }

            // الوحدة (unit) — auto-create if missing
            $unitName = $this->extract($row, 'unit');
            if ($unitName) {
                $key = mb_strtolower(trim($unitName));
                $unit = $units->get($key);
                if ($unit) {
                    $data['unit_id'] = $unit->id;
                } else {
                    $pendingUnits[$key] = trim($unitName);
                    $data['_pending_unit'] = trim($unitName);
                }
            }

            // سعر الشراء
            $purchasePrice = $this->extract($row, 'purchase_price_ht');
            if ($purchasePrice !== '') {
                $data['purchase_price_ht'] = $this->parseNumber($purchasePrice);
            }

            // سعر البيع
            $sellPrice = $this->extract($row, 'selling_price');
            if ($sellPrice !== '') {
                $data['default_selling_price_ht'] = $this->parseNumber($sellPrice);
            }

            // يدير المخزون
            $managesStock = $this->extract($row, 'manages_stock');
            if ($managesStock !== '') {
                $data['manages_stock'] = in_array(mb_strtolower(trim($managesStock)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            // التنبيه عند انخفاض المخزون
            $minStock = $this->extract($row, 'min_stock_alert');
            if ($minStock !== '') {
                $data['min_stock_alert'] = (int) $this->parseNumber($minStock);
            }

            // نشط
            $active = $this->extract($row, 'active');
            if ($active !== '') {
                $data['active'] = in_array(mb_strtolower(trim($active)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            if (count($rowErrors) > 0) {
                $errors[] = ['line' => $line, 'errors' => $rowErrors, 'row' => $row];
            } else {
                $validated[] = $data;
            }
        }

        $pending = [];
        if (!empty($pendingFamilies)) $pending['families'] = array_values($pendingFamilies);
        if (!empty($pendingBrands))   $pending['brands']   = array_values($pendingBrands);
        if (!empty($pendingUnits))    $pending['units']    = array_values($pendingUnits);

        return ['validated' => $validated, 'errors' => $errors, 'pending_entities' => $pending];
    }

    public function importProducts(array $rows, int $companyId, ?int $userId = null, ?array $pendingEntities = null): array
    {
        $imported = 0;
        $failed = [];

        DB::beginTransaction();
        try {
            // Auto-create missing families, brands, units
            $this->ensureEntities($pendingEntities, $companyId, $userId);

            // Re-fetch lookups so we can resolve pending names
            $families = Family::where('company_id', $companyId)->get()->keyBy(fn($f) => mb_strtolower(trim($f->name)));
            $brands   = Brand::where('company_id', $companyId)->get()->keyBy(fn($b) => mb_strtolower(trim($b->name)));
            $units    = Unit::where('company_id', $companyId)->get()->keyBy(fn($u) => mb_strtolower(trim($u->name)));

            foreach ($rows as $i => $data) {
                try {
                    $data['company_id'] = $companyId;
                    if ($userId) {
                        $data['created_by'] = $userId;
                        $data['updated_by'] = $userId;
                    }
                    if (empty($data['ref'])) {
                        $data['ref'] = 'IMP-' . Str::random(8);
                    }

                    // Resolve pending entities
                    if (isset($data['_pending_family'])) {
                        $key = mb_strtolower(trim($data['_pending_family']));
                        if ($families->has($key)) {
                            $data['family_id'] = $families[$key]->id;
                        }
                        unset($data['_pending_family']);
                    }
                    if (isset($data['_pending_brand'])) {
                        $key = mb_strtolower(trim($data['_pending_brand']));
                        if ($brands->has($key)) {
                            $data['brand_id'] = $brands[$key]->id;
                        }
                        unset($data['_pending_brand']);
                    }
                    if (isset($data['_pending_unit'])) {
                        $key = mb_strtolower(trim($data['_pending_unit']));
                        if ($units->has($key)) {
                            $data['unit_id'] = $units[$key]->id;
                        }
                        unset($data['_pending_unit']);
                    }

                    // Extract selling price before create (not in $fillable)
                    $sellPrice = $data['default_selling_price_ht'] ?? null;
                    unset($data['default_selling_price_ht']);

                    $product = Product::create($data);

                    // Auto-create default packaging if none provided
                    $product->packagings()->create([
                        'code'          => '1',
                        'label'         => 'unite',
                        'quantity'      => 1,
                        'is_default'    => true,
                        'active'        => true,
                        'display_order' => 1,
                    ]);

                    // Create a price record if selling price was provided
                    if ($sellPrice !== null && $sellPrice > 0) {
                        $defaultLevel = PriceLevel::where('company_id', $companyId)
                            ->where('is_default', true)
                            ->first();
                        ProductPrice::create([
                            'company_id'      => $companyId,
                            'product_id'      => $product->id,
                            'price_level_id'  => $defaultLevel?->id,
                            'price'           => $sellPrice,
                            'active'          => true,
                        ]);
                    }

                    $imported++;
                } catch (\Throwable $e) {
                    $failed[] = ['line' => $i + 1, 'error' => $e->getMessage()];
                    Log::warning("Import product row {$i} failed: " . $e->getMessage());
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['imported' => $imported, 'failed' => $failed];
    }

    private function ensureEntities(?array $pendingEntities, int $companyId, ?int $userId = null): void
    {
        if (empty($pendingEntities)) return;

        // NOTE: firstOrCreate/updateOrCreate are NOT used here on purpose.
        // Laravel wraps their create in DB::transaction() (a SAVEPOINT) when called
        // inside an open transaction, and never issues RELEASE SAVEPOINT — the
        // repeated same-name savepoint churn makes Windows SQLite return
        // "unable to open database file" (CANTOPEN) on the 2nd-3rd iteration.
        // Explicit first()+create() is the safe equivalent (see G/D4 diag tests).

        if (!empty($pendingEntities['families'])) {
            foreach ($pendingEntities['families'] as $name) {
                $family = Family::where('company_id', $companyId)->where('name', $name)->first();
                if (!$family) {
                    Family::create(
                        ['company_id' => $companyId, 'name' => $name]
                        + ($userId ? ['created_by' => $userId, 'updated_by' => $userId] : [])
                    );
                }
            }
        }

        if (!empty($pendingEntities['brands'])) {
            foreach ($pendingEntities['brands'] as $name) {
                $brand = Brand::where('company_id', $companyId)->where('name', $name)->first();
                if (!$brand) {
                    Brand::create(['company_id' => $companyId, 'name' => $name]);
                }
            }
        }

        if (!empty($pendingEntities['units'])) {
            foreach ($pendingEntities['units'] as $name) {
                $unit = Unit::where('company_id', $companyId)->where('name', $name)->first();
                if (!$unit) {
                    Unit::create(['company_id' => $companyId, 'name' => $name]);
                }
            }
        }

        if (!empty($pendingEntities['price_levels'])) {
            foreach ($pendingEntities['price_levels'] as $name) {
                $level = PriceLevel::where('company_id', $companyId)->where('name', $name)->first();
                if (!$level) {
                    PriceLevel::create(
                        ['company_id' => $companyId, 'name' => $name, 'is_percentage' => true, 'value' => 0]
                    );
                }
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // PARTIES
    // ═════════════════════════════════════════════════════════════════

    public function validateParties(array $rows, int $companyId): array
    {
        $errors = [];
        $priceLevels = PriceLevel::where('company_id', $companyId)->get()->keyBy(fn($p) => mb_strtolower(trim($p->name)));
        $wilayas     = Wilaya::all()->keyBy(fn($w) => mb_strtolower(trim($w->name)));
        $communes    = Commune::all()->keyBy(fn($c) => mb_strtolower(trim($c->name)));
        $legalForms  = LegalForm::where('company_id', $companyId)->get()->keyBy(fn($l) => mb_strtolower(trim($l->name)));
        $partyTypes  = PartyType::where('company_id', $companyId)->get();
        $existingNifs   = Party::where('company_id', $companyId)->whereNotNull('nif')->pluck('id', 'nif')->map(fn($v, $k) => mb_strtolower(trim($k)));
        $existingCodes  = Party::where('company_id', $companyId)->whereNotNull('code')->pluck('id', 'code')->map(fn($v, $k) => mb_strtolower(trim($k)));
        $pendingPriceLevels = [];
        $batchNifs  = [];
        $batchCodes = [];

        $validated = [];
        foreach ($rows as $i => $row) {
            $line = $i + 1;
            $rowErrors = [];
            $data = [];

            // الاسم (مطلوب)
            $name = $this->extract($row, 'name');
            if (empty($name)) {
                $rowErrors[] = 'اسم الطرف مطلوب';
            } else {
                $data['name'] = $name;
                $data['slug'] = Str::slug($name) . '-' . Str::random(4);
            }

            // النوع (مطلوب)
            $typeVal = $this->extract($row, 'party_type');
            if (empty($typeVal)) {
                $rowErrors[] = 'نوع الطرف مطلوب (زبون/مورد/كلاهما)';
            } else {
                $typeId = $this->resolvePartyType($typeVal, $partyTypes);
                if ($typeId) {
                    $data['party_type_id'] = $typeId;
                } else {
                    $rowErrors[] = "نوع الطرف '$typeVal' غير صالح (استخدم: زبون، مورد، كلاهما)";
                }
            }

            // الهاتف
            $phone = $this->extract($row, 'phone');
            if ($phone) $data['phone'] = $phone;

            // الجوال
            $mobile = $this->extract($row, 'mobile');
            if ($mobile) $data['mobile'] = $mobile;

            // البريد الإلكتروني
            $email = $this->extract($row, 'email');
            if ($email) {
                if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    $data['email'] = $email;
                } else {
                    $rowErrors[] = "البريد الإلكتروني '$email' غير صالح";
                }
            }

            // الكود
            $code = $this->extract($row, 'code');
            if ($code) {
                $codeKey = mb_strtolower(trim($code));
                if ($existingCodes->has($codeKey)) {
                    $rowErrors[] = "الكود '$code' موجود مسبقاً";
                } elseif (isset($batchCodes[$codeKey])) {
                    $rowErrors[] = "الكود '$code' مكرر في نفس الملف (سطر {$batchCodes[$codeKey]})";
                } else {
                    $batchCodes[$codeKey] = $line;
                }
                $data['code'] = $code;
            }

            // الاسم التجاري
            $commercialName = $this->extract($row, 'commercial_name');
            if ($commercialName) $data['commercial_name'] = $commercialName;

            // النشاط
            $activity = $this->extract($row, 'activity');
            if ($activity) $data['activity'] = $activity;

            // الفاكس
            $fax = $this->extract($row, 'fax');
            if ($fax) $data['fax'] = $fax;

            // العنوان
            $address = $this->extract($row, 'address');
            if ($address) $data['address'] = $address;

            // الرقم الجبائي (NIF)
            $nif = $this->extract($row, 'nif');
            if ($nif) {
                $nifKey = mb_strtolower(trim($nif));
                if ($existingNifs->has($nifKey)) {
                    $rowErrors[] = "الرقم الجبائي '$nif' موجود مسبقاً";
                } elseif (isset($batchNifs[$nifKey])) {
                    $rowErrors[] = "الرقم الجبائي '$nif' مكرر في نفس الملف (سطر {$batchNifs[$nifKey]})";
                } else {
                    $batchNifs[$nifKey] = $line;
                }
                $data['nif'] = $nif;
            }

            // السجل التجاري
            $rc = $this->extract($row, 'rc');
            if ($rc) $data['rc'] = $rc;

            // الرقم الإحصائي
            $nis = $this->extract($row, 'nis');
            if ($nis) $data['nis'] = $nis;

            // المادة رقم
            $ai = $this->extract($row, 'ai');
            if ($ai) $data['ai'] = $ai;

            // تاريخ السجل التجاري
            $rcDate = $this->extract($row, 'rc_date');
            if ($rcDate) $data['rc_date'] = $rcDate;

            // الشكل القانوني
            $legalFormName = $this->extract($row, 'legal_form');
            if ($legalFormName) {
                $key = mb_strtolower(trim($legalFormName));
                if ($legalForms->has($key)) {
                    $data['legal_form_id'] = $legalForms[$key]->id;
                } else {
                    $rowErrors[] = "الشكل القانوني '$legalFormName' غير موجود";
                }
            }

            // رأس المال
            $capital = $this->extract($row, 'capital_amount');
            if ($capital !== '') {
                $data['capital_amount'] = $this->parseNumber($capital);
            }

            // الولاية
            $wilayaName = $this->extract($row, 'wilaya');
            if ($wilayaName) {
                $key = mb_strtolower(trim($wilayaName));
                if ($wilayas->has($key)) {
                    $data['wilaya_id'] = $wilayas[$key]->id;
                } else {
                    $rowErrors[] = "الولاية '$wilayaName' غير موجودة";
                }
            }

            // البلدية
            $communeName = $this->extract($row, 'commune');
            if ($communeName) {
                $key = mb_strtolower(trim($communeName));
                if ($communes->has($key)) {
                    $data['commune_id'] = $communes[$key]->id;
                } else {
                    $rowErrors[] = "البلدية '$communeName' غير موجودة";
                }
            }

            // فئة السعر — auto-create if missing
            $plName = $this->extract($row, 'price_level');
            if ($plName) {
                $key = mb_strtolower(trim($plName));
                if ($priceLevels->has($key)) {
                    $data['default_price_level_id'] = $priceLevels[$key]->id;
                } else {
                    $pendingPriceLevels[$key] = trim($plName);
                    $data['_pending_price_level'] = trim($plName);
                }
            }

            // مدة الائتمان
            $creditDays = $this->extract($row, 'credit_days');
            if ($creditDays !== '') {
                $data['credit_days'] = (int) $this->parseNumber($creditDays);
            }

            // حد الائتمان
            $creditLimit = $this->extract($row, 'credit_limit');
            if ($creditLimit !== '') {
                $data['credit_limit'] = $this->parseNumber($creditLimit);
            }

            // اسم البنك
            $bankName = $this->extract($row, 'bank_name');
            if ($bankName) $data['bank_name'] = $bankName;

            // رقم الحساب البنكي
            $rib = $this->extract($row, 'rib');
            if ($rib) $data['rib'] = $rib;

            // معفى من الضريبة
            $tvaExempt = $this->extract($row, 'is_tva_exempt');
            if ($tvaExempt !== '') {
                $data['is_tva_exempt'] = in_array(mb_strtolower(trim($tvaExempt)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            // خاضع للضريبة
            $taxable = $this->extract($row, 'is_taxable');
            if ($taxable !== '') {
                $data['is_taxable'] = in_array(mb_strtolower(trim($taxable)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            // النظام الضريبي
            $taxRegime = $this->extract($row, 'tax_regime');
            if ($taxRegime) $data['tax_regime'] = $taxRegime;

            // رقم CNAS
            $cnas = $this->extract($row, 'cnas_number');
            if ($cnas) $data['cnas_number'] = $cnas;

            // مستهلك نهائي
            $finalConsumer = $this->extract($row, 'is_final_consumer');
            if ($finalConsumer !== '') {
                $data['is_final_consumer'] = in_array(mb_strtolower(trim($finalConsumer)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            // نشط
            $active = $this->extract($row, 'active');
            if ($active !== '') {
                $data['active'] = in_array(mb_strtolower(trim($active)), ['نعم', 'yes', 'oui', '1', 'true', 'صح']);
            }

            if (count($rowErrors) > 0) {
                $errors[] = ['line' => $line, 'errors' => $rowErrors, 'row' => $row];
            } else {
                $validated[] = $data;
            }
        }

        $pending = [];
        if (!empty($pendingPriceLevels)) $pending['price_levels'] = array_values($pendingPriceLevels);

        return ['validated' => $validated, 'errors' => $errors, 'pending_entities' => $pending];
    }

    public function importParties(array $rows, int $companyId, ?int $userId = null, ?array $pendingEntities = null): array
    {
        $imported = 0;
        $failed = [];

        DB::beginTransaction();
        try {
            // Auto-create missing price levels
            $this->ensureEntities($pendingEntities, $companyId, $userId);

            // Re-fetch lookups so we can resolve pending names
            $priceLevels = PriceLevel::where('company_id', $companyId)->get()->keyBy(fn($p) => mb_strtolower(trim($p->name)));

            foreach ($rows as $i => $data) {
                try {
                    $data['company_id'] = $companyId;
                    if ($userId) {
                        $data['created_by'] = $userId;
                        $data['updated_by'] = $userId;
                    }

                    // Resolve pending price level
                    if (isset($data['_pending_price_level'])) {
                        $key = mb_strtolower(trim($data['_pending_price_level']));
                        if ($priceLevels->has($key)) {
                            $data['default_price_level_id'] = $priceLevels[$key]->id;
                        }
                        unset($data['_pending_price_level']);
                    }

                    Party::create($data);
                    $imported++;
                } catch (\Throwable $e) {
                    $failed[] = ['line' => $i + 1, 'error' => $e->getMessage()];
                    Log::warning("Import party row {$i} failed: " . $e->getMessage());
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        return ['imported' => $imported, 'failed' => $failed];
    }

    // ═════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════

    private function extract(array $row, string $key): string
    {
        return isset($row[$key]) ? trim((string) $row[$key]) : '';
    }

    private function parseNumber(string $value): float
    {
        $value = str_replace([' ', ','], ['', '.'], $value);
        return (float) $value;
    }

    private function resolveTva(string $value, $tvas, int $companyId): ?Tva
    {
        $value = trim($value);
        // Try by rate
        $rate = (float) str_replace(',', '.', $value);
        $tva = $tvas->first(fn($t) => abs((float) $t->rate - $rate) < 0.01);
        if ($tva) return $tva;

        // Try by name
        $key = mb_strtolower($value);
        return $tvas->first(fn($t) => mb_strtolower(trim($t->name ?? '')) === $key);
    }

    private function resolvePartyType(string $value, $partyTypes): ?int
    {
        $value = mb_strtolower(trim($value));
        $map = [
            'زبون' => 'client', 'زبون' => 'client', 'client' => 'client', 'customer' => 'client',
            'مورد' => 'supplier', 'fournisseur' => 'supplier', 'supplier' => 'supplier',
            'كلاهما' => 'both', 'mixed' => 'both', 'les deux' => 'both',
        ];
        $typeSlug = $map[$value] ?? null;
        if (!$typeSlug) return null;

        $partyType = $partyTypes->first(fn($pt) => mb_strtolower(trim($pt->slug ?? $pt->name)) === $typeSlug);
        return $partyType?->id;
    }
}
