

# =========================================
# 🎨 STYLES
# =========================================

## FILE: resources/css/app.css
```
@import 'tailwindcss';

/* ═══════════════ TOKENS ═══════════════ */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
:root{
  --bg0:#eef2f7;--bg1:#f5f7fa;--bg2:#ffffff;--bg3:#f0f4f9;--bg4:#e8edf5;--bg5:#dde3ed;
  --b1:rgba(0,0,0,0.05);--b2:rgba(0,0,0,0.09);--b3:rgba(0,0,0,0.14);--b4:rgba(0,0,0,0.20);
  --t1:#0f172a;--t2:#334155;--t3:#64748b;--t4:#94a3b8;
  --em:#0a9268;--em2:#07785a;--em3:#05d69e;
  --emb:rgba(10,146,104,.09);--embo:rgba(10,146,104,.22);
  --emglow:0 4px 18px rgba(10,146,104,.28);
  --gold:#b45309;--goldb:rgba(180,83,9,.08);--goldbo:rgba(180,83,9,.22);
  --red:#dc2626;--redb:rgba(220,38,38,.08);--redbo:rgba(220,38,38,.22);
  --blue:#1d4ed8;--blueb:rgba(29,78,216,.08);--bluebo:rgba(29,78,216,.22);
  --purple:#6d28d9;--purb:rgba(109,40,217,.08);
  --orange:#c2410c;--orb:rgba(194,65,12,.08);--orbo:rgba(194,65,12,.22);
  --teal:#0e7490;--tealb:rgba(14,116,144,.08);
  --r1:6px;--r2:10px;--r3:14px;--r4:20px;
  --sb:256px;--tb:60px;--mb:64px;
  --shadow:0 1px 4px rgba(0,0,0,0.07),0 0 0 1px rgba(0,0,0,0.06);
  --shadow2:0 4px 20px rgba(0,0,0,0.10);
}
body.dark{
  --bg0:#060a0e;--bg1:#0d1117;--bg2:#131920;--bg3:#181f28;--bg4:#1e2733;--bg5:#242e3c;
  --b1:rgba(255,255,255,0.04);--b2:rgba(255,255,255,0.07);--b3:rgba(255,255,255,0.12);--b4:rgba(255,255,255,0.18);
  --t1:#f0f6fc;--t2:#adbac7;--t3:#768390;--t4:#545d68;
  --em:#1a8c6e;--em2:#21b58a;--em3:#2dcc9e;
  --emb:rgba(26,140,110,.12);--embo:rgba(26,140,110,.30);
  --gold:#d9a93c;--goldb:rgba(217,169,60,.11);--goldbo:rgba(217,169,60,.30);
  --red:#e05555;--redb:rgba(224,85,85,.11);--redbo:rgba(224,85,85,.30);
  --blue:#4d94ff;--blueb:rgba(77,148,255,.11);--bluebo:rgba(77,148,255,.30);
  --purple:#a67ef5;--purb:rgba(166,126,245,.11);
  --orange:#e0843a;--orb:rgba(224,132,58,.11);--orbo:rgba(224,132,58,.30);
  --teal:#2ab8c8;--tealb:rgba(42,184,200,.11);
  --shadow:0 2px 8px rgba(0,0,0,0.35);
  --shadow2:0 8px 32px rgba(0,0,0,0.45);
}

/* ═══════════════ SCROLLBAR ═══════════════ */
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:var(--b3);border-radius:4px;}

/* ═══════════════ SIDEBAR ═══════════════ */
#sidebar{
  position:fixed;right:0;top:0;bottom:0;width:var(--sb);
  background:var(--bg2);border-left:1px solid var(--b2);
  display:flex;flex-direction:column;z-index:200;overflow-y:auto;
  box-shadow:var(--shadow2);
}
.sb-logo{
  padding:16px 14px 12px;border-bottom:1px solid var(--b2);
  display:flex;align-items:center;gap:10px;flex-shrink:0;
}
.sb-mark{
  width:38px;height:38px;border-radius:10px;
  background:linear-gradient(140deg,var(--em2),var(--em3));
  display:flex;align-items:center;justify-content:center;
  font-size:18px;font-weight:900;color:#fff;flex-shrink:0;
  box-shadow:var(--emglow);
}
.sb-name{font-size:14px;font-weight:800;color:var(--t1);line-height:1.2;}
.sb-sub{font-size:10.5px;color:var(--t4);}
.sb-co{
  margin:8px 10px;padding:9px 11px;
  background:var(--emb);border:1px solid var(--embo);
  border-radius:var(--r2);font-size:11px;
}
.sb-co-name{font-weight:800;color:var(--em);font-size:12px;}
.sb-co-info{color:var(--t4);margin-top:2px;}
.sb-sec{padding:8px 0 2px;}
.sb-lbl{
  font-size:9.5px;font-weight:800;color:var(--t4);
  letter-spacing:1.2px;padding:0 14px 5px;text-transform:uppercase;
}
/* color labels per section */
.sb-sec:nth-child(3) .sb-lbl{color:var(--em);}
.sb-sec:nth-child(4) .sb-lbl{color:var(--blue);}
.sb-sec:nth-child(5) .sb-lbl{color:var(--purple);}
.sb-sec:nth-child(6) .sb-lbl{color:var(--gold);}
.sb-sec:nth-child(7) .sb-lbl{color:var(--red);}
.sb-sec:nth-child(8) .sb-lbl{color:var(--teal);}
.sbi{
  display:flex;align-items:center;gap:9px;padding:8px 14px;
  cursor:pointer;border-right:2px solid transparent;
  color:var(--t3);font-size:13px;font-weight:500;
  transition:all .16s;user-select:none;
}
.sbi:hover{background:var(--bg3);color:var(--t2);}
.sbi.on{background:var(--emb);color:var(--em);border-right-color:var(--em);font-weight:700;}
.sbi-ic{font-size:15px;flex-shrink:0;width:18px;text-align:center;}
.sbi-badge{
  margin-right:auto;font-size:9.5px;font-weight:800;
  padding:1px 7px;border-radius:20px;background:var(--red);color:#fff;
}
.sbi-badge.w{background:var(--gold);}
.sbi-badge.ic-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;}
.sbi-badge.ic-badge svg{width:10px;height:10px;stroke:white;stroke-width:2.5;}
.sb-foot{margin-top:auto;border-top:1px solid var(--b2);padding:10px;flex-shrink:0;}
.sb-user{
  display:flex;align-items:center;gap:9px;padding:9px 10px;
  border-radius:var(--r2);background:var(--bg3);border:1px solid var(--b2);cursor:pointer;
}
.sb-user:hover{background:var(--bg4);}
.sb-av{
  width:32px;height:32px;border-radius:50%;
  background:linear-gradient(135deg,var(--em),var(--gold));
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;color:#fff;flex-shrink:0;
}
.sb-uname{font-size:12.5px;font-weight:700;color:var(--t1);}
.sb-urole{font-size:10.5px;color:var(--t4);}
.sb-dot{width:7px;height:7px;border-radius:50%;background:#10b981;flex-shrink:0;margin-right:auto;}

/* ═══════════════ MAIN ═══════════════ */
#main{margin-right:var(--sb);min-height:100vh;display:flex;flex-direction:column;}

/* ═══════════════ TOPBAR ═══════════════ */
#topbar{
  position:sticky;top:0;z-index:100;height:var(--tb);
  background:rgba(255,255,255,.90);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--b2);padding:0 20px;
  display:flex;align-items:center;gap:12px;
  box-shadow:0 1px 6px rgba(0,0,0,.06);
}
body.dark #topbar{background:rgba(13,17,23,.90);}
.tb-info{flex:1;min-width:0;}
.tb-title{font-size:15px;font-weight:800;color:var(--t1);}
.tb-path{font-size:11px;color:var(--t4);}
.tb-actions{display:flex;align-items:center;gap:8px;}
.srch{
  display:flex;align-items:center;gap:7px;
  background:var(--bg3);border:1px solid var(--b2);
  border-radius:var(--r2);padding:7px 12px;transition:.15s;
}
.srch:focus-within{border-color:var(--em);background:var(--bg2);}
.srch input{background:transparent;border:none;outline:none;color:var(--t1);font-size:12.5px;width:200px;font-family:'Tajawal',sans-serif;}
.srch input::placeholder{color:var(--t4);}
.srch-ic{color:var(--t4);font-size:13px;}
.ib{
  width:34px;height:34px;border-radius:var(--r2);
  background:var(--bg3);border:1px solid var(--b2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:15px;color:var(--t3);position:relative;
  transition:.15s;flex-shrink:0;
}
.ib:hover{background:var(--bg4);color:var(--t1);}
.ib-n{
  position:absolute;top:-4px;right:-4px;width:15px;height:15px;
  border-radius:50%;background:var(--red);color:#fff;font-size:8.5px;
  font-weight:800;display:flex;align-items:center;justify-content:center;
  border:2px solid var(--bg2);
}
.tb-btn{
  display:inline-flex;align-items:center;gap:6px;padding:7px 14px;
  border-radius:var(--r2);border:1px solid var(--b3);
  background:var(--bg3);color:var(--t2);
  font-size:12.5px;font-weight:700;cursor:pointer;
  font-family:'Tajawal',sans-serif;transition:.15s;white-space:nowrap;
}
.tb-btn:hover{background:var(--bg4);color:var(--t1);}
.tb-btn.p{background:var(--em);border-color:var(--em);color:#fff;box-shadow:var(--emglow);}
.tb-btn.p:hover{background:var(--em2);}

/* ═══════════════ PAGES ═══════════════ */
.page{display:none;}
.page.on{display:block;animation:pgIn .2s ease;}
@keyframes pgIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}

/* ═══════════════ CARD ═══════════════ */
.card{
  background:var(--bg2);border:1px solid var(--b2);
  border-radius:var(--r3);padding:18px;
  box-shadow:var(--shadow);
}
.card-hd{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--b1);
}
.card-title{font-size:14px;font-weight:800;color:var(--t1);display:flex;align-items:center;gap:7px;}
.card-sub{font-size:11.5px;color:var(--t4);}

/* ═══════════════ KPI ═══════════════ */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:18px;}
.kpi{
  background:var(--bg2);border:1px solid var(--b2);border-radius:var(--r3);
  padding:16px;position:relative;overflow:hidden;cursor:default;
  transition:transform .18s,box-shadow .18s;box-shadow:var(--shadow);
}
.kpi:hover{transform:translateY(-2px);box-shadow:var(--shadow2);}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
.kpi.ke::before{background:linear-gradient(90deg,var(--em),var(--em3));}
.kpi.kg::before{background:linear-gradient(90deg,var(--gold),#fbbf24);}
.kpi.kr::before{background:linear-gradient(90deg,var(--red),#f87171);}
.kpi.kb::before{background:linear-gradient(90deg,var(--blue),#60a5fa);}
.kpi.kp::before{background:linear-gradient(90deg,var(--purple),#a78bfa);}
.kpi.kt::before{background:linear-gradient(90deg,var(--teal),#67e8f9);}
body:not(.dark) .kpi.ke{background:linear-gradient(150deg,#fff,#f0fdf8);}
body:not(.dark) .kpi.kg{background:linear-gradient(150deg,#fff,#fffbeb);}
body:not(.dark) .kpi.kr{background:linear-gradient(150deg,#fff,#fef2f2);}
body:not(.dark) .kpi.kb{background:linear-gradient(150deg,#fff,#eff6ff);}
body:not(.dark) .kpi.kp{background:linear-gradient(150deg,#fff,#f5f3ff);}
body:not(.dark) .kpi.kt{background:linear-gradient(150deg,#fff,#ecfeff);}
.kpi-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
.kpi-ic{
  width:34px;height:34px;border-radius:9px;
  display:flex;align-items:center;justify-content:center;font-size:15px;
}
.ke .kpi-ic{background:var(--emb);color:var(--em);}
.kg .kpi-ic{background:var(--goldb);color:var(--gold);}
.kr .kpi-ic{background:var(--redb);color:var(--red);}
.kb .kpi-ic{background:var(--blueb);color:var(--blue);}
.kp .kpi-ic{background:var(--purb);color:var(--purple);}
.kt .kpi-ic{background:var(--tealb);color:var(--teal);}
.kpi-trend{font-size:11px;font-weight:700;padding:3px 8px;border-radius:20px;}
.up{background:rgba(16,185,129,.12);color:#059669;}
.dn{background:rgba(220,38,38,.10);color:var(--red);}
.neu{background:var(--bg4);color:var(--t4);}
.kpi-lbl{font-size:11.5px;color:var(--t3);margin-bottom:5px;}
.kpi-val{font-size:22px;font-weight:900;color:var(--t1);letter-spacing:-.5px;line-height:1;}
.kpi-val .u{font-size:12px;font-weight:500;color:var(--t4);margin-right:2px;}
.kpi-sub{font-size:11px;color:var(--t4);margin-top:6px;}

/* ═══════════════ GRIDS ═══════════════ */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g65{display:grid;grid-template-columns:1.8fr 1fr;gap:16px;}
.g35{display:grid;grid-template-columns:1fr 1.8fr;gap:16px;}

/* ═══════════════ TABLE ═══════════════ */
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;}
table{width:100%;border-collapse:collapse;}
thead th{
  padding:9px 12px;text-align:right;
  font-size:11px;font-weight:800;color:var(--t4);
  letter-spacing:.6px;text-transform:uppercase;
  background:var(--bg3);border-bottom:1px solid var(--b2);white-space:nowrap;
}
thead th:first-child{border-radius:0 var(--r2) 0 0;}
thead th:last-child{border-radius:var(--r2) 0 0 0;}
tbody tr{border-bottom:1px solid var(--b1);transition:background .12s;cursor:pointer;}
tbody tr:hover{background:var(--bg3);}
tbody tr:last-child{border-bottom:none;}
td{padding:11px 12px;font-size:13px;color:var(--t2);vertical-align:middle;}
td.s{color:var(--t1);font-weight:700;}
td.m{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--t4);}
td.e{color:var(--em);font-weight:700;}
td.r{color:var(--red);font-weight:600;}
td.g{color:var(--gold);font-weight:600;}

/* ═══════════════ BADGES ═══════════════ */
.bx{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:20px;
  font-size:11px;font-weight:700;border:1px solid transparent;white-space:nowrap;
}
.bx::before{content:'';width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.8;flex-shrink:0;}
body:not(.dark) .be{background:#dcfce7;color:#15803d;border-color:#86efac;}
body:not(.dark) .br{background:#fee2e2;color:#dc2626;border-color:#fca5a5;}
body:not(.dark) .bg{background:#fef3c7;color:#92400e;border-color:#fcd34d;}
body:not(.dark) .bb{background:#dbeafe;color:#1d4ed8;border-color:#93c5fd;}
body:not(.dark) .bp{background:#ede9fe;color:#6d28d9;border-color:#c4b5fd;}
body:not(.dark) .bt{background:#cffafe;color:#0e7490;border-color:#67e8f9;}
body:not(.dark) .bo{background:#ffedd5;color:#c2410c;border-color:#fdba74;}
body:not(.dark) .bz{background:#f1f5f9;color:#475569;border-color:#cbd5e1;}
body.dark .be{background:var(--emb);color:var(--em2);border-color:var(--embo);}
body.dark .br{background:var(--redb);color:var(--red);border-color:var(--redbo);}
body.dark .bg{background:var(--goldb);color:var(--gold);border-color:var(--goldbo);}
body.dark .bb{background:var(--blueb);color:var(--blue);border-color:var(--bluebo);}
body.dark .bp{background:var(--purb);color:var(--purple);}
body.dark .bt{background:var(--tealb);color:var(--teal);}
body.dark .bo{background:var(--orb);color:var(--orange);border-color:var(--orbo);}
body.dark .bz{background:var(--bg4);color:var(--t3);border-color:var(--b3);}

/* ═══════════════ BUTTONS ═══════════════ */
.btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 15px;border-radius:var(--r2);
  border:1px solid var(--b3);background:var(--bg3);
  color:var(--t2);font-size:12.5px;font-weight:700;
  cursor:pointer;font-family:'Tajawal',sans-serif;
  transition:.15s;white-space:nowrap;user-select:none;
}
.btn:hover{background:var(--bg4);color:var(--t1);}
.btn:active{transform:scale(.97);}
.btn-p{background:var(--em);border-color:var(--em);color:#fff;box-shadow:var(--emglow);}
.btn-p:hover{background:var(--em2);}
.btn-r{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.btn-r:hover{background:var(--red);color:#fff;}
.btn-g{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
.btn-sm{padding:5px 11px;font-size:12px;}
.btn-xs{padding:4px 9px;font-size:11px;}
.btn-w{width:100%;justify-content:center;}

/* ═══════════════ FORMS ═══════════════ */
.fg{display:flex;flex-direction:column;gap:5px;}
.fg.s2{grid-column:span 2;}
.fg.s3{grid-column:span 3;}
label{font-size:12px;font-weight:700;color:var(--t3);letter-spacing:.3px;}
.req::after{content:' *';color:var(--red);}
input,select,textarea{
  background:var(--bg2);border:1px solid var(--b3);
  border-radius:var(--r2);padding:8px 11px;
  color:var(--t1);font-size:13px;outline:none;
  font-family:'Tajawal',sans-serif;width:100%;
  transition:border-color .15s,box-shadow .15s;
}
body.dark input,body.dark select,body.dark textarea{background:var(--bg3);}
input:focus,select:focus,textarea:focus{
  border-color:var(--em);box-shadow:0 0 0 3px var(--emb);
}
input::placeholder{color:var(--t4);}
textarea{resize:vertical;min-height:70px;}
select option{background:var(--bg2);}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fgrid.c3{grid-template-columns:1fr 1fr 1fr;}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
.inp-row{display:flex;}
.inp-row input{border-radius:0 var(--r2) var(--r2) 0;flex:1;}
.inp-suf{
  background:var(--bg4);border:1px solid var(--b3);border-right:none;
  border-radius:var(--r2) 0 0 var(--r2);padding:8px 11px;
  color:var(--t4);font-size:12.5px;display:flex;align-items:center;flex-shrink:0;
}

/* ═══════════════ ALERTS ═══════════════ */
.al{
  display:flex;align-items:flex-start;gap:10px;
  padding:11px 14px;border-radius:var(--r2);border:1px solid;
  margin-bottom:14px;font-size:13px;
}
.al strong{font-weight:800;}
body:not(.dark) .al-e{background:#f0fdf4;border-color:#86efac;color:#15803d;}
body:not(.dark) .al-r{background:#fef2f2;border-color:#fca5a5;color:#dc2626;}
body:not(.dark) .al-g{background:#fffbeb;border-color:#fcd34d;color:#92400e;}
body:not(.dark) .al-b{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8;}
body.dark .al-e{background:var(--emb);border-color:var(--embo);color:var(--em2);}
body.dark .al-r{background:var(--redb);border-color:var(--redbo);color:var(--red);}
body.dark .al-g{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
body.dark .al-b{background:var(--blueb);border-color:var(--bluebo);color:var(--blue);}

/* ═══════════════ TABS ═══════════════ */
.tabs{display:flex;border-bottom:1px solid var(--b2);margin-bottom:16px;gap:0;overflow-x:auto;}
.tab{
  padding:9px 16px;cursor:pointer;font-size:13px;font-weight:700;
  color:var(--t4);border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:.15s;white-space:nowrap;user-select:none;
}
.tab:hover{color:var(--t2);}
.tab.on{color:var(--em);border-bottom-color:var(--em);}

/* ═══════════════ MODALS ═══════════════ */
.ov{
  position:fixed;inset:0;background:rgba(0,0,0,.60);
  display:flex;align-items:center;justify-content:center;
  z-index:10001;opacity:0;pointer-events:none;
  transition:opacity .2s;backdrop-filter:blur(6px);padding:16px;
}
.ov.on{opacity:1;pointer-events:all;}

.modal{
  background:var(--bg2);border:1px solid var(--b3);
  border-radius:var(--r4);width:100%;max-width:580px;
  box-shadow:var(--shadow2);
  transform:scale(.94) translateY(8px);
  transition:transform .22s cubic-bezier(.34,1.4,.64,1);
  max-height:90vh;display:flex;flex-direction:column;
}
.ov.on .modal{transform:scale(1) translateY(0);}
.modal-lg{max-width:700px;}
.modal-sm{max-width:420px;}
.m-hd{
  padding:16px 20px;border-bottom:1px solid var(--b2);
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
}
.m-title{font-size:15px;font-weight:800;color:var(--t1);}
.m-sub{font-size:11.5px;color:var(--t4);margin-top:1px;}
.m-x{
  width:28px;height:28px;border-radius:7px;
  background:var(--bg3);border:1px solid var(--b2);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--t3);font-size:13px;transition:.15s;flex-shrink:0;
}
.m-x:hover{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.m-body{padding:20px;overflow-y:auto;}
.m-foot{
  padding:14px 20px;border-top:1px solid var(--b2);
  display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0;
  background:var(--bg3);border-radius:0 0 var(--r4) var(--r4);
}
.m-foot-l{margin-right:auto;display:flex;gap:8px;}

/* ═══════════════ MISC ═══════════════ */
.sr{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--b1);}
.sr:last-child{border-bottom:none;}
.sr-l{font-size:12.5px;color:var(--t3);}
.sr-v{font-size:13px;font-weight:700;color:var(--t1);}
.pb{background:var(--bg4);border-radius:4px;height:5px;overflow:hidden;}
.pb-f{height:100%;border-radius:4px;transition:width .5s ease;}
.av{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.av1{background:linear-gradient(135deg,var(--em),var(--em3));color:#fff;}
.av2{background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;}
.av3{background:linear-gradient(135deg,var(--blue),#60a5fa);color:#fff;}
.av4{background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;}
.av5{background:linear-gradient(135deg,var(--red),#f87171);color:#fff;}
.av6{background:var(--bg4);color:var(--t3);border:1px solid var(--b3);}
.tl{padding-right:16px;position:relative;}
.tl::before{content:'';position:absolute;right:5px;top:4px;bottom:4px;width:1px;background:var(--b2);}
.tl-i{position:relative;padding-bottom:14px;padding-right:18px;}
.tl-d{position:absolute;right:-7px;top:5px;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg2);}
.tl-d.e{background:var(--em2);}.tl-d.g{background:var(--gold);}.tl-d.b{background:var(--blue);}.tl-d.r{background:var(--red);}.tl-d.z{background:var(--t4);}
.tl-t{font-size:10.5px;color:var(--t4);margin-bottom:2px;}
.tl-x{font-size:12.5px;color:var(--t2);}
.tl-x strong{color:var(--t1);}
.empty{text-align:center;padding:50px 20px;}
.empty-ic{font-size:42px;opacity:.2;margin-bottom:12px;}
.empty-tx{font-size:14px;color:var(--t4);}
.sw{width:38px;height:22px;border-radius:11px;background:var(--bg5);border:1px solid var(--b3);cursor:pointer;position:relative;transition:.18s;flex-shrink:0;}
.sw.on{background:var(--em);border-color:var(--em);}
.sw::after{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;right:2px;transition:transform .18s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.sw.on::after{transform:translateX(-16px);}
.qamt{
  padding:5px 11px;border-radius:var(--r1);
  background:var(--bg3);border:1px solid var(--b2);
  font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;
  transition:.14s;font-family:'Tajawal',sans-serif;
}
.qamt:hover{background:var(--emb);border-color:var(--embo);color:var(--em);}

/* ═══════════════ CHARTS ═══════════════ */
.barchart{
  height:200px;display:flex;align-items:flex-end;gap:7px;
  padding:16px 0 0;position:relative;
}
.barchart::before{
  content:'';position:absolute;top:16px;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(to bottom,transparent,transparent calc(25% - .5px),var(--b1) calc(25% - .5px),var(--b1) 25%);
  pointer-events:none;
}
.bc-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}
.bc-bar{
  width:100%;border-radius:4px 4px 0 0;min-height:4px;
  background:linear-gradient(to top,var(--em),var(--em3));
  position:relative;transition:opacity .2s;
}
.bc-bar:hover{opacity:.8;}
.bc-bar.hi{background:linear-gradient(to top,var(--gold),#fbbf24);}
.bc-lbl{font-size:10px;color:var(--t4);white-space:nowrap;}
.bc-v{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;color:var(--t3);white-space:nowrap;}
.spark{display:flex;align-items:flex-end;gap:3px;height:36px;}
.sp{flex:1;border-radius:2px 2px 0 0;background:var(--emb);min-height:4px;cursor:default;transition:background .18s;}
.sp:hover,.sp.hi{background:var(--em);}
.donut-w{display:flex;align-items:center;gap:16px;}
.donut{
  width:108px;height:108px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(var(--em2) 0% 38%,var(--gold) 38% 62%,var(--blue) 62% 79%,var(--purple) 79% 88%,var(--t4) 88% 100%);
  position:relative;
}
.donut::after{content:'';position:absolute;inset:24px;border-radius:50%;background:var(--bg2);}
.d-legend{display:flex;flex-direction:column;gap:6px;flex:1;}
.d-item{display:flex;align-items:center;gap:7px;font-size:12px;}
.d-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ═══════════════ POS ═══════════════ */
.pos-lay{display:grid;grid-template-columns:1fr 365px;gap:14px;height:calc(100vh - var(--tb) - 40px);}
.pos-left{display:flex;flex-direction:column;gap:10px;overflow:hidden;}
.pos-scroll{flex:1;overflow-y:auto;padding-right:2px;}
.pg{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:10px;
}
.pc{
  background:var(--bg2);border:1px solid var(--b2);border-radius:var(--r3);
  padding:13px;cursor:pointer;transition:all .15s;text-align:center;
  box-shadow:var(--shadow);
}
.pc:hover{border-color:var(--embo);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.10);}
.pc.sel{border-color:var(--em);background:var(--emb);box-shadow:0 0 0 2px var(--em);}
.pc-img{width:44px;height:44px;border-radius:11px;background:var(--bg3);display:flex;align-items:center;justify-content:center;margin:0 auto 9px;transition:transform .15s;}
.pc:hover .pc-img{transform:scale(1.08);}
.pc-name{font-size:12.5px;font-weight:700;color:var(--t1);margin-bottom:3px;line-height:1.3;}
.pc-price{font-size:14px;font-weight:900;color:var(--em);}
.pc-stock{font-size:10.5px;color:var(--t4);margin-top:2px;}
.pos-cart{
  background:var(--bg2);border:1px solid var(--b2);border-radius:var(--r3);
  display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow);
}
.cart-hd{padding:13px 15px;border-bottom:1px solid var(--b2);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.cart-body{flex:1;overflow-y:auto;}
.ci{
  display:flex;align-items:center;gap:8px;
  padding:9px 13px;border-bottom:1px solid var(--b1);transition:background .12s;
}
.ci:hover{background:var(--bg3);}
.ci-n{width:20px;height:20px;border-radius:50%;background:var(--emb);color:var(--em);font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ci-info{flex:1;min-width:0;}
.ci-name{font-size:12.5px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ci-unit{font-size:11px;color:var(--t4);}
.qc{display:flex;align-items:center;gap:5px;}
.qb{width:22px;height:22px;border-radius:5px;background:var(--bg4);border:1px solid var(--b2);color:var(--t2);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:.14s;line-height:1;}
.qb:hover{background:var(--em);border-color:var(--em);color:#fff;}
.qn{font-size:13px;font-weight:800;width:22px;text-align:center;color:var(--t1);}
.ci-sum{font-size:13px;font-weight:800;color:var(--em);min-width:68px;text-align:left;direction:ltr;}
.ci-del{width:20px;height:20px;border-radius:4px;border:none;background:transparent;color:var(--t4);cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center;transition:.14s;flex-shrink:0;}
.ci-del:hover{color:var(--red);background:var(--redb);}
.cart-ft{border-top:1px solid var(--b2);padding:13px 15px;background:var(--bg2);flex-shrink:0;}
.ct-r{display:flex;justify-content:space-between;margin-bottom:5px;}
.ct-l{font-size:12px;color:var(--t4);}
.ct-v{font-size:12px;font-weight:700;color:var(--t2);}
.ct-grand{display:flex;justify-content:space-between;align-items:baseline;padding:10px 0;margin:8px 0;border-top:1px solid var(--b2);border-bottom:1px solid var(--b2);}
.ct-gl{font-size:14px;font-weight:800;}
.ct-gv{font-size:24px;font-weight:900;color:var(--em);direction:ltr;}
.ct-gv .u{font-size:13px;font-weight:600;color:var(--t4);}

/* ═══════════════ PRODUCT CARDS ═══════════════ */
.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;}
.prod-c{
  background:var(--bg2);border:1px solid var(--b2);border-radius:var(--r3);
  padding:14px;cursor:pointer;transition:all .15s;box-shadow:var(--shadow);
}
.prod-c:hover{border-color:var(--b4);transform:translateY(-1px);box-shadow:var(--shadow2);}
.prod-img{width:100%;height:72px;border-radius:var(--r2);background:var(--bg3);display:flex;align-items:center;justify-content:center;margin-bottom:10px;}
.prod-name{font-size:13px;font-weight:700;margin-bottom:3px;}
.prod-meta{font-size:11px;color:var(--t4);margin-bottom:7px;}
.prod-row{display:flex;align-items:center;justify-content:space-between;}

/* ═══════════════ PERMS TABLE ═══════════════ */
.pt{display:grid;grid-template-columns:auto repeat(4,1fr);border:1px solid var(--b2);border-radius:var(--r2);overflow:hidden;}
.pt-hd{background:var(--bg3);padding:8px 12px;font-size:11px;font-weight:800;color:var(--t4);text-align:center;border-bottom:1px solid var(--b2);}
.pt-lbl{background:var(--bg3);padding:9px 13px;font-size:12.5px;color:var(--t2);font-weight:600;border-bottom:1px solid var(--b1);border-left:1px solid var(--b2);}
.pt-cell{padding:9px 12px;text-align:center;border-bottom:1px solid var(--b1);border-left:1px solid var(--b1);font-size:14px;}

/* ═══════════════ TVA SUMMARY ═══════════════ */
.tva-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--b1);font-size:13px;}
.tva-row:last-child{border-bottom:none;}

/* ═══════════════ THEME BTN ═══════════════ */
#theme-btn{
  width:34px;height:34px;border-radius:var(--r2);
  background:var(--bg3);border:1px solid var(--b2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:16px;flex-shrink:0;transition:.15s;
}
#theme-btn:hover{background:var(--bg4);}

/* ════════════════════════════════════════
   MOBILE LAYOUT
═══ ════════════════════════════════════════ */
#mob-nav{display:none;}
#mob-drawer{display:none;}

@media(max-width:768px){
  /* Hide desktop sidebar */
  #sidebar{display:none !important;}
  /* Show mobile nav */
  #mob-nav{
    display:flex;
    position:fixed;bottom:0;left:0;right:0;
    height:var(--mb);z-index:9999;
    background:var(--bg2);
    border-top:1px solid var(--b2);
    box-shadow:0 -4px 20px rgba(0,0,0,.10);
    padding-bottom:env(safe-area-inset-bottom,0px);
  }
  body.dark #mob-nav{box-shadow:0 -4px 20px rgba(0,0,0,.35);}
  .mob-tabs{display:flex;width:100%;align-items:stretch;}
  .mt{
    flex:1;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    gap:3px;cursor:pointer;color:var(--t4);
    position:relative;padding:6px 4px;
    transition:color .16s;user-select:none;
  }
  .mt:active{transform:scale(.92);}
  .mt.on{color:var(--em);}
  .mt.on .mt-ic-wrap{background:var(--emb);border-radius:16px;padding:3px 14px;}
  .mt-ic{font-size:20px;line-height:1;}
  .mt-ic-wrap{transition:all .18s;padding:2px 12px;}
  .mt-lbl{font-size:10px;font-weight:800;font-family:'Tajawal',sans-serif;line-height:1;}
  .mt-n{position:absolute;top:3px;right:10px;width:14px;height:14px;border-radius:50%;background:var(--red);color:#fff;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg2);}
  /* FAB button */
  .mt-fab{
    flex:0 0 68px;display:flex;flex-direction:column;align-items:center;justify-content:center;
    position:relative;cursor:pointer;user-select:none;gap:2px;
  }
  .fab-btn{
    width:54px;height:54px;border-radius:50%;
    background:linear-gradient(135deg,var(--em),var(--em3));
    box-shadow:0 4px 18px rgba(10,146,104,.42);
    display:flex;align-items:center;justify-content:center;
    font-size:24px;margin-top:-20px;
    border:3px solid var(--bg2);
    transition:transform .16s;
  }
  .mt-fab:active .fab-btn{transform:scale(.92);}
  /* Drawer */
  #mob-drawer{
    display:block;
    position:fixed;inset:0;z-index:10000;
    pointer-events:none;opacity:0;transition:opacity .22s;
  }
  #mob-drawer.on{pointer-events:all;opacity:1;}
  .mdb-bg{position:absolute;inset:0;background:rgba(0,0,0,.48);backdrop-filter:blur(4px);}
  .mdb-panel{
    position:absolute;bottom:0;left:0;right:0;
    background:var(--bg2);border-radius:22px 22px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom) + 80px);
    transform:translateY(100%);
    transition:transform .28s cubic-bezier(.34,1.15,.64,1);
    border-top:1px solid var(--b2);
    max-height:88vh;overflow-y:auto;
  }
  #mob-drawer.on .mdb-panel{transform:translateY(0);}
  .mdb-handle{width:36px;height:4px;border-radius:2px;background:var(--b3);margin:0 auto 14px;}
  .mdb-title{font-size:12px;font-weight:800;color:var(--t4);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;}
  .mdb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;}
  .mdb-item{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    padding:12px 4px;border-radius:var(--r3);
    background:var(--bg3);border:1px solid var(--b1);
    cursor:pointer;transition:all .15s;user-select:none;
  }
  .mdb-item:active{transform:scale(.93);background:var(--bg4);}
  .mdb-ic{font-size:22px;}
  .mdb-lbl{font-size:11px;font-weight:700;color:var(--t2);text-align:center;font-family:'Tajawal',sans-serif;line-height:1.3;}
  .mdb-row{
    display:flex;align-items:center;gap:10px;padding:12px 14px;
    border-radius:var(--r2);background:var(--bg3);border:1px solid var(--b1);
    cursor:pointer;transition:.15s;user-select:none;margin-top:10px;
  }
  .mdb-row:active{background:var(--bg4);}
  /* Main adjustments */
  #main{margin-right:0 !important;padding-bottom:calc(var(--mb) + env(safe-area-inset-bottom,0px));min-height:auto;}
  html{height:auto;}
  body{min-height:100vh;}
  #topbar{padding:0 12px;}
  .srch{display:none;}
  .tb-btn .tb-txt{display:none;}
  .page{padding:12px;}
  .kpis{grid-template-columns:1fr 1fr;gap:10px;}
  .kpi-val{font-size:19px;}
  .g2,.g3,.g4,.g65,.g35{grid-template-columns:1fr !important;}
  .pos-lay{grid-template-columns:1fr !important;height:auto !important;}
  .pos-left{max-height:52vh;}
  .pg{grid-template-columns:repeat(3,1fr);gap:8px;}
  .pc-img{width:36px;height:36px;font-size:18px;}
  .pc-name{font-size:11.5px;}
  .barchart{height:140px;}
  .ov{padding:0;align-items:flex-end;}
  .modal{max-width:100% !important;border-radius:20px 20px 0 0;max-height:92vh;}

  /* ── Dashboard mobile fixes ── */
  #p-dashboard .kpis{grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
  #p-dashboard .kpi{padding:12px !important;}
  #p-dashboard .kpi-val{font-size:17px !important;}
  #p-dashboard .kpi-sub{display:none;}
  #p-dashboard .kpi-top{margin-bottom:6px;}

  /* Charts: hide complex chart, show simple spark only */
  #p-dashboard .g65 > .card:first-child .barchart{height:110px;}
  #p-dashboard .g65 > div:last-child{display:flex;flex-direction:row;gap:10px;overflow-x:auto;}
  #p-dashboard .g65 > div:last-child > .card{min-width:200px;flex:1;}
  #p-dashboard .donut-w{flex-direction:column;align-items:flex-start;gap:8px;}
  #p-dashboard .donut{width:70px;height:70px;}
  #p-dashboard .donut::after{inset:16px;}

  /* Dashboard tables: hide less important columns */
  #p-dashboard table th:nth-child(4),
  #p-dashboard table td:nth-child(4),
  #p-dashboard table th:nth-child(6),
  #p-dashboard table td:nth-child(6){ display:none; }

  /* Quick actions row for mobile */
  .dash-quick{display:flex !important;}

  /* Recent invoices table simplify */
  #p-dashboard .tw{overflow-x:auto;-webkit-overflow-scrolling:touch;}
  #p-dashboard td, #p-dashboard th{padding:8px 8px !important;font-size:12px !important;}

  /* Hide low-priority cards on mobile */
  #p-dashboard .g65:last-child > div:last-child{display:none;}
}
@media(max-width:420px){
  .pg{grid-template-columns:repeat(2,1fr);}
  .kpi-val{font-size:17px;}
  .kpis{gap:8px;}
  #p-dashboard .kpis{grid-template-columns:1fr 1fr;gap:6px;}
  #p-dashboard .kpi-val{font-size:15px !important;}
}

/* ═══════════════ LUCIDE ICONS ═══════════════ */
.ic{
  display:inline-flex;align-items:center;justify-content:center;
  flex-shrink:0;
}
.ic svg{
  width:var(--ic-sz,18px);height:var(--ic-sz,18px);
  stroke:currentColor;fill:none;
  stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round;
}
.ic-sm svg{--ic-sz:15px;}
.ic-xs svg{--ic-sz:13px;}
.ic-lg svg{--ic-sz:22px;}
.ic-xl svg{--ic-sz:26px;}

/* KPI icon inside kpi-ic div */
.kpi-ic .ic svg{--ic-sz:17px;}
/* Sidebar icon */
.sbi-ic .ic svg{--ic-sz:16px;}
/* Mobile tab icon */
.mt-ic .ic svg{--ic-sz:22px;stroke-width:1.6;}
.fab-btn .ic svg{--ic-sz:26px;stroke:white;stroke-width:1.8;}
/* Drawer items */
.mdb-ic .ic svg{--ic-sz:24px;}
/* Badge dot hide when using icon badge */
.bx.no-dot::before{display:none;}
```

## FILE: resources/css/theme/components.css
```
/* ═══════════════════════════════════════════════
   components.css — المكونات v2.0
═══════════════════════════════════════════════ */

/* ═══ CARD ═══ */
.card{
  background:var(--bg2);
  border:1px solid var(--b2);
  border-radius:var(--r3);
  padding:18px;
  box-shadow:var(--shadow);
  transition:box-shadow .2s;
}
.card:hover{box-shadow:var(--shadow2);}
.card-hd{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:14px;padding-bottom:12px;
  border-bottom:1px solid var(--b1);
}
.card-title{
  font-size:13.5px;font-weight:800;
  color:var(--t1);display:flex;
  align-items:center;gap:7px;
}
.card-sub{font-size:11.5px;color:var(--t4);}

/* ═══ KPI CARDS ═══ */
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:20px;}
.kpi{
  background:var(--bg2);
  border:1px solid var(--b2);
  border-radius:var(--r3);
  padding:16px;position:relative;overflow:hidden;
  cursor:default;
  transition:transform .18s,box-shadow .18s;
  box-shadow:var(--shadow);
}
.kpi:hover{transform:translateY(-2px);box-shadow:var(--shadow2);}
.kpi::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
}
.kpi::after{
  content:'';position:absolute;top:0;right:0;
  width:80px;height:80px;
  border-radius:50%;opacity:.04;
  transform:translate(20px,-20px);
}
.kpi.ke::before{background:linear-gradient(90deg,var(--em),var(--em3));}
.kpi.kg::before{background:linear-gradient(90deg,var(--gold),#fbbf24);}
.kpi.kr::before{background:linear-gradient(90deg,var(--red),#f87171);}
.kpi.kb::before{background:linear-gradient(90deg,var(--blue),#60a5fa);}
.kpi.kp::before{background:linear-gradient(90deg,var(--purple),#a78bfa);}
.kpi.kt::before{background:linear-gradient(90deg,var(--teal),#67e8f9);}
.kpi.ko::before{background:linear-gradient(90deg,var(--orange),#fb923c);}
.kpi.ke::after{background:var(--em);}
.kpi.kg::after{background:var(--gold);}
.kpi.kr::after{background:var(--red);}
.kpi.kb::after{background:var(--blue);}
.kpi.kp::after{background:var(--purple);}
.kpi.kt::after{background:var(--teal);}
body:not(.dark) .kpi.ke{background:linear-gradient(150deg,#fff 60%,#f0fdf8);}
body:not(.dark) .kpi.kg{background:linear-gradient(150deg,#fff 60%,#fffbeb);}
body:not(.dark) .kpi.kr{background:linear-gradient(150deg,#fff 60%,#fef2f2);}
body:not(.dark) .kpi.kb{background:linear-gradient(150deg,#fff 60%,#eff6ff);}
body:not(.dark) .kpi.kp{background:linear-gradient(150deg,#fff 60%,#f5f3ff);}
body:not(.dark) .kpi.kt{background:linear-gradient(150deg,#fff 60%,#ecfeff);}
body:not(.dark) .kpi.ko{background:linear-gradient(150deg,#fff 60%,#fff7ed);}
.kpi-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
.kpi-ic{
  width:36px;height:36px;border-radius:10px;
  display:flex;align-items:center;justify-content:center;font-size:16px;
}
.ke .kpi-ic{background:var(--emb);color:var(--em);}
.kg .kpi-ic{background:var(--goldb);color:var(--gold);}
.kr .kpi-ic{background:var(--redb);color:var(--red);}
.kb .kpi-ic{background:var(--blueb);color:var(--blue);}
.kp .kpi-ic{background:var(--purb);color:var(--purple);}
.kt .kpi-ic{background:var(--tealb);color:var(--teal);}
.ko .kpi-ic{background:var(--orb);color:var(--orange);}
.kpi-trend{
  font-size:11px;font-weight:700;
  padding:3px 8px;border-radius:20px;
}
.up{background:rgba(16,185,129,.12);color:#059669;}
.dn{background:rgba(212,43,43,.10);color:var(--red);}
.neu{background:var(--bg4);color:var(--t4);}
.kpi-lbl{font-size:11.5px;color:var(--t3);margin-bottom:5px;}
.kpi-val{
  font-size:23px;font-weight:900;color:var(--t1);
  letter-spacing:-.6px;line-height:1;
}
.kpi-val .u{font-size:12px;font-weight:500;color:var(--t4);margin-right:2px;}
.kpi-sub{font-size:11px;color:var(--t4);margin-top:6px;}

/* ═══ GRIDS ═══ */
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.g65{display:grid;grid-template-columns:1.8fr 1fr;gap:16px;}
.g35{display:grid;grid-template-columns:1fr 1.8fr;gap:16px;}
.g73{display:grid;grid-template-columns:2.2fr 1fr;gap:16px;}

/* ═══ TABLE ═══ */
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;}
table{width:100%;border-collapse:collapse;}
thead th{
  padding:10px 13px;
  text-align:right;font-size:11px;
  font-weight:800;color:var(--t4);
  letter-spacing:.6px;text-transform:uppercase;
  background:var(--bg3);
  border-bottom:1px solid var(--b2);
  white-space:nowrap;
}
thead th:first-child{border-radius:0 var(--r2) 0 0;}
thead th:last-child{border-radius:var(--r2) 0 0 0;}
tbody tr{border-bottom:1px solid var(--b1);transition:background .12s;cursor:pointer;}
tbody tr:hover{background:var(--bg3);}
tbody tr:last-child{border-bottom:none;}
td{padding:11px 13px;font-size:13px;color:var(--t2);vertical-align:middle;}
td.s{color:var(--t1);font-weight:700;}
td.m{font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:var(--t4);}
td.e{color:var(--em);font-weight:700;}
td.r{color:var(--red);font-weight:600;}
td.g{color:var(--gold);font-weight:600;}
td.b{color:var(--blue);font-weight:600;}

/* ═══ BADGES / CHIPS ═══ */
.bx{
  display:inline-flex;align-items:center;gap:4px;
  padding:3px 9px;border-radius:20px;
  font-size:11px;font-weight:700;
  border:1px solid transparent;white-space:nowrap;
}
.bx::before{
  content:'';width:5px;height:5px;border-radius:50%;
  background:currentColor;opacity:.75;flex-shrink:0;
}
body:not(.dark) .be{background:#dcfce7;color:#15803d;border-color:#86efac;}
body:not(.dark) .br{background:#fee2e2;color:#c41c1c;border-color:#fca5a5;}
body:not(.dark) .bg{background:#fef3c7;color:#92400e;border-color:#fcd34d;}
body:not(.dark) .bb{background:#dbeafe;color:#1a40b8;border-color:#93c5fd;}
body:not(.dark) .bp{background:#ede9fe;color:#6520c4;border-color:#c4b5fd;}
body:not(.dark) .bt{background:#cffafe;color:#0d748c;border-color:#67e8f9;}
body:not(.dark) .bo{background:#ffedd5;color:#c43010;border-color:#fdba74;}
body:not(.dark) .bz{background:#f1f5f9;color:#475569;border-color:#cbd5e1;}
body:not(.dark) .bi{background:#e0e7ff;color:#3730a3;border-color:#a5b4fc;}
body.dark .be{background:var(--emb);color:var(--em2);border-color:var(--embo);}
body.dark .br{background:var(--redb);color:var(--red);border-color:var(--redbo);}
body.dark .bg{background:var(--goldb);color:var(--gold);border-color:var(--goldbo);}
body.dark .bb{background:var(--blueb);color:var(--blue);border-color:var(--bluebo);}
body.dark .bp{background:var(--purb);color:var(--purple);border-color:var(--purbo);}
body.dark .bt{background:var(--tealb);color:var(--teal);border-color:var(--tealbo);}
body.dark .bo{background:var(--orb);color:var(--orange);border-color:var(--orbo);}
body.dark .bz{background:var(--bg4);color:var(--t3);border-color:var(--b3);}

/* ═══ BUTTONS ═══ */
.btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 15px;border-radius:var(--r2);
  border:1px solid var(--b3);
  background:var(--bg3);color:var(--t2);
  font-size:12.5px;font-weight:700;cursor:pointer;
  font-family:'Tajawal',sans-serif;transition:.15s;
  white-space:nowrap;user-select:none;
}
.btn:hover{background:var(--bg4);color:var(--t1);}
.btn:active{transform:scale(.97);}
.btn-p{
  background:var(--em);border-color:var(--em);
  color:#fff;box-shadow:var(--emglow);
}
.btn-p:hover{background:var(--em2);box-shadow:var(--emglow2);}
.btn-r{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.btn-r:hover{background:var(--red);color:#fff;}
.btn-g{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
.btn-g:hover{background:var(--gold);color:#fff;}
.btn-b{background:var(--blueb);border-color:var(--bluebo);color:var(--blue);}
.btn-b:hover{background:var(--blue);color:#fff;}
.btn-sm{padding:5px 11px;font-size:12px;}
.btn-xs{padding:4px 9px;font-size:11px;}
.btn-w{width:100%;justify-content:center;}

/* ═══ FORMS ═══ */
.fg{display:flex;flex-direction:column;gap:5px;}
.fg.s2{grid-column:span 2;}
.fg.s3{grid-column:span 3;}
label{font-size:12px;font-weight:700;color:var(--t3);letter-spacing:.3px;}
.req::after{content:' *';color:var(--red);}
input,select,textarea{
  background:var(--bg2);
  border:1px solid var(--b3);
  border-radius:var(--r2);
  padding:8.5px 12px;
  color:var(--t1);font-size:13px;
  outline:none;font-family:'Tajawal',sans-serif;
  width:100%;transition:border-color .15s,box-shadow .15s;
}
body.dark input,body.dark select,body.dark textarea{background:var(--bg3);}
input:focus,select:focus,textarea:focus{
  border-color:var(--em);
  box-shadow:0 0 0 3px var(--emb);
}
input::placeholder{color:var(--t4);}
textarea{resize:vertical;min-height:70px;}
select option{background:var(--bg2);}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.fgrid.c3{grid-template-columns:1fr 1fr 1fr;}
input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
.inp-row{display:flex;}
.inp-row input{border-radius:0 var(--r2) var(--r2) 0;flex:1;}
.inp-suf{
  background:var(--bg4);border:1px solid var(--b3);
  border-right:none;
  border-radius:var(--r2) 0 0 var(--r2);
  padding:8px 12px;color:var(--t4);font-size:12.5px;
  display:flex;align-items:center;flex-shrink:0;
}

/* ═══ ALERTS ═══ */
.al{
  display:flex;align-items:flex-start;gap:10px;
  padding:12px 15px;border-radius:var(--r2);
  border:1px solid;margin-bottom:14px;font-size:13px;
}
.al strong{font-weight:800;}
body:not(.dark) .al-e{background:#f0fdf4;border-color:#86efac;color:#15803d;}
body:not(.dark) .al-r{background:#fef2f2;border-color:#fca5a5;color:#c41c1c;}
body:not(.dark) .al-g{background:#fffbeb;border-color:#fcd34d;color:#92400e;}
body:not(.dark) .al-b{background:#eff6ff;border-color:#93c5fd;color:#1a40b8;}
body:not(.dark) .al-p{background:#f5f3ff;border-color:#c4b5fd;color:#6520c4;}
body.dark .al-e{background:var(--emb);border-color:var(--embo);color:var(--em2);}
body.dark .al-r{background:var(--redb);border-color:var(--redbo);color:var(--red);}
body.dark .al-g{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
body.dark .al-b{background:var(--blueb);border-color:var(--bluebo);color:var(--blue);}
body.dark .al-p{background:var(--purb);border-color:var(--purbo);color:var(--purple);}

/* ═══ TABS ═══ */
.tabs{
  display:flex;border-bottom:1px solid var(--b2);
  margin-bottom:16px;gap:0;overflow-x:auto;
  scrollbar-width:none;
}
.tabs::-webkit-scrollbar{display:none;}
.tab{
  padding:9px 16px;cursor:pointer;
  font-size:13px;font-weight:700;color:var(--t4);
  border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:.15s;white-space:nowrap;user-select:none;
  display:flex;align-items:center;gap:5px;
}
.tab:hover{color:var(--t2);}
.tab.on{color:var(--em);border-bottom-color:var(--em);}

/* ═══ MODALS ═══ */
.ov{
  position:fixed;inset:0;
  background:rgba(0,0,0,.62);
  display:flex;align-items:center;justify-content:center;
  z-index:10001;opacity:0;pointer-events:none;
  transition:opacity .22s;
  backdrop-filter:blur(6px);padding:16px;
}
.ov.on{opacity:1;pointer-events:all;}
.modal{
  background:var(--bg2);border:1px solid var(--b3);
  border-radius:var(--r4);width:100%;max-width:580px;
  box-shadow:var(--shadow3);
  transform:scale(.94) translateY(10px);
  transition:transform .24s cubic-bezier(.34,1.4,.64,1);
  max-height:90vh;display:flex;flex-direction:column;
}
.ov.on .modal{transform:scale(1) translateY(0);}
.modal-lg{max-width:720px;}
.modal-xl{max-width:900px;}
.modal-sm{max-width:440px;}
.m-hd{
  padding:16px 20px;border-bottom:1px solid var(--b2);
  display:flex;align-items:center;justify-content:space-between;
  flex-shrink:0;
}
.m-title{font-size:15px;font-weight:800;color:var(--t1);}
.m-sub{font-size:11.5px;color:var(--t4);margin-top:1px;}
.m-x{
  width:28px;height:28px;border-radius:7px;
  background:var(--bg3);border:1px solid var(--b2);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--t3);font-size:13px;transition:.15s;flex-shrink:0;
}
.m-x:hover{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.m-body{padding:20px;overflow-y:auto;}
.m-foot{
  padding:14px 20px;border-top:1px solid var(--b2);
  display:flex;align-items:center;justify-content:flex-end;
  gap:8px;flex-shrink:0;
  background:var(--bg3);border-radius:0 0 var(--r4) var(--r4);
}
.m-foot-l{margin-right:auto;display:flex;gap:8px;}

/* ═══ PROGRESS BAR ═══ */
.pb{height:6px;background:var(--bg4);border-radius:3px;overflow:hidden;}
.pb-f{height:100%;border-radius:3px;background:var(--em);transition:width .4s;}

/* ═══ AVATAR ═══ */
.av{
  width:36px;height:36px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:800;color:#fff;flex-shrink:0;
}
.av1{background:linear-gradient(135deg,#0a8a5c,#0dbf84);}
.av2{background:linear-gradient(135deg,#6920d4,#a78bfa);}
.av3{background:linear-gradient(135deg,#1a4fd6,#60a5fa);}
.av4{background:linear-gradient(135deg,#b87d0a,#fbbf24);}
.av5{background:linear-gradient(135deg,#d42b2b,#f87171);}
.av6{background:linear-gradient(135deg,#0d7a8c,#67e8f9);}
.av7{background:linear-gradient(135deg,#c43a0a,#fb923c);}

/* ═══ SUMMARY ROWS ═══ */
.sr{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--b1);gap:8px;}
.sr:last-child{border-bottom:none;}
.sr-l{font-size:12.5px;color:var(--t3);}
.sr-v{font-size:13px;font-weight:700;color:var(--t1);}

/* ═══ TIMELINE ═══ */
.tl{padding-right:16px;position:relative;}
.tl::before{
  content:'';position:absolute;right:5px;top:4px;bottom:4px;
  width:1px;background:var(--b2);
}
.tl-i{position:relative;padding-bottom:14px;padding-right:18px;}
.tl-d{
  position:absolute;right:-7px;top:5px;
  width:12px;height:12px;border-radius:50%;
  border:2px solid var(--bg2);
}
.tl-d.e{background:var(--em2);}
.tl-d.g{background:var(--gold);}
.tl-d.b{background:var(--blue);}
.tl-d.r{background:var(--red);}
.tl-d.z{background:var(--t4);}
.tl-d.p{background:var(--purple);}
.tl-t{font-size:10.5px;color:var(--t4);margin-bottom:2px;}
.tl-x{font-size:12.5px;color:var(--t2);}
.tl-x strong{color:var(--t1);}

/* ═══ EMPTY STATE ═══ */
.empty{text-align:center;padding:56px 20px;}
.empty-ic{font-size:48px;opacity:.15;margin-bottom:14px;}
.empty-tx{font-size:14px;color:var(--t4);}
.empty-sub{font-size:12px;color:var(--t4);margin-top:6px;}

/* ═══ SWITCH ═══ */
.sw{
  width:38px;height:22px;border-radius:11px;
  background:var(--bg5);border:1px solid var(--b3);
  cursor:pointer;position:relative;transition:.18s;flex-shrink:0;
}
.sw.on{background:var(--em);border-color:var(--em);}
.sw::after{
  content:'';position:absolute;
  width:16px;height:16px;border-radius:50%;
  background:#fff;top:2px;right:2px;
  transition:transform .18s;
  box-shadow:0 1px 4px rgba(0,0,0,.2);
}
.sw.on::after{transform:translateX(-16px);}

/* ═══ CHARTS ═══ */
.barchart{
  height:200px;display:flex;align-items:flex-end;
  gap:7px;padding:16px 0 0;position:relative;
}
.barchart::before{
  content:'';position:absolute;top:16px;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(to bottom,transparent,transparent calc(25% - .5px),var(--b1) calc(25% - .5px),var(--b1) 25%);
  pointer-events:none;
}
.bc-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}
.bc-bar{
  width:100%;border-radius:5px 5px 0 0;min-height:4px;
  background:linear-gradient(to top,var(--em),var(--em3));
  position:relative;transition:opacity .2s,height .4s;
}
.bc-bar:hover{opacity:.8;}
.bc-bar.hi{background:linear-gradient(to top,var(--gold),#fbbf24);}
.bc-bar.b{background:linear-gradient(to top,var(--blue),#60a5fa);}
.bc-bar.r{background:linear-gradient(to top,var(--red),#f87171);}
.bc-lbl{font-size:10px;color:var(--t4);white-space:nowrap;}
.bc-v{
  position:absolute;top:-18px;left:50%;transform:translateX(-50%);
  font-size:10px;font-weight:700;color:var(--t3);white-space:nowrap;
}
.spark{display:flex;align-items:flex-end;gap:3px;height:36px;}
.sp{flex:1;border-radius:2px 2px 0 0;background:var(--emb);min-height:4px;cursor:default;transition:background .18s;}
.sp:hover,.sp.hi{background:var(--em);}
.donut-w{display:flex;align-items:center;gap:16px;}
.donut{
  width:110px;height:110px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(var(--em2) 0% 38%,var(--gold) 38% 62%,var(--blue) 62% 79%,var(--purple) 79% 88%,var(--t4) 88% 100%);
  position:relative;
}
.donut::after{
  content:'';position:absolute;inset:24px;
  border-radius:50%;background:var(--bg2);
}
.d-legend{display:flex;flex-direction:column;gap:6px;flex:1;}
.d-item{display:flex;align-items:center;gap:7px;font-size:12px;}
.d-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ═══ PRODUCT CARDS ═══ */
.prod-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;}
.prod-c{
  background:var(--bg2);border:1px solid var(--b2);
  border-radius:var(--r3);padding:14px;
  cursor:pointer;transition:all .15s;
  box-shadow:var(--shadow);
}
.prod-c:hover{border-color:var(--em);transform:translateY(-2px);box-shadow:var(--shadow2);}
.prod-img{
  width:100%;height:72px;border-radius:var(--r2);
  background:var(--bg3);display:flex;align-items:center;
  justify-content:center;margin-bottom:10px;
}
.prod-name{font-size:13px;font-weight:700;margin-bottom:3px;}
.prod-meta{font-size:11px;color:var(--t4);margin-bottom:7px;}
.prod-row{display:flex;align-items:center;justify-content:space-between;}

/* ═══ SETTINGS TABS ═══ */
.stab{
  padding:9px 16px;cursor:pointer;font-size:13px;font-weight:700;
  color:var(--t4);border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:.15s;white-space:nowrap;user-select:none;
  display:flex;align-items:center;gap:6px;
}
.stab:hover{color:var(--t2);}
.stab.on{color:var(--em);border-bottom-color:var(--em);}
.stpanel{display:none;}
.stpanel.on{display:block;animation:pgIn .2s ease;}
.pt-cell{
  padding:10px 12px;text-align:center;
  border-bottom:1px solid var(--b1);
  border-left:1px solid var(--b1);
  font-size:15px;
}

/* ═══ PAGE HEADER ═══ */
.page-header{
  display:flex;align-items:flex-start;justify-content:space-between;
  margin-bottom:20px;gap:12px;flex-wrap:wrap;
}
.page-title{font-size:20px;font-weight:900;color:var(--t1);margin-bottom:3px;}
.page-sub{font-size:12.5px;color:var(--t4);}
.page-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* ═══ STAT MINI ═══ */
.stat-row{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;
  background:var(--bg3);border-radius:var(--r2);
  border:1px solid var(--b2);
}
.stat-row-ic{
  width:32px;height:32px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;flex-shrink:0;
}
.stat-row-val{font-size:16px;font-weight:900;color:var(--t1);}
.stat-row-lbl{font-size:11px;color:var(--t4);}

/* ═══ FILTERS BAR ═══ */
.filters{
  display:flex;align-items:center;gap:8px;
  margin-bottom:16px;flex-wrap:wrap;
}
.filters .srch{flex:1;min-width:180px;}

/* ═══ QUICK AMOUNTS ═══ */
.qamt{
  padding:5px 11px;border-radius:var(--r1);
  background:var(--bg3);border:1px solid var(--b2);
  font-size:12px;font-weight:700;color:var(--t2);
  cursor:pointer;transition:.14s;font-family:'Tajawal',sans-serif;
}
.qamt:hover{background:var(--emb);border-color:var(--embo);color:var(--em);}

/* ═══ MISC ═══ */
.tva-row{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid var(--b1);font-size:13px;}
.tva-row:last-child{border-bottom:none;}
.dash-quick{display:none;}
.sep{height:1px;background:var(--b1);margin:12px 0;}
.dot-sep{
  display:inline-block;width:3px;height:3px;border-radius:50%;
  background:var(--t4);margin:0 5px;vertical-align:middle;
}
```

## FILE: resources/css/theme/layout.css
```
/* ═══════════════════════════════════════════════
   layout.css — التخطيط الرئيسي v2.0
═══════════════════════════════════════════════ */

/* ═══ SIDEBAR ═══ */
#sidebar{
  position:fixed;right:0;top:0;bottom:0;
  width:var(--sb);
  background:var(--bg2);
  border-left:1px solid var(--b2);
  display:flex;flex-direction:column;
  z-index:200;overflow-y:auto;
  box-shadow:var(--shadow2);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
}
body.dark #sidebar{background:var(--bg2);}

/* ═══ SIDEBAR LOGO ═══ */
.sb-logo{
  padding:16px 14px 12px;
  border-bottom:1px solid var(--b2);
  display:flex;align-items:center;gap:10px;
  flex-shrink:0;
  background:var(--bg2);
}
.sb-mark{
  width:40px;height:40px;
  border-radius:12px;
  background:var(--grad-em);
  display:flex;align-items:center;justify-content:center;
  font-size:19px;font-weight:900;color:#fff;
  flex-shrink:0;
  box-shadow:var(--emglow);
  letter-spacing:-1px;
}
.sb-name{font-size:14px;font-weight:800;color:var(--t1);line-height:1.2;}
.sb-sub{font-size:10.5px;color:var(--t4);}

/* ═══ COMPANY BADGE ═══ */
.sb-co{
  margin:10px 10px 2px;
  padding:10px 12px 47px;
  background:linear-gradient(135deg,var(--emb),rgba(10,138,92,.04));
  border:1px solid var(--embo);
  border-radius:var(--r3);
  font-size:11px;
  position:relative;
  overflow:hidden;
}
.sb-co::before{
  content:'';
  position:absolute;top:0;right:0;
  width:3px;height:100%;
  background:var(--grad-em);
}
.sb-co-name{font-weight:800;color:var(--em);font-size:12px;margin-bottom:2px;}
.sb-co-info{color:var(--t4);font-size:10.5px;font-family:'IBM Plex Mono',monospace;}

/* ═══ SIDEBAR SECTIONS ═══ */
.sb-sec{padding:8px 0 2px;}
.sb-lbl{
  font-size:9.5px;font-weight:800;
  color:var(--t4);letter-spacing:1.4px;
  padding:6px 15px 4px;text-transform:uppercase;
  display:flex;align-items:center;gap:6px;
}
.sb-lbl::before{
  content:'';width:12px;height:1px;
  background:currentColor;opacity:.4;flex-shrink:0;
}
.sb-sec:nth-child(3) .sb-lbl{color:var(--em);}
.sb-sec:nth-child(4) .sb-lbl{color:var(--blue);}
.sb-sec:nth-child(5) .sb-lbl{color:var(--purple);}
.sb-sec:nth-child(6) .sb-lbl{color:var(--gold);}
.sb-sec:nth-child(7) .sb-lbl{color:var(--orange);}
.sb-sec:nth-child(8) .sb-lbl{color:var(--red);}
.sb-sec:nth-child(9) .sb-lbl{color:var(--teal);}
.sb-sec:nth-child(10) .sb-lbl{color:var(--purple);}

/* ═══ SIDEBAR ITEMS ═══ */
.sbi{
  display:flex;align-items:center;gap:9px;
  padding:8px 14px;
  cursor:pointer;
  border-right:2px solid transparent;
  color:var(--t3);font-size:13px;font-weight:500;
  transition:all .16s;
  user-select:none;position:relative;
}
.sbi:hover{background:var(--bg3);color:var(--t2);}
.sbi.on{
  background:var(--emb);
  color:var(--em);
  border-right-color:var(--em);
  font-weight:700;
}
.sbi.on .sbi-ic{color:var(--em);}
.sbi-ic{font-size:15px;flex-shrink:0;width:18px;text-align:center;color:inherit;}
.sbi-badge{
  margin-right:auto;
  font-size:9.5px;font-weight:800;
  padding:1px 7px;border-radius:20px;
  background:var(--red);color:#fff;
  animation:badgePulse 2s ease-in-out infinite;
}
.sbi-badge.w{background:var(--gold);}
.sbi-badge.ic-badge{
  display:inline-flex;align-items:center;justify-content:center;
  width:18px;height:18px;padding:0;
}
.sbi-badge.ic-badge svg{width:10px;height:10px;stroke:white;stroke-width:2.5;}
@keyframes badgePulse{
  0%,100%{box-shadow:0 0 0 0 rgba(212,43,43,.4);}
  50%{box-shadow:0 0 0 4px rgba(212,43,43,0);}
}

/* ═══ SIDEBAR FOOTER ═══ */
.sb-foot{
  margin-top:auto;
  border-top:1px solid var(--b2);
  padding:10px;
  flex-shrink:0;
  background:var(--bg2);
}
.sb-user{
  display:flex;align-items:center;gap:9px;
  padding:9px 10px;
  border-radius:var(--r2);
  background:var(--bg3);border:1px solid var(--b2);
  cursor:pointer;transition:.15s;
}
.sb-user:hover{background:var(--bg4);}
.sb-av{
  width:32px;height:32px;border-radius:50%;
  background:var(--grad-em);
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;color:#fff;
  flex-shrink:0;
}
.sb-uname{font-size:12.5px;font-weight:700;color:var(--t1);}
.sb-urole{font-size:10.5px;color:var(--t4);}
.sb-dot{
  width:7px;height:7px;border-radius:50%;
  background:#10b981;flex-shrink:0;margin-right:auto;
  box-shadow:0 0 0 2px rgba(16,185,129,.25);
}

/* ═══ MAIN ═══ */
#main{
  margin-right:var(--sb);
  min-height:100vh;
  display:flex;flex-direction:column;
  background:var(--bg1);
}

/* ═══ TOPBAR ═══ */
#topbar{
  position:sticky;top:0;z-index:100;
  height:var(--tb);
  background:rgba(240,244,250,.92);
  backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
  border-bottom:1px solid var(--b2);
  padding:0 22px;
  display:flex;align-items:center;gap:12px;
  box-shadow:0 1px 8px rgba(0,0,0,.05);
}
body.dark #topbar{
  background:rgba(10,14,22,.92);
}
.tb-info{flex:1;min-width:0;}
.tb-title{font-size:15px;font-weight:800;color:var(--t1);}
.tb-path{font-size:11px;color:var(--t4);}
.tb-actions{display:flex;align-items:center;gap:8px;}

/* ═══ SEARCH ═══ */
.srch{
  display:flex;align-items:center;gap:7px;
  background:var(--bg3);
  border:1px solid var(--b2);
  border-radius:var(--r2);
  padding:7px 12px;
  transition:.15s;
}
.srch:focus-within{
  border-color:var(--em);
  background:var(--bg2);
  box-shadow:0 0 0 3px var(--emb);
}
.srch input{
  background:transparent;border:none;outline:none;
  color:var(--t1);font-size:12.5px;width:200px;
  font-family:'Tajawal',sans-serif;
}
.srch input::placeholder{color:var(--t4);}
.srch-ic{color:var(--t4);font-size:13px;}

/* ═══ ICON BUTTONS ═══ */
.ib{
  width:34px;height:34px;
  border-radius:var(--r2);
  background:var(--bg3);border:1px solid var(--b2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:15px;color:var(--t3);
  position:relative;transition:.15s;flex-shrink:0;
}
.ib:hover{background:var(--bg4);color:var(--t1);}
.ib-n{
  position:absolute;top:-4px;right:-4px;
  width:16px;height:16px;border-radius:50%;
  background:var(--red);color:#fff;
  font-size:8.5px;font-weight:800;
  display:flex;align-items:center;justify-content:center;
  border:2px solid var(--bg2);
}

/* ═══ TOPBAR BUTTON ═══ */
.tb-btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:7px 15px;
  border-radius:var(--r2);
  border:1px solid var(--b3);
  background:var(--bg3);color:var(--t2);
  font-size:12.5px;font-weight:700;cursor:pointer;
  font-family:'Tajawal',sans-serif;transition:.15s;
  white-space:nowrap;
}
.tb-btn:hover{background:var(--bg4);color:var(--t1);}
.tb-btn.p{
  background:var(--em);border-color:var(--em);
  color:#fff;box-shadow:var(--emglow);
}
.tb-btn.p:hover{background:var(--em2);}
#theme-btn{
  width:34px;height:34px;
  border-radius:var(--r2);
  background:var(--bg3);border:1px solid var(--b2);
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;font-size:16px;flex-shrink:0;transition:.15s;
}
#theme-btn:hover{background:var(--bg4);}

/* ═══ PAGES ═══ */
.page{display:none;padding:22px;}
.page.on{display:block;animation:pgIn .22s ease;}
#p-pos.on{display:flex;flex-direction:column;}
@keyframes pgIn{
  from{opacity:0;transform:translateY(8px);}
  to{opacity:1;transform:none;}
}

/* ═══ MOBILE NAV ═══ */
#mob-nav{display:none;}
#mob-drawer{display:none;}
.pos-mob-tabs{display:none;}

/* ═══ RESPONSIVE ═══ */
@media(max-width:768px){
  #sidebar{display:none !important;}
  #mob-nav{
    display:flex;
    position:fixed;bottom:0;left:0;right:0;
    height:var(--mb);z-index:9999;
    background:var(--bg2);
    border-top:1px solid var(--b2);
    box-shadow:0 -4px 20px rgba(0,0,0,.10);
    padding-bottom:env(safe-area-inset-bottom,0px);
  }
  body.dark #mob-nav{box-shadow:0 -4px 20px rgba(0,0,0,.35);}
  .mob-tabs{display:flex;width:100%;align-items:stretch;}
  .mt{
    flex:1;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    gap:3px;cursor:pointer;color:var(--t4);
    position:relative;padding:6px 4px;
    transition:color .16s;user-select:none;
  }
  .mt:active{transform:scale(.92);}
  .mt.on{color:var(--em);}
  .mt.on .mt-ic-wrap{
    background:var(--emb);
    border-radius:16px;padding:3px 14px;
  }
  .mt-ic{font-size:20px;line-height:1;}
  .mt-ic-wrap{transition:all .18s;padding:2px 12px;}
  .mt-lbl{font-size:10px;font-weight:800;font-family:'Tajawal',sans-serif;line-height:1;}
  .mt-n{
    position:absolute;top:3px;right:10px;
    width:14px;height:14px;border-radius:50%;
    background:var(--red);color:#fff;
    font-size:8px;font-weight:800;
    display:flex;align-items:center;justify-content:center;
    border:2px solid var(--bg2);
  }
  .mt-fab{
    flex:0 0 68px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    position:relative;cursor:pointer;user-select:none;gap:2px;
  }
  .fab-btn{
    width:54px;height:54px;border-radius:50%;
    background:var(--grad-em);
    box-shadow:0 4px 18px rgba(10,138,92,.45);
    display:flex;align-items:center;justify-content:center;
    font-size:24px;margin-top:-20px;
    border:3px solid var(--bg2);transition:transform .16s;
  }
  .mt-fab:active .fab-btn{transform:scale(.92);}

  /* DRAWER */
  #mob-drawer{
    display:block;position:fixed;inset:0;
    z-index:10000;pointer-events:none;opacity:0;
    transition:opacity .22s;
  }
  #mob-drawer.on{pointer-events:all;opacity:1;}
  .mdb-bg{position:absolute;inset:0;background:rgba(0,0,0,.50);backdrop-filter:blur(4px);}
  .mdb-panel{
    position:absolute;bottom:0;left:0;right:0;
    background:var(--bg2);
    border-radius:24px 24px 0 0;
    padding:12px 14px calc(env(safe-area-inset-bottom,0px) + 80px);
    transform:translateY(100%);
    transition:transform .28s cubic-bezier(.34,1.15,.64,1);
    border-top:1px solid var(--b2);
    max-height:88vh;overflow-y:auto;
  }
  #mob-drawer.on .mdb-panel{transform:translateY(0);}
  .mdb-handle{width:36px;height:4px;border-radius:2px;background:var(--b3);margin:0 auto 14px;}
  .mdb-title{
    font-size:11px;font-weight:800;color:var(--t4);
    text-transform:uppercase;letter-spacing:1.2px;
    margin-bottom:10px;margin-top:6px;
    padding-bottom:6px;border-bottom:1px solid var(--b1);
  }
  .mdb-title:first-of-type{margin-top:0;}
  .mdb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;}
  .mdb-item{
    display:flex;flex-direction:column;align-items:center;gap:5px;
    padding:12px 4px;border-radius:var(--r3);
    background:var(--bg3);border:1px solid var(--b1);
    cursor:pointer;transition:all .15s;user-select:none;
  }
  .mdb-item:active{transform:scale(.93);background:var(--bg4);}
  .mdb-ic{font-size:22px;}
  .mdb-lbl{font-size:11px;font-weight:700;color:var(--t2);text-align:center;font-family:'Tajawal',sans-serif;line-height:1.3;}
  .mdb-row{
    display:flex;align-items:center;gap:10px;
    padding:12px 14px;border-radius:var(--r2);
    background:var(--bg3);border:1px solid var(--b1);
    cursor:pointer;transition:.15s;user-select:none;margin-top:10px;
  }
  .mdb-row:active{background:var(--bg4);}

  #main{
    margin-right:0 !important;
    padding-bottom:calc(var(--mb) + env(safe-area-inset-bottom,0px));
    min-height:auto;
  }
  #main:has(#p-pos.on){padding-bottom:0;}
  html{height:auto;}
  body{min-height:100vh;}
  #topbar{padding:0 14px;}
  .srch{display:none;}
  .tb-btn .tb-txt{display:none;}
  .page{padding:14px;}
  .page:not(.on){display:none !important;}
  .kpis{grid-template-columns:1fr 1fr;gap:10px;}
  .kpi-val{font-size:19px;}
  .g2,.g3,.g4,.g65,.g35{grid-template-columns:1fr !important;}
  .barchart{height:140px;}
  .ov{padding:0;align-items:flex-end;}
  .modal{max-width:100% !important;border-radius:22px 22px 0 0;max-height:92vh;}
  .dash-quick{display:flex !important;}
}
@media(max-width:420px){
  .kpi-val{font-size:17px;}
  .kpis{gap:8px;}
  #p-dashboard .kpis{grid-template-columns:1fr 1fr;gap:6px;}
  #p-dashboard .kpi-val{font-size:15px !important;}
}
```

## FILE: resources/css/theme/pages.css
```
/* ═══════════════════════════════════════════════════════
   pages.css — أنماط مشتركة للصفحات
   (sr, pb, av, tl, alert, tabs, forms, modals, settings)
══════════════════════════════════════════════════════= */

/* ═══════════════ SUMMARY ROWS ═══════════════ */
.sr{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--b1);}
.sr:last-child{border-bottom:none;}
.sr-l{font-size:12.5px;color:var(--t3);}
.sr-v{font-size:13px;font-weight:700;color:var(--t1);}
.pb{background:var(--bg4);border-radius:4px;height:5px;overflow:hidden;}
.pb-f{height:100%;border-radius:4px;transition:width .5s ease;}
.av{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.av1{background:linear-gradient(135deg,var(--em),var(--em3));color:#fff;}
.av2{background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;}
.av3{background:linear-gradient(135deg,var(--blue),#60a5fa);color:#fff;}
.av4{background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;}
.av5{background:linear-gradient(135deg,var(--red),#f87171);color:#fff;}
.av6{background:var(--bg4);color:var(--t3);border:1px solid var(--b3);}
.tl{padding-right:16px;position:relative;}
.tl::before{content:'';position:absolute;right:5px;top:4px;bottom:4px;width:1px;background:var(--b2);}
.tl-i{position:relative;padding-bottom:14px;padding-right:18px;}
.tl-d{position:absolute;right:-7px;top:5px;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg2);}
.tl-d.e{background:var(--em2);}.tl-d.g{background:var(--gold);}.tl-d.b{background:var(--blue);}.tl-d.r{background:var(--red);}.tl-d.z{background:var(--t4);}
.tl-t{font-size:10.5px;color:var(--t4);margin-bottom:2px;}
.tl-x{font-size:12.5px;color:var(--t2);}
.tl-x strong{color:var(--t1);}
.empty{text-align:center;padding:50px 20px;}
.empty-ic{font-size:42px;opacity:.2;margin-bottom:12px;}
.empty-tx{font-size:14px;color:var(--t4);}
.sw{width:38px;height:22px;border-radius:11px;background:var(--bg5);border:1px solid var(--b3);cursor:pointer;position:relative;transition:.18s;flex-shrink:0;}
.sw.on{background:var(--em);border-color:var(--em);}
.sw::after{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;right:2px;transition:transform .18s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.sw.on::after{transform:translateX(-16px);}
.qamt{
  padding:5px 11px;border-radius:var(--r1);
  background:var(--bg3);border:1px solid var(--b2);
  font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;
  transition:.14s;font-family:'Tajawal',sans-serif;
}
.qamt:hover{background:var(--emb);border-color:var(--embo);color:var(--em);}

/* ═══════════════ CHARTS ═══════════════ */
.barchart{
  height:200px;display:flex;align-items:flex-end;gap:7px;
  padding:16px 0 0;position:relative;
}
.barchart::before{
  content:'';position:absolute;top:16px;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(to bottom,transparent,transparent calc(25% - .5px),var(--b1) calc(25% - .5px),var(--b1) 25%);
  pointer-events:none;
}
.bc-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}
.bc-bar{
  width:100%;border-radius:4px 4px 0 0;min-height:4px;
  background:linear-gradient(to top,var(--em),var(--em3));
  position:relative;transition:opacity .2s;
}
.bc-bar:hover{opacity:.8;}
.bc-bar.hi{background:linear-gradient(to top,var(--gold),#fbbf24);}
.bc-lbl{font-size:10px;color:var(--t4);white-space:nowrap;}
.bc-v{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;color:var(--t3);white-space:nowrap;}
.spark{display:flex;align-items:flex-end;gap:3px;height:36px;}
.sp{flex:1;border-radius:2px 2px 0 0;background:var(--emb);min-height:4px;cursor:default;transition:background .18s;}
.sp:hover,.sp.hi{background:var(--em);}
.donut-w{display:flex;align-items:center;gap:16px;}
.donut{
  width:108px;height:108px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(var(--em2) 0% 38%,var(--gold) 38% 62%,var(--blue) 62% 79%,var(--purple) 79% 88%,var(--t4) 88% 100%);
  position:relative;
}
.donut::after{content:'';position:absolute;inset:24px;border-radius:50%;background:var(--bg2);}
.d-legend{display:flex;flex-direction:column;gap:6px;flex:1;}
.d-item{display:flex;align-items:center;gap:7px;font-size:12px;}
.d-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ═══════════════ MODALS ═══════════════ */
.ov{
  position:fixed;inset:0;background:rgba(0,0,0,.60);
  display:flex;align-items:center;justify-content:center;
  z-index:10001;opacity:0;pointer-events:none;
  transition:opacity .2s;backdrop-filter:blur(6px);padding:16px;
}
.ov.on{opacity:1;pointer-events:all;}

.modal{
  background:var(--bg2);border:1px solid var(--b3);
  border-radius:var(--r4);width:100%;max-width:580px;
  box-shadow:var(--shadow2);
  transform:scale(.94) translateY(8px);
  transition:transform .22s cubic-bezier(.34,1.4,.64,1);
  max-height:90vh;display:flex;flex-direction:column;
}
.ov.on .modal{transform:scale(1) translateY(0);}
.modal-lg{max-width:700px;}
.modal-sm{max-width:420px;}
.m-hd{
  padding:16px 20px;border-bottom:1px solid var(--b2);
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
}
.m-title{font-size:15px;font-weight:800;color:var(--t1);}
.m-sub{font-size:11.5px;color:var(--t4);margin-top:1px;}
.m-x{
  width:28px;height:28px;border-radius:7px;
  background:var(--bg3);border:1px solid var(--b2);
  cursor:pointer;display:flex;align-items:center;justify-content:center;
  color:var(--t3);font-size:13px;transition:.15s;flex-shrink:0;
}
.m-x:hover{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.m-body{padding:20px;overflow-y:auto;}
.m-foot{
  padding:14px 20px;border-top:1px solid var(--b2);
  display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-shrink:0;
  background:var(--bg3);border-radius:0 0 var(--r4) var(--r4);
}
.m-foot-l{margin-right:auto;display:flex;gap:8px;}

/* ═══════════════ MISC ═══════════════ */
.sr{display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--b1);}
.sr:last-child{border-bottom:none;}
.sr-l{font-size:12.5px;color:var(--t3);}
.sr-v{font-size:13px;font-weight:700;color:var(--t1);}
.pb{background:var(--bg4);border-radius:4px;height:5px;overflow:hidden;}
.pb-f{height:100%;border-radius:4px;transition:width .5s ease;}
.av{width:32px;height:32px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;}
.av1{background:linear-gradient(135deg,var(--em),var(--em3));color:#fff;}
.av2{background:linear-gradient(135deg,#d97706,#fbbf24);color:#fff;}
.av3{background:linear-gradient(135deg,var(--blue),#60a5fa);color:#fff;}
.av4{background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;}
.av5{background:linear-gradient(135deg,var(--red),#f87171);color:#fff;}
.av6{background:var(--bg4);color:var(--t3);border:1px solid var(--b3);}
.tl{padding-right:16px;position:relative;}
.tl::before{content:'';position:absolute;right:5px;top:4px;bottom:4px;width:1px;background:var(--b2);}
.tl-i{position:relative;padding-bottom:14px;padding-right:18px;}
.tl-d{position:absolute;right:-7px;top:5px;width:12px;height:12px;border-radius:50%;border:2px solid var(--bg2);}
.tl-d.e{background:var(--em2);}.tl-d.g{background:var(--gold);}.tl-d.b{background:var(--blue);}.tl-d.r{background:var(--red);}.tl-d.z{background:var(--t4);}
.tl-t{font-size:10.5px;color:var(--t4);margin-bottom:2px;}
.tl-x{font-size:12.5px;color:var(--t2);}
.tl-x strong{color:var(--t1);}
.empty{text-align:center;padding:50px 20px;}
.empty-ic{font-size:42px;opacity:.2;margin-bottom:12px;}
.empty-tx{font-size:14px;color:var(--t4);}
.sw{width:38px;height:22px;border-radius:11px;background:var(--bg5);border:1px solid var(--b3);cursor:pointer;position:relative;transition:.18s;flex-shrink:0;}
.sw.on{background:var(--em);border-color:var(--em);}
.sw::after{content:'';position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:2px;right:2px;transition:transform .18s;box-shadow:0 1px 4px rgba(0,0,0,.2);}
.sw.on::after{transform:translateX(-16px);}
.qamt{
  padding:5px 11px;border-radius:var(--r1);
  background:var(--bg3);border:1px solid var(--b2);
  font-size:12px;font-weight:700;color:var(--t2);cursor:pointer;
  transition:.14s;font-family:'Tajawal',sans-serif;
}
.qamt:hover{background:var(--emb);border-color:var(--embo);color:var(--em);}

/* ═══════════════ CHARTS ═══════════════ */
.barchart{
  height:200px;display:flex;align-items:flex-end;gap:7px;
  padding:16px 0 0;position:relative;
}
.barchart::before{
  content:'';position:absolute;top:16px;left:0;right:0;bottom:0;
  background:repeating-linear-gradient(to bottom,transparent,transparent calc(25% - .5px),var(--b1) calc(25% - .5px),var(--b1) 25%);
  pointer-events:none;
}
.bc-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;}
.bc-bar{
  width:100%;border-radius:4px 4px 0 0;min-height:4px;
  background:linear-gradient(to top,var(--em),var(--em3));
  position:relative;transition:opacity .2s;
}
.bc-bar:hover{opacity:.8;}
.bc-bar.hi{background:linear-gradient(to top,var(--gold),#fbbf24);}
.bc-lbl{font-size:10px;color:var(--t4);white-space:nowrap;}
.bc-v{position:absolute;top:-17px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:700;color:var(--t3);white-space:nowrap;}
.spark{display:flex;align-items:flex-end;gap:3px;height:36px;}
.sp{flex:1;border-radius:2px 2px 0 0;background:var(--emb);min-height:4px;cursor:default;transition:background .18s;}
.sp:hover,.sp.hi{background:var(--em);}
.donut-w{display:flex;align-items:center;gap:16px;}
.donut{
  width:108px;height:108px;border-radius:50%;flex-shrink:0;
  background:conic-gradient(var(--em2) 0% 38%,var(--gold) 38% 62%,var(--blue) 62% 79%,var(--purple) 79% 88%,var(--t4) 88% 100%);
  position:relative;
}
.donut::after{content:'';position:absolute;inset:24px;border-radius:50%;background:var(--bg2);}
.d-legend{display:flex;flex-direction:column;gap:6px;flex:1;}
.d-item{display:flex;align-items:center;gap:7px;font-size:12px;}
.d-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

/* ═══════════════ POS — PROFESSIONAL UI ═══════════════ */

/* Layout */
/* ════════════════════════════════════════
   POS — نقطة البيع المتكاملة
════════════════════════════════════════ */

/* Stats bar */

/* ═══════════════════════════════════════
   POS SYSTEM — شاشة البيع
═══════════════════════════════════════ */

/* ── Stats ── */

/* ═══════════════ SETTINGS ═══════════════ */
.stab{
  padding:9px 16px;cursor:pointer;font-size:13px;font-weight:700;
  color:var(--t4);border-bottom:2px solid transparent;margin-bottom:-1px;
  transition:.15s;white-space:nowrap;user-select:none;
  display:flex;align-items:center;gap:6px;
}
.stab:hover{color:var(--t2);}
.stab.on{color:var(--em);border-bottom-color:var(--em);}
.stpanel{display:none;}
.stpanel.on{display:block;animation:pgIn .2s ease;}
.pt-cell{padding:10px 12px;text-align:center;border-bottom:1px solid var(--b1);border-left:1px solid var(--b1);font-size:15px;}
```

## FILE: resources/css/theme/pos.css
```
/* ════════════════════════════════════════
   POS — نقطة البيع المتكاملة (v2)
════════════════════════════════════════ */

/* Stats bar */
.pos-stats{display:flex;align-items:center;gap:6px;padding:6px 14px;background:var(--bg2);border-bottom:1px solid var(--b2);flex-shrink:0;overflow-x:auto;scrollbar-width:none;min-height:44px;}
.pos-stats::-webkit-scrollbar{display:none;}
.pos-chip{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid transparent;flex-shrink:0;white-space:nowrap;transition:transform .13s;}
.pos-chip.clickable{cursor:pointer;}
.pos-chip.clickable:hover{transform:translateY(-1px);}
.pos-chip.g{background:var(--emb);border-color:var(--embo);color:var(--em);}
.pos-chip.o{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
.pos-chip.b{background:var(--blueb);border-color:var(--bluebo);color:var(--blue);}
.pos-chip strong{font-weight:800;}
.pos-tools{margin-right:auto;display:flex;gap:3px;flex-shrink:0;align-items:center;}
.pos-kb-hint{display:flex;gap:6px;flex-shrink:0;align-items:center;font-size:9px;color:var(--t4);font-weight:700;padding-right:6px;}
.pos-kb-hint kbd{background:var(--bg4);border:1px solid var(--b3);border-radius:4px;padding:1px 5px;font-size:9px;font-family:monospace;color:var(--t3);}

/* Layout */
.pos-layout{display:grid;grid-template-columns:1fr 360px;height:calc(100vh - var(--tb) - 44px);overflow:hidden;}

/* LEFT: Products */
.pos-left{display:flex;flex-direction:column;overflow:hidden;background:var(--bg1);border-left:1px solid var(--b2);}
.pos-search-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg2);border-bottom:1px solid var(--b2);flex-shrink:0;}
.pos-inp{flex:1;display:flex;align-items:center;gap:7px;background:var(--bg3);border:1.5px solid var(--b2);border-radius:var(--r2);padding:7px 11px;transition:border-color .15s,box-shadow .15s;}
.pos-inp:focus-within{border-color:var(--em);background:var(--bg2);box-shadow:0 0 0 3px var(--emb);}
.pos-inp input{background:transparent;border:none;outline:none;color:var(--t1);font-size:13px;width:100%;font-family:'Tajawal',sans-serif;}
.pos-inp input::placeholder{color:var(--t4);}
.view-tog{display:flex;gap:3px;}
.vtb{width:28px;height:28px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--t4);transition:.12s;}
.vtb.on{background:var(--emb);border-color:var(--embo);color:var(--em);}
.vtb:hover:not(.on){background:var(--bg4);}

/* Category pills */
.pos-cats{display:flex;padding:0 10px;background:var(--bg2);border-bottom:1px solid var(--b2);flex-shrink:0;overflow-x:auto;scrollbar-width:none;}
.pos-cats::-webkit-scrollbar{display:none;}
.cat-btn{display:flex;align-items:center;gap:4px;padding:7px 11px;cursor:pointer;font-size:12px;font-weight:600;color:var(--t4);border:none;background:transparent;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .13s;white-space:nowrap;font-family:'Tajawal',sans-serif;}
.cat-btn:hover{color:var(--t2);}
.cat-btn.on{color:var(--em);border-bottom-color:var(--em);}
.cat-cnt{font-size:9px;font-weight:800;padding:1px 5px;border-radius:20px;background:var(--bg4);color:var(--t4);}
.cat-btn.on .cat-cnt{background:var(--emb);color:var(--em);}

/* Quick shortcuts */
.pos-quick{display:flex;align-items:center;gap:4px;padding:5px 12px;background:var(--bg2);border-bottom:1px solid var(--b1);flex-shrink:0;overflow-x:auto;scrollbar-width:none;}
.pos-quick::-webkit-scrollbar{display:none;}
.ql{font-size:10px;color:var(--t4);font-weight:700;flex-shrink:0;}
.qsc{display:flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;background:var(--bg3);border:1px solid var(--b2);font-size:11.5px;font-weight:700;color:var(--t2);cursor:pointer;font-family:'Tajawal',sans-serif;transition:all .12s;white-space:nowrap;flex-shrink:0;-webkit-tap-highlight-color:transparent;}
.qsc:hover,.qsc:active{background:var(--emb);border-color:var(--embo);color:var(--em);transform:translateY(-1px);}

/* Products grid */
.pos-grid-area{flex:1;overflow-y:auto;padding:10px 12px;}
.pgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;}
.pgrid.lv{grid-template-columns:1fr;gap:4px;}
.no-res{display:flex;flex-direction:column;align-items:center;gap:8px;padding:50px 20px;color:var(--t4);text-align:center;}

/* Product card */
.pc2{background:var(--bg2);border:1.5px solid var(--b2);border-radius:var(--r3);padding:10px 9px 8px;cursor:pointer;transition:all .14s;position:relative;overflow:hidden;user-select:none;-webkit-tap-highlight-color:transparent;}
.pc2::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--pc-color,var(--em));opacity:0;transition:opacity .13s;}
.pc2:hover{border-color:var(--b4);transform:translateY(-2px);box-shadow:0 6px 18px rgba(0,0,0,.09);}
.pc2:hover::after,.pc2.sel::after{opacity:1;}
.pc2:active{transform:scale(.95);}
.pc2.sel{border-color:var(--em);background:var(--emb);box-shadow:0 0 0 1.5px var(--em);}
.pc2.oos{opacity:.45;cursor:not-allowed;}
.pc2.oos:hover{transform:none;box-shadow:none;}
.pc2-badge{position:absolute;top:5px;left:5px;min-width:19px;height:19px;border-radius:10px;padding:0 4px;background:var(--em);color:#fff;font-size:9.5px;font-weight:800;display:none;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(10,146,104,.4);}
.pc2.sel .pc2-badge{display:flex;}
.pc2-ic{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;margin:0 auto 7px;background:var(--pc-bg,var(--emb));font-size:17px;transition:transform .13s;}
.pc2:hover .pc2-ic{transform:scale(1.08);}
.pc2-name{font-size:11px;font-weight:700;color:var(--t1);text-align:center;line-height:1.3;margin-bottom:2px;}
.pc2-price{font-size:13px;font-weight:900;color:var(--pc-color,var(--em));text-align:center;margin-bottom:2px;}
.pc2-stock{font-size:9.5px;text-align:center;font-weight:600;}
.pc2-stock.ok{color:var(--t4);}.pc2-stock.lo{color:var(--gold);}.pc2-stock.no{color:var(--red);}
.pgrid.lv .pc2{display:flex;align-items:center;gap:9px;padding:7px 11px;}
.pgrid.lv .pc2-ic{width:32px;height:32px;border-radius:7px;margin:0;flex-shrink:0;font-size:14px;}
.pgrid.lv .pc2-info{flex:1;min-width:0;}
.pgrid.lv .pc2-name,.pgrid.lv .pc2-price,.pgrid.lv .pc2-stock{text-align:right;margin:0;}
.pgrid.lv .pc2-badge{top:50%;transform:translateY(-50%);left:auto;right:8px;}

/* RIGHT: Cart */
.pos-cart{display:flex;flex-direction:column;overflow:hidden;background:var(--bg2);}
.cart-top{flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--b2);}
.cart-top-row{display:flex;align-items:center;justify-content:space-between;padding:9px 12px 6px;}
.cart-ttl{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:800;color:var(--t1);}
.cart-pill{display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;border-radius:10px;padding:0 4px;background:var(--em);color:#fff;font-size:10.5px;font-weight:800;transition:transform .2s;}
.cart-pill.bump{animation:pillBump .25s ease;}
@keyframes pillBump{0%{transform:scale(1)}50%{transform:scale(1.4)}100%{transform:scale(1)}}
.cart-acts2{display:flex;gap:3px;}
.cart-modes2{display:flex;margin:0 12px 7px;border-radius:var(--r2);overflow:hidden;border:1px solid var(--b2);}
.cmode{flex:1;padding:5px 3px;font-size:11px;font-weight:700;font-family:'Tajawal',sans-serif;border:none;cursor:pointer;background:var(--bg3);color:var(--t3);transition:all .13s;display:flex;align-items:center;justify-content:center;gap:3px;border-left:1px solid var(--b2);}
.cmode:first-child{border-left:none;}
.cmode.on{background:var(--em);color:#fff;}
.cart-client{padding:0 12px 8px;}
.cart-client select{width:100%;padding:6px 9px;border-radius:var(--r2);border:1px solid var(--b2);background:var(--bg3);font-family:'Tajawal',sans-serif;font-size:12px;color:var(--t1);outline:none;cursor:pointer;transition:border-color .15s;}
.cart-client select:focus{border-color:var(--em);}

/* KEY FIX: cart items grow, footer stays fixed */
.cart-items-body{flex:1;overflow-y:auto;min-height:0;}
.cart-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--t4);padding:16px;text-align:center;}
.cart-empty-ic{font-size:44px;opacity:.1;}

/* Cart item */
.ci{display:flex;align-items:center;gap:5px;padding:7px 11px;border-bottom:1px solid var(--b1);transition:background .1s;animation:ciIn .18s ease;}
@keyframes ciIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
.ci:hover{background:var(--bg3);}
.ci-n{width:17px;height:17px;border-radius:50%;flex-shrink:0;background:var(--emb);color:var(--em);font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;}
.ci-body{flex:1;min-width:0;}
.ci-name{font-size:12px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ci-prow{display:flex;align-items:center;gap:3px;margin-top:1px;}
.ci-pinp{width:58px;padding:2px 4px;font-size:10.5px;border-radius:4px;border:1px solid var(--b3);background:var(--bg3);color:var(--t1);font-family:'IBM Plex Mono',monospace;outline:none;}
.ci-pinp:focus{border-color:var(--em);}
.ci-punit{font-size:9.5px;color:var(--t4);}
.qc2{display:flex;align-items:center;gap:2px;flex-shrink:0;}
.qb2{width:24px;height:24px;border-radius:5px;background:var(--bg4);border:1px solid var(--b2);color:var(--t2);cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:.12s;-webkit-tap-highlight-color:transparent;}
.qb2:hover,.qb2:active{background:var(--em);border-color:var(--em);color:#fff;}
.qn2{font-size:13px;font-weight:800;width:20px;text-align:center;color:var(--t1);}
.ci-sum{font-size:12px;font-weight:800;color:var(--em);min-width:55px;text-align:left;direction:ltr;flex-shrink:0;}
.ci-del{width:18px;height:18px;border-radius:4px;border:none;background:transparent;color:var(--t4);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;transition:.12s;flex-shrink:0;}
.ci-del:hover,.ci-del:active{color:var(--red);background:var(--redb);}

/* CART FOOTER — compact */
.cart-foot{border-top:1px solid var(--b2);background:var(--bg2);flex-shrink:0;}
.cart-sums{padding:6px 12px 4px;}
.sum-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
.sum-l{font-size:11px;color:var(--t4);}
.sum-v{font-size:11.5px;font-weight:700;color:var(--t2);}
.disc-row2{display:flex;align-items:center;gap:4px;margin-bottom:4px;}
.dtog{padding:2px 7px;border-radius:var(--r1);font-size:11px;font-weight:700;cursor:pointer;border:1px solid var(--b2);background:var(--bg3);color:var(--t3);font-family:'Tajawal',sans-serif;transition:.12s;}
.dtog.on{background:var(--em);border-color:var(--em);color:#fff;}
.dinp{width:50px;padding:2px 6px;font-size:11.5px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);color:var(--t1);font-family:'Tajawal',sans-serif;outline:none;}
.dinp:focus{border-color:var(--em);}

/* Grand total */
.grand-bar{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:linear-gradient(135deg,var(--em2),var(--em));}
.grand-lbl{font-size:12px;font-weight:800;color:rgba(255,255,255,.85);}
.grand-val{font-size:24px;font-weight:900;color:#fff;direction:ltr;line-height:1;}
.grand-val .gu{font-size:12px;font-weight:500;opacity:.8;}

/* Payment method — compact single row */
.pay-sec{padding:6px 12px 4px;}
.pay-sec-lbl{font-size:9.5px;font-weight:800;color:var(--t4);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px;}
.pmg{display:flex;gap:4px;margin-bottom:5px;overflow-x:auto;scrollbar-width:none;}
.pmg::-webkit-scrollbar{display:none;}
.pmb2{display:flex;flex-direction:column;align-items:center;gap:1px;padding:5px 6px;border-radius:var(--r1);border:1.5px solid var(--b2);background:var(--bg3);cursor:pointer;font-size:10px;font-weight:700;color:var(--t3);font-family:'Tajawal',sans-serif;transition:all .13s;-webkit-tap-highlight-color:transparent;white-space:nowrap;flex-shrink:0;min-width:48px;}
.pmb2:hover{border-color:var(--b4);color:var(--t2);background:var(--bg4);}
.pmb2.on{border-color:var(--em);background:var(--emb);color:var(--em);box-shadow:0 0 0 1px var(--em);}
.pmb2 .pmi{font-size:15px;line-height:1;}

/* Action buttons */
.cart-btns2{display:grid;grid-template-columns:1fr 1.8fr;gap:6px;padding:5px 12px 10px;}
.btn-hold2{display:flex;align-items:center;justify-content:center;gap:5px;padding:9px 8px;border-radius:var(--r2);border:1.5px solid var(--b3);background:var(--bg3);color:var(--t2);font-size:12.5px;font-weight:700;cursor:pointer;font-family:'Tajawal',sans-serif;transition:.13s;-webkit-tap-highlight-color:transparent;}
.btn-hold2:hover{background:var(--bg4);}
.btn-sell2{display:flex;align-items:center;justify-content:center;gap:6px;padding:9px;border-radius:var(--r2);background:var(--em);border:none;color:#fff;font-size:14px;font-weight:800;cursor:pointer;font-family:'Tajawal',sans-serif;box-shadow:0 4px 14px rgba(10,146,104,.35);transition:.13s;-webkit-tap-highlight-color:transparent;}
.btn-sell2:hover{background:var(--em2);box-shadow:0 6px 20px rgba(10,146,104,.45);}
.btn-sell2:active{transform:scale(.97);}
.btn-sell2:disabled{background:var(--bg4);box-shadow:none;color:var(--t4);cursor:not-allowed;border:1px solid var(--b2);}

/* PAY MODAL */
.pay-amount-hero{background:linear-gradient(135deg,var(--em2),var(--em));padding:16px 20px 14px;text-align:center;}
.pay-ttc-big{font-size:40px;font-weight:900;color:#fff;line-height:1;direction:ltr;letter-spacing:-1px;}
.pay-ttc-label{font-size:11px;color:rgba(255,255,255,.7);margin-bottom:4px;}
.pay-client-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.18);border-radius:20px;padding:3px 12px;font-size:11.5px;color:#fff;font-weight:600;margin-top:8px;}
.pay-breakdown{display:flex;gap:0;border-bottom:1px solid var(--b2);}
.pay-bd-c{flex:1;padding:8px 6px;text-align:center;border-left:1px solid var(--b2);}
.pay-bd-c:last-child{border-left:none;}
.pay-bd-l{font-size:9px;color:var(--t4);margin-bottom:2px;text-transform:uppercase;letter-spacing:.5px;}
.pay-bd-v{font-size:12.5px;font-weight:800;color:var(--t1);}
.pay-m-grid{display:flex;gap:5px;padding:10px 16px 6px;overflow-x:auto;scrollbar-width:none;flex-wrap:wrap;}
.pay-m-grid::-webkit-scrollbar{display:none;}
.pmpill{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:20px;border:1.5px solid var(--b2);background:var(--bg3);cursor:pointer;font-size:12px;font-weight:700;color:var(--t3);font-family:'Tajawal',sans-serif;transition:all .13s;-webkit-tap-highlight-color:transparent;white-space:nowrap;}
.pmpill:hover{border-color:var(--b4);color:var(--t2);}
.pmpill.on{border-color:var(--em);background:var(--emb);color:var(--em);}
.pmpill .pmi{font-size:15px;}
.pay-cash-sec{padding:8px 16px 4px;}
.given-inp{width:100%;font-size:26px;font-weight:800;text-align:center;padding:9px;border:1.5px solid var(--b2);border-radius:var(--r2);background:var(--bg3);color:var(--t1);font-family:'Tajawal',sans-serif;outline:none;direction:ltr;margin-bottom:8px;}
.given-inp:focus{border-color:var(--em);background:var(--bg2);}
.qamts{display:flex;gap:5px;flex-wrap:wrap;padding:0 16px 6px;}
.qa{padding:4px 10px;border-radius:var(--r2);background:var(--bg4);border:1px solid var(--b2);font-size:11.5px;font-weight:700;color:var(--t2);cursor:pointer;font-family:'Tajawal',sans-serif;transition:.12s;-webkit-tap-highlight-color:transparent;}
.qa:hover,.qa:active{background:var(--emb);border-color:var(--embo);color:var(--em);}
.change-display{display:flex;justify-content:space-between;align-items:center;margin:0 16px 8px;padding:10px 14px;border-radius:var(--r2);background:var(--bg3);border:1px solid var(--b2);transition:all .2s;}
.change-display.positive{background:var(--emb);border-color:var(--embo);}
.change-display.negative{background:var(--redb);border-color:var(--redbo);}
.change-lbl2{font-size:12px;color:var(--t3);font-weight:600;}
.change-val2{font-size:20px;font-weight:900;}
.numpad{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:4px 16px 8px;}
.npk{padding:11px 8px;border-radius:var(--r2);background:var(--bg3);border:1px solid var(--b2);font-size:17px;font-weight:700;color:var(--t1);cursor:pointer;font-family:'Tajawal',sans-serif;text-align:center;transition:.12s;-webkit-tap-highlight-color:transparent;}
.npk:hover,.npk:active{background:var(--em);color:#fff;border-color:var(--em);}
.npk.zero{grid-column:span 2;}
.npk.del{color:var(--red);}
.npk.del:active{background:var(--red);color:#fff;}
.pay-split-sec{padding:8px 16px 4px;}
.split-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
.split-lbl{font-size:11.5px;color:var(--t4);width:48px;flex-shrink:0;font-weight:600;}
.split-inp{flex:1;padding:6px 9px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);font-family:'Tajawal',sans-serif;font-size:13px;color:var(--t1);outline:none;}
.split-inp:focus{border-color:var(--em);}
.pay-credit-sec{padding:8px 16px;}
.pay-note-sec{padding:4px 16px 8px;}
.pay-note-sec label{font-size:11px;font-weight:700;color:var(--t4);display:block;margin-bottom:4px;}

/* Alerts */
.al{display:flex;align-items:flex-start;gap:8px;padding:8px 12px;border-radius:var(--r2);font-size:12px;font-weight:600;margin-bottom:8px;}
.al.al-g{background:var(--emb);border:1px solid var(--embo);color:var(--em);}
.al.al-b{background:var(--blueb);border:1px solid var(--bluebo);color:var(--blue);}
.al.al-r{background:var(--redb);border:1px solid var(--redbo);color:var(--red);}
.al.al-y{background:var(--goldb);border:1px solid var(--goldbo);color:var(--gold);}

/* Toast */
.pos-toast{position:fixed;top:74px;left:50%;transform:translateX(-50%) translateY(-8px);background:var(--em);color:#fff;padding:9px 20px;border-radius:30px;font-size:13px;font-weight:800;z-index:99999;box-shadow:0 4px 18px rgba(10,146,104,.4);font-family:'Tajawal',sans-serif;white-space:nowrap;pointer-events:none;opacity:0;transition:all .28s cubic-bezier(.34,1.4,.64,1);}
.pos-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.pos-toast.err{background:var(--red);box-shadow:0 4px 18px rgba(220,38,38,.4);}
.pos-toast.warn{background:var(--gold);box-shadow:0 4px 18px rgba(180,83,9,.4);}

/* Mobile tabs */
.pos-mob-tabs{display:none;}

/* RECEIPT */
.receipt-wrap{background:#fff;border-radius:var(--r2);border:1px solid var(--b2);padding:20px;color:#0f172a;font-family:'Tajawal',sans-serif;}
.receipt-head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;margin-bottom:14px;border-bottom:2px solid #0a9268;}
.receipt-logo{font-size:17px;font-weight:900;color:#0a9268;}
.receipt-meta{font-size:10.5px;color:#64748b;margin-top:2px;line-height:1.5;}
.receipt-num{font-size:13px;font-weight:800;text-align:left;}
.receipt-tbl{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:10px;}
.receipt-tbl thead tr{background:#f0f4f9;}
.receipt-tbl th{padding:6px 8px;text-align:right;font-weight:800;font-size:10.5px;color:#475569;}
.receipt-tbl td{padding:5px 8px;border-bottom:1px solid #f1f5f9;}
.receipt-tbl td.num{text-align:left;direction:ltr;}
.receipt-totals{display:flex;justify-content:flex-end;}
.receipt-totals-inner{min-width:180px;}
.receipt-row{display:flex;justify-content:space-between;font-size:11px;color:#64748b;margin-bottom:3px;}
.receipt-grand{display:flex;justify-content:space-between;font-size:14px;font-weight:900;color:#0a9268;padding-top:7px;border-top:1.5px solid #0a9268;margin-top:4px;}
.receipt-foot{margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9.5px;color:#94a3b8;text-align:center;}


/* ════ MOBILE TOTAL BAR ════ */
.mob-total-bar{
  display:none; /* hidden by default, JS shows it */
  align-items:center;justify-content:space-between;
  padding:7px 14px;background:var(--bg2);
  border-bottom:1px solid var(--b2);
  flex-shrink:0;gap:10px;
}
.mob-total-left{
  display:flex;align-items:center;gap:6px;
  font-size:12px;font-weight:700;color:var(--t2);
}
.mob-total-right{
  display:flex;align-items:center;gap:8px;margin-right:auto;
}
.mob-total-label{font-size:10px;color:var(--t4);font-weight:600;}
.mob-total-val{
  font-size:16px;font-weight:900;color:var(--em);
  direction:ltr;min-width:75px;text-align:left;
}
.mob-total-pay-btn{
  display:flex;align-items:center;gap:4px;
  padding:7px 14px;border-radius:var(--r2);
  background:var(--em);border:none;color:#fff;
  font-size:12.5px;font-weight:800;cursor:pointer;
  font-family:'Tajawal',sans-serif;
  box-shadow:0 3px 10px rgba(10,146,104,.28);
  transition:.13s;-webkit-tap-highlight-color:transparent;
  white-space:nowrap;
}
.mob-total-pay-btn:active{transform:scale(.96);opacity:.9;}
.mob-total-pay-btn:disabled{background:var(--bg4);color:var(--t4);box-shadow:none;}

/* RESPONSIVE */
@media(max-width:1200px) and (min-width:769px){.pos-layout{grid-template-columns:1fr 330px;}}
@media(max-width:1000px) and (min-width:769px){
  .pos-layout{grid-template-columns:1fr 300px;}
  .pgrid{grid-template-columns:repeat(auto-fill,minmax(115px,1fr));}
  .grand-val{font-size:20px;}
  .pmb2{min-width:40px;padding:4px 5px;font-size:9.5px;}
  .pmb2 .pmi{font-size:13px;}
}

@media(max-width:768px){
  /* Mobile total bar */
  /* mob-total-bar: JS controls display, CSS just adds mobile-specific styles */
  .mob-total-bar{
    position:sticky;top:0;z-index:200;
    box-shadow:0 2px 8px rgba(0,0,0,.08);
  }

  .pos-mob-tabs{display:flex;position:sticky;bottom:0;left:0;right:0;height:52px;z-index:550;background:var(--bg2);border-top:1px solid var(--b2);box-shadow:0 -4px 20px rgba(0,0,0,.12);}
  .pmt{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;font-size:10px;font-weight:800;color:var(--t4);font-family:'Tajawal',sans-serif;transition:color .15s;-webkit-tap-highlight-color:transparent;position:relative;}
  .pmt.on{color:var(--em);}
  .pmt-ic{font-size:20px;line-height:1;}
  .pmt-badge{position:absolute;top:4px;right:calc(50% - 22px);min-width:17px;height:17px;border-radius:9px;padding:0 4px;background:var(--em);color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg2);}
  .pmt-sell-btn{flex:1.5;display:flex;align-items:center;justify-content:center;gap:6px;background:var(--em);color:#fff;border:none;cursor:pointer;font-size:13.5px;font-weight:800;font-family:'Tajawal',sans-serif;transition:.13s;-webkit-tap-highlight-color:transparent;}
  .pmt-sell-btn:active{opacity:.85;}
  .pmt-sell-btn:disabled{background:var(--bg4);color:var(--t4);}
  /* KEY FIX: Only apply POS layout when the page is actually active */
  #p-pos.on{display:flex;flex-direction:column;height:calc(100vh - var(--tb) - var(--mb) - 52px);overflow:hidden;}
  #p-pos:not(.on){display:none !important;}
  #p-pos.on .pos-layout{flex:1;grid-template-columns:1fr;height:auto;min-height:0;grid-template-rows:1fr;overflow:hidden;}
  #p-pos.on .pos-left,#p-pos.on .pos-cart{height:100%;grid-column:1;grid-row:1;overflow:hidden;display:flex;flex-direction:column;}
  #p-pos.on .pos-left{display:flex;}
  #p-pos.on .pos-cart{display:none;}
  #p-pos.on .mob-show-cart .pos-left{display:none !important;}
  #p-pos.on .mob-show-cart .pos-cart{display:flex !important;}
  .pos-stats{padding:5px 10px;gap:4px;}
  .pos-kb-hint{display:none !important;}
  .pos-search-bar{padding:6px 10px;gap:6px;}
  .pos-inp{padding:6px 10px;}
  .pos-inp input{font-size:13px;}
  .view-tog{display:none;}
  .pos-cats{padding:0 8px;}
  .cat-btn{padding:6px 9px;font-size:11px;}
  .pos-quick{padding:4px 10px;}
  .ql{display:none;}
  .pos-grid-area{padding:7px 9px;overflow-y:auto;flex:1;}
  .pgrid{grid-template-columns:repeat(3,1fr) !important;gap:6px !important;}
  .pc2{padding:7px 7px 6px;}
  .pc2-ic{width:32px;height:32px;font-size:14px;margin-bottom:5px;border-radius:8px;}
  .pc2-name{font-size:10px;}
  .pc2-price{font-size:12px;}
  .pc2-stock{font-size:9px;}
  .cart-top-row{padding:8px 11px 5px;}
  .cart-modes2{margin:0 11px 6px;}
  .cmode{font-size:10.5px;padding:4px 2px;}
  .cart-client{padding:0 11px 7px;}
  .ci{padding:6px 10px;}
  .ci-name{font-size:11.5px;}
  .cart-sums{padding:5px 11px 3px;}
  .grand-bar{padding:7px 11px;}
  .grand-val{font-size:20px;}
  .pay-sec{padding:4px 11px 3px;}
  .pmg{gap:3px;}
  .pmb2{min-width:42px;padding:4px 5px;font-size:9.5px;}
  .pmb2 .pmi{font-size:13px;}
  .cart-btns2{padding:4px 11px 8px;gap:5px;}
  .btn-hold2{padding:8px;font-size:12px;}
  .btn-sell2{padding:9px;font-size:13px;}
  .cart-items-body{flex:1;overflow-y:auto;min-height:0;}
  .pay-ttc-big{font-size:30px;}
  .given-inp{font-size:22px;padding:8px;}
  .numpad{gap:4px;padding:4px 14px 6px;}
  .npk{padding:10px;font-size:15px;}
  .pay-m-grid{padding:8px 14px 4px;}
  .qamts{padding:0 14px 4px;}
  .change-display{margin:0 14px 6px;}
  .pay-cash-sec{padding:6px 14px 2px;}
  .pay-note-sec{padding:4px 14px 6px;}
}
@media(max-width:420px){
  .pgrid{grid-template-columns:repeat(2,1fr) !important;}
  .pos-chip{padding:3px 8px;font-size:10px;}
}```

## FILE: resources/css/theme/tokens.css
```
/* ═══════════════════════════════════════════════════════
   tokens.css — المصدر الوحيد للتصميم v3.0
   نظام إدارة المبيعات الجزائري
   ملاحظة: هذا الملف يحل محل tokens.css القديم و app.css (:root section)
   يجب أن يُستورد أولاً قبل أي ملف CSS آخر
═══════════════════════════════════════════════════════ */

/* ─── Reset ─── */
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Tajawal', sans-serif;
  font-size: 14px; line-height: 1.6;
  overflow-x: hidden; min-height: 100vh;
  background: var(--bg1); color: var(--t1);
  transition: background .25s, color .25s;
}

/* ════════════════════════════════════════
   LIGHT THEME
════════════════════════════════════════ */
:root {
  /* ── Backgrounds ── */
  --bg0: #e8eef7;
  --bg1: #f0f4fa;
  --bg2: #ffffff;
  --bg3: #f5f8fd;
  --bg4: #eaf0f8;
  --bg5: #dde5f0;

  /* ── Borders ── */
  --b1: rgba(0,0,0,0.05);
  --b2: rgba(0,0,0,0.08);
  --b3: rgba(0,0,0,0.13);
  --b4: rgba(0,0,0,0.20);

  /* ── Text ── */
  --t1: #0d1b2a;
  --t2: #1e3a5f;
  --t3: #4a6785;
  --t4: #8aa4c0;

  /* ── Primary — Emerald (Algerian theme) ──
     القيمة الموحدة: #0a8a5c (من tokens.css الأصلي)
     تم حذف قيمة app.css #0a9268 لصالح هذه
  ── */
  --em:   #0a8a5c;
  --em2:  #077a50;
  --em3:  #0dbf84;
  --emb:  rgba(10,138,92,.08);
  --embo: rgba(10,138,92,.20);
  --em2b: rgba(10,138,92,.15);
  --emglow:  0 4px 20px rgba(10,138,92,.30);
  --emglow2: 0 8px 32px rgba(10,138,92,.25);

  /* ── Gold ── */
  --gold:   #b87d0a;
  --goldb:  rgba(184,125,10,.08);
  --goldbo: rgba(184,125,10,.22);

  /* ── Red ── */
  --red:   #d42b2b;
  --redb:  rgba(212,43,43,.07);
  --redbo: rgba(212,43,43,.20);

  /* ── Blue ── */
  --blue:   #1a4fd6;
  --blueb:  rgba(26,79,214,.07);
  --bluebo: rgba(26,79,214,.20);

  /* ── Purple ── */
  --purple: #6920d4;
  --purb:   rgba(105,32,212,.07);
  --purbo:  rgba(105,32,212,.20);

  /* ── Orange ── */
  --orange: #c43a0a;
  --orb:    rgba(196,58,10,.07);
  --orbo:   rgba(196,58,10,.20);

  /* ── Teal ── */
  --teal:   #0d7a8c;
  --tealb:  rgba(13,122,140,.07);
  --tealbo: rgba(13,122,140,.20);

  /* ── Indigo ── */
  --indigo:  #3730a3;
  --indigob: rgba(55,48,163,.07);

  /* ── Radii ──
     القيمة الموحدة لـ --r1: 5px (من tokens.css)
     تم حذف قيمة app.css 6px
  ── */
  --r1: 5px;
  --r2: 10px;
  --r3: 14px;
  --r4: 20px;
  --r5: 28px;

  /* ── Layout ──
     القيمة الموحدة لـ --sb: 264px (من tokens.css)
     تم حذف قيمة app.css 256px
  ── */
  --sb: 264px;
  --tb: 60px;
  --mb: 64px;

  /* ── Shadows ── */
  --shadow:         0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.05);
  --shadow2:        0 4px 20px rgba(0,0,0,.09), 0 1px 4px rgba(0,0,0,.06);
  --shadow3:        0 12px 40px rgba(0,0,0,.12);
  --shadow-colored: 0 4px 20px rgba(10,138,92,.20);

  /* ── Gradients ── */
  --grad-em:     linear-gradient(135deg, #0a8a5c, #0dbf84);
  --grad-em2:    linear-gradient(135deg, #077a50, #0a8a5c);
  --grad-header: linear-gradient(135deg, #0a8a5c 0%, #0dbf84 100%);
  --grad-bg:     linear-gradient(160deg, #f0f4fa 0%, #e8eef7 100%);
}

/* ════════════════════════════════════════
   DARK THEME
════════════════════════════════════════ */
body.dark {
  --bg0: #050810;
  --bg1: #0a0e16;
  --bg2: #111520;
  --bg3: #161b28;
  --bg4: #1c2232;
  --bg5: #22293c;

  --b1: rgba(255,255,255,0.04);
  --b2: rgba(255,255,255,0.07);
  --b3: rgba(255,255,255,0.11);
  --b4: rgba(255,255,255,0.17);

  --t1: #e8f0f8;
  --t2: #a8bdce;
  --t3: #6882a0;
  --t4: #3d5570;

  --em:   #14a872;
  --em2:  #1ac485;
  --em3:  #22e0a0;
  --emb:  rgba(20,168,114,.11);
  --embo: rgba(20,168,114,.28);
  --em2b: rgba(20,168,114,.18);
  --emglow:  0 4px 20px rgba(20,168,114,.30);
  --emglow2: 0 8px 32px rgba(20,168,114,.22);

  --gold:   #e0a830;
  --goldb:  rgba(224,168,48,.10);
  --goldbo: rgba(224,168,48,.28);

  --red:   #e84848;
  --redb:  rgba(232,72,72,.10);
  --redbo: rgba(232,72,72,.28);

  --blue:   #4d80ff;
  --blueb:  rgba(77,128,255,.10);
  --bluebo: rgba(77,128,255,.28);

  --purple: #a04cff;
  --purb:   rgba(160,76,255,.10);
  --purbo:  rgba(160,76,255,.28);

  --orange: #e06830;
  --orb:    rgba(224,104,48,.10);
  --orbo:   rgba(224,104,48,.28);

  --teal:   #20b8cc;
  --tealb:  rgba(32,184,204,.10);
  --tealbo: rgba(32,184,204,.28);

  --shadow:         0 2px 8px rgba(0,0,0,.40);
  --shadow2:        0 8px 32px rgba(0,0,0,.50);
  --shadow3:        0 16px 48px rgba(0,0,0,.60);
  --shadow-colored: 0 4px 20px rgba(20,168,114,.20);
}

/* ─── Scrollbar ─── */
::-webkit-scrollbar        { width: 5px; height: 5px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: var(--b3); border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: var(--b4); }

/* ─── Icon system ─── */
.ic { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic svg { width: var(--ic-sz, 18px); height: var(--ic-sz, 18px); stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.ic-xs svg  { --ic-sz: 13px; }
.ic-sm svg  { --ic-sz: 15px; }
.ic-lg svg  { --ic-sz: 22px; }
.ic-xl svg  { --ic-sz: 28px; }
.ic-2xl svg { --ic-sz: 34px; }
.kpi-ic .ic svg  { --ic-sz: 17px; }
.sbi-ic .ic svg  { --ic-sz: 16px; }
.mt-ic .ic svg   { --ic-sz: 22px; stroke-width: 1.6; }
.fab-btn .ic svg { --ic-sz: 26px; stroke: white; stroke-width: 1.8; }
.mdb-ic .ic svg  { --ic-sz: 24px; }
.bx.no-dot::before { display: none; }

/* ─── Selection ─── */
::selection { background: var(--emb); color: var(--em); }
```

## FILE: resources/css/theme/utilities.css
```
/* ═══════════════════════════════════════════════
   utilities.css — أدوات مساعدة
═══════════════════════════════════════════════ */

/* ── Alert bars ── */
.al{
  display:flex;align-items:flex-start;gap:10px;
  padding:11px 14px;border-radius:var(--r2);
  font-size:13px;line-height:1.5;margin-bottom:12px;
  border:1px solid transparent;
}
.al-g{background:var(--emb);border-color:var(--embo);color:var(--em);}
.al-w{background:var(--goldb);border-color:var(--goldbo);color:var(--gold);}
.al-r{background:var(--redb);border-color:var(--redbo);color:var(--red);}
.al-b{background:var(--blueb);border-color:var(--bluebo);color:var(--blue);}

/* ── Form grid ── */
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.fgrid.c3{grid-template-columns:repeat(3,1fr);}
.fgrid.c2{grid-template-columns:1fr 1fr;}
.fg.s2{grid-column:span 2;}
.fg.s3{grid-column:span 3;}
.fg.s4{grid-column:span 4;}

/* ── Input row (with prefix/suffix) ── */
.inp-row{
  display:flex;align-items:stretch;
  border:1px solid var(--b3);border-radius:var(--r2);overflow:hidden;
  background:var(--bg2);transition:border-color .15s,box-shadow .15s;
}
.inp-row:focus-within{
  border-color:var(--em);
  box-shadow:0 0 0 3px var(--emb);
}
.inp-row input,.inp-row select{
  border:none !important;outline:none !important;
  border-radius:0 !important;flex:1;box-shadow:none !important;
}
.inp-suf,.inp-pre{
  display:flex;align-items:center;justify-content:center;
  padding:0 12px;font-size:12px;font-weight:700;
  color:var(--t4);background:var(--bg3);
  flex-shrink:0;white-space:nowrap;
}
.inp-suf{border-right:1px solid var(--b3);}
.inp-pre{border-left:1px solid var(--b3);}

/* ── Tabs ── */
.tabs{
  display:flex;gap:0;
  border-bottom:1px solid var(--b2);
  margin-bottom:16px;overflow-x:auto;
  scrollbar-width:none;
}
.tabs::-webkit-scrollbar{display:none;}
.tab{
  padding:9px 16px;cursor:pointer;
  font-size:13px;font-weight:700;
  color:var(--t4);
  border-bottom:2px solid transparent;
  margin-bottom:-1px;
  transition:.15s;white-space:nowrap;
  user-select:none;
}
.tab:hover{color:var(--t2);}
.tab.on{color:var(--em);border-bottom-color:var(--em);}

/* ── Permissions table ── */
.pt{
  display:grid;
  grid-template-columns:minmax(160px,2fr) repeat(4,1fr);
}
.pt-hd{
  padding:9px 12px;
  background:var(--bg3);
  font-size:11px;font-weight:800;
  color:var(--t4);
  border-bottom:2px solid var(--b2);
  text-align:center;
}
.pt-lbl{
  padding:10px 12px;
  font-size:13px;font-weight:600;
  color:var(--t2);
  border-bottom:1px solid var(--b1);
  display:flex;align-items:center;
}

/* ── Pay modal specific ── */
.pay-amount-hero{
  padding:16px 20px 12px;
  text-align:center;
  background:linear-gradient(135deg,var(--emb),rgba(10,138,92,.02));
  border-bottom:1px solid var(--b1);
}
.pay-ttc-label{font-size:11px;color:var(--t4);font-weight:600;margin-bottom:4px;}
.pay-ttc-big{
  font-size:36px;font-weight:900;
  color:var(--em);direction:ltr;
  letter-spacing:-1px;line-height:1;
  margin-bottom:8px;
}
.pay-client-badge{
  display:inline-flex;align-items:center;gap:6px;
  padding:4px 12px;border-radius:20px;
  background:var(--bg3);border:1px solid var(--b2);
  font-size:12px;font-weight:700;color:var(--t2);
}
.pay-breakdown{
  display:flex;gap:0;
  border-bottom:1px solid var(--b1);
}
.pay-bd-c{
  flex:1;padding:8px 12px;text-align:center;
  border-left:1px solid var(--b1);
}
.pay-bd-c:first-child{border-left:none;}
.pay-bd-l{font-size:10px;color:var(--t4);font-weight:600;margin-bottom:3px;}
.pay-bd-v{font-size:13px;font-weight:800;color:var(--t1);}
.pay-m-grid{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:6px;padding:10px 14px 6px;
}
.pmpill{
  display:flex;flex-direction:column;align-items:center;gap:3px;
  padding:8px 6px;border-radius:var(--r2);
  border:1.5px solid var(--b2);background:var(--bg3);
  cursor:pointer;font-size:11.5px;font-weight:700;
  color:var(--t3);font-family:'Tajawal',sans-serif;
  transition:all .14s;-webkit-tap-highlight-color:transparent;
}
.pmpill:hover{border-color:var(--embo);color:var(--em);}
.pmpill.on{
  background:var(--emb);border-color:var(--em);
  color:var(--em);
}
.pmi{font-size:18px;}
.given-inp{
  width:100%;padding:12px;text-align:center;
  font-size:28px;font-weight:800;
  border:1.5px solid var(--b3);border-radius:var(--r2);
  background:var(--bg3);color:var(--t1);outline:none;
  font-family:'IBM Plex Mono',monospace;letter-spacing:1px;
  transition:border-color .15s;
}
.given-inp:focus{border-color:var(--em);background:var(--bg2);}
.qamts{
  display:flex;gap:6px;flex-wrap:wrap;
  padding:0 14px 8px;
}
.change-display{
  display:flex;align-items:center;justify-content:space-between;
  margin:0 14px 8px;
  padding:8px 12px;
  background:var(--bg3);border-radius:var(--r2);
  border:1px solid var(--b2);
}
.change-lbl2{font-size:12px;font-weight:700;color:var(--t3);}
.change-val2{font-size:18px;font-weight:900;direction:ltr;}
.numpad{
  display:grid;grid-template-columns:repeat(3,1fr);
  gap:6px;padding:6px 14px 10px;
}
.npk{
  padding:12px;border-radius:var(--r2);
  border:1px solid var(--b2);background:var(--bg3);
  color:var(--t1);font-size:17px;font-weight:700;
  cursor:pointer;transition:.12s;
  -webkit-tap-highlight-color:transparent;
  font-family:'IBM Plex Mono',monospace;
}
.npk:hover,.npk:active{background:var(--emb);border-color:var(--embo);color:var(--em);}
.npk.del{color:var(--red);}
.npk.zero{grid-column:span 2;}
.pay-cash-sec,.pay-split-sec,.pay-credit-sec{padding:8px 14px 4px;}
.split-row{
  display:flex;align-items:center;gap:8px;
  margin-bottom:8px;
}
.split-lbl{font-size:13px;font-weight:700;color:var(--t2);width:52px;flex-shrink:0;}
.split-inp{flex:1;padding:7px 10px;border-radius:var(--r1);border:1px solid var(--b3);background:var(--bg3);font-family:'IBM Plex Mono',monospace;font-size:13px;outline:none;}
.split-inp:focus{border-color:var(--em);}
.pay-note-sec{padding:4px 14px 8px;}
.pay-note-sec label{font-size:11px;font-weight:700;color:var(--t4);display:block;margin-bottom:4px;}

/* ── Cart footer ── */
.cart-foot{flex-shrink:0;border-top:1px solid var(--b2);}
.cart-sums{padding:8px 12px 4px;}
.sum-row{
  display:flex;align-items:center;justify-content:space-between;
  font-size:12px;padding:2.5px 0;
}
.sum-l{color:var(--t4);}
.sum-v{font-weight:700;color:var(--t1);font-family:'IBM Plex Mono',monospace;}
.grand-bar{
  display:flex;align-items:center;justify-content:space-between;
  padding:8px 12px;
  background:linear-gradient(135deg,var(--emb),rgba(10,138,92,.02));
  border-top:1px solid var(--embo);
  border-bottom:1px solid var(--b1);
}
.grand-lbl{font-size:12px;font-weight:700;color:var(--em);}
.grand-val{
  font-size:24px;font-weight:900;color:var(--em);
  direction:ltr;letter-spacing:-0.5px;line-height:1;
}
.gu{font-size:12px;font-weight:500;color:var(--t4);}
.btn-hold2{
  flex:1;padding:10px;border-radius:var(--r2);
  border:1.5px solid var(--b3);background:var(--bg3);
  color:var(--t2);font-size:12.5px;font-weight:700;
  cursor:pointer;font-family:'Tajawal',sans-serif;
  display:flex;align-items:center;justify-content:center;gap:5px;
  transition:.13s;
}
.btn-hold2:hover{background:var(--bg4);}
.btn-hold2:disabled{opacity:.4;cursor:not-allowed;}
.btn-sell2{
  flex:2;padding:10px;border-radius:var(--r2);
  border:none;background:var(--em);
  color:#fff;font-size:13.5px;font-weight:800;
  cursor:pointer;font-family:'Tajawal',sans-serif;
  display:flex;align-items:center;justify-content:center;gap:6px;
  transition:.13s;box-shadow:var(--emglow);
}
.btn-sell2:hover{background:var(--em2);}
.btn-sell2:disabled{background:var(--bg4);color:var(--t4);box-shadow:none;cursor:not-allowed;}
.cart-btns2{display:flex;gap:8px;padding:8px 12px 10px;}
.disc-row2{
  display:flex;align-items:center;gap:5px;
  font-size:12px;padding:3px 0;
}
.dinp{
  width:54px;padding:3px 6px;
  border:1px solid var(--b3);border-radius:4px;
  background:var(--bg3);color:var(--t1);
  font-size:11.5px;font-family:'IBM Plex Mono',monospace;
  outline:none;
}
.dinp:focus{border-color:var(--em);}
.dtog{
  padding:3px 7px;border-radius:4px;border:1px solid var(--b2);
  background:var(--bg3);font-size:11px;font-weight:700;
  color:var(--t4);cursor:pointer;font-family:'Tajawal',sans-serif;
  transition:.12s;
}
.dtog.on{background:var(--emb);border-color:var(--embo);color:var(--em);}

/* ── Receipt ── */
.receipt-wrap{
  max-width:560px;margin:0 auto;padding:20px;
  background:#fff;border-radius:8px;
  border:1px solid #e2e8f0;
  font-family:'Tajawal',sans-serif;
}
body.dark .receipt-wrap{background:#fff;color:#0d1b2a;}
.receipt-head{
  display:flex;justify-content:space-between;
  align-items:flex-start;margin-bottom:16px;
  padding-bottom:12px;border-bottom:2px solid #0a8a5c;
}
.receipt-logo{font-size:16px;font-weight:900;color:#0a8a5c;margin-bottom:4px;}
.receipt-meta{font-size:10.5px;color:#64748b;line-height:1.6;}
.receipt-num{text-align:left;font-size:13px;font-weight:800;color:#0d1b2a;}
.receipt-totals{
  background:#f8fafc;border-radius:8px;
  padding:12px 14px;margin-top:12px;
}
.receipt-totals-inner{max-width:280px;margin-left:auto;}
.receipt-row{
  display:flex;justify-content:space-between;
  font-size:12.5px;color:#475569;padding:4px 0;
}
.receipt-grand{
  display:flex;justify-content:space-between;
  font-size:14px;font-weight:900;color:#0a9268;
  padding-top:7px;border-top:1.5px solid #0a9268;margin-top:4px;
}
.receipt-foot{
  margin-top:14px;padding-top:10px;
  border-top:1px solid #e2e8f0;
  font-size:9.5px;color:#94a3b8;text-align:center;
}

/* ── Responsive utilities ── */
@media(max-width:768px){
  .fgrid,.fgrid.c3,.fgrid.c2{grid-template-columns:1fr !important;}
  .fg.s2,.fg.s3,.fg.s4{grid-column:span 1 !important;}
}
```



# =========================================
# 🧩 COMPONENTS
# =========================================

## FILE: resources/js/components/admin/CompanyDrawer/index.tsx
```
// components/admin/CompanyDrawer/index.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DrawerShell, TabBar, FlashBar, Avatar, StatusBadge, ActionBtn,
  InfoRow, SectionTitle, EmptyState, Spinner, fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';

const PLANS: Record<string, string> = {
  free:         'مجاني',
  starter:      'مبتدئ',
  professional: 'احترافي',
  enterprise:   'مؤسسة',
  custom:       'مخصص',
};

const TABS: TabDef[] = [
  { key: 'info',    label: 'المعلومات', icon: 'ti-building' },
  { key: 'members', label: 'الأعضاء',  icon: 'ti-users'    },
  { key: 'plan',    label: 'الخطة',    icon: 'ti-crown'    },
  { key: 'notes',   label: 'ملاحظات',  icon: 'ti-notes'    },
  { key: 'danger',  label: 'إجراءات',  icon: 'ti-bolt'     },
];

interface Props {
  company: AdminCompany;
  onClose: (refresh?: boolean) => void;
}

export default function CompanyDrawer({ company: co, onClose }: Props) {
  const [tab,           setTab]           = useState('info');
  const [flash,         setFlash]         = useState<{ ok: boolean; msg: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend,   setShowSuspend]   = useState(false);
  const [notes,         setNotes]         = useState(co.notes ?? '');
  const [planForm,      setPlanForm]      = useState({
    plan:           co.plan,
    max_users:      co.max_users,
    max_products:   co.max_products,
    max_warehouses: co.max_warehouses,
  });

  const muts = useCompanyMutations();
  const close = (refresh = false) => onClose(refresh);

  // ─── Flash helper ────────────────────────────────────────────────────────────
  const flash$ = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 4000);
  };

  // ─── Error helper — يستخرج رسالة الخطأ من ApiError أو أي كائن آخر ──────────
  const errMsg = (e: unknown): string => {
    if (!e) return 'حدث خطأ غير متوقع';
    if (typeof e === 'object' && 'message' in e) return (e as Error).message;
    return String(e);
  };

  // ─── Shorthand mutation caller مع onSuccess + onError ──────────────────────
  const run = (
    mutation: { mutate: (v: any, opts: any) => void; isPending: boolean },
    value: any,
    successMsg: string,
    refreshOnSuccess = true,
  ) => {
    mutation.mutate(value, {
      onSuccess: () => {
        flash$(true, successMsg);
        if (refreshOnSuccess) close(true);
      },
      onError: (e: unknown) => flash$(false, errMsg(e)),
    });
  };

  // ─── أعضاء الشركة ────────────────────────────────────────────────────────────
  const {
    data:     membersData,
    isLoading: mLoading,
    refetch:  refetchMembers,
  } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => companiesApi.listUsers(co.id),
    enabled:  tab === 'members',
    staleTime: 60_000,
  });

  // listUsers يُعيد Paginated<AdminUser> من apiGetPaginated (raw response.data)
  // البنية: { data: AdminUser[], meta: {...} }
  const members: AdminUser[] = (membersData as any)?.data ?? [];

  // ─── Helpers لأعضاء الشركة (مع error handling) ───────────────────────────────
  const handleToggleUser = async (u: AdminUser) => {
    try {
      await companiesApi.toggleUser(co.id, u.id);
      refetchMembers();
    } catch (e) {
      flash$(false, errMsg(e));
    }
  };

  const handleRemoveUser = async (u: AdminUser) => {
    if (!confirm(`إزالة ${u.name}؟`)) return;
    try {
      await companiesApi.removeUser(co.id, u.id);
      refetchMembers();
      flash$(true, 'تم إزالة المستخدم');
    } catch (e) {
      flash$(false, errMsg(e));
    }
  };

  return (
    <DrawerShell
      open
      onClose={() => close()}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar id={co.id} name={co.name} size={34} radius={10} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{co.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</div>
          </div>
        </div>
      }
      badge={<StatusBadge active={co.active} suspended={co.is_suspended} />}
    >
      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ══ INFO ═══════════════════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <div style={{ padding: '16px 20px' }}>
          <InfoRow label="الاسم التجاري"  value={co.commercial_name ?? co.name} />
          <InfoRow label="البريد"         value={co.email ?? '—'} />
          <InfoRow label="الهاتف"         value={co.phone ?? '—'} />
          <InfoRow label="النشاط"         value={co.activity ?? '—'} />
          <InfoRow label="NIF"            value={co.nif ?? '—'} />
          <InfoRow label="الخطة"          value={PLANS[co.plan] ?? co.plan} />
          <InfoRow label="المستخدمون"     value={`${co.users_count} / ${co.max_users || '∞'}`} />
          <InfoRow label="الموثّق"        value={co.verified_at ? `✓ ${fmtDate(co.verified_at)}` : '—'} />
          <InfoRow label="المالك"         value={co.owner ? `${co.owner.name} · ${co.owner.email}` : '—'} />
          <InfoRow label="تاريخ الإنشاء"  value={fmtDate(co.created_at)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {co.is_suspended ? (
              <ActionBtn icon="ti-player-play" label="رفع التعليق" variant="success"
                onClick={() => run(muts.unsuspend, co.id, 'تم رفع التعليق')}
                loading={muts.unsuspend.isPending} />
            ) : (
              <ActionBtn icon="ti-ban" label="تعليق الشركة" variant="danger"
                onClick={() => setShowSuspend(true)} />
            )}

            {co.active ? (
              <ActionBtn icon="ti-x" label="إيقاف التفعيل"
                onClick={() => run(muts.deactivate, co.id, 'تم إيقاف التفعيل')}
                loading={muts.deactivate.isPending} />
            ) : (
              <ActionBtn icon="ti-check" label="تفعيل" variant="success"
                onClick={() => run(muts.activate, co.id, 'تم التفعيل')}
                loading={muts.activate.isPending} />
            )}

            {!co.verified_at ? (
              <ActionBtn icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => run(muts.verify, co.id, 'تم التوثيق')}
                loading={muts.verify.isPending} />
            ) : (
              <ActionBtn icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => run(muts.unverify, co.id, 'تم إلغاء التوثيق')}
                loading={muts.unverify.isPending} />
            )}
          </div>

          {/* نموذج التعليق */}
          {showSuspend && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              border: '1px solid #ef444433', background: '#ef44440a',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                سبب التعليق
              </div>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2} placeholder="أدخل سبب التعليق..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid #ef444433', background: 'var(--bg3)',
                  color: 'var(--t1)', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <ActionBtn icon="ti-ban" label="تأكيد التعليق" variant="danger"
                  disabled={!suspendReason.trim()}
                  onClick={() => run(
                    muts.suspend,
                    { id: co.id, reason: suspendReason },
                    'تم التعليق',
                  )}
                  loading={muts.suspend.isPending} />
                <ActionBtn icon="ti-x" label="إلغاء"
                  onClick={() => { setShowSuspend(false); setSuspendReason(''); }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MEMBERS ════════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <div style={{ padding: '16px 20px' }}>
          <SectionTitle>أعضاء الشركة ({members.length})</SectionTitle>

          {mLoading ? <Spinner /> : members.length === 0 ? (
            <EmptyState icon="ti-users" text="لا يوجد أعضاء" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(u => (
                <div key={u.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)',
                }}>
                  <Avatar id={u.id} name={u.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>{u.email}</div>
                  </div>
                  <StatusBadge active={u.active} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button title="تجميد/تفعيل"
                      onClick={() => handleToggleUser(u)}
                      style={iBtn}>
                      <i className="ti ti-user-pause" />
                    </button>
                    <button title="إزالة"
                      onClick={() => handleRemoveUser(u)}
                      style={{ ...iBtn, color: '#ef4444', borderColor: '#ef444433' }}>
                      <i className="ti ti-user-minus" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ PLAN ═══════════════════════════════════════════════════════════════ */}
      {tab === 'plan' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>تغيير الخطة</SectionTitle>

          <div>
            <label style={lbl}>الخطة</label>
            <select
              value={planForm.plan}
              onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}
              style={sel}
            >
              {Object.entries(PLANS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {([
            { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)'   },
            { key: 'max_products',   label: 'حد المنتجات (0 = غير محدود)'     },
            { key: 'max_warehouses', label: 'حد المستودعات (0 = غير محدود)'   },
          ] as const).map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input
                type="number" min={0}
                value={planForm[f.key]}
                onChange={e => setPlanForm(p => ({
                  ...p,
                  [f.key]: parseInt(e.target.value, 10) || 0,
                }))}
                style={inp}
              />
            </div>
          ))}

          <ActionBtn icon="ti-crown" label="تطبيق الخطة"
            onClick={() => run(
              muts.changePlan,
              {
                id:             co.id,
                plan:           planForm.plan,
                // نُرسل null بدل 0 لكي يتجاهله array_filter في الباكاند
                // أو نُرسل القيمة كما هي — الباكاند يتعامل معها
                max_users:      planForm.max_users      || undefined,
                max_products:   planForm.max_products   || undefined,
                max_warehouses: planForm.max_warehouses || undefined,
              },
              'تم تغيير الخطة',
            )}
            loading={muts.changePlan.isPending} />
        </div>
      )}

      {/* ══ NOTES ══════════════════════════════════════════════════════════════ */}
      {tab === 'notes' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle>ملاحظات داخلية</SectionTitle>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8} placeholder="ملاحظات خاصة بالشركة..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box', fontFamily: 'Tajawal, sans-serif',
            }}
          />
          {/* ملاحظات: لا نُغلق الـ drawer بعد الحفظ — نبقى في نفس التاب */}
          <ActionBtn icon="ti-device-floppy" label="حفظ الملاحظات"
            onClick={() => run(
              muts.updateNotes,
              { id: co.id, notes },
              'تم حفظ الملاحظات',
              false, // لا نُغلق الدرور بعد الحفظ
            )}
            loading={muts.updateNotes.isPending} />
        </div>
      )}

      {/* ══ DANGER ═════════════════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#ef44441a', border: '1px solid #ef444433',
            fontSize: 12, color: '#ef4444',
          }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>

          <ActionBtn icon="ti-database" label="بذر البيانات الأساسية"
            onClick={() => run(muts.seed, co.id, 'تم البذر بنجاح', false)}
            loading={muts.seed.isPending} />

          <ActionBtn icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: unknown) => flash$(false, errMsg(e)),
              });
            }}
            loading={muts.remove.isPending} />
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const iBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7, border: '1px solid var(--b2)',
  background: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--t4)', marginBottom: 6,
};

const sel: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box',
};
```

## FILE: resources/js/components/admin/shared.tsx
```
// components/admin/shared.tsx
// مكونات مشتركة خفيفة لوحة الأدمن

// ─── Avatar ───────────────────────────────────────────────────────────────────

const GRADS = [
  'linear-gradient(135deg,#0a8a5c,#0dbf84)',
  'linear-gradient(135deg,#1a4fd6,#60a5fa)',
  'linear-gradient(135deg,#6920d4,#a78bfa)',
  'linear-gradient(135deg,#b87d0a,#fbbf24)',
  'linear-gradient(135deg,#c43a0a,#fb923c)',
];

export const grad   = (id: number) => GRADS[id % GRADS.length];
export const inits  = (n: string)  =>
  n.trim().split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');
export const fmtDate= (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ') : '—';
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('ar-DZ', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

interface AvatarProps { id: number; name: string; size?: number; radius?: number | string; }
export function Avatar({ id, name, size = 32, radius = '50%' }: AvatarProps) {
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: grad(id), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, color: '#fff',
    }}>
      {inits(name)}
    </div>
  );
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

interface SBProps { active: boolean; suspended?: boolean; size?: number; }
export function StatusBadge({ active, suspended, size = 11 }: SBProps) {
  const label = suspended ? 'موقوف' : active ? 'نشط' : 'معطل';
  const color = suspended ? '#f59e0b' : active ? '#10b981' : '#6b7280';
  return (
    <span style={{
      fontSize: size, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: color + '22', color,
    }}>{label}</span>
  );
}

// ─── DrawerShell ──────────────────────────────────────────────────────────────

interface DrawerProps {
  open:     boolean;
  onClose:  () => void;
  title:    React.ReactNode;
  subtitle?: string;
  badge?:   React.ReactNode;
  children: React.ReactNode;
  width?:   number;
}
export function DrawerShell({ open, onClose, title, subtitle, badge, children, width = 500 }: DrawerProps) {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,.45)', direction: 'rtl' }}
    >
      <div style={{ width, maxWidth: '100vw', background: 'var(--bg2)', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 32px rgba(0,0,0,.2)', maxHeight: '100vh', animation: 'slideInRight .22s ease' }}>
        <style>{`@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:none;opacity:1}}`}</style>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {badge}
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--t4)', padding: 4, lineHeight: 1 }}>
            <i className="ti ti-x" />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────

export interface TabDef { key: string; label: string; icon: string; }
interface TabBarProps { tabs: TabDef[]; active: string; onChange: (k: string) => void; }
export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 16px', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          padding: '9px 12px', border: 'none', background: 'none',
          borderBottom: active === t.key ? '2px solid var(--em)' : '2px solid transparent',
          color: active === t.key ? 'var(--em)' : 'var(--t3)',
          fontWeight: active === t.key ? 700 : 500,
          fontSize: 12, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        }}>
          <i className={`ti ${t.icon}`} style={{ fontSize: 13 }} />{t.label}
        </button>
      ))}
    </div>
  );
}

// ─── FlashBar ─────────────────────────────────────────────────────────────────

export function FlashBar({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <div style={{
      padding: '8px 20px', fontSize: 12, fontWeight: 600,
      background: ok ? '#10b9811a' : '#ef44441a',
      color: ok ? '#10b981' : '#ef4444',
    }}>
      {ok ? '✓' : '✗'} {msg}
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--b1)' }}>
      <span style={{ width: 130, fontSize: 12, color: 'var(--t4)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────

interface ABProps {
  icon: string; label: string; onClick: () => void;
  variant?: 'default' | 'danger' | 'success'; disabled?: boolean; loading?: boolean;
}
export function ActionBtn({ icon, label, onClick, variant = 'default', disabled, loading }: ABProps) {
  const colors = {
    default: { bg: 'var(--bg3)', border: 'var(--b2)',      color: 'var(--t2)' },
    danger:  { bg: '#ef44440d', border: '#ef444433',       color: '#ef4444'   },
    success: { bg: '#10b9810d', border: '#10b98133',       color: '#10b981'   },
  }[variant];
  return (
    <button
      onClick={onClick} disabled={disabled || loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '9px 14px', borderRadius: 8, border: `1px solid ${colors.border}`,
        background: colors.bg, color: colors.color,
        fontSize: 12, fontWeight: 700, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? .6 : 1, fontFamily: 'Tajawal, sans-serif',
        flex: 1,
      }}
    >
      <i className={`ti ${loading ? 'ti-loader' : icon}`} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
      {label}
    </button>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--t4)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)' }}>
      <i className={`ti ${icon}`} style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: .3 }} />
      <p style={{ margin: 0, fontSize: 13 }}>{text}</p>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <i className="ti ti-loader" style={{ fontSize: 24, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );
}
```

## FILE: resources/js/components/admin/UserDrawer/CompaniesTab.tsx
```
// components/admin/UserDrawer/CompaniesTab.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { companiesApi } from '@/lib/api/admin';
import { usersApi } from '@/lib/api/admin';
import { Avatar, SectionTitle, EmptyState, Spinner, StatusBadge } from '../shared';
import type { AdminUser, AdminCompany } from '@/types/admin';

interface Props {
  user:    AdminUser;
  onFlash: (ok: boolean, msg: string) => void;
  onRefreshUser: () => void;
}

export function CompaniesTab({ user: u, onFlash, onRefreshUser }: Props) {
  const [searchQ, setSearchQ] = useState('');
  const [transferId, setTransferId] = useState('');
  const [searching,  setSearching]  = useState(false);
  const [searchRes,  setSearchRes]  = useState<AdminCompany[]>([]);

  // شركات المستخدم الحالية
  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', u.id, 'companies'],
    queryFn:  () => usersApi.companies(u.id),
    staleTime: 60_000,
  });
  const companies: AdminCompany[] = (rawData as any)?.data ?? rawData ?? [];

  // بحث في الشركات للنقل
  const handleSearch = async () => {
    if (!searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await companiesApi.list({ search: searchQ, per_page: 8 } as any);
      setSearchRes((res as any)?.data ?? []);
    } finally { setSearching(false); }
  };

  const handleRemove = async (coId: number, coName: string) => {
    if (!confirm(`إزالة ${u.name} من ${coName}؟`)) return;
    try {
      await companiesApi.removeUser(coId, u.id);
      refetch(); onRefreshUser();
      onFlash(true, 'تم الإزالة');
    } catch { onFlash(false, 'فشلت الإزالة'); }
  };

  const handleToggle = async (coId: number) => {
    try {
      await companiesApi.toggleUser(coId, u.id);
      refetch();
    } catch { onFlash(false, 'فشل التغيير'); }
  };

  const handleAdd = async (co: AdminCompany) => {
    const already = companies.find(c => c.id === co.id);
    if (already) { onFlash(false, 'المستخدم عضو بالفعل في هذه الشركة'); return; }
    try {
      await companiesApi.addUser(co.id, u.id, 'member');
      refetch(); onRefreshUser(); setSearchRes([]); setSearchQ('');
      onFlash(true, `تمت إضافة ${u.name} لـ ${co.name}`);
    } catch { onFlash(false, 'فشلت الإضافة'); }
  };

  return (
    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── الشركات الحالية ── */}
      <div>
        <SectionTitle>الشركات المرتبطة ({companies.length})</SectionTitle>

        {isLoading ? <Spinner /> : companies.length === 0 ? (
          <EmptyState icon="ti-building-off" text="لا ينتمي لأي شركة" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {companies.map(co => (
              <div key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)' }}>
                <Avatar id={co.id} name={co.name} size={30} radius={8} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                    /{co.slug}
                    {(co as any).pivot?.role && ` · ${(co as any).pivot.role}`}
                  </div>
                </div>
                <StatusBadge active={(co as any).pivot?.active ?? true} />
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    title="تجميد/تفعيل"
                    onClick={() => handleToggle(co.id)}
                    style={iconBtn}
                  ><i className="ti ti-user-pause" /></button>
                  <button
                    title="إزالة"
                    onClick={() => handleRemove(co.id, co.name)}
                    style={{ ...iconBtn, color: '#ef4444', borderColor: '#ef444433' }}
                  ><i className="ti ti-building-minus" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── إضافة/نقل لشركة ── */}
      <div style={{ borderTop: '1px solid var(--b2)', paddingTop: 16 }}>
        <SectionTitle>إضافة / نقل إلى شركة</SectionTitle>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="ابحث باسم الشركة..."
            style={inputStyle}
          />
          <button onClick={handleSearch} disabled={searching} style={searchBtn}>
            {searching
              ? <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
              : <i className="ti ti-search" />}
          </button>
        </div>

        {searchRes.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {searchRes.map(co => (
              <div
                key={co.id}
                onClick={() => handleAdd(co)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', background: 'var(--bg3)', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg4)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg3)'}
              >
                <Avatar id={co.id} name={co.name} size={26} radius={7} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>/{co.slug}</div>
                </div>
                <i className="ti ti-plus" style={{ fontSize: 14, color: 'var(--em)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1, padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};
const searchBtn: React.CSSProperties = {
  padding: '0 12px', borderRadius: 8, border: '1px solid var(--b2)',
  background: 'var(--em)', color: '#fff', cursor: 'pointer', fontSize: 14,
};
const iconBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'none',
  cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
```

## FILE: resources/js/components/admin/UserDrawer/index.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// components/admin/CompanyDrawer/index.tsx  ← النسخة المُصلحة
//
// المشاكل الأصلية:
//
//   1. muts.suspend.mutate(co.id, ...)      ← كان يتوقع { slug, reason }
//      muts.unsuspend.mutate(co.id, ...)    ← كان يتوقع slug: string
//      muts.activate/deactivate/verify/unverify — نفس المشكلة
//      muts.changePlan.mutate({ id, ... })  ← كان يتوقع { slug, ... }
//      → الآن كلها تقبل id: number ✅
//
//   2. companiesApi.listUsers غير موجودة في الكود القديم
//      → أُضيفت في companies.ts ✅
//
//   3. muts.seed غير موجودة في useCompanyMutations
//      → أُضيفت في useAdminCompanies.ts ✅
//
//   4. بنية الـ response: members كانت (membersData as any)?.data ?? []
//      لكن apiGetPaginated يُعيد { data: [...], meta: {...} } مباشرة
//      → النتيجة الصحيحة: membersData?.data ?? []
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DrawerShell, TabBar, FlashBar, Avatar, StatusBadge,
  ActionBtn, InfoRow, SectionTitle, EmptyState, Spinner,
  fmtDate,
} from '../shared';
import type { TabDef } from '../shared';
import { companiesApi } from '@/lib/api/admin';
import { useCompanyMutations } from '@/hooks/admin';
import type { AdminCompany, AdminUser } from '@/types/admin';

const PLANS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي',
  enterprise: 'مؤسسة', custom: 'مخصص',
};

const TABS: TabDef[] = [
  { key: 'info',    label: 'المعلومات', icon: 'ti-building' },
  { key: 'members', label: 'الأعضاء',  icon: 'ti-users'    },
  { key: 'plan',    label: 'الخطة',    icon: 'ti-crown'    },
  { key: 'notes',   label: 'ملاحظات',  icon: 'ti-notes'    },
  { key: 'danger',  label: 'إجراءات',  icon: 'ti-bolt'     },
];

interface Props {
  company: AdminCompany;
  onClose: (refresh?: boolean) => void;
}

export default function CompanyDrawer({ company: co, onClose }: Props) {
  const [tab,          setTab]          = useState('info');
  const [flash,        setFlash]        = useState<{ ok: boolean; msg: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [showSuspend,  setShowSuspend]  = useState(false);
  const [notes,        setNotes]        = useState(co.notes ?? '');
  const [planForm,     setPlanForm]     = useState({
    plan:           co.plan,
    max_users:      co.max_users,
    max_products:   co.max_products,
    max_warehouses: co.max_warehouses,
  });

  const muts  = useCompanyMutations();
  const close = (refresh = false) => onClose(refresh);

  const flash$ = (ok: boolean, msg: string) => {
    setFlash({ ok, msg });
    setTimeout(() => setFlash(null), 3000);
  };

  // ── أعضاء الشركة ──────────────────────────────────────────────────────────
  // ✅ companiesApi.listUsers أُضيفت في companies.ts
  const {
    data: membersData,
    isLoading: mLoading,
    refetch: refetchMembers,
  } = useQuery({
    queryKey: ['admin', 'companies', co.id, 'users'],
    queryFn:  () => companiesApi.listUsers(co.id),
    enabled:  tab === 'members',
    staleTime: 60_000,
  });

  // ✅ apiGetPaginated يُعيد { data:[...], meta:{...} } مباشرة
  const members: AdminUser[] = membersData?.data ?? [];

  return (
    <DrawerShell
      open
      onClose={() => close()}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar id={co.id} name={co.name} size={34} radius={10} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{co.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</div>
          </div>
        </div>
      }
      badge={<StatusBadge active={co.active} suspended={co.is_suspended} />}
    >
      {flash && <FlashBar ok={flash.ok} msg={flash.msg} />}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ══ INFO ══════════════════════════════════════════════════════════════ */}
      {tab === 'info' && (
        <div style={{ padding: '16px 20px' }}>
          <InfoRow label="الاسم التجاري"  value={co.commercial_name ?? co.name} />
          <InfoRow label="البريد"          value={co.email ?? '—'} />
          <InfoRow label="الهاتف"          value={co.phone ?? '—'} />
          <InfoRow label="النشاط"          value={co.activity ?? '—'} />
          <InfoRow label="NIF"             value={co.nif ?? '—'} />
          <InfoRow label="الخطة"           value={PLANS[co.plan] ?? co.plan} />
          <InfoRow label="المستخدمون"      value={`${co.users_count ?? 0} / ${co.max_users || '∞'}`} />
          <InfoRow label="الموثّق"         value={co.verified_at ? `✓ ${fmtDate(co.verified_at)}` : '—'} />
          <InfoRow label="المالك"          value={co.owner ? `${co.owner.name} · ${co.owner.email}` : '—'} />
          <InfoRow label="تاريخ الإنشاء"   value={fmtDate(co.created_at)} />

          <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
            {/* ✅ suspend/unsuspend — id بدل slug */}
            {co.is_suspended ? (
              <ActionBtn
                icon="ti-player-play" label="رفع التعليق" variant="success"
                onClick={() => muts.unsuspend.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم رفع التعليق'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل رفع التعليق'),
                })}
                loading={muts.unsuspend.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-ban" label="تعليق الشركة" variant="danger"
                onClick={() => setShowSuspend(true)}
              />
            )}

            {/* ✅ activate/deactivate — id بدل slug */}
            {co.active ? (
              <ActionBtn
                icon="ti-x" label="إيقاف التفعيل"
                onClick={() => muts.deactivate.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم الإيقاف'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل الإيقاف'),
                })}
                loading={muts.deactivate.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-check" label="تفعيل" variant="success"
                onClick={() => muts.activate.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم التفعيل'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل التفعيل'),
                })}
                loading={muts.activate.isPending}
              />
            )}

            {/* ✅ verify/unverify — id بدل slug */}
            {!co.verified_at ? (
              <ActionBtn
                icon="ti-shield-check" label="توثيق" variant="success"
                onClick={() => muts.verify.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم التوثيق'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل التوثيق'),
                })}
                loading={muts.verify.isPending}
              />
            ) : (
              <ActionBtn
                icon="ti-shield-off" label="إلغاء التوثيق"
                onClick={() => muts.unverify.mutate(co.id, {
                  onSuccess: () => { flash$(true, 'تم الإلغاء'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل إلغاء التوثيق'),
                })}
                loading={muts.unverify.isPending}
              />
            )}
          </div>

          {/* نموذج التعليق */}
          {showSuspend && (
            <div style={{
              marginTop: 14, padding: 14, borderRadius: 10,
              border: '1px solid #ef444433', background: '#ef44440a',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>
                سبب التعليق
              </div>
              <textarea
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                rows={2}
                placeholder="أدخل سبب التعليق..."
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 8,
                  border: '1px solid #ef444433', background: 'var(--bg3)',
                  color: 'var(--t1)', fontSize: 13, resize: 'vertical',
                  boxSizing: 'border-box' as const,
                  fontFamily: 'Tajawal, sans-serif',
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <ActionBtn
                  icon="ti-ban" label="تأكيد التعليق" variant="danger"
                  disabled={!suspendReason.trim()}
                  onClick={() =>
                    muts.suspend.mutate(
                      { id: co.id, reason: suspendReason },
                      {
                        onSuccess: () => { flash$(true, 'تم التعليق'); close(true); },
                        onError:   (e: any) => flash$(false, e?.message ?? 'فشل التعليق'),
                      }
                    )
                  }
                  loading={muts.suspend.isPending}
                />
                <ActionBtn icon="ti-x" label="إلغاء" onClick={() => setShowSuspend(false)} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MEMBERS ═══════════════════════════════════════════════════════════ */}
      {tab === 'members' && (
        <div style={{ padding: '16px 20px' }}>
          <SectionTitle>أعضاء الشركة ({members.length})</SectionTitle>

          {mLoading ? (
            <Spinner />
          ) : members.length === 0 ? (
            <EmptyState icon="ti-users" text="لا يوجد أعضاء" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {members.map(u => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 10, background: 'var(--bg3)',
                  }}
                >
                  <Avatar id={u.id} name={u.name} size={30} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{u.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t4)' }}>{u.email}</div>
                  </div>
                  <StatusBadge active={u.active} />
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      title="تجميد/تفعيل"
                      onClick={async () => {
                        await companiesApi.toggleUser(co.id, u.id);
                        refetchMembers();
                      }}
                      style={iBtn}
                    >
                      <i className="ti ti-user-pause" />
                    </button>
                    <button
                      title="إزالة"
                      onClick={async () => {
                        if (!confirm(`إزالة ${u.name}؟`)) return;
                        await companiesApi.removeUser(co.id, u.id);
                        refetchMembers();
                        flash$(true, 'تم الإزالة');
                      }}
                      style={{ ...iBtn, color: '#ef4444', borderColor: '#ef444433' }}
                    >
                      <i className="ti ti-user-minus" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ PLAN ══════════════════════════════════════════════════════════════ */}
      {tab === 'plan' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <SectionTitle>تغيير الخطة</SectionTitle>

          <div>
            <label style={lbl}>الخطة</label>
            <select
              value={planForm.plan}
              onChange={e => setPlanForm(f => ({ ...f, plan: e.target.value }))}
              style={sel}
            >
              {Object.entries(PLANS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {([
            { key: 'max_users',      label: 'حد المستخدمين (0 = غير محدود)' },
            { key: 'max_products',   label: 'حد المنتجات (0 = غير محدود)' },
            { key: 'max_warehouses', label: 'حد المستودعات (0 = غير محدود)' },
          ] as { key: keyof typeof planForm; label: string }[]).map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input
                type="number" min={0}
                value={planForm[f.key]}
                onChange={e => setPlanForm(p => ({ ...p, [f.key]: parseInt(e.target.value) || 0 }))}
                style={inp}
              />
            </div>
          ))}

          {/* ✅ changePlan — { id, plan, max_users, ... } بدل { slug, ... } */}
          <ActionBtn
            icon="ti-crown" label="تطبيق الخطة"
            onClick={() =>
              muts.changePlan.mutate(
                { id: co.id, ...planForm },
                {
                  onSuccess: () => { flash$(true, 'تم تغيير الخطة'); close(true); },
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل تغيير الخطة'),
                }
              )
            }
            loading={muts.changePlan.isPending}
          />
        </div>
      )}

      {/* ══ NOTES ═════════════════════════════════════════════════════════════ */}
      {tab === 'notes' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SectionTitle>ملاحظات داخلية</SectionTitle>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={8}
            placeholder="ملاحظات خاصة بالشركة..."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1px solid var(--b2)', background: 'var(--bg3)',
              color: 'var(--t1)', fontSize: 13, resize: 'vertical',
              boxSizing: 'border-box' as const,
              fontFamily: 'Tajawal, sans-serif',
            }}
          />
          <ActionBtn
            icon="ti-device-floppy" label="حفظ الملاحظات"
            onClick={() =>
              muts.updateNotes.mutate(
                { id: co.id, notes },
                {
                  onSuccess: () => flash$(true, 'تم الحفظ'),
                  onError:   (e: any) => flash$(false, e?.message ?? 'فشل الحفظ'),
                }
              )
            }
            loading={muts.updateNotes.isPending}
          />
        </div>
      )}

      {/* ══ DANGER ════════════════════════════════════════════════════════════ */}
      {tab === 'danger' && (
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '10px 14px', borderRadius: 10,
            background: '#ef44441a', border: '1px solid #ef444433',
            fontSize: 12, color: '#ef4444',
          }}>
            هذه الإجراءات لا يمكن التراجع عنها.
          </div>

          {/* ✅ seed أُضيفت في useCompanyMutations */}
          <ActionBtn
            icon="ti-database" label="بذر البيانات الأساسية"
            onClick={() =>
              muts.seed.mutate(co.id, {
                onSuccess: () => flash$(true, 'تم البذر بنجاح'),
                onError:   (e: any) => flash$(false, e?.message ?? 'فشل البذر'),
              })
            }
            loading={muts.seed.isPending}
          />

          <ActionBtn
            icon="ti-trash" label="حذف الشركة نهائياً" variant="danger"
            onClick={() => {
              if (!confirm(`حذف شركة "${co.name}" نهائياً؟`)) return;
              muts.remove.mutate(co.id, {
                onSuccess: () => close(true),
                onError:   (e: any) => flash$(false, e?.message ?? 'فشل الحذف'),
              });
            }}
            loading={muts.remove.isPending}
          />
        </div>
      )}
    </DrawerShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const iBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 7,
  border: '1px solid var(--b2)', background: 'none',
  cursor: 'pointer', color: 'var(--t3)', fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700,
  color: 'var(--t4)', marginBottom: 6,
};
const sel: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, fontFamily: 'Tajawal, sans-serif',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--b2)', background: 'var(--bg3)',
  color: 'var(--t1)', fontSize: 13, boxSizing: 'border-box' as const,
};
```

## FILE: resources/js/components/admin/UserDrawer/InfoTab.tsx
```
// components/admin/UserDrawer/InfoTab.tsx
import { InfoRow, ActionBtn, fmtDate } from '../shared';
import type { AdminUser } from '@/types/admin';

interface Props {
  user:     AdminUser;
  onToggle: () => void;
  onImpersonate: () => void;
  loading?: boolean;
}

export function InfoTab({ user: u, onToggle, onImpersonate, loading }: Props) {
  return (
    <div style={{ padding: '16px 20px' }}>
      <InfoRow label="الاسم"        value={u.name} />
      <InfoRow label="البريد"       value={u.email} />
      <InfoRow label="الهاتف"       value={u.phone ?? '—'} />
      <InfoRow label="الدور"        value={u.role ?? '—'} />
      <InfoRow label="الشركات"      value={u.companies_count ?? 0} />
      <InfoRow label="آخر دخول"     value={fmtDate(u.last_login_at)} />
      <InfoRow label="تاريخ الإنشاء" value={fmtDate(u.created_at)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <ActionBtn icon="ti-login"      label="دخول كهذا المستخدم"       onClick={onImpersonate} loading={loading} />
        <ActionBtn
          icon={u.active ? 'ti-user-off' : 'ti-user-check'}
          label={u.active ? 'تعطيل' : 'تفعيل'}
          variant={u.active ? 'danger' : 'success'}
          onClick={onToggle}
          loading={loading}
        />
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/charts/BarChart.tsx
```
```

## FILE: resources/js/components/charts/DonutChart.tsx
```
```

## FILE: resources/js/components/charts/LineChart.tsx
```
import React, { useMemo } from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fill?: boolean;
  showDots?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  formatValue?: (v: number) => string;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({
  data,
  height = 200,
  color = 'var(--color-text-info, #3b82f6)',
  fill = true,
  showDots = true,
  showGrid = true,
  formatValue = (v) => v.toLocaleString('ar-DZ'),
  className = '',
}) => {
  const [hovered, setHovered] = React.useState<number | null>(null);

  const { points, pathD, fillD, minVal, maxVal } = useMemo(() => {
    if (!data.length) return { points: [], pathD: '', fillD: '', minVal: 0, maxVal: 0 };

    const W = 600;
    const H = height - 40; // padding for labels
    const padL = 48, padR = 16, padT = 16, padB = 24;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => ({
      x: padL + (i / (data.length - 1 || 1)) * chartW,
      y: padT + chartH - ((d.value - minVal) / range) * chartH,
      ...d,
    }));

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const fillD = `${pathD} L ${points[points.length - 1].x} ${padT + chartH} L ${padL} ${padT + chartH} Z`;

    return { points, pathD, fillD, minVal, maxVal };
  }, [data, height]);

  const W = 600;
  const H = height;

  if (!data.length) {
    return <div className={`lc-empty ${className}`}>لا توجد بيانات</div>;
  }

  return (
    <div className={`lc-wrapper ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={height}
        role="img"
        aria-label="مخطط خطي"
      >
        <defs>
          <linearGradient id="lc-fill-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1].map((f, i) => {
          const y = 16 + (1 - f) * (H - 40);
          const val = minVal + f * (maxVal - minVal);
          return (
            <g key={i}>
              <line
                x1={48} y1={y} x2={W - 16} y2={y}
                stroke="var(--color-border-tertiary)"
                strokeWidth="0.8"
                strokeDasharray="4 3"
              />
              <text
                x={44} y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--color-text-tertiary)"
                fontFamily="inherit"
              >
                {formatValue(val)}
              </text>
            </g>
          );
        })}

        {/* Fill area */}
        {fill && <path d={fillD} fill="url(#lc-fill-grad)" />}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y} r="4"
              fill="var(--color-background-primary)"
              stroke={color}
              strokeWidth="2"
              style={{ transition: 'r 0.1s' }}
              r={hovered === i ? 6 : 4}
            />
            {/* Invisible larger hit area */}
            <circle
              cx={p.x} cy={p.y} r="12"
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => (
          // Show fewer labels on crowded charts
          (data.length <= 8 || i % Math.ceil(data.length / 8) === 0) && (
            <text
              key={i}
              x={p.x} y={H - 4}
              textAnchor="middle"
              fontSize="11"
              fill={hovered === i ? "var(--color-text-primary)" : "var(--color-text-tertiary)"}
              fontFamily="inherit"
            >
              {p.label}
            </text>
          )
        ))}

        {/* Tooltip */}
        {hovered !== null && points[hovered] && (() => {
          const p = points[hovered];
          const tooltipW = 90;
          const tooltipX = Math.min(Math.max(p.x - tooltipW / 2, 48), W - tooltipW - 16);
          const tooltipY = p.y - 48;
          return (
            <g>
              {/* Vertical guide */}
              <line
                x1={p.x} y1={16} x2={p.x} y2={H - 24}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              {/* Tooltip box */}
              <rect
                x={tooltipX} y={tooltipY}
                width={tooltipW} height={34}
                rx="6"
                fill="var(--color-text-primary)"
                opacity="0.9"
              />
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 13} textAnchor="middle" fontSize="11" fill="var(--color-background-primary)" fontFamily="inherit">{p.label}</text>
              <text x={tooltipX + tooltipW / 2} y={tooltipY + 27} textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--color-background-primary)" fontFamily="inherit">{formatValue(p.value)}</text>
            </g>
          );
        })()}
      </svg>

      <style>{`
        .lc-wrapper { width: 100%; overflow: hidden; }
        .lc-empty { padding: 40px; text-align: center; color: var(--color-text-tertiary); font-size: 14px; }
      `}</style>
    </div>
  );
};

export default LineChart;
```

## FILE: resources/js/components/charts/SparkLine.tsx
```
```

## FILE: resources/js/components/common/FiscalYearSelector.tsx
```
// ════════════════════════════════════════════════
// resources/js/components/common/FiscalYearSelector.tsx
// ════════════════════════════════════════════════
import { useState, useRef, useEffect } from 'react';
import { useFiscalYear } from '@/context/FiscalYearContext';
import type { FiscalYear } from '@/context/FiscalYearContext';

export default function FiscalYearSelector() {
    const { years, selected, loading, isReadOnly, selectYear } = useFiscalYear();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // إغلاق عند النقر خارجاً
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (loading) return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 'var(--r2)',
            border: '1px solid var(--b2)', background: 'var(--bg3)',
            fontSize: 12, color: 'var(--t4)',
        }}>
            <i className="ti ti-loader-2" style={{ animation: 'spin .8s linear infinite' }} />
            تحميل...
        </div>
    );

    if (!selected) return null;

    // دالة مساعدة لتنسيق التاريخ
    const toDateInputValue = (date: any): string => {
        if (!date) return '';
        const match = String(date).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            {/* الزر الرئيسي */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '5px 12px', borderRadius: 'var(--r2)',
                    border: `1px solid ${isReadOnly ? 'var(--redbo)' : 'var(--b3)'}`,
                    background: isReadOnly
                        ? 'var(--redb)'
                        : 'var(--bg3)',
                    cursor: 'pointer', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
                    color: 'var(--t1)', transition: 'all .15s',
                }}
            >
                {/* أيقونة الحالة */}
                <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: selected.is_current
                        ? 'var(--emb)'
                        : isReadOnly
                            ? 'var(--redb)'
                            : 'var(--blueb)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <i className={`ti ${isReadOnly ? 'ti-lock' : selected.is_current ? 'ti-calendar-check' : 'ti-calendar'}`}
                        style={{
                            fontSize: 10,
                            color: selected.is_current ? 'var(--em)' : isReadOnly ? 'var(--red)' : 'var(--blue)',
                        }}
                    />
                </span>

                <span style={{ fontWeight: 700 }}>س.م {selected.name}</span>

                {/* badge الحالة */}
                {isReadOnly && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, background: 'var(--red)', color: '#fff',
                    }}>
                        للقراءة فقط
                    </span>
                )}
                {selected.is_current && !isReadOnly && (
                    <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 6px',
                        borderRadius: 10, background: 'var(--em)', color: '#fff',
                    }}>
                        جارية
                    </span>
                )}

                <i className={`ti ti-chevron-${open ? 'up' : 'down'}`}
                    style={{ fontSize: 11, color: 'var(--t4)', marginRight: 2 }} />
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)',
                    left: 0, minWidth: 280, zIndex: 9999,
                    background: 'var(--bg2)', border: '1px solid var(--b2)',
                    borderRadius: 'var(--r3)', boxShadow: 'var(--shadow2)',
                    overflow: 'hidden',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '10px 14px', borderBottom: '1px solid var(--b1)',
                        fontSize: 11, fontWeight: 700, color: 'var(--t4)',
                        display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                        <i className="ti ti-calendar-stats" />
                        اختيار السنة المالية
                    </div>

                    {/* القائمة */}
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {years.map(year => (
                            <button
                                key={year.id}
                                onClick={() => { selectYear(year); setOpen(false); }}
                                style={{
                                    width: '100%', textAlign: 'right', padding: '10px 14px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    gap: 8, cursor: 'pointer', border: 'none', fontFamily: 'Tajawal, sans-serif',
                                    background: selected.id === year.id
                                        ? 'var(--emb)'
                                        : 'transparent',
                                    borderRight: selected.id === year.id
                                        ? '3px solid var(--em)' : '3px solid transparent',
                                    transition: 'background .1s',
                                    fontSize: 13,
                                }}
                                onMouseEnter={e => {
                                    if (selected.id !== year.id)
                                        (e.currentTarget as HTMLElement).style.background = 'var(--bg3)';
                                }}
                                onMouseLeave={e => {
                                    if (selected.id !== year.id)
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {selected.id === year.id && (
                                            <i className="ti ti-check" style={{ fontSize: 12, color: 'var(--em)' }} />
                                        )}
                                        سنة {year.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                                        {toDateInputValue(year.start_date)} — {toDateInputValue(year.end_date)}
                                    </div>
                                </div>

                                {/* Badges */}
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    {year.is_current && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--emb)', color: 'var(--em)',
                                        }}>جارية</span>
                                    )}
                                    {year.is_closed && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--redb)', color: 'var(--red)',
                                            display: 'flex', alignItems: 'center', gap: 3,
                                        }}>
                                            <i className="ti ti-lock" style={{ fontSize: 9 }} /> مقفلة
                                        </span>
                                    )}
                                    {!year.is_closed && !year.is_current && (
                                        <span style={{
                                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                                            borderRadius: 10,
                                            background: 'var(--blueb)', color: 'var(--blue)',
                                        }}>مفتوحة</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '8px 14px', borderTop: '1px solid var(--b1)',
                        fontSize: 11, color: 'var(--t4)',
                    }}>
                        <i className="ti ti-info-circle" style={{ marginLeft: 4 }} />
                        السنة المقفلة: للعرض فقط — لا يمكن التعديل
                    </div>
                </div>
            )}
        </div>
    );
}
```

## FILE: resources/js/components/common/ReadOnlyBanner.tsx
```
// ════════════════════════════════════════════════
// resources/js/components/common/ReadOnlyBanner.tsx
// ════════════════════════════════════════════════
import { useFiscalYear } from '@/context/FiscalYearContext';

export default function ReadOnlyBanner() {
    const { selected, isReadOnly } = useFiscalYear();
    if (!isReadOnly || !selected) return null;

    const toDateString = (d?: string | null) => {
        if (!d) return '—';
        const match = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return '—';
        return new Date(+match[1], +match[2] - 1, +match[3]).toLocaleDateString('ar-DZ', {
            year: 'numeric', month: 'long', day: 'numeric',
        });
    };

    return (
        <div style={{
            background: 'var(--redb)',
            border: '1px solid var(--redbo)',
            borderRadius: 'var(--r3)',
            padding: '12px 18px',
            marginBottom: 18,
            display: 'flex', alignItems: 'center', gap: 12,
        }}>
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--red)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <i className="ti ti-lock" style={{ fontSize: 18 }} />
            </div>
            <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--red)' }}>
                    سنة مالية مقفلة — وضع القراءة فقط
                </div>
                <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 3 }}>
                    السنة المالية <strong>{selected.name}</strong> مقفلة بتاريخ{' '}
                    {toDateString(selected.closed_at)}.
                    لا يمكن إضافة أو تعديل أو حذف أي بيانات.
                    {selected.closing_notes && (
                        <span style={{ color: 'var(--t3)', display: 'block', marginTop: 2 }}>
                            📝 {selected.closing_notes}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
```

## FILE: resources/js/components/forms/FormGrid.tsx
```
```

## FILE: resources/js/components/forms/FormInputs.tsx
```
import React, { useId } from 'react';

// ─── TextArea ───────────────────────────────────────────────────────────────

interface TextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  autoResize?: boolean;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  value = '',
  onChange,
  label,
  error,
  hint,
  maxLength,
  autoResize = false,
  required,
  disabled,
  rows = 4,
  placeholder,
  className = '',
  ...rest
}) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (autoResize) {
      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    }
    onChange(e.target.value);
  };

  return (
    <div className={`ta-wrapper ${className}`}>
      {label && (
        <label className="ta-label" htmlFor={id}>
          {label}{required && <span className="ta-required">*</span>}
        </label>
      )}
      <textarea
        id={id}
        className={`ta-field ${error ? 'has-error' : ''}`}
        value={value}
        onChange={handleChange}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
        {...rest}
      />
      <div className="ta-footer">
        {(hint || error) && (
          <span className={error ? 'ta-error' : 'ta-hint'}>{error ?? hint}</span>
        )}
        {maxLength && (
          <span className="ta-counter">{value.length} / {maxLength}</span>
        )}
      </div>

      <style>{`
        .ta-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ta-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .ta-required { color: var(--color-text-danger, #ef4444); margin-inline-start: 2px; }
        .ta-field {
          width: 100%; padding: 8px 12px; resize: vertical;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; font-size: 14px; font-family: inherit;
          color: var(--color-text-primary); line-height: 1.5; outline: none;
          transition: border-color .15s, box-shadow .15s;
          box-sizing: border-box;
        }
        .ta-field:focus { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info,#3b82f6) 15%, transparent); }
        .ta-field.has-error { border-color: var(--color-text-danger, #ef4444); }
        .ta-field:disabled { opacity: .5; cursor: not-allowed; resize: none; }
        .ta-footer { display: flex; justify-content: space-between; align-items: center; }
        .ta-hint { font-size: 12px; color: var(--color-text-tertiary); }
        .ta-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .ta-counter { font-size: 12px; color: var(--color-text-tertiary); margin-inline-start: auto; }
      `}</style>
    </div>
  );
};


// ─── FormField ──────────────────────────────────────────────────────────────

interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
  className = '',
}) => {
  const id = useId();
  const fieldId = htmlFor ?? id;

  return (
    <div className={`ff-wrapper ${className}`}>
      {label && (
        <label className="ff-label" htmlFor={fieldId}>
          {label}
          {required && <span className="ff-required">*</span>}
        </label>
      )}
      <div className="ff-control">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<{ id?: string; 'aria-invalid'?: boolean }>, {
              id: fieldId,
              'aria-invalid': !!error,
            })
          : children}
      </div>
      {hint && !error && <p className="ff-hint">{hint}</p>}
      {error && <p className="ff-error" role="alert">{error}</p>}

      <style>{`
        .ff-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ff-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); display: inline-flex; align-items: center; gap: 2px; }
        .ff-required { color: var(--color-text-danger, #ef4444); }
        .ff-control { display: flex; flex-direction: column; }
        .ff-hint  { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .ff-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};


// ─── NumberInput ─────────────────────────────────────────────────────────────

interface NumberInputProps {
  value?: number | string;
  onChange: (value: number | '') => void;
  label?: string;
  error?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const NumberInput: React.FC<NumberInputProps> = ({
  value = '',
  onChange,
  label,
  error,
  hint,
  min,
  max,
  step = 1,
  precision,
  prefix,
  suffix,
  placeholder = '0',
  disabled = false,
  required,
  className = '',
}) => {
  const id = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || raw === '-') { onChange(''); return; }
    const parsed = precision !== undefined ? parseFloat(parseFloat(raw).toFixed(precision)) : parseFloat(raw);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const increment = () => {
    const current = typeof value === 'number' ? value : 0;
    const next = current + step;
    if (max === undefined || next <= max) onChange(next);
  };
  const decrement = () => {
    const current = typeof value === 'number' ? value : 0;
    const next = current - step;
    if (min === undefined || next >= min) onChange(next);
  };

  return (
    <div className={`ni-wrapper ${className}`}>
      {label && (
        <label className="ni-label" htmlFor={id}>
          {label}{required && <span className="ni-required">*</span>}
        </label>
      )}
      <div className={`ni-control ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}>
        {prefix && <span className="ni-affix ni-prefix">{prefix}</span>}
        <button type="button" className="ni-step" onClick={decrement} disabled={disabled || (min !== undefined && (typeof value === 'number' ? value : 0) <= min)} aria-label="تقليل">−</button>
        <input
          id={id}
          type="number"
          className="ni-field"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
        <button type="button" className="ni-step" onClick={increment} disabled={disabled || (max !== undefined && (typeof value === 'number' ? value : 0) >= max)} aria-label="زيادة">+</button>
        {suffix && <span className="ni-affix ni-suffix">{suffix}</span>}
      </div>
      {hint && !error && <p className="ni-hint">{hint}</p>}
      {error && <p className="ni-error">{error}</p>}

      <style>{`
        .ni-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .ni-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .ni-required { color: var(--color-text-danger, #ef4444); margin-inline-start: 2px; }
        .ni-control {
          display: flex; align-items: center;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; overflow: hidden;
          transition: border-color .15s, box-shadow .15s;
        }
        .ni-control:focus-within:not(.disabled) { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info,#3b82f6) 15%, transparent); }
        .ni-control.has-error { border-color: var(--color-text-danger, #ef4444); }
        .ni-control.disabled { opacity: .5; }
        .ni-step {
          flex-shrink: 0; width: 34px; height: 36px; border: none;
          background: var(--color-background-secondary); color: var(--color-text-secondary);
          font-size: 16px; cursor: pointer; line-height: 1;
          transition: background .1s, color .1s;
          display: flex; align-items: center; justify-content: center;
        }
        .ni-step:hover:not(:disabled) { background: var(--color-border-tertiary); color: var(--color-text-primary); }
        .ni-step:disabled { opacity: .4; cursor: not-allowed; }
        .ni-step:first-of-type { border-inline-end: 1px solid var(--color-border-tertiary); }
        .ni-step:last-of-type  { border-inline-start: 1px solid var(--color-border-tertiary); }
        .ni-field {
          flex: 1; padding: 8px 6px; border: none; outline: none;
          background: transparent; font-size: 14px; text-align: center;
          color: var(--color-text-primary); font-family: inherit;
          -moz-appearance: textfield;
        }
        .ni-field::-webkit-outer-spin-button,
        .ni-field::-webkit-inner-spin-button { -webkit-appearance: none; }
        .ni-affix { padding: 0 10px; font-size: 13px; color: var(--color-text-secondary); background: var(--color-background-secondary); align-self: stretch; display: flex; align-items: center; }
        .ni-prefix { border-inline-end: 1px solid var(--color-border-tertiary); }
        .ni-suffix { border-inline-start: 1px solid var(--color-border-tertiary); }
        .ni-hint  { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .ni-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};
```

## FILE: resources/js/components/forms/InputWithSuffix.tsx
```
```

## FILE: resources/js/components/forms/SelectInput.tsx
```
import React, { useId } from 'react';

interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

interface SelectInputProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  className?: string;
}

const SelectInput: React.FC<SelectInputProps> = ({
  options,
  value,
  onChange,
  label,
  placeholder,
  error,
  hint,
  disabled,
  required,
  className = '',
  ...rest
}) => {
  const id = useId();

  return (
    <div className={`select-wrapper ${className}`}>
      {label && (
        <label className="select-label" htmlFor={id}>
          {label}
          {required && <span className="select-required">*</span>}
        </label>
      )}
      <div className="select-control">
        <select
          id={id}
          className={`select-field ${error ? 'has-error' : ''}`}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className="select-chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {hint && !error && <p className="select-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="select-error" role="alert">{error}</p>}

      <style>{`
        .select-wrapper { display: flex; flex-direction: column; gap: 4px; }
        .select-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); display: flex; align-items: center; gap: 2px; }
        .select-required { color: var(--color-text-danger, #ef4444); }
        .select-control { position: relative; }
        .select-field {
          width: 100%; padding: 8px 36px 8px 12px; appearance: none;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color .15s, box-shadow .15s;
          outline: none;
        }
        .select-field:focus { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .select-field.has-error { border-color: var(--color-text-danger, #ef4444); }
        .select-field:disabled { opacity: .5; cursor: not-allowed; }
        .select-chevron {
          position: absolute; inset-inline-end: 10px; top: 50%; transform: translateY(-50%);
          display: flex; pointer-events: none; color: var(--color-text-secondary);
        }
        .select-hint { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .select-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};

export default SelectInput;
```

## FILE: resources/js/components/forms/TabsGroup.tsx
```
```

## FILE: resources/js/components/index.ts
```
// ── UI Components (New) ──────────────────────────────────────────────────────
export { default as Tooltip }      from './ui/Tooltip';
export { default as Dropdown }     from './ui/Dropdown';
export { default as Drawer }       from './ui/Drawer';
export { default as Skeleton }     from './ui/Skeleton';
export { default as Breadcrumb }   from './ui/Breadcrumb';
export { default as Stepper }      from './ui/Stepper';
export { default as DatePicker }   from './ui/DatePicker';
export { default as FileUploader } from './ui/FileUploader';

// ── UI Components (Upgraded) ─────────────────────────────────────────────────
export { default as Pagination }   from './ui/Pagination';
export { default as Table }        from './ui/Table';
export { default as PageHeader }   from './ui/PageHeader';

// ── Form Components (New) ────────────────────────────────────────────────────
export { default as SelectInput }  from './forms/SelectInput';
export { TextArea, FormField, NumberInput } from './forms/FormInputs';

// ── Charts (New) ─────────────────────────────────────────────────────────────
export { default as LineChart }    from './charts/LineChart';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { DropdownOption }     from './ui/Dropdown';
export type { BreadcrumbItem }     from './ui/Breadcrumb';
export type { StepperStep }        from './ui/Stepper';
export type { TableColumn }        from './ui/Table';
```

## FILE: resources/js/components/layouts/AdminLayout.tsx
```
// ════════════════════════════════════════════════
// components/layouts/AdminLayout.tsx
// Layout مستقل للسوبر أدمن — sidebar + topbar متطور
// ════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdminDashboard } from '@/hooks/useAdmin';
import { useTheme } from '@/hooks/useTheme';

const NAV = [
  {
    section: 'الرئيسية',
    color: 'var(--red)',
    items: [
      { to: '/admin',          icon: 'ti-layout-dashboard', label: 'لوحة التحكم',  end: true  },
    ],
  },
  {
    section: 'إدارة المحتوى',
    color: 'var(--blue)',
    items: [
      { to: '/admin/companies', icon: 'ti-building-store',   label: 'الشركات',      badge: 'companies' },
      { to: '/admin/users',     icon: 'ti-users',            label: 'المستخدمون',   badge: 'users'     },
    ],
  },
  {
    section: 'الاشتراكات والخطط',
    color: 'var(--gold)',
    items: [
      { to: '/admin/plans',     icon: 'ti-credit-card',      label: 'الخطط'        },
      { to: '/admin/activity',  icon: 'ti-activity',         label: 'سجل النشاط'   },
    ],
  },
  {
    section: 'النظام والإعدادات',
    color: 'var(--purple)',
    items: [
      { to: '/admin/settings',  icon: 'ti-settings',         label: 'الإعدادات'    },
      { to: '/admin/reports',   icon: 'ti-chart-bar',        label: 'التقارير'     },
    ],
  },
];

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/admin':           { title: 'لوحة تحكم النظام',  sub: 'نظرة شاملة على كامل المنصة' },
  '/admin/companies': { title: 'إدارة الشركات',      sub: 'كل الشركات المسجلة في المنصة' },
  '/admin/users':     { title: 'إدارة المستخدمين',   sub: 'كل المستخدمين عبر الشركات'  },
  '/admin/plans':     { title: 'الخطط والاشتراكات',  sub: 'إدارة خطط وحدود المنصة'     },
  '/admin/activity':  { title: 'سجل النشاط',         sub: 'تتبع كل الأحداث والعمليات' },
  '/admin/settings':  { title: 'إعدادات النظام',     sub: 'إعدادات البنية التحتية'     },
  '/admin/reports':   { title: 'تقارير النظام',      sub: 'إحصائيات الاستخدام والنمو'  },
};

export default function AdminLayout() {
  const { user, logout }   = useAuth();
  const navigate            = useNavigate();
  const location            = useLocation();
  const { data: stats }     = useAdminDashboard();
  const { dark, toggle: toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const meta = PAGE_META[location.pathname] ?? { title: 'Super Admin', sub: '' };

  const badges: Record<string, number | undefined> = {
    companies: stats?.companies.total,
    users:     stats?.users.total,
  };

  return (
    <div
      style={{
        display: 'flex', minHeight: '100vh',
        background: 'var(--bg0)', direction: 'rtl',
        fontFamily: "'Tajawal', sans-serif",
      }}
    >
      {/* SIDEBAR */}
      <aside
        style={{
          width: collapsed ? 58 : 230,
          transition: 'width .22s cubic-bezier(.4,0,.2,1)',
          background: 'var(--bg2)',
          borderLeft: '1px solid var(--b2)',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0, overflow: 'hidden',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div style={{
          padding: '14px 12px 12px',
          borderBottom: '1px solid var(--b2)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg,#dc2626,#ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(220,38,38,.35)',
          }}>
            <i className="ti ti-shield-lock" />
          </div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', whiteSpace: 'nowrap' }}>
                لوحة الإدارة
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', whiteSpace: 'nowrap' }}>
                Super Admin Panel
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div style={{
            margin: '10px 10px 2px',
            padding: '10px 12px',
            background: 'rgba(220,38,38,.06)',
            border: '1px solid rgba(220,38,38,.15)',
            borderRadius: 10,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
            flexShrink: 0,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.companies.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>شركة</div>
            </div>
            <div style={{ textAlign: 'center', borderRight: '1px solid rgba(220,38,38,.15)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>
                {stats?.users.total ?? '—'}
              </div>
              <div style={{ fontSize: 9.5, color: 'var(--t4)', marginTop: 2 }}>مستخدم</div>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: '8px 6px', overflowY: 'auto', overflowX: 'hidden' }}>
          {NAV.map(group => (
            <div key={group.section} style={{ marginBottom: 4 }}>
              {!collapsed && (
                <div style={{
                  fontSize: 9, fontWeight: 800, letterSpacing: '1px',
                  color: group.color, padding: '8px 10px 4px',
                  textTransform: 'uppercase',
                }}>
                  {group.section}
                </div>
              )}
              {group.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={(item as any).end}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center',
                    gap: 10, padding: '8px 10px', borderRadius: 8,
                    color: isActive ? '#dc2626' : 'var(--t3)',
                    background: isActive ? 'rgba(220,38,38,.08)' : 'transparent',
                    borderRight: isActive ? '2px solid #dc2626' : '2px solid transparent',
                    fontSize: 13, fontWeight: isActive ? 700 : 500,
                    textDecoration: 'none', marginBottom: 1,
                    transition: 'all .15s',
                    overflow: 'hidden', whiteSpace: 'nowrap',
                  })}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 16, flexShrink: 0 }} />
                  {!collapsed && (
                    <>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.label}
                      </span>
                      {(item as any).badge && badges[(item as any).badge] !== undefined && (
                        <span style={{
                          fontSize: 9.5, fontWeight: 800, padding: '2px 7px',
                          borderRadius: 20, background: '#dc2626', color: '#fff',
                          flexShrink: 0,
                        }}>
                          {badges[(item as any).badge]}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '10px 6px', borderTop: '1px solid var(--b2)', flexShrink: 0 }}>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px', borderRadius: 8, border: 'none',
              background: 'transparent', color: 'var(--t4)', fontSize: 12,
              cursor: 'pointer', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden',
            }}
          >
            <i className={`ti ${collapsed ? 'ti-layout-sidebar-right-expand' : 'ti-layout-sidebar-right-collapse'}`} style={{ fontSize: 16, flexShrink: 0 }} />
            {!collapsed && 'طي الشريط الجانبي'}
          </button>

          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '9px 10px', borderRadius: 10,
              background: 'var(--bg3)', border: '1px solid var(--b2)',
              cursor: 'pointer', marginTop: 6,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg,#dc2626,#b45309)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              }}>
                {user?.name?.[0] ?? 'A'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--t4)' }}>Super Admin</div>
              </div>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: '#10b981', flexShrink: 0,
                boxShadow: '0 0 5px rgba(16,185,129,.5)',
              }} />
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <header style={{
          height: 54, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(255,255,255,.92)',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--b2)',
          flexShrink: 0,
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 6px rgba(0,0,0,.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 6,
              background: 'rgba(220,38,38,.1)', color: '#dc2626', letterSpacing: '.5px',
            }}>
              SUPER ADMIN
            </span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {meta.title}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--t4)' }}>{meta.sub}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15 }}>
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} />
            </button>

            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(v => !v)} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', color: 'var(--t3)', fontSize: 15, position: 'relative' }}>
                <i className="ti ti-bell" />
                {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg2)' }}>{stats.companies.suspended}</span>
                )}
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', top: 42, left: 0, width: 280, background: 'var(--bg2)', border: '1px solid var(--b2)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--b2)', fontSize: 12, fontWeight: 700, color: 'var(--t1)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>الإشعارات</span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 400 }}>وضع علامة مقروء</span>
                  </div>
                  {stats?.companies.suspended !== undefined && stats.companies.suspended > 0 && (
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--b2)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(220,38,38,.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}><i className="ti ti-ban" /></div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{stats.companies.suspended} شركة موقوفة</div>
                        <div style={{ fontSize: 10.5, color: 'var(--t4)', marginTop: 2 }}>بحاجة للمراجعة والمتابعة</div>
                      </div>
                    </div>
                  )}
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}><span style={{ fontSize: 11, color: 'var(--t4)' }}>لا توجد إشعارات إضافية</span></div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{user?.name}</span>
              <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(220,38,38,.3)', background: 'transparent', cursor: 'pointer', color: '#dc2626', fontSize: 12, fontWeight: 700, fontFamily: 'Tajawal, sans-serif' }}>
                <i className="ti ti-logout" /> خروج
              </button>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/layouts/DashboardLayout.tsx
```
// resources/js/components/layouts/DashboardLayout.tsx
// ════════════════════════════════════════════════
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useFiscalYear, FiscalYearSelector } from '@/context/FiscalYearContext';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import client from '@/lib/api/core/client';
// ─── ناف القائمة ─────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [
      { name: 'لوحة التحكم', href: 'dashboard', icon: 'ti-layout-dashboard' },
      { name: 'نقطة البيع',  href: 'pos',        icon: 'ti-shopping-cart'   },
    ],
  },
  {
    label: 'المبيعات',
    items: [
      { name: 'فاتورة شكلية',          href: 'documents/DEV', icon: 'ti-file-check'             },
      { name: 'طلبيات العملاء',        href: 'documents/BCC', icon: 'ti-clipboard-list'         },
      { name: 'وصل التسليم BL',        href: 'documents/BL',  icon: 'ti-truck'                  },
      { name: 'فواتير البيع',          href: 'documents/FV',  icon: 'ti-file-invoice', badge: 3 },
      { name: 'مرتجعات البيع',         href: 'documents/AV',  icon: 'ti-corner-up-left'         },
    ],
  },
  {
    label: 'المشتريات',
    items: [
      { name: 'طلبات فاتورة شكلية',    href: 'documents/DDP', icon: 'ti-file-search'           },
      { name: 'أوامر الشراء للموردين', href: 'documents/BCF', icon: 'ti-clipboard-check'       },
      { name: 'وصل الاستلام',          href: 'documents/BR',  icon: 'ti-package-import'        },
      { name: 'فواتير الشراء',         href: 'documents/FA',  icon: 'ti-file-invoice'          },
      { name: 'مرتجعات الشراء',        href: 'documents/AA',  icon: 'ti-corner-up-left-double' },
    ],
  },
  {
    label: 'المخزون',
    items: [
      { name: 'المنتجات',       href: 'products',   icon: 'ti-package'                          },
      { name: 'إدارة المخزون',  href: 'inventory',  icon: 'ti-building-warehouse', badgeWarn: true },
      { name: 'الفئات',         href: 'categories', icon: 'ti-folder-open'                      },
      { name: 'العلامات',       href: 'brands',     icon: 'ti-award'                            },
      { name: 'الوحدات',        href: 'units',      icon: 'ti-ruler'                            },
      { name: 'الموردون',       href: 'suppliers',  icon: 'ti-truck'                            },
      { name: 'المستودعات',     href: 'warehouses', icon: 'ti-building-warehouse'               },
    ],
  },
  {
    label: 'المحاسبة والمالية',
    items: [
      { name: 'العملاء',          href: 'clients',     icon: 'ti-users'           },
      { name: 'الخزينة',          href: 'finance',     icon: 'ti-building-bank'   },
      { name: 'المصروفات',        href: 'expenses',    icon: 'ti-credit-card'     },
      { name: 'الديون',           href: 'debts',       icon: 'ti-receipt'         },
      { name: 'إقرار TVA — G50', href: 'tva',         icon: 'ti-calculator'      },
      { name: 'الملف الجبائي',    href: 'fiscal',      icon: 'ti-file-barcode'    },
      { name: 'السنوات المالية',  href: 'fiscalyears', icon: 'ti-calendar'        },
      { name: 'العملات',          href: 'currencies',  icon: 'ti-currency-dollar' },
      { name: 'مستويات الأسعار',  href: 'pricelevels', icon: 'ti-tag'             },
    ],
  },
  {
    label: 'التقارير',
    items: [
      { name: 'التقارير والإحصائيات', href: 'reports', icon: 'ti-chart-bar' },
      { name: 'الميزانية التقديرية',   href: 'balance', icon: 'ti-scale'     },
    ],
  },
  {
    label: 'النظام',
    items: [
      { name: 'الموظفون',        href: 'employees',               icon: 'ti-id-badge'     },
      { name: 'المستخدمون',      href: 'users',                   icon: 'ti-user'         },
      { name: 'الإعدادات',       href: 'settings',                icon: 'ti-settings'     },
      { name: 'أنواع المستندات', href: 'settings/document-types', icon: 'ti-file'         },
      { name: 'سلاسل الترقيم',   href: 'numbering-series',        icon: 'ti-list-numbers' },
      { name: 'طرق الدفع',       href: 'payment-methods',         icon: 'ti-credit-card'  },
      { name: 'فئات المصروفات',  href: 'expense-categories',      icon: 'ti-category'     },
    ],
  },
  {
    label: 'Super Admin',
    superAdminOnly: true,
    items: [
      { name: 'إدارة الشركات', href: 'admin/companies', icon: 'ti-building-community' },
    ],
  },
];

const LABEL_COLORS = ['var(--em)','var(--blue)','var(--purple)','var(--gold)','var(--orange)','var(--teal)'];

const PAGE_META: Record<string, { title: string; path: string }> = {
  'dashboard':               { title: 'لوحة التحكم',        path: 'الرئيسية ← إحصائيات'   },
  'pos':                     { title: 'نقطة البيع',          path: 'الرئيسية ← POS'         },
  'documents/DEV':           { title: 'فاتورة شكلية',       path: 'مبيعات ← عروض أسعار'   },
  'documents/BCC':           { title: 'طلبيات العملاء',     path: 'مبيعات ← طلبيات'       },
  'documents/BL':            { title: 'وصل التسليم',        path: 'مبيعات ← وصل تسليم'    },
  'documents/FV':            { title: 'فواتير البيع',       path: 'مبيعات ← فواتير'        },
  'documents/AV':            { title: 'مرتجعات البيع',      path: 'مبيعات ← مرتجعات'      },
  'documents/DDP':           { title: 'طلبات فاتورة شكلية', path: 'مشتريات ← طلبات عروض'  },
  'documents/BCF':           { title: 'أوامر الشراء',       path: 'مشتريات ← أوامر شراء'  },
  'documents/BR':            { title: 'وصل الاستلام',       path: 'مشتريات ← وصل استلام'  },
  'documents/FA':            { title: 'فواتير الشراء',      path: 'مشتريات ← فواتير شراء' },
  'documents/AA':            { title: 'مرتجعات الشراء',     path: 'مشتريات ← مرتجعات'     },
  'products':                { title: 'المنتجات',            path: 'مخزون ← منتجات'         },
  'inventory':               { title: 'إدارة المخزون',      path: 'مخزون ← جرد'            },
  'categories':              { title: 'الفئات',              path: 'مخزون ← فئات'           },
  'brands':                  { title: 'العلامات التجارية',  path: 'مخزون ← علامات'         },
  'units':                   { title: 'وحدات القياس',       path: 'مخزون ← وحدات'          },
  'suppliers':               { title: 'الموردون',            path: 'مخزون ← موردون'         },
  'warehouses':              { title: 'المستودعات',          path: 'مخزون ← مستودعات'       },
  'clients':                 { title: 'العملاء',             path: 'محاسبة ← عملاء'         },
  'finance':                 { title: 'الخزينة',             path: 'محاسبة ← خزينة'         },
  'expenses':                { title: 'المصروفات',           path: 'محاسبة ← مصروفات'       },
  'debts':                   { title: 'الديون',              path: 'محاسبة ← ديون'          },
  'tva':                     { title: 'إقرار TVA — G50',     path: 'محاسبة ← TVA'           },
  'fiscal':                  { title: 'الملف الجبائي',      path: 'محاسبة ← جبايات'        },
  'fiscalyears':             { title: 'السنوات المالية',     path: 'محاسبة ← سنوات مالية'  },
  'currencies':              { title: 'العملات',             path: 'محاسبة ← عملات'         },
  'pricelevels':             { title: 'مستويات الأسعار',    path: 'محاسبة ← مستويات أسعار' },
  'employees':               { title: 'الموظفون',            path: 'موارد بشرية ← موظفون'   },
  'reports':                 { title: 'التقارير',            path: 'تقارير'                  },
  'balance':                 { title: 'الميزانية التقديرية', path: 'تقارير ← ميزانية'       },
  'users':                   { title: 'المستخدمون',          path: 'نظام ← مستخدمون'        },
  'settings':                { title: 'الإعدادات',           path: 'نظام ← إعدادات'         },
  'settings/document-types': { title: 'أنواع المستندات',    path: 'نظام ← أنواع المستندات' },
  'numbering-series':        { title: 'سلاسل الترقيم',      path: 'نظام ← سلاسل الترقيم'   },
  'payment-methods':         { title: 'طرق الدفع',           path: 'نظام ← طرق الدفع'       },
  'expense-categories':      { title: 'فئات المصروفات',     path: 'نظام ← فئات المصروفات'  },
  'admin/companies':         { title: 'إدارة الشركات',      path: 'Super Admin ← الشركات'  },
};

// ════════════════════════════════════════════════
// نافذة إنشاء السنة المالية — إجبارية لا تُغلَق
// ════════════════════════════════════════════════
function NoFiscalYearModal({ onCreated }: { onCreated: () => void }) {
  const { activeCompany }  = useAuth();
  const thisYear           = new Date().getFullYear();
  const [yearName, setYearName]   = useState(String(thisYear));
  const [creating, setCreating]   = useState(false);
  const [error,    setError]      = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCreate = async () => {
    const name = yearName.trim();
    const y    = parseInt(name);
    if (isNaN(y) || y < 2000 || y > 2100) {
      setError('أدخل سنة صحيحة بأربعة أرقام (مثال: 2025)');
      return;
    }
    if (!activeCompany?.slug) {
      setError('لم يتم تحديد الشركة النشطة، أعد تسجيل الدخول.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      // ✅ نفس endpoint الذي يستخدمه FiscalYearContext
      await client.post(`/${activeCompany.slug}/fiscal-years`, {
        name,
        start_date: `${y}-01-01`,
        end_date:   `${y}-12-31`,
        is_current: true,
      });
      onCreated();   // يُطلِق refetch() في Context
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.response?.data?.errors?.name?.[0] ?? 'فشل إنشاء السنة المالية.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:10002,
      display:'flex', alignItems:'center', justifyContent:'center',
      background:'rgba(0,0,0,.78)', backdropFilter:'blur(10px)', padding:16,
    }}>
      <div style={{
        background:'var(--bg2)', borderRadius:20, width:'100%', maxWidth:420,
        border:'1px solid var(--b3)', boxShadow:'0 24px 64px rgba(0,0,0,.45)',
        overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding:'28px 28px 22px',
          background:'linear-gradient(135deg, var(--em), var(--em3))',
          textAlign:'center', position:'relative', overflow:'hidden',
        }}>
          {/* Decoration circles */}
          <div style={{ position:'absolute', top:-50, left:-50, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,.07)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, right:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'relative' }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📅</div>
            <div style={{ fontSize:19, fontWeight:800, color:'#fff', marginBottom:5 }}>
              لا توجد سنة مالية نشطة
            </div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', lineHeight:1.5 }}>
              يجب إنشاء سنة مالية لبدء استخدام النظام
              {activeCompany && (
                <div style={{ marginTop:6, fontSize:11, color:'rgba(255,255,255,.6)' }}>
                  الشركة: <strong style={{ color:'rgba(255,255,255,.9)' }}>{activeCompany.name}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding:'26px 28px 28px' }}>
          <label style={{ display:'block', fontSize:13, fontWeight:700, color:'var(--t2)', marginBottom:8 }}>
            السنة المالية
          </label>
          <input
            ref={inputRef}
            type="text"
            value={yearName}
            onChange={e => { setYearName(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder={`مثال: ${thisYear}`}
            maxLength={4}
            style={{
              width:'100%', padding:'13px 16px', borderRadius:'var(--r2)',
              border:`1.5px solid ${error ? 'var(--red)' : 'var(--b3)'}`,
              background:'var(--bg3)', color:'var(--t1)',
              fontFamily:'Tajawal, sans-serif', fontSize:18,
              fontWeight:800, textAlign:'center', outline:'none',
              transition:'.14s', direction:'ltr',
              marginBottom: error ? 8 : 0,
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--em)')}
            onBlur={e => (e.target.style.borderColor = error ? 'var(--red)' : 'var(--b3)')}
          />

          {error && (
            <div style={{
              fontSize:12, color:'var(--red)', marginBottom:0,
              padding:'8px 12px', borderRadius:8,
              background:'var(--redb)', border:'1px solid var(--redbo)',
              marginTop: 8,
            }}>⚠️ {error}</div>
          )}

          {/* Preview */}
          {yearName.trim().length === 4 && !isNaN(parseInt(yearName)) && (
            <div style={{
              margin:'14px 0 20px', padding:'10px 14px',
              background:'var(--bg3)', borderRadius:10,
              border:'1px solid var(--b2)',
              fontSize:12, color:'var(--t3)', lineHeight:1.7,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>تاريخ البداية</span>
                <strong>01 يناير {yearName}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>تاريخ النهاية</span>
                <strong>31 ديسمبر {yearName}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'var(--t4)' }}>الحالة</span>
                <strong style={{ color:'var(--em)' }}>✓ سنة حالية</strong>
              </div>
            </div>
          )}

          {(!yearName.trim() || yearName.trim().length !== 4 || isNaN(parseInt(yearName))) && (
            <div style={{ marginBottom: 20 }} />
          )}

          <button
            onClick={handleCreate}
            disabled={creating || !yearName.trim()}
            style={{
              width:'100%', padding:'13px 20px',
              borderRadius:'var(--r2)', border:'none',
              background: creating || !yearName.trim() ? 'var(--bg4)' : 'var(--em)',
              color: creating || !yearName.trim() ? 'var(--t4)' : '#fff',
              fontSize:14, fontWeight:800,
              cursor: creating ? 'wait' : !yearName.trim() ? 'not-allowed' : 'pointer',
              fontFamily:'Tajawal, sans-serif',
              boxShadow: yearName.trim() && !creating ? 'var(--emglow)' : 'none',
              transition:'.2s',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            }}
          >
            {creating ? (
              <>
                <span style={{ display:'inline-block', width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', animation:'spin .7s linear infinite' }} />
                جارٍ الإنشاء...
              </>
            ) : (
              <>
                <i className="ti ti-calendar-plus" />
                إنشاء السنة المالية {yearName}
              </>
            )}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}


// ════════════════════════════════════════════════
// CompanySwitcher — تبديل الشركة من الـ Sidebar
// ════════════════════════════════════════════════
function CompanySwitcher() {
  const { user, activeCompany, setActiveCompany } = useAuth() as any;
  const navigate = useNavigate();
  const [open, setOpen]         = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // إغلاق عند النقر خارجاً
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // جلب الشركات عند الفتح
  const fetchCompanies = async () => {
    if (companies.length > 0) return; // cached
    setLoading(true);
    try {
      const res = await client.get('/companies');
      const raw = res.data?.data ?? res.data;
      setCompanies(Array.isArray(raw) ? raw : (raw?.data ?? []));
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleOpen = () => {
    setOpen(v => !v);
    fetchCompanies();
  };

  const handleSwitch = async (co: any) => {
    if (co.id === activeCompany?.id) { setOpen(false); return; }
    setSwitching(co.id);
    try {
      await client.post('/companies/switch', { company_id: co.id });
      setActiveCompany({ id: co.id, name: co.name, slug: co.slug });
      setOpen(false);
      // نحذف السنة المالية المخزّنة ونوجّه للـ onboarding لاختيار السنة
      sessionStorage.removeItem('selected_fiscal_year');
      navigate('/onboarding', { replace: true });
    } catch { /* silent */ }
    finally { setSwitching(null); }
  };

  const initials = (name: string) =>
    name.trim().split(' ').slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? '').join('');

  const AV_COLORS = [
    'linear-gradient(135deg,#0a8a5c,#0dbf84)',
    'linear-gradient(135deg,#1a4fd6,#60a5fa)',
    'linear-gradient(135deg,#6920d4,#a78bfa)',
    'linear-gradient(135deg,#b87d0a,#fbbf24)',
    'linear-gradient(135deg,#0d7a8c,#22d3ee)',
    'linear-gradient(135deg,#c43a0a,#fb923c)',
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* ─── بطاقة الشركة الحالية ─── */}
      <button
        onClick={handleOpen}
        title="تبديل الشركة"
        style={{
          width: '100%', border: 'none', cursor: 'pointer',
          padding: '10px 12px', borderRadius: 12, display: 'block',
          background: 'var(--bg3, rgba(255,255,255,.05))',
          outline: 'none', fontFamily: 'Tajawal, sans-serif',
          transition: 'background .15s',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg4, rgba(255,255,255,.09))')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3, rgba(255,255,255,.05))')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl' }}>
          {/* أيقونة الشركة */}
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--em, #0a8a5c), var(--em3, #0dbf84))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: '#fff',
          }}>
            {(activeCompany?.name ?? '؟')[0]?.toUpperCase()}
          </div>
          {/* الاسم والـ slug */}
          <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: 'var(--t1, #fff)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.3, marginBottom: 3,
            }}>
              {activeCompany?.name ?? 'اختر شركة'}
            </div>
            <div style={{
              fontSize: 10, color: 'var(--t4, rgba(255,255,255,.45))',
              fontFamily: 'monospace', letterSpacing: .3,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <i className="ti ti-building" style={{ fontSize: 9 }} />
              {activeCompany?.slug ?? '—'}
            </div>
          </div>
          <i
            className={`ti ti-chevron-${open ? 'up' : 'down'}`}
            style={{ fontSize: 12, color: 'var(--t4)', flexShrink: 0, transition: '.2s' }}
          />
        </div>
      </button>

      {/* Popover */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, left: 0, zIndex: 500,
          background: 'var(--bg2)', border: '1px solid var(--b2)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
          overflow: 'hidden', direction: 'rtl',
          animation: 'fadeInPop .15s ease',
        }}>
          <style>{`@keyframes fadeInPop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}`}</style>

          {/* Header */}
          <div style={{ padding: '10px 13px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="ti ti-building-community" style={{ color: 'var(--em)', fontSize: 13 }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: .7 }}>
              تبديل الشركة
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', marginLeft: 6 }} />
              جارٍ التحميل...
            </div>
          )}

          {/* List */}
          {!loading && companies.map((co: any, i: number) => {
            const isActive   = co.id === activeCompany?.id;
            const isSwitching = switching === co.id;
            const suspended  = co.is_suspended;

            return (
              <button
                key={co.id}
                onClick={() => !suspended && handleSwitch(co)}
                disabled={suspended || isSwitching}
                style={{
                  width: '100%', padding: '10px 13px', background: isActive ? 'var(--emb)' : 'none',
                  border: 'none', borderBottom: '1px solid var(--b1)', cursor: suspended ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl',
                  opacity: suspended ? .5 : 1, transition: '.13s',
                  fontFamily: 'Tajawal, sans-serif',
                }}
                onMouseEnter={e => { if (!isActive && !suspended) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = isActive ? 'var(--emb)' : 'none'; }}
              >
                {/* Avatar */}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: AV_COLORS[co.id % AV_COLORS.length],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: '#fff',
                }}>
                  {initials(co.name)}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isActive ? 'var(--em)' : 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {co.name}
                    {suspended && <span style={{ color: 'var(--red)', marginRight: 5, fontSize: 10 }}>معلّقة</span>}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'monospace' }}>{co.slug}</div>
                </div>

                {/* State */}
                {isSwitching ? (
                  <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite', color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />
                ) : isActive ? (
                  <i className="ti ti-check" style={{ color: 'var(--em)', fontSize: 13, flexShrink: 0 }} />
                ) : (
                  <i className="ti ti-arrow-left" style={{ color: 'var(--t4)', fontSize: 11, flexShrink: 0 }} />
                )}
              </button>
            );
          })}

          {/* Footer — إضافة شركة */}
          <button
            onClick={() => { setOpen(false); navigate('/onboarding'); }}
            style={{
              width: '100%', padding: '10px 13px', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              direction: 'rtl', fontFamily: 'Tajawal, sans-serif', borderTop: '1px solid var(--b2)',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)')}
            onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
          >
            <i className="ti ti-plus" style={{ color: 'var(--em)', fontSize: 13 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--em)' }}>إضافة / إدارة الشركات</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════
// DashboardLayout
// ════════════════════════════════════════════════
export default function DashboardLayout() {
  const { user, logout, activeCompany } = useAuth() as any;
  const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;
  const location                        = useLocation();
  const navigate                        = useNavigate();
  const { dark, toggle: toggleTheme }   = useTheme();
  const [drawerOpen, setDrawerOpen]     = useState(false);

  // ✅ نستخدم FiscalYearContext مباشرة — بدون useParams
  const { years, selectedYear, isLoading: fiscalLoading, refetch } = useFiscalYear();

  // ✅ fiscalState مشتق بالكامل من Context
  const fiscalState: 'loading' | 'noYear' | 'ready' =
    fiscalLoading         ? 'loading' :
    !activeCompany?.slug  ? 'loading' :   // ← ننتظر لو الشركة لم تُحدَّد بعد
    years.length === 0    ? 'noYear'  :
    selectedYear !== null ? 'ready'   : 'loading';

  // ✅ بعد إنشاء السنة → refetch فقط بدون reload
  const handleYearCreated = async () => {
    await refetch();
  };

  const currentPath = location.pathname.replace(/^\//, '') || 'dashboard';
  const meta = PAGE_META[currentPath] ?? { title: 'لوحة التحكم', path: 'الرئيسية' };
  const userInitial = user?.name?.[0] ?? 'م';

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ════════ SIDEBAR ════════ */}
      <nav id="sidebar">
        <div className="sb-logo">
          <div className="sb-mark">ب</div>
          <div>
            <div className="sb-name">نظام المبيعات</div>
            <div className="sb-sub">إدارة متكاملة • الجزائر</div>
          </div>
        </div>

        {/* ─── Company Switcher with visible spacing ─── */}
        <div style={{ padding: '4px 10px 8px', borderBottom: '1px solid var(--b1, rgba(255,255,255,.07))' }}>
          <CompanySwitcher />
        </div>

        {NAV_GROUPS.filter(g => !(g as any).superAdminOnly || isSuperAdmin).map((group, idx) => (
          <div className="sb-sec" key={group.label}>
            <div className="sb-lbl" style={{ color: LABEL_COLORS[idx] }}>{group.label}</div>
            {group.items.map(item => {
              const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
              return (
                <Link key={item.href} to={item.href} className={`sbi${isActive ? ' on' : ''}`}>
                  <span className="sbi-ic ic"><i className={`ti ${item.icon}`} /></span>
                  {item.name}
                  {'badge' in item && item.badge && <span className="sbi-badge">{item.badge}</span>}
                  {'badgeWarn' in item && item.badgeWarn && (
                    <span className="sbi-badge w ic-badge">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5">
                        <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                      </svg>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="sb-foot">
          {/* ─── بطاقة المستخدم ─── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px 8px', direction: 'rtl',
          }}>
            {/* الأفاتار */}
            <div style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue,#1a4fd6), #60a5fa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 900, color: '#fff',
            }}>
              {userInitial}
            </div>
            {/* الاسم والدور */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 800, color: 'var(--t1)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {user?.name ?? 'المستخدم'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                {(user as any)?.role ?? 'مدير النظام'}
              </div>
            </div>
            {/* مؤشر الاتصال */}
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--em, #0dbf84)',
              boxShadow: '0 0 6px var(--em, #0dbf84)',
              flexShrink: 0,
            }} title="متصل" />
          </div>

          {/* ─── زر تسجيل الخروج ─── */}
          <div style={{ padding: '0 10px 12px' }}>
            <button
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '10px 14px',
                background: 'transparent',
                border: '1.5px solid rgba(239,68,68,.3)',
                borderRadius: 10,
                color: '#ef4444',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'Tajawal, sans-serif',
                cursor: 'pointer',
                direction: 'rtl',
                transition: 'all .18s',
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = '#ef4444';
                b.style.borderColor = '#ef4444';
                b.style.color = '#fff';
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = 'transparent';
                b.style.borderColor = 'rgba(239,68,68,.3)';
                b.style.color = '#ef4444';
              }}
            >
              <i className="ti ti-logout" style={{ fontSize: 16 }} />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ════════ MAIN ════════ */}
      <main id="main">
        {/* Topbar */}
        <div id="topbar">
          <div className="tb-info">
            <div className="tb-title">{meta.title}</div>
            <div className="tb-path">{meta.path}</div>
          </div>
          <div className="tb-actions">
            <FiscalYearSelector />
            <div className="srch">
              <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
              <input type="text" placeholder="بحث سريع..." />
            </div>
            <div className="ib" title="الإشعارات">
              <span className="ic ic-sm"><i className="ti ti-bell" /></span>
              <div className="ib-n">5</div>
            </div>
            <button className="ib" onClick={toggleTheme} title={dark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
              <span className="ic ic-sm"><i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} /></span>
            </button>
            <button className="tb-btn p" onClick={() => navigate('pos')}>
              <span className="ic ic-xs"><i className="ti ti-plus" /></span>
              <span>فاتورة جديدة</span>
            </button>
          </div>
        </div>

        {/* ════════ المحتوى ════════ */}
        <div style={{ flex:1 }}>
          {fiscalState === 'loading' && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:12, color:'var(--t4)' }}>
              <i className="ti ti-loader" style={{ fontSize:20, color:'var(--em)', animation:'spin 1s linear infinite' }} />
              <span style={{ fontSize:14 }}>جارٍ تحميل بيانات السنة المالية...</span>
            </div>
          )}

          {/* ✅ نافذة إجبارية — لا يمكن إغلاقها */}
          {fiscalState === 'noYear' && (
            <NoFiscalYearModal onCreated={handleYearCreated} />
          )}

          {fiscalState === 'ready' && <Outlet />}
        </div>
      </main>

      {/* ════════ MOBILE NAV ════════ */}
      <div id="mob-nav">
        <div className="mob-tabs">
          <Link to="dashboard" className={`mt${currentPath === 'dashboard' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-home" /></span></div>
            <div className="mt-lbl">الرئيسية</div>
          </Link>
          <Link to="documents/FV" className={`mt${currentPath === 'documents/FV' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-file-text" /></span></div>
            <div className="mt-lbl">فواتير</div>
            <div className="mt-n">3</div>
          </Link>
          <div className="mt-fab" onClick={() => navigate('pos')}>
            <div className="fab-btn"><span className="ic"><i className="ti ti-shopping-cart" /></span></div>
            <div className="mt-lbl" style={{ fontSize:9, marginTop:2 }}>بيع</div>
          </div>
          <Link to="inventory" className={`mt${currentPath === 'inventory' ? ' on' : ''}`}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-package" /></span></div>
            <div className="mt-lbl">مخزون</div>
          </Link>
          <div className="mt" onClick={() => setDrawerOpen(true)}>
            <div className="mt-ic-wrap"><span className="ic mt-ic"><i className="ti ti-dots" /></span></div>
            <div className="mt-lbl">المزيد</div>
          </div>
        </div>
      </div>

      {/* ════════ MOBILE DRAWER ════════ */}
      <div id="mob-drawer" className={drawerOpen ? 'on' : ''} onClick={() => setDrawerOpen(false)}>
        <div className="mdb-bg" />
        <div className="mdb-panel" onClick={e => e.stopPropagation()}>
          <div className="mdb-handle" />
          <div className="mdb-title">التنقل السريع</div>
          <div className="mdb-grid">
            {[
              { href:'pos',          icon:'ti-shopping-cart', label:'بيع'    },
              { href:'inventory',    icon:'ti-package',       label:'مخزون'  },
              { href:'finance',      icon:'ti-building-bank', label:'خزينة'  },
              { href:'clients',      icon:'ti-users',         label:'عملاء'  },
              { href:'documents/FV', icon:'ti-file-text',     label:'فواتير' },
              { href:'expenses',     icon:'ti-credit-card',   label:'مصاريف' },
              { href:'products',     icon:'ti-list',          label:'منتجات' },
              { href:'reports',      icon:'ti-chart-bar',     label:'تقارير' },
            ].map(({ href, icon, label }) => (
              <div key={href} className="mdb-item" onClick={() => { navigate(href); setDrawerOpen(false); }}>
                <div className="mdb-ic"><span className="ic"><i className={`ti ${icon}`} /></span></div>
                <div className="mdb-lbl">{label}</div>
              </div>
            ))}
          </div>
          <div className="mdb-title" style={{ marginTop:8 }}>الحساب</div>
          <div className="mdb-row" onClick={() => { logout(); setDrawerOpen(false); }}>
            <span className="ic ic-sm"><i className="ti ti-logout" /></span>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--red)' }}>تسجيل الخروج</span>
          </div>
        </div>
      </div>
    </>
  );
}
```

## FILE: resources/js/components/layouts/POSLayout.tsx
```
```

## FILE: resources/js/components/modals/AdminBootModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// components/modals/AdminBootModal.tsx
//
// مودال إعداد النظام للسوبر أدمن — يظهر مرة واحدة عند أول دخول
// يتحقق من حالة البيانات العالمية ويثبّتها عبر:
//   GET  /api/v1/admin/system/status
//   POST /api/v1/admin/system/boot
//   POST /api/v1/admin/system/boot/wilayas
//   POST /api/v1/admin/system/boot/permissions
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import client from '@/lib/api/core/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SystemComponent {
  key:   string;
  label: string;
  icon:  string;
  done:  boolean;
  count: string;
}

interface SystemStatus {
  is_ready:   boolean;
  components: SystemComponent[];
}

type Phase = 'checking' | 'ready' | 'needs_setup' | 'installing' | 'done' | 'error';
type ItemStatus = 'pending' | 'installing' | 'done' | 'error' | 'skipped';

interface InstallStep {
  key:      string;
  label:    string;
  icon:     string;
  endpoint: string;  // POST endpoint نسبي
  status:   ItemStatus;
  message?: string;
  ms?:      number;
}

// الخطوات بالترتيب الصحيح
const INSTALL_STEPS: Omit<InstallStep, 'status'>[] = [
  {
    key:      'wilayas',
    label:    'الولايات والبلديات الجزائرية',
    icon:     'ti-map-pin',
    endpoint: '/api/v1/admin/system/boot/wilayas',
  },
  {
    key:      'permissions',
    label:    'الصلاحيات ودور مدير النظام',
    icon:     'ti-shield-check',
    endpoint: '/api/v1/admin/system/boot/permissions',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBootModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase,   setPhase]   = useState<Phase>('checking');
  const [status,  setStatus]  = useState<SystemStatus | null>(null);
  const [steps,   setSteps]   = useState<InstallStep[]>(
    INSTALL_STEPS.map(s => ({ ...s, status: 'pending' }))
  );
  const [elapsed,       setElapsed]       = useState(0);
  const [currentLabel,  setCurrentLabel]  = useState('جارٍ فحص النظام...');
  const [doneCount,     setDoneCount]     = useState(0);
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null);

  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const startRef  = useRef(Date.now());

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const setStep = useCallback((key: string, patch: Partial<InstallStep>) => {
    setSteps(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s));
  }, []);

  // ── 1. فحص الحالة عند التحميل ───────────────────────────────────────────
  useEffect(() => {
    const check = async () => {
      try {
        const res = await client.get<SystemStatus>('/api/v1/admin/system/status');
        setStatus(res.data);

        if (res.data.is_ready) {
          clearInterval(timerRef.current);
          setPhase('ready');
          setCurrentLabel('النظام مُعدّ ✓');
          // انتقل تلقائياً بعد ثانية
          setTimeout(onComplete, 1000);
        } else {
          setPhase('needs_setup');
          setCurrentLabel('يلزم إعداد النظام أولاً');
        }
      } catch (e: any) {
        setErrorMsg(e?.response?.data?.message ?? 'تعذّر الاتصال بالخادم');
        setPhase('error');
        clearInterval(timerRef.current);
      }
    };

    check();
  }, [onComplete]);

  // ── 2. تثبيت البيانات العالمية ─────────────────────────────────────────
  const handleInstall = useCallback(async () => {
    setPhase('installing');
    startRef.current = Date.now();
    setElapsed(0);

    let done = 0;
    const errors: string[] = [];

    for (const step of INSTALL_STEPS) {
      setCurrentLabel(step.label);
      setStep(step.key, { status: 'installing' });

      // scroll into view
      setTimeout(() => {
        document.getElementById(`boot-step-${step.key}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);

      const t0 = Date.now();
      try {
        await client.post(step.endpoint);
        setStep(step.key, { status: 'done', ms: Date.now() - t0 });
        done++;
      } catch (e: any) {
        const msg = e?.response?.data?.message ?? 'خطأ غير معروف';
        setStep(step.key, { status: 'error', message: msg });
        errors.push(`${step.label}: ${msg}`);
      }

      setDoneCount(d => d + 1);
      await new Promise(r => setTimeout(r, 200));
    }

    clearInterval(timerRef.current);

    if (errors.length === 0) {
      setPhase('done');
      setCurrentLabel('اكتمل الإعداد بنجاح ✓');
      setTimeout(onComplete, 1200);
    } else {
      setPhase('error');
      setErrorMsg(errors.join(' — '));
      setCurrentLabel(`اكتمل مع ${errors.length} أخطاء`);
    }
  }, [setStep, onComplete]);

  // ── حساب التقدم ──────────────────────────────────────────────────────────
  const TOTAL    = INSTALL_STEPS.length;
  const progress = phase === 'done'  ? 100
                 : phase === 'ready' ? 100
                 : Math.round((doneCount / TOTAL) * 100);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.80)', backdropFilter: 'blur(14px)',
      padding: 20, direction: 'rtl',
      animation: 'abFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes abFadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes abSlideUp  { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }
        @keyframes abSpin     { to{transform:rotate(360deg)} }
        @keyframes abPulse    { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes abPop      {
          0%  { transform:scale(.7); opacity:0 }
          65% { transform:scale(1.1) }
          100% { transform:scale(1); opacity:1 }
        }
        @keyframes abShimmer {
          0%   { background-position:-400px 0 }
          100% { background-position: 400px 0 }
        }
        .ab-step:hover { background:var(--bg3); }
      `}</style>

      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 500,
        border: '1px solid var(--b3)',
        boxShadow: '0 40px 100px rgba(0,0,0,.55)',
        overflow: 'hidden',
        animation: 'abSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>

        {/* ══ Header ════════════════════════════════════════════════════════ */}
        <div style={{
          background: phase === 'done' || phase === 'ready'
            ? 'linear-gradient(135deg, #059669 0%, #065f46 100%)'
            : phase === 'error'
            ? 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)'
            : 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '28px 28px 22px',
          position: 'relative', overflow: 'hidden',
          transition: 'background .5s',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-60, left:-60, width:200, height:200, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-40, right:-30, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,.04)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width: 56, height: 56, borderRadius: 18, flexShrink: 0,
              background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, boxShadow: '0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'checking'    && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'needs_setup' && <i className="ti ti-settings-2" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'installing'  && <i className="ti ti-loader-2" style={{ animation:'abSpin .8s linear infinite', color:'#fff', fontSize:26 }} />}
              {phase === 'done'        && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26, animation:'abPop .35s cubic-bezier(.34,1.5,.64,1)' }} />}
              {phase === 'ready'       && <i className="ti ti-circle-check-filled" style={{ color:'#fff', fontSize:26 }} />}
              {phase === 'error'       && <i className="ti ti-alert-triangle-filled" style={{ color:'#fff', fontSize:26 }} />}
            </div>

            <div style={{ flex: 1, paddingTop: 2 }}>
              <div style={{ fontSize:9, fontWeight:800, color:'rgba(255,255,255,.6)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                إعداد النظام — مدير النظام
              </div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', lineHeight:1.25, marginBottom:4 }}>
                {phase === 'checking'    && 'جارٍ فحص النظام...'}
                {phase === 'needs_setup' && 'يلزم إعداد البيانات الأولية'}
                {phase === 'installing'  && 'جارٍ تثبيت البيانات...'}
                {phase === 'done'        && 'اكتمل الإعداد بنجاح!'}
                {phase === 'ready'       && 'النظام جاهز!'}
                {phase === 'error'       && 'حدث خطأ أثناء الإعداد'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.72)', lineHeight:1.5 }}>
                {phase === 'checking'    && 'يتحقق من البيانات العالمية...'}
                {phase === 'needs_setup' && 'الولايات والصلاحيات غير مثبتة — يجب تثبيتها مرة واحدة'}
                {phase === 'installing'  && `جارٍ التثبيت · ${elapsed}ث`}
                {phase === 'done'        && `اكتمل في ${elapsed} ثانية — جارٍ الانتقال...`}
                {phase === 'ready'       && 'البيانات العالمية مثبتة — جارٍ الانتقال...'}
                {phase === 'error'       && 'راجع التفاصيل أدناه'}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          {(phase === 'installing' || phase === 'done' || phase === 'ready') && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                height: 6, borderRadius: 99,
                background: 'rgba(255,255,255,.2)',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', borderRadius: 99,
                  background: 'rgba(255,255,255,.9)',
                  width: `${progress}%`,
                  transition: 'width .5s cubic-bezier(.4,0,.2,1)',
                  boxShadow: '0 0 12px rgba(255,255,255,.5)',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                marginTop: 6, fontSize: 11, color: 'rgba(255,255,255,.7)',
              }}>
                <span style={{ animation: phase === 'installing' ? 'abPulse 1.5s ease infinite' : 'none' }}>
                  {currentLabel}
                </span>
                <span style={{ fontWeight: 800, color: '#fff' }}>{progress}٪</span>
              </div>
            </div>
          )}
        </div>

        {/* ══ Body ══════════════════════════════════════════════════════════ */}
        <div style={{ padding: '16px 20px' }}>

          {/* ── حالة الفحص الأولي ─── */}
          {(phase === 'checking' || phase === 'needs_setup') && status && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                حالة المكونات العالمية
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {status.components.map(comp => (
                  <div key={comp.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: comp.done ? 'var(--emb)' : 'var(--redb)',
                    border: `1px solid ${comp.done ? 'var(--embo)' : 'var(--redbo)'}`,
                    transition: 'all .2s',
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${comp.done ? 'ti-check' : comp.icon}`} style={{ fontSize: 15, color: '#fff' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{comp.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)' }}>{comp.count}</div>
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 800, padding: '3px 8px',
                      borderRadius: 99,
                      background: comp.done ? 'var(--em)' : 'var(--red)',
                      color: '#fff',
                    }}>
                      {comp.done ? 'جاهز' : 'مطلوب'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── خطوات التثبيت ─── */}
          {(phase === 'installing' || phase === 'done' || phase === 'error') && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--t4)', marginBottom: 10, letterSpacing: .5, textTransform: 'uppercase' }}>
                تقدم التثبيت
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {steps.map(step => (
                  <div
                    id={`boot-step-${step.key}`}
                    key={step.key}
                    className="ab-step"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px', borderRadius: 10,
                      transition: 'background .15s',
                    }}
                  >
                    {/* أيقونة الحالة */}
                    <div style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {step.status === 'pending' && (
                        <div style={{ width:22, height:22, borderRadius:'50%', border:'2px solid var(--b3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <i className={`ti ${step.icon}`} style={{ fontSize:11, color:'var(--t4)' }} />
                        </div>
                      )}
                      {step.status === 'installing' && (
                        <i className="ti ti-loader-2" style={{ fontSize:18, color:'var(--em)', animation:'abSpin .7s linear infinite' }} />
                      )}
                      {step.status === 'done' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--em)', display:'flex', alignItems:'center', justifyContent:'center',
                          animation:'abPop .3s cubic-bezier(.34,1.5,.64,1)',
                        }}>
                          <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                        </div>
                      )}
                      {step.status === 'error' && (
                        <div style={{
                          width:22, height:22, borderRadius:'50%',
                          background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                        </div>
                      )}
                    </div>

                    {/* النص */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:600,
                        color: step.status === 'installing' ? 'var(--t1)'
                             : step.status === 'done'       ? 'var(--t2)'
                             : step.status === 'error'      ? 'var(--red)'
                             : 'var(--t4)',
                      }}>
                        {step.label}
                      </div>
                      {step.status === 'installing' && (
                        <div style={{ height:3, borderRadius:99, marginTop:4, background:'var(--bg4)', overflow:'hidden' }}>
                          <div style={{
                            height:'100%', borderRadius:99, width:'60%',
                            background:'linear-gradient(90deg, transparent, var(--em), transparent)',
                            backgroundSize:'400px 100%',
                            animation:'abShimmer 1.2s linear infinite',
                          }} />
                        </div>
                      )}
                      {step.status === 'error' && step.message && (
                        <div style={{ fontSize:11, color:'var(--red)', marginTop:2 }}>{step.message}</div>
                      )}
                    </div>

                    {/* الوقت */}
                    {step.status === 'done' && step.ms !== undefined && (
                      <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                        {step.ms > 0 ? `${step.ms}ms` : <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>فوري</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── رسالة خطأ عامة ─── */}
          {phase === 'error' && errorMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, marginTop: 8,
              background: 'var(--redb)', border: '1px solid var(--redbo)',
              fontSize: 12, color: 'var(--red)', lineHeight: 1.5,
            }}>
              <i className="ti ti-alert-circle" style={{ marginLeft: 6 }} />
              {errorMsg}
            </div>
          )}

          {/* ── تحذير إذا النظام في وضع checking ─── */}
          {phase === 'checking' && !status && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '32px 0', color: 'var(--t4)', gap: 10,
            }}>
              <i className="ti ti-loader-2" style={{ fontSize:20, animation:'abSpin .8s linear infinite' }} />
              <span style={{ fontSize:13 }}>جارٍ فحص حالة النظام...</span>
            </div>
          )}
        </div>

        {/* ══ Footer ════════════════════════════════════════════════════════ */}
        <div style={{
          padding: '12px 20px 20px',
          borderTop: '1px solid var(--b1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {phase === 'installing' && `${doneCount} / ${TOTAL} خطوة`}
            {phase === 'done'       && `${TOTAL} / ${TOTAL} خطوة — مكتمل`}
            {phase === 'ready'      && 'البيانات العالمية موجودة'}
            {phase === 'error'      && 'يمكنك إعادة المحاولة'}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            {/* زر التثبيت — يظهر فقط في needs_setup */}
            {phase === 'needs_setup' && (
              <button
                onClick={handleInstall}
                style={{
                  padding: '9px 20px', borderRadius: 12,
                  border: 'none', background: 'var(--em)', color: '#fff',
                  fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  fontFamily: 'Tajawal, sans-serif',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: 'var(--emglow)', transition: '.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <i className="ti ti-player-play-filled" style={{ fontSize:13 }} />
                تثبيت البيانات الآن
              </button>
            )}

            {/* زر إعادة المحاولة */}
            {phase === 'error' && (
              <>
                <button
                  onClick={() => {
                    setSteps(INSTALL_STEPS.map(s => ({ ...s, status: 'pending' })));
                    setDoneCount(0);
                    setElapsed(0);
                    setErrorMsg(null);
                    startRef.current = Date.now();
                    handleInstall();
                  }}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: 'none', background: 'var(--em)', color: '#fff',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Tajawal, sans-serif',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <i className="ti ti-refresh" style={{ fontSize:13 }} />
                  إعادة المحاولة
                </button>
                <button
                  onClick={onComplete}
                  style={{
                    padding: '8px 16px', borderRadius: 10,
                    border: '1px solid var(--b3)', background: 'var(--bg3)',
                    color: 'var(--t3)', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                  }}
                >
                  تجاهل والمتابعة
                </button>
              </>
            )}

            {/* جارٍ الانتقال */}
            {(phase === 'done' || phase === 'ready') && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10,
                background: 'var(--emb)', border: '1px solid var(--embo)',
                fontSize: 12, fontWeight: 700, color: 'var(--em)',
              }}>
                <i className="ti ti-rocket" style={{ fontSize:13 }} />
                جارٍ الانتقال...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/modals/ClientModal.tsx
```
// resources/js/components/modals/ClientModal.tsx
// ✅ مُصلح: اختيار الولاية والبلدية يعمل بشكل صحيح
// - Wilaya: select عادي بدل datalist (أكثر موثوقية)
// - Commune: تُحدَّث فور اختيار الولاية
// - التحقق من wilaya_id يستخدم الـ id مباشرة

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import { useWilayas, useCommunes, useLegalForms, usePriceLevels } from '@/lib/api/endpoints/lookups';
import type { Party, Wilaya, Commune, LegalForm, PriceLevel } from '@/types';

interface ClientModalProps {
  open: boolean;
  party: Party | null;
  onClose: () => void;
  onSaved: () => void;
  isSubmitting?: boolean;
  onSubmit: (data: any) => Promise<void>;
}

export default function ClientModal({ open, party, onClose, onSaved, isSubmitting, onSubmit }: ClientModalProps) {
  const isEdit = !!party;
  const [activeTab, setActiveTab]           = useState(0);
  const [selectedWilayaId, setSelectedWilayaId] = useState<number | null>(null);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // ── Lookups ───────────────────────────────────────────────────────
  const { data: wilayasRaw  = [] } = useWilayas();
  const { data: legalForms  = [] } = useLegalForms();
  const { data: priceLevels = [] } = usePriceLevels();
  // ✅ تمرير selectedWilayaId — يُفعَّل الطلب فقط عند وجود ولاية
  const { data: communes = [], isFetching: loadingCommunes } = useCommunes(selectedWilayaId);

  // ✅ فرز الولايات حسب رمزها الرسمي
  const wilayas: Wilaya[] = [...wilayasRaw].sort((a: any, b: any) => a.code - b.code);

  // ── Form state ────────────────────────────────────────────────────
  const emptyForm = {
    name: '', commercial_name: '', code: '', activity: '',
    rc: '', nif: '', nis: '', ai: '', legal_form_id: null as number | null,
    capital_amount: 0, rc_date: '', address: '',
    commune_id: null as number | null,
    wilaya_id:  null as number | null,
    phone: '', mobile: '', fax: '', email: '', bank_name: '', rib: '',
    initial_balance: 0, credit_limit: 0, credit_days: 30,
    default_price_level_id: null as number | null,
    is_tva_exempt: false, is_taxable: true, tax_option: null as string | null,
    cnas_number: '', tax_regime: null as string | null,
    is_final_consumer: false, is_vat_registered: false,
    vat_registration_date: '', active: true,
  };
  const [form, setForm] = useState(emptyForm);

  // ── Reset on open ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (party) {
      const ns = (v: any) => v == null ? '' : v;      // null → ''
      const nn = (v: any, d = 0) => v ?? d;            // null → default number

      const wId = party.wilaya_id ?? null;
      setSelectedWilayaId(wId);

      setForm({
        ...emptyForm,
        name:                   ns(party.name),
        commercial_name:        ns(party.commercial_name),
        code:                   ns(party.code),
        activity:               ns(party.activity),
        rc:                     ns(party.rc),
        nif:                    ns(party.nif),
        nis:                    ns(party.nis),
        ai:                     ns(party.ai),
        address:                ns(party.address),
        phone:                  ns(party.phone),
        mobile:                 ns(party.mobile),
        fax:                    ns(party.fax),
        email:                  ns(party.email),
        bank_name:              ns(party.bank_name),
        rib:                    ns(party.rib),
        rc_date:                ns(party.rc_date),
        vat_registration_date:  ns(party.vat_registration_date),
        cnas_number:            ns(party.cnas_number),
        tax_regime:             ns(party.tax_regime),
        tax_option:             party.tax_option ?? null,
        capital_amount:         nn(party.capital_amount),
        initial_balance:        nn(party.initial_balance),
        credit_limit:           nn(party.credit_limit),
        credit_days:            nn(party.credit_days, 30),
        is_tva_exempt:          party.is_tva_exempt    ?? false,
        is_taxable:             party.is_taxable       ?? true,
        is_final_consumer:      party.is_final_consumer ?? false,
        is_vat_registered:      party.is_vat_registered ?? false,
        active:                 party.active !== false,
        wilaya_id:              wId,
        commune_id:             party.commune_id             ?? null,
        legal_form_id:          party.legal_form_id          ?? null,
        default_price_level_id: party.default_price_level_id ?? null,
      });
    } else {
      setForm(emptyForm);
      setSelectedWilayaId(null);
    }

    setError('');
    setSuccess('');
    setActiveTab(0);
  }, [open, party?.id]);   // ✅ party?.id فقط — ليس party كاملاً

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Wilaya change ─────────────────────────────────────────────────
  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? parseInt(e.target.value) : null;
    setSelectedWilayaId(id);
    set('wilaya_id', id);
    set('commune_id', null);   // ✅ إعادة تعيين البلدية عند تغيير الولاية
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim()) { setError('اسم العميل مطلوب'); return; }
    try {
      const n2 = (v: any) => v === '' ? null : v;
      await onSubmit({
        ...form,
        party_type_id:         1,
        commercial_name:       n2(form.commercial_name),
        code:                  n2(form.code),
        activity:              n2(form.activity),
        rc:                    n2(form.rc),
        nif:                   n2(form.nif),
        nis:                   n2(form.nis),
        ai:                    n2(form.ai),
        address:               n2(form.address),
        phone:                 n2(form.phone),
        mobile:                n2(form.mobile),
        fax:                   n2(form.fax),
        email:                 n2(form.email),
        bank_name:             n2(form.bank_name),
        rib:                   n2(form.rib),
        rc_date:               n2(form.rc_date),
        vat_registration_date: n2(form.vat_registration_date),
        cnas_number:           n2(form.cnas_number),
        tax_regime:            n2(form.tax_regime),
        tax_option:            n2(form.tax_option),
      });
      setSuccess(isEdit ? 'تم تعديل العميل بنجاح' : 'تم إضافة العميل بنجاح');
      setTimeout(() => { onSaved(); onClose(); }, 300);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'فشل الحفظ');
    }
  };

  const tabs = ['المعلومات الأساسية', 'الوثائق القانونية', 'المعلومات المالية', 'إعدادات إضافية'];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? `تعديل — ${party?.name}` : 'إضافة عميل جديد'}
      footer={
        <>
          <Button onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            icon={<i className="ti ti-device-floppy" />}
            onClick={handleSave}
            disabled={isSubmitting || !form.name.trim()}
          >
            {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {error   && <AlertBar variant="red"   style={{ marginBottom: 12 }}>{error}</AlertBar>}
      {success && <AlertBar variant="green" style={{ marginBottom: 12 }}>{success}</AlertBar>}

      {/* Tab headers */}
      <div style={{
        display: 'flex', gap: 4, borderBottom: '1px solid var(--b2)',
        marginBottom: 16, direction: 'rtl', flexWrap: 'wrap',
      }}>
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => setActiveTab(idx)}
            style={{
              padding: '8px 16px', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: activeTab === idx ? 800 : 500,
              borderBottom: activeTab === idx ? '2px solid var(--em)' : '2px solid transparent',
              color: activeTab === idx ? 'var(--em)' : 'var(--t2)',
              transition: 'all .15s', fontFamily: 'inherit', fontSize: 13,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ minHeight: 440, overflowY: 'auto' }}>

        {/* ── تبويب 0: المعلومات الأساسية ── */}
        {activeTab === 0 && (
          <div className="fgrid c3">
            <div className="fg s2">
              <label className="req">الاسم الكامل / الشركة</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} autoFocus />
            </div>
            <div className="fg">
              <label>الاسم التجاري</label>
              <input value={form.commercial_name || ''} onChange={e => set('commercial_name', e.target.value)} />
            </div>

            <div className="fg s3">
              <label>العنوان</label>
              <input value={form.address || ''} onChange={e => set('address', e.target.value)} />
            </div>

            {/* ✅ Wilaya: select عادي مُرتَّب برقم الولاية */}
            <div className="fg">
              <label>الولاية</label>
              <select
                value={form.wilaya_id ?? ''}
                onChange={handleWilayaChange}
              >
                <option value="">-- اختر الولاية --</option>
                {wilayas.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.arabic_name || w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ✅ Commune: تنشط بعد اختيار ولاية + تُظهر loading */}
            <div className="fg">
              <label>
                البلدية
                {loadingCommunes && selectedWilayaId && (
                  <i className="ti ti-loader-2" style={{
                    marginRight: 6, fontSize: 11,
                    animation: 'spin .7s linear infinite', color: 'var(--t4)',
                  }} />
                )}
              </label>
              <select
                value={form.commune_id ?? ''}
                onChange={e => set('commune_id', e.target.value ? parseInt(e.target.value) : null)}
                disabled={!selectedWilayaId || loadingCommunes}
              >
                <option value="">
                  {!selectedWilayaId
                    ? '— اختر الولاية أولاً —'
                    : loadingCommunes
                      ? 'جاري التحميل...'
                      : '-- اختر البلدية --'}
                </option>
                {communes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.arabic_name || c.name}
                    {c.post_code ? ` (${c.post_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label>رمز العميل</label>
              <input
                value={form.code || ''}
                onChange={e => set('code', e.target.value)}
                placeholder="يُولد تلقائياً"
              />
            </div>

            <div className="fg">
              <label>الهاتف</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="fg">
              <label>الجوال</label>
              <input value={form.mobile || ''} onChange={e => set('mobile', e.target.value)} />
            </div>
            <div className="fg">
              <label>الفاكس</label>
              <input value={form.fax || ''} onChange={e => set('fax', e.target.value)} />
            </div>
            <div className="fg s2">
              <label>البريد الإلكتروني</label>
              <input value={form.email || ''} onChange={e => set('email', e.target.value)} type="email" />
            </div>
            <div className="fg" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className="flex between" style={{ width: '100%' }}>
                نشط
                <Switch checked={form.active} onChange={v => set('active', v)} />
              </label>
            </div>
          </div>
        )}

        {/* ── تبويب 1: الوثائق القانونية ── */}
        {activeTab === 1 && (
          <div className="fgrid c3">
            <div className="fg s3">
              <label>النشاط</label>
              <input value={form.activity || ''} onChange={e => set('activity', e.target.value)} placeholder="مثال: تجارة التجزئة" />
            </div>
            <div className="fg s2">
              <label>الشكل القانوني</label>
              <select value={form.legal_form_id ?? ''} onChange={e => set('legal_form_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- اختر --</option>
                {legalForms.map((lf: LegalForm) => <option key={lf.id} value={lf.id}>{lf.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>رأس المال (دج)</label>
              <input type="number" value={form.capital_amount} onChange={e => set('capital_amount', parseFloat(e.target.value) || 0)} min="0" />
            </div>
            <div className="fg">
              <label>تاريخ السجل التجاري</label>
              <input type="date" value={form.rc_date || ''} onChange={e => set('rc_date', e.target.value)} />
            </div>
            <div className="fg">
              <label>RC (السجل التجاري)</label>
              <input value={form.rc || ''} onChange={e => set('rc', e.target.value)} />
            </div>
            <div className="fg">
              <label>NIF</label>
              <input value={form.nif || ''} onChange={e => set('nif', e.target.value)} />
            </div>
            <div className="fg">
              <label>NIS</label>
              <input value={form.nis || ''} onChange={e => set('nis', e.target.value)} />
            </div>
            <div className="fg">
              <label>AI (رقم المادة)</label>
              <input value={form.ai || ''} onChange={e => set('ai', e.target.value)} />
            </div>
          </div>
        )}

        {/* ── تبويب 2: المعلومات المالية ── */}
        {activeTab === 2 && (
          <div className="fgrid c3">
            <div className="fg">
              <label>مستوى السعر الافتراضي</label>
              <select value={form.default_price_level_id ?? ''} onChange={e => set('default_price_level_id', e.target.value ? parseInt(e.target.value) : null)}>
                <option value="">-- بدون --</option>
                {priceLevels.map((pl: PriceLevel) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>الحد الائتماني (دج)</label>
              <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', parseFloat(e.target.value) || 0)} min="0" step="1000" />
            </div>
            <div className="fg">
              <label>أجل الدفع (يوم)</label>
              <input type="number" value={form.credit_days} onChange={e => set('credit_days', parseInt(e.target.value) || 0)} min="0" />
            </div>
            <div className="fg">
              <label>الرصيد الافتتاحي (دج)</label>
              <input type="number" value={form.initial_balance} onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="fg s2">
              <label>اسم البنك</label>
              <input value={form.bank_name || ''} onChange={e => set('bank_name', e.target.value)} />
            </div>
            <div className="fg">
              <label>RIB</label>
              <input value={form.rib || ''} onChange={e => set('rib', e.target.value)} />
            </div>
          </div>
        )}

        {/* ── تبويب 3: إعدادات إضافية ── */}
        {activeTab === 3 && (
          <div className="fgrid c3">
            <div className="fg">
              <label>رقم CNAS</label>
              <input value={form.cnas_number || ''} onChange={e => set('cnas_number', e.target.value)} />
            </div>
            <div className="fg">
              <label>النظام الضريبي</label>
              <input value={form.tax_regime || ''} onChange={e => set('tax_regime', e.target.value)} placeholder="réel, forfaitaire..." />
            </div>
            <div className="fg">
              <label>تاريخ التسجيل في TVA</label>
              <input type="date" value={form.vat_registration_date || ''} onChange={e => set('vat_registration_date', e.target.value)} />
            </div>
            <div className="fg">
              <label className="flex between">
                معفى من TVA
                <Switch checked={form.is_tva_exempt} onChange={v => set('is_tva_exempt', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                خاضع للضريبة
                <Switch checked={form.is_taxable} onChange={v => set('is_taxable', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                مستهلك نهائي
                <Switch checked={form.is_final_consumer} onChange={v => set('is_final_consumer', v)} />
              </label>
            </div>
            <div className="fg">
              <label className="flex between">
                مسجل في TVA
                <Switch checked={form.is_vat_registered} onChange={v => set('is_vat_registered', v)} />
              </label>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Modal>
  );
}
```

## FILE: resources/js/components/modals/CompanyFormDrawer.tsx
```
// resources/js/components/company/CompanyFormDrawer.tsx
// ════════════════════════════════════════════════
// مودال إضافة / تعديل شركة — يدعم slug أو id
// ════════════════════════════════════════════════
import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/coreclient';
import { useAuth } from '@/context/AuthContext';
import client from '@/lib/api/core/client';

// ── Types ──────────────────────────────────────
interface Company {
  id: number;
  name: string;
  commercial_name?: string;
  slug: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  nif?: string;
  nis?: string;
  rc?: string;
  ai?: string;
  activity?: string;
  legal_form_id?: number;
  wilaya_id?: number;
  commune_id?: number;
  active?: boolean;
  plan?: string;
  notes?: string;
}

interface Props {
  open: boolean;
  company?: Company | null;   // null = إنشاء جديد
  onClose: () => void;
  onSaved?: (company: Company) => void;
}

// ── Helper ─────────────────────────────────────
// استخراج رسالة الخطأ بأمان من أي شكل
function extractErrorMessage(error: unknown, fallback = 'حدث خطأ'): string {
  if (!error) return fallback;
  const e = error as any;

  // أخطاء validation من Laravel { errors: { field: [msgs] } }
  const errs = e?.response?.data?.errors;
  if (errs && typeof errs === 'object') {
    const msgs = Object.values(errs).flat() as string[];
    if (msgs.length > 0) return msgs.join(' — ');
  }

  // رسالة عادية
  const msg = e?.response?.data?.message ?? e?.message;
  if (msg && typeof msg === 'string') return msg;

  return fallback;
}

// ── Form Fields ────────────────────────────────
const inputCls: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 10,
  border: '1px solid var(--b3)', background: 'var(--bg3)',
  color: 'var(--t1)', fontFamily: 'Tajawal,sans-serif',
  fontSize: 13, outline: 'none', transition: 'border-color .14s',
};

function Field({ label, children, req }: { label: string; children: React.ReactNode; req?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: .8 }}>
        {label}{req && <span style={{ color: 'var(--red)', marginRight: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = 'text', dir }: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; dir?: 'ltr' | 'rtl';
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{ ...inputCls, direction: dir }}
      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
      onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
    />
  );
}

// ── Main Component ─────────────────────────────
export default function CompanyFormDrawer({ open, company, onClose, onSaved }: Props) {
  const isEdit = !!company;
  const qc = useQueryClient();
  const { user } = useAuth() as any;
  const isSuperAdmin = user?.roles?.some((r: any) => r.name === 'super-admin') ?? false;

  const nameRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<'basic' | 'legal' | 'admin'>('basic');
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', commercial_name: '', email: '', phone: '', mobile: '',
    address: '', nif: '', nis: '', rc: '', ai: '', activity: '',
    legal_form_id: '', wilaya_id: '', commune_id: '',
    active: true, plan: 'free',
    max_users: '', max_warehouses: '', max_products: '',
    notes: '',
  });

  // ── تهيئة الفورم عند الفتح ──────────────────
  useEffect(() => {
    if (!open) return;
    setError('');
    setTab('basic');

    if (company) {
      setForm({
        name:             company.name             ?? '',
        commercial_name:  company.commercial_name  ?? '',
        email:            company.email            ?? '',
        phone:            company.phone            ?? '',
        mobile:           company.mobile           ?? '',
        address:          company.address          ?? '',
        nif:              company.nif              ?? '',
        nis:              company.nis              ?? '',
        rc:               company.rc               ?? '',
        ai:               company.ai               ?? '',
        activity:         company.activity         ?? '',
        legal_form_id:    String(company.legal_form_id ?? ''),
        wilaya_id:        String(company.wilaya_id     ?? ''),
        commune_id:       String(company.commune_id    ?? ''),
        active:        company.active        ?? true,
        plan:             company.plan             ?? 'free',
        max_users:        '',
        max_warehouses:   '',
        max_products:     '',
        notes:            company.notes            ?? '',
      });
    } else {
      setForm({
        name: '', commercial_name: '', email: '', phone: '', mobile: '',
        address: '', nif: '', nis: '', rc: '', ai: '', activity: '',
        legal_form_id: '', wilaya_id: '', commune_id: '',
        active: true, plan: 'free',
        max_users: '', max_warehouses: '', max_products: '',
        notes: '',
      });
    }
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [open, company]);

  // ── Mutation ─────────────────────────────────
  const mutation = useMutation({
    mutationFn: async () => {
      // ① فصل حقول Super Admin عن الحقول الأساسية
      const ADMIN_FIELDS = ['plan', 'max_users', 'max_warehouses', 'max_products', 'notes'];
      const basicPayload: Record<string, any> = {};
      const adminPayload: Record<string, any> = {};

      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        if (ADMIN_FIELDS.includes(k)) adminPayload[k] = v;
        else basicPayload[k] = v;
      });

      ['legal_form_id', 'wilaya_id', 'commune_id'].forEach(k => {
        if (basicPayload[k]) basicPayload[k] = Number(basicPayload[k]);
      });
      ['max_users', 'max_warehouses', 'max_products'].forEach(k => {
        if (adminPayload[k]) adminPayload[k] = Number(adminPayload[k]);
      });

      if (isEdit) {
        const identifier = company!.slug ?? company!.id;

        // ② تحديث البيانات الأساسية
        const res = await client.put(`/companies/${identifier}`, basicPayload);
        const saved = res.data?.data ?? res.data;

        // ③ تحديث الخطة — endpoint منفصل لأن PUT لا يحفظها
        if (isSuperAdmin) {
          const planChanged = form.plan !== (company!.plan ?? 'free');
          const limitsExist = adminPayload.max_users || adminPayload.max_warehouses || adminPayload.max_products;

          if (planChanged || limitsExist) {
            await client.patch(`/companies/${identifier}/plan`, {
              plan:           adminPayload.plan ?? form.plan,
              max_users:      adminPayload.max_users      || undefined,
              max_warehouses: adminPayload.max_warehouses || undefined,
              max_products:   adminPayload.max_products   || undefined,
            });
          }

          // ④ الملاحظات الداخلية
          if (adminPayload.notes !== undefined) {
            await client.patch(`/companies/${identifier}/notes`, {
              notes: adminPayload.notes,
            });
          }
        }

        return saved;
      } else {
        // إنشاء جديد — نجمع كل الحقول
        const res = await client.post('/companies', { ...basicPayload, ...adminPayload });
        return res.data?.data ?? res.data;
      }
    },
    onSuccess: (saved: Company) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (e: unknown) => {
      setError(extractErrorMessage(e, isEdit ? 'فشل تحديث الشركة' : 'فشل إنشاء الشركة'));
    },
  });

  // ── Keyboard close ────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && !mutation.isPending && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [mutation.isPending, onClose]);

  if (!open) return null;

  const f = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(p => ({ ...p, [k]: v }));

  const tabs = [
    { key: 'basic', label: 'المعلومات الأساسية', icon: 'ti-building' },
    { key: 'legal', label: 'الوثائق القانونية',  icon: 'ti-file-certificate' },
    ...(isSuperAdmin ? [{ key: 'admin', label: 'إدارة (Super Admin)', icon: 'ti-shield' }] : []),
  ] as const;

  return (
    <>
      <style>{`
        @keyframes drawerIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes ovFade   { from{opacity:0} to{opacity:1} }
        @keyframes spin     { to{transform:rotate(360deg)} }
      `}</style>

      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 10001,
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, animation: 'ovFade .18s ease',
        }}
        onClick={e => { if (e.target === e.currentTarget && !mutation.isPending) onClose(); }}
      >
        <div style={{
          background: 'var(--bg2)', borderRadius: 20, width: '100%', maxWidth: 640,
          border: '1px solid var(--b3)', boxShadow: '0 24px 64px rgba(0,0,0,.3)',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          animation: 'drawerIn .22s cubic-bezier(.34,1.4,.64,1)',
        }}>

          {/* Header */}
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--b2)',
            display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'var(--emb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, color: 'var(--em)',
            }}>
              <i className={`ti ${isEdit ? 'ti-building-cog' : 'ti-building-plus'}`} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)' }}>
                {isEdit ? `تعديل: ${company!.name}` : 'شركة جديدة'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                {isEdit ? `slug: ${company!.slug}` : 'ملء البيانات الأساسية للبدء'}
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              style={{
                width: 30, height: 30, borderRadius: 8, border: '1px solid var(--b2)',
                background: 'var(--bg3)', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'var(--t3)',
                fontSize: 14, transition: '.13s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--redb)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg3)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--t3)'; }}
            >
              <i className="ti ti-x" />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--b2)', padding: '0 20px', flexShrink: 0 }}>
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? 'var(--em)' : 'transparent'}`,
                color: tab === t.key ? 'var(--em)' : 'var(--t4)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'Tajawal,sans-serif', transition: '.13s', whiteSpace: 'nowrap',
              }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: 14 }} />{t.label}
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 14,
                background: 'var(--redb)', border: '1px solid var(--redbo)',
                color: 'var(--red)', fontSize: 12,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <i className="ti ti-alert-circle" style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
                <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: 'auto', fontSize: 15, padding: 0 }}>×</button>
              </div>
            )}

            {/* ── TAB: المعلومات الأساسية ── */}
            {tab === 'basic' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="اسم الشركة" req>
                    <input
                      ref={nameRef} value={form.name}
                      onChange={e => f('name')(e.target.value)}
                      placeholder="مثال: شركة الأمل للتجارة"
                      style={inputCls}
                      onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                      onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                    />
                  </Field>
                  <Field label="الاسم التجاري">
                    <Input value={form.commercial_name} onChange={f('commercial_name')} placeholder="Amel Trade" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="البريد الإلكتروني">
                    <Input type="email" value={form.email} onChange={f('email')} placeholder="info@company.dz" dir="ltr" />
                  </Field>
                  <Field label="رقم الهاتف">
                    <Input value={form.phone} onChange={f('phone')} placeholder="023 000 000" dir="ltr" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="الموبايل">
                    <Input value={form.mobile} onChange={f('mobile')} placeholder="0550 000 000" dir="ltr" />
                  </Field>
                  <Field label="النشاط التجاري">
                    <Input value={form.activity} onChange={f('activity')} placeholder="تجارة الجملة، صناعة..." />
                  </Field>
                </div>

                <Field label="العنوان">
                  <textarea
                    value={form.address}
                    onChange={e => f('address')(e.target.value)}
                    placeholder="الشارع، الحي، الولاية..."
                    rows={2}
                    style={{ ...inputCls, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                  />
                </Field>

                {/* حالة الشركة */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--b1)',
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t2)', flex: 1 }}>حالة الشركة</span>
                  <div
                    className={`sw ${form.active ? 'on' : ''}`}
                    onClick={() => f('active')(!form.active)}
                    style={{ cursor: 'pointer' }}
                  />
                  <span style={{
                    fontSize: 12, fontWeight: 700, minWidth: 50,
                    color: form.active ? 'var(--em)' : 'var(--red)',
                  }}>
                    {form.active ? 'نشطة' : 'موقوفة'}
                  </span>
                </div>
              </div>
            )}

            {/* ── TAB: الوثائق القانونية ── */}
            {tab === 'legal' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--blueb)', border: '1px solid var(--bluebo)',
                  color: 'var(--blue)', fontSize: 12, display: 'flex', gap: 8,
                }}>
                  <i className="ti ti-info-circle" style={{ flexShrink: 0 }} />
                  أدخل الأرقام الضريبية والتجارية الخاصة بالشركة (اختياري)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="NIF — رقم التعريف الجبائي">
                    <Input value={form.nif} onChange={f('nif')} placeholder="000000000000000" dir="ltr" />
                  </Field>
                  <Field label="NIS — رقم الإحصاء">
                    <Input value={form.nis} onChange={f('nis')} placeholder="000000000000000" dir="ltr" />
                  </Field>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <Field label="RC — السجل التجاري">
                    <Input value={form.rc} onChange={f('rc')} placeholder="00/00-000000B00" dir="ltr" />
                  </Field>
                  <Field label="AI — مقالة الضريبة">
                    <Input value={form.ai} onChange={f('ai')} placeholder="00000000000" dir="ltr" />
                  </Field>
                </div>

                <Field label="الشكل القانوني">
                  <select value={form.legal_form_id} onChange={e => f('legal_form_id')(e.target.value)}
                    style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="">اختر الشكل القانوني</option>
                    <option value="1">مؤسسة فردية</option>
                    <option value="2">SARL</option>
                    <option value="3">SPA</option>
                    <option value="4">SNC</option>
                    <option value="5">EURL</option>
                  </select>
                </Field>
              </div>
            )}

            {/* ── TAB: Super Admin ── */}
            {tab === 'admin' && isSuperAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--purb)', border: '1px solid var(--purbo)',
                  color: 'var(--purple)', fontSize: 12, display: 'flex', gap: 8,
                }}>
                  <i className="ti ti-shield-check" style={{ flexShrink: 0 }} />
                  هذه الإعدادات مرئية للـ Super Admin فقط
                </div>

                <Field label="خطة الاشتراك">
                  <select value={form.plan} onChange={e => f('plan')(e.target.value)}
                    style={{ ...inputCls, cursor: 'pointer' }}>
                    <option value="free">مجاني</option>
                    <option value="starter">مبتدئ</option>
                    <option value="professional">احترافي</option>
                    <option value="enterprise">مؤسسي</option>
                  </select>
                </Field>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  <Field label="حد المستخدمين">
                    <Input value={form.max_users} onChange={f('max_users')} placeholder="3" dir="ltr" />
                  </Field>
                  <Field label="حد المستودعات">
                    <Input value={form.max_warehouses} onChange={f('max_warehouses')} placeholder="1" dir="ltr" />
                  </Field>
                  <Field label="حد المنتجات">
                    <Input value={form.max_products} onChange={f('max_products')} placeholder="500" dir="ltr" />
                  </Field>
                </div>

                <Field label="ملاحظات (داخلية)">
                  <textarea
                    value={form.notes}
                    onChange={e => f('notes')(e.target.value)}
                    placeholder="ملاحظات للإدارة..."
                    rows={3}
                    style={{ ...inputCls, resize: 'vertical' }}
                    onFocus={e => (e.target.style.borderColor = 'var(--em)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--b3)')}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 20px', borderTop: '1px solid var(--b2)', flexShrink: 0,
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            background: 'var(--bg3)', borderRadius: '0 0 20px 20px',
          }}>
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              style={{
                padding: '9px 20px', borderRadius: 10, border: '1px solid var(--b3)',
                background: 'var(--bg4)', color: 'var(--t2)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Tajawal,sans-serif',
              }}
            >
              إلغاء
            </button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !form.name.trim()}
              style={{
                padding: '9px 22px', borderRadius: 10, border: 'none',
                background: form.name.trim() ? 'var(--em)' : 'var(--bg4)',
                color: form.name.trim() ? '#fff' : 'var(--t4)',
                fontSize: 13, fontWeight: 800, cursor: mutation.isPending || !form.name.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'Tajawal,sans-serif', boxShadow: form.name.trim() ? 'var(--emglow)' : 'none',
                display: 'flex', alignItems: 'center', gap: 7, transition: '.13s',
              }}
            >
              {mutation.isPending && (
                <i className="ti ti-loader" style={{ animation: 'spin .8s linear infinite' }} />
              )}
              {mutation.isPending
                ? (isEdit ? 'جارٍ الحفظ...' : 'جارٍ الإنشاء...')
                : (isEdit ? 'حفظ التغييرات' : 'إنشاء الشركة')
              }
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
```

## FILE: resources/js/components/modals/CreateCompanyModal.tsx
```
// ════════════════════════════════════════════════
// components/modals/CreateCompanyModal.tsx
// مودال إنشاء شركة متكامل بخطوتين:
//   الخطوة 1: معلومات الشركة (اسم إلزامي، باقي اختياري)
//   الخطوة 2: السنة المالية الأولى (إلزامية)
// ════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";
import client from "@/lib/api/core/client";
import { appActions } from '@/lib/store/appStore';

// ── Types ─────────────────────────────────────────────────────────
interface Company {
    id: number;
    name: string;
    slug: string;
    commercial_name?: string;
    email?: string;
    phone?: string;
    mobile?: string;
    address?: string;
    nif?: string;
    nis?: string;
    rc?: string;
    ai?: string;
    activity?: string;
    active?: boolean;
    is_suspended?: boolean;
}

interface FiscalYear {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    is_closed: boolean;
}

interface CreateCompanyModalProps {
    onCreated: (company: Company, fiscalYear: FiscalYear) => void;
    onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────
const currentYear = new Date().getFullYear();

// تحويل YYYY-MM-DD إلى تاريخ جميل
function fmtDate(date: string): string {
    const d = date.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
    if (!d) return "—";
    const [y, m, day] = d.split("-");
    const months = [
        "يناير",
        "فبراير",
        "مارس",
        "أبريل",
        "ماي",
        "جوان",
        "جويلية",
        "أوت",
        "سبتمبر",
        "أكتوبر",
        "نوفمبر",
        "ديسمبر",
    ];
    return `${parseInt(day)} ${months[parseInt(m) - 1]} ${y}`;
}

// ── InputField ────────────────────────────────────────────────────
function Field({
    label,
    icon,
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
    hint,
    dir = "rtl",
}: {
    label: string;
    icon: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
    hint?: string;
    dir?: string;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ marginBottom: 12 }}>
            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "var(--t3)",
                    marginBottom: 5,
                    letterSpacing: 0.3,
                }}
            >
                <i
                    className={`ti ${icon}`}
                    style={{ fontSize: 12, color: "var(--em)", opacity: 0.8 }}
                />
                {label}
                {required && (
                    <span style={{ color: "var(--red)", fontSize: 13 }}>*</span>
                )}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                dir={dir}
                style={{
                    width: "100%",
                    padding: "10px 13px",
                    borderRadius: 10,
                    outline: "none",
                    border: `1.5px solid ${focused ? "var(--em)" : "var(--b2)"}`,
                    background: focused ? "var(--bg1)" : "var(--bg3)",
                    color: "var(--t1)",
                    fontFamily: "Tajawal, sans-serif",
                    fontSize: 13,
                    transition: "all .15s",
                    boxShadow: focused ? "0 0 0 3px var(--emb)" : "none",
                }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
            />
            {hint && (
                <div
                    style={{
                        fontSize: 10,
                        color: "var(--t4)",
                        marginTop: 3,
                        paddingRight: 2,
                    }}
                >
                    {hint}
                </div>
            )}
        </div>
    );
}

// ── SectionTitle ──────────────────────────────────────────────────
function SectionTitle({ icon, label }: { icon: string; label: string }) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                fontWeight: 800,
                color: "var(--t4)",
                textTransform: "uppercase",
                letterSpacing: 1.2,
                marginBottom: 12,
                marginTop: 4,
                paddingBottom: 8,
                borderBottom: "1px solid var(--b1)",
            }}
        >
            <i
                className={`ti ${icon}`}
                style={{ fontSize: 13, color: "var(--em)", opacity: 0.7 }}
            />
            {label}
        </div>
    );
}

// ── Step 1: Company Info ──────────────────────────────────────────
function StepCompany({
    onNext,
    onClose,
}: {
    onNext: (company: Company) => void;
    onClose: () => void;
}) {
    // بيانات أساسية (إلزامي: name فقط)
    const [name, setName] = useState("");
    const [commercialName, setCommercialName] = useState("");
    const [activity, setActivity] = useState("");
    const [phone, setPhone] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [address, setAddress] = useState("");
    // وثائق قانونية
    const [nif, setNif] = useState("");
    const [nis, setNis] = useState("");
    const [rc, setRc] = useState("");
    const [ai, setAi] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDocs, setShowDocs] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        nameRef.current?.focus();
    }, []);

    const handleSubmit = async () => {
        const n = name.trim();
        if (!n) {
            setError("اسم الشركة إلزامي");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const payload: Record<string, string> = { name: n };
            if (commercialName.trim())
                payload.commercial_name = commercialName.trim();
            if (activity.trim()) payload.activity = activity.trim();
            if (phone.trim()) payload.phone = phone.trim();
            if (mobile.trim()) payload.mobile = mobile.trim();
            if (email.trim()) payload.email = email.trim();
            if (address.trim()) payload.address = address.trim();
            if (nif.trim()) payload.nif = nif.trim();
            if (nis.trim()) payload.nis = nis.trim();
            if (rc.trim()) payload.rc = rc.trim();
            if (ai.trim()) payload.ai = ai.trim();

            const res = await client.post("/companies", payload);
            const company: Company = res.data?.data ?? res.data;
            onNext(company);
        } catch (e: any) {
            const msg =
                e?.response?.data?.message ??
                e?.response?.data?.error ??
                "فشل إنشاء الشركة";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Header */}
            <div
                style={{
                    background:
                        "linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)",
                    padding: "22px 24px 18px",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                {/* Decorative circles */}
                <div
                    style={{
                        position: "absolute",
                        top: -50,
                        left: -50,
                        width: 160,
                        height: 160,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.06)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -30,
                        right: 10,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.04)",
                    }}
                />
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute",
                        top: 14,
                        left: 16,
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        border: "none",
                        background: "rgba(255,255,255,.15)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backdropFilter: "blur(4px)",
                    }}
                >
                    ×
                </button>

                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 13,
                            background: "rgba(255,255,255,.2)",
                            backdropFilter: "blur(8px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            marginBottom: 10,
                        }}
                    >
                        🏢
                    </div>
                    <div
                        style={{
                            fontSize: 17,
                            fontWeight: 900,
                            color: "#fff",
                            marginBottom: 3,
                        }}
                    >
                        إنشاء شركة جديدة
                    </div>
                    <div
                        style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}
                    >
                        أدخل بيانات شركتك — حقل الاسم إلزامي فقط
                    </div>
                </div>

                {/* Steps indicator */}
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 14,
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 3,
                            background: "rgba(255,255,255,.9)",
                        }}
                    />
                    <div
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 3,
                            background: "rgba(255,255,255,.3)",
                        }}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 5,
                    }}
                >
                    <span
                        style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,.9)",
                            fontWeight: 700,
                        }}
                    >
                        معلومات الشركة
                    </span>
                    <span
                        style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}
                    >
                        السنة المالية
                    </span>
                </div>
            </div>

            {/* Body */}
            <div
                style={{
                    padding: "20px 22px",
                    overflowY: "auto",
                    maxHeight: "calc(85vh - 200px)",
                }}
            >
                {error && (
                    <div
                        style={{
                            padding: "9px 13px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <i
                            className="ti ti-alert-circle"
                            style={{ fontSize: 14 }}
                        />
                        {error}
                    </div>
                )}

                {/* ── المعلومات الأساسية */}
                <SectionTitle icon="ti-building" label="المعلومات الأساسية" />

                {/* اسم الشركة — مميز وإلزامي */}
                <div style={{ marginBottom: 14 }}>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 800,
                            color: "var(--t2)",
                            marginBottom: 6,
                        }}
                    >
                        <i
                            className="ti ti-building-store"
                            style={{ color: "var(--em)", fontSize: 13 }}
                        />
                        اسم الشركة
                        <span style={{ color: "var(--red)", fontSize: 14 }}>
                            *
                        </span>
                        <span
                            style={{
                                fontSize: 9,
                                padding: "1px 8px",
                                borderRadius: 20,
                                background: "var(--emb)",
                                color: "var(--em)",
                                fontWeight: 700,
                                marginRight: 2,
                            }}
                        >
                            إلزامي
                        </span>
                    </label>
                    <input
                        ref={nameRef}
                        value={name}
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                        placeholder="مثال: شركة الأمل للتجارة والخدمات"
                        dir="rtl"
                        style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 11,
                            outline: "none",
                            border: `2px solid ${name.trim() ? "var(--em)" : "var(--b2)"}`,
                            background: name.trim()
                                ? "var(--emb)"
                                : "var(--bg3)",
                            color: "var(--t1)",
                            fontFamily: "Tajawal, sans-serif",
                            fontSize: 14,
                            fontWeight: 700,
                            transition: "all .15s",
                            boxShadow: name.trim()
                                ? "0 0 0 3px var(--emb)"
                                : "none",
                        }}
                        onFocus={(e) => {
                            e.target.style.borderColor = "var(--em)";
                            e.target.style.background = "var(--emb)";
                        }}
                        onBlur={(e) => {
                            if (!e.target.value.trim()) {
                                e.target.style.borderColor = "var(--b2)";
                                e.target.style.background = "var(--bg3)";
                            }
                        }}
                    />
                </div>

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0 12px",
                    }}
                >
                    <Field
                        label="الاسم التجاري"
                        icon="ti-certificate"
                        value={commercialName}
                        onChange={setCommercialName}
                        placeholder="الاسم التجاري (اختياري)"
                    />
                    <Field
                        label="النشاط / القطاع"
                        icon="ti-briefcase"
                        value={activity}
                        onChange={setActivity}
                        placeholder="مثال: تجارة جملة"
                    />
                </div>

                {/* ── معلومات التواصل */}
                <SectionTitle icon="ti-phone" label="معلومات التواصل" />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0 12px",
                    }}
                >
                    <Field
                        label="الهاتف"
                        icon="ti-phone"
                        value={phone}
                        onChange={setPhone}
                        placeholder="023 xx xx xx"
                        type="tel"
                        dir="ltr"
                    />
                    <Field
                        label="الجوال"
                        icon="ti-device-mobile"
                        value={mobile}
                        onChange={setMobile}
                        placeholder="06 xx xx xx xx"
                        type="tel"
                        dir="ltr"
                    />
                </div>

                <Field
                    label="البريد الإلكتروني"
                    icon="ti-mail"
                    value={email}
                    onChange={setEmail}
                    placeholder="contact@company.dz"
                    type="email"
                    dir="ltr"
                />

                <Field
                    label="العنوان"
                    icon="ti-map-pin"
                    value={address}
                    onChange={setAddress}
                    placeholder="الشارع، البلدية، الولاية"
                />

                {/* ── الوثائق القانونية (قابلة للطي) */}
                <button
                    onClick={() => setShowDocs((v) => !v)}
                    style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: 10,
                        border: "1px dashed var(--b3)",
                        background: "transparent",
                        color: "var(--t4)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: showDocs ? 14 : 4,
                        transition: "all .15s",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg3)";
                        e.currentTarget.style.color = "var(--t2)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--t4)";
                    }}
                >
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                        }}
                    >
                        <i
                            className="ti ti-file-text"
                            style={{ fontSize: 13 }}
                        />
                        الوثائق القانونية والجبائية
                        <span
                            style={{
                                fontSize: 9,
                                padding: "1px 6px",
                                borderRadius: 10,
                                background: "var(--bg4)",
                                color: "var(--t4)",
                            }}
                        >
                            اختياري
                        </span>
                    </span>
                    <i
                        className={`ti ti-chevron-${showDocs ? "up" : "down"}`}
                        style={{ fontSize: 12 }}
                    />
                </button>

                {showDocs && (
                    <div
                        style={{
                            background: "var(--bg3)",
                            borderRadius: 12,
                            border: "1px solid var(--b1)",
                            padding: "14px 14px 4px",
                            marginBottom: 14,
                            animation: "slidedown .2s ease",
                        }}
                    >
                        <SectionTitle
                            icon="ti-license"
                            label="الأرقام الجبائية"
                        />
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "0 12px",
                            }}
                        >
                            <Field
                                label="رقم NIF"
                                icon="ti-hash"
                                value={nif}
                                onChange={setNif}
                                placeholder="NIF"
                                dir="ltr"
                                hint="رقم التعريف الجبائي"
                            />
                            <Field
                                label="رقم NIS"
                                icon="ti-hash"
                                value={nis}
                                onChange={setNis}
                                placeholder="NIS"
                                dir="ltr"
                                hint="رقم التعريف الإحصائي"
                            />
                            <Field
                                label="رقم RC"
                                icon="ti-building-community"
                                value={rc}
                                onChange={setRc}
                                placeholder="السجل التجاري"
                                dir="ltr"
                            />
                            <Field
                                label="رقم AI"
                                icon="ti-receipt-2"
                                value={ai}
                                onChange={setAi}
                                placeholder="مقالة الضريبة"
                                dir="ltr"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: "12px 22px 20px",
                    borderTop: "1px solid var(--b1)",
                    display: "flex",
                    gap: 10,
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        flex: 1,
                        padding: "11px",
                        borderRadius: 12,
                        border: "1px solid var(--b3)",
                        background: "var(--bg3)",
                        color: "var(--t3)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        transition: ".13s",
                    }}
                >
                    إلغاء
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={loading || !name.trim()}
                    style={{
                        flex: 2,
                        padding: "11px",
                        borderRadius: 12,
                        border: "none",
                        background: name.trim() ? "var(--em)" : "var(--b2)",
                        color: name.trim() ? "#fff" : "var(--t4)",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor:
                            loading || !name.trim() ? "not-allowed" : "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        boxShadow: name.trim() ? "var(--emglow)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "all .15s",
                    }}
                >
                    {loading ? (
                        <>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    border: "2px solid rgba(255,255,255,.3)",
                                    borderTopColor: "#fff",
                                    animation: "spin .7s linear infinite",
                                }}
                            />
                            جارٍ الإنشاء...
                        </>
                    ) : (
                        <>
                            <span>التالي: السنة المالية</span>
                            <i
                                className="ti ti-arrow-left"
                                style={{ fontSize: 14 }}
                            />
                        </>
                    )}
                </button>
            </div>
        </>
    );
}

// ── Step 2: Fiscal Year ───────────────────────────────────────────
function StepFiscalYear({
    company,
    onDone,
    onBack,
}: {
    company: Company;
    onDone: (fy: FiscalYear) => void;
    onBack: () => void;
}) {
    const [yearNum, setYearNum] = useState(String(currentYear));
    const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
    const [useCustom, setUseCustom] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // تحديث التواريخ تلقائياً عند تغيير السنة
    useEffect(() => {
        const y = parseInt(yearNum);
        if (!isNaN(y) && y >= 2000 && y <= 2100 && !useCustom) {
            setStartDate(`${y}-01-01`);
            setEndDate(`${y}-12-31`);
        }
    }, [yearNum, useCustom]);

    const handleCreate = async () => {
        const y = parseInt(yearNum);
        if (isNaN(y) || y < 2000 || y > 2100) {
            setError("أدخل سنة صحيحة بين 2000 و 2100");
            return;
        }
        if (startDate >= endDate) {
            setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
            return;
        }
        setLoading(true);
  setError(null);
  try {
    const res = await client.post(`/${company.slug}/fiscal-years`, {
      name: yearNum,
      start_date: startDate,
      end_date: endDate,
      is_current: true,
    }, { _skipSlug: true } as any); // ✅ إضافة _skipSlug

    const fy: FiscalYear = res.data?.data ?? res.data;
    onDone(fy);
  } catch (e: any) {
    setError(e?.response?.data?.message ?? "فشل إنشاء السنة المالية");
  } finally {
    setLoading(false);
  }
};

    const validYear =
        !isNaN(parseInt(yearNum)) &&
        parseInt(yearNum) >= 2000 &&
        parseInt(yearNum) <= 2100;

    return (
        <>
            {/* Header */}
            <div
                style={{
                    background:
                        "linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)",
                    padding: "22px 24px 18px",
                    position: "relative",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        top: -50,
                        left: -50,
                        width: 160,
                        height: 160,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.06)",
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: -30,
                        right: 10,
                        width: 100,
                        height: 100,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,.04)",
                    }}
                />

                <button
                    onClick={onBack}
                    style={{
                        position: "absolute",
                        top: 14,
                        left: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,.25)",
                        background: "rgba(255,255,255,.1)",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "Tajawal, sans-serif",
                    }}
                >
                    <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
                    رجوع
                </button>

                <div style={{ position: "relative" }}>
                    <div
                        style={{
                            width: 46,
                            height: 46,
                            borderRadius: 13,
                            background: "rgba(255,255,255,.2)",
                            backdropFilter: "blur(8px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 22,
                            marginBottom: 10,
                        }}
                    >
                        🗓️
                    </div>
                    <div
                        style={{
                            fontSize: 17,
                            fontWeight: 900,
                            color: "#fff",
                            marginBottom: 3,
                        }}
                    >
                        السنة المالية الأولى
                    </div>
                    <div
                        style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}
                    >
                        لـ{" "}
                        <strong style={{ color: "#fff" }}>
                            {company.name}
                        </strong>
                    </div>
                </div>

                {/* Steps */}
                <div
                    style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 14,
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 3,
                            background: "rgba(255,255,255,.4)",
                        }}
                    />
                    <div
                        style={{
                            flex: 1,
                            height: 3,
                            borderRadius: 3,
                            background: "rgba(255,255,255,.9)",
                        }}
                    />
                </div>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginTop: 5,
                    }}
                >
                    <span
                        style={{ fontSize: 9, color: "rgba(255,255,255,.5)" }}
                    >
                        معلومات الشركة ✓
                    </span>
                    <span
                        style={{
                            fontSize: 9,
                            color: "rgba(255,255,255,.9)",
                            fontWeight: 700,
                        }}
                    >
                        السنة المالية
                    </span>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 22px" }}>
                {/* Notice */}
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        marginBottom: 16,
                        background: "var(--emb)",
                        border: "1px solid var(--embo)",
                        color: "var(--em)",
                        fontSize: 12,
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                    }}
                >
                    <i
                        className="ti ti-info-circle"
                        style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}
                    />
                    <span>
                        السنة المالية ضرورية للبدء بتسجيل الفواتير والحركات
                        المالية. يمكنك إضافة سنوات أخرى لاحقاً.
                    </span>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "9px 13px",
                            borderRadius: 10,
                            marginBottom: 14,
                            background: "var(--redb)",
                            border: "1px solid var(--redbo)",
                            color: "var(--red)",
                            fontSize: 12,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                        }}
                    >
                        <i className="ti ti-alert-circle" />
                        {error}
                    </div>
                )}

                {/* السنة */}
                <div style={{ marginBottom: 16 }}>
                    <label
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "var(--t3)",
                            marginBottom: 6,
                        }}
                    >
                        <i
                            className="ti ti-calendar"
                            style={{ color: "var(--em)", fontSize: 12 }}
                        />
                        السنة
                        <span style={{ color: "var(--red)", fontSize: 13 }}>
                            *
                        </span>
                    </label>

                    {/* Quick year picker */}
                    <div
                        style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 8,
                            flexWrap: "wrap",
                        }}
                    >
                        {[currentYear - 1, currentYear, currentYear + 1].map(
                            (y) => (
                                <button
                                    key={y}
                                    onClick={() => {
                                        setYearNum(String(y));
                                        setError(null);
                                    }}
                                    style={{
                                        padding: "7px 16px",
                                        borderRadius: 20,
                                        fontSize: 13,
                                        fontWeight: 800,
                                        border: `2px solid ${yearNum === String(y) ? "var(--em)" : "var(--b2)"}`,
                                        background:
                                            yearNum === String(y)
                                                ? "var(--em)"
                                                : "var(--bg3)",
                                        color:
                                            yearNum === String(y)
                                                ? "#fff"
                                                : "var(--t2)",
                                        cursor: "pointer",
                                        fontFamily: "Tajawal, sans-serif",
                                        transition: "all .13s",
                                        boxShadow:
                                            yearNum === String(y)
                                                ? "var(--emglow)"
                                                : "none",
                                    }}
                                >
                                    {y}
                                    {y === currentYear && (
                                        <span
                                            style={{
                                                fontSize: 8,
                                                marginRight: 4,
                                                opacity: 0.8,
                                            }}
                                        >
                                            الحالية
                                        </span>
                                    )}
                                </button>
                            ),
                        )}
                        <input
                            type="number"
                            value={yearNum}
                            onChange={(e) => {
                                setYearNum(e.target.value);
                                setError(null);
                            }}
                            min={2000}
                            max={2100}
                            dir="ltr"
                            style={{
                                width: 90,
                                padding: "7px 10px",
                                borderRadius: 20,
                                border: `2px solid ${![String(currentYear - 1), String(currentYear), String(currentYear + 1)].includes(yearNum) && validYear ? "var(--em)" : "var(--b2)"}`,
                                background: "var(--bg3)",
                                color: "var(--t1)",
                                fontFamily: "Tajawal, sans-serif",
                                fontSize: 13,
                                fontWeight: 700,
                                outline: "none",
                                textAlign: "center",
                            }}
                            placeholder="أخرى"
                            onFocus={(e) =>
                                (e.target.style.borderColor = "var(--em)")
                            }
                            onBlur={(e) => {
                                if (!validYear)
                                    e.target.style.borderColor = "var(--red)";
                            }}
                        />
                    </div>
                </div>

                {/* Toggle custom dates */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--bg3)",
                        border: "1px solid var(--b1)",
                        marginBottom: useCustom ? 14 : 0,
                        cursor: "pointer",
                    }}
                    onClick={() => setUseCustom((v) => !v)}
                >
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "var(--t2)",
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                        }}
                    >
                        <i
                            className="ti ti-calendar-event"
                            style={{ color: "var(--em)", fontSize: 13 }}
                        />
                        تواريخ مخصصة
                    </span>
                    <div
                        style={{
                            width: 36,
                            height: 20,
                            borderRadius: 20,
                            position: "relative",
                            background: useCustom ? "var(--em)" : "var(--b3)",
                            transition: "all .2s",
                            boxShadow: useCustom ? "var(--emglow)" : "none",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                top: 2,
                                width: 16,
                                height: 16,
                                borderRadius: "50%",
                                background: "#fff",
                                transition: "all .2s",
                                left: useCustom ? 18 : 2,
                                boxShadow: "0 1px 4px rgba(0,0,0,.2)",
                            }}
                        />
                    </div>
                </div>

                {useCustom && (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "0 12px",
                            animation: "slidedown .2s ease",
                        }}
                    >
                        <div style={{ marginBottom: 12 }}>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--t3)",
                                    marginBottom: 5,
                                }}
                            >
                                <i
                                    className="ti ti-calendar-plus"
                                    style={{
                                        color: "var(--em)",
                                        fontSize: 11,
                                        marginLeft: 4,
                                    }}
                                />
                                تاريخ البداية
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    borderRadius: 10,
                                    outline: "none",
                                    border: "1.5px solid var(--b2)",
                                    background: "var(--bg3)",
                                    color: "var(--t1)",
                                    fontFamily: "Tajawal, sans-serif",
                                    fontSize: 12,
                                }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b2)")
                                }
                            />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: "var(--t3)",
                                    marginBottom: 5,
                                }}
                            >
                                <i
                                    className="ti ti-calendar-minus"
                                    style={{
                                        color: "var(--em)",
                                        fontSize: 11,
                                        marginLeft: 4,
                                    }}
                                />
                                تاريخ النهاية
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "9px 12px",
                                    borderRadius: 10,
                                    outline: "none",
                                    border: "1.5px solid var(--b2)",
                                    background: "var(--bg3)",
                                    color: "var(--t1)",
                                    fontFamily: "Tajawal, sans-serif",
                                    fontSize: 12,
                                }}
                                onFocus={(e) =>
                                    (e.target.style.borderColor = "var(--em)")
                                }
                                onBlur={(e) =>
                                    (e.target.style.borderColor = "var(--b2)")
                                }
                            />
                        </div>
                    </div>
                )}

                {/* Preview */}
                {validYear && (
                    <div
                        style={{
                            marginTop: 14,
                            padding: "12px 14px",
                            borderRadius: 12,
                            background: "var(--bg3)",
                            border: "1px solid var(--b1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            animation: "fadeup .2s ease",
                        }}
                    >
                        <div
                            style={{
                                width: 42,
                                height: 42,
                                borderRadius: 11,
                                flexShrink: 0,
                                background:
                                    "linear-gradient(135deg, var(--em), var(--em3))",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                boxShadow: "var(--emglow)",
                            }}
                        >
                            📅
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontSize: 14,
                                    fontWeight: 800,
                                    color: "var(--em)",
                                }}
                            >
                                السنة المالية {yearNum}
                                <span
                                    style={{
                                        fontSize: 9,
                                        marginRight: 8,
                                        padding: "2px 8px",
                                        borderRadius: 20,
                                        background: "var(--em)",
                                        color: "#fff",
                                        fontWeight: 700,
                                    }}
                                >
                                    الحالية
                                </span>
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    color: "var(--t4)",
                                    marginTop: 2,
                                }}
                            >
                                {fmtDate(startDate)} — {fmtDate(endDate)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    padding: "12px 22px 20px",
                    borderTop: "1px solid var(--b1)",
                    display: "flex",
                    gap: 10,
                }}
            >
                <button
                    onClick={onBack}
                    style={{
                        flex: 1,
                        padding: "11px",
                        borderRadius: 12,
                        border: "1px solid var(--b3)",
                        background: "var(--bg3)",
                        color: "var(--t3)",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        transition: ".13s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                    }}
                >
                    <i className="ti ti-arrow-right" style={{ fontSize: 13 }} />
                    رجوع
                </button>
                <button
                    onClick={handleCreate}
                    disabled={loading || !validYear}
                    style={{
                        flex: 2,
                        padding: "11px",
                        borderRadius: 12,
                        border: "none",
                        background: validYear ? "var(--em)" : "var(--b2)",
                        color: validYear ? "#fff" : "var(--t4)",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor:
                            loading || !validYear ? "not-allowed" : "pointer",
                        fontFamily: "Tajawal, sans-serif",
                        boxShadow: validYear ? "var(--emglow)" : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "all .15s",
                    }}
                >
                    {loading ? (
                        <>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    border: "2px solid rgba(255,255,255,.3)",
                                    borderTopColor: "#fff",
                                    animation: "spin .7s linear infinite",
                                }}
                            />
                            جارٍ الإنشاء...
                        </>
                    ) : (
                        <>
                            <i
                                className="ti ti-check"
                                style={{ fontSize: 15 }}
                            />
                            إنشاء والدخول
                        </>
                    )}
                </button>
            </div>
        </>
    );
}

// ── Step 3: Success ───────────────────────────────────────────────
function StepSuccess({
    company,
    fiscalYear,
}: {
    company: Company;
    fiscalYear: FiscalYear;
}) {
    return (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
            <div
                style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    margin: "0 auto 16px",
                    background:
                        "linear-gradient(135deg, var(--em), var(--em3))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 32,
                    boxShadow: "var(--emglow)",
                    animation: "popIn .5s cubic-bezier(.34,1.6,.64,1)",
                }}
            >
                ✓
            </div>
            <div
                style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "var(--t1)",
                    marginBottom: 6,
                }}
            >
                تم إنشاء الشركة! 🎉
            </div>
            <div
                style={{
                    fontSize: 13,
                    color: "var(--t4)",
                    marginBottom: 20,
                    lineHeight: 1.7,
                }}
            >
                <strong style={{ color: "var(--em)" }}>{company.name}</strong>
                <br />
                السنة المالية{" "}
                <strong style={{ color: "var(--t2)" }}>
                    {fiscalYear.name}
                </strong>{" "}
                جاهزة
            </div>
            <div
                style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "var(--emb)",
                    border: "1px solid var(--embo)",
                    color: "var(--em)",
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        animation: "spin .8s linear infinite",
                        fontSize: 16,
                    }}
                >
                    ⟳
                </span>
                جارٍ تحويلك...
            </div>
        </div>
    );
}

// ── Main Modal ────────────────────────────────────────────────────
export function CreateCompanyModal({
    onCreated,
    onClose,
}: CreateCompanyModalProps) {
    type Step = "company" | "fiscal" | "success";
    const [step, setStep] = useState<Step>("company");
    const [company, setCompany] = useState<Company | null>(null);
    const [fiscalYear, setFiscalYear] = useState<FiscalYear | null>(null);

    const handleCompanyCreated = useCallback((c: Company) => {
        setCompany(c);
        setStep("fiscal");
    }, []);

    const handleFiscalDone = useCallback(
        (fy: FiscalYear) => {
            setFiscalYear(fy);
            setStep("success");
            // نستدعي onCreated فوراً — التأخير كان يسبب فقدان navigate state في SetupHub
            // StepSuccess تعرض رسالة النجاح لكن onCreated يُطلق الـ navigate فوراً
            if (company) onCreated(company, fy);
        },
        [company, onCreated],
    );

    return (
        <>
            <style>{`
        @keyframes fadein  { from{opacity:0} to{opacity:1} }
        @keyframes slideup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes slidedown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes fadeup  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes popIn   { from{opacity:0;transform:scale(.5)} to{opacity:1;transform:scale(1)} }
      `}</style>

            {/* Overlay */}
            <div
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 10010,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(0,0,0,.72)",
                    backdropFilter: "blur(8px)",
                    padding: 16,
                    animation: "fadein .18s ease",
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget && step !== "success")
                        onClose();
                }}
            >
                {/* Modal */}
                <div
                    style={{
                        background: "var(--bg2)",
                        borderRadius: 20,
                        width: "100%",
                        maxWidth: 520,
                        border: "1px solid var(--b3)",
                        boxShadow: "0 28px 72px rgba(0,0,0,.4)",
                        overflow: "hidden",
                        animation: "slideup .25s cubic-bezier(.34,1.4,.64,1)",
                        direction: "rtl",
                    }}
                >
                    {step === "company" && (
                        <StepCompany
                            onNext={handleCompanyCreated}
                            onClose={onClose}
                        />
                    )}
                    {step === "fiscal" && company && (
                        <StepFiscalYear
                            company={company}
                            onDone={handleFiscalDone}
                            onBack={() => setStep("company")}
                        />
                    )}
                    {step === "success" && company && fiscalYear && (
                        <StepSuccess
                            company={company}
                            fiscalYear={fiscalYear}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export default CreateCompanyModal;
```

## FILE: resources/js/components/modals/DataSeedingModal.tsx
```
// ════════════════════════════════════════════════════════════════════
// components/modals/DataSeedingModal.tsx
// ✅ مصحح + تجربة بصرية جديدة:
//   - السيدر الجاري يظهر أعلى القائمة في بطاقة بارزة
//   - كل عنصر مكتمل يبقى مرئياً ويتراكم
//   - auto-scroll للعنصر النشط
// ════════════════════════════════════════════════════════════════════
import React, { useState, useCallback, useRef, useEffect } from 'react';
import client from '@/lib/api/core/client';
import Modal from '@/components/ui/Modal';

interface SeedItem  { key: string; label: string; endpoint: string; }
interface SeedGroup {
  id: string; label: string; description: string;
  icon: string; required: boolean; recommended: boolean;
  seeds: SeedItem[];
  tabler: string;
}

type SeedStatus = 'idle' | 'running' | 'done' | 'error';
interface SeedLog { key: string; label: string; status: SeedStatus; message?: string; }

const SEED_GROUPS: SeedGroup[] = [
  {
    id: 'lookups', label: 'الجداول المرجعية',
    description: 'عملات · ضرائب TVA · وحدات · أشكال قانونية · أسعار',
    icon: '⚙️', tabler: 'ti-adjustments-horizontal',
    required: true, recommended: true,
    seeds: [
      { key: 'currencies',    label: 'العملات',             endpoint: 'currencies' },
      { key: 'tvas',          label: 'نسب الضريبة TVA',     endpoint: 'tvas' },
      { key: 'units',         label: 'وحدات القياس',         endpoint: 'units' },
      { key: 'legal_forms',   label: 'الأشكال القانونية',   endpoint: 'legal-forms' },
      { key: 'fiscal_stamps', label: 'طوابع الدفع',          endpoint: 'fiscal-stamps' },
      { key: 'price_levels',  label: 'مستويات الأسعار',     endpoint: 'price-levels' },
    ],
  },
  {
    id: 'inventory', label: 'تقييم المخزون',
    description: 'FIFO · LIFO · المتوسط المرجح',
    icon: '📦', tabler: 'ti-package',
    required: false, recommended: true,
    seeds: [{ key: 'valuation_methods', label: 'طرق تقييم المخزون', endpoint: 'inventory-valuation-methods' }],
  },
  {
    id: 'geography', label: 'البيانات الجغرافية',
    description: '58 ولاية جزائرية وجميع البلديات',
    icon: '🗺️', tabler: 'ti-map-pin',
    required: false, recommended: true,
    seeds: [{ key: 'wilayas_communes', label: 'الولايات والبلديات', endpoint: 'wilayas-communes' }],
  },
  {
    id: 'warehouse', label: 'المستودع الرئيسي',
    description: 'مستودع جاهز للاستخدام الفوري',
    icon: '🏭', tabler: 'ti-building-warehouse',
    required: false, recommended: true,
    seeds: [{ key: 'warehouse', label: 'مستودع رئيسي', endpoint: 'warehouses' }],
  },
  {
    id: 'finance', label: 'الخزينة والدفع',
    description: 'أنواع حسابات · خزينة · طرق الدفع',
    icon: '💰', tabler: 'ti-cash',
    required: false, recommended: true,
    seeds: [
      { key: 'treasury_accounts', label: 'حسابات الخزينة',   endpoint: 'treasury-accounts' },
      { key: 'payment_modes',     label: 'طرق الدفع',         endpoint: 'payment-modes' },
    ],
  },
  {
    id: 'documents', label: 'الوثائق التجارية',
    description: 'فواتير · أوامر شراء · عروض أسعار · ترقيم',
    icon: '📄', tabler: 'ti-file-invoice',
    required: true, recommended: true,
    seeds: [
      { key: 'doc_base_ops',     label: 'العمليات الأساسية',      endpoint: 'document-base-operations' },
      { key: 'doc_statuses',     label: 'حالات الوثائق',          endpoint: 'document-statuses' },
      { key: 'document_types',   label: 'أنواع الوثائق',          endpoint: 'document-types' },
      { key: 'numbering_series', label: 'سلاسل الترقيم التلقائي', endpoint: 'numbering-series' },
    ],
  },
  {
    id: 'expenses', label: 'تصنيفات المصروفات',
    description: 'فئات المصروفات الشائعة',
    icon: '🧾', tabler: 'ti-receipt',
    required: false, recommended: false,
    seeds: [{ key: 'expense_categories', label: 'تصنيفات المصروفات', endpoint: 'expense-categories' }],
  },
];

interface Props {
  companySlug: string;
  companyName: string;
  onClose: () => void;
  onComplete: () => void;
}

export default function DataSeedingModal({ companySlug, companyName, onClose, onComplete }: Props) {
  type Phase = 'select' | 'applying' | 'done';
  const [phase, setPhase]           = useState<Phase>('select');
  const [enabled, setEnabled]       = useState<Set<string>>(
    () => new Set(SEED_GROUPS.filter(g => g.required || g.recommended).map(g => g.id))
  );
  const [logs, setLogs]             = useState<SeedLog[]>([]);
  const [totalDone, setTotalDone]   = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasErrors, setHasErrors]   = useState(false);
  const [currentKey, setCurrentKey] = useState('');

  // ref لكل سجل — للـ auto-scroll
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectedGroups = SEED_GROUPS.filter(g => enabled.has(g.id));
  const selectedSeeds  = selectedGroups.flatMap(g => g.seeds);
  const progress = totalCount > 0 ? Math.round((totalDone / totalCount) * 100) : 0;

  // scroll للعنصر النشط حين يتغير
  useEffect(() => {
    if (currentKey && itemRefs.current[currentKey]) {
      itemRefs.current[currentKey]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentKey]);

const handleApply = async () => {
  if (selectedSeeds.length === 0) { onComplete(); return; }
  setTotalCount(selectedSeeds.length);
  setTotalDone(0);
  setHasErrors(false);
  setPhase('applying');
  setLogs(selectedSeeds.map(s => ({ key: s.key, label: s.label, status: 'idle' })));

  let done = 0, errors = false;
  // الحصول على التوكن من localStorage
  const token = localStorage.getItem('auth_token');

  for (const seed of selectedSeeds) {
    setCurrentKey(seed.key);
    setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'running' } : l));
    try {
      // ✅ استخدام fetch مباشرة بدلاً من client.post
      const response = await fetch(`/api/v1/${companySlug}/seeds/${seed.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'فشل');
      }

      done++;
      setTotalDone(done);
      setLogs(prev => prev.map(l => l.key === seed.key ? { ...l, status: 'done' } : l));
    } catch (err: any) {
      errors = true;
      done++;
      setTotalDone(done);
      setLogs(prev => prev.map(l =>
        l.key === seed.key
          ? { ...l, status: 'error', message: err?.message ?? 'فشل' }
          : l
      ));
    }
  }
  setCurrentKey('');
  setHasErrors(errors);
  setPhase('done');
};
  const toggleGroup = (id: string) => {
    const g = SEED_GROUPS.find(g => g.id === id);
    if (g?.required) return;
    setEnabled(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const totalSelected = selectedSeeds.length;
  const totalAll      = SEED_GROUPS.flatMap(g => g.seeds).length;

  // ─────────────────────────────────────────────────────────
  // PHASE: select
  // ─────────────────────────────────────────────────────────
  const renderSelect = () => (
    <div>
      {/* ملخص */}
      <div style={{
        background: 'var(--emb, rgba(10,138,92,.08))',
        border: '1px solid var(--embo, rgba(10,138,92,.18))',
        borderRadius: 14, padding: '14px 18px', marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 14, direction: 'rtl',
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'var(--em)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <i className="ti ti-database-import" style={{ color: '#fff', fontSize: 20 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)', marginBottom: 2 }}>{companyName}</div>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>
            {totalSelected} عنصر من أصل {totalAll} • {selectedGroups.length} مجموعة محددة
          </div>
        </div>
        <div style={{ textAlign: 'center', direction: 'ltr' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--em)', lineHeight: 1 }}>{totalSelected}</div>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700 }}>عنصر</div>
        </div>
      </div>

      {/* قائمة المجموعات */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SEED_GROUPS.map((group, idx) => {
          const isOn = enabled.has(group.id);
          return (
            <div
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              style={{
                borderRadius: 12,
                border: `1.5px solid ${isOn ? 'var(--em)' : 'var(--b2)'}`,
                background: isOn ? 'var(--emb, rgba(10,138,92,.06))' : 'var(--bg3)',
                padding: '12px 16px',
                cursor: group.required ? 'default' : 'pointer',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 12,
                direction: 'rtl',
                animation: `slideInRow .25s ease ${idx * 0.04}s both`,
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: isOn ? 'var(--em)' : 'var(--bg4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .15s',
              }}>
                <i className={`ti ${group.tabler}`} style={{ fontSize: 18, color: isOn ? '#fff' : 'var(--t4)' }} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--t1)' }}>{group.label}</span>
                  {group.required && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 20,
                      background: 'var(--em)', color: '#fff', letterSpacing: .5,
                    }}>إلزامي</span>
                  )}
                  {!group.required && group.recommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
                      background: 'var(--goldb, rgba(184,125,10,.1))',
                      color: 'var(--gold, #b87d0a)',
                      border: '1px solid var(--goldbo, rgba(184,125,10,.2))',
                    }}>موصى به</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {group.description}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {isOn && (
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: 'var(--em)',
                    background: 'var(--emb)', padding: '2px 8px', borderRadius: 20,
                  }}>
                    {group.seeds.length}
                  </span>
                )}
                {group.required ? (
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--em)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-lock" style={{ fontSize: 11, color: '#fff' }} />
                  </div>
                ) : (
                  <div style={{
                    width: 36, height: 20, borderRadius: 10,
                    background: isOn ? 'var(--em)' : 'var(--b3)',
                    position: 'relative', transition: 'background .2s', flexShrink: 0,
                  }}>
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 2,
                      right: isOn ? 2 : 18,
                      transition: 'right .2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideInRow {
          from { opacity: 0; transform: translateX(10px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // PHASE: applying — التجربة البصرية الجديدة
  // ─────────────────────────────────────────────────────────
  const renderApplying = () => {
    const currentLog = logs.find(l => l.status === 'running');
    const doneLogs   = logs.filter(l => l.status === 'done' || l.status === 'error');
    const idleLogs   = logs.filter(l => l.status === 'idle');

    return (
      <div style={{ direction: 'rtl' }}>

        {/* ── شريط التقدم العلوي ── */}
        <div style={{
          background: 'var(--bg3)', borderRadius: 14, padding: '14px 18px', marginBottom: 14,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--t4)', fontWeight: 600 }}>
              {totalDone} / {totalCount} عنصر
            </span>
            <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)' }}>{progress}%</span>
          </div>
          <div style={{ height: 7, background: 'var(--b2)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: 'linear-gradient(90deg, var(--em), var(--em) 80%, rgba(10,138,92,.4))',
              width: `${progress}%`,
              transition: 'width .5s cubic-bezier(.4,0,.2,1)',
              position: 'relative',
            }}>
              {/* نبضة عند نهاية الشريط */}
              <div style={{
                position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--em)',
                boxShadow: '0 0 0 3px var(--emb)',
                animation: 'pingPulse 1.2s ease infinite',
              }} />
            </div>
          </div>
        </div>

        {/* ── بطاقة السيدر النشط (الأهم — دائماً في الأعلى) ── */}
        {currentLog && (
          <div style={{
            borderRadius: 14,
            border: '2px solid var(--em)',
            background: 'var(--emb, rgba(10,138,92,.06))',
            padding: '14px 18px',
            marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 14,
            animation: 'slideInActive .3s cubic-bezier(.34,1.56,.64,1)',
            boxShadow: '0 0 0 4px var(--embo, rgba(10,138,92,.08))',
          }}>
            {/* دائرة نبض */}
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: 'var(--em)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 6px var(--emb)',
              animation: 'glowPulse 1.4s ease infinite',
            }}>
              <i className="ti ti-loader-2" style={{
                fontSize: 20, color: '#fff',
                animation: 'spin .8s linear infinite',
              }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 3, fontWeight: 600 }}>
                جارٍ التطبيق الآن...
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--t1)' }}>
                {currentLog.label}
              </div>
            </div>

            {/* مؤشر الخطوة */}
            <div style={{ textAlign: 'center', direction: 'ltr' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--em)', lineHeight: 1 }}>
                {totalDone + 1}
              </div>
              <div style={{ fontSize: 9, color: 'var(--t4)', fontWeight: 700 }}>من {totalCount}</div>
            </div>
          </div>
        )}

        {/* ── قائمة العمليات المكتملة + المنتظرة ── */}
        <div style={{
          maxHeight: 240,
          overflowY: 'auto',
          borderRadius: 12,
          border: '1px solid var(--b1)',
        }}>
          {logs.map((log, i) => {
            const isRunning = log.status === 'running';
            // نخفي العنصر النشط من القائمة (يظهر في البطاقة أعلى)
            if (isRunning) return null;

            return (
              <div
                key={log.key}
                ref={el => { itemRefs.current[log.key] = el; }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                  borderBottom: i < logs.length - 1 ? '1px solid var(--b1)' : 'none',
                  opacity: log.status === 'idle' ? 0.45 : 1,
                  transition: 'opacity .3s, background .2s',
                  animation: log.status === 'done' || log.status === 'error'
                    ? 'itemComplete .35s cubic-bezier(.34,1.4,.64,1)'
                    : 'none',
                }}
              >
                {/* أيقونة الحالة */}
                <div style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background:
                    log.status === 'done'  ? 'var(--emb)'  :
                    log.status === 'error' ? 'var(--redb)' : 'var(--bg4)',
                  transition: 'background .2s',
                }}>
                  {log.status === 'done'  && <i className="ti ti-check" style={{ fontSize: 13, color: 'var(--em)' }} />}
                  {log.status === 'error' && <i className="ti ti-x"     style={{ fontSize: 13, color: 'var(--red)' }} />}
                  {log.status === 'idle'  && <i className="ti ti-circle" style={{ fontSize: 13, color: 'var(--b3)' }} />}
                </div>

                {/* اسم العنصر */}
                <span style={{
                  flex: 1, fontSize: 12,
                  fontWeight: log.status === 'done' ? 600 : 400,
                  color:
                    log.status === 'error' ? 'var(--red)' :
                    log.status === 'done'  ? 'var(--t2)'  : 'var(--t4)',
                  transition: 'color .2s',
                }}>
                  {log.label}
                </span>

                {/* رسالة خطأ أو علامة نجاح */}
                {log.status === 'error' && log.message && (
                  <span style={{
                    fontSize: 10, color: 'var(--red)', maxWidth: 130,
                    textAlign: 'left', opacity: .85, lineHeight: 1.3,
                  }}>
                    {log.message}
                  </span>
                )}
                {log.status === 'done' && (
                  <i className="ti ti-circle-check-filled" style={{ fontSize: 15, color: 'var(--em)', opacity: .7 }} />
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          @keyframes spin          { to { transform: rotate(360deg); } }
          @keyframes pingPulse     { 0%,100% { box-shadow: 0 0 0 3px var(--emb); } 50% { box-shadow: 0 0 0 6px transparent; } }
          @keyframes glowPulse     { 0%,100% { box-shadow: 0 0 0 6px var(--emb); } 50% { box-shadow: 0 0 0 10px transparent; } }
          @keyframes slideInActive { from { opacity: 0; transform: translateY(-8px) scale(.97); } to { opacity: 1; transform: none; } }
          @keyframes itemComplete  { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
        `}</style>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────
  // PHASE: done
  // ─────────────────────────────────────────────────────────
  const renderDone = () => (
    <div style={{ textAlign: 'center', padding: '12px 0 8px', direction: 'rtl' }}>
      {hasErrors ? (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'var(--goldb, rgba(184,125,10,.1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 30, color: 'var(--gold, #b87d0a)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>اكتمل مع بعض الأخطاء</div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 16 }}>بعض البيانات لم تُطبَّق، يمكنك إضافتها لاحقاً</div>
          <div style={{
            background: 'var(--redb)', border: '1px solid var(--redbo)', borderRadius: 10,
            padding: '10px 14px', marginBottom: 20, textAlign: 'right',
          }}>
            {logs.filter(l => l.status === 'error').map(l => (
              <div key={l.key} style={{ fontSize: 12, color: 'var(--red)', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="ti ti-x" style={{ fontSize: 11 }} />
                {l.label}
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'popIn .4s cubic-bezier(.34,1.6,.64,1)',
          }}>
            <i className="ti ti-check" style={{ fontSize: 30, color: 'var(--em)' }} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--t1)', marginBottom: 6 }}>تم الإعداد بنجاح!</div>
          <div style={{ fontSize: 13, color: 'var(--t4)', marginBottom: 20 }}>
            تم تطبيق <strong style={{ color: 'var(--em)' }}>{totalDone}</strong> عنصر بنجاح على شركة {companyName}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
            {[
              { label: 'المجموعات', value: selectedGroups.length, icon: 'ti-stack' },
              { label: 'العناصر',   value: totalDone,              icon: 'ti-database' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'var(--bg3)', borderRadius: 12, padding: '12px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 90,
              }}>
                <i className={`ti ${stat.icon}`} style={{ fontSize: 18, color: 'var(--em)' }} />
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--t1)' }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: 'var(--t4)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <button
        onClick={onComplete}
        style={{
          width: '100%', padding: '12px', borderRadius: 12,
          border: 'none', background: 'var(--em)', color: '#fff',
          fontSize: 14, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'inherit', boxShadow: 'var(--emglow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <i className="ti ti-arrow-left" style={{ fontSize: 16 }} />
        الدخول إلى الشركة
      </button>

      <style>{`@keyframes popIn { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );

  // ─────────────────────────────────────────────────────────
  // Footer
  // ─────────────────────────────────────────────────────────
  const renderFooter = () => {
    if (phase !== 'select') return null;
    return (
      <>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: '10px', borderRadius: 10,
            border: '1px solid var(--b3)', background: 'transparent',
            color: 'var(--t3)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          تخطي الآن
        </button>
        <button
          onClick={handleApply}
          disabled={selectedSeeds.length === 0}
          style={{
            flex: 2, padding: '10px', borderRadius: 10,
            border: 'none',
            background: selectedSeeds.length > 0 ? 'var(--em)' : 'var(--b3)',
            color: selectedSeeds.length > 0 ? '#fff' : 'var(--t4)',
            fontSize: 13, fontWeight: 800,
            cursor: selectedSeeds.length > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit',
            boxShadow: selectedSeeds.length > 0 ? 'var(--emglow)' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all .15s',
          }}
        >
          <i className="ti ti-bolt" style={{ fontSize: 15 }} />
          تطبيق {selectedSeeds.length} عنصر
        </button>
      </>
    );
  };

  const subtitleMap = {
    select:   `${companyName} · ${totalSelected} عنصر محدد`,
    applying: `جارٍ التطبيق... ${totalDone}/${totalCount}`,
    done:     hasErrors ? 'اكتمل مع أخطاء' : `تم تطبيق ${totalDone} عنصر بنجاح`,
  };

  return (
    <Modal
      open={true}
      onClose={phase === 'select' ? onClose : () => {}}
      title="إعداد البيانات الأولية"
      subtitle={subtitleMap[phase]}
      footer={renderFooter()}
      size="md"
    >
      {phase === 'select'   && renderSelect()}
      {phase === 'applying' && renderApplying()}
      {phase === 'done'     && renderDone()}
    </Modal>
  );
}
```

## FILE: resources/js/components/modals/SystemBootModal.tsx
```
// ════════════════════════════════════════════════════════════════════════════
// components/modals/SystemBootModal.tsx
//
// مودال تحميل مكونات النظام عند أول دخول للشركة
// يُعرض بعد اختيار السنة المالية وقبل navigate('/dashboard')
// يُنفذ prefetch لجميع الـ lookups حتى تكون جاهزة فور الدخول
//
// الاستخدام:
//   <SystemBootModal
//     companySlug={slug}
//     onComplete={() => navigate('/dashboard', { replace: true })}
//   />
// ════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api/core/client';

// ─── قائمة الموارد المُراد تحميلها مسبقاً ──────────────────────────────────
interface BootResource {
  key: string;          // queryKey الذي يُخزَّن به في React Query cache
  label: string;        // النص المعروض للمستخدم
  endpoint: string;     // المسار النسبي للـ API  (/{slug}/...)
  icon: string;         // tabler icon class
  group: string;        // مجموعة بصرية
  critical: boolean;    // إذا فشل → يُظهر warning لكن لا يوقف التحميل
}

const BOOT_RESOURCES: BootResource[] = [
  // ── مجموعة 1: أساسيات ────────────────────────────────────────────────────
  { key: 'currencies',                label: 'العملات',                    endpoint: 'currencies',                  icon: 'ti-currency-dollar',        group: 'أساسيات',        critical: true  },
  { key: 'tvas',                      label: 'نسب الضريبة TVA',            endpoint: 'tvas',                        icon: 'ti-receipt-tax',            group: 'أساسيات',        critical: true  },
  { key: 'units',                     label: 'وحدات القياس',               endpoint: 'units',                       icon: 'ti-ruler',                  group: 'أساسيات',        critical: true  },
  { key: 'price_levels',              label: 'مستويات الأسعار',            endpoint: 'price-levels',               icon: 'ti-tags',                   group: 'أساسيات',        critical: false },
  { key: 'payment_modes',             label: 'طرق الدفع',                  endpoint: 'payment-modes',              icon: 'ti-credit-card',            group: 'أساسيات',        critical: true  },

  // ── مجموعة 2: منتجات ─────────────────────────────────────────────────────
  { key: 'product_types',             label: 'أنواع المنتجات',             endpoint: 'product-types',              icon: 'ti-box',                    group: 'منتجات',         critical: false },
  { key: 'families',                  label: 'عائلات المنتجات',            endpoint: 'families',                   icon: 'ti-category',               group: 'منتجات',         critical: false },
  { key: 'brands',                    label: 'العلامات التجارية',          endpoint: 'brands',                     icon: 'ti-bookmark',               group: 'منتجات',         critical: false },
  { key: 'warehouses',                label: 'المستودعات',                 endpoint: 'warehouses',                 icon: 'ti-building-warehouse',     group: 'منتجات',         critical: true  },
  { key: 'inventory_valuation',       label: 'طرق تقييم المخزون',         endpoint: 'inventory-valuation-methods',icon: 'ti-chart-bar',              group: 'منتجات',         critical: false },

  // ── مجموعة 3: مالية ──────────────────────────────────────────────────────
  { key: 'treasury_account_types',    label: 'أنواع الخزينة',              endpoint: 'treasury-account-types',     icon: 'ti-building-bank',          group: 'مالية',          critical: false },
  { key: 'treasury_accounts',         label: 'حسابات الخزينة',            endpoint: 'treasury-accounts',          icon: 'ti-cash',                   group: 'مالية',          critical: true  },
  { key: 'expense_categories',        label: 'فئات المصاريف',              endpoint: 'expense-categories',         icon: 'ti-folder',                 group: 'مالية',          critical: false },

  // ── مجموعة 4: مستندات ────────────────────────────────────────────────────
  { key: 'document_types',            label: 'أنواع المستندات',            endpoint: 'document-types',             icon: 'ti-file-description',       group: 'مستندات',        critical: true  },
  { key: 'document_statuses',         label: 'حالات المستندات',            endpoint: 'document-statuses',          icon: 'ti-clipboard-check',        group: 'مستندات',        critical: false },
  { key: 'numbering_series',          label: 'سلاسل الترقيم',              endpoint: 'numbering-series',           icon: 'ti-list-numbers',           group: 'مستندات',        critical: false },

  // ── مجموعة 5: أطراف ──────────────────────────────────────────────────────
  { key: 'party_types',               label: 'أنواع الأطراف',              endpoint: 'party-types',                icon: 'ti-users',                  group: 'أطراف',          critical: false },

  // ── مجموعة 6: بيانات جغرافية ─────────────────────────────────────────────
  { key: 'wilayas',                   label: 'الولايات والبلديات',         endpoint: 'wilayas',                    icon: 'ti-map-pin',                group: 'جغرافيا',        critical: false },
];

const TOTAL = BOOT_RESOURCES.length;

// ─── ألوان المجموعات ──────────────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  'أساسيات':  'var(--em)',
  'منتجات':   'var(--blue)',
  'مالية':    'var(--gold)',
  'مستندات':  'var(--purple)',
  'أطراف':    'var(--teal)',
  'جغرافيا':  'var(--orange)',
};

// ─── نوع الحالة الفردية ───────────────────────────────────────────────────
type ItemStatus = 'pending' | 'loading' | 'done' | 'error' | 'skipped';

interface ItemState {
  status: ItemStatus;
  ms?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function SystemBootModal({
  companySlug,
  onComplete,
}: {
  companySlug: string;
  onComplete: () => void;
}) {
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(BOOT_RESOURCES.map(r => [r.key, { status: 'pending' }]))
  );
  const [doneCount, setDoneCount]     = useState(0);
  const [currentLabel, setCurrentLabel] = useState('جارٍ التحضير...');
  const [phase, setPhase]             = useState<'loading' | 'done' | 'error'>('loading');
  const [errors, setErrors]           = useState<string[]>([]);
  const [elapsed, setElapsed]         = useState(0);
  const startRef  = useRef(Date.now());
  const timerRef  = useRef<ReturnType<typeof setInterval>>();
  const doneRef   = useRef(0);
  const listRef   = useRef<HTMLDivElement>(null);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(timerRef.current);
  }, []);

  // ── Prefetch runner ──────────────────────────────────────────────────────
  const setItem = useCallback((key: string, patch: Partial<ItemState>) => {
    setItems(prev => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const errs: string[] = [];

      for (const res of BOOT_RESOURCES) {
        if (cancelled) break;

        setCurrentLabel(res.label);
        setItem(res.key, { status: 'loading' });

        // Scroll active item into view
        setTimeout(() => {
          const el = document.getElementById(`boot-item-${res.key}`);
          el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 50);

        const t0 = Date.now();
        try {
          // تحقق أولاً: هل البيانات موجودة في cache؟
          const cached = qc.getQueryData([res.key, companySlug]);
          if (cached) {
            setItem(res.key, { status: 'done', ms: 0 });
          } else {
            // endpoint يبدأ بـ slug الشركة إلا إذا كان wilayas (عالمي)
            const url = res.key === 'wilayas'
              ? `/wilayas`
              : `/${companySlug}/${res.endpoint}`;

            const data = await client.get(url, { params: { per_page: 500, no_paginate: 1 } });
            // خزّن في React Query cache مباشرة
            qc.setQueryData([res.key, companySlug], data.data);
            setItem(res.key, { status: 'done', ms: Date.now() - t0 });
          }
        } catch (e: any) {
          const msg = e?.response?.data?.message ?? e?.message ?? 'خطأ';
          setItem(res.key, { status: 'error' });
          errs.push(`${res.label}: ${msg}`);
        }

        doneRef.current += 1;
        setDoneCount(doneRef.current);

        // تأخير بسيط بين الطلبات لتجنب حجب الخادم
        await new Promise(r => setTimeout(r, 60));
      }

      if (!cancelled) {
        clearInterval(timerRef.current);
        setErrors(errs);
        setPhase(errs.length > 0 && errs.length === TOTAL ? 'error' : 'done');
        setCurrentLabel(errs.length === 0 ? 'اكتمل التحميل بنجاح ✓' : `اكتمل مع ${errs.length} تحذيرات`);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [companySlug, qc, setItem]);

  // ── Auto-proceed after done ──────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'done') {
      const t = setTimeout(onComplete, 900);
      return () => clearTimeout(t);
    }
  }, [phase, onComplete]);

  const progress = Math.round((doneCount / TOTAL) * 100);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10050,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(12px)',
      padding: 20, direction: 'rtl',
      animation: 'bootFadeIn .25s ease',
    }}>
      <style>{`
        @keyframes bootFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes bootSlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes bootPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes bootSpin { to{transform:rotate(360deg)} }
        @keyframes bootShimmer {
          0%   { background-position: -400px 0 }
          100% { background-position:  400px 0 }
        }
        @keyframes bootPop {
          0%   { transform:scale(.8); opacity:0 }
          60%  { transform:scale(1.12) }
          100% { transform:scale(1); opacity:1 }
        }
        @keyframes bootProgress {
          from { width: 0% }
        }
        .boot-item-row {
          display:flex; align-items:center; gap:10; padding:7px 12px;
          border-radius:10px; transition:background .15s;
        }
        .boot-item-row:hover { background: var(--bg3); }
      `}</style>

      <div style={{
        background: 'var(--bg2)',
        borderRadius: 24,
        width: '100%', maxWidth: 480,
        border: '1px solid var(--b3)',
        boxShadow: '0 32px 80px rgba(0,0,0,.45)',
        overflow: 'hidden',
        animation: 'bootSlideUp .3s cubic-bezier(.34,1.4,.64,1)',
      }}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, var(--em) 0%, var(--em3) 100%)',
          padding: '24px 28px 20px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* دوائر زخرفية */}
          <div style={{ position:'absolute', top:-50, left:-50, width:180, height:180, borderRadius:'50%', background:'rgba(255,255,255,.06)', pointerEvents:'none' }} />
          <div style={{ position:'absolute', bottom:-30, right:-20, width:120, height:120, borderRadius:'50%', background:'rgba(255,255,255,.05)', pointerEvents:'none' }} />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16 }}>
            {/* أيقونة */}
            <div style={{
              width:52, height:52, borderRadius:16, flexShrink:0,
              background:'rgba(255,255,255,.2)', backdropFilter:'blur(8px)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, boxShadow:'0 4px 16px rgba(0,0,0,.2)',
            }}>
              {phase === 'done' ? '✅' : phase === 'error' ? '⚠️' : '⚡'}
            </div>

            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#fff', marginBottom:4, lineHeight:1.2 }}>
                {phase === 'done'
                  ? 'النظام جاهز!'
                  : phase === 'error'
                  ? 'اكتمل مع تحذيرات'
                  : 'جارٍ تهيئة النظام'}
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.75)' }}>
                {phase === 'loading'
                  ? `تحميل مكونات النظام لتجربة سلسة · ${elapsed}ث`
                  : `اكتمل في ${elapsed} ثانية`}
              </div>
            </div>
          </div>

          {/* شريط التقدم */}
          <div style={{ marginTop:20 }}>
            <div style={{
              height:6, borderRadius:99,
              background:'rgba(255,255,255,.2)',
              overflow:'hidden',
            }}>
              <div style={{
                height:'100%', borderRadius:99,
                background:'rgba(255,255,255,.9)',
                width:`${progress}%`,
                transition:'width .4s cubic-bezier(.4,0,.2,1)',
                boxShadow:'0 0 12px rgba(255,255,255,.5)',
              }} />
            </div>
            <div style={{
              display:'flex', justifyContent:'space-between',
              marginTop:6, fontSize:11, color:'rgba(255,255,255,.7)',
            }}>
              <span style={{ animation: phase==='loading' ? 'bootPulse 1.5s ease infinite' : 'none' }}>
                {currentLabel}
              </span>
              <span style={{ fontWeight:800, color:'#fff' }}>{progress}٪</span>
            </div>
          </div>
        </div>

        {/* ── قائمة العناصر ──────────────────────────────────────────────── */}
        <div
          ref={listRef}
          style={{
            maxHeight: 280, overflowY:'auto', padding:'12px 16px',
            scrollbarWidth:'thin',
          }}
        >
          {BOOT_RESOURCES.map((res) => {
            const state = items[res.key];
            const color = GROUP_COLORS[res.group] ?? 'var(--em)';
            return (
              <div
                id={`boot-item-${res.key}`}
                key={res.key}
                className="boot-item-row"
              >
                {/* أيقونة الحالة */}
                <div style={{ width:28, height:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {state.status === 'pending'  && <i className={`ti ${res.icon}`} style={{ fontSize:15, color:'var(--t4)' }} />}
                  {state.status === 'loading'  && <i className="ti ti-loader-2"   style={{ fontSize:15, color, animation:'bootSpin .7s linear infinite' }} />}
                  {state.status === 'done'     && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:color, display:'flex', alignItems:'center', justifyContent:'center',
                      animation:'bootPop .3s cubic-bezier(.34,1.5,.64,1)',
                    }}>
                      <i className="ti ti-check" style={{ fontSize:12, color:'#fff', fontWeight:900 }} />
                    </div>
                  )}
                  {state.status === 'error'    && (
                    <div style={{
                      width:22, height:22, borderRadius:'50%',
                      background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <i className="ti ti-x" style={{ fontSize:11, color:'#fff' }} />
                    </div>
                  )}
                  {state.status === 'skipped'  && <i className="ti ti-minus" style={{ fontSize:13, color:'var(--t4)' }} />}
                </div>

                {/* النص */}
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{
                    fontSize:12, fontWeight:600,
                    color: state.status === 'loading' ? 'var(--t1)'
                         : state.status === 'done'    ? 'var(--t2)'
                         : state.status === 'error'   ? 'var(--red)'
                         : 'var(--t4)',
                    whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                  }}>
                    {res.label}
                  </div>
                  {state.status === 'loading' && (
                    <div style={{
                      height:3, borderRadius:99, marginTop:3,
                      background:'var(--bg4)', overflow:'hidden',
                    }}>
                      <div style={{
                        height:'100%', borderRadius:99, width:'60%',
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
                        backgroundSize:'400px 100%',
                        animation:'bootShimmer 1.2s linear infinite',
                      }} />
                    </div>
                  )}
                </div>

                {/* الوقت */}
                <div style={{ fontSize:10, color:'var(--t4)', flexShrink:0 }}>
                  {state.status === 'done' && state.ms !== undefined && state.ms > 0 && `${state.ms}ms`}
                  {state.status === 'done' && state.ms === 0 && <span style={{ color:'var(--em)', fontSize:9, fontWeight:700 }}>cache</span>}
                  {state.status === 'error' && <span style={{ color:'var(--red)', fontSize:9 }}>خطأ</span>}
                </div>

                {/* شارة المجموعة */}
                <div style={{
                  fontSize:9, fontWeight:700, padding:'1px 6px',
                  borderRadius:99, flexShrink:0,
                  background:`${color}22`, color,
                }}>
                  {res.group}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div style={{
          padding:'12px 20px 18px',
          borderTop:'1px solid var(--b1)',
          display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        }}>
          <div style={{ fontSize:11, color:'var(--t4)' }}>
            {doneCount} / {TOTAL} مكوّن
            {errors.length > 0 && (
              <span style={{ color:'var(--orange)', marginRight:8, fontWeight:700 }}>
                · {errors.length} تحذير
              </span>
            )}
          </div>

          {/* زر التخطي — يظهر بعد 3 ثواني فقط */}
          {phase === 'loading' && elapsed >= 3 && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'1px solid var(--b3)', background:'var(--bg3)',
                color:'var(--t3)', fontSize:11, fontWeight:700,
                cursor:'pointer', fontFamily:'Tajawal, sans-serif',
                transition:'all .13s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='var(--em)'; e.currentTarget.style.color='var(--em)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--b3)'; e.currentTarget.style.color='var(--t3)'; }}
            >
              تخطي والدخول
            </button>
          )}

          {phase === 'done' && (
            <div style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'6px 14px', borderRadius:10,
              background:'var(--emb)', border:'1px solid var(--embo)',
              fontSize:11, fontWeight:700, color:'var(--em)',
            }}>
              <i className="ti ti-rocket" style={{ fontSize:13 }} />
              جارٍ الانتقال...
            </div>
          )}

          {phase === 'error' && (
            <button
              onClick={onComplete}
              style={{
                padding:'6px 14px', borderRadius:10,
                border:'none', background:'var(--em)', color:'#fff',
                fontSize:11, fontWeight:700, cursor:'pointer',
                fontFamily:'Tajawal, sans-serif',
              }}
            >
              دخول رغم ذلك
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/products/ProductModal.tsx
```
// ProductModal.tsx — نسخة محسّنة
// التحسينات:
//  1. موضع المودل — paddingTop: 5vh يرفعه عن الأسفل قليلاً
//  2. ارتفاع ثابت height: 95vh — لا يتغير عند تبديل التابات
//  3. Scroll للأعلى تلقائياً عند تبديل التاب
//  4. Validation inline عند onBlur لحقل الاسم وسعر الشراء
//  5. Keyboard: Escape للإغلاق، Ctrl/Cmd+S للحفظ
//  6. رسالة API error تبقى مرئية ولها زر إغلاق
//  7. Race condition في priceLevels مُصلح — useRef يتذكر إذا تم init البيانات
//  8. Lookups: staleTime 10 دقائق بدلاً من Infinity
//  9. isDirty tracking — شارة "غير محفوظ" في الهيدر
// 10. UnsavedChanges warning عند محاولة الإغلاق بعد تعديل
// 11. Tab counter badges (عدد التعبئات، عدد الأسعار)
// 12. حقل الاسم يأخذ focus تلقائياً عند الفتح
// 13. أزرار السابق/التالي في Footer للتنقل بين التابات
// 14. Enter في حقل الخصائص التقنية يضيف مباشرة

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface Family          { id: number; name: string; }
interface Brand           { id: number; name: string; }
interface ProductType     { id: number; name: string; manages_stock: boolean; }
interface Unit            { id: number; name: string; symbol: string; }
interface TvaRate         { id: number; rate: number; is_default?: boolean; }
interface PriceLevel      { id: number; name: string; }
interface ValuationMethod { id: number; name: string; method: string; }

interface ProductPrice {
  price_level_id: number;
  pricing_method: 'fixed' | 'rate' | 'margin';
  price:   number | null | '';
  rate:    number | null | '';
  margin:  number | null | '';
  active:  boolean;
}

interface ProductPackaging {
  id?: number;
  code: string; label: string; quantity: number | '';
  barcode: string; is_default: boolean; active: boolean; display_order: number;
}

interface QuantityDiscount {
  id?: number;
  price_level_id: number; min_qty: number | '';
  max_qty: number | null | ''; discount_amount: number | null | '';
  discount_percentage: number | null | ''; tier_order: number;
  is_blocked: boolean; active: boolean;
}

interface ProductForm {
  name: string; slug: string; ref: string; barcode: string; description: string;
  family_id: number | null; brand_id: number | null; product_type_id: number | null;
  tva_id: number | null; unit_id: number | null; purchase_price_ht: number | '';
  manages_stock: boolean; allow_negative_stock: boolean;
  has_lots: boolean; has_expiration_date: boolean;
  min_stock_alert: number | ''; max_stock_alert: number | '';
  manages_quantity_discounts: boolean; valuation_method_id: number | null;
  weight: number | null | ''; volume: number | null | '';
  length: number | null | ''; width: number | null | ''; height: number | null | '';
  specifications: Record<string, string>; images: string[]; active: boolean;
  prices: ProductPrice[]; packagings: ProductPackaging[]; quantity_discounts: QuantityDiscount[];
}

interface ProductModalProps {
  open: boolean; product?: any | null;
  onClose: () => void; onSaved: (product: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'basic',      label: 'الأساسيات', icon: 'ti-info-circle' },
  { id: 'pricing',    label: 'الأسعار',   icon: 'ti-tag' },
  { id: 'packagings', label: 'التعبئة',   icon: 'ti-package' },
  { id: 'stock',      label: 'المخزون',   icon: 'ti-building-warehouse' },
  { id: 'discounts',  label: 'الخصومات',  icon: 'ti-discount' },
  { id: 'dimensions', label: 'الأبعاد',   icon: 'ti-ruler' },
  { id: 'meta',       label: 'SEO',       icon: 'ti-world' },
] as const;

type TabId = typeof TABS[number]['id'];
const TAB_IDS = TABS.map(t => t.id) as TabId[];

const PRICING_METHODS = [
  { value: 'fixed',  label: 'سعر ثابت',        icon: 'ti-cash',        hint: 'Prix de vente HT مباشر' },
  { value: 'rate',   label: 'نسبة فوق الشراء', icon: 'ti-percentage',  hint: '% فوق سعر الشراء' },
  { value: 'margin', label: 'هامش ثابت',        icon: 'ti-trending-up', hint: 'هامش بالدج يُضاف للسعر' },
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const fmtDZD = (n: number | '' | null) =>
  n !== '' && n !== null
    ? new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)) + ' دج'
    : '—';

function emptyForm(priceLevels: PriceLevel[] = [], defaultTvaId: number | null = null): ProductForm {
  return {
    name: '', slug: '', ref: '', barcode: '', description: '',
    family_id: null, brand_id: null, product_type_id: null,
    tva_id: defaultTvaId, unit_id: null, purchase_price_ht: '',
    manages_stock: true, allow_negative_stock: false,
    has_lots: false, has_expiration_date: false,
    min_stock_alert: '', max_stock_alert: '',
    manages_quantity_discounts: false, valuation_method_id: null,
    weight: '', volume: '', length: '', width: '', height: '',
    specifications: {}, images: [], active: true,
    prices: priceLevels.map(pl => ({ price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true })),
    packagings: [], quantity_discounts: [],
  };
}

function productToForm(p: any, priceLevels: PriceLevel[]): ProductForm {
  return {
    name: p.name ?? '', slug: p.slug ?? '', ref: p.ref ?? '',
    barcode: p.barcode ?? '', description: p.description ?? '',
    family_id: p.family_id ?? null, brand_id: p.brand_id ?? null,
    product_type_id: p.product_type_id ?? null, tva_id: p.tva_id ?? null, unit_id: p.unit_id ?? null,
    purchase_price_ht: p.purchase_price_ht ?? '',
    manages_stock: p.manages_stock ?? true, allow_negative_stock: p.allow_negative_stock ?? false,
    has_lots: p.has_lots ?? false, has_expiration_date: p.has_expiration_date ?? false,
    min_stock_alert: p.min_stock_alert ?? '', max_stock_alert: p.max_stock_alert ?? '',
    manages_quantity_discounts: p.manages_quantity_discounts ?? false, valuation_method_id: p.valuation_method_id ?? null,
    weight: p.weight ?? '', volume: p.volume ?? '', length: p.length ?? '', width: p.width ?? '', height: p.height ?? '',
    specifications: p.specifications ?? {}, images: p.images ?? [], active: p.active ?? true,
    prices: priceLevels.map(pl => {
      const ex = (p.prices ?? []).find((x: any) => x.price_level_id === pl.id);
      return { price_level_id: pl.id, pricing_method: ex?.pricing_method ?? 'fixed', price: ex?.price ?? '', rate: ex?.rate ?? '', margin: ex?.margin ?? '', active: ex?.active !== false };
    }),
    packagings: (p.packagings ?? []).map((pkg: any) => ({ id: pkg.id, code: pkg.code ?? '', label: pkg.label ?? '', quantity: pkg.quantity ?? 1, barcode: pkg.barcode ?? '', is_default: pkg.is_default ?? false, active: pkg.active ?? true, display_order: pkg.display_order ?? 0 })),
    quantity_discounts: (p.quantity_discounts ?? []).map((d: any) => ({ id: d.id, price_level_id: d.price_level_id, min_qty: d.min_qty ?? '', max_qty: d.max_qty ?? null, discount_amount: d.discount_amount ?? null, discount_percentage: d.discount_percentage ?? null, tier_order: d.tier_order ?? 0, is_blocked: d.is_blocked ?? false, active: d.active ?? true })),
  };
}

function buildPayload(form: ProductForm) {
  return {
    name: form.name, slug: form.slug || undefined, ref: form.ref || null, barcode: form.barcode || null,
    description: form.description || null, family_id: form.family_id, brand_id: form.brand_id,
    product_type_id: form.product_type_id, tva_id: form.tva_id, unit_id: form.unit_id,
    purchase_price_ht: form.purchase_price_ht !== '' ? Number(form.purchase_price_ht) : 0,
    manages_stock: form.manages_stock, allow_negative_stock: form.allow_negative_stock,
    has_lots: form.has_lots, has_expiration_date: form.has_expiration_date,
    min_stock_alert: form.min_stock_alert !== '' ? Number(form.min_stock_alert) : 0,
    max_stock_alert: form.max_stock_alert !== '' ? Number(form.max_stock_alert) : 0,
    manages_quantity_discounts: form.manages_quantity_discounts, valuation_method_id: form.valuation_method_id,
    weight: form.weight !== '' ? form.weight : null, volume: form.volume !== '' ? form.volume : null,
    length: form.length !== '' ? form.length : null, width: form.width !== '' ? form.width : null,
    height: form.height !== '' ? form.height : null,
    specifications: Object.keys(form.specifications).length ? form.specifications : null,
    images: form.images, active: form.active,
    prices: form.prices.filter(p => {
      if (p.pricing_method === 'fixed')  return p.price  !== '' && p.price  !== null;
      if (p.pricing_method === 'rate')   return p.rate   !== '' && p.rate   !== null;
      if (p.pricing_method === 'margin') return p.margin !== '' && p.margin !== null;
      return false;
    }),
    packagings: form.packagings.filter(pkg => pkg.code.trim() && pkg.label.trim()),
    quantity_discounts: form.manages_quantity_discounts
      ? form.quantity_discounts.filter(d => d.price_level_id && d.min_qty !== '' && (d.discount_amount !== '' || d.discount_percentage !== ''))
      : [],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI ATOMS
// ═══════════════════════════════════════════════════════════════════════════

const s = {
  field:   { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  label:   { fontSize: 11, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.03em', textTransform: 'uppercase' as const },
  inp: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    transition: 'border-color .15s, box-shadow .15s',
    boxSizing: 'border-box' as const, width: '100%',
  }),
  sel: (err?: boolean): React.CSSProperties => ({
    padding: '8px 10px', borderRadius: 'var(--r2)',
    border: `1px solid ${err ? 'var(--red)' : 'var(--b3)'}`,
    background: 'var(--bg2)', color: 'var(--t1)', fontSize: 13,
    outline: 'none', fontFamily: 'Tajawal, inherit',
    boxSizing: 'border-box' as const, width: '100%', cursor: 'pointer',
  }),
  row2:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  row3:    { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 },
  section: { display: 'flex', flexDirection: 'column' as const, gap: 14 },
  divider: { height: 1, background: 'var(--b2)', margin: '4px 0' },
  hint:    { fontSize: 11, color: 'var(--t4)', marginTop: 2 },
  errText: { fontSize: 11, color: 'var(--red)', marginTop: 2 },
};

function Field({ label, error, children, hint, col }: { label: string; error?: string; children: React.ReactNode; hint?: string; col?: number }) {
  return (
    <div style={{ ...s.field, gridColumn: col ? `span ${col}` : undefined }}>
      <label style={s.label}>{label}</label>
      {children}
      {hint  && <span style={s.hint}>{hint}</span>}
      {error && <span style={s.errText}>{error}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div onClick={() => onChange(!checked)} style={{ width: 36, height: 20, borderRadius: 10, position: 'relative', background: checked ? 'var(--em)' : 'var(--b3)', transition: 'background .2s', flexShrink: 0, cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 3, left: checked ? 19 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
      </div>
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ProductModal({ open, product, onClose, onSaved }: ProductModalProps) {
  const isEdit   = !!product;
  const qc       = useQueryClient();
  const bodyRef  = useRef<HTMLDivElement>(null);
  const nameRef  = useRef<HTMLInputElement>(null);
  const initDone = useRef(false); // لحل race condition في priceLevels

  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [form,      setForm]      = useState<ProductForm>(() => emptyForm());
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [apiError,  setApiError]  = useState('');
  const [isDirty,   setIsDirty]   = useState(false);
  const [specKey,   setSpecKey]   = useState('');
  const [specVal,   setSpecVal]   = useState('');

  // ── Lookups ──
  const STALE = 10 * 60_000;
  const fetchOpts = { enabled: open, staleTime: STALE };
  const { data: families         = [] } = useQuery<Family[]>({          queryKey: ['families'],          queryFn: () => apiClient.get('/families',                    { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: brands           = [] } = useQuery<Brand[]>({           queryKey: ['brands'],            queryFn: () => apiClient.get('/brands',                      { params: { per_page: 200 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: productTypes     = [] } = useQuery<ProductType[]>({     queryKey: ['product-types'],     queryFn: () => apiClient.get('/product-types',              { params: { per_page: 50  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: units            = [] } = useQuery<Unit[]>({            queryKey: ['units'],             queryFn: () => apiClient.get('/units',                      { params: { per_page: 100 } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: tvaRates         = [] } = useQuery<TvaRate[]>({         queryKey: ['tvas'],              queryFn: () => apiClient.get('/tvas',                       { params: { per_page: 20  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: priceLevels      = [] } = useQuery<PriceLevel[]>({      queryKey: ['price-levels'],      queryFn: () => apiClient.get('/price-levels',               { params: { per_page: 50  } }).then(r => r.data.data ?? []), ...fetchOpts });
  const { data: valuationMethods = [] } = useQuery<ValuationMethod[]>({ queryKey: ['valuation-methods'], queryFn: () => apiClient.get('/inventory-valuation-methods', { params: { per_page: 20  } }).then(r => r.data.data ?? []), ...fetchOpts });

  const defaultTvaId = (tvaRates as TvaRate[]).find(t => t.is_default)?.id ?? null;

  // ── Reset عند الفتح ──
  useEffect(() => {
    if (!open) { initDone.current = false; return; }
    setErrors({}); setApiError(''); setActiveTab('basic');
    setIsDirty(false); setSpecKey(''); setSpecVal('');
    if (priceLevels.length > 0) {
      initDone.current = true;
      setForm(isEdit && product ? productToForm(product, priceLevels as PriceLevel[]) : emptyForm(priceLevels as PriceLevel[], defaultTvaId));
    } else {
      setForm(isEdit && product ? productToForm(product, []) : emptyForm([], defaultTvaId));
    }
    setTimeout(() => nameRef.current?.focus(), 80);
  }, [open, product?.id]); // eslint-disable-line

  // ── Sync priceLevels أول مرة فقط (race condition fix) ──
  useEffect(() => {
    if (!priceLevels.length || !open || initDone.current) return;
    initDone.current = true;
    setForm(f => {
      if (isEdit && product) return productToForm(product, priceLevels as PriceLevel[]);
      return {
        ...f,
        tva_id: f.tva_id ?? defaultTvaId,
        prices: (priceLevels as PriceLevel[]).map(pl => {
          const ex = f.prices.find(p => p.price_level_id === pl.id);
          return ex ?? { price_level_id: pl.id, pricing_method: 'fixed', price: '', rate: '', margin: '', active: true };
        }),
      };
    });
  }, [priceLevels.length, open]); // eslint-disable-line

  // ── Keyboard: Escape + Ctrl/Cmd+S ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape')                          { handleClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's')  { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, isDirty]); // eslint-disable-line

  // ── تبديل التاب مع scroll للأعلى ──
  const switchTab = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 30);
  }, []);

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (payload: any) =>
      isEdit
        ? apiClient.put(`/products/${product.id}`, payload).then(r => r.data)
        : apiClient.post('/products', payload).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['products'] });
      setIsDirty(false);
      onSaved(data);
      onClose();
    },
    onError: (e: any) => {
      const msg  = e?.response?.data?.message ?? 'حدث خطأ غير متوقع';
      const errs = e?.response?.data?.errors ?? {};
      setApiError(msg);
      setErrors(errs);
      if (errs.name || errs.purchase_price_ht) setActiveTab('basic');
    },
  });

  // ── Form helpers ──
  function set<K extends keyof ProductForm>(key: K, val: ProductForm[K]) {
    setForm(f => ({ ...f, [key]: val }));
    setIsDirty(true);
    if (errors[key]) setErrors(e => { const x = { ...e }; delete x[key]; return x; });
  }

  function updatePrice(plId: number, key: keyof ProductPrice, val: any) {
    setForm(f => ({ ...f, prices: f.prices.map(p => p.price_level_id === plId ? { ...p, [key]: val } : p) }));
    setIsDirty(true);
  }

  function addPackaging() {
    setForm(f => ({ ...f, packagings: [...f.packagings, { code: '', label: '', quantity: 1, barcode: '', is_default: f.packagings.length === 0, active: true, display_order: f.packagings.length }] }));
    setIsDirty(true);
  }

  function updatePackaging(idx: number, key: keyof ProductPackaging, val: any) {
    setForm(f => {
      const pkgs = [...f.packagings];
      pkgs[idx] = { ...pkgs[idx], [key]: val };
      if (key === 'is_default' && val) pkgs.forEach((p, i) => { if (i !== idx) pkgs[i] = { ...p, is_default: false }; });
      return { ...f, packagings: pkgs };
    });
    setIsDirty(true);
  }

  function removePackaging(idx: number) { setForm(f => ({ ...f, packagings: f.packagings.filter((_, i) => i !== idx) })); setIsDirty(true); }

  function addDiscount(plId: number) {
    setForm(f => ({ ...f, quantity_discounts: [...f.quantity_discounts, { price_level_id: plId, min_qty: 1, max_qty: null, discount_amount: null, discount_percentage: null, tier_order: f.quantity_discounts.filter(d => d.price_level_id === plId).length + 1, is_blocked: false, active: true }] }));
    setIsDirty(true);
  }

  function updateDiscount(idx: number, key: keyof QuantityDiscount, val: any) {
    setForm(f => { const ds = [...f.quantity_discounts]; ds[idx] = { ...ds[idx], [key]: val }; return { ...f, quantity_discounts: ds }; });
    setIsDirty(true);
  }

  function removeDiscount(idx: number) { setForm(f => ({ ...f, quantity_discounts: f.quantity_discounts.filter((_, i) => i !== idx) })); setIsDirty(true); }

  // ── Validation inline onBlur ──
  function validateField(key: string) {
    if (key === 'name') {
      if (!form.name.trim()) setErrors(e => ({ ...e, name: 'اسم المنتج مطلوب' }));
      else setErrors(e => { const x = { ...e }; delete x.name; return x; });
    }
    if (key === 'purchase_price_ht') {
      if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0) setErrors(e => ({ ...e, purchase_price_ht: 'سعر الشراء مطلوب (0 أو أكثر)' }));
      else setErrors(e => { const x = { ...e }; delete x.purchase_price_ht; return x; });
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    if (form.purchase_price_ht === '' || Number(form.purchase_price_ht) < 0) errs.purchase_price_ht = 'سعر الشراء مطلوب (0 أو أكثر)';
    setErrors(errs);
    if (Object.keys(errs).length) { setActiveTab('basic'); return false; }
    return true;
  }

  function handleSubmit() { if (!validate()) return; setApiError(''); mutation.mutate(buildPayload(form)); }

  function handleClose() {
    if (isDirty && !mutation.isPending) {
      if (!window.confirm('لديك تعديلات غير محفوظة. هل تريد الخروج؟')) return;
    }
    onClose();
  }

  if (!open) return null;

  // ── Tab indicators ──
  function tabDot(tabId: TabId): 'done' | 'warn' | 'empty' {
    if (tabId === 'basic')    { return (!form.name.trim() || form.purchase_price_ht === '') ? 'warn' : 'done'; }
    if (tabId === 'pricing')  { return form.prices.some(p => (p.pricing_method === 'fixed' && p.price !== '' && p.price !== null) || (p.pricing_method === 'rate' && p.rate !== '' && p.rate !== null) || (p.pricing_method === 'margin' && p.margin !== '' && p.margin !== null)) ? 'done' : 'empty'; }
    if (tabId === 'packagings') return form.packagings.length > 0 ? 'done' : 'empty';
    if (tabId === 'discounts')  return form.manages_quantity_discounts && form.quantity_discounts.length > 0 ? 'done' : 'empty';
    return 'empty';
  }

  function tabBadge(tabId: TabId): number | null {
    if (tabId === 'pricing')    return form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length || null;
    if (tabId === 'packagings') return form.packagings.length || null;
    if (tabId === 'discounts')  return form.quantity_discounts.filter(d => d.active).length || null;
    return null;
  }

  const dotColor = (d: ReturnType<typeof tabDot>) =>
    d === 'done' ? 'var(--green)' : d === 'warn' ? '#f59e0b' : 'transparent';

  // ═════════════════════════════════════════
  // TAB RENDERS
  // ═════════════════════════════════════════

  function renderBasic() {
    return (
      <div style={s.section}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
          <Field label="اسم المنتج *" error={errors.name}>
            <input ref={nameRef} style={s.inp(!!errors.name)} value={form.name}
              onChange={e => set('name', e.target.value)}
              onBlur={() => validateField('name')}
              placeholder="مثال: حليب نصف دسم 1 لتر" />
          </Field>
          <Toggle checked={form.active} onChange={v => set('active', v)} label="نشط" />
        </div>

        <div style={s.row2}>
          <Field label="المرجع (SKU)" hint="مرجع داخلي فريد">
            <input style={s.inp()} value={form.ref} onChange={e => set('ref', e.target.value)} placeholder="EX-001" />
          </Field>
          <Field label="الباركود">
            <input style={s.inp()} value={form.barcode} onChange={e => set('barcode', e.target.value)} placeholder="6121234567890" />
          </Field>
        </div>

        <Field label="الوصف">
          <textarea style={{ ...s.inp(), resize: 'vertical', minHeight: 72 }} value={form.description}
            onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للمنتج..." />
        </Field>

        <div style={s.divider} />

        <div style={s.row3}>
          <Field label="التصنيف">
            <select style={s.sel()} value={form.family_id ?? ''} onChange={e => set('family_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(families as Family[]).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="العلامة التجارية">
            <select style={s.sel()} value={form.brand_id ?? ''} onChange={e => set('brand_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— لا يوجد —</option>
              {(brands as Brand[]).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="نوع المنتج">
            <select style={s.sel()} value={form.product_type_id ?? ''} onChange={e => {
              const id = e.target.value ? Number(e.target.value) : null;
              const pt = (productTypes as ProductType[]).find(t => t.id === id);
              setForm(f => ({ ...f, product_type_id: id, manages_stock: pt?.manages_stock ?? f.manages_stock }));
              setIsDirty(true);
            }}>
              <option value="">— اختر —</option>
              {(productTypes as ProductType[]).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
        </div>

        <div style={s.row3}>
          <Field label="معدل TVA" error={errors.tva_id}>
            <select style={s.sel()} value={form.tva_id ?? ''} onChange={e => set('tva_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(tvaRates as TvaRate[]).map(t => <option key={t.id} value={t.id}>{t.rate}%{t.is_default ? ' (افتراضي)' : ''}</option>)}
            </select>
          </Field>
          <Field label="وحدة القياس">
            <select style={s.sel()} value={form.unit_id ?? ''} onChange={e => set('unit_id', e.target.value ? Number(e.target.value) : null)}>
              <option value="">— اختر —</option>
              {(units as Unit[]).map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
            </select>
          </Field>
          <Field label="سعر الشراء HT *" error={errors.purchase_price_ht} hint="يُستخدم أساساً لحساب الأسعار">
            <input type="number" min="0" step="0.01" style={s.inp(!!errors.purchase_price_ht)}
              value={form.purchase_price_ht}
              onChange={e => set('purchase_price_ht', e.target.value === '' ? '' : +e.target.value)}
              onBlur={() => validateField('purchase_price_ht')}
              placeholder="0.00" />
          </Field>
        </div>
      </div>
    );
  }

  function renderPricing() {
    const lvls = priceLevels as PriceLevel[];
    if (!lvls.length) return (
      <div style={{ textAlign: 'center', padding: 56, color: 'var(--t4)' }}>
        <i className="ti ti-tag" style={{ fontSize: 36, opacity: 0.3 }} />
        <div style={{ marginTop: 10, fontSize: 13 }}>لا توجد مستويات أسعار معرفة</div>
        <div style={{ fontSize: 11, marginTop: 4 }}>أضف مستويات الأسعار من الإعدادات أولاً</div>
      </div>
    );

    const purchasePrice = Number(form.purchase_price_ht) || 0;
    return (
      <div style={s.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {PRICING_METHODS.map(m => (
            <div key={m.value} style={{ padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg3)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 16, color: 'var(--em)', marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{m.label}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{m.hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lvls.map(pl => {
            const pr = form.prices.find(p => p.price_level_id === pl.id) ?? { price_level_id: pl.id, pricing_method: 'fixed' as const, price: '', rate: '', margin: '', active: true };
            const method = pr.pricing_method;
            let preview = 0;
            if (method === 'fixed'  && pr.price  !== '' && pr.price  !== null) preview = Number(pr.price);
            if (method === 'rate'   && pr.rate   !== '' && pr.rate   !== null) preview = purchasePrice * (1 + Number(pr.rate) / 100);
            if (method === 'margin' && pr.margin !== '' && pr.margin !== null) preview = purchasePrice + Number(pr.margin);

            return (
              <div key={pl.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 60px auto', gap: 10, alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--r2)', border: `1px solid ${pr.active ? 'var(--b2)' : 'var(--b1)'}`, background: pr.active ? 'var(--bg2)' : 'var(--bg3)', opacity: pr.active ? 1 : 0.55, transition: 'opacity .15s' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{pl.name}</div>
                  {preview > 0 && <div style={{ fontSize: 11, color: 'var(--em)', marginTop: 2, fontWeight: 600 }}>≈ {fmtDZD(preview)}</div>}
                </div>
                <select style={{ ...s.sel(), fontSize: 12 }} value={method} onChange={e => updatePrice(pl.id, 'pricing_method', e.target.value as any)}>
                  {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input type="number" min="0" step="0.01" style={{ ...s.inp(), fontSize: 12 }}
                  value={method === 'fixed' ? (pr.price ?? '') : method === 'rate' ? (pr.rate ?? '') : (pr.margin ?? '')}
                  onChange={e => {
                    const k = method === 'fixed' ? 'price' : method === 'rate' ? 'rate' : 'margin';
                    updatePrice(pl.id, k as any, e.target.value === '' ? '' : +e.target.value);
                    if (method === 'fixed')  { updatePrice(pl.id, 'rate', '');  updatePrice(pl.id, 'margin', ''); }
                    if (method === 'rate')   { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'margin', ''); }
                    if (method === 'margin') { updatePrice(pl.id, 'price', ''); updatePrice(pl.id, 'rate', ''); }
                  }}
                  placeholder={method === 'rate' ? '% فوق الشراء' : method === 'margin' ? 'هامش دج' : 'سعر دج'} />
                <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center' }}>{method === 'rate' ? '%' : 'دج'}</div>
                <Toggle checked={pr.active} onChange={v => updatePrice(pl.id, 'active', v)} label="" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderPackagings() {
    return (
      <div style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>التعبئات تمثل وحدات البيع المختلفة (وحدة، كرتون، باليطة...)</div>
          <button onClick={addPackaging} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة تعبئة
          </button>
        </div>

        {form.packagings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--t4)' }}>
            <i className="ti ti-package" style={{ fontSize: 36, opacity: 0.3 }} />
            <div style={{ marginTop: 10, fontSize: 13 }}>لا توجد تعبئات — المنتج يُباع بوحدته الأساسية</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 90px 60px 60px auto', gap: 8, padding: '0 12px' }}>
              {['الكود', 'الاسم', 'الكمية', 'الباركود', 'افتراضي', 'نشط', ''].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
              ))}
            </div>
            {form.packagings.map((pkg, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '70px 110px 1fr 90px 60px 60px auto', gap: 8, alignItems: 'center', padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
                <input placeholder="UN" style={{ ...s.inp(), textTransform: 'uppercase', fontSize: 12 }} value={pkg.code} onChange={e => updatePackaging(idx, 'code', e.target.value.toUpperCase())} />
                <input placeholder="قارورة" style={{ ...s.inp(), fontSize: 12 }} value={pkg.label} onChange={e => updatePackaging(idx, 'label', e.target.value)} />
                <input type="number" min="0.0001" step="1" placeholder="الكمية" style={{ ...s.inp(), fontSize: 12 }} value={pkg.quantity} onChange={e => updatePackaging(idx, 'quantity', e.target.value ? +e.target.value : '')} />
                <input placeholder="باركود" style={{ ...s.inp(), fontSize: 11 }} value={pkg.barcode} onChange={e => updatePackaging(idx, 'barcode', e.target.value)} />
                <div style={{ textAlign: 'center' }}><input type="radio" name="default_pkg" checked={pkg.is_default} onChange={() => updatePackaging(idx, 'is_default', true)} /></div>
                <div style={{ textAlign: 'center' }}><Toggle checked={pkg.active} onChange={v => updatePackaging(idx, 'active', v)} label="" /></div>
                <button onClick={() => removePackaging(idx)} style={{ padding: '6px 8px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 14 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderStock() {
    const dis = !form.manages_stock;
    return (
      <div style={s.section}>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_stock} onChange={v => { setForm(f => ({ ...f, manages_stock: v, allow_negative_stock: v ? f.allow_negative_stock : false })); setIsDirty(true); }} label="إدارة المخزون" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>فعّل هذا الخيار لتتبع الكميات والتنبيهات</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, opacity: dis ? 0.4 : 1, pointerEvents: dis ? 'none' : 'auto' }}>
          {[
            { key: 'allow_negative_stock', label: 'السماح بمخزون سالب', hint: 'يتيح البيع حتى عند نفاد المخزون' },
            { key: 'has_lots',             label: 'إدارة الدفعات (Lots)', hint: 'تتبع دفعات الإنتاج والشراء' },
            { key: 'has_expiration_date',  label: 'تتبع تاريخ الصلاحية', hint: 'يتطلب تفعيل الدفعات أيضاً' },
          ].map(opt => (
            <div key={opt.key} style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
              <Toggle checked={(form as any)[opt.key]} onChange={v => set(opt.key as any, v)} label={opt.label} />
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>{opt.hint}</div>
            </div>
          ))}
          <div style={{ padding: '12px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--b2)', background: 'var(--bg2)' }}>
            <Field label="طريقة التقييم">
              <select style={s.sel()} value={form.valuation_method_id ?? ''} onChange={e => set('valuation_method_id', e.target.value ? Number(e.target.value) : null)}>
                <option value="">— افتراضي الشركة —</option>
                {(valuationMethods as ValuationMethod[]).map(m => <option key={m.id} value={m.id}>{m.name} ({m.method})</option>)}
              </select>
            </Field>
          </div>
        </div>

        <div style={{ opacity: dis ? 0.4 : 1, pointerEvents: dis ? 'none' : 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>تنبيهات المخزون</div>
          <div style={s.row2}>
            <Field label="الحد الأدنى للتنبيه" hint="تنبيه عند الوصول لهذه الكمية">
              <input type="number" min="0" step="1" style={s.inp()} value={form.min_stock_alert} onChange={e => set('min_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
            </Field>
            <Field label="الحد الأقصى المطلوب" hint="لأغراض الطلب وإعادة التموين">
              <input type="number" min="0" step="1" style={s.inp()} value={form.max_stock_alert} onChange={e => set('max_stock_alert', e.target.value === '' ? '' : +e.target.value)} />
            </Field>
          </div>
        </div>
      </div>
    );
  }

  function renderDiscounts() {
    const lvls = priceLevels as PriceLevel[];
    return (
      <div style={s.section}>
        <div style={{ padding: '14px 16px', borderRadius: 'var(--r3)', border: '1px solid var(--b2)', background: 'var(--bg3)' }}>
          <Toggle checked={form.manages_quantity_discounts} onChange={v => set('manages_quantity_discounts', v)} label="تفعيل خصومات الكميات" />
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>أسعار خاصة بناءً على الكمية المطلوبة لكل مستوى سعر</div>
        </div>

        {form.manages_quantity_discounts && lvls.map(pl => {
          const plDiscounts = form.quantity_discounts.filter(d => d.price_level_id === pl.id);
          return (
            <div key={pl.id} style={{ border: '1px solid var(--b2)', borderRadius: 'var(--r3)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg3)', borderBottom: plDiscounts.length ? '1px solid var(--b2)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-tag" style={{ fontSize: 14, color: 'var(--em)' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{pl.name}</span>
                  {plDiscounts.length > 0 && (
                    <span style={{ fontSize: 10, background: 'var(--emb)', color: 'var(--em)', padding: '1px 7px', borderRadius: 12, fontWeight: 700 }}>{plDiscounts.length}</span>
                  )}
                </div>
                <button onClick={() => addDiscount(pl.id)} style={{ padding: '5px 12px', borderRadius: 'var(--r1)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--em)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> إضافة شريحة
                </button>
              </div>

              {plDiscounts.length > 0 && (
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto', gap: 8, padding: '0 4px' }}>
                    {['من كمية', 'إلى كمية', 'خصم دج', 'خصم %', 'مجمد', 'نشط', ''].map((h, i) => (
                      <div key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase' }}>{h}</div>
                    ))}
                  </div>
                  {form.quantity_discounts.map((d, idx) => {
                    if (d.price_level_id !== pl.id) return null;
                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '80px 80px 100px 100px auto auto auto', gap: 8, alignItems: 'center', padding: '8px 4px', borderRadius: 'var(--r1)', background: d.is_blocked ? 'var(--bg3)' : undefined, opacity: d.active ? 1 : 0.5 }}>
                        <input type="number" min="0" step="1" placeholder="1"    style={{ ...s.inp(), fontSize: 12 }} value={d.min_qty} onChange={e => updateDiscount(idx, 'min_qty', e.target.value ? +e.target.value : '')} />
                        <input type="number" min="0" step="1" placeholder="∞"    style={{ ...s.inp(), fontSize: 12 }} value={d.max_qty ?? ''} onChange={e => updateDiscount(idx, 'max_qty', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" step="0.01" placeholder="دج" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_amount ?? ''} onChange={e => updateDiscount(idx, 'discount_amount', e.target.value ? +e.target.value : null)} />
                        <input type="number" min="0" max="100" step="0.1" placeholder="%" style={{ ...s.inp(), fontSize: 12 }} value={d.discount_percentage ?? ''} onChange={e => updateDiscount(idx, 'discount_percentage', e.target.value ? +e.target.value : null)} />
                        <div title="تجميد مؤقت" style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => updateDiscount(idx, 'is_blocked', !d.is_blocked)}>
                          <i className={`ti ${d.is_blocked ? 'ti-lock' : 'ti-lock-open'}`} style={{ fontSize: 16, color: d.is_blocked ? 'var(--red)' : 'var(--t4)' }} />
                        </div>
                        <Toggle checked={d.active} onChange={v => updateDiscount(idx, 'active', v)} label="" />
                        <button onClick={() => removeDiscount(idx)} style={{ padding: '5px 7px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
                          <i className="ti ti-trash" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderDimensions() {
    const dims = [
      { key: 'weight', label: 'الوزن',    unit: 'كغ', step: '0.001' },
      { key: 'volume', label: 'الحجم',    unit: 'م³', step: '0.001' },
      { key: 'length', label: 'الطول',    unit: 'سم', step: '0.1'   },
      { key: 'width',  label: 'العرض',    unit: 'سم', step: '0.1'   },
      { key: 'height', label: 'الارتفاع', unit: 'سم', step: '0.1'   },
    ] as const;

    function addSpec() {
      if (!specKey.trim() || !specVal.trim()) return;
      set('specifications', { ...form.specifications, [specKey.trim()]: specVal.trim() });
      setSpecKey(''); setSpecVal('');
    }

    return (
      <div style={s.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {dims.map(d => (
            <Field key={d.key} label={`${d.label} (${d.unit})`}>
              <input type="number" step={d.step} min="0" style={s.inp()}
                value={(form as any)[d.key] ?? ''}
                onChange={e => set(d.key as any, e.target.value === '' ? '' : +e.target.value)}
                placeholder="0" />
            </Field>
          ))}
        </div>

        <div style={s.divider} />

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase' }}>الخصائص التقنية</div>

          {Object.keys(form.specifications).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--t4)', padding: '8px 0 12px', textAlign: 'center' }}>لا توجد خصائص — أضف مثل اللون، المادة، الطاقة...</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(form.specifications).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input style={{ ...s.inp(), flex: 1, fontSize: 12, fontWeight: 600 }} defaultValue={k}
                  onBlur={e => {
                    const newKey = e.target.value.trim();
                    if (!newKey || newKey === k) return;
                    const sp = { ...form.specifications }; const val = sp[k]; delete sp[k]; sp[newKey] = val;
                    set('specifications', sp);
                  }} placeholder="الخاصية" />
                <input style={{ ...s.inp(), flex: 1, fontSize: 12 }} value={v}
                  onChange={e => set('specifications', { ...form.specifications, [k]: e.target.value })}
                  placeholder="القيمة" />
                <button onClick={() => { const sp = { ...form.specifications }; delete sp[k]; set('specifications', sp); }}
                  style={{ padding: '6px 8px', border: '1px solid var(--b2)', borderRadius: 'var(--r1)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: 13 }}>
                  <i className="ti ti-trash" />
                </button>
              </div>
            ))}
          </div>

          {/* إضافة خاصية */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 'var(--r2)', border: '1px dashed var(--b3)', background: 'var(--bg3)' }}>
            <input placeholder="الخاصية (مثال: اللون)" style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
              value={specKey} onChange={e => setSpecKey(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSpec(); }} />
            <input placeholder="القيمة (مثال: أحمر)" style={{ ...s.inp(), flex: 1, fontSize: 12, background: 'var(--bg2)' }}
              value={specVal} onChange={e => setSpecVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSpec(); }} />
            <button onClick={addSpec} style={{ padding: '7px 14px', borderRadius: 'var(--r2)', border: '1px solid var(--em)', background: 'var(--emb)', color: 'var(--em)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <i className="ti ti-plus" /> إضافة
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4 }}>اضغط Enter لإضافة الخاصية بسرعة</div>
        </div>
      </div>
    );
  }

  function renderMeta() {
    return (
      <div style={s.section}>
        <Field label="slug الرابط" hint="يُولّد تلقائياً من الاسم — يمكن تخصيصه">
          <input style={{ ...s.inp(), direction: 'ltr', fontFamily: 'monospace' }} value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="my-product" />
        </Field>
        <div style={{ fontSize: 11, color: 'var(--t4)', padding: '12px 14px', borderRadius: 'var(--r2)', background: 'var(--bg3)', border: '1px solid var(--b2)', lineHeight: 1.7 }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, marginLeft: 6 }} />
          حقول <strong>meta_title</strong> و <strong>meta_description</strong> و <strong>meta_keywords</strong> تُعدل مستقبلاً عبر واجهة متخصصة.
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════
  // MODAL RENDER
  // ═════════════════════════════════════════

  const tabContent: Record<TabId, () => React.ReactNode> = {
    basic: renderBasic, pricing: renderPricing, packagings: renderPackagings,
    stock: renderStock, discounts: renderDiscounts, dimensions: renderDimensions, meta: renderMeta,
  };

  const currentTabIdx = TAB_IDS.indexOf(activeTab);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        background: 'rgba(0,0,0,.5)',
        backdropFilter: 'blur(3px)',
        // ✅ المودل يظهر أعلى قليلاً من حافة الشاشة السفلية
        paddingTop: '5vh',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 840,
        background: 'var(--bg1)',
        borderRadius: '14px 14px 0 0',
        boxShadow: '0 -8px 48px rgba(0,0,0,.22)',
        display: 'flex', flexDirection: 'column',
        // ✅ ارتفاع ثابت = لا يتغير بتبديل التاب
        height: '95vh',
        overflow: 'hidden',
      }}>

        {/* ══ HEADER ══ */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: '1px solid var(--b2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--emb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-package" style={{ fontSize: 20, color: 'var(--em)' }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--t1)', lineHeight: 1.2 }}>
                {isEdit ? 'تعديل المنتج' : 'منتج جديد'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                {form.name.trim()
                  ? <span style={{ color: form.purchase_price_ht !== '' ? 'var(--em)' : '#f59e0b', fontWeight: 600 }}>{form.name.length > 32 ? form.name.slice(0, 32) + '…' : form.name}</span>
                  : <span>بدون اسم</span>
                }
                {/* ✅ شارة "غير محفوظ" */}
                {isDirty && (
                  <span style={{ fontSize: 10, background: '#f59e0b', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>غير محفوظ</span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* ✅ Keyboard hint */}
            <div style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--bg3)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--b2)' }}>
              Ctrl+S للحفظ
            </div>
            <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--bg3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
              <i className="ti ti-x" style={{ fontSize: 16 }} />
            </button>
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--b2)', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const dot      = tabDot(tab.id);
            const badge    = tabBadge(tab.id);
            return (
              <button key={tab.id} onClick={() => switchTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '11px 14px', fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--em)' : 'var(--t3)', background: 'transparent', border: 'none', borderBottom: `2px solid ${isActive ? 'var(--em)' : 'transparent'}`, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .15s, border-color .15s' }}>
                <i className={`ti ${tab.icon}`} style={{ fontSize: 14 }} />
                {tab.label}
                {/* ✅ عداد */}
                {badge !== null && (
                  <span style={{ fontSize: 10, background: isActive ? 'var(--em)' : 'var(--b3)', color: isActive ? '#fff' : 'var(--t3)', padding: '0 5px', borderRadius: 10, fontWeight: 700, minWidth: 16, textAlign: 'center', lineHeight: '16px', height: 16 }}>
                    {badge}
                  </span>
                )}
                {/* نقطة الحالة */}
                {dot !== 'empty' && badge === null && (
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(dot), flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* ══ BODY ══ */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', scrollbarWidth: 'thin' }}>
          {/* ✅ API Error مع زر إغلاق */}
          {apiError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--r2)', marginBottom: 16, background: 'rgba(255,80,80,.08)', border: '1px solid rgba(255,80,80,.3)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <i className="ti ti-alert-circle" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }} />
              <span style={{ flex: 1 }}>{apiError}</span>
              <button onClick={() => setApiError('')} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 14, padding: 0, opacity: 0.7 }}>
                <i className="ti ti-x" />
              </button>
            </div>
          )}
          {tabContent[activeTab]()}
        </div>

        {/* ══ FOOTER ══ */}
        <div style={{ padding: '11px 20px', borderTop: '1px solid var(--b2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: 'var(--bg2)' }}>
          {/* ملخص */}
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap' }}>
            {form.name.trim() && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> اسم</span>}
            {form.purchase_price_ht !== '' && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {fmtDZD(form.purchase_price_ht)}</span>}
            {form.prices.some(p => p.price !== '' || p.rate !== '' || p.margin !== '') && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {form.prices.filter(p => p.price !== '' || p.rate !== '' || p.margin !== '').length} أسعار</span>}
            {form.packagings.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i className="ti ti-check" style={{ fontSize: 12, color: 'var(--green)' }} /> {form.packagings.length} تعبئة</span>}
          </div>

          {/* ✅ أزرار التنقل + الحفظ */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {currentTabIdx > 0 && (
              <button onClick={() => switchTab(TAB_IDS[currentTabIdx - 1])} style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}>
                <i className="ti ti-chevron-right" style={{ fontSize: 13 }} /> السابق
              </button>
            )}
            {currentTabIdx < TAB_IDS.length - 1 && (
              <button onClick={() => switchTab(TAB_IDS[currentTabIdx + 1])} style={{ padding: '7px 13px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Tajawal, inherit' }}>
                التالي <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
              </button>
            )}
            <div style={{ width: 1, height: 22, background: 'var(--b2)', margin: '0 2px' }} />
            <button onClick={handleClose} disabled={mutation.isPending} style={{ padding: '8px 16px', borderRadius: 'var(--r2)', border: '1px solid var(--b3)', background: 'transparent', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Tajawal, inherit' }}>
              إلغاء
            </button>
            <button onClick={handleSubmit} disabled={mutation.isPending} style={{ padding: '8px 22px', borderRadius: 'var(--r2)', border: 'none', background: mutation.isPending ? 'var(--b3)' : 'var(--em)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: mutation.isPending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Tajawal, inherit', transition: 'background .15s', boxShadow: mutation.isPending ? 'none' : '0 2px 8px rgba(0,0,0,.15)' }}>
              {mutation.isPending
                ? <><i className="ti ti-loader" style={{ fontSize: 15, animation: 'spin 1s linear infinite' }} /> جاري الحفظ...</>
                : <><i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> {isEdit ? 'حفظ التعديلات' : 'إنشاء المنتج'}</>
              }
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
```

## FILE: resources/js/components/sidebar/Sidebar.tsx
```
```

## FILE: resources/js/components/sidebar/SidebarItem.tsx
```
```

## FILE: resources/js/components/sidebar/SidebarSection.tsx
```
```

## FILE: resources/js/components/topbar/SuperAdminButton.tsx
```
// ════════════════════════════════════════════════
// components/topbar/SuperAdminButton.tsx
// زر الوصول السريع للوحة تحكم السوبر أدمن
// أضفه في Topbar.tsx بجانب أزرار الأيقونات
// ════════════════════════════════════════════════
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function SuperAdminButton() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin =
    (user as any)?.roles?.some((r: any) => r.name === 'super-admin') ||
    (user as any)?.role === 'super_admin';

  if (!isSuperAdmin) return null;

  return (
    <button
      onClick={() => navigate('/admin')}
      title="لوحة تحكم النظام"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 10px', borderRadius: 8,
        border: '1px solid #ef444433', background: '#ef44440d',
        color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      }}
    >
      <i className="ti ti-shield-lock" style={{ fontSize: 15 }} />
      <span>Admin</span>
    </button>
  );
}
```

## FILE: resources/js/components/topbar/Topbar.tsx
```
```

## FILE: resources/js/components/ui/AlertBar.tsx
```
// components/ui/AlertBar.tsx
import React, { useState } from 'react';

type AlertVariant = 'green' | 'gold' | 'red' | 'blue';

interface AlertBarProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  dismissible?: boolean;
}

const variantMap: Record<AlertVariant, string> = {
  green: 'al-g',
  gold:  'al-w',
  red:   'al-r',
  blue:  'al-b',
};

const iconMap: Record<AlertVariant, string> = {
  green: 'ti-alert-triangle',
  gold:  'ti-alert-circle',
  red:   'ti-alert-triangle',
  blue:  'ti-info-circle',
};

export default function AlertBar({ variant = 'green', children, dismissible = true }: AlertBarProps) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className={`al ${variantMap[variant]}`}
      style={{ borderRadius: 'var(--r3)', marginBottom: 18 }}
    >
      <span className="ic ic-sm" style={{ flexShrink: 0, marginTop: 1 }}>
        <i className={`ti ${iconMap[variant]}`} />
      </span>
      <div style={{ flex: 1 }}>{children}</div>
      {dismissible && (
        <button
          onClick={() => setVisible(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, flexShrink: 0, padding: 0, color: 'inherit' }}
        >
          <i className="ti ti-x" />
        </button>
      )}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Avatar.tsx
```
// components/ui/Avatar.tsx
import React from 'react';

type AvatarColor = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface AvatarProps {
  initials: string;
  color?: AvatarColor;
  size?: number;
  fontSize?: number;
}

export default function Avatar({ initials, color = 1, size = 36, fontSize }: AvatarProps) {
  const fs = fontSize ?? Math.round(size * 0.36);
  return (
    <div
      className={`av av${color}`}
      style={{ width: size, height: size, fontSize: fs, minWidth: size }}
    >
      {initials}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Badge.tsx
```
// components/ui/Badge.tsx
import React from 'react';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'teal' | 'orange' | 'gray' | 'indigo';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  noDot?: boolean;
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'be',
  danger:  'br',
  warning: 'bg',
  info:    'bb',
  purple:  'bp',
  teal:    'bt',
  orange:  'bo',
  gray:    'bz',
  indigo:  'bi',
};

export default function Badge({ children, variant = 'success', className = '', noDot = false }: BadgeProps) {
  return (
    <span className={`bx ${variantMap[variant]} ${noDot ? 'no-dot' : ''} ${className}`}>
      {children}
    </span>
  );
}
```

## FILE: resources/js/components/ui/Breadcrumb.tsx
```
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  className?: string;
}

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  separator = <ChevronRight />,
  className = '',
}) => {
  return (
    <nav aria-label="breadcrumb" className={`breadcrumb ${className}`}>
      <ol className="breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="breadcrumb__item">
              {index > 0 && (
                <span className="breadcrumb__separator" aria-hidden="true">
                  {separator}
                </span>
              )}
              {isLast ? (
                <span className="breadcrumb__current" aria-current="page">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </span>
              ) : item.href ? (
                <a href={item.href} className="breadcrumb__link">
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </a>
              ) : (
                <button
                  type="button"
                  className="breadcrumb__link breadcrumb__button"
                  onClick={item.onClick}
                >
                  {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
                  {item.label}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .breadcrumb { display: inline-flex; }
        .breadcrumb__list {
          display: flex; align-items: center; flex-wrap: wrap;
          list-style: none; margin: 0; padding: 0; gap: 2px;
        }
        .breadcrumb__item { display: flex; align-items: center; gap: 2px; }
        .breadcrumb__separator {
          display: flex; align-items: center;
          color: var(--color-text-tertiary);
          margin: 0 2px;
        }
        .breadcrumb__link, .breadcrumb__button {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; color: var(--color-text-secondary);
          text-decoration: none; background: none; border: none;
          padding: 2px 4px; border-radius: 4px; cursor: pointer;
          transition: color 0.15s, background 0.15s;
        }
        .breadcrumb__link:hover, .breadcrumb__button:hover {
          color: var(--color-text-primary);
          background: var(--color-background-secondary);
        }
        .breadcrumb__current {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 13px; font-weight: 500; color: var(--color-text-primary);
          padding: 2px 4px;
        }
        .breadcrumb__icon { display: flex; align-items: center; font-size: 14px; }
      `}</style>
    </nav>
  );
};

export default Breadcrumb;
```

## FILE: resources/js/components/ui/Button.tsx
```
// Note: The CSS classes like 'btn', 'btn-p', 'btn-r', etc., should be defined in your CSS files to style the button accordingly.
// components/ui/Button.tsx
import React from 'react';

type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info';
type ButtonSize    = 'xs' | 'sm' | 'md';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;           // 🆕 إضافة
  children?: React.ReactNode;
}

const variantMap: Record<ButtonVariant, string> = {
  default: '',
  primary: 'btn-p',
  danger:  'btn-r',
  warning: 'btn-g',
  info:    'btn-b',
};

const sizeMap: Record<ButtonSize, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
};

export default function Button({
  variant = 'default',
  size = 'md',
  icon,
  fullWidth = false,
  loading = false,            // 🆕
  children,
  className = '',
  disabled: externalDisabled,
  ...props
}: ButtonProps) {
  const isDisabled = externalDisabled || loading;   // يعطل الزر أثناء التحميل

  return (
    <button
      className={`btn ${variantMap[variant]} ${sizeMap[size]} ${fullWidth ? 'btn-w' : ''} ${className}`}
      disabled={isDisabled}
      {...props}    // لا نمرر loading هنا
    >
      {/* أيقونة التحميل أو الأيقونة العادية */}
      {loading ? (
        <span className="ic ic-xs" style={{ animation: 'spin 1s linear infinite' }}>
          <i className="ti ti-loader" />
        </span>
      ) : icon ? (
        <span className="ic ic-xs">{icon}</span>
      ) : null}
      {loading ? 'جارٍ التحميل...' : children}
    </button>
  );
}
```

## FILE: resources/js/components/ui/Card.tsx
```
// components/ui/Card.tsx
import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  padding?: string | number;
  noHeader?: boolean;
}

export default function Card({
  title, subtitle, actions, children, style, padding, noHeader = false,
}: CardProps) {
  const hasHeader = !noHeader && (title || subtitle || actions);
  return (
    <div className="card" style={{ ...(padding !== undefined ? { padding } : {}), ...style }}>
      {hasHeader && (
        <div className="card-hd">
          <div>
            {title && <div className="card-title">{title}</div>}
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
```

## FILE: resources/js/components/ui/ConfirmDeleteModal.tsx
```
// resources/js/components/ui/ConfirmDeleteModal.tsx
import React from 'react';
import Modal  from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

interface Props {
    /** هل المودال مفتوح */
    open: boolean;
    /** دالة الإغلاق */
    onClose: () => void;
    /** دالة تأكيد الحذف */
    onConfirm: () => void;
    /** هل الحذف جارٍ (من useMutation.isPending) */
    loading?: boolean;
    /** اسم العنصر المراد حذفه — يظهر في الرسالة */
    itemName?: string;
    /** رسالة تحذير مخصصة تحت الاسم (اختياري) */
    warning?: string;
}

/**
 * مودال تأكيد الحذف — مكوّن مشترك لكامل المشروع
 *
 * الاستخدام:
 * ```tsx
 * const deleteModal = useModal();
 * const [deletingId, setDeletingId] = useState<number | null>(null);
 *
 * const deleteMutation = useMutation({
 *   mutationFn: (id: number) => apiClient.delete(`/resource/${id}`),
 *   onSuccess: () => { qc.invalidateQueries(...); deleteModal.closeModal(); },
 * });
 *
 * // عند الضغط على أيقونة الحذف:
 * const handleDelete = (id: number) => {
 *   setDeletingId(id);
 *   deleteModal.openModal();
 * };
 *
 * <ConfirmDeleteModal
 *   open={deleteModal.open}
 *   onClose={deleteModal.closeModal}
 *   onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
 *   loading={deleteMutation.isPending}
 *   itemName="الصندوق الرئيسي"
 * />
 * ```
 */
export default function ConfirmDeleteModal({
    open,
    onClose,
    onConfirm,
    loading = false,
    itemName,
    warning,
}: Props) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title="تأكيد الحذف"
            footer={
                <>
                    <Button onClick={onClose} disabled={loading}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        icon={<i className="ti ti-trash" />}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'جاري الحذف...' : 'حذف'}
                    </Button>
                </>
            }
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                padding: '8px 0 4px',
                textAlign: 'center',
            }}>
                {/* أيقونة التحذير */}
                <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'var(--red-bg, #fff1f0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <i className="ti ti-trash" style={{
                        fontSize: 24,
                        color: 'var(--red, #e03e3e)',
                    }} />
                </div>

                {/* النص الرئيسي */}
                <div>
                    <p style={{
                        margin: 0,
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--t1)',
                        lineHeight: 1.5,
                    }}>
                        {itemName
                            ? <>هل تريد حذف <span style={{ color: 'var(--red, #e03e3e)' }}>«{itemName}»</span>؟</>
                            : 'هل تريد حذف هذا العنصر؟'
                        }
                    </p>

                    <p style={{
                        margin: '6px 0 0',
                        fontSize: 13,
                        color: 'var(--t4)',
                        lineHeight: 1.6,
                    }}>
                        {warning ?? 'لا يمكن التراجع عن هذا الإجراء بعد التأكيد.'}
                    </p>
                </div>
            </div>
        </Modal>
    );
}
```

## FILE: resources/js/components/ui/DatePicker.tsx
```
import React, { useState, useRef, useEffect, useId } from 'react';

interface DatePickerProps {
  value?: string; // ISO date: YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const DAYS = ['أح', 'إث', 'ث', 'أر', 'خ', 'ج', 'س'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDisplay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MONTHS[parseInt(m) - 1]} ${y}`;
}
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'اختر تاريخاً',
  error,
  min,
  max,
  disabled = false,
  clearable = true,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(value ? parseInt(value.split('-')[0]) : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(value ? parseInt(value.split('-')[1]) - 1 : today.getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDay = (day: number) => {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    onChange(iso);
    setOpen(false);
  };

  const isDisabled = (iso: string) => {
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  };

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: days}, (_, i) => i + 1)];

  return (
    <div className={`dp-wrapper ${className}`} ref={ref}>
      {label && <label className="dp-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dp-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
      >
        <svg className="dp-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span className={!value ? 'dp-placeholder' : ''}>{value ? formatDisplay(value) : placeholder}</span>
        {clearable && value && !disabled && (
          <span className="dp-clear" onClick={e => { e.stopPropagation(); onChange(''); }}>✕</span>
        )}
      </button>

      {error && <span className="dp-error">{error}</span>}

      {open && (
        <div className="dp-calendar" role="dialog" aria-label="تقويم">
          {/* Navigation */}
          <div className="dp-nav">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>‹</button>
            <span className="dp-nav-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>›</button>
          </div>

          {/* Day headers */}
          <div className="dp-grid">
            {DAYS.map(d => <div key={d} className="dp-day-header">{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const iso = `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isSel = iso === value;
              const isToday = iso === todayISO();
              const isDis = isDisabled(iso);
              return (
                <button
                  key={day}
                  type="button"
                  className={`dp-day ${isSel ? 'selected' : ''} ${isToday && !isSel ? 'today' : ''} ${isDis ? 'disabled' : ''}`}
                  onClick={() => !isDis && selectDay(day)}
                  disabled={isDis}
                  aria-label={iso}
                  aria-pressed={isSel}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <div className="dp-footer">
            <button type="button" className="dp-today-btn" onClick={() => {
              const t = todayISO();
              if (!isDisabled(t)) { onChange(t); setOpen(false); }
            }}>اليوم</button>
          </div>
        </div>
      )}

      <style>{`
        .dp-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .dp-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dp-trigger {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; width: 100%;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color .15s, box-shadow .15s;
          text-align: start;
        }
        .dp-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dp-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dp-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dp-trigger.disabled { opacity: .5; cursor: not-allowed; }
        .dp-icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .dp-placeholder { color: var(--color-text-tertiary); flex: 1; }
        .dp-trigger span:not(.dp-placeholder):not(.dp-clear) { flex: 1; }
        .dp-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; margin-inline-start: auto; }
        .dp-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dp-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dp-calendar {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 10px; padding: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          min-width: 260px;
          animation: dp-open .12s ease;
        }
        @keyframes dp-open { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        .dp-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .dp-nav-btn { background: none; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 18px; color: var(--color-text-secondary); line-height: 1; }
        .dp-nav-btn:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .dp-nav-title { font-size: 14px; font-weight: 500; color: var(--color-text-primary); }
        .dp-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
        .dp-day-header { text-align: center; font-size: 11px; font-weight: 500; color: var(--color-text-tertiary); padding: 4px 0; }
        .dp-day {
          display: flex; align-items: center; justify-content: center;
          height: 32px; border-radius: 6px; border: none; background: none;
          font-size: 13px; cursor: pointer; color: var(--color-text-primary);
          transition: background .1s, color .1s;
        }
        .dp-day:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dp-day.today { font-weight: 600; color: var(--color-text-info, #3b82f6); }
        .dp-day.today::after { content:''; display:block; width:4px; height:4px; background: currentColor; border-radius:50%; position:absolute; bottom:3px; }
        .dp-day.today { position: relative; }
        .dp-day.selected { background: var(--color-text-info, #3b82f6); color: #fff; font-weight: 500; }
        .dp-day.disabled { opacity: .3; cursor: not-allowed; }
        .dp-footer { margin-top: 8px; border-top: 1px solid var(--color-border-tertiary); padding-top: 8px; display: flex; justify-content: center; }
        .dp-today-btn { background: none; border: none; font-size: 13px; cursor: pointer; color: var(--color-text-info, #3b82f6); font-weight: 500; padding: 4px 8px; border-radius: 6px; }
        .dp-today-btn:hover { background: var(--color-background-secondary); }
      `}</style>
    </div>
  );
};

export default DatePicker;
```

## FILE: resources/js/components/ui/Drawer.tsx
```
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
type DrawerPosition = 'right' | 'left';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: DrawerSize;
  position?: DrawerPosition;
  closeOnOverlay?: boolean;
  className?: string;
}

const sizeMap: Record<DrawerSize, string> = {
  sm: '360px',
  md: '480px',
  lg: '600px',
  xl: '760px',
  full: '100vw',
};

const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  position = 'right',
  closeOnOverlay = true,
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const width = sizeMap[size];

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.[0]?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={closeOnOverlay ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        className={`drawer drawer--${position} ${open ? 'open' : ''} ${className}`}
        style={{ '--drawer-width': width } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="drawer__header">
          <div className="drawer__header-text">
            {title && <h2 className="drawer__title">{title}</h2>}
            {description && <p className="drawer__description">{description}</p>}
          </div>
          <button className="drawer__close" onClick={onClose} aria-label="إغلاق">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="drawer__body">
          {children}
        </div>

        {/* Footer */}
        {footer && <div className="drawer__footer">{footer}</div>}
      </div>

      <style>{`
        .drawer-overlay {
          position: fixed; inset: 0; z-index: 1040;
          background: rgba(0,0,0,0.4);
          opacity: 0; pointer-events: none;
          transition: opacity 0.25s;
        }
        .drawer-overlay.open { opacity: 1; pointer-events: auto; }

        .drawer {
          position: fixed; top: 0; bottom: 0; z-index: 1050;
          width: min(var(--drawer-width), 100vw);
          background: var(--color-background-primary);
          border-inline-start: 1px solid var(--color-border-tertiary);
          display: flex; flex-direction: column;
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          box-shadow: -4px 0 24px rgba(0,0,0,0.08);
        }
        .drawer--right { right: 0; transform: translateX(100%); }
        .drawer--left  { left:  0; transform: translateX(-100%); }
        .drawer--right.open,
        .drawer--left.open  { transform: translateX(0); }

        .drawer__header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 12px; padding: 20px 20px 16px;
          border-bottom: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
        .drawer__header-text { display: flex; flex-direction: column; gap: 2px; }
        .drawer__title { margin: 0; font-size: 16px; font-weight: 500; color: var(--color-text-primary); }
        .drawer__description { margin: 0; font-size: 13px; color: var(--color-text-secondary); }
        .drawer__close {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border: none; background: transparent;
          border-radius: 6px; cursor: pointer; color: var(--color-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .drawer__close:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .drawer__body { flex: 1; overflow-y: auto; padding: 20px; }
        .drawer__footer {
          padding: 16px 20px;
          border-top: 1px solid var(--color-border-tertiary);
          flex-shrink: 0;
        }
      `}</style>
    </>,
    document.body
  );
};

export default Drawer;
```

## FILE: resources/js/components/ui/Dropdown.tsx
```
import React, { useState, useRef, useEffect, useId } from 'react';

export interface DropdownOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  clearable?: boolean;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'اختر...',
  disabled = false,
  label,
  error,
  clearable = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (opt: DropdownOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div className={`dropdown-wrapper ${className}`} ref={ref}>
      {label && <label className="dropdown-label" htmlFor={id}>{label}</label>}

      <button
        id={id}
        type="button"
        className={`dropdown-trigger ${open ? 'open' : ''} ${error ? 'has-error' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
      >
        <span className={`dropdown-trigger__value ${!selected ? 'placeholder' : ''}`}>
          {selected?.icon && <span className="dropdown-trigger__icon">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <span className="dropdown-trigger__actions">
          {clearable && value && (
            <span className="dropdown-clear" onClick={handleClear} aria-label="مسح">✕</span>
          )}
          <span className={`dropdown-chevron ${open ? 'rotated' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </span>
      </button>

      {error && <span className="dropdown-error">{error}</span>}

      {open && (
        <ul className="dropdown-menu" role="listbox">
          {options.map(opt => (
            <li
              key={opt.value}
              className={`dropdown-item ${opt.value === value ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => handleSelect(opt)}
            >
              {opt.icon && <span className="dropdown-item__icon">{opt.icon}</span>}
              {opt.label}
              {opt.value === value && (
                <svg className="dropdown-item__check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </li>
          ))}
          {options.length === 0 && (
            <li className="dropdown-empty">لا توجد خيارات</li>
          )}
        </ul>
      )}

      <style>{`
        .dropdown-wrapper { position: relative; display: flex; flex-direction: column; gap: 4px; }
        .dropdown-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .dropdown-trigger {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; padding: 8px 12px; gap: 8px;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; cursor: pointer;
          font-size: 14px; color: var(--color-text-primary);
          transition: border-color 0.15s, box-shadow 0.15s;
          text-align: start;
        }
        .dropdown-trigger:hover:not(.disabled) { border-color: var(--color-border-primary); }
        .dropdown-trigger.open { border-color: var(--color-text-info, #3b82f6); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent); }
        .dropdown-trigger.has-error { border-color: var(--color-text-danger, #ef4444); }
        .dropdown-trigger.disabled { opacity: 0.5; cursor: not-allowed; }
        .dropdown-trigger__value { display: flex; align-items: center; gap: 6px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .dropdown-trigger__value.placeholder { color: var(--color-text-tertiary); }
        .dropdown-trigger__actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
        .dropdown-clear { font-size: 11px; color: var(--color-text-secondary); padding: 2px 4px; border-radius: 4px; line-height: 1; }
        .dropdown-clear:hover { color: var(--color-text-primary); background: var(--color-background-secondary); }
        .dropdown-chevron { display: flex; color: var(--color-text-secondary); transition: transform 0.2s; }
        .dropdown-chevron.rotated { transform: rotate(180deg); }
        .dropdown-error { font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .dropdown-menu {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 1000;
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-secondary);
          border-radius: 8px; list-style: none; margin: 0; padding: 4px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          max-height: 240px; overflow-y: auto;
          animation: dropdown-open 0.12s ease;
        }
        @keyframes dropdown-open {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-item {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 10px; border-radius: 6px;
          font-size: 14px; cursor: pointer; color: var(--color-text-primary);
          transition: background 0.1s;
        }
        .dropdown-item:hover:not(.disabled) { background: var(--color-background-secondary); }
        .dropdown-item.selected { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .dropdown-item.disabled { opacity: 0.4; cursor: not-allowed; }
        .dropdown-item__icon { display: flex; flex-shrink: 0; }
        .dropdown-item__check { margin-inline-start: auto; color: var(--color-text-info, #3b82f6); }
        .dropdown-empty { padding: 12px 10px; text-align: center; color: var(--color-text-tertiary); font-size: 13px; }
      `}</style>
    </div>
  );
};

export default Dropdown;
```

## FILE: resources/js/components/ui/EmptyState.tsx
```
// components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;       // Tabler icon class e.g. "ti-package"
  text: string;
  sub?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = 'ti-mood-empty', text, sub, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-ic"><i className={`ti ${icon}`} /></div>
      <div className="empty-tx">{text}</div>
      {sub && <div className="empty-sub">{sub}</div>}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/FileUploader.tsx
```
import React, { useRef, useState, useId } from 'react';

interface FileUploaderProps {
  onChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // bytes
  maxFiles?: number;
  label?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onChange,
  accept,
  multiple = false,
  maxSize,
  maxFiles = 10,
  label,
  hint,
  error,
  disabled = false,
  className = '',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const id = useId();

  const validate = (rawFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];
    const combined = multiple ? [...files, ...rawFiles] : rawFiles;

    if (multiple && combined.length > maxFiles) {
      errors.push(`الحد الأقصى ${maxFiles} ملفات`);
      return { valid, errors };
    }

    for (const f of rawFiles) {
      if (maxSize && f.size > maxSize) {
        errors.push(`${f.name}: الحجم يتجاوز ${formatBytes(maxSize)}`);
        continue;
      }
      valid.push(f);
    }
    return { valid, errors };
  };

  const addFiles = (rawFiles: FileList | null) => {
    if (!rawFiles || disabled) return;
    const { valid, errors } = validate(Array.from(rawFiles));
    setLocalErrors(errors);
    if (!valid.length) return;
    const updated = multiple ? [...files, ...valid] : valid;
    setFiles(updated);
    onChange(updated);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onChange(updated);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={`fu-wrapper ${className}`}>
      {label && <label className="fu-label" htmlFor={id}>{label}</label>}

      <div
        className={`fu-zone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''} ${error || localErrors.length ? 'has-error' : ''}`}
        onDragOver={e => { e.preventDefault(); !disabled && setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="منطقة رفع الملفات"
        onKeyDown={e => e.key === 'Enter' && !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="fu-input"
          onChange={e => addFiles(e.target.files)}
          disabled={disabled}
        />

        <div className="fu-zone__content">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="fu-zone__icon">
            <path d="M16 4v16M9 11l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M6 24h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".5"/>
            <path d="M4 28h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".3"/>
          </svg>
          <p className="fu-zone__text">
            {dragging ? 'أفلت الملف هنا' : 'اسحب وأفلت أو'}
            {!dragging && <span className="fu-zone__link"> انقر للاختيار</span>}
          </p>
          {hint && <p className="fu-zone__hint">{hint}</p>}
          {maxSize && <p className="fu-zone__hint">الحد الأقصى: {formatBytes(maxSize)}</p>}
        </div>
      </div>

      {/* Errors */}
      {(error || localErrors.length > 0) && (
        <div className="fu-errors">
          {error && <p className="fu-error">{error}</p>}
          {localErrors.map((e, i) => <p key={i} className="fu-error">{e}</p>)}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="fu-list">
          {files.map((file, i) => (
            <li key={i} className="fu-file">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="fu-file__icon">
                <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              <div className="fu-file__info">
                <span className="fu-file__name">{file.name}</span>
                <span className="fu-file__size">{formatBytes(file.size)}</span>
              </div>
              <button
                type="button"
                className="fu-file__remove"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                aria-label={`حذف ${file.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3L3 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .fu-wrapper { display: flex; flex-direction: column; gap: 6px; }
        .fu-label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); }
        .fu-input { display: none; }
        .fu-zone {
          border: 2px dashed var(--color-border-secondary);
          border-radius: 10px; padding: 28px 20px;
          cursor: pointer; transition: border-color .15s, background .15s;
          text-align: center; outline: none;
        }
        .fu-zone:hover:not(.disabled), .fu-zone:focus:not(.disabled) { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 4%, transparent); }
        .fu-zone.dragging { border-color: var(--color-text-info, #3b82f6); background: color-mix(in srgb, var(--color-text-info, #3b82f6) 8%, transparent); }
        .fu-zone.has-error { border-color: var(--color-text-danger, #ef4444); }
        .fu-zone.disabled { opacity: .5; cursor: not-allowed; }
        .fu-zone__content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .fu-zone__icon { color: var(--color-text-tertiary); margin-bottom: 4px; }
        .fu-zone__text { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .fu-zone__link { color: var(--color-text-info, #3b82f6); font-weight: 500; }
        .fu-zone__hint { margin: 0; font-size: 12px; color: var(--color-text-tertiary); }
        .fu-errors { display: flex; flex-direction: column; gap: 2px; }
        .fu-error { margin: 0; font-size: 12px; color: var(--color-text-danger, #ef4444); }
        .fu-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
        .fu-file {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 8px;
          background: var(--color-background-secondary);
          border: 1px solid var(--color-border-tertiary);
        }
        .fu-file__icon { color: var(--color-text-secondary); flex-shrink: 0; }
        .fu-file__info { flex: 1; overflow: hidden; }
        .fu-file__name { display: block; font-size: 13px; color: var(--color-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .fu-file__size { font-size: 12px; color: var(--color-text-tertiary); }
        .fu-file__remove {
          flex-shrink: 0; display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border: none; background: none;
          border-radius: 4px; cursor: pointer; color: var(--color-text-secondary);
        }
        .fu-file__remove:hover { background: var(--color-background-primary); color: var(--color-text-danger, #ef4444); }
      `}</style>
    </div>
  );
};

export default FileUploader;
```

## FILE: resources/js/components/ui/ImageUploader.tsx
```
// resources/js/components/ui/ImageUploader.tsx
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { productService } from '@/services/productService';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
}

export default function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const newUrls = [...value];
    for (const file of acceptedFiles) {
      try {
        const { url } = await productService.uploadImage(file);
        newUrls.push(url);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    onChange(newUrls);
  }, [value, onChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newUrls = [...value];
    newUrls.splice(index, 1);
    onChange(newUrls);
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>أفلت الصور هنا...</p>
        ) : (
          <p>اسحب وأفلت الصور هنا، أو انقر للاختيار</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        {value.map((url, idx) => (
          <div key={idx} className="relative w-20 h-20">
            <img src={url} alt={`upload-${idx}`} className="w-full h-full object-cover rounded" />
            <button
              type="button"
              onClick={() => removeImage(idx)}
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/ui/KpiCard.tsx
```
// components/ui/KpiCard.tsx
import React from 'react';

type KpiVariant = 'green' | 'gold' | 'blue' | 'red' | 'purple' | 'teal' | 'orange';
type TrendDir   = 'up' | 'down' | 'neutral';

interface KpiCardProps {
  variant?: KpiVariant;
  icon: string;            // Tabler icon e.g. "ti-cash"
  label: string;
  value: React.ReactNode;
  unit?: string;           // e.g. "دج"
  trend?: string;
  trendDir?: TrendDir;
  sub?: React.ReactNode;
  onClick?: () => void;
}

const varMap: Record<KpiVariant, string> = {
  green:  'ke',
  gold:   'kg',
  blue:   'kb',
  red:    'kr',
  purple: 'kp',
  teal:   'kt',
  orange: 'ko',
};

const trendClass: Record<TrendDir, string> = {
  up:      'up',
  down:    'dn',
  neutral: 'neu',
};

export default function KpiCard({
  variant = 'green', icon, label, value, unit,
  trend, trendDir = 'up', sub, onClick,
}: KpiCardProps) {
  return (
    <div className={`kpi ${varMap[variant]}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div className="kpi-top">
        <div className="kpi-ic ic">
          <i className={`ti ${icon}`} />
        </div>
        {trend && (
          <div className={`kpi-trend ${trendClass[trendDir]}`}>{trend}</div>
        )}
      </div>
      <div className="kpi-lbl">{label}</div>
      <div className="kpi-val">
        {unit && <span className="u">{unit}</span>}
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Modal.tsx
```
// components/ui/Modal.tsx
import React, { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  footerLeft?: React.ReactNode;
  children: React.ReactNode;
}

const sizeMap = { sm: 'modal-sm', md: '', lg: 'modal-lg' };

export default function Modal({
  open, onClose, title, subtitle,
  size = 'md', footer, footerLeft, children,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className={`ov ${open ? 'on' : ''}`} onClick={onClose}>
      <div
        className={`modal ${sizeMap[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="m-hd">
          <div>
            <div className="m-title">{title}</div>
            {subtitle && <div className="m-sub">{subtitle}</div>}
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Body */}
        <div className="m-body">{children}</div>

        {/* Footer */}
        {(footer || footerLeft) && (
          <div className="m-foot">
            {footerLeft && <div className="m-foot-l">{footerLeft}</div>}
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
```

## FILE: resources/js/components/ui/PageHeader.tsx
```
import React from 'react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

interface PageHeaderBadge {
  label: string;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default';
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: PageHeaderBadge;
  tabs?: React.ReactNode;
  className?: string;
}

const badgeVars: Record<string, string> = {
  success: 'var(--color-background-success, #f0fdf4)',
  warning: 'var(--color-background-warning, #fffbeb)',
  danger:  'var(--color-background-danger,  #fef2f2)',
  info:    'var(--color-background-info,    #eff6ff)',
  default: 'var(--color-background-secondary)',
};
const badgeText: Record<string, string> = {
  success: 'var(--color-text-success, #16a34a)',
  warning: 'var(--color-text-warning, #d97706)',
  danger:  'var(--color-text-danger,  #dc2626)',
  info:    'var(--color-text-info,    #2563eb)',
  default: 'var(--color-text-secondary)',
};

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumb,
  actions,
  badge,
  tabs,
  className = '',
}) => {
  const variant = badge?.variant ?? 'default';

  return (
    <div className={`ph-wrapper ${className}`}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="ph-breadcrumb">
          <Breadcrumb items={breadcrumb} />
        </div>
      )}

      {/* Main row */}
      <div className="ph-main">
        <div className="ph-title-group">
          <div className="ph-title-row">
            <h1 className="ph-title">{title}</h1>
            {badge && (
              <span
                className="ph-badge"
                style={{
                  background: badgeVars[variant],
                  color: badgeText[variant],
                }}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && <p className="ph-description">{description}</p>}
        </div>

        {actions && <div className="ph-actions">{actions}</div>}
      </div>

      {/* Tabs slot */}
      {tabs && <div className="ph-tabs">{tabs}</div>}

      <style>{`
        .ph-wrapper { display: flex; flex-direction: column; gap: 6px; padding-bottom: 20px; }
        .ph-breadcrumb { margin-bottom: 2px; }
        .ph-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .ph-title-group { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .ph-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ph-title { margin: 0; font-size: 22px; font-weight: 500; color: var(--color-text-primary); line-height: 1.2; }
        .ph-badge {
          display: inline-flex; align-items: center;
          padding: 3px 10px; border-radius: 20px;
          font-size: 12px; font-weight: 500; white-space: nowrap;
        }
        .ph-description { margin: 0; font-size: 14px; color: var(--color-text-secondary); }
        .ph-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
        .ph-tabs { margin-top: 8px; border-bottom: 1px solid var(--color-border-tertiary); }
      `}</style>
    </div>
  );
};

export default PageHeader;
```

## FILE: resources/js/components/ui/Pagination.tsx
```
import React from 'react';
import type { BackendMeta } from '../../hooks/usePagination';

interface PaginationProps {
  meta: BackendMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  perPageOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  className?: string;
}

const PrevIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const NextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function buildPages(current: number, last: number): (number | '...')[] {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(last - 1, current + 1); i++) pages.push(i);
  if (current < last - 2) pages.push('...');
  pages.push(last);
  return pages;
}

const Pagination: React.FC<PaginationProps> = ({
  meta,
  onPageChange,
  onPerPageChange,
  perPageOptions = [10, 15, 25, 50, 100],
  showPageSize = true,
  showTotal = true,
  className = '',
}) => {
  const { current_page, last_page, per_page, total, from, to, is_first_page, is_last_page } = meta;
  const pages = buildPages(current_page, last_page);

  return (
    <div className={`pg-bar ${className}`}>
      {/* Left: total info */}
      {showTotal && (
        <span className="pg-info">
          {from ?? 0}–{to ?? 0} من {total.toLocaleString('ar-DZ')}
        </span>
      )}

      {/* Center: page numbers */}
      <div className="pg-pages">
        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page - 1)}
          disabled={is_first_page}
          aria-label="الصفحة السابقة"
        >
          <PrevIcon />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="pg-dots">…</span>
          ) : (
            <button
              key={p}
              className={`pg-btn pg-page ${p === current_page ? 'active' : ''}`}
              onClick={() => onPageChange(p as number)}
              aria-label={`صفحة ${p}`}
              aria-current={p === current_page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        <button
          className="pg-btn pg-nav"
          onClick={() => onPageChange(current_page + 1)}
          disabled={is_last_page}
          aria-label="الصفحة التالية"
        >
          <NextIcon />
        </button>
      </div>

      {/* Right: per page */}
      {showPageSize && onPerPageChange && (
        <div className="pg-size">
          <span className="pg-size-label">لكل صفحة:</span>
          <select
            className="pg-size-select"
            value={per_page}
            onChange={e => onPerPageChange(Number(e.target.value))}
            aria-label="عدد العناصر في الصفحة"
          >
            {perPageOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}

      <style>{`
        .pg-bar {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px; padding: 12px 0;
        }
        .pg-info { font-size: 13px; color: var(--color-text-secondary); }
        .pg-pages { display: flex; align-items: center; gap: 2px; }
        .pg-btn {
          display: flex; align-items: center; justify-content: center;
          min-width: 32px; height: 32px; padding: 0 6px;
          border: 1px solid transparent; border-radius: 6px; cursor: pointer;
          font-size: 13px; color: var(--color-text-secondary); background: none;
          transition: background .1s, border-color .1s, color .1s;
        }
        .pg-btn:hover:not(:disabled) { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .pg-btn:disabled { opacity: .35; cursor: not-allowed; }
        .pg-btn.pg-page.active {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff; font-weight: 500; cursor: default;
        }
        .pg-nav { color: var(--color-text-secondary); }
        .pg-dots { padding: 0 4px; color: var(--color-text-tertiary); font-size: 14px; }
        .pg-size { display: flex; align-items: center; gap: 6px; }
        .pg-size-label { font-size: 13px; color: var(--color-text-secondary); }
        .pg-size-select {
          padding: 4px 8px; border: 1px solid var(--color-border-secondary);
          border-radius: 6px; font-size: 13px; background: var(--color-background-primary);
          color: var(--color-text-primary); outline: none; cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Pagination;
```

## FILE: resources/js/components/ui/ProgressBar.tsx
```
// components/ui/ProgressBar.tsx
import React from 'react';

interface ProgressBarProps {
  value: number;       // 0–100
  color?: string;      // CSS color or var()
  height?: number;
}

export default function ProgressBar({ value, color = 'var(--em)', height = 6 }: ProgressBarProps) {
  return (
    <div className="pb" style={{ height }}>
      <div className="pb-f" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
```

## FILE: resources/js/components/ui/SearchInput.tsx
```
// components/ui/SearchInput.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface SearchInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onSearch?: (value: string) => void;   // fires after debounce
  placeholder?: string;
  debounce?: number;                     // ms, default 300
  loading?: boolean;
  clearable?: boolean;
  width?: string | number;
  autoFocus?: boolean;
  disabled?: boolean;
}

/* Minimal inline SVG icons to avoid Tabler dependency issues */
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconLoader = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ animation: 'srchSpin .7s linear infinite' }}>
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

export default function SearchInput({
  value: controlledValue,
  onChange,
  onSearch,
  placeholder = 'بحث...',
  debounce = 300,
  loading = false,
  clearable = true,
  width = 220,
  autoFocus = false,
  disabled = false,
}: SearchInputProps) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState('');
  const value = isControlled ? controlledValue : internalValue;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* autoFocus */
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  /* Debounced search callback */
  const fireSearch = useCallback((v: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!onSearch) return;
    timerRef.current = setTimeout(() => onSearch(v), debounce);
  }, [onSearch, debounce]);

  /* Cleanup on unmount */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    fireSearch(v);
  }

  function handleClear() {
    if (!isControlled) setInternalValue('');
    onChange?.('');
    onSearch?.('');
    if (timerRef.current) clearTimeout(timerRef.current);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') handleClear();
    if (e.key === 'Enter') {
      if (timerRef.current) clearTimeout(timerRef.current);
      onSearch?.(value);
    }
  }

  return (
    <>
      <style>{`
        @keyframes srchSpin { to { transform: rotate(360deg); } }
        .srch-clear {
          display: flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; border-radius: 50%;
          border: none; background: var(--bg5); color: var(--t4);
          cursor: pointer; transition: .14s; flex-shrink: 0; padding: 0;
        }
        .srch-clear:hover { background: var(--redb); color: var(--red); }
      `}</style>

      <div
        className="srch"
        style={{ width, opacity: disabled ? 0.55 : 1, pointerEvents: disabled ? 'none' : undefined }}
      >
        {/* Leading icon: spinner when loading, search otherwise */}
        <span className="srch-ic" style={{ display: 'flex', flexShrink: 0, color: loading ? 'var(--em)' : undefined }}>
          {loading ? <IconLoader /> : <IconSearch />}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          style={{ width: '100%' }}
        />

        {/* Clear button */}
        {clearable && value.length > 0 && !loading && (
          <button className="srch-clear" onClick={handleClear} tabIndex={-1} aria-label="مسح">
            <IconX />
          </button>
        )}
      </div>
    </>
  );
}
```

## FILE: resources/js/components/ui/Skeleton.tsx
```
import React from 'react';

type SkeletonVariant = 'text' | 'rect' | 'circle' | 'card' | 'table' | 'kpi';

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  rows?: number;
  className?: string;
}

const Pulse: React.FC<{ style?: React.CSSProperties; className?: string }> = ({ style, className = '' }) => (
  <div className={`skeleton-pulse ${className}`} style={style} />
);

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  rows = 3,
  className = '',
}) => {
  if (variant === 'text') {
    return (
      <div className={`skeleton-text-block ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <Pulse
            key={i}
            style={{
              width: i === rows - 1 ? '60%' : (width ?? '100%'),
              height: height ?? 14,
              borderRadius: 4,
            }}
          />
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'circle') {
    const size = width ?? height ?? 40;
    return (
      <>
        <Pulse style={{ width: size, height: size, borderRadius: '50%' }} className={className} />
        <style>{skeletonStyle}</style>
      </>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`skeleton-card ${className}`}>
        <Pulse style={{ height: 120, borderRadius: 8, marginBottom: 12 }} />
        <Pulse style={{ height: 14, width: '70%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 14, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'kpi') {
    return (
      <div className={`skeleton-kpi ${className}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pulse style={{ height: 14, width: '50%', borderRadius: 4 }} />
          <Pulse style={{ width: 32, height: 32, borderRadius: 6 }} />
        </div>
        <Pulse style={{ height: 28, width: '60%', borderRadius: 4, marginBottom: 8 }} />
        <Pulse style={{ height: 12, width: '40%', borderRadius: 4 }} />
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`skeleton-table ${className}`}>
        {/* Header */}
        <div className="skeleton-table__row skeleton-table__header">
          {[30, 20, 20, 15, 15].map((w, i) => (
            <Pulse key={i} style={{ height: 13, width: `${w}%`, borderRadius: 4 }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="skeleton-table__row">
            {[30, 20, 20, 15, 15].map((w, j) => (
              <Pulse key={j} style={{ height: 13, width: `${w - (i % 2) * 5}%`, borderRadius: 4 }} />
            ))}
          </div>
        ))}
        <style>{skeletonStyle}</style>
      </div>
    );
  }

  // rect (default)
  return (
    <>
      <Pulse
        className={className}
        style={{
          width: width ?? '100%',
          height: height ?? 16,
          borderRadius: 6,
        }}
      />
      <style>{skeletonStyle}</style>
    </>
  );
};

const skeletonStyle = `
  @keyframes skeleton-shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .skeleton-pulse {
    display: block;
    background: linear-gradient(
      90deg,
      var(--color-background-secondary, #f0f0f0) 25%,
      var(--color-background-tertiary,  #e0e0e0) 50%,
      var(--color-background-secondary, #f0f0f0) 75%
    );
    background-size: 800px 100%;
    animation: skeleton-shimmer 1.4s infinite linear;
  }
  .skeleton-text-block { display: flex; flex-direction: column; gap: 8px; }
  .skeleton-card { padding: 16px; }
  .skeleton-kpi  { padding: 16px; }
  .skeleton-table { display: flex; flex-direction: column; }
  .skeleton-table__row {
    display: flex; align-items: center; gap: 16px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border-tertiary);
  }
  .skeleton-table__header { border-bottom: 2px solid var(--color-border-secondary); }
`;

export default Skeleton;
```

## FILE: resources/js/components/ui/Stepper.tsx
```
import React from 'react';

export interface StepperStep {
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

type StepStatus = 'complete' | 'current' | 'upcoming';

interface StepperProps {
  steps: StepperStep[];
  currentStep: number; // 0-indexed
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = 'horizontal',
  className = '',
}) => {
  const getStatus = (index: number): StepStatus => {
    if (index < currentStep) return 'complete';
    if (index === currentStep) return 'current';
    return 'upcoming';
  };

  return (
    <nav aria-label="الخطوات" className={`stepper stepper--${orientation} ${className}`}>
      <ol className="stepper__list">
        {steps.map((step, index) => {
          const status = getStatus(index);
          return (
            <li key={index} className={`stepper__item stepper__item--${status}`}>
              {/* Connector line before (not for first item) */}
              {index > 0 && <div className="stepper__connector" />}

              {/* Step indicator */}
              <div className="stepper__indicator-wrapper">
                <div className="stepper__indicator" aria-hidden="true">
                  {status === 'complete'
                    ? <CheckIcon />
                    : step.icon ?? <span className="stepper__number">{index + 1}</span>
                  }
                </div>
              </div>

              {/* Step content */}
              <div className="stepper__content">
                <span className="stepper__label">{step.label}</span>
                {step.description && (
                  <span className="stepper__description">{step.description}</span>
                )}
              </div>

              {/* Connector line after (horizontal only, not for last) */}
              {orientation === 'horizontal' && index < steps.length - 1 && (
                <div className={`stepper__line stepper__line--${status === 'complete' ? 'done' : 'pending'}`} />
              )}
            </li>
          );
        })}
      </ol>

      <style>{`
        .stepper__list { display: flex; list-style: none; margin: 0; padding: 0; }

        /* Horizontal */
        .stepper--horizontal .stepper__list { flex-direction: row; align-items: flex-start; }
        .stepper--horizontal .stepper__item { display: flex; flex-direction: column; align-items: center; flex: 1; position: relative; gap: 8px; }
        .stepper--horizontal .stepper__connector { display: none; }
        .stepper--horizontal .stepper__line {
          position: absolute; top: 16px; left: calc(50% + 20px); right: calc(-50% + 20px);
          height: 2px; z-index: 0;
        }
        .stepper--horizontal .stepper__line--done  { background: var(--color-text-info, #3b82f6); }
        .stepper--horizontal .stepper__line--pending { background: var(--color-border-secondary); }
        .stepper--horizontal .stepper__content { text-align: center; display: flex; flex-direction: column; gap: 2px; }

        /* Vertical */
        .stepper--vertical .stepper__list { flex-direction: column; gap: 0; }
        .stepper--vertical .stepper__item { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; position: relative; padding-bottom: 24px; }
        .stepper--vertical .stepper__item:last-child { padding-bottom: 0; }
        .stepper--vertical .stepper__line { display: none; }
        .stepper--vertical .stepper__connector {
          position: absolute; left: 15px; top: -24px; height: 24px; width: 2px;
          background: var(--color-border-secondary);
        }
        .stepper--vertical .stepper__item--complete .stepper__connector { background: var(--color-text-info, #3b82f6); }
        .stepper--vertical .stepper__content { padding-top: 6px; display: flex; flex-direction: column; gap: 2px; }

        /* Indicator */
        .stepper__indicator-wrapper { position: relative; z-index: 1; flex-shrink: 0; }
        .stepper__indicator {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 600;
          border: 2px solid;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .stepper__item--complete .stepper__indicator {
          background: var(--color-text-info, #3b82f6);
          border-color: var(--color-text-info, #3b82f6);
          color: #fff;
        }
        .stepper__item--current .stepper__indicator {
          background: var(--color-background-primary);
          border-color: var(--color-text-info, #3b82f6);
          color: var(--color-text-info, #3b82f6);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-text-info, #3b82f6) 15%, transparent);
        }
        .stepper__item--upcoming .stepper__indicator {
          background: var(--color-background-secondary);
          border-color: var(--color-border-secondary);
          color: var(--color-text-tertiary);
        }
        .stepper__number { font-size: 13px; font-weight: 500; }

        /* Labels */
        .stepper__label { font-size: 13px; font-weight: 500; color: var(--color-text-secondary); line-height: 1.3; }
        .stepper__item--current  .stepper__label { color: var(--color-text-primary); }
        .stepper__item--complete .stepper__label { color: var(--color-text-secondary); }
        .stepper__item--upcoming .stepper__label { color: var(--color-text-tertiary); }
        .stepper__description { font-size: 12px; color: var(--color-text-tertiary); }
      `}</style>
    </nav>
  );
};

export default Stepper;
```

## FILE: resources/js/components/ui/Switch.tsx
```
// components/ui/Switch.tsx
import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export default function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        className={`sw ${checked ? 'on' : ''}`}
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(!checked); }}
      />
      {label && <span style={{ fontSize: 13, color: 'var(--t2)' }}>{label}</span>}
    </div>
  );
}
```

## FILE: resources/js/components/ui/Table.tsx
```
import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'start' | 'center' | 'end';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string | number);
  loading?: boolean;
  emptyMessage?: string;
  selectable?: boolean;
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  stickyHeader?: boolean;
  className?: string;
}

function SortIcon({ active, dir }: { active: boolean; dir?: 'asc' | 'desc' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: active ? 1 : 0.4 }}>
      <path d={dir === 'desc' || !active ? "M3 4.5l3-3 3 3" : "M3 7.5l3 3 3-3"} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
      {!active && <path d="M3 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>}
    </svg>
  );
}

function TableSkeleton({ cols, rows }: { cols: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="tbl-row">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="tbl-cell">
              <div className="tbl-skel" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function Table<T extends object>({
  columns,
  data,
  rowKey,
  loading = false,
  emptyMessage = 'لا توجد بيانات',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  stickyHeader = false,
  className = '',
}: TableProps<T>) {

  const getKey = (row: T): string | number =>
    typeof rowKey === 'function' ? rowKey(row) : row[rowKey] as string | number;

  const allKeys = data.map(getKey);
  const allSelected = allKeys.length > 0 && allKeys.every(k => selectedKeys?.has(k));
  const someSelected = !allSelected && allKeys.some(k => selectedKeys?.has(k));

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(allKeys));
  };

  const toggleRow = (key: string | number) => {
    if (!onSelectionChange || !selectedKeys) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  const effectiveCols = selectable
    ? [{ key: '__select__', header: '', width: 44 } as TableColumn<T>, ...columns]
    : columns;

  return (
    <div className={`tbl-outer ${className}`}>
      <table className="tbl" role="grid">
        <thead className={`tbl-head ${stickyHeader ? 'sticky' : ''}`}>
          <tr>
            {effectiveCols.map(col => {
              if (col.key === '__select__') return (
                <th key="__select__" className="tbl-th tbl-th--select">
                  <input
                    type="checkbox"
                    className="tbl-checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    aria-label="تحديد الكل"
                  />
                </th>
              );
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  className={`tbl-th ${col.sortable ? 'sortable' : ''} align-${col.align ?? 'start'}`}
                  style={{ width: col.width }}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="tbl-th__inner">
                    {col.header}
                    {col.sortable && <SortIcon active={isSorted} dir={isSorted ? sortDir : undefined} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <TableSkeleton cols={effectiveCols.length} rows={5} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={effectiveCols.length} className="tbl-empty">
                <div className="tbl-empty__inner">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="tbl-empty__icon">
                    <rect x="4" y="8" width="32" height="24" rx="4" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M4 14h32" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M12 22h8M12 27h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>{emptyMessage}</span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = getKey(row);
              const isSelected = selectedKeys?.has(key);
              return (
                <tr
                  key={key}
                  className={`tbl-row ${isSelected ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  aria-selected={selectable ? isSelected : undefined}
                >
                  {effectiveCols.map(col => {
                    if (col.key === '__select__') return (
                      <td key="__select__" className="tbl-cell tbl-cell--select" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="tbl-checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(key)}
                          aria-label={`تحديد الصف ${i + 1}`}
                        />
                      </td>
                    );
                    return (
                      <td key={col.key} className={`tbl-cell align-${col.align ?? 'start'}`}>
                        {col.render ? col.render(row, i) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <style>{`
        .tbl-outer { width: 100%; overflow-x: auto; border-radius: 10px; border: 1px solid var(--color-border-tertiary); }
        .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
        .tbl-head { background: var(--color-background-secondary); }
        .tbl-head.sticky { position: sticky; top: 0; z-index: 2; }
        .tbl-th {
          padding: 10px 14px; font-size: 12px; font-weight: 500;
          color: var(--color-text-secondary); text-align: start;
          border-bottom: 1px solid var(--color-border-secondary);
          white-space: nowrap; user-select: none;
        }
        .tbl-th.sortable { cursor: pointer; }
        .tbl-th.sortable:hover { color: var(--color-text-primary); background: var(--color-background-tertiary); }
        .tbl-th.align-center { text-align: center; }
        .tbl-th.align-end    { text-align: end; }
        .tbl-th--select { width: 44px; padding: 10px 12px; }
        .tbl-th__inner { display: inline-flex; align-items: center; gap: 5px; }
        .tbl-row { border-bottom: 1px solid var(--color-border-tertiary); transition: background .1s; }
        .tbl-row:last-child { border-bottom: none; }
        .tbl-row:hover { background: var(--color-background-secondary); }
        .tbl-row.selected { background: color-mix(in srgb, var(--color-text-info, #3b82f6) 6%, transparent); }
        .tbl-row.clickable { cursor: pointer; }
        .tbl-cell { padding: 12px 14px; color: var(--color-text-primary); vertical-align: middle; }
        .tbl-cell.align-center { text-align: center; }
        .tbl-cell.align-end    { text-align: end; }
        .tbl-cell--select { padding: 12px 12px; width: 44px; }
        .tbl-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--color-text-info, #3b82f6); }
        .tbl-empty { padding: 48px 20px; text-align: center; color: var(--color-text-secondary); }
        .tbl-empty__inner { display: flex; flex-direction: column; align-items: center; gap: 10px; }
        .tbl-empty__icon { color: var(--color-text-tertiary); }
        .tbl-skel {
          height: 13px; border-radius: 4px;
          background: linear-gradient(90deg, var(--color-background-secondary) 25%, var(--color-background-tertiary) 50%, var(--color-background-secondary) 75%);
          background-size: 400px 100%;
          animation: tbl-shimmer 1.4s infinite linear;
        }
        @keyframes tbl-shimmer { from { background-position: -400px 0; } to { background-position: 400px 0; } }
      `}</style>
    </div>
  );
}

export default Table;
```

## FILE: resources/js/components/ui/tabs.tsx
```
// resources/js/components/ui/tabs.tsx
import React, { createContext, useContext, useState } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabs() {
  const context = useContext(TabsContext);
  if (!context) throw new Error('useTabs must be used within Tabs');
  return context;
}

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className = '' }: TabsListProps) {
  return <div className={`flex gap-2 border-b ${className}`}>{children}</div>;
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className = '' }: TabsTriggerProps) {
  const { value: selectedValue, onValueChange } = useTabs();
  const isActive = selectedValue === value;
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
  const { value: selectedValue } = useTabs();
  if (selectedValue !== value) return null;
  return <div className={className}>{children}</div>;
}
```

## FILE: resources/js/components/ui/Tooltip.tsx
```
import React, { useState, useRef, useEffect } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  position?: TooltipPosition;
  delay?: number;
  children: React.ReactNode;
  disabled?: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  delay = 200,
  children,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (disabled) return;
    timerRef.current = setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (!visible || !triggerRef.current || !tooltipRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const gap = 8;
    let top = 0, left = 0;

    switch (position) {
      case 'top':
        top = trigger.top - tooltip.height - gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'bottom':
        top = trigger.bottom + gap + window.scrollY;
        left = trigger.left + trigger.width / 2 - tooltip.width / 2 + window.scrollX;
        break;
      case 'left':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.left - tooltip.width - gap + window.scrollX;
        break;
      case 'right':
        top = trigger.top + trigger.height / 2 - tooltip.height / 2 + window.scrollY;
        left = trigger.right + gap + window.scrollX;
        break;
    }

    setCoords({ top, left });
  }, [visible, position]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <>
      <div
        ref={triggerRef}
        className="tooltip-trigger"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip--${position}`}
          style={{ top: coords.top, left: coords.left }}
          role="tooltip"
        >
          {content}
          <span className="tooltip__arrow" />
        </div>
      )}

      <style>{`
        .tooltip-trigger { display: inline-flex; }
        .tooltip {
          position: fixed;
          z-index: 9999;
          background: var(--color-text-primary, #1a1a1a);
          color: var(--color-background-primary, #fff);
          font-size: 12px;
          line-height: 1.4;
          padding: 6px 10px;
          border-radius: 6px;
          white-space: nowrap;
          pointer-events: none;
          max-width: 240px;
          white-space: normal;
          animation: tooltip-in 0.12s ease;
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .tooltip__arrow {
          position: absolute;
          width: 0; height: 0;
          border: 5px solid transparent;
        }
        .tooltip--top    .tooltip__arrow { bottom: -10px; left: 50%; transform: translateX(-50%); border-top-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--bottom .tooltip__arrow { top: -10px;    left: 50%; transform: translateX(-50%); border-bottom-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--left   .tooltip__arrow { right: -10px;  top:  50%; transform: translateY(-50%); border-left-color: var(--color-text-primary, #1a1a1a); }
        .tooltip--right  .tooltip__arrow { left:  -10px;  top:  50%; transform: translateY(-50%); border-right-color: var(--color-text-primary, #1a1a1a); }
      `}</style>
    </>
  );
};

export default Tooltip;
```

## FILE: resources/js/pos/components/Cart.tsx
```
// pos/components/Cart.tsx
import React, { useState } from 'react';
import type { Party } from '@/types';
import type { CartItem, CartTotals } from '@/types';
import { formatDZD } from '../utils/calculations';

interface CartProps {
  items:       CartItem[];
  totals:      CartTotals;
  client:      Party | null;
  customers:   Party[];
  onQty:       (id: string, qty: number) => void;
  onDiscount:  (id: string, pct: number) => void;
  onRemove:    (id: string) => void;
  onSetClient: (c: Party | null) => void;
  onHold:      () => void;
  onSell:      () => void;
  onNote:      () => void;
  onClear:     () => void;
  onHeld:      () => void;
}

type PriceMode = 'retail' | 'semi' | 'wholesale';

export default function Cart({
  items, totals, client, customers,
  onQty, onDiscount, onRemove, onSetClient,
  onHold, onSell, onNote, onClear, onHeld,
}: CartProps) {
  const [mode, setMode] = useState<PriceMode>('retail');

  const isEmpty = items.length === 0;

  return (
    <div className="pos-cart" id="pos-cart">

      {/* ── Cart header ── */}
      <div className="cart-top">
        <div className="cart-top-row">
          <div className="cart-ttl">
            <span className="ic ic-sm"><i className="ti ti-shopping-cart" /></span>
            السلة
            <span className={`cart-pill`}>{totals.items_count}</span>
          </div>
          <div className="cart-acts2">
            <button className="btn btn-xs" onClick={onHeld} title="المعلقة">
              <span className="ic ic-xs"><i className="ti ti-clock-pause" /></span>
            </button>
            <button className="btn btn-xs" onClick={onNote} title="ملاحظة">
              <span className="ic ic-xs"><i className="ti ti-notes" /></span>
            </button>
            <button
              className="btn btn-xs btn-r"
              onClick={onClear}
              disabled={isEmpty}
              title="مسح السلة"
            >
              <span className="ic ic-xs"><i className="ti ti-trash" /></span>
            </button>
          </div>
        </div>

        {/* Price mode */}
        <div className="cart-modes2">
          {(['retail','semi','wholesale'] as PriceMode[]).map(m => (
            <button
              key={m}
              className={`cmode ${mode === m ? 'on' : ''}`}
              onClick={() => setMode(m)}
            >
              <span className="ic ic-xs">
                <i className={`ti ${m === 'retail' ? 'ti-user' : m === 'semi' ? 'ti-packages' : 'ti-building-store'}`} />
              </span>
              {m === 'retail' ? 'تجزئة' : m === 'semi' ? 'نصف جملة' : 'جملة'}
            </button>
          ))}
        </div>

        {/* Client selector */}
        <div className="cart-client">
          <select
            value={client?.id ?? ''}
            onChange={e => {
              const id = Number(e.target.value);
              onSetClient(id ? (customers.find(c => c.id === id) ?? null) : null);
            }}
          >
            <option value="">👤 زبون عابر</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
                {(c.balance ?? 0) > 0 ? ` ⚠️ دين ${c.balance?.toLocaleString('fr-DZ')} دج` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Cart items ── */}
      <div className="cart-items-body" id="cart-items">
        {isEmpty ? (
          <div className="cart-empty">
            <div className="cart-empty-ic"><i className="ti ti-shopping-cart" /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t3)' }}>السلة فارغة</div>
            <div style={{ fontSize: '11.5px' }}>اضغط على منتج لإضافته</div>
          </div>
        ) : (
          items.map((item, idx) => (
            <CartItemRow
              key={item.id}
              item={item}
              index={idx + 1}
              onQty={onQty}
              onDiscount={onDiscount}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      {/* ── Fixed footer ── */}
      <div className="cart-foot">
        {/* Summary rows */}
        <div className="cart-sums">
          <div className="sum-row">
            <span className="sum-l">المجموع HT</span>
            <span className="sum-v">{formatDZD(totals.total_ht)}</span>
          </div>
          {totals.total_discount > 0 && (
            <div className="sum-row">
              <span className="sum-l" style={{ color: 'var(--red)' }}>خصم</span>
              <span className="sum-v" style={{ color: 'var(--red)' }}>- {formatDZD(totals.total_discount)}</span>
            </div>
          )}
          <div className="sum-row">
            <span className="sum-l">TVA (مجمّع)</span>
            <span className="sum-v">{formatDZD(totals.total_tva)}</span>
          </div>
          {totals.fiscal_stamp > 0 && (
            <div className="sum-row">
              <span className="sum-l">الطابع الجبائي</span>
              <span className="sum-v">+ {formatDZD(totals.fiscal_stamp)}</span>
            </div>
          )}
        </div>

        {/* Grand total */}
        <div className="grand-bar">
          <span className="grand-lbl">الإجمالي TTC</span>
          <span className="grand-val">
            <span className="gu">دج </span>
            <span>{(totals.total_ttc + totals.fiscal_stamp).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}</span>
          </span>
        </div>

        {/* Action buttons */}
        <div className="cart-btns2">
          <button className="btn-hold2" onClick={onHold} disabled={isEmpty} title="F5">
            <span className="ic ic-xs"><i className="ti ti-player-pause" /></span> تعليق
          </button>
          <button className="btn-sell2" onClick={onSell} disabled={isEmpty} title="F4">
            <span className="ic ic-xs"><i className="ti ti-circle-check" /></span> تأكيد البيع
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Single cart item row ──────────────────────────
function CartItemRow({
  item, index, onQty, onDiscount, onRemove,
}: {
  item: CartItem;
  index: number;
  onQty:      (id: string, qty: number) => void;
  onDiscount: (id: string, pct: number) => void;
  onRemove:   (id: string) => void;
}) {
  const name = [item.product_name, item.variant_name].filter(Boolean).join(' — ');

  return (
    <div className="ci">
      <div className="ci-n">{index}</div>
      <div className="ci-body">
        <div className="ci-name" title={name}>{name}</div>
        <div className="ci-prow">
          <input
            type="number"
            className="ci-pinp"
            value={item.unit_price_ht}
            min={0}
            step={0.01}
            onChange={e => onDiscount(item.id, item.discount_percentage)}
            onBlur={e => {
              // price edit — via parent handler (simplified)
            }}
          />
          <span className="ci-punit">HT/{item.unit_symbol ?? 'قطعة'}</span>
          {item.discount_percentage > 0 && (
            <span style={{ fontSize: '10px', color: 'var(--red)', marginRight: 'auto' }}>
              -{item.discount_percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Qty controls */}
      <div className="qc2">
        <button className="qb2" onClick={() => onQty(item.id, item.quantity - 1)}>−</button>
        <span className="qn2">{item.quantity}</span>
        <button className="qb2" onClick={() => onQty(item.id, item.quantity + 1)}>+</button>
      </div>

      {/* Total */}
      <span className="ci-sum" style={{ direction: 'ltr' }}>
        {item.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
      </span>

      {/* Delete */}
      <button className="ci-del" onClick={() => onRemove(item.id)} title="حذف">
        <span className="ic ic-xs"><i className="ti ti-x" /></span>
      </button>
    </div>
  );
}
```

## FILE: resources/js/pos/components/HeldCartsModal.tsx
```
// pos/components/HeldCartsModal.tsx
import React from 'react';
import type { HeldCart } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface HeldCartsModalProps {
  open:     boolean;
  carts:    HeldCart[];
  onClose:  () => void;
  onRestore:(id: string) => void;
  onDelete: (id: string) => void;
}

export default function HeldCartsModal({
  open, carts, onClose, onRestore, onDelete,
}: HeldCartsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الفواتير المعلقة"
      subtitle={`${carts.length} معلقة`}
      size="sm"
      footer={<button className="btn" onClick={onClose}>إغلاق</button>}
    >
      <div style={{ padding: 0, margin: -20 }}>
        {carts.length === 0 ? (
          <div className="cart-empty" style={{ padding: 30 }}>
            <div className="cart-empty-ic" style={{ fontSize: 36 }}>
              <i className="ti ti-clock-pause" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t3)' }}>
              لا توجد فواتير معلقة
            </div>
          </div>
        ) : (
          carts.map(cart => (
            <div
              key={cart.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px', borderBottom: '1px solid var(--b1)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  {cart.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                  {cart.items.length} صنف
                  {cart.client ? ` — ${cart.client.name}` : ''}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--em)', direction: 'ltr', flexShrink: 0 }}>
                {formatDZD(cart.totals.total_ttc)}
              </div>
              <button
                className="btn btn-xs btn-p"
                onClick={() => { onRestore(cart.id); onClose(); }}
              >
                استرجاع
              </button>
              <button
                className="btn btn-xs btn-r"
                onClick={() => onDelete(cart.id)}
                title="حذف"
              >
                <span className="ic ic-xs"><i className="ti ti-trash" /></span>
              </button>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
```

## FILE: resources/js/pos/components/PaymentModal.tsx
```
// pos/components/PaymentModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { CartTotals, Party, PaymentMode } from '@/types';
import { formatDZD, calcChange } from '../utils/calculations';

type PayMethod = 'cash' | 'cib' | 'ccp' | 'bank' | 'credit' | 'split';

interface PaymentModalProps {
  open:         boolean;
  totals:       CartTotals;
  client:       Party | null;
  paymentModes: PaymentMode[];
  onClose:      () => void;
  onConfirm:    (params: {
    paymentModeId:     number;
    treasuryAccountId?: number;
    amountPaid:        number;
    dueDate?:          string;
    note?:             string;
  }) => Promise<{ ok: boolean; message?: string }>;
}

const PAYMENT_BTNS: { method: PayMethod; icon: string; label: string }[] = [
  { method:'cash',   icon:'💵', label:'نقداً'   },
  { method:'cib',    icon:'💳', label:'CIB'     },
  { method:'ccp',    icon:'📮', label:'CCP'     },
  { method:'bank',   icon:'🏦', label:'تحويل'   },
  { method:'credit', icon:'📋', label:'آجل'     },
  { method:'split',  icon:'✂️', label:'مختلط'  },
];

export default function PaymentModal({
  open, totals, client, paymentModes, onClose, onConfirm,
}: PaymentModalProps) {
  const totalTtc  = totals.total_ttc + totals.fiscal_stamp;
  const [method,  setMethod]  = useState<PayMethod>('cash');
  const [given,   setGiven]   = useState('');
  const [dueDate, setDueDate] = useState('');
  const [note,    setNote]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Split amounts
  const [splitCash, setSplitCash] = useState('');
  const [splitCib,  setSplitCib]  = useState('');
  const [splitCr,   setSplitCr]   = useState('');

  // Reset when opened
  useEffect(() => {
    if (open) {
      setGiven('');
      setError('');
      setMethod('cash');
      setSplitCash('');
      setSplitCib('');
      setSplitCr('');
    }
  }, [open]);

  // Numpad
  const np = useCallback((key: string) => {
    setGiven(prev => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      return prev + key;
    });
  }, []);

  const givenNum  = parseFloat(given || '0') || 0;
  const change    = calcChange(givenNum, totals.total_ttc, totals.fiscal_stamp);

  const splitSum  = (parseFloat(splitCash || '0') || 0)
                  + (parseFloat(splitCib  || '0') || 0)
                  + (parseFloat(splitCr   || '0') || 0);
  const splitDiff = splitSum - totalTtc;

  // Quick amounts
  const quickAmounts = [
    totalTtc,
    Math.ceil(totalTtc / 500) * 500,
    Math.ceil(totalTtc / 1000) * 1000,
    Math.ceil(totalTtc / 2000) * 2000,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= totalTtc).slice(0, 4);

  const handleConfirm = async () => {
    setError('');
    let amountPaid = totalTtc;
    if (method === 'cash') amountPaid = givenNum || totalTtc;
    if (method === 'credit') amountPaid = 0;

    // Find payment mode id
    const modeMap: Record<PayMethod, string> = {
      cash: 'cash', cib: 'cib', ccp: 'ccp', bank: 'bank', credit: 'credit', split: 'mixed',
    };
    const pm = paymentModes.find(p => p.code === modeMap[method]) ?? paymentModes[0];

    setLoading(true);
    const res = await onConfirm({
      paymentModeId: pm?.id ?? 1,
      amountPaid,
      dueDate: method === 'credit' ? dueDate : undefined,
      note: note || undefined,
    });
    setLoading(false);

    if (!res.ok) { setError(res.message ?? 'فشل الحفظ'); return; }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="ov on">
      <div className="modal modal-sm" style={{ maxHeight: '95vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="m-hd" style={{ padding: '12px 16px' }}>
          <div>
            <div className="m-title">
              <span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check" /></span>
              تأكيد البيع
            </div>
            <div className="m-sub">
              {totals.lines_count} صنف — {totals.items_count} وحدة
            </div>
          </div>
          <div className="m-x" onClick={onClose}>
            <span className="ic ic-xs"><i className="ti ti-x" /></span>
          </div>
        </div>

        {/* Hero amount */}
        <div className="pay-amount-hero">
          <div className="pay-ttc-label">المبلغ الإجمالي TTC</div>
          <div className="pay-ttc-big">{formatDZD(totalTtc)}</div>
          <div className="pay-client-badge">
            <span className="ic ic-xs"><i className="ti ti-user" /></span>
            <span>{client?.name ?? 'زبون عابر'}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="pay-breakdown">
          <div className="pay-bd-c">
            <div className="pay-bd-l">HT</div>
            <div className="pay-bd-v">{formatDZD(totals.total_ht)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">TVA</div>
            <div className="pay-bd-v">{formatDZD(totals.total_tva)}</div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">خصم</div>
            <div className="pay-bd-v" style={{ color: 'var(--red)' }}>
              {totals.total_discount > 0 ? `- ${formatDZD(totals.total_discount)}` : '—'}
            </div>
          </div>
          <div className="pay-bd-c">
            <div className="pay-bd-l">طابع</div>
            <div className="pay-bd-v">{totals.fiscal_stamp > 0 ? formatDZD(totals.fiscal_stamp) : '—'}</div>
          </div>
        </div>

        <div style={{ overflowY: 'auto', maxHeight: 'calc(95vh - 230px)' }}>

          {/* Payment method pills */}
          <div className="pay-m-grid">
            {PAYMENT_BTNS.map(({ method: m, icon, label }) => (
              <button
                key={m}
                className={`pmpill ${method === m ? 'on' : ''}`}
                onClick={() => setMethod(m)}
              >
                <span className="pmi">{icon}</span>{label}
              </button>
            ))}
          </div>

          {/* CASH */}
          {method === 'cash' && (
            <div>
              <div className="pay-cash-sec">
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', display: 'block', marginBottom: 6 }}>
                  المبلغ المُسلَّم
                </label>
                <input
                  type="number"
                  className="given-inp"
                  placeholder="0"
                  value={given}
                  onChange={e => setGiven(e.target.value)}
                  inputMode="numeric"
                  autoFocus
                />
              </div>
              {/* Quick amounts */}
              <div className="qamts">
                {quickAmounts.map(v => (
                  <button key={v} className="qamt" onClick={() => setGiven(String(v))}>
                    {v.toLocaleString('fr-DZ')}
                  </button>
                ))}
              </div>
              {/* Change */}
              <div className="change-display">
                <span className="change-lbl2">الباقي للزبون</span>
                <span className="change-val2" style={{ color: change >= 0 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(change)}
                </span>
              </div>
              {/* Numpad */}
              <div className="numpad" id="numpad-grid">
                {['7','8','9','4','5','6','1','2','3'].map(k => (
                  <button key={k} className="npk" onClick={() => np(k)}>{k}</button>
                ))}
                <button className="npk del" onClick={() => np('del')}>
                  <span className="ic ic-xs"><i className="ti ti-backspace" /></span>
                </button>
                <button className="npk zero" onClick={() => np('0')}>0</button>
              </div>
            </div>
          )}

          {/* SPLIT */}
          {method === 'split' && (
            <div className="pay-split-sec" style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--t3)', marginBottom: 10 }}>
                الدفع المختلط
              </div>
              {[
                { label: 'نقداً', val: splitCash, set: setSplitCash },
                { label: 'CIB',   val: splitCib,  set: setSplitCib  },
                { label: 'آجل',   val: splitCr,   set: setSplitCr   },
              ].map(({ label, val, set }) => (
                <div className="split-row" key={label}>
                  <span className="split-lbl">{label}</span>
                  <input
                    type="number"
                    className="split-inp"
                    placeholder="0"
                    value={val}
                    onChange={e => set(e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: 11, color: 'var(--t4)' }}>دج</span>
                </div>
              ))}
              <div className="change-display">
                <span className="change-lbl2">الفارق</span>
                <span className="change-val2" style={{ color: Math.abs(splitDiff) < 1 ? 'var(--em)' : 'var(--red)' }}>
                  {formatDZD(splitDiff)}
                </span>
              </div>
            </div>
          )}

          {/* CREDIT */}
          {method === 'credit' && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-b" style={{ borderRadius: 'var(--r2)', marginBottom: 10 }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-info-circle" /></span>
                <div>بيع آجل — سيُسجَّل في ديون العملاء تلقائياً عند التأكيد.</div>
              </div>
              <div className="fg">
                <label>تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* ELECTRONIC */}
          {(method === 'cib' || method === 'ccp' || method === 'bank') && (
            <div className="pay-credit-sec" style={{ padding: '8px 14px' }}>
              <div className="al al-g" style={{ borderRadius: 'var(--r2)' }}>
                <span className="ic ic-xs" style={{ flexShrink: 0 }}><i className="ti ti-check" /></span>
                <div>الدفع الإلكتروني — المبلغ الكامل يُسدَّد مباشرة.</div>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="pay-note-sec" style={{ padding: '4px 14px 8px' }}>
            <label>ملاحظة على الفاتورة</label>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="اختياري..."
              style={{ width: '100%', padding: '6px 9px', borderRadius: 'var(--r1)', border: '1px solid var(--b2)', background: 'var(--bg3)', fontFamily: 'Tajawal,sans-serif', fontSize: '12.5px', outline: 'none' }}
            />
          </div>

          {error && (
            <div className="al al-r" style={{ margin: '0 14px 8px', borderRadius: 'var(--r2)', fontSize: 12 }}>
              <span className="ic ic-xs"><i className="ti ti-alert-circle" /></span>
              <div>{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="m-foot">
          <button className="btn" onClick={onClose}>إلغاء</button>
          <button className="btn btn-p" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <span className="ic ic-xs"><i className="ti ti-loader" /></span>
            ) : (
              <span className="ic ic-xs"><i className="ti ti-circle-check" /></span>
            )}
            {loading ? 'جاري الحفظ...' : 'تأكيد وطباعة'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

## FILE: resources/js/pos/components/ProductCard.tsx
```
// pos/components/ProductCard.tsx
import React from 'react';
import type { ProductVariant } from '@/types';

interface ProductCardProps {
  variant: ProductVariant;
  qtyInCart: number;
  view: 'grid' | 'list';
  onClick: () => void;
}

function stockClass(stock: number | undefined, min: number): string {
  if (stock === undefined || stock === null) return 'ok';
  if (stock <= 0) return 'no';
  if (stock <= min) return 'lo';
  return 'ok';
}

function stockLabel(stock: number | undefined): string {
  if (stock === undefined || stock === null) return '';
  if (stock <= 0) return 'نفد';
  return `${stock} ${stock === 1 ? 'وحدة' : 'وحدة'}`;
}

export default function ProductCard({ variant, qtyInCart, view, onClick }: ProductCardProps) {
  const product   = variant.product;
  const stock     = variant.current_stock;
  const isOOS     = variant.manages_stock && (stock ?? 1) <= 0 && !variant.allow_negative_stock;
  const sc        = stockClass(stock ?? undefined, variant.min_stock_alert);
  const tvaRate   = variant.tva?.rate ?? 19;
  const priceTtc  = variant.default_selling_price_ht * (1 + tvaRate / 100);

  // pick icon / color based on family name
  const familyName = product?.family?.name ?? '';
  const { icon, color, bg } = familyStyle(familyName);

  const name = [product?.name, variant.variant_name].filter(Boolean).join(' — ');

  if (view === 'list') {
    return (
      <div
        className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
        style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
        onClick={isOOS ? undefined : onClick}
      >
        {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
        <div className="pc2-ic">
          <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
        </div>
        <div className="pc2-info">
          <div className="pc2-name">{name}</div>
          <div className="pc2-price" style={{ direction: 'ltr' }}>
            {priceTtc.toFixed(0)} دج
          </div>
          {variant.manages_stock && (
            <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`pc2 ${qtyInCart > 0 ? 'sel' : ''} ${isOOS ? 'oos' : ''}`}
      style={{ '--pc-color': color, '--pc-bg': bg } as React.CSSProperties}
      onClick={isOOS ? undefined : onClick}
    >
      {qtyInCart > 0 && <div className="pc2-badge">{qtyInCart}</div>}
      <div className="pc2-ic">
        <span className="ic ic-sm"><i className={`ti ${icon}`} /></span>
      </div>
      <div className="pc2-name">{name}</div>
      <div className="pc2-price" style={{ direction: 'ltr' }}>{priceTtc.toFixed(0)} دج</div>
      {variant.manages_stock && (
        <div className={`pc2-stock ${sc}`}>{stockLabel(stock ?? undefined)}</div>
      )}
    </div>
  );
}

// ── Family → icon/color mapping ────────────────────
function familyStyle(family: string): { icon: string; color: string; bg: string } {
  const f = family.toLowerCase();
  if (f.includes('غذ') || f.includes('أكل'))    return { icon: 'ti-apple',         color: 'var(--em)',     bg: 'var(--emb)'   };
  if (f.includes('شراب') || f.includes('ماء'))  return { icon: 'ti-droplets',      color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('إلكترون'))                    return { icon: 'ti-device-mobile', color: 'var(--blue)',   bg: 'var(--blueb)' };
  if (f.includes('ملابس'))                      return { icon: 'ti-shirt',         color: 'var(--purple)', bg: 'var(--purb)'  };
  if (f.includes('صيانة'))                      return { icon: 'ti-tool',          color: 'var(--orange)', bg: 'var(--orb)'   };
  return { icon: 'ti-package', color: 'var(--em)', bg: 'var(--emb)' };
}
```

## FILE: resources/js/pos/components/Receipt.tsx
```
// pos/components/Receipt.tsx
import React from 'react';
import type { CartItem, CartTotals, Party } from '@/types';
import { formatDZD } from '../utils/calculations';
import Modal from '@/components/ui/Modal';

interface ReceiptProps {
  open:      boolean;
  items:     CartItem[];
  totals:    CartTotals;
  client:    Party | null;
  docNumber?: string;
  onClose:   () => void;
  onPrint:   () => void;
}

export default function Receipt({
  open, items, totals, client, docNumber, onClose, onPrint,
}: ReceiptProps) {
  const now = new Date().toLocaleDateString('fr-DZ');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="معاينة الفاتورة"
      size="md"
      footer={
        <>
          <button className="btn" onClick={onClose}>إغلاق</button>
          <button className="btn btn-p" onClick={onPrint}>
            <span className="ic ic-xs"><i className="ti ti-printer" /></span>
            طباعة
          </button>
        </>
      }
    >
      <div className="receipt-wrap" id="invoice-preview">
        {/* Header */}
        <div className="receipt-head">
          <div>
            <div className="receipt-logo">مؤسسة النور للتجارة</div>
            <div className="receipt-meta">
              NIF: 001234567890123 | RC: 29/00-0012345B05<br />
              ورقلة — الجزائر | 029 71 23 45
            </div>
          </div>
          <div className="receipt-num">
            <div>{docNumber ?? 'مسودة'}</div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500, marginTop: 3 }}>
              التاريخ: {now}
            </div>
            <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 500 }}>
              الزبون: {client?.name ?? 'عابر'}
            </div>
          </div>
        </div>

        {/* Items */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ padding: '4px 6px', textAlign: 'right' }}>البيان</th>
              <th style={{ padding: '4px 6px', textAlign: 'center' }}>الكمية</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>سعر HT</th>
              <th style={{ padding: '4px 6px', textAlign: 'right', direction: 'ltr' }}>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '5px 6px' }}>
                  {item.product_name}
                  {item.variant_name && <span style={{ color: '#64748b' }}> — {item.variant_name}</span>}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                  {item.quantity} {item.unit_symbol}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr' }}>
                  {item.unit_price_ht.toFixed(2)} دج
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right', direction: 'ltr', fontWeight: 700 }}>
                  {item.total_ht.toFixed(2)} دج
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="receipt-totals">
          <div className="receipt-totals-inner">
            <div className="receipt-row">
              <span>المجموع HT</span>
              <span>{formatDZD(totals.total_ht)}</span>
            </div>
            <div className="receipt-row">
              <span>TVA</span>
              <span>{formatDZD(totals.total_tva)}</span>
            </div>
            {totals.total_discount > 0 && (
              <div className="receipt-row" style={{ color: '#dc2626' }}>
                <span>خصم</span>
                <span>- {formatDZD(totals.total_discount)}</span>
              </div>
            )}
            {totals.fiscal_stamp > 0 && (
              <div className="receipt-row">
                <span>الطابع الجبائي</span>
                <span>{formatDZD(totals.fiscal_stamp)}</span>
              </div>
            )}
            <div className="receipt-grand">
              <span>الإجمالي TTC</span>
              <span>{formatDZD(totals.total_ttc + totals.fiscal_stamp)}</span>
            </div>
          </div>
        </div>

        <div className="receipt-foot">
          شكراً لتعاملكم معنا — يُعتبر هذا المستند ملزماً قانونياً وفق التشريع الجزائري
        </div>
      </div>
    </Modal>
  );
}
```

   ⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
==================================================== */

