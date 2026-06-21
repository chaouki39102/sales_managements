# خطة: واجهة إدارة خارطة تحويل المستندات

## ══ تشخيص الوضع الحالي ════════════════════════════════════════════════════

```
الآن:
  CONVERSION_MAP في document.types.ts (ثابت في الكود)
  ↓
  ConvertDocumentModal يقرأ منه مباشرة
  ↓
  لا يمكن تعديله بدون deployment

المطلوب:
  جدول document_type_conversions في DB
  ↓
  GET /document-types/{id}/allowed-targets
  ↓
  ConvertDocumentModal يقرأ من API
  ↓
  صفحة إدارة للمدير يُعدِّلها وقت التشغيل
```

---

## ══ هيكل قاعدة البيانات ═══════════════════════════════════════════════════

### الخيار A: جدول منفصل (موصى به)
```sql
CREATE TABLE document_type_conversions (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id          BIGINT UNSIGNED NOT NULL,
    source_type_id      BIGINT UNSIGNED NOT NULL,  -- DEV
    target_type_id      BIGINT UNSIGNED NOT NULL,  -- FV
    is_active           BOOLEAN DEFAULT TRUE,
    copy_lines          BOOLEAN DEFAULT TRUE,       -- هل تُنسَخ الأسطر
    copy_party          BOOLEAN DEFAULT TRUE,       -- هل يُنسَخ المتعامل
    copy_prices         BOOLEAN DEFAULT TRUE,       -- هل تُنسَخ الأسعار
    require_full_delivery BOOLEAN DEFAULT FALSE,    -- يتطلب تسليم كامل قبل التحويل
    display_order       INT UNSIGNED DEFAULT 0,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP,

    FOREIGN KEY (company_id)     REFERENCES companies(id),
    FOREIGN KEY (source_type_id) REFERENCES document_types(id),
    FOREIGN KEY (target_type_id) REFERENCES document_types(id),
    UNIQUE KEY uniq_conversion (company_id, source_type_id, target_type_id)
);
```

### Seeder مقابل الـ CONVERSION_MAP الحالي
```php
// DocumentTypeConversionSeeder.php
$conversions = [
    ['source' => 'DEV', 'targets' => ['BCC', 'BL', 'FV'], 'copy_lines' => true, 'copy_party' => true],
    ['source' => 'BCC', 'targets' => ['BL', 'FV'],         'copy_lines' => true, 'copy_party' => true],
    ['source' => 'BL',  'targets' => ['FV'],               'copy_lines' => true, 'copy_party' => true, 'require_full_delivery' => false],
    ['source' => 'DDP', 'targets' => ['BCF'],               'copy_lines' => true, 'copy_party' => true],
    ['source' => 'BCF', 'targets' => ['BR', 'FA'],          'copy_lines' => true, 'copy_party' => true],
    ['source' => 'BR',  'targets' => ['FA'],               'copy_lines' => true, 'copy_party' => true],
];
```

---

## ══ الباكاند — 3 خطوات ════════════════════════════════════════════════════

### الخطوة 1: Migration
```bash
php artisan make:migration create_document_type_conversions_table
```

### الخطوة 2: نموذج DocumentTypeConversion
```php
// app/Models/DocumentTypeConversion.php
class DocumentTypeConversion extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $fillable = [
        'company_id', 'source_type_id', 'target_type_id',
        'is_active', 'copy_lines', 'copy_party', 'copy_prices',
        'require_full_delivery', 'display_order',
    ];

    protected $casts = [
        'is_active'              => 'boolean',
        'copy_lines'             => 'boolean',
        'copy_party'             => 'boolean',
        'copy_prices'            => 'boolean',
        'require_full_delivery'  => 'boolean',
    ];

    public static array $allowedIncludes = ['sourceType', 'targetType'];
    public static array $filterable      = ['source_type_id', 'is_active'];

    public function sourceType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'source_type_id');
    }

    public function targetType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class, 'target_type_id');
    }
}
```

### الخطوة 3: إضافة للـ DocumentType model
```php
// app/Models/DocumentType.php — إضافة
public function allowedConversions(): HasMany
{
    return $this->hasMany(DocumentTypeConversion::class, 'source_type_id')
                ->where('is_active', true)
                ->orderBy('display_order')
                ->with('targetType');
}
```

