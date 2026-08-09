@php
    $formattedAmount = number_format((float) $amount, 2, ',', ' ');
    $sandboxLabel = $sandbox ? 'تجريبي (sandbox)' : 'فعلي (live)';
@endphp
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>الدفع الإلكتروني — {{ $company->name ?? 'الدفع' }}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: "Tajawal", "Segoe UI", Tahoma, sans-serif;
            background: linear-gradient(160deg, #f0f7f4 0%, #e3efe9 100%);
            min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px;
        }
        .card {
            width: 100%; max-width: 420px; background: #fff; border-radius: 18px;
            box-shadow: 0 12px 40px rgba(10, 138, 92, 0.16); overflow: hidden;
        }
        .head {
            background: linear-gradient(135deg, #0a8a5c 0%, #077a50 100%);
            color: #fff; padding: 22px 24px; text-align: center;
        }
        .head .brand { font-size: 20px; font-weight: 800; letter-spacing: .3px; }
        .head .sub { font-size: 12.5px; opacity: .9; margin-top: 4px; }
        .body { padding: 24px; }
        .row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px dashed #e2ece7; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .row .k { color: #5b6b66; }
        .row .v { font-weight: 700; color: #1c2b26; }
        .amount { text-align: center; padding: 10px 0 14px; }
        .amount .lbl { font-size: 13px; color: #5b6b66; }
        .amount .val { font-size: 30px; font-weight: 900; color: #0a8a5c; margin-top: 4px; }
        .badge {
            display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700;
        }
        .badge.sandbox { background: #fff4d6; color: #a06a00; border: 1px solid #f0d48a; }
        .actions { display: flex; flex-direction: column; gap: 10px; padding: 0 24px 24px; }
        button {
            border: none; border-radius: 12px; padding: 13px; font-size: 15px; font-weight: 800;
            cursor: pointer; font-family: inherit; transition: transform .06s ease, filter .15s ease;
        }
        button:active { transform: scale(.98); }
        .btn-confirm { background: linear-gradient(135deg, #0a8a5c 0%, #077a50 100%); color: #fff; }
        .btn-confirm:hover { filter: brightness(1.05); }
        .btn-cancel { background: #f4f6f5; color: #42544d; border: 1px solid #dde7e2; }
        .btn-cancel:hover { background: #eef2f0; }
        .foot { text-align: center; padding: 0 24px 20px; font-size: 11.5px; color: #8a9a94; }
        .error-banner {
            margin: 0 24px 18px; background: #fdecec; color: #a42828; border: 1px solid #f4c2c2;
            border-radius: 10px; padding: 10px 14px; font-size: 13px; font-weight: 700; text-align: center;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="head">
            <div class="brand">{{ $company->name ?? 'الدفع الإلكتروني' }}</div>
            <div class="sub">تأكيد طلب {{ $order->reference }}</div>
        </div>
        <div class="body">
            <div class="amount">
                <div class="lbl">المبلغ المطلوب</div>
                <div class="val">{{ $formattedAmount }} <span style="font-size:14px;font-weight:700">دج</span></div>
            </div>
            <div class="row"><span class="k">المستفيد</span><span class="v">{{ $customer }}</span></div>
            <div class="row"><span class="k">رقم الطلب</span><span class="v" dir="ltr">{{ $order->reference }}</span></div>
            <div class="row"><span class="k">بوابة الدفع</span><span class="v">{{ strtoupper($provider) }} <span class="badge sandbox">{{ $sandboxLabel }}</span></span></div>
            <div class="row"><span class="k">العملة</span><span class="v">DZD — دينار جزائري</span></div>
        </div>

        <div class="actions">
            <form method="POST" action="{{ $confirm_url }}">
                @csrf
                <button type="submit" class="btn-confirm" style="width:100%">تأكيد الدفع</button>
            </form>
            <form method="POST" action="{{ $cancel_url }}">
                @csrf
                <button type="submit" class="btn-cancel" style="width:100%">إلغاء والعودة</button>
            </form>
        </div>

        <div class="foot">
            بوابة تجريبية لأغراض الاختبار — لا تُخصم أي مبالغ فعلية.
        </div>
    </div>
</body>
</html>
