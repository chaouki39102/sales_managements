<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="utf-8">
    <title>{{ $document->document_number }}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'dejavu sans', sans-serif;
            font-size: 11px;
            color: #1a1a1a;
            line-height: 1.55;
            margin: 0;
        }
        table { border-collapse: collapse; width: 100%; }
        .mono { font-family: 'DejaVu Sans Mono', monospace; }
        .doc-header { width: 100%; margin-bottom: 10px; }
        .doc-header td { vertical-align: top; padding: 0; }
        .co-name {
            font-size: 19px;
            font-weight: 700;
            color: #0a6b48;
            margin: 0 0 2px 0;
        }
        .co-sub { font-size: 11px; margin: 0 0 6px 0; }
        .co-line { font-size: 10px; margin: 1px 0; }
        .doc-title {
            font-size: 20px;
            font-weight: 700;
            color: #0a6b48;
            text-align: center;
            margin: 0 0 4px 0;
        }
        .doc-num {
            font-size: 15px;
            font-weight: 700;
            text-align: center;
            direction: ltr;
            unicode-bidi: embed;
            margin: 0 0 8px 0;
        }
        .doc-date-row { font-size: 10px; text-align: left; direction: rtl; }
        .doc-date-row div { margin: 1px 0; }
        .meta-box {
            border: 1px solid #d0d0d0;
            border-radius: 6px;
            padding: 8px 10px;
            vertical-align: top;
        }
        .meta-box h4 {
            margin: 0 0 6px 0;
            font-size: 11px;
            font-weight: 700;
            color: #0a6b48;
            border-bottom: 1px solid #e2e2e2;
            padding-bottom: 4px;
        }
        .meta-box .row { display: flex; margin: 2px 0; font-size: 10px; }
        .meta-box .row .k { min-width: 74px; font-weight: 600; color: #555; }
        .items-wrap { margin-top: 10px; }
        #items { width: 100%; }
        #items th {
            background: #0a6b48;
            color: #fff;
            font-size: 9.5px;
            padding: 5px 4px;
            text-align: center;
            font-weight: 700;
        }
        #items td {
            border-bottom: 1px solid #e6e6e6;
            padding: 5px 4px;
            vertical-align: top;
            font-size: 9.5px;
        }
        #items .cm { text-align: center; }
        #items .nm { text-align: right; }
        #items .num {
            direction: ltr;
            unicode-bidi: embed;
            text-align: right;
            white-space: nowrap;
        }
        .line-notes { font-size: 8.5px; color: #666; margin-top: 2px; }
        .totals-box { width: 46%; margin-top: 12px; }
        .totals-box table { width: 100%; }
        .totals-box td { padding: 3px 6px; font-size: 10px; }
        .totals-box td.v {
            direction: ltr;
            unicode-bidi: embed;
            text-align: left;
            white-space: nowrap;
        }
        .totals-box tr.gr td { background: #f4f9f6; font-weight: 700; color: #0a6b48; }
        .totals-box tr.gr td.v { font-size: 12px; }
        .pay-box { margin-top: 14px; width: 90%; }
        .pay-box h4 {
            margin: 0 0 4px 0;
            font-size: 11px;
            font-weight: 700;
            color: #0a6b48;
        }
        #payments th {
            background: #f0f0f0;
            font-size: 9px;
            padding: 4px;
            text-align: center;
        }
        #payments td {
            border-bottom: 1px solid #eee;
            padding: 4px;
            font-size: 9px;
            text-align: center;
        }
        #payments .num {
            direction: ltr;
            unicode-bidi: embed;
        }
        .legal {
            margin-top: 18px;
            font-size: 8.5px;
            color: #666;
            white-space: pre-line;
        }
        .footer {
            margin-top: 14px;
            font-size: 8.5px;
            color: #999;
            text-align: center;
        }
        .footer .sig { margin-top: 8px; font-size: 10px; color: #555; }
    </style>
</head>
<body>

@php
    $fmt = static fn ($v) => number_format((float) $v, 2, ',', ' ');
    $co = $company;
    $p  = $document->party;
    $dt = $document->documentType;
@endphp

<table class="doc-header">
    <tr>
        <td style="width:58%">
            <p class="co-name">{{ $co?->name ?: '' }}</p>
            @if($co?->commercial_name && $co->name !== $co->commercial_name)
                <p class="co-sub">{{ $co->commercial_name }}</p>
            @endif
            @if($co?->activity)
                <p class="co-line">{{ $co->activity }}</p>
            @endif
            @if($co?->address)
                <p class="co-line">{{ $co->address }}</p>
            @endif
            @if($co?->phone)
                <p class="co-line">{{ $co->phone }}</p>
            @endif
            @if($co?->mobile)
                <p class="co-line">{{ $co->mobile }}</p>
            @endif
            @if($co?->email)
                <p class="co-line">{{ $co->email }}</p>
            @endif
            @php $coMeta = array_filter([
                $co?->nif ? 'NIF: ' . $co->nif : null,
                $co?->rc  ? 'RC: ' . $co->rc  : null,
                $co?->nis ? 'NIS: ' . $co->nis : null,
                $co?->ai  ? 'AI: ' . $co->ai  : null,
            ]); @endphp
            @if(count($coMeta))
                <p class="co-line">{{ implode(' | ', $coMeta) }}</p>
            @endif
        </td>
        <td style="width:42%">
            <p class="doc-title">{{ $dt?->name ?: 'مستند' }}</p>
            <p class="doc-num">{{ $document->document_number }}</p>
            <div class="doc-date-row">
                @if($document->reference)
                    <div>المرجع: <span class="mono" style="unicode-bidi:embed;direction:ltr">{{ $document->reference }}</span></div>
                @endif
                <div>تاريخ المستند: {{ $document->document_date }}</div>
                @if($document->due_date)
                    <div>تاريخ الاستحقاق: {{ $document->due_date }}</div>
                @endif
                @if($document->issued_at)
                    <div>تاريخ الإصدار: {{ $document->issued_at }}</div>
                @endif
            </div>
        </td>
    </tr>
</table>

<table style="width:100%; border-spacing:6px 0; margin: -6px -6px 0 -6px;">
    <tr>
        <td style="width:50%; padding:0">
            <div class="meta-box">
                <h4>معلومات المستند</h4>
                @if($document->warehouse)
                    <div class="row"><span class="k">المستودع:</span><span>{{ $document->warehouse->name }}</span></div>
                @endif
                @if($document->currency)
                    <div class="row"><span class="k">العملة:</span><span>{{ $document->currency->name }}</span></div>
                @endif
                @if($document->documentStatus)
                    <div class="row"><span class="k">الحالة:</span><span>{{ $document->documentStatus->name }}</span></div>
                @endif
                @if($document->user)
                    <div class="row"><span class="k">أنشأ بواسطة:</span><span>{{ $document->user->name }}</span></div>
                @endif
            </div>
        </td>
        <td style="width:50%; padding:0">
            <div class="meta-box">
                <h4>معلومات الزبون / المورد</h4>
                @if($p)
                    <div class="row"><span class="k">الاسم:</span><span style="font-weight:700">{{ $p->name }}</span></div>
                    @if($p->commercial_name && $p->commercial_name !== $p->name)
                        <div class="row"><span class="k">الاسم التجاري:</span><span>{{ $p->commercial_name }}</span></div>
                    @endif
                    @php $pMeta = array_filter([
                        $p->nif ? 'NIF: ' . $p->nif : null,
                        $p->rc  ? 'RC: ' . $p->rc  : null,
                        $p->nis ? 'NIS: ' . $p->nis : null,
                        $p->ai  ? 'AI: ' . $p->ai  : null,
                    ]); @endphp
                    @if(count($pMeta))
                        <div class="row"><span class="k">المعرّفات:</span><span>{{ implode(' | ', $pMeta) }}</span></div>
                    @endif
                    @if($p->address)
                        <div class="row"><span class="k">العنوان:</span><span>{{ $p->address }}</span></div>
                    @endif
                    @if($p->phone || $p->mobile)
                        <div class="row"><span class="k">الهاتف:</span><span>{{ $p->phone ?: $p->mobile }}</span></div>
                    @endif
                    @if($p->email)
                        <div class="row"><span class="k">البريد:</span><span>{{ $p->email }}</span></div>
                    @endif
                @else
                    <div class="row"><span>—</span></div>
                @endif
            </div>
        </td>
    </tr>
</table>

<div class="items-wrap">
    <table id="items">
        <thead>
            <tr>
                <th style="width:4%">#</th>
                <th style="width:34%">البيان</th>
                <th style="width:9%">المرجع</th>
                <th style="width:8%">الكمية</th>
                <th style="width:7%">الوحدة</th>
                <th style="width:12%">سعر الوحدة</th>
                <th style="width:7%">الخصم</th>
                <th style="width:6%">TVA</th>
                <th style="width:12%">الإجمالي HT</th>
                <th style="width:12%">الإجمالي TTC</th>
            </tr>
        </thead>
        <tbody>
            @foreach($document->lines as $i => $line)
                <tr>
                    <td class="cm">{{ $i + 1 }}</td>
                    <td class="nm">
                        {{ $line->description ?: $line->product?->name ?: '' }}
                        @if($line->product && $line->product->name && $line->description)
                            <div style="font-size:8.5px;color:#666">{{ $line->product->name }}</div>
                        @endif
                        @if($line->notes)
                            <div class="line-notes">{{ $line->notes }}</div>
                        @endif
                    </td>
                    <td class="cm">{{ $line->product?->ref ?: '' }}</td>
                    <td class="cm">{{ $line->quantity }}</td>
                    <td class="cm">
                        {{ $line->product?->unit?->abbreviation ?: ($line->product?->unit?->name ?: '') }}
                        @if(((float)$line->packaging_units_snapshot) > 1 && $line->product?->unit?->abbreviation !== 'ق' && $line->product?->unit?->name !== 'ق')
                            <div style="font-size:8px;color:#666">×{{ $line->packaging_units_snapshot }}</div>
                        @endif
                    </td>
                    <td class="num">{{ $fmt($line->unit_price_ht) }}</td>
                    <td class="cm">{{ (float)$line->discount_percentage > 0 ? $line->discount_percentage . '%' : '—' }}</td>
                    <td class="cm">{{ (float)$line->tva_rate > 0 ? $line->tva_rate . '%' : '—' }}</td>
                    <td class="num">{{ $fmt($line->total_ht) }}</td>
                    <td class="num">{{ $fmt($line->total_ttc) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</div>

<table width="100%" style="margin-top:12px;">
    <tr>
        <td style="width:54%">
            @if($document->notes)
                <div class="meta-box" style="padding:6px 10px">
                    <h4>ملاحظات</h4>
                    <div style="font-size:9.5px;white-space:pre-line">{{ $document->notes }}</div>
                </div>
            @endif
        </td>
        <td style="width:46%">
            <div class="totals-box" style="width:100%">
                <table>
                    <tr>
                        <td>الإجمالي قبل الخصم</td>
                        <td class="v">{{ $fmt($document->total_ht + $document->total_discount) }}</td>
                    </tr>
                    <tr>
                        <td>الإجمالي HT</td>
                        <td class="v">{{ $fmt($document->total_ht) }}</td>
                    </tr>
                    @if((float)$document->total_discount > 0)
                        <tr>
                            <td>الخصم</td>
                            <td class="v">- {{ $fmt($document->total_discount) }}</td>
                        </tr>
                    @endif
                    <tr>
                        <td>TVA</td>
                        <td class="v">{{ $fmt($document->total_tva) }}</td>
                    </tr>
                    @if((float)$document->total_stamp > 0)
                        <tr>
                            <td>الطابع الجبائي</td>
                            <td class="v">{{ $fmt($document->total_stamp) }}</td>
                        </tr>
                    @endif
                    @if($document->total_ttc !== $document->net_to_pay)
                        <tr>
                            <td>المجموع TTC</td>
                            <td class="v">{{ $fmt($document->total_ttc) }}</td>
                        </tr>
                    @endif
                    <tr class="gr">
                        <td>المبلغ الصافي</td>
                        <td class="v">{{ $fmt($document->net_to_pay) }} دج</td>
                    </tr>
                    @if((float)$document->paid_amount > 0)
                        <tr>
                            <td>المدفوع</td>
                            <td class="v">{{ $fmt($document->paid_amount) }} دج</td>
                        </tr>
                    @endif
                    @if((float)$document->remaining_amount > 0)
                        <tr>
                            <td>المتبقي</td>
                            <td class="v">{{ $fmt($document->remaining_amount) }} دج</td>
                        </tr>
                    @endif
                </table>
            </div>
        </td>
    </tr>
</table>

@if($document->payments->count() > 0)
    <div class="pay-box">
        <h4>المدفوعات</h4>
        <table id="payments">
            <thead>
                <tr>
                    <th style="width:30%">طريقة الدفع</th>
                    <th style="width:20%">التاريخ</th>
                    <th style="width:30%">المرجع</th>
                    <th style="width:20%">المبلغ</th>
                </tr>
            </thead>
            <tbody>
                @foreach($document->payments as $pay)
                    <tr>
                        <td>{{ $pay->paymentMode?->name ?: $pay->payment_mode_id }}</td>
                        <td>{{ optional($pay->payment_date)->format('Y-m-d') ?: ($pay->paid_at ?: '') }}</td>
                        <td>{{ $pay->reference ?: '' }}</td>
                        <td class="num">{{ $fmt(($pay->pivot->amount_applied ?? 0)) }} دج</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
@endif

@if(!empty($document->legal_mentions) && is_array($document->legal_mentions) && count($document->legal_mentions) > 0)
    <div class="legal">{{ implode("\n", array_filter(array_map('strval', $document->legal_mentions))) }}</div>
@endif

<div class="footer">
    <div>هذا المستند صادر إلكترونياً عن نظام «سبيل» — {{ $co?->name ?: '' }}</div>
    <div class="sig">
        <span style="float:left; padding-left:160px;">التوقيع والختم</span>
        <span style="float:right; padding-right:160px;">الإمضاء</span>
    </div>
</div>

</body>
</html>