### الخطوة 4: Route + Controller
```php
// api.php — إضافة route منفصل
Route::get('document-types/{type}/allowed-targets', [DocumentTypeController::class, 'allowedTargets']);

// Route للـ CRUD (في قسم update_company):
Route::apiResource('document-type-conversions', DocumentTypeConversionController::class);
Route::post('document-type-conversions/bulk-update', [DocumentTypeConversionController::class, 'bulkUpdate']);
```

```php
// DocumentTypeController.php — إضافة method
public function allowedTargets(DocumentType $type): JsonResponse
{
    $targets = $type->allowedConversions()
                    ->with('targetType')
                    ->get()
                    ->map(fn($c) => [
                        'id'                    => $c->targetType->id,
                        'code'                  => $c->targetType->code,
                        'name'                  => $c->targetType->name,
                        'copy_lines'            => $c->copy_lines,
                        'copy_party'            => $c->copy_party,
                        'copy_prices'           => $c->copy_prices,
                        'require_full_delivery' => $c->require_full_delivery,
                    ]);

    return $this->successResponse($targets);
}
```

### الخطوة 5: تعديل DocumentConversionService
```php
// التحقق من الجدول بدل الـ hardcoded array
public function validateConversion(CommercialDocument $source, string $targetCode): void
{
    $exists = DocumentTypeConversion::where('company_id',     $source->company_id)
        ->whereHas('sourceType', fn($q) => $q->where('id', $source->document_type_id))
        ->whereHas('targetType', fn($q) => $q->where('code', $targetCode))
        ->where('is_active', true)
        ->exists();

    if (!$exists) {
        throw new BusinessRuleException("التحويل من {$source->documentType->code} إلى {$targetCode} غير مسموح");
    }
}
```

---

## ══ الفرونتند — 3 خطوات ═══════════════════════════════════════════════════

### الخطوة 1: تعديل ConvertDocumentModal — يقرأ من API

```typescript
// بدل CONVERSION_MAP الثابت:

const { data: allowedTargets = [], isLoading } = useQuery({
    queryKey: [slug, 'document-type-allowed-targets', documentTypeId],
    queryFn:  () => apiGet<AllowedTarget[]>(
        `/document-types/${documentTypeId}/allowed-targets`
    ),
    enabled:  !!slug && !!documentTypeId,
    staleTime: 5 * 60_000,
});

// AllowedTarget interface:
interface AllowedTarget {
    id:                    number;
    code:                  string;
    name:                  string;
    copy_lines:            boolean;
    copy_party:            boolean;
    copy_prices:           boolean;
    require_full_delivery: boolean;
}
```

### الخطوة 2: DocumentTypesPage — إضافة قسم التحويلات
```
الصفحة الحالية: /settings/document-types (DocumentTypesPage.tsx)
الإضافة: قسم "قواعد التحويل" في نفس الصفحة
```

### الخطوة 3: CONVERSION_MAP كـ Fallback
```typescript
// نحتفظ به للـ fallback فقط (عند فشل API أو offline)
// نُحذفه من document.types.ts لاحقاً بعد الاستقرار
export const CONVERSION_MAP_FALLBACK: Record<string, string[]> = {
    DEV: ['BCC', 'BL', 'FV'],
    // ...
};
```

---

## ══ واجهة DocumentTypesPage — التصميم ════════════════════════════════════

```
┌──────────────────────────────────────────────────────────────────┐
│  ⚙️ إعدادات أنواع المستندات                                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [📋 أنواع المستندات] [🔄 قواعد التحويل]  ← تابز               │
│                                                                  │
├─────────────────────────── TAB 2 ────────────────────────────────┤
│                                                                  │
│  خريطة التحويل بين المستندات                                    │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  المصدر          يمكن تحويله إلى        خيارات                  │
│  ──────          ──────────────────      ───────                 │
│  DEV  Devis    → [BCC ✓] [BL ✓] [FV ✓] [+إضافة]               │
│  BCC  Commande → [BL  ✓] [FV ✓]         [+إضافة]               │
│  BL   Livraison→ [FV  ✓]                [+إضافة]               │
│  DDP  Demande  → [BCF ✓]                [+إضافة]               │
│  BCF  BonCmd   → [BR  ✓] [FA ✓]        [+إضافة]               │
│  BR   Réception→ [FA  ✓]               [+إضافة]               │
│  FV   Facture  →  —                    [+إضافة]               │
│  FA   FactAchat→  —                    [+إضافة]               │
│                                                                  │
│  عند النقر على [BCC ✓] → mini-panel خيارات:                    │
│  ┌─────────────────────────────────────┐                        │
│  │  DEV → BCC                          │                        │
│  │  ✅ نسخ الأسطر                      │                        │
│  │  ✅ نسخ المتعامل                    │                        │
│  │  ✅ نسخ الأسعار                     │                        │
│  │  ☐ يتطلب تسليم كامل               │                        │
│  │                    [حذف] [حفظ]      │                        │
│  └─────────────────────────────────────┘                        │
│                                                                  │
│  [💾 حفظ التغييرات]                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## ══ الكود الكامل للواجهة ══════════════════════════════════════════════════

```typescript
// pages/settings/DocumentTypesPage.tsx — القسم الجديد

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConversionRule {
    id?:                    number;       // null = جديدة
    source_type_id:         number;
    target_type_id:         number;
    is_active:              boolean;
    copy_lines:             boolean;
    copy_party:             boolean;
    copy_prices:            boolean;
    require_full_delivery:  boolean;
    display_order:          number;
    // UI only:
    _dirty:                 boolean;      // تم تعديله؟
    _deleted:               boolean;      // مُحدَّد للحذف؟
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useConversionRules() {
    const slug = useActiveSlug();
    const qc   = useQueryClient();

    const { data: rules = [], isLoading } = useQuery({
        queryKey:  [slug, 'document-type-conversions'],
        queryFn:   () => apiGet<ConversionRule[]>('/document-type-conversions', {
            include:  'sourceType,targetType',
            per_page: 200,
        }),
        enabled:   !!slug,
        staleTime: 5 * 60_000,
    });

    const bulkSave = useMutation({
        mutationFn: (payload: { create: ConversionRule[]; update: ConversionRule[]; delete: number[] }) =>
            apiPost('/document-type-conversions/bulk-update', payload),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'document-type-conversions'] });
            qc.invalidateQueries({ queryKey: [slug, 'document-type-allowed-targets'] });
        },
    });

    return { rules, isLoading, bulkSave };
}

// ─── Component ────────────────────────────────────────────────────────────────

function ConversionMapTab() {
    const { rules: serverRules, isLoading, bulkSave } = useConversionRules();
    const [localRules, setLocalRules] = useState<ConversionRule[]>([]);
    const [dirty, setDirty] = useState(false);

    // Load types
    const { data: docTypes = [] } = useQuery({
        queryKey: ['document-types'],
        queryFn:  () => apiGet('/document-types', { per_page: 100 }),
    });

    // Sync server → local
    useEffect(() => {
        setLocalRules(serverRules.map(r => ({ ...r, _dirty: false, _deleted: false })));
        setDirty(false);
    }, [serverRules]);

    // Group by source
    const grouped = useMemo(() => {
        const map = new Map<number, { source: DocumentType; rules: ConversionRule[] }>();
        for (const dt of docTypes) {
            map.set(dt.id, { source: dt, rules: [] });
        }
        for (const rule of localRules.filter(r => !r._deleted)) {
            map.get(rule.source_type_id)?.rules.push(rule);
        }
        return [...map.values()];
    }, [docTypes, localRules]);

    const addRule = (sourceId: number, targetId: number) => {
        setLocalRules(prev => [...prev, {
            source_type_id:        sourceId,
            target_type_id:        targetId,
            is_active:             true,
            copy_lines:            true,
            copy_party:            true,
            copy_prices:           true,
            require_full_delivery: false,
            display_order:         0,
            _dirty:                true,
            _deleted:              false,
        }]);
        setDirty(true);
    };

    const updateRule = (idx: number, patch: Partial<ConversionRule>) => {
        setLocalRules(prev => prev.map((r, i) =>
            i === idx ? { ...r, ...patch, _dirty: true } : r
        ));
        setDirty(true);
    };

    const deleteRule = (idx: number) => {
        setLocalRules(prev => prev.map((r, i) =>
            i === idx ? { ...r, _deleted: true, _dirty: true } : r
        ));
        setDirty(true);
    };

    const handleSave = () => {
        const toCreate = localRules.filter(r => !r.id && r._dirty && !r._deleted);
        const toUpdate = localRules.filter(r =>  r.id && r._dirty && !r._deleted);
        const toDelete = localRules.filter(r =>  r.id && r._deleted).map(r => r.id!);
        bulkSave.mutate({ create: toCreate, update: toUpdate, delete: toDelete });
    };

    return (
        <div>
            {/* جدول الخريطة — row = مصدر، cells = أهداف */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'right', padding: '8px 12px' }}>المستند المصدر</th>
                        <th style={{ textAlign: 'right', padding: '8px 12px' }}>يمكن تحويله إلى</th>
                    </tr>
                </thead>
                <tbody>
                    {grouped.map(({ source, rules }) => (
                        <ConversionRow
                            key={source.id}
                            source={source}
                            rules={rules}
                            allTypes={docTypes}
                            onAdd={(targetId) => addRule(source.id, targetId)}
                            onUpdate={(ruleIdx, patch) => {
                                const globalIdx = localRules.findIndex(r =>
                                    r.source_type_id === source.id &&
                                    localRules.indexOf(r) === ruleIdx
                                );
                                updateRule(globalIdx, patch);
                            }}
                            onDelete={(ruleIdx) => {
                                const globalIdx = localRules.findIndex(r =>
                                    r.source_type_id === source.id
                                );
                                deleteRule(globalIdx + ruleIdx);
                            }}
                        />
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            {dirty && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => {
                        setLocalRules(serverRules.map(r => ({ ...r, _dirty: false, _deleted: false })));
                        setDirty(false);
                    }}>
                        إلغاء
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={bulkSave.isPending}
                        style={{ background: 'var(--em)', color: 'white', padding: '8px 20px', borderRadius: 'var(--r2)' }}
                    >
                        {bulkSave.isPending ? 'جاري الحفظ...' : '💾 حفظ التغييرات'}
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── ConversionRow ────────────────────────────────────────────────────────────

function ConversionRow({ source, rules, allTypes, onAdd, onUpdate, onDelete }) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    // أنواع غير مُستخدَمة كأهداف بعد
    const usedTargetIds = new Set(rules.map(r => r.target_type_id));
    const availableTargets = allTypes.filter(dt =>
        dt.id !== source.id && !usedTargetIds.has(dt.id)
    );

    return (
        <tr style={{ borderBottom: '1px solid var(--b1)' }}>
            {/* المصدر */}
            <td style={{ padding: '10px 12px', fontWeight: 700, width: 200 }}>
                <span style={{
                    padding: '3px 8px', borderRadius: 'var(--r1)',
                    background: 'var(--bg3)', fontSize: 12, marginLeft: 6,
                    fontFamily: 'monospace',
                }}>
                    {source.code}
                </span>
                {source.name}
            </td>

            {/* الأهداف */}
            <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {rules.map((rule, idx) => {
                        const target = allTypes.find(dt => dt.id === rule.target_type_id);
                        const isExpanded = expandedIdx === idx;
                        return (
                            <div key={idx} style={{ position: 'relative' }}>
                                {/* Badge الهدف */}
                                <button
                                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                    style={{
                                        padding: '4px 10px', borderRadius: 'var(--r1)',
                                        border: '1px solid var(--em)',
                                        background: rule.is_active ? 'var(--emb)' : 'var(--bg3)',
                                        color: rule.is_active ? 'var(--em)' : 'var(--t4)',
                                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                        display: 'flex', alignItems: 'center', gap: 4,
                                    }}
                                >
                                    <span style={{ fontFamily: 'monospace' }}>{target?.code}</span>
                                    <i className="ti ti-chevron-down" style={{ fontSize: 10 }} />
                                </button>

                                {/* Mini panel الخيارات */}
                                {isExpanded && (
                                    <div style={{
                                        position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                                        zIndex: 100, background: 'var(--bg2)',
                                        border: '1px solid var(--b2)', borderRadius: 'var(--r2)',
                                        padding: 12, minWidth: 240,
                                        boxShadow: '0 4px 16px rgba(0,0,0,.2)',
                                    }}>
                                        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>
                                            {source.code} → {target?.code}
                                        </div>

                                        {[
                                            { key: 'is_active',             label: 'مُفعَّل' },
                                            { key: 'copy_lines',            label: 'نسخ الأسطر' },
                                            { key: 'copy_party',            label: 'نسخ المتعامل' },
                                            { key: 'copy_prices',           label: 'نسخ الأسعار' },
                                            { key: 'require_full_delivery', label: 'يتطلب تسليم كامل' },
                                        ].map(({ key, label }) => (
                                            <label key={key} style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                marginBottom: 6, fontSize: 12, cursor: 'pointer',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!(rule as any)[key]}
                                                    onChange={(e) => onUpdate(idx, { [key]: e.target.checked })}
                                                />
                                                {label}
                                            </label>
                                        ))}

                                        <div style={{
                                            display: 'flex', gap: 6, marginTop: 10,
                                            justifyContent: 'space-between',
                                        }}>
                                            <button
                                                onClick={() => { onDelete(idx); setExpandedIdx(null); }}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 'var(--r1)',
                                                    border: '1px solid var(--red)',
                                                    background: 'var(--redb)', color: 'var(--red)',
                                                    fontSize: 12, cursor: 'pointer',
                                                }}
                                            >
                                                🗑 حذف
                                            </button>
                                            <button
                                                onClick={() => setExpandedIdx(null)}
                                                style={{
                                                    padding: '4px 10px', borderRadius: 'var(--r1)',
                                                    border: '1px solid var(--b2)',
                                                    background: 'var(--bg1)', fontSize: 12, cursor: 'pointer',
                                                }}
                                            >
                                                إغلاق
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* زر إضافة هدف جديد */}
                    {availableTargets.length > 0 && (
                        <div style={{ position: 'relative' }}>
                            <AddTargetDropdown
                                availableTargets={availableTargets}
                                onSelect={(targetId) => onAdd(targetId)}
                            />
                        </div>
                    )}

                    {rules.length === 0 && (
                        <span style={{ fontSize: 12, color: 'var(--t4)' }}>لا تحويلات — نقطة نهاية</span>
                    )}
                </div>
            </td>
        </tr>
    );
}
```

---

## ══ تعديل ConvertDocumentModal ════════════════════════════════════════════

```typescript
// بدل:
const allowedCodes = CONVERSION_MAP[sourceCode] ?? [];
const allowedTypes = docTypes.filter(dt => allowedCodes.includes(dt.code));

// استخدم:
const { data: allowedTargets = [], isLoading: isLoadingTargets } = useQuery({
    queryKey: [slug, 'document-type-allowed-targets', documentTypeId],
    queryFn:  () => apiGet(`/document-types/${documentTypeId}/allowed-targets`),
    enabled:  !!slug && !!documentTypeId && isOpen,
    staleTime: 5 * 60_000,
});

// Fallback للـ CONVERSION_MAP إذا فشل API
const effectiveTargets = allowedTargets.length > 0
    ? allowedTargets
    : (CONVERSION_MAP[sourceCode] ?? [])
        .map(code => docTypes.find(dt => dt.code === code))
        .filter(Boolean);
```

---

## ══ ترتيب التنفيذ ══════════════════════════════════════════════════════════

```
المرحلة 1 — الباكاند (3-4 ساعات):
  1. Migration: create_document_type_conversions_table
  2. Model: DocumentTypeConversion
  3. Seeder: DocumentTypeConversionSeeder (نفس CONVERSION_MAP)
  4. Route: GET /document-types/{id}/allowed-targets
  5. Route: apiResource /document-type-conversions
  6. Controller: allowedTargets() + bulkUpdate()
  7. تعديل DocumentConversionService::validateConversion()

المرحلة 2 — الفرونتند (4-5 ساعات):
  1. تعديل ConvertDocumentModal → يقرأ من API مع Fallback
  2. إضافة ConversionMapTab في DocumentTypesPage
  3. Hook: useConversionRules()
  4. Component: ConversionRow + AddTargetDropdown

المرحلة 3 — التنظيف (1 ساعة):
  1. إبقاء CONVERSION_MAP كـ CONVERSION_MAP_FALLBACK
  2. إضافة flag بيئة للتبديل بين الوضعين
  3. اختبار كل مسارات التحويل

الوقت الإجمالي: ~8-9 ساعات
```

---

## ══ ملاحظات مهمة ══════════════════════════════════════════════════════════

### 1. الباكاند يتحقق من صحة التحويل — هذا جيد
`DocumentConversionService` يجب أن يتحقق من الجدول أيضاً
وليس فقط الفرونتند — Security by Defense in Depth.

### 2. Cache بـ 5 دقائق
التحويلات لا تتغير كثيراً → staleTime 5 دقائق كافٍ.
عند حفظ التغييرات: `invalidateQueries` فوراً.

### 3. الـ CONVERSION_MAP في document.types.ts
**لا تحذفه الآن.** أبقه كـ fallback حتى تستقر الميزة
ثم أزله في الإصدار التالي.

### 4. Audit trail
كل تغيير في الجدول يجب أن يُسجَّل في جدول الـ audits
(HasAuditable trait موجود بالفعل في مشروعك).


