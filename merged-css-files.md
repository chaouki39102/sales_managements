

# =========================================
# 📘 css
# =========================================

## FILE: resources/css/app.css
```
@import 'tailwindcss';

/* استدعاء الرموز والأنماط الأساسية */
@import 'theme/tokens.css';
@import 'theme/theme.css';

/* استدعاء الهيكل والمكونات */
@import 'theme/layout.css';
@import 'theme/components.css';
@import 'theme/pages.css';

/* استدعاء الأنظمة الخاصة والأدوات المساعدة */
@import 'theme/pos.css';
@import 'theme/pos-cart-v4.css';
@import 'theme/pos-sessions-v2.css';

@import 'theme/modern-utilities.css';
@import 'theme/utilities.css';

@import 'theme/notifications.css';
@import 'theme/print-settings.css';


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
@media(max-width:768px){
  .g2,.g3,.g4,.g65,.g35,.g73{
    grid-template-columns:1fr !important;
    width:100% !important;
    max-width:100% !important;
    overflow:hidden;
  }
}

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
  transition:width .22s cubic-bezier(.4,0,.2,1),transform .3s cubic-bezier(.4,0,.2,1);
}
body.dark #sidebar{background:var(--bg2);}
#sidebar.collapsed{width:58px;}
#sidebar.collapsed .sbi{justify-content:center;padding:8px 0;}
#sidebar.collapsed .sb-logo{justify-content:center;padding:16px 0 12px;}
#sidebar.collapsed .sb-sec{padding:4px 0;}
#sidebar.collapsed .sbi.on{border-right:none;border-left:2px solid var(--em);}
#sidebar.collapsed .sb-name,
#sidebar.collapsed .sb-sub,
#sidebar.collapsed .sb-lbl,
#sidebar.collapsed .sbi-name,
#sidebar.collapsed .sbi-badge,
#sidebar.collapsed .cs-text,
#sidebar.collapsed .cs-text+.ti{display:none;}
#sidebar.collapsed .sbi-ic{font-size:18px;width:auto;}
#sidebar.collapsed .sb-foot>div{display:flex;justify-content:center;}
#sidebar.collapsed .sb-foot a>div{justify-content:center;padding:6px 0;gap:0;}
#sidebar.collapsed .sb-foot a>div>div:nth-child(2){display:none;}
#sidebar.collapsed .sb-foot button{width:36px;padding:8px;justify-content:center;}
#sidebar.collapsed .sb-foot button span{display:none;}

/* ── Hover expand for collapsed sidebar ── */
#sidebar.collapsed:hover{width:var(--sb);overflow-y:auto;}
#sidebar.collapsed:hover .sbi{justify-content:normal;padding:8px 10px;}
#sidebar.collapsed:hover .sb-logo{justify-content:normal;padding:16px 14px 12px;}
#sidebar.collapsed:hover .sb-sec{padding:4px 10px;}
#sidebar.collapsed:hover .sbi.on{border-right:2px solid var(--em);border-left:none;}
#sidebar.collapsed:hover .sb-name,
#sidebar.collapsed:hover .sb-sub,
#sidebar.collapsed:hover .sb-lbl,
#sidebar.collapsed:hover .sbi-name,
#sidebar.collapsed:hover .sbi-badge,
#sidebar.collapsed:hover .cs-text,
#sidebar.collapsed:hover .cs-text+.ti{display:block;}
#sidebar.collapsed:hover .sbi-ic{font-size:16px;width:22px;}
#sidebar.collapsed:hover .sb-foot>div{display:flex;flex-direction:column;}
#sidebar.collapsed:hover .sb-foot a>div{justify-content:normal;padding:10px 12px;gap:10px;}
#sidebar.collapsed:hover .sb-foot a>div>div:nth-child(2){display:block;}
#sidebar.collapsed:hover .sb-foot button{width:100%;padding:8px 10px;justify-content:normal;}
#sidebar.collapsed:hover .sb-foot button span{display:inline;}


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
  transition:margin-right .22s cubic-bezier(.4,0,.2,1);
}
#sidebar.collapsed ~ #main{margin-right:58px;}

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
  /* منع الـ overflow الأفقي الذي يسبب الفراغ وانزياح المحتوى */
  html,body{
    overflow-x:hidden !important;
    max-width:100vw;
  }

  #sidebar{display:none !important;}
  #mob-nav{
    display:flex;
    position:fixed;bottom:0;
    /* inset-inline بدلاً من left/right لدعم RTL الصحيح */
    inset-inline-start:0;
    inset-inline-end:0;
    left:0;right:0; /* fallback للمتصفحات القديمة */
    width:100%;
    /* الارتفاع يشمل المساحة الآمنة */
    height:calc(var(--mb) + env(safe-area-inset-bottom,0px));
    z-index:9999;
    background:var(--bg2);
    border-top:1px solid var(--b2);
    box-shadow:0 -4px 20px rgba(0,0,0,.10);
    /* المحتوى يُضغط فوق المنطقة الآمنة فقط */
    padding-bottom:env(safe-area-inset-bottom,0px);
    box-sizing:border-box;
  }
  body.dark #mob-nav{box-shadow:0 -4px 20px rgba(0,0,0,.35);}
  .mob-tabs{display:flex;width:100%;align-items:stretch;box-sizing:border-box;}
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
    margin-inline-end:0 !important;
    width:100% !important;
    max-width:100vw;
    overflow-x:hidden;
    padding-bottom:calc(var(--mb) + env(safe-area-inset-bottom,0px));
    min-height:auto;
  }
  #main:has(#p-pos.on){padding-bottom:0;}
  html{height:auto;overflow-x:hidden;}
  body{min-height:100vh;overflow-x:hidden;}
  #topbar{padding:0 14px;overflow:hidden;max-width:100vw;}
  .srch{display:none;}
  .tb-btn .tb-txt{display:none;}
  .page{padding:14px;}
  .page:not(.on){display:none !important;}
  .kpis{grid-template-columns:1fr 1fr;gap:10px;}
  .kpi-val{font-size:19px;}
  .g2,.g3,.g4,.g65,.g35,.g73{grid-template-columns:1fr !important;}
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

## FILE: resources/css/theme/modern-utilities.css
```
/* ═══════════════════════════════════════════════════
   modern-utilities.css — الأدوات المتقدمة v2.0
   Utility classes لاستبدال inline styles
═══════════════════════════════════════════════════ */

/* ════════════════════════════════════════
   FLEXBOX + GRID UTILITIES
════════════════════════════════════════ */

/* ── Flex base ── */
.flex { display: flex; }
.inline-flex { display: inline-flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-wrap { flex-wrap: wrap; }
.flex-nowrap { flex-wrap: nowrap; }

/* ── Flex alignment ── */
.items-start { align-items: flex-start; }
.items-center { align-items: center; }
.items-end { align-items: flex-end; }
.items-stretch { align-items: stretch; }

.justify-start { justify-content: flex-start; }
.justify-center { justify-content: center; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.justify-around { justify-content: space-around; }

/* ── Gap ── */
.gap-2 { gap: 2px; }
.gap-3 { gap: 3px; }
.gap-4 { gap: 4px; }
.gap-6 { gap: 6px; }
.gap-8 { gap: 8px; }
.gap-10 { gap: 10px; }
.gap-12 { gap: 12px; }
.gap-14 { gap: 14px; }
.gap-16 { gap: 16px; }
.gap-20 { gap: 20px; }
.gap-24 { gap: 24px; }

/* ── Flex sizing ── */
.flex-1 { flex: 1; }
.flex-0 { flex: 0; }
.flex-shrink-0 { flex-shrink: 0; }
.flex-grow { flex-grow: 1; }

/* ════════════════════════════════════════
   SPACING — PADDING
════════════════════════════════════════ */

/* Padding uniform */
.p-0 { padding: 0; }
.p-2 { padding: 2px; }
.p-4 { padding: 4px; }
.p-6 { padding: 6px; }
.p-8 { padding: 8px; }
.p-10 { padding: 10px; }
.p-12 { padding: 12px; }
.p-14 { padding: 14px; }
.p-16 { padding: 16px; }
.p-18 { padding: 18px; }
.p-20 { padding: 20px; }
.p-24 { padding: 24px; }

/* Padding vertical/horizontal */
.px-0 { padding-left: 0; padding-right: 0; }
.px-4 { padding-left: 4px; padding-right: 4px; }
.px-6 { padding-left: 6px; padding-right: 6px; }
.px-8 { padding-left: 8px; padding-right: 8px; }
.px-10 { padding-left: 10px; padding-right: 10px; }
.px-12 { padding-left: 12px; padding-right: 12px; }
.px-14 { padding-left: 14px; padding-right: 14px; }
.px-16 { padding-left: 16px; padding-right: 16px; }
.px-20 { padding-left: 20px; padding-right: 20px; }

.py-0 { padding-top: 0; padding-bottom: 0; }
.py-2 { padding-top: 2px; padding-bottom: 2px; }
.py-4 { padding-top: 4px; padding-bottom: 4px; }
.py-6 { padding-top: 6px; padding-bottom: 6px; }
.py-8 { padding-top: 8px; padding-bottom: 8px; }
.py-10 { padding-top: 10px; padding-bottom: 10px; }
.py-12 { padding-top: 12px; padding-bottom: 12px; }
.py-14 { padding-top: 14px; padding-bottom: 14px; }
.py-16 { padding-top: 16px; padding-bottom: 16px; }
.py-20 { padding-top: 20px; padding-bottom: 20px; }

/* Padding individual */
.pt-0 { padding-top: 0; }
.pt-4 { padding-top: 4px; }
.pt-6 { padding-top: 6px; }
.pt-8 { padding-top: 8px; }
.pt-12 { padding-top: 12px; }
.pt-16 { padding-top: 16px; }
.pt-20 { padding-top: 20px; }

.pb-0 { padding-bottom: 0; }
.pb-4 { padding-bottom: 4px; }
.pb-6 { padding-bottom: 6px; }
.pb-8 { padding-bottom: 8px; }
.pb-12 { padding-bottom: 12px; }
.pb-16 { padding-bottom: 16px; }
.pb-20 { padding-bottom: 20px; }

.pl-4 { padding-left: 4px; }
.pl-6 { padding-left: 6px; }
.pl-8 { padding-left: 8px; }
.pl-12 { padding-left: 12px; }
.pl-16 { padding-left: 16px; }

.pr-4 { padding-right: 4px; }
.pr-6 { padding-right: 6px; }
.pr-8 { padding-right: 8px; }
.pr-12 { padding-right: 12px; }
.pr-16 { padding-right: 16px; }

/* ════════════════════════════════════════
   SPACING — MARGIN
════════════════════════════════════════ */

.m-0 { margin: 0; }
.m-2 { margin: 2px; }
.m-4 { margin: 4px; }
.m-6 { margin: 6px; }
.m-8 { margin: 8px; }
.m-12 { margin: 12px; }
.m-16 { margin: 16px; }

.mx-auto { margin-left: auto; margin-right: auto; }
.my-0 { margin-top: 0; margin-bottom: 0; }
.my-4 { margin-top: 4px; margin-bottom: 4px; }
.my-8 { margin-top: 8px; margin-bottom: 8px; }
.my-12 { margin-top: 12px; margin-bottom: 12px; }
.my-16 { margin-top: 16px; margin-bottom: 16px; }

.mt-0 { margin-top: 0; }
.mt-1 { margin-top: 1px; }
.mt-2 { margin-top: 2px; }
.mt-4 { margin-top: 4px; }
.mt-6 { margin-top: 6px; }
.mt-8 { margin-top: 8px; }
.mt-12 { margin-top: 12px; }
.mt-16 { margin-top: 16px; }
.mt-18 { margin-top: 18px; }
.mt-20 { margin-top: 20px; }

.mb-0 { margin-bottom: 0; }
.mb-2 { margin-bottom: 2px; }
.mb-4 { margin-bottom: 4px; }
.mb-6 { margin-bottom: 6px; }
.mb-8 { margin-bottom: 8px; }
.mb-12 { margin-bottom: 12px; }
.mb-16 { margin-bottom: 16px; }
.mb-18 { margin-bottom: 18px; }
.mb-20 { margin-bottom: 20px; }

.ml-auto { margin-left: auto; }
.mr-auto { margin-right: auto; }

/* ════════════════════════════════════════
   SIZING
════════════════════════════════════════ */

.w-full { width: 100%; }
.w-auto { width: auto; }
.h-full { height: 100%; }
.h-auto { height: auto; }

.w-6 { width: 6px; }
.w-30 { width: 30px; }
.w-32 { width: 32px; }
.w-36 { width: 36px; }
.w-38 { width: 38px; }
.w-40 { width: 40px; }

.h-6 { height: 6px; }
.h-30 { height: 30px; }
.h-32 { height: 32px; }
.h-36 { height: 36px; }
.h-38 { height: 38px; }
.h-40 { height: 40px; }
.h-80 { height: 80px; }

.min-h-92vh { min-height: 92vh; }

.min-w-0 { min-width: 0; }
.max-w-full { max-width: 100%; }
.max-w-360 { max-width: 360px; }
.max-w-420 { max-width: 420px; }
.max-w-580 { max-width: 580px; }
.max-w-700 { max-width: 700px; }

/* ════════════════════════════════════════
   BORDER RADIUS
════════════════════════════════════════ */

.rounded-0 { border-radius: 0; }
.rounded-sm { border-radius: 3px; }
.rounded { border-radius: var(--r1); }
.rounded-md { border-radius: var(--r2); }
.rounded-lg { border-radius: var(--r3); }
.rounded-xl { border-radius: var(--r4); }
.rounded-full { border-radius: 9999px; }
.rounded-50 { border-radius: 50%; }

/* ════════════════════════════════════════
   BORDER
════════════════════════════════════════ */

.border { border: 1px solid var(--b2); }
.border-1 { border: 1px solid var(--b2); }
.border-b { border-bottom: 1px solid var(--b2); }
.border-t { border-top: 1px solid var(--b2); }
.border-l { border-left: 1px solid var(--b2); }
.border-r { border-right: 1px solid var(--b2); }

.border-b1 { border-bottom: 1px solid var(--b1); }
.border-b2 { border-bottom: 1px solid var(--b2); }
.border-b3 { border-bottom: 1px solid var(--b3); }
.border-b4 { border-bottom: 1px solid var(--b4); }

.border-em { border-color: var(--em); }
.border-red { border-color: var(--red); }
.border-gold { border-color: var(--gold); }
.border-blue { border-color: var(--blue); }

/* ════════════════════════════════════════
   POSITION
════════════════════════════════════════ */

.absolute { position: absolute; }
.relative { position: relative; }
.fixed { position: fixed; }
.sticky { position: sticky; }

.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.inset-full { inset: 0; }

.top-0 { top: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.left-0 { left: 0; }

/* ════════════════════════════════════════
   TYPOGRAPHY
════════════════════════════════════════ */

/* Font sizes */
.text-8 { font-size: 8px; }
.text-9 { font-size: 9px; }
.text-xs { font-size: 10px; }
.text-sm { font-size: 11px; }
.text-md { font-size: 12px; }
.text-base { font-size: 13px; }
.text-lg { font-size: 14px; }
.text-xl { font-size: 15px; }
.text-2xl { font-size: 18px; }
.text-22 { font-size: 22px; }
.text-3xl { font-size: 23px; }
.text-25 { font-size: 25px; }
.text-4xl { font-size: 28px; }
.text-5xl { font-size: 36px; }

/* Font weights */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
.font-extrabold { font-weight: 800; }
.font-black { font-weight: 900; }
.font-mono { font-family: monospace; }
.font-sans { font-family: "Tajawal", sans-serif; }

/* Font styles */
.italic { font-style: italic; }
.not-italic { font-style: normal; }
.uppercase { text-transform: uppercase; }
.lowercase { text-transform: lowercase; }
.capitalize { text-transform: capitalize; }

/* Line height */
.leading-none { line-height: 1; }
.leading-tight { line-height: 1.2; }
.leading-normal { line-height: 1.4; }
.leading-relaxed { line-height: 1.6; }
.leading-loose { line-height: 1.8; }

/* Letter spacing */
.tracking-tight { letter-spacing: -1px; }
.tracking-normal { letter-spacing: 0; }
.tracking-wide { letter-spacing: 0.6px; }
.tracking-widest { letter-spacing: 1.4px; }

/* Text alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.text-justify { text-align: justify; }

/* Text decoration */
.line-through { text-decoration: line-through; }
.no-underline { text-decoration: none; }
.underline { text-decoration: underline; }

/* White space */
.whitespace-nowrap { white-space: nowrap; }
.whitespace-normal { white-space: normal; }
.whitespace-pre { white-space: pre; }

/* Word break */
.break-words { word-break: break-word; }
.break-all { word-break: break-all; }

/* Letter spacing */
.ltr { direction: ltr; }
.rtl { direction: rtl; }

/* ════════════════════════════════════════
   TEXT COLORS
════════════════════════════════════════ */

.text-t1 { color: var(--t1); }
.text-t2 { color: var(--t2); }
.text-t3 { color: var(--t3); }
.text-t4 { color: var(--t4); }

.text-em { color: var(--em); }
.text-em2 { color: var(--em2); }
.text-em3 { color: var(--em3); }
.text-red { color: var(--red); }
.text-gold { color: var(--gold); }
.text-blue { color: var(--blue); }
.text-purple { color: var(--purple); }
.text-orange { color: var(--orange); }
.text-teal { color: var(--teal); }
.text-white { color: #fff; }

/* ════════════════════════════════════════
   BACKGROUND COLORS
════════════════════════════════════════ */

.bg-0 { background: var(--bg0); }
.bg-1 { background: var(--bg1); }
.bg-2 { background: var(--bg2); }
.bg-3 { background: var(--bg3); }
.bg-4 { background: var(--bg4); }
.bg-5 { background: var(--bg5); }

.bg-em { background: var(--em); }
.bg-emb { background: var(--emb); }
.bg-red { background: var(--red); }
.bg-redb { background: var(--redb); }
.bg-gold { background: var(--gold); }
.bg-goldb { background: var(--goldb); }
.bg-blue { background: var(--blue); }
.bg-blueb { background: var(--blueb); }

/* Gradients */
.grad-em { background: linear-gradient(135deg, var(--em), var(--em3)); }
.grad-em-faint { background: linear-gradient(135deg, var(--emb), rgba(10,138,92,.02)); }

/* ════════════════════════════════════════
   OPACITY
════════════════════════════════════════ */

.opacity-0 { opacity: 0; }
.opacity-25 { opacity: 0.25; }
.opacity-50 { opacity: 0.50; }
.opacity-75 { opacity: 0.75; }
.opacity-100 { opacity: 1; }

/* ════════════════════════════════════════
   OVERFLOW
════════════════════════════════════════ */

.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-scroll { overflow: scroll; }
.overflow-x-auto { overflow-x: auto; }
.overflow-y-auto { overflow-y: auto; }

.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ════════════════════════════════════════
   CURSOR
════════════════════════════════════════ */

.cursor-auto { cursor: auto; }
.cursor-default { cursor: default; }
.cursor-pointer { cursor: pointer; }
.cursor-not-allowed { cursor: not-allowed; }
.cursor-text { cursor: text; }

/* ════════════════════════════════════════
   POINTER EVENTS
════════════════════════════════════════ */

.pointer-events-none { pointer-events: none; }
.pointer-events-auto { pointer-events: auto; }

/* ════════════════════════════════════════
   BACKDROP FILTER
════════════════════════════════════════ */

.backdrop-blur { backdrop-filter: blur(6px); }
.backdrop-blur-none { backdrop-filter: none; }

/* ════════════════════════════════════════
   USER SELECT
════════════════════════════════════════ */

.select-none { user-select: none; }
.select-text { user-select: text; }
.select-all { user-select: all; }

/* ════════════════════════════════════════
   TRANSITIONS & ANIMATIONS
════════════════════════════════════════ */

/* Transitions */
.transition { transition: all 0.15s; }
.transition-fast { transition: all 0.1s; }
.transition-normal { transition: all 0.2s; }
.transition-slow { transition: all 0.3s; }

.transition-colors { transition: background-color 0.15s, border-color 0.15s, color 0.15s; }
.transition-opacity { transition: opacity 0.15s; }
.transition-transform { transition: transform 0.15s; }
.transition-shadow { transition: box-shadow 0.15s; }

/* Animation utilities */
.animate-spin { animation: spin 1s linear infinite; }
.animate-spin-slow { animation: spin 0.8s linear infinite; }
.animate-fadeInUp { animation: fadeInUp 0.25s ease; }
.animate-slideInRight { animation: slideInRight 0.3s ease; }

/* ════════════════════════════════════════
   BOX SHADOW
════════════════════════════════════════ */

.shadow-none { box-shadow: none; }
.shadow { box-shadow: var(--shadow); }
.shadow-md { box-shadow: var(--shadow2); }
.shadow-lg { box-shadow: 0 24px 64px rgba(0,0,0,.3); }
.shadow-xl { box-shadow: 0 32px 80px rgba(0,0,0,.4); }

.shadow-em { box-shadow: var(--emglow); }

/* ════════════════════════════════════════
   DISPLAY
════════════════════════════════════════ */

.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.hidden { display: none; }
.visible { visibility: visible; }
.invisible { visibility: hidden; }

/* ════════════════════════════════════════
   COMPONENT-SPECIFIC UTILITIES
════════════════════════════════════════ */

/* ── Avatar ── */
.avatar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 900;
  letter-spacing: -1px;
}

.avatar-xs { width: 28px; height: 28px; border-radius: 8px; font-size: 10px; }
.avatar-sm { width: 32px; height: 32px; border-radius: 9px; font-size: 12px; }
.avatar-md { width: 38px; height: 38px; border-radius: 11px; font-size: 14px; }
.avatar-lg { width: 48px; height: 48px; border-radius: 14px; font-size: 18px; }
.avatar-xl { width: 64px; height: 64px; border-radius: 18px; font-size: 24px; }

/* ── Badge ── */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 9px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.badge-status { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }

/* ── Modal & Overlay ── */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(6px);
  padding: 16px;
  animation: ovIn .18s ease;
}

.modal {
  background: var(--bg2);
  border-radius: 20px;
  width: 100%;
  border: 1px solid var(--b3);
  box-shadow: 0 24px 64px rgba(0,0,0,.3);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  animation: modalIn .22s cubic-bezier(.34,1.4,.64,1);
}

.modal-head {
  padding: 16px 20px;
  border-bottom: 1px solid var(--b2);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid var(--b2);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-direction: row-reverse;
}

/* ── Icon boxes ── */
.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-box-xs { width: 28px; height: 28px; border-radius: 8px; font-size: 12px; }
.icon-box-sm { width: 32px; height: 32px; border-radius: 10px; font-size: 14px; }
.icon-box-md { width: 36px; height: 36px; border-radius: 10px; font-size: 16px; }
.icon-box-lg { width: 40px; height: 40px; border-radius: 12px; font-size: 18px; }
.icon-box-xl { width: 48px; height: 48px; border-radius: 14px; font-size: 22px; }

/* ── Icon (inline) ── */
.ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ic-xs { width: 16px; height: 16px; font-size: 14px; }
.ic-sm { width: 20px; height: 20px; font-size: 18px; }
.ic-md { width: 24px; height: 24px; font-size: 22px; }
.ic-lg { width: 32px; height: 32px; font-size: 28px; }

/* ── Form helpers ── */
.form-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--t4);
  margin-bottom: 4px;
}

.form-hint {
  display: block;
  font-size: 10px;
  color: var(--t4);
  margin-top: 3px;
}

/* ── Spinner ── */
.spinner-icon {
  animation: spin 1s linear infinite;
}

.spinner-icon-slow {
  animation: spin 0.8s linear infinite;
}

/* ════════════════════════════════════════
   CUSTOM ANIMATIONS
════════════════════════════════════════ */

/* Object fit */
.object-contain { object-fit: contain; }
.object-cover { object-fit: cover; }
.object-fill { object-fit: fill; }
.object-scale { object-fit: scale-down; }

@keyframes ovIn {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(6px); }
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* ════════════════════════════════════════
   RESPONSIVE MEDIA QUERIES
════════════════════════════════════════ */

@media (max-width: 768px) {
  .hidden-mobile { display: none; }
  .show-mobile { display: block; }
}

@media (min-width: 769px) {
  .hidden-desktop { display: none; }
  .show-desktop { display: block; }
}

```

## FILE: resources/css/theme/notifications.css
```
/* ═══════════════════════════════════════════════════════════════
   notifications.css — وحدة التنبيهات
   يعتمد على CSS tokens من tokens.css (يجب استيراده قبل هذا الملف)
═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────────────────────────
   1. TOAST CONTAINER  —  الحاوية الثابتة أعلى اليمين
────────────────────────────────────────────────────────── */
.ntf-container {
  position: fixed;
  top: calc(var(--tb) + 12px);
  inset-inline-end: 16px;
  z-index: 10500;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 340px;
  max-width: calc(100vw - 32px);
  pointer-events: none;
}

/* ──────────────────────────────────────────────────────────
   2. TOAST ITEM  —  بطاقة التنبيه الفردية
────────────────────────────────────────────────────────── */
.ntf-toast {
  pointer-events: auto;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 14px 12px;
  border-radius: var(--r3);
  border: 1px solid var(--ntf-border, var(--b3));
  background: var(--bg2);
  box-shadow: var(--shadow2);
  overflow: hidden;
  cursor: default;
  transition: box-shadow .2s;
}

.ntf-toast:hover { box-shadow: var(--shadow3); }

.ntf-toast__bar {
  position: absolute;
  inset-inline-start: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--ntf-bar, var(--em));
  border-radius: var(--r1) 0 0 var(--r1);
}

.ntf-toast__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--ntf-icon, var(--em));
}

.ntf-toast__body {
  flex: 1;
  min-width: 0;
}

.ntf-toast__title {
  font-size: 13px;
  font-weight: 800;
  color: var(--t1);
  margin: 0 0 2px;
  line-height: 1.35;
}

.ntf-toast__msg {
  font-size: 12px;
  color: var(--t3);
  margin: 0;
  line-height: 1.5;
  word-break: break-word;
}

.ntf-toast__action {
  margin-top: 8px;
  background: var(--ntf-bg, var(--emb));
  border-color: var(--ntf-border, var(--embo));
  color: var(--ntf-icon, var(--em));
}

.ntf-toast__action:hover { filter: brightness(1.1); }

.ntf-toast__close {
  flex-shrink: 0;
  margin-top: -2px;
}

.ntf-toast__progress {
  position: absolute;
  bottom: 0;
  inset-inline-start: 0;
  height: 2px;
  border-radius: 0 2px 0 0;
  opacity: .55;
  transition: width .05s linear;
}

@keyframes ntf-slide-in {
  from { transform: translateX(110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes ntf-slide-out {
  to { transform: translateX(110%); opacity: 0; }
}

.ntf-toast--in {
  animation: ntf-slide-in .3s cubic-bezier(.34, 1.3, .64, 1) forwards;
}

.ntf-toast--out {
  animation: ntf-slide-out .28s cubic-bezier(.4, 0, 1, 1) forwards;
}

[dir="rtl"] .ntf-toast--in  { animation-name: ntf-slide-in-rtl;  }
[dir="rtl"] .ntf-toast--out { animation-name: ntf-slide-out-rtl; }

@keyframes ntf-slide-in-rtl {
  from { transform: translateX(-110%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}

@keyframes ntf-slide-out-rtl {
  to { transform: translateX(-110%); opacity: 0; }
}

/* ──────────────────────────────────────────────────────────
   3. NOTIFICATION BELL  —  جرس الـ Topbar
────────────────────────────────────────────────────────── */

.ntf-bell { position: relative; }

.ntf-bell__btn {
  position: relative;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r2);
  border: 1px solid var(--b3);
  background: var(--bg3);
  color: var(--t2);
  cursor: pointer;
  transition: .15s;
  font-family: 'Tajawal', sans-serif;
}

.ntf-bell__btn:hover,
.ntf-bell__btn--active {
  background: var(--emb);
  border-color: var(--embo);
  color: var(--em);
}

.ntf-bell__badge {
  position: absolute;
  top: -5px;
  inset-inline-end: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: var(--red);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg2);
  animation: ntf-badge-pop .25s cubic-bezier(.34, 1.5, .64, 1);
}

@keyframes ntf-badge-pop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}

.ntf-bell__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  inset-inline-end: 0;
  width: 340px;
  max-width: calc(100vw - 24px);
  background: var(--bg2);
  border: 1px solid var(--b3);
  border-radius: var(--r3);
  box-shadow: var(--shadow3);
  display: flex;
  flex-direction: column;
  max-height: 420px;
  z-index: 5000;
  animation: ntf-dd-in .2s cubic-bezier(.34, 1.2, .64, 1);
}

@keyframes ntf-dd-in {
  from { transform: translateY(-8px) scale(.97); opacity: 0; }
  to   { transform: translateY(0)    scale(1);   opacity: 1; }
}

.ntf-bell__hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg3);
  border-radius: var(--r3) var(--r3) 0 0;
}

.ntf-bell__hd-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 800;
  color: var(--t1);
}

.ntf-bell__hd-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--red);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}

.ntf-bell__list {
  overflow-y: auto;
  flex: 1;
}

.ntf-bell__item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 14px;
  border-bottom: 1px solid var(--b1);
  cursor: pointer;
  transition: background .15s;
  position: relative;
}

.ntf-bell__item:last-child { border-bottom: none; }

.ntf-bell__item:hover { background: var(--bg3); }

.ntf-bell__item--unread { background: var(--emb); }
.ntf-bell__item--unread:hover { background: var(--em2b); }

.ntf-bell__item-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.ntf-bell__item-body {
  flex: 1;
  min-width: 0;
}

.ntf-bell__item-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--t1);
  margin: 0 0 2px;
}

.ntf-bell__item-msg {
  font-size: 11.5px;
  color: var(--t3);
  margin: 0 0 3px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ntf-bell__item-time {
  font-size: 10.5px;
  color: var(--t4);
  display: block;
}

.ntf-bell__dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--em);
  margin-top: 5px;
}

.ntf-bell__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--t4);
  font-size: 12px;
  text-align: center;
}

.ntf-bell__ft {
  padding: 10px 14px;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg3);
  border-radius: 0 0 var(--r3) var(--r3);
  text-align: center;
}

.ntf-bell__ft-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--em);
  text-decoration: none;
  transition: color .15s;
}

.ntf-bell__ft-link:hover { color: var(--em2); }

/* ──────────────────────────────────────────────────────────
   4. RESPONSIVE (bell + toast)
────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .ntf-container {
    top: auto;
    bottom: calc(var(--mb, 64px) + env(safe-area-inset-bottom, 8px));
    inset-inline-end: 8px;
    inset-inline-start: 8px;
    width: auto;
  }

  .ntf-bell__dropdown {
    width: calc(100vw - 24px);
    inset-inline-end: -50px;
  }
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

/* ═══════════════ POS ADDITIONS ═══════════════ */

/* ── CartRow image ── */
.cr-name-row { display:flex; align-items:center; gap:8px; }
.cr-img {
  width:32px;height:32px;border-radius:var(--r1);
  object-fit:cover;flex-shrink:0;
  border:1px solid var(--b2);background:var(--bg3);
}

/* ── Payment modal product list ── */
.pay-v2-items { margin-top:14px; }
.pay-items-list {
  display:flex;flex-direction:column;gap:4px;
  max-height:180px;overflow-y:auto;
}
.pay-item-row {
  display:grid;
  grid-template-columns: 18px 28px 1fr auto;
  align-items:center;gap:6px;
  padding:5px 6px;border-radius:var(--r1);
  background:var(--bg3);border:1px solid var(--b1);
}
.pay-item-num { font-size:10px;font-weight:800;color:var(--t4);text-align:center; }
.pay-item-img {
  width:28px;height:28px;border-radius:var(--r1);
  object-fit:cover;flex-shrink:0;
  border:1px solid var(--b2);background:var(--bg3);
}
.pay-item-info { min-width:0; }
.pay-item-name { font-size:11.5px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.pay-item-meta { font-size:10px;color:var(--t4); }
.pay-item-total { font-size:12px;font-weight:800;color:var(--em);white-space:nowrap;direction:ltr; }

/* ── Payment Modal V2 ── */
.pay-v2-body {
  display:grid;grid-template-columns:1fr 1.3fr;
  gap:0;overflow:hidden;flex:1;min-height:0;
}
.pay-v2-left {
  border-left:1px solid var(--b2);
  padding:16px 14px;overflow-y:auto;
  display:flex;flex-direction:column;
}
.pay-v2-right {
  padding:14px;overflow-y:auto;
  display:flex;flex-direction:column;
}
.pay-v2-hero {
  text-align:center;padding:16px 10px 12px;
  background:linear-gradient(135deg,var(--emb),transparent);
  border:1px solid var(--embo);border-radius:var(--r3);margin-bottom:14px;
}
.pay-hero-label  { font-size:11px;color:var(--t4);font-weight:700;margin-bottom:4px; }
.pay-hero-amount { font-size:32px;font-weight:900;color:var(--em);line-height:1;letter-spacing:-1px;direction:ltr; }
.pay-hero-client { margin-top:8px;font-size:12px;color:var(--t3);font-weight:600; }
.pay-v2-summary  { margin-bottom:14px; }
.pvs-row {
  display:flex;justify-content:space-between;
  font-size:12px;padding:4px 0;
  border-bottom:1px solid var(--b1);color:var(--t3);
}
.pvs-row:last-child { border-bottom:none; }
.pvs-disc span:last-child { color:var(--red); }
.pvs-total { font-weight:800;color:var(--t1);font-size:13px; }
.pay-v2-section    { margin-bottom:12px; }
.pay-v2-sec-title  { font-size:11px;font-weight:800;color:var(--t3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px; }
.pay-v2-select     { width:100%;padding:6px 8px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);font-family:'Tajawal',sans-serif;font-size:12.5px;color:var(--t1);outline:none; }
.pay-v2-date       { width:100%;padding:6px 8px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);font-size:12.5px;outline:none; }
.pay-v2-note       { width:100%;padding:7px 8px;border-radius:var(--r1);border:1px solid var(--b2);background:var(--bg3);font-family:'Tajawal',sans-serif;font-size:12.5px;resize:none;outline:none; }
.pay-v2-select:focus,.pay-v2-date:focus,.pay-v2-note:focus { border-color:var(--em);box-shadow:0 0 0 2px var(--emb); }
.pay-doc-pills    { display:flex;gap:6px;flex-wrap:wrap; }
.pay-dpill {
  display:flex;flex-direction:column;align-items:center;
  padding:6px 10px;border-radius:var(--r2);
  border:1.5px solid var(--b2);background:var(--bg3);
  cursor:pointer;font-family:'Tajawal',sans-serif;
  transition:all .13s;min-width:60px;
}
.pay-dpill:hover { border-color:var(--embo); }
.pay-dpill.on    { background:var(--emb);border-color:var(--em); }
.pay-dpill-code  { font-size:13px;font-weight:900;color:var(--em); }
.pay-dpill-name  { font-size:9.5px;color:var(--t4); }
.pay-status {
  display:flex;align-items:center;gap:8px;
  padding:9px 12px;border-radius:var(--r2);
  font-size:13px;font-weight:700;border:1px solid transparent;
}
.pay-status--deficit { background:var(--redb);border-color:var(--redbo);color:var(--red); }
.pay-status--change  { background:var(--goldb);border-color:var(--goldbo);color:var(--gold); }
.pay-status--ok {
  background:var(--emb);border-color:var(--embo);color:var(--em);
  animation:payOkPop .3s cubic-bezier(.34,1.5,.64,1);
}
@keyframes payOkPop { from{transform:scale(.95)} to{transform:scale(1)} }
.pay-quick-amts { display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px; }
.pay-qa-btn {
  padding:6px 10px;border-radius:var(--r1);
  border:1.5px solid var(--b2);background:var(--bg3);
  font-size:12px;font-weight:700;color:var(--t2);
  cursor:pointer;font-family:'Tajawal',sans-serif;
  transition:all .12s;direction:rtl;
}
.pay-qa-btn:hover { background:var(--emb);border-color:var(--embo);color:var(--em); }
.pay-qa-btn.on    { background:var(--em);border-color:var(--em);color:#fff; }
.pay-lines-v2 { display:flex;flex-direction:column;gap:7px; }
.pay-line-v2 {
  display:grid;
  grid-template-columns:18px 1fr 130px 90px;
  align-items:center;gap:5px;
  padding:7px 8px;border-radius:var(--r2);
  border:1.5px solid var(--b2);background:var(--bg3);
  cursor:pointer;transition:all .13s;
}
.pay-line-v2:hover  { border-color:var(--embo); }
.pay-line-v2.active { border-color:var(--em);background:var(--emb);box-shadow:0 0 0 2px var(--emb); }
.pay-line-v2.has-treasury { grid-template-columns:18px 1fr 130px 90px 100px 22px; }
.plv2-num    { font-size:10px;font-weight:800;color:var(--t4);text-align:center; }
.plv2-mode,.plv2-treasury {
  padding:5px 6px;border-radius:var(--r1);
  border:1px solid var(--b2);background:var(--bg2);
  font-family:'Tajawal',sans-serif;font-size:12px;
  outline:none;color:var(--t1);
}
.plv2-amt-wrap { display:flex;align-items:center;gap:2px; }
.plv2-amount {
  flex:1;padding:5px 6px;border-radius:var(--r1);
  border:1px solid var(--b2);background:var(--bg2);
  font-size:13px;font-weight:700;
  font-family:'IBM Plex Mono',monospace;
  outline:none;text-align:center;color:var(--t1);direction:ltr;
}
.plv2-fill {
  width:28px;height:28px;border-radius:var(--r1);
  border:1px solid var(--b2);background:var(--bg3);
  font-size:14px;font-weight:800;color:var(--t3);cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:.12s;
}
.plv2-fill:hover { background:var(--emb);color:var(--em);border-color:var(--embo); }
.plv2-ref {
  padding:5px 6px;border-radius:var(--r1);
  border:1px solid var(--b2);background:var(--bg2);
  font-size:11.5px;font-family:'Tajawal',sans-serif;
  outline:none;color:var(--t3);
}
.plv2-del {
  width:22px;height:22px;border-radius:var(--r1);border:none;
  background:none;color:var(--t4);
  cursor:pointer;font-size:13px;
  display:flex;align-items:center;justify-content:center;transition:.12s;
}
.plv2-del:hover { color:var(--red);background:var(--redb); }
.pay-numpad {
  display:grid;grid-template-columns:repeat(3,1fr);gap:6px;
}
.pay-npk {
  padding:13px;border-radius:var(--r2);
  border:1px solid var(--b2);background:var(--bg3);
  color:var(--t1);font-size:18px;font-weight:700;
  cursor:pointer;font-family:'IBM Plex Mono',monospace;
  transition:all .1s;
  -webkit-tap-highlight-color:transparent;user-select:none;
}
.pay-npk:hover,.pay-npk:active { background:var(--emb);border-color:var(--embo);color:var(--em); }
.pay-npk.del  { color:var(--red); }
.pay-npk.clear {
  background:var(--redb);border-color:var(--redbo);
  color:var(--red);font-size:14px;font-family:'Tajawal',sans-serif;
}
.pay-npk.clear:hover { background:var(--red);color:#fff; }
.pay-client-chip {
  display:inline-flex;align-items:center;gap:4px;
  margin-right:8px;padding:2px 10px;border-radius:20px;
  background:var(--bg3);border:1px solid var(--b2);
  font-size:11.5px;font-weight:600;color:var(--t3);
}

/* ── Customer Search Modal ── */
.cust-list-title {
  font-size:11px;font-weight:800;color:var(--t4);
  text-transform:uppercase;letter-spacing:.8px;margin:10px 0 6px;
}
.cust-list { display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto; }
.cust-empty {
  text-align:center;padding:32px 0;
  color:var(--t4);font-size:13px;
  display:flex;flex-direction:column;align-items:center;gap:6px;
}
.cust-row {
  display:flex;align-items:center;gap:10px;
  padding:9px 12px;border-radius:var(--r2);
  border:1px solid var(--b1);background:var(--bg3);
  cursor:pointer;text-align:right;width:100%;
  transition:all .13s;font-family:'Tajawal',sans-serif;
}
.cust-row:hover  { background:var(--bg4);border-color:var(--b2); }
.cust-row.on     { background:var(--emb);border-color:var(--embo); }
.cust-row.cust-anon { margin-bottom:4px; }
.cust-av {
  width:36px;height:36px;border-radius:50%;
  background:var(--grad-em);color:#fff;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;font-weight:800;flex-shrink:0;
}
.cust-row.cust-anon .cust-av { background:var(--bg4);border:1px solid var(--b3);color:var(--t4); }
.cust-info   { flex:1;min-width:0; }
.cust-name   { font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.cust-meta   { font-size:11px;color:var(--t4);display:flex;gap:8px;margin-top:2px; }
.cust-check  { color:var(--em);font-size:16px;flex-shrink:0; }
.stock-pill.last { background:var(--goldb);color:var(--gold);border-color:var(--goldbo); }
.pcard-last-badge {
  position:absolute;top:6px;right:6px;
  padding:1px 6px;border-radius:10px;
  background:var(--gold);color:#fff;
  font-size:9px;font-weight:800;line-height:1.4;
  pointer-events:none;z-index:2;
}
.pc-qty-disc {
  position:absolute;top:6px;left:6px;
  padding:2px 6px;border-radius:10px;
  background:var(--em);color:#fff;
  font-size:9.5px;font-weight:800;line-height:1.3;
  pointer-events:none;z-index:2;
}
@media (max-width:640px) {
  .pay-v2-body { grid-template-columns:1fr; }
  .pay-v2-left { border-left:none;border-bottom:1px solid var(--b2); }
  .pay-v2-hero { padding:10px; }
  .pay-hero-amount { font-size:26px; }
  .pay-numpad { gap:4px; }
  .pay-npk { padding:10px;font-size:16px; }
  .pay-line-v2 { grid-template-columns:18px 1fr 100px; }
  .plv2-ref { display:none; }
  .pay-items-list { max-height:120px; }
  .pay-item-row { grid-template-columns:14px 24px 1fr auto; }
  .pay-item-img { width:24px;height:24px; }
}

/* ═══════════════════════════════════════════════
   Dashboard — جدول آخر الفواتير على الموبايل
   نخفي: TVA (عمود 4) + التاريخ (عمود 6) + الإجراء (عمود 7)
   ونبقي: رقم + الزبون + المبلغ + الحالة
═══════════════════════════════════════════════ */
@media (max-width: 768px) {
  /* الجدول يأخذ عرض الكارد فقط، بدون scroll أفقي */
  #p-dashboard .tw {
    overflow-x: hidden;
  }
  #p-dashboard table {
    width: 100%;
    table-layout: fixed;
  }

  /* إخفاء TVA (th:4, td:4) */
  #p-dashboard thead tr th:nth-child(4),
  #p-dashboard tbody tr td:nth-child(4) { display: none; }

  /* إخفاء التاريخ (th:6, td:6) */
  #p-dashboard thead tr th:nth-child(6),
  #p-dashboard tbody tr td:nth-child(6) { display: none; }

  /* إخفاء زر الإجراء (th:7, td:7) */
  #p-dashboard thead tr th:nth-child(7),
  #p-dashboard tbody tr td:nth-child(7) { display: none; }

  /* توزيع عرض الأعمدة المتبقية: رقم | الزبون | المبلغ | الحالة */
  #p-dashboard thead tr th:nth-child(1),
  #p-dashboard tbody tr td:nth-child(1) { width: 18%; }

  #p-dashboard thead tr th:nth-child(2),
  #p-dashboard tbody tr td:nth-child(2) { width: 38%; }

  #p-dashboard thead tr th:nth-child(3),
  #p-dashboard tbody tr td:nth-child(3) { width: 24%; }

  #p-dashboard thead tr th:nth-child(5),
  #p-dashboard tbody tr td:nth-child(5) { width: 20%; }

  /* اقتطاع النص الطويل في خانة الزبون */
  #p-dashboard tbody tr td:nth-child(2) span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 90px;
  }
}

```

## FILE: resources/css/theme/pos.css
```
/* ═══════════════════════════════════════════════════════════════════════
   pos.css — نظام POS العالمي الاحترافي v4.0
   (مدمج مع pos-additions.css و pos-missing.css – تم إزالة التكرارات)
   ═══════════════════════════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════════
   WRAPPER
════════════════════════════════════════════════════ */
.pos-wrap {
  display: flex;
  flex-direction: column;
  height: calc(100vh - var(--tb));
  overflow: hidden;
  background: var(--bg1);
  font-family: 'Tajawal', sans-serif;
}
.pos-wrap.pos-fullscreen {
  height: 100vh;
  position: fixed;
  inset: 0;
  z-index: 9999;
}

/* ════════════════════════════════════════════════════
   TOP BAR
════════════════════════════════════════════════════ */
.pos-topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  min-height: 46px;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.pos-topbar::-webkit-scrollbar { display: none; }

/* Chips */
.pos-stats-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.pos-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 8px;
  border-radius: 20px;
  border: 1px solid transparent;
  flex-shrink: 0;
  white-space: nowrap;
  cursor: default;
  transition: transform .12s, box-shadow .12s;
  user-select: none;
}
.pos-chip.clickable { cursor: pointer; }
.pos-chip.clickable:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,.1); }
.pic-ic { font-size: 14px; }
.pos-chip-inner { display: flex; flex-direction: column; line-height: 1.15; }
.pos-chip-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; opacity: .7; }
.pos-chip-val   { font-size: 13px; font-weight: 900; }

.pos-chip.g  { background: var(--emb);    border-color: var(--embo);    color: var(--em);     }
.pos-chip.o  { background: var(--goldb);  border-color: var(--goldbo);  color: var(--gold);   }
.pos-chip.b  { background: var(--blueb);  border-color: var(--bluebo);  color: var(--blue);   }
.pos-chip.p  { background: var(--purb);   border-color: var(--purbo);   color: var(--purple); }
.pos-chip.c  { background: var(--bg3);    border-color: var(--b3);      color: var(--t2);     }
.pos-chip.em { background: var(--em);     border-color: var(--em);      color: #fff; font-weight: 900; }

/* Tools */
.pos-tools-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: auto;
  flex-shrink: 0;
}
.pos-tool-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t2);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  white-space: nowrap;
  flex-shrink: 0;
}
.pos-tool-btn:hover { background: var(--bg4); color: var(--t1); }
.pos-tool-btn:disabled { opacity: .4; cursor: not-allowed; }
.pos-tool-sep { width: 1px; height: 20px; background: var(--b3); margin: 0 2px; flex-shrink: 0; }
.pos-tool-icon {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t3);
  font-size: 15px;
  cursor: pointer;
  transition: .12s;
  flex-shrink: 0;
  position: relative;
}
.pos-tool-icon:hover { background: var(--bg4); color: var(--t1); }
.pos-tool-icon--active { color: var(--em); border-color: var(--embo); background: var(--emb); }

/* Actions row (POSTopBar buttons) */
.pos-actions-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: auto;
  flex-shrink: 0;
}
.tb-txt { font-size: 11px; }
.tb-sep {
  width: 1px;
  align-self: stretch;
  margin: 4px 4px;
  background: var(--b2);
  flex-shrink: 0;
}

.btn-xs.btn-warn {
  background: var(--goldb);
  border-color: var(--goldbo);
  color: var(--gold);
}
.btn-xs.btn-warn:hover:not(:disabled) { background: var(--goldbo); }
.btn-xs.btn-warn:disabled { opacity: .4; cursor: not-allowed; }

/* Keyboard strip */
.pos-kb-strip {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-shrink: 0;
  padding-right: 4px;
}
.kb-tip {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--t4);
  white-space: nowrap;
}
.kb-tip kbd {
  background: var(--bg4);
  border: 1px solid var(--b3);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 9px;
  font-family: monospace;
  color: var(--t3);
}
.filter-dot {
  position: absolute; top: 3px; right: 3px;
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--red); border: 1.5px solid var(--bg2);
}

/* ════════════════════════════════════════════════════
   QUICK ITEMS BAR
════════════════════════════════════════════════════ */
.pos-quickbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.pos-quickbar::-webkit-scrollbar { display: none; }
.pqb-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--t4);
  white-space: nowrap;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pqb-item {
  display: flex;
  align-items: stretch;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  overflow: hidden;
  flex-shrink: 0;
  transition: border-color .12s, box-shadow .12s;
}
.pqb-item:hover { border-color: var(--embo); box-shadow: 0 2px 8px var(--emb); }
.pqb-add {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 4px 9px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  gap: 1px;
}
.pqb-add:disabled { opacity: .5; cursor: not-allowed; }
.pqb-name  { font-size: 11px; font-weight: 700; color: var(--t1); white-space: nowrap; max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.pqb-price { font-size: 9.5px; font-weight: 700; color: var(--em); }
.pqb-rm {
  display: flex;
  align-items: center;
  padding: 0 6px;
  background: none;
  border: none;
  border-right: 1px solid var(--b2);
  cursor: pointer;
  color: var(--t4);
  font-size: 11px;
  transition: .12s;
}
.pqb-rm:hover { background: var(--redb); color: var(--red); }

.pos-quickbar-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
  position: relative;
}
.pqb-scroll {
  flex-shrink: 0;
  width: 28px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg2);
  border: none;
  border-right: 1px solid var(--b2);
  cursor: pointer;
  color: var(--t4);
  font-size: 16px;
  z-index: 1;
  transition: .12s;
}
.pqb-scroll-r { border-right: none; border-left: 1px solid var(--b2); }
.pqb-scroll:hover { color: var(--t1); background: var(--bg3); }

/* ════════════════════════════════════════════════════
   LAYOUT
════════════════════════════════════════════════════ */
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 390px;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

/* ════════════════════════════════════════════════════
   LEFT: PRODUCTS PANEL
════════════════════════════════════════════════════ */
.pos-left {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg1);
  border-left: 1px solid var(--b2);
}

/* Search bar */
.pos-search-bar {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 12px;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
}
.pos-inp {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--bg3);
  border: 1.5px solid var(--b2);
  border-radius: var(--r2);
  padding: 10px 12px;
  transition: border-color .14s, box-shadow .14s;
  min-width: 0;
}
.pos-inp:focus-within {
  border-color: var(--em);
  background: var(--bg2);
  box-shadow: 0 0 0 3px var(--emb);
}
.pos-inp input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--t1);
  font-size: 15px;
  width: 100%;
  font-family: 'Tajawal', sans-serif;
}
.pos-inp input::placeholder { color: var(--t4); }
.srch-clear { background: none; border: none; color: var(--t4); cursor: pointer; font-size: 13px; padding: 0; display: flex; align-items: center; transition: .12s; }
.srch-clear:hover { color: var(--red); }
.srch-hint kbd { background: var(--bg4); border: 1px solid var(--b3); border-radius: 3px; padding: 1px 5px; font-size: 9px; font-family: monospace; color: var(--t4); }
.srch-count { font-size: 11px; color: var(--t4); font-weight: 700; white-space: nowrap; flex-shrink: 0; }
.pos-sort-wrap { position: relative; }
.pos-sort-btn {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--b2); border-radius: var(--r1);
  background: var(--bg3); color: var(--t2);
  cursor: pointer; flex-shrink: 0;
  transition: .12s;
}
.pos-sort-btn:hover { background: var(--bg4); color: var(--t1); }
.pos-sort-btn i { font-size: 15px; }
.pos-sort-drop {
  position: absolute; top: calc(100% + 4px); left: 0; z-index: 100;
  min-width: 130px;
  background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r2); box-shadow: var(--sh-lg);
  padding: 4px; display: flex; flex-direction: column; gap: 2px;
}
.psd-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border: none; border-radius: var(--r1);
  background: transparent; color: var(--t2); font-size: 12.5px;
  font-family: 'Tajawal', sans-serif; cursor: pointer;
  text-align: right; transition: .1s;
}
.psd-item:hover { background: var(--bg4); }
.psd-item.on { background: var(--emb); color: var(--em); font-weight: 700; }
.psd-item i { font-size: 14px; }
.pos-view-btns { display: flex; border-radius: var(--r2); overflow: hidden; border: 1px solid var(--b2); flex-shrink: 0; }
.pvb {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg3);
  border: none;
  color: var(--t3);
  font-size: 14px;
  cursor: pointer;
  transition: .12s;
}
.pvb:hover { background: var(--bg4); color: var(--t1); }
.pvb.on { background: var(--emb); color: var(--em); }
.pvb + .pvb { border-right: 1px solid var(--b2); }

.pos-grid-size { display: flex; border-radius: var(--r2); overflow: hidden; border: 1px solid var(--b2); flex-shrink: 0; }
.pgs {
  padding: 4px 8px;
  background: var(--bg3);
  border: none;
  color: var(--t3);
  font-size: 10.5px;
  font-weight: 700;
  cursor: pointer;
  transition: .12s;
  font-family: monospace;
}
.pgs:hover { background: var(--bg4); color: var(--t1); }
.pgs.on { background: var(--emb); color: var(--em); }
.pgs + .pgs { border-right: 1px solid var(--b2); }

/* Filter panel */
.pos-filter-panel {
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  padding: 7px 12px;
  flex-shrink: 0;
  animation: slideDown .14s ease;
}
@keyframes slideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.pfp-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pfp-check { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--t2); cursor: pointer; user-select: none; white-space: nowrap; }
.pfp-check input { accent-color: var(--em); width: 14px; height: 14px; cursor: pointer; }
.pfp-price-range { display: flex; align-items: center; gap: 6px; }
.pfp-price-inp { width: 80px; padding: 4px 8px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); font-size: 12px; font-family: 'Tajawal', sans-serif; color: var(--t1); outline: none; }
.pfp-price-inp:focus { border-color: var(--em); }

/* Category tabs */
.pos-cats-wrapper {
  display: flex;
  align-items: center;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
}
.pos-cats {
  display: flex;
  padding: 0 4px;
  background: var(--bg2);
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
  gap: 2px;
  min-height: 40px;
  align-items: center;
  scroll-behavior: smooth;
}
.pos-cats::-webkit-scrollbar { display: none; }
.pos-cats-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  min-width: 24px;
  height: 24px;
  margin: 0 3px;
  border: none;
  border-radius: 50%;
  background: var(--bg1);
  color: var(--t3);
  cursor: pointer;
  flex-shrink: 0;
  font-size: 14px;
  opacity: 0;
  pointer-events: none;
  transition: opacity .15s, color .15s, background .15s;
  box-shadow: 0 1px 3px rgba(0,0,0,.1);
}
.pos-cats-btn.show {
  opacity: 1;
  pointer-events: auto;
}
.pos-cats-btn:hover {
  color: var(--t1);
  background: var(--emb);
}
.pos-cat {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 20px;
  border: 1.5px solid transparent;
  background: transparent;
  color: var(--t3);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  white-space: nowrap;
  flex-shrink: 0;
}
.pos-cat:hover { background: var(--bg3); color: var(--t1); }
.pos-cat.on { background: var(--emb); border-color: var(--embo); color: var(--em); }
.cat-kb { font-size: 8px; font-family: monospace; background: var(--bg4); border: 1px solid var(--b3); border-radius: 3px; padding: 1px 4px; opacity: 0.6; }

/* ════════════════════════════════════════════════════
   PRODUCT GRID
════════════════════════════════════════════════════ */
.pgrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  padding: 12px;
  overflow-y: auto;
  flex: 1;
  align-content: start;
}
.pgrid--xs { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 6px; padding: 8px; }
.pgrid--sm { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px; padding: 10px; }
.pgrid--lg { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; padding: 14px; }

/* Product Card */
.pcard {
  display: flex;
  flex-direction: column;
  border-radius: var(--r2);
  border: 1.5px solid var(--b1);
  background: var(--bg2);
  overflow: hidden;
  cursor: pointer;
  transition: border-color .15s, box-shadow .15s, transform .12s;
  position: relative;
  user-select: none;
}
.pcard:hover {
  border-color: var(--embo);
  box-shadow: 0 4px 16px var(--emb);
  transform: translateY(-2px);
}
.pcard:active { transform: translateY(0); }
.pcard.pcard-out { opacity: .55; cursor: not-allowed; }
.pcard.pcard-out:hover { transform: none; border-color: var(--b2); box-shadow: none; }
.pcard.pcard-hl { outline: 2.5px solid var(--em); outline-offset: -2.5px; box-shadow: 0 0 0 4px var(--emb); }
.pcard.pcard-incart { border-color: var(--embo); background: var(--emb); }

.pcard-img {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.pcard-img img { width: 100%; height: 100%; object-fit: cover; }
.pcard-in-cart {
  position: absolute;
  top: 6px; right: 6px;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--em);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg2);
  box-shadow: 0 1px 4px rgba(0,0,0,.15);
}
.pcard-out-badge {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.45);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 1px;
}
.pcard-low-badge {
  position: absolute;
  bottom: 4px; left: 4px;
  background: var(--gold);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 8px;
}
.pcard-body { padding: 10px 10px 6px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.pcard-name { font-size: 13px; font-weight: 700; color: var(--t1); line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.pcard-bc   { font-size: 10px; color: var(--t4); font-family: monospace; direction: ltr; text-align: right; }
.pcard-prices { display: flex; align-items: baseline; gap: 6px; margin-top: 4px; }
.pcard-ttc {
  font-size: 17px;
  font-weight: 900;
  color: var(--em);
  background: var(--emb);
  padding: 2px 8px;
  border-radius: var(--r1);
  display: inline-block;
  line-height: 1.3;
}
.pcard-ht  { font-size: 11px; color: var(--t4); }
.pcard-stock {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10.5px;
  font-weight: 700;
  margin-top: 2px;
}
.pcard-stock.ok  { color: var(--green); }
.pcard-stock.low { color: var(--gold);  }
.pcard-stock.out { color: var(--red);   }

.pcard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px 10px;
  gap: 6px;
}
.pcard-pin {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: none;
  border: 1px solid var(--b2);
  border-radius: var(--r1);
  color: var(--t4);
  font-size: 13px;
  cursor: pointer;
  transition: .12s;
  flex-shrink: 0;
}
.pcard-pin:hover, .pcard-pin.on { color: var(--gold); border-color: var(--goldbo); background: var(--goldb); }
.pcard-add {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: var(--r1);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
}
.pcard-add:hover { background: var(--em2); }
.pcard-add:disabled { opacity: .4; cursor: not-allowed; }

/* ── حجم xs و sm: أيقونة فقط ── */
.pgrid--xs .pcard-img  { aspect-ratio: auto; min-height: 55px; }
.pgrid--xs .pcard-body { padding: 6px; }
.pgrid--xs .pcard-name { font-size: 11px; -webkit-line-clamp: 1; }
.pgrid--xs .pcard-bc   { display: none; }
.pgrid--xs .pcard-ht   { display: none; }
.pgrid--xs .pcard-stock { display: none; }
.pgrid--xs .pcard-actions { padding: 4px 6px 6px; }
.pgrid--xs .pcard-pin { width: 22px; height: 22px; font-size: 10px; }
.pgrid--xs .pcard-ttc { font-size: 13px; padding: 1px 5px; }
.pgrid--sm .pcard-ttc { font-size: 14px; padding: 1px 6px; }
.pgrid--sm .pcard-ht  { display: none; }

/* ════════════════════════════════════════════════════
   LIST VIEW
════════════════════════════════════════════════════ */
.pos-list-wrap { flex: 1; overflow-y: auto; }
.pos-ptable {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
}
.pos-ptable thead th {
  padding: 8px 10px;
  text-align: right;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: .4px;
  border-bottom: 2px solid var(--b2);
  background: var(--bg2);
  position: sticky;
  top: 0;
  z-index: 1;
}
.prow {
  cursor: pointer;
  transition: background .1s;
  border-bottom: 1px solid var(--b1);
}
.prow:hover { background: var(--bg3); }
.prow.prow-incart { background: var(--emb); }
.prow.prow-out { opacity: .5; cursor: not-allowed; }
.prow.prow-hl { outline: 2px solid var(--em); outline-offset: -2px; background: var(--emb); }
.prow td { padding: 8px 10px; vertical-align: middle; }
.prow-nm   { font-weight: 700; color: var(--t1); }
.prow-bc   { font-size: 10px; color: var(--t4); font-family: monospace; }
.prow-unit { color: var(--t3); font-size: 11.5px; text-align: center; }
.prow-price, .prow-ht { font-weight: 700; color: var(--t2); text-align: center; }
.prow-ttc  { font-weight: 900; color: var(--em); text-align: center; }
.prow-tva  { color: var(--t4); font-size: 11px; text-align: center; }
.prow-stock { text-align: center; }
.prow-acts { display: flex; align-items: center; gap: 5px; justify-content: flex-end; }
.prow-add {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: var(--em);
  border: none;
  border-radius: var(--r1);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: .12s;
}
.prow-add:hover { background: var(--em2); }
.prow-add:disabled { opacity: .4; cursor: not-allowed; }
.prow-pin {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  background: none;
  border: 1px solid var(--b2);
  border-radius: var(--r1);
  color: var(--t4);
  font-size: 14px;
  cursor: pointer;
  transition: .12s;
}
.prow-pin:hover { color: var(--gold); border-color: var(--goldbo); background: var(--goldb); }
.incart-badge {
  background: var(--em);
  color: #fff;
  font-size: 9px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 10px;
}

/* Stock pills */
.stock-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}
.stock-pill.ok  { background: var(--greenb);  color: var(--green); }
.stock-pill.low { background: var(--goldb);   color: var(--gold); }
.stock-pill.out { background: var(--redb);    color: var(--red); }
.stock-pill.na  { background: var(--bg4);     color: var(--t4); }

/* Loading */
.pos-loading {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}
.pos-skel {
  height: 195px;
  border-radius: var(--r2);
  background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

/* Empty */
.pos-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--t4);
  padding: 40px;
}
.pos-empty-ico { font-size: 48px; opacity: .25; }
.pos-empty-ttl { font-size: 16px; font-weight: 800; color: var(--t3); }
.pos-empty-sub { font-size: 12.5px; color: var(--t4); text-align: center; }

/* ════════════════════════════════════════════════════
   CART PANEL
════════════════════════════════════════════════════ */
.pos-cart {
  display: flex;
  flex-direction: column;
  background: var(--bg2);
  overflow: hidden;
  border-right: 1px solid var(--b2);
}

/* Cart top */
.cart-top {
  padding: 10px 12px;
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cart-top-row { display: flex; align-items: center; justify-content: space-between; }
.cart-ttl {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 800;
  color: var(--t1);
}
.cart-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 10px;
  background: var(--bg4);
  color: var(--t3);
  font-size: 10.5px;
  font-weight: 800;
  border: 1px solid var(--b2);
}
.cart-pill.on { background: var(--em); color: #fff; border-color: var(--em); }
.cart-acts2 { display: flex; align-items: center; gap: 4px; }

.cart-note-wrap { animation: slideDown .14s ease; }
.cart-note-inp {
  width: 100%;
  padding: 6px 9px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 12.5px;
  outline: none;
  color: var(--t1);
  box-sizing: border-box;
}
.cart-note-inp:focus { border-color: var(--em); }

/* Price modes */
.cart-modes2 { display: flex; gap: 4px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
.cart-modes2::-webkit-scrollbar { display: none; }
.cmode {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 16px;
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  color: var(--t3);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  white-space: nowrap;
  flex-shrink: 0;
}
.cmode:hover { background: var(--bg4); color: var(--t1); }
.cmode.on { background: var(--emb); border-color: var(--embo); color: var(--em); }
.cmode-disc { font-size: 9.5px; font-weight: 900; opacity: .8; }

/* Client combobox */
.cart-client { position: relative; }
.client-trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  font-size: 12.5px;
  color: var(--t2);
  transition: border-color .12s;
  user-select: none;
}
.client-trigger:hover { border-color: var(--b3); }
.client-trigger.open { border-color: var(--em); background: var(--bg2); }
.client-trigger.has-client { border-color: var(--embo); }
.ct-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.ct-debt {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 10px;
  background: var(--redb);
  color: var(--red);
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}

.client-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  z-index: 200;
  background: var(--bg2);
  border: 1.5px solid var(--b2);
  border-radius: var(--r2);
  box-shadow: var(--shadow2);
  max-height: 260px;
  display: flex;
  flex-direction: column;
  animation: slideDown .12s ease;
}
.cd-search {
  padding: 7px 8px;
  border-bottom: 1px solid var(--b2);
}
.cd-search input {
  width: 100%;
  padding: 5px 9px;
  border: 1px solid var(--b2);
  border-radius: var(--r1);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 12.5px;
  outline: none;
  color: var(--t1);
  box-sizing: border-box;
}
.cd-search input:focus { border-color: var(--em); }
.cd-list { overflow-y: auto; }
.cd-opt {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  border-bottom: 1px solid var(--b1);
  transition: background .1s;
}
.cd-opt:hover { background: var(--bg3); }
.cd-opt.sel { background: var(--emb); }
.co-av {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: var(--bg4);
  border: 1px solid var(--b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  color: var(--t2);
  flex-shrink: 0;
}
.co-info { flex: 1; min-width: 0; }
.co-nm { font-size: 12.5px; font-weight: 700; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.co-ph { font-size: 10.5px; color: var(--t4); }
.co-debt { font-size: 10.5px; font-weight: 800; color: var(--red); background: var(--redb); padding: 1px 6px; border-radius: 8px; flex-shrink: 0; }
.cd-empty { padding: 20px; text-align: center; font-size: 12px; color: var(--t4); }

/* ════════════════════════════════════════════════════
   CART ITEMS
════════════════════════════════════════════════════ */
.cart-items {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: var(--t4);
  padding: 30px;
}
.ce-ico { font-size: 44px; opacity: .2; }
.ce-ttl { font-size: 14px; font-weight: 800; color: var(--t3); }
.ce-sub { font-size: 11.5px; color: var(--t4); text-align: center; }

/* Cart Row */
.cart-row {
  display: grid;
  grid-template-columns: 22px 1fr auto auto 24px;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-bottom: 1px solid var(--b1);
  cursor: pointer;
  transition: background .1s;
  position: relative;
}
.cart-row:hover { background: var(--bg3); }
.cart-row.selected { background: var(--emb); border-right: 3px solid var(--em); }

.cr-idx { font-size: 10px; font-weight: 800; color: var(--t4); text-align: center; }
.cr-info { min-width: 0; }
.cr-name { font-size: 12.5px; font-weight: 700; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cr-variant { font-size: 10.5px; color: var(--t4); }
.cr-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 2px; }

/* ---- السعر والخصم (مدمج من pos.css + pos-missing.css) ---- */
.cr-price-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  flex-wrap: wrap;
}
.cr-price {
  font-size: 12px;
  font-weight: 700;
  color: var(--t3);
  cursor: pointer;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  padding: 1px 4px;
  border-radius: var(--r1);
  transition: background .12s;
  border: 1px dashed transparent;
}
.cr-price:hover {
  background: var(--emb);
  color: var(--em);
}
.cr-price-unit {
  font-size: 10px;
  font-weight: 400;
  color: var(--t4);
}
.cr-tva { font-size: 10px; color: var(--t4); }

/* الخصم المطبق */
.cr-disc {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--red);
  cursor: pointer;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  transition: all .12s;
}
.cr-disc:hover {
  background: var(--red);
  color: #fff;
}
.cr-disc-add {
  font-size: 11px;
  font-weight: 600;
  color: var(--t4);
  cursor: pointer;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px dashed var(--b3);
  transition: all .12s;
}
.cr-disc-add:hover {
  color: var(--em);
  border-color: var(--embo);
  background: var(--emb);
}
.cr-disc-edit {
  display: flex;
  align-items: center;
  gap: 4px;
}
.cr-disc-mode-btn {
  padding: 2px 7px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-size: 11px;
  font-weight: 800;
  color: var(--t4);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: all .12s;
  line-height: 1.4;
}
.cr-disc-mode-btn:hover {
  border-color: var(--embo);
  color: var(--em);
}
.cr-disc-mode-btn.on {
  background: var(--emb);
  border-color: var(--em);
  color: var(--em);
}

/* حقل التحرير (قابل للاستخدام في الكمية / السعر / الخصم) */
.cr-edit-inp {
  padding: 4px 6px;
  border-radius: var(--r1);
  border: 1.5px solid var(--em);
  background: var(--bg2);
  font-size: 12.5px;
  font-weight: 700;
  font-family: 'IBM Plex Mono', monospace;
  outline: none;
  color: var(--t1);
  text-align: center;
  box-shadow: 0 0 0 2px var(--emb);
}

/* Qty control */
.cr-qty-ctrl {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--bg3);
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  padding: 2px 4px;
  flex-shrink: 0;
}
.cq-btn {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: none;
  border: none;
  border-radius: var(--r1);
  color: var(--t3);
  font-size: 12px;
  cursor: pointer;
  transition: .1s;
  flex-shrink: 0;
}
.cq-btn:hover { background: var(--bg4); color: var(--t1); }
.cq-val {
  min-width: 28px;
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  color: var(--t1);
  cursor: pointer;
  padding: 1px;
  border-radius: 3px;
  transition: .1s;
}
.cq-val:hover { background: var(--bg4); }
.cq-inp {
  width: 52px;
  text-align: center;
  font-weight: 900;
  font-size: 13px !important; /* يتغلب على أي تعارض */
}
.cq-unit { font-size: 10px; color: var(--t4); font-weight: 700; flex-shrink: 0; }
.cq-stock-warn {
  color: var(--gold);
  font-size: 13px;
  flex-shrink: 0;
  animation: stockPulse 1.5s ease-in-out infinite;
}
@keyframes stockPulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.45; }
}

/* Totals */
.cr-total { text-align: left; flex-shrink: 0; }
.cr-ttc { font-size: 13px; font-weight: 900; color: var(--em); }
.cr-ht  { font-size: 10px; color: var(--t4); }

/* Delete btn */
.cr-del {
  width: 22px; height: 22px;
  display: flex; align-items: center; justify-content: center;
  background: none;
  border: none;
  border-radius: var(--r1);
  color: var(--t4);
  font-size: 13px;
  cursor: pointer;
  transition: .12s;
  flex-shrink: 0;
  opacity: 0;
}
.cart-row:hover .cr-del,
.cart-row.selected .cr-del { opacity: 1; }
.cr-del:hover { background: var(--redb); color: var(--red); }

/* ════════════════════════════════════════════════════
   CART TOTALS
════════════════════════════════════════════════════ */
.cart-totals {
  padding: 10px 12px;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg3);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ct-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--t3);
}
.ct-disc { color: var(--red); }
.ct-grand {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0 0;
  margin-top: 4px;
  border-top: 2px solid var(--b2);
  font-size: 14px;
  color: var(--t1);
  font-weight: 800;
}
.grand-amount { font-size: 20px; font-weight: 900; color: var(--em); }

/* ════════════════════════════════════════════════════
   CART ACTIONS
════════════════════════════════════════════════════ */
.cart-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg2);
}
.cart-sell-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .14s;
  position: relative;
}
.cart-sell-btn:hover:not(:disabled) { background: var(--em2); box-shadow: var(--emglow2); transform: translateY(-1px); }
.cart-sell-btn:active { transform: none; }
.cart-sell-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.sell-kbd {
  position: absolute;
  left: 10px;
  font-size: 9px;
  font-family: monospace;
  background: rgba(255,255,255,.2);
  border-radius: 4px;
  padding: 2px 6px;
  opacity: .8;
}

/* ════════════════════════════════════════════════════
   MODALS
════════════════════════════════════════════════════ */
.ov {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(3px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn .15s ease;
}
.ov.on { display: flex; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
  background: var(--bg2);
  border-radius: var(--r3);
  border: 1px solid var(--b2);
  box-shadow: var(--shadow3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  animation: modalIn .18s cubic-bezier(.34,1.56,.64,1);
  width: 100%;
}
@keyframes modalIn { from { opacity: 0; transform: scale(.94) translateY(-8px); } to { opacity: 1; transform: none; } }

.modal-sm { max-width: 480px; }
.modal-md { max-width: 600px; }
.modal-lg { max-width: 780px; }
.modal-pay { max-width: 780px; }
.modal-pay-v2 { max-width: 780px; }
.modal-receipt { max-width: 500px; }

.m-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
}
.m-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--t1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.m-client-tag {
  font-size: 12px;
  font-weight: 700;
  background: var(--emb);
  color: var(--em);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--embo);
}
.m-docnum {
  font-size: 12px;
  font-weight: 700;
  background: var(--bg4);
  color: var(--t3);
  padding: 2px 8px;
  border-radius: 10px;
  font-family: monospace;
}
.m-x {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  border-radius: var(--r1);
  cursor: pointer;
  color: var(--t3);
  font-size: 16px;
  transition: .12s;
}
.m-x:hover { background: var(--bg4); color: var(--t1); }
.m-body { padding: 16px 18px; overflow-y: auto; flex: 1; }
.m-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg3);
  border-radius: 0 0 var(--r3) var(--r3);
}

/* ════════════════════════════════════════════════════
   PAYMENT MODAL (الإصدار المتقدم v2 من pos-additions.css)
════════════════════════════════════════════════════ */
.pay-v2-body {
  display: grid;
  grid-template-columns: 1fr 1.3fr;
  gap: 0;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.pay-v2-left {
  border-left: 1px solid var(--b2);
  padding: 16px 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.pay-v2-right {
  padding: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.pay-v2-hero {
  text-align: center;
  padding: 16px 10px 12px;
  background: linear-gradient(135deg, var(--emb), transparent);
  border: 1px solid var(--embo);
  border-radius: var(--r3);
  margin-bottom: 14px;
}
.pay-hero-label  { font-size: 11px; color: var(--t4); font-weight: 700; margin-bottom: 4px; }
.pay-hero-amount { font-size: 32px; font-weight: 900; color: var(--em); line-height: 1; letter-spacing: -1px; direction: ltr; }
.pay-hero-client { margin-top: 8px; font-size: 12px; color: var(--t3); font-weight: 600; }

.pay-v2-summary { margin-bottom: 14px; }
.pvs-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 4px 0;
  border-bottom: 1px solid var(--b1);
  color: var(--t3);
}
.pvs-row:last-child { border-bottom: none; }
.pvs-disc span:last-child { color: var(--red); }
.pvs-total { font-weight: 800; color: var(--t1); font-size: 13px; }

.pay-v2-section { margin-bottom: 12px; }
.pay-v2-sec-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--t3);
  text-transform: uppercase;
  letter-spacing: .8px;
  margin-bottom: 5px;
}
.pay-v2-select,
.pay-v2-date,
.pay-v2-note {
  width: 100%;
  padding: 6px 8px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 12.5px;
  color: var(--t1);
  outline: none;
}
.pay-v2-date { width: 100%; padding: 6px 8px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); font-size: 12.5px; outline: none; }
.pay-v2-note { width: 100%; padding: 7px 8px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); font-family: 'Tajawal', sans-serif; font-size: 12.5px; resize: none; outline: none; }
.pay-v2-select:focus,
.pay-v2-date:focus,
.pay-v2-note:focus { border-color: var(--em); box-shadow: 0 0 0 2px var(--emb); }

.pay-doc-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.pay-dpill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: all .13s;
  min-width: 60px;
}
.pay-dpill:hover { border-color: var(--embo); }
.pay-dpill.on { background: var(--emb); border-color: var(--em); }
.pay-dpill-code { font-size: 13px; font-weight: 900; color: var(--em); }
.pay-dpill-name { font-size: 9.5px; color: var(--t4); }

.pay-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: var(--r2);
  font-size: 13px;
  font-weight: 700;
  border: 1px solid transparent;
}
.pay-status--deficit {
  background: var(--redb);
  border-color: var(--redbo);
  color: var(--red);
}
.pay-status--change {
  background: var(--goldb);
  border-color: var(--goldbo);
  color: var(--gold);
}
.pay-status--ok {
  background: var(--emb);
  border-color: var(--embo);
  color: var(--em);
  animation: payOkPop .3s cubic-bezier(.34,1.5,.64,1);
}
@keyframes payOkPop {
  from { transform: scale(.95); }
  to   { transform: scale(1); }
}

.pay-quick-amts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.pay-qa-btn {
  padding: 6px 10px;
  border-radius: var(--r1);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 12px;
  font-weight: 700;
  color: var(--t2);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: all .12s;
  direction: rtl;
}
.pay-qa-btn:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }
.pay-qa-btn.on { background: var(--em); border-color: var(--em); color: #fff; }

.pay-lines-v2 { display: flex; flex-direction: column; gap: 7px; }
.pay-line-v2 {
  display: grid;
  grid-template-columns: 18px 1fr 130px 90px;
  align-items: center;
  gap: 5px;
  padding: 7px 8px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  transition: all .13s;
}
.pay-line-v2:hover { border-color: var(--embo); }
.pay-line-v2.active { border-color: var(--em); background: var(--emb); box-shadow: 0 0 0 2px var(--emb); }
.pay-line-v2.has-treasury {
  grid-template-columns: 18px 1fr 130px 90px 100px 22px;
}
.plv2-num { font-size: 10px; font-weight: 800; color: var(--t4); text-align: center; }
.plv2-mode,
.plv2-treasury {
  padding: 5px 6px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg2);
  font-family: 'Tajawal', sans-serif;
  font-size: 12px;
  outline: none;
  color: var(--t1);
}
.plv2-amt-wrap { display: flex; align-items: center; gap: 2px; }
.plv2-amount {
  flex: 1;
  padding: 5px 6px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg2);
  font-size: 13px;
  font-weight: 700;
  font-family: 'IBM Plex Mono', monospace;
  outline: none;
  text-align: center;
  color: var(--t1);
  direction: ltr;
}
.plv2-fill {
  width: 28px; height: 28px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-size: 14px; font-weight: 800;
  color: var(--t3); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: .12s;
}
.plv2-fill:hover { background: var(--emb); color: var(--em); border-color: var(--embo); }
.plv2-ref {
  padding: 5px 6px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg2);
  font-size: 11.5px;
  font-family: 'Tajawal', sans-serif;
  outline: none;
  color: var(--t3);
}
.plv2-del {
  width: 22px; height: 22px;
  border-radius: var(--r1); border: none;
  background: none; color: var(--t4);
  cursor: pointer; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: .12s;
}
.plv2-del:hover { color: var(--red); background: var(--redb); }

.pay-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.pay-npk {
  padding: 13px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t1);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  transition: all .1s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.pay-npk:hover,
.pay-npk:active {
  background: var(--emb);
  border-color: var(--embo);
  color: var(--em);
}
.pay-npk.del  { color: var(--red); }
.pay-npk.clear {
  background: var(--redb);
  border-color: var(--redbo);
  color: var(--red);
  font-size: 14px;
  font-family: 'Tajawal', sans-serif;
}
.pay-npk.clear:hover { background: var(--red); color: #fff; }

.pay-client-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
  padding: 2px 10px;
  border-radius: 20px;
  background: var(--bg3);
  border: 1px solid var(--b2);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--t3);
}

/* ════════════════════════════════════════════════════
   CUSTOMER SEARCH MODAL (من pos-additions.css)
════════════════════════════════════════════════════ */
.cust-list-title {
  font-size: 11px;
  font-weight: 800;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .8px;
  margin: 10px 0 6px;
}
.cust-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
}
.cust-empty {
  text-align: center;
  padding: 32px 0;
  color: var(--t4);
  font-size: 13px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.cust-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--r2);
  border: 1px solid var(--b1);
  background: var(--bg3);
  cursor: pointer;
  text-align: right;
  width: 100%;
  transition: all .13s;
  font-family: 'Tajawal', sans-serif;
}
.cust-row:hover { background: var(--bg4); border-color: var(--b2); }
.cust-row.on { background: var(--emb); border-color: var(--embo); }
.cust-row.cust-anon { margin-bottom: 4px; }
.cust-av {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--grad-em);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}
.cust-row.cust-anon .cust-av {
  background: var(--bg4);
  border: 1px solid var(--b3);
  color: var(--t4);
}
.cust-info { flex: 1; min-width: 0; }
.cust-name { font-size: 13px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cust-meta { font-size: 11px; color: var(--t4); display: flex; gap: 8px; margin-top: 2px; }
.cust-check { color: var(--em); font-size: 16px; flex-shrink: 0; }

/* ════════════════════════════════════════════════════
   QUANTITY DISCOUNT BADGE (من pos-additions.css)
════════════════════════════════════════════════════ */
.pc-qty-disc {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 10px;
  background: var(--em);
  color: #fff;
  font-size: 9.5px;
  font-weight: 800;
  line-height: 1.3;
  pointer-events: none;
  z-index: 2;
}

/* ════════════════════════════════════════════════════
   PROFESSIONAL CART – CLIENT SECTION V2 (من pos-missing.css)
════════════════════════════════════════════════════ */
.cart-client-v2 {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--b1);
}
.client-trigger-v2 {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  transition: all .13s;
  min-width: 0;
}
.client-trigger-v2:hover {
  background: var(--bg4);
  border-color: var(--b3);
}
.client-trigger-v2.has-client {
  background: var(--emb);
  border-color: var(--embo);
}
.ctv2-av {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: var(--grad-em);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  flex-shrink: 0;
}
.client-trigger-v2:not(.has-client) .ctv2-av {
  background: var(--bg5);
  color: var(--t4);
  border: 1px solid var(--b3);
}
.ctv2-info { flex: 1; min-width: 0; }
.ctv2-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--t1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.client-trigger-v2.has-client .ctv2-name { color: var(--em); }
.ctv2-meta {
  font-size: 11px;
  color: var(--t4);
  margin-top: 1px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ctv2-debt {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 10px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  color: var(--red);
  font-size: 10.5px;
  font-weight: 800;
}
.ctv2-arrow {
  font-size: 11px;
  color: var(--t4);
  flex-shrink: 0;
  margin-right: auto;
}
.ctv2-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

/* ════════════════════════════════════════════════════
   INVOICE DISCOUNT INPUT (مدمج)
════════════════════════════════════════════════════ */
.ct-disc-inp {
  width: 52px;
  padding: 3px 5px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 12px;
  text-align: center;
  outline: none;
  color: var(--t1);
  transition: border-color .13s;
}
.ct-disc-inp:focus { border-color: var(--em); }

/* ════════════════════════════════════════════════════
   HELD CARTS
════════════════════════════════════════════════════ */
.held-list { display: flex; flex-direction: column; gap: 8px; }
.held-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  transition: border-color .12s;
}
.held-card:hover { border-color: var(--embo); }
.hc-info { flex: 1; min-width: 0; }
.hc-client { font-size: 14px; font-weight: 800; color: var(--t1); }
.hc-meta { font-size: 12px; color: var(--t3); margin-top: 2px; }
.hc-time { font-size: 11px; color: var(--t4); margin-top: 2px; }
.hc-acts { display: flex; align-items: center; gap: 5px; }

/* ════════════════════════════════════════════════════
   RECEIPT
════════════════════════════════════════════════════ */
.receipt-wrap { font-family: 'Tajawal', sans-serif; direction: rtl; }
.receipt-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-bottom: 12px;
  margin-bottom: 10px;
  border-bottom: 2px solid #e2e8f0;
}
.rh-logo { font-size: 17px; font-weight: 900; color: var(--em, #0a8a5c); margin-bottom: 4px; }
.rh-meta { font-size: 10.5px; color: #64748b; line-height: 1.6; }
.rh-doc { text-align: left; }
.rh-docnum { font-size: 14px; font-weight: 900; color: #1e293b; font-family: monospace; }
.rh-date { font-size: 10.5px; color: #64748b; margin-top: 2px; }
.rh-client { font-size: 11px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 4px; }
.receipt-divider {
  text-align: center;
  font-size: 10px;
  font-weight: 800;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 10px 0;
  position: relative;
}
.receipt-divider::before, .receipt-divider::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 35%;
  height: 1px;
  background: #e2e8f0;
}
.receipt-divider::before { right: 0; }
.receipt-divider::after  { left: 0; }
.receipt-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
.receipt-table thead tr { background: #f8fafc; }
.receipt-table th { padding: 5px 6px; text-align: right; font-weight: 800; color: #475569; font-size: 10px; text-transform: uppercase; letter-spacing: .3px; }
.receipt-table td { padding: 5px 6px; border-bottom: 1px solid #f1f5f9; }
.rt-name { font-size: 11.5px; font-weight: 600; }
.rt-variant { font-size: 10px; color: #94a3b8; }
.receipt-totals-wrap { display: flex; justify-content: flex-end; margin-bottom: 12px; }
.receipt-totals-inner { min-width: 220px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
.rt-sum-row { display: flex; justify-content: space-between; padding: 5px 12px; font-size: 11.5px; color: #475569; border-bottom: 1px solid #f1f5f9; }
.rt-grand-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 14px; font-weight: 900; background: #0a8a5c; color: #fff; }
.receipt-footer { text-align: center; padding: 10px 0 0; border-top: 1px dashed #e2e8f0; font-size: 11px; color: #94a3b8; line-height: 1.6; }

/* ════════════════════════════════════════════════════
   SESSION STATS
════════════════════════════════════════════════════ */
.session-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.session-card {
  flex-direction: column;
  align-items: flex-start;
  padding: 16px;
  border-radius: var(--r2);
  gap: 8px;
}

/* ════════════════════════════════════════════════════
   KEYBOARD HELP
════════════════════════════════════════════════════ */
.kb-help-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.kb-group { }
.kb-group-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--t4);
  margin-bottom: 8px;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--b2);
}
.kb-help-grid { display: flex; flex-direction: column; gap: 4px; }
.kb-help-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 5px 8px;
  border-radius: var(--r1);
  background: var(--bg3);
  border: 1px solid var(--b1);
}
.kb-key {
  background: var(--bg4);
  border: 1px solid var(--b3);
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 10.5px;
  font-family: monospace;
  color: var(--t2);
  font-weight: 700;
  flex-shrink: 0;
  min-width: 60px;
  text-align: center;
}
.kb-desc { font-size: 11.5px; color: var(--t2); }

/* ════════════════════════════════════════════════════
   GENERIC FORMS & BUTTONS
════════════════════════════════════════════════════ */
.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fg { display: flex; flex-direction: column; gap: 5px; }
.fg.s2 { grid-column: span 2; }
.fg label { font-size: 11.5px; font-weight: 700; color: var(--t3); }
.fg label.req::after { content: ' *'; color: var(--red); }
.fg input, .fg select, .fg textarea {
  padding: 7px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 13px;
  color: var(--t1);
  outline: none;
  transition: border-color .15s;
}
.fg input:focus, .fg select:focus, .fg textarea:focus { border-color: var(--em); background: var(--bg2); }
.fg input::placeholder { color: var(--t4); }
.inp-row { display: flex; align-items: stretch; }
.inp-row input { flex: 1; border-radius: var(--r2) 0 0 var(--r2); border-left: none; }
.inp-suf {
  padding: 7px 10px;
  border: 1.5px solid var(--b2);
  border-right: none;
  background: var(--bg4);
  font-size: 12px;
  font-weight: 700;
  color: var(--t3);
  border-radius: 0 var(--r2) var(--r2) 0;
  cursor: pointer;
}

.al { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; border-radius: var(--r2); font-size: 12.5px; font-weight: 600; line-height: 1.5; border: 1px solid; }
.al-r { background: var(--redb); border-color: var(--redbo); color: var(--red); }
.al-g { background: var(--emb);  border-color: var(--embo);  color: var(--em);  }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px;
  border-radius: var(--r2);
  border: 1px solid var(--b3);
  background: var(--bg3);
  color: var(--t2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
  white-space: nowrap;
}
.btn:hover { background: var(--bg4); color: var(--t1); }
.btn:disabled { opacity: .4; cursor: not-allowed; }
.btn-p { background: var(--em); border-color: var(--em); color: #fff; box-shadow: var(--emglow); }
.btn-p:hover { background: var(--em2); }
.btn-r { background: var(--redb); border-color: var(--redbo); color: var(--red); }
.btn-r:hover { background: var(--red); color: #fff; border-color: var(--red); }
.btn-sm { padding: 5px 11px; font-size: 11.5px; }
.btn-xs { padding: 4px 9px; font-size: 11px; }

/* Spinner */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .8s linear infinite; display: inline-block; }

/* ════════════════════════════════════════════════════
   MOBILE TABS
════════════════════════════════════════════════════ */
.pos-mob-tabs { display: none; }

/* ════════════════════════════════════════════════════
   RESPONSIVE
════════════════════════════════════════════════════ */
@media (max-width: 1200px) {
  .pos-layout { grid-template-columns: 1fr 350px; }
  .pos-kb-strip { display: none; }
}
@media (max-width: 1000px) {
  .pos-layout { grid-template-columns: 1fr 320px; }
  .pay-v2-body { grid-template-columns: 1fr; }
  .pay-v2-left { border-left: none; border-bottom: 1px solid var(--b2); }
  .kb-help-groups { grid-template-columns: 1fr; }
}
@media (max-width: 820px) {
  body:has(#p-pos.on) #sidebar { display: none !important; }
  body:has(#p-pos.on) #main { margin-right: 0 !important; padding-bottom: 0; }
  #p-pos.on { height: calc(100vh - var(--tb) - 52px); }
  .pos-layout { grid-template-columns: 1fr; position: relative; }
  .pos-layout .pos-left { display: flex; }
  .pos-layout .pos-cart { display: none; }
  .pos-layout.mob-show-cart .pos-left { display: none; }
  .pos-layout.mob-show-cart .pos-cart { display: flex; height: 100%; }
  .pos-topbar { flex-wrap: wrap; gap: 4px; padding: 5px 10px; }
  .pos-stats-row { width: 100%; }
  .pos-actions-row { width: 100%; margin-right: 0; }
  .tb-txt { display: none; }
  .btn-xs { padding: 4px 7px; }
  .pos-order-type { overflow-x: auto; }
  .pot-btn { flex-shrink: 0; font-size: 10.5px; padding: 3px 8px; }
  .pos-mob-tabs {
    display: flex;
    align-items: center;
    padding: 6px 10px;
    background: var(--bg2);
    border-top: 1px solid var(--b2);
    gap: 6px;
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    z-index: 550;
    box-shadow: 0 -4px 20px rgba(0,0,0,.08);
  }
  .pmt {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 20px;
    border: 1.5px solid var(--b2);
    background: var(--bg3);
    font-size: 12px;
    font-weight: 700;
    color: var(--t3);
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
    position: relative;
    transition: .12s;
  }
  .pmt.on { background: var(--emb); border-color: var(--embo); color: var(--em); }
  .pmt-ic { font-size: 15px; }
  .pmt-badge {
    position: absolute; top: -4px; right: -4px;
    width: 16px; height: 16px;
    border-radius: 50%;
    background: var(--em); color: #fff;
    font-size: 8.5px; font-weight: 900;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg2);
  }
  .pmt-sell-btn {
    flex: 1;
    display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 8px;
    border-radius: var(--r2);
    border: none;
    background: var(--em); color: #fff;
    font-size: 12.5px; font-weight: 800;
    cursor: pointer;
    font-family: 'Tajawal', sans-serif;
    box-shadow: var(--emglow);
    transition: .12s;
  }
  .pmt-sell-btn:disabled { opacity: .5; }
  .pos-tool-btn span:last-child { display: none; }
  .pos-quickbar .pqb-label { display: none; }

  /* Responsive modals */
  .modal, .modal-sm, .modal-md, .modal-lg, .modal-pay, .modal-pay-v2, .modal-receipt {
    max-width: calc(100vw - 32px) !important;
    width: calc(100vw - 32px) !important;
    margin: 0 16px;
  }
}
@media (max-width: 768px) {
  #p-pos.on { height: calc(100vh - var(--tb) - var(--mb) - 52px); }
}
@media (max-width: 640px) {
  .pay-v2-body { grid-template-columns: 1fr; }
  .pay-v2-left { border-left: none; border-bottom: 1px solid var(--b2); }
  .pay-v2-hero { padding: 10px; }
  .pay-hero-amount { font-size: 26px; }
  .pay-numpad { gap: 4px; }
  .pay-npk { padding: 10px; font-size: 16px; }
  .pay-line-v2 { grid-template-columns: 18px 1fr 100px; }
  .plv2-ref { display: none; }
  .cart-client-v2 { padding: 5px 8px; gap: 4px; }
  .ctv2-av { width: 28px; height: 28px; font-size: 11px; }
  .ctv2-name { font-size: 12px; }
  .ctv2-debt { display: none; }

  /* Session invoices table: hide party column, shrink paid/remaining */
  .si-modal-tbl .si-col-client { display: none; }
  .si-modal-tbl th:nth-child(6),
  .si-modal-tbl td:nth-child(6),
  .si-modal-tbl th:nth-child(7),
  .si-modal-tbl td:nth-child(7) { font-size: 12px; white-space: nowrap; }

  /* Product grid adjustments */
  .pgrid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 6px; }
}
@media (max-width: 480px) {
  .pos-topbar { padding: 4px 8px; gap: 3px; }
  .pos-chip-label { display: none; }
  .pos-chip { padding: 3px 8px; }
  .pos-chip-val { font-size: 11px; }
  .pos-stats-row { gap: 3px; }
  .pos-order-type { padding: 3px 8px; gap: 3px; }
  .pot-btn { font-size: 10px; padding: 2px 7px; }
  .pos-search-bar { gap: 5px; padding: 6px 8px; }
  .pos-inp { padding: 7px 8px; }
  .pos-inp input { font-size: 13px; }
  .pgrid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 5px; padding: 6px; }
  .pgrid--xs { grid-template-columns: repeat(auto-fill, minmax(75px, 1fr)); }
  .grand-amount { font-size: 17px; }
  .session-grid { grid-template-columns: 1fr; }

  /* Compact modals on very small screens */
  .modal, .modal-sm, .modal-md, .modal-lg, .modal-pay, .modal-pay-v2, .modal-receipt {
    max-width: 100vw !important;
    width: 100vw !important;
    margin: 0;
    border-radius: 22px 22px 0 0;
    max-height: 92vh;
  }
  .m-hd, .m-body { padding: 12px 14px; }
  .m-foot { padding: 10px 14px; }
  .btn-xs { padding: 3px 6px; font-size: 10px; }
}

/* ════════════════════════════════════════════════════
   PRINT
════════════════════════════════════════════════════ */
@media print {
  body > * { display: none !important; }
  #invoice-preview {
    display: block !important;
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: #fff;
    padding: 20px;
    font-family: 'Tajawal', sans-serif;
    color: #000;
    direction: rtl;
  }
  .receipt-wrap { padding: 0; }
}

/* ════════════════════════════════════════════════
   KIOSK MODE
════════════════════════════════════════════════ */
.pos-kiosk {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg0);
  direction: rtl;
  font-family: 'Tajawal', sans-serif;
}
.pos-kiosk-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: var(--bg1);
  border-bottom: 1px solid var(--b1);
  flex-shrink: 0;
}
.pos-kiosk-logo {
  font-size: 18px;
  font-weight: 800;
  color: var(--t1);
}
.pos-kiosk-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}
.pos-kiosk-count {
  font-size: 14px;
  color: var(--t3);
}
.pos-kiosk-total {
  font-size: 22px;
  font-weight: 900;
  color: var(--em);
}
.pos-kiosk-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}
.pos-kiosk-search {
  margin-bottom: 8px;
}
.pos-kiosk-grid {
  margin-top: 8px;
}
.pos-kiosk-cartbar {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg1);
  border-top: 1px solid var(--b1);
  overflow-x: auto;
  flex-shrink: 0;
}
.pos-kiosk-cb-item {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg2);
  padding: 6px 10px;
  border-radius: var(--r1);
  white-space: nowrap;
  font-size: 12px;
}
.pos-kiosk-cb-name {
  font-weight: 700;
  color: var(--t1);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pos-kiosk-cb-qty {
  color: var(--em);
  font-weight: 700;
}
.pos-kiosk-cb-price {
  color: var(--t2);
  font-weight: 600;
}
.pos-kiosk-cb-remove {
  background: none;
  border: none;
  color: var(--t4);
  cursor: pointer;
  padding: 2px;
  line-height: 1;
}
.pos-kiosk-cb-remove:hover {
  color: var(--r);
}
.pos-kiosk-cb-more {
  color: var(--t4);
  font-size: 12px;
  padding: 6px 8px;
}
.pos-kiosk-clear {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
  flex-shrink: 0;
}

/* ════════════════════════════════════════════════════
   ADDITIONAL UTILITIES
════════════════════════════════════════════════════ */
.pos-order-type {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 14px;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
  flex-shrink: 0;
}
.pot-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--b2);
  border-radius: var(--r1);
  background: transparent;
  color: var(--t3);
  font-family: 'Tajawal', sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.pot-btn:hover {
  background: var(--bg3);
  color: var(--t1);
}
.pot-btn.on {
  background: var(--em);
  color: #fff;
  border-color: var(--em);
}

.pos-load-more {
  display: flex;
  justify-content: center;
  padding: 24px 0 32px;
}
.pos-load-more .btn {
  min-width: 160px;
  font-size: 13px;
}

.pos-scroll-sentinel { height: 1px; }

.pos-loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 0 32px;
  color: var(--t2);
  font-size: 13px;
}
.pos-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--b2);
  border-top-color: var(--ac);
  border-radius: 50%;
  animation: pos-spin .6s linear infinite;
}
@keyframes pos-spin { to { transform: rotate(360deg); } }

.btn-thermal {
  background: var(--emb);
  color: var(--t1);
  border: 1px solid var(--b2);
}
.btn-thermal:hover { background: var(--e3); }

.thermal-status {
  font-size: 12px;
  margin-right: 8px;
  padding: 4px 8px;
  border-radius: 4px;
}
.thermal-status.ok { background: #dcfce7; color: #166534; }
.thermal-status.err { background: #fee2e2; color: #991b1b; }
body.dark .thermal-status.ok { background: #064e3b; color: #bbf7d0; }
body.dark .thermal-status.err { background: #7f1d1d; color: #fecaca; }

.pay-currency-sel {
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

```

## FILE: resources/css/theme/pos-cart-v4.css
```
/* ════════════════════════════════════════════════════════════════════════
   pos-cart-v4.css
   أضف هذا بعد pos.css  (يُلغي قواعد .cr القديمة)
   ════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════
   1. CART ROW — البطاقة الجديدة
══════════════════════════════════════════ */
.cr {
  display: grid;
  /* شريط | رقم | معلومات | كمية | إجمالي | حذف */
  grid-template-columns: 3px 18px 1fr auto auto 26px;
  align-items: start;           /* start حتى يمتد الـ accent بالكامل */
  gap: 6px;
  padding: 9px 10px 9px 8px;
  border-bottom: 1px solid var(--b1);
  cursor: pointer;
  transition: background .11s;
  position: relative;
  background: var(--bg2);
}
.cr:hover  { background: var(--bg3); }
.cr.sel    { background: var(--emb); }
.cr.sel .cr-accent { background: var(--em); }
.cr.has-disc .cr-accent { background: var(--red); }
.cr.sel.has-disc .cr-accent { background: var(--em); }

/* الشريط الجانبي الملون */
.cr-accent {
  grid-row: 1;
  align-self: stretch;
  width: 3px;
  border-radius: 2px;
  background: var(--b3);
  transition: background .15s;
  margin: 0;
}

/* رقم الصنف */
.cr-num {
  font-size: 10px;
  font-weight: 800;
  color: var(--t4);
  text-align: center;
  padding-top: 2px;
  line-height: 1;
  align-self: center;
}

/* معلومات */
.cr-info {
  min-width: 0;
  padding-top: 1px;
  position: relative; /* لأجل الـ popup */
}
.cr-name {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--t1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
  margin-bottom: 4px;
}
.cr-variant {
  font-weight: 500;
  color: var(--t4);
  font-size: 11.5px;
}

/* صف السعر + الخصم */
.cr-price-row {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

/* ── زر السعر ── */
.cr-price {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 7px 2px 5px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  transition: .12s;
  font-family: 'Tajawal', sans-serif;
  white-space: nowrap;
}
.cr-price:hover, .cr-price--active {
  background: var(--emb);
  border-color: var(--embo);
  color: var(--em);
}
.cr-price-num {
  font-size: 12px;
  font-weight: 800;
  color: var(--t2);
}
.cr-price:hover .cr-price-num,
.cr-price--active .cr-price-num { color: var(--em); }
.cr-price-unit {
  font-size: 9.5px;
  font-weight: 500;
  color: var(--t4);
}
.cr-price-edit-ic {
  font-size: 9px;
  color: var(--t4);
  opacity: 0;
  transition: opacity .12s;
  margin-right: -2px;
}
.cr-price:hover .cr-price-edit-ic { opacity: 1; }

/* ── زر الخصم (عند وجوده) ── */
.cr-disc {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid var(--redbo);
  background: var(--redb);
  color: var(--red);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  white-space: nowrap;
}
.cr-disc i { font-size: 10px; }
.cr-disc:hover, .cr-disc--active {
  background: var(--red);
  color: #fff;
  border-color: var(--red);
}

/* ── زر "إضافة خصم" (عند غيابه) ── */
.cr-disc-add {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px dashed var(--b3);
  background: transparent;
  color: var(--t4);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  white-space: nowrap;
  opacity: 0;                 /* مخفي حتى hover */
  transition: opacity .15s, background .12s;
}
.cr:hover .cr-disc-add,
.cr.sel  .cr-disc-add       { opacity: 1; }
.cr-disc-add:hover,
.cr-disc-add--active {
  background: var(--emb);
  border-color: var(--embo);
  color: var(--em);
  border-style: solid;
  opacity: 1;
}
.cr-disc-add i { font-size: 10px; }

/* TVA badge */
.cr-tva {
  font-size: 9.5px;
  color: var(--t4);
  background: var(--bg4);
  padding: 1px 5px;
  border-radius: 20px;
  white-space: nowrap;
}

/* ══════════════════════════════════════════
   2. POPUP — الخصم والسعر
══════════════════════════════════════════ */
.cr-popup {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  z-index: 300;
  background: var(--bg2);
  border: 1px solid var(--b3);
  border-radius: var(--r3);
  box-shadow: var(--shadow2);
  padding: 12px;
  min-width: 220px;
  animation: popupIn .15s cubic-bezier(.34,1.4,.64,1);
}
@keyframes popupIn {
  from { opacity: 0; transform: translateY(-6px) scale(.97); }
  to   { opacity: 1; transform: none; }
}
.cr-popup--price { min-width: 190px; }

/* مثلث الإشارة */
.cr-popup-arrow {
  position: absolute;
  top: -5px;
  right: 16px;
  width: 10px;
  height: 10px;
  background: var(--bg2);
  border-top: 1px solid var(--b3);
  border-right: 1px solid var(--b3);
  transform: rotate(-45deg);
}

.cr-popup-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--t4);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: .5px;
}

/* أزرار التبديل */
.cr-popup-modes {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.cr-popup-mode {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 8px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--t3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.cr-popup-mode:hover { background: var(--bg4); color: var(--t1); }
.cr-popup-mode.on {
  background: var(--emb);
  border-color: var(--em);
  color: var(--em);
}

/* حقل الإدخال */
.cr-popup-inp-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.cr-popup-inp {
  flex: 1;
  padding: 8px 10px;
  border-radius: var(--r2);
  border: 2px solid var(--em);
  background: var(--bg2);
  font-size: 18px;
  font-weight: 800;
  font-family: 'IBM Plex Mono', monospace;
  color: var(--t1);
  outline: none;
  text-align: center;
  box-shadow: 0 0 0 3px var(--emb);
  letter-spacing: .5px;
  transition: border-color .12s;
}
.cr-popup-inp:focus { border-color: var(--em); }
.cr-popup-unit {
  font-size: 14px;
  font-weight: 800;
  color: var(--t3);
  flex-shrink: 0;
  min-width: 24px;
  text-align: center;
}

/* معاينة */
.cr-popup-preview {
  font-size: 11.5px;
  color: var(--t3);
  margin-bottom: 8px;
  padding: 5px 9px;
  background: var(--bg3);
  border-radius: var(--r1);
  text-align: center;
}
.cr-popup-preview strong { color: var(--em); }

/* أزرار سريعة للنسب */
.cr-popup-quick {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.cr-popup-qbtn {
  padding: 3px 10px;
  border-radius: 20px;
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-size: 11px;
  font-weight: 700;
  color: var(--t3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
}
.cr-popup-qbtn:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }
.cr-popup-qbtn.on { background: var(--em); border-color: var(--em); color: #fff; }

/* أزرار التأكيد */
.cr-popup-actions {
  display: flex;
  gap: 5px;
  justify-content: flex-end;
  border-top: 1px solid var(--b1);
  padding-top: 9px;
  margin-top: 2px;
}
.cr-popup-clear {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 10px;
  border-radius: var(--r2);
  border: 1px solid var(--redbo);
  background: var(--redb);
  color: var(--red);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  margin-left: auto;       /* يدفع إلى أقصى اليسار */
}
.cr-popup-clear:hover { background: var(--red); color: #fff; }

.cr-popup-cancel {
  padding: 5px 12px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t3);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
}
.cr-popup-cancel:hover { background: var(--bg4); color: var(--t1); }

.cr-popup-ok {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 14px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 11.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  box-shadow: var(--emglow);
}
.cr-popup-ok:hover { background: var(--em2); }

/* ══════════════════════════════════════════
   3. QTY CONTROL — أزرار الكمية المحسّنة
══════════════════════════════════════════ */
.cr-qty-ctrl {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--bg3);
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  padding: 2px 3px;
  flex-shrink: 0;
  align-self: center;
  transition: border-color .12s;
}
.cr-qty-ctrl:focus-within { border-color: var(--em); box-shadow: 0 0 0 2px var(--emb); }

.cq-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--r1);
  background: transparent;
  color: var(--t3);
  font-size: 11px;
  cursor: pointer;
  transition: .1s;
  flex-shrink: 0;
  padding: 0;
}
.cq-btn:hover:not(:disabled) { background: var(--bg4); color: var(--t1); }
.cq-btn:active:not(:disabled) { transform: scale(.85); }
.cq-btn--minus:hover:not(:disabled) { background: var(--redb); color: var(--red); }
.cq-btn--plus:hover:not(:disabled)  { background: var(--emb); color: var(--em); }
.cq-btn:disabled { opacity: .3; cursor: not-allowed; }

.cq-val {
  min-width: 30px;
  text-align: center;
  font-size: 13px;
  font-weight: 900;
  color: var(--t1);
  cursor: pointer;
  padding: 1px 2px;
  border-radius: 3px;
  transition: background .1s;
  font-family: 'IBM Plex Mono', monospace;
}
.cq-val:hover { background: var(--bg4); }

.cq-inp {
  width: 44px;
  text-align: center;
  font-weight: 900;
  font-size: 13px;
  font-family: 'IBM Plex Mono', monospace;
}

.cq-unit {
  font-size: 9.5px;
  color: var(--t4);
  font-weight: 700;
  flex-shrink: 0;
  padding-right: 2px;
}

.cq-stock-warn {
  color: var(--gold);
  font-size: 12px;
  flex-shrink: 0;
  animation: stockPulse 1.5s ease-in-out infinite;
}
@keyframes stockPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}

/* ══════════════════════════════════════════
   4. TOTAL COLUMN — الإجمالي
══════════════════════════════════════════ */
.cr-total {
  text-align: left;
  flex-shrink: 0;
  align-self: center;
  min-width: 72px;
}
.cr-ttc {
  font-size: 13.5px;
  font-weight: 900;
  color: var(--em);
  line-height: 1.2;
}
.cr-dzd {
  font-size: 10px;
  color: var(--em2);
  font-weight: 600;
}
.cr-ht--strike {
  font-size: 10px;
  color: var(--t4);
  text-decoration: line-through;
  margin-top: 1px;
}

/* ══════════════════════════════════════════
   5. DELETE BTN
══════════════════════════════════════════ */
.cr-del {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: var(--r1);
  color: var(--t4);
  font-size: 12px;
  cursor: pointer;
  transition: .12s;
  flex-shrink: 0;
  opacity: 0;
  align-self: flex-start;
  padding-top: 3px;
  padding: 0;
}
.cr:hover .cr-del,
.cr.sel   .cr-del { opacity: 1; }
.cr-del:hover { background: var(--redb); color: var(--red); transform: scale(1.1); }

/* ══════════════════════════════════════════
   6. EDIT INPUT (shared)
══════════════════════════════════════════ */
.cr-edit-inp {
  padding: 4px 6px;
  border-radius: var(--r1);
  border: 2px solid var(--em);
  background: var(--bg2);
  font-size: 13px;
  font-weight: 800;
  font-family: 'IBM Plex Mono', monospace;
  outline: none;
  color: var(--t1);
  text-align: center;
  box-shadow: 0 0 0 2px var(--emb);
}

/* ══════════════════════════════════════════
   7. CART EMPTY STATE — محسّن
══════════════════════════════════════════ */
.cart-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--t4);
  padding: 30px 20px;
  text-align: center;
  user-select: none;
}
.ce-ico {
  font-size: 52px;
  opacity: .1;
  transition: opacity .3s;
}
.cart-empty:hover .ce-ico { opacity: .18; }
.ce-ttl { font-size: 14px; font-weight: 800; color: var(--t3); }
.ce-sub { font-size: 12px; color: var(--t4); line-height: 1.6; }
.ce-hints {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-top: 4px;
}
.ce-hint-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--t4);
  padding: 5px 12px;
  background: var(--bg3);
  border-radius: 20px;
  border: 1px solid var(--b1);
}
.ce-hint-row kbd {
  background: var(--bg4);
  border: 1px solid var(--b3);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 9.5px;
  font-family: monospace;
  color: var(--t3);
}

/* ══════════════════════════════════════════
   8. (محذوف) CART CLIENT SELECTOR — محسّن
   ────────────────────────────────────────────
   كان هنا تطبيق بديل كامل لمُحدِّد الزبون بنمط "dropdown"
   (.ccv2-*, .cart-client-v2.open, .cc-dropdown, .cc-item...).
   تأكدنا أنه غير مُستخدم في أي كومبوننت — التطبيق الفعلي
   (ProfessionalCart.tsx) يفتح CustomerSearchModal ويستخدم
   كلاسات .client-trigger-v2 / .ctv2-* المعرّفة في pos.css.
   أُزيل القسم كاملاً لتفادي:
     - تضارب .cart-client-v2 المُعرَّف مرتين بقيم مختلفة
       (هنا سابقاً وفي pos.css) حسب ترتيب @import في app.css.
     - ازدواجية صيانة CSS لواجهة غير مُستخدمة أصلاً.
   لو رغبت مستقبلاً بنمط dropdown بدل Modal، انقل هذا القسم
   من النسخة الأصلية وفعّله فعلياً داخل ProfessionalCart.tsx
   بدل تركه ميتاً بجانب الكود الحي.
══════════════════════════════════════════ */

/* ══════════════════════════════════════════
   9. CART HEADER — الرأس المحسّن
══════════════════════════════════════════ */
.cart-top {
  flex-shrink: 0;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
}
.cart-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px 7px;
}
.cart-ttl {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 800;
  color: var(--t1);
}
.cart-pill {
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  padding: 0 5px;
  background: var(--em);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform .2s, background .2s;
}
.cart-pill.bump { animation: pillBump .25s ease; }
@keyframes pillBump { 50% { transform: scale(1.35); } }
.cart-pill.empty { background: var(--b3); }

.cart-acts2 { display: flex; gap: 3px; }
.cart-act {
  width: 30px; height: 30px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t3);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: .13s;
}
.cart-act:hover { background: var(--bg4); color: var(--t1); }
.cart-act.active { background: var(--emb); border-color: var(--embo); color: var(--em); }
.cart-act.danger:hover { background: var(--redb); border-color: var(--redbo); color: var(--red); }
.cart-act:disabled { opacity: .35; cursor: not-allowed; }

/* شريط مستويات السعر */
.cart-modes2 {
  display: flex;
  gap: 4px;
  padding: 0 10px 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.cart-modes2::-webkit-scrollbar { display: none; }
.cmode {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 11px;
  border-radius: 20px;
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 11px;
  font-weight: 700;
  color: var(--t3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
  white-space: nowrap;
  flex-shrink: 0;
}
.cmode:hover { background: var(--bg4); color: var(--t1); }
.cmode.on { background: var(--em); border-color: var(--em); color: #fff; }
.cmode-pct {
  font-size: 9px;
  background: rgba(255,255,255,.2);
  padding: 0 4px;
  border-radius: 10px;
}

/* ملاحظة */
.cart-note-wrap {
  padding: 0 10px 8px;
  animation: slideDown .14s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: none; }
}
.cart-note-inp {
  width: 100%;
  padding: 6px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--embo);
  background: var(--emb);
  font-family: 'Tajawal', sans-serif;
  font-size: 12.5px;
  color: var(--t1);
  outline: none;
  transition: border-color .15s;
}
.cart-note-inp:focus { border-color: var(--em); }
.cart-note-inp::placeholder { color: var(--t4); }

/* ══════════════════════════════════════════
   10. CART TOTALS — محسّن
══════════════════════════════════════════ */
.cart-totals {
  padding: 9px 12px 0;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg3);
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.ct-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11.5px;
  color: var(--t3);
}
.ct-row span:last-child {
  font-weight: 700;
  color: var(--t2);
  direction: ltr;
}
.ct-disc { color: var(--red) !important; }
.ct-disc span:last-child { color: var(--red); }

.ct-grand {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 9px 0 10px;
  margin-top: 5px;
  border-top: 2px solid var(--b2);
}
.ct-grand-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--t3);
}
.grand-amount {
  font-size: 22px;
  font-weight: 900;
  color: var(--em);
  direction: ltr;
  letter-spacing: -0.5px;
  line-height: 1;
}
.grand-currency {
  font-size: 13px;
  color: var(--em2);
  opacity: .7;
}

/* ══════════════════════════════════════════
   11. CART ACTIONS — محسّن
══════════════════════════════════════════ */
.cart-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--b2);
  flex-shrink: 0;
  background: var(--bg2);
}
.cart-hold-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 14px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b3);
  background: var(--bg3);
  color: var(--t2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .14s;
  flex-shrink: 0;
  white-space: nowrap;
}
.cart-hold-btn:hover { background: var(--bg4); }
.cart-hold-btn:disabled { opacity: .4; cursor: not-allowed; }

.cart-sell-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 11px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .14s;
  position: relative;
  white-space: nowrap;
}
.cart-sell-btn:hover:not(:disabled) {
  background: var(--em2);
  box-shadow: var(--emglow2);
  transform: translateY(-1px);
}
.cart-sell-btn:active:not(:disabled) { transform: none; }
.cart-sell-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.sell-kbd {
  position: absolute;
  left: 10px;
  font-size: 9px;
  font-family: monospace;
  background: rgba(255,255,255,.2);
  border-radius: 3px;
  padding: 2px 5px;
  opacity: .7;
}

/* ══════════════════════════════════════════
   12. PRODUCT CARD — تحسينات إضافية
══════════════════════════════════════════ */
/* شارة "في السلة" أكبر وأوضح */
.incart-badge {
  position: absolute;
  top: 5px;
  left: 5px;
  min-width: 22px;
  height: 22px;
  border-radius: 11px;
  padding: 0 5px;
  background: var(--em);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(10,138,92,.45);
  border: 2px solid var(--bg2);
  animation: badgePop .2s cubic-bezier(.34,1.4,.64,1);
}
@keyframes badgePop {
  from { transform: scale(0); }
  to   { transform: scale(1); }
}

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media (max-width: 860px) {
  .cr-popup {
    right: auto;
    left: 0;
    min-width: 200px;
  }
  .cr-popup-arrow { right: auto; left: 16px; }
}

```

## FILE: resources/css/theme/pos-search-enhanced.css
```
/* ===========================
   POS Search Bar Enhanced
   =========================== */

.psbe-wrap {
  position: relative;
  width: 100%;
}

.psbe-inp {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--b1);
  border: 1px solid var(--b3);
  border-radius: 8px;
  padding: 6px 10px;
  transition: border-color .15s, box-shadow .15s;
}

.psbe-inp.psbe-focus {
  border-color: var(--p);
  box-shadow: 0 0 0 2px rgba(var(--pr), .15);
}

.psbe-inp input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  font-family: inherit;
  color: var(--t1);
  direction: rtl;
  min-width: 0;
}

.psbe-inp input::placeholder {
  color: var(--t4);
}

.psbe-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  background: var(--b3);
  border-radius: 50%;
  cursor: pointer;
  color: var(--t2);
  font-size: 12px;
  flex-shrink: 0;
  transition: background .15s;
}

.psbe-clear:hover {
  background: var(--b4);
}

/* ———— Dropdown ———— */

.psbe-drop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--b1);
  border: 1px solid var(--b3);
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,.12);
  z-index: 1000;
  max-height: min(420px, 60vh);
  overflow-y: auto;
  direction: rtl;
}

.psbe-drop--simple {
  /* no category grouping — simpler styling */
}

.psbe-grp + .psbe-grp {
  border-top: 1px solid var(--b3);
}

.psbe-grp-hd {
  font-size: 11px;
  font-weight: 700;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .5px;
  padding: 8px 12px 4px;
  position: sticky;
  top: 0;
  background: var(--b1);
  z-index: 1;
}

.psbe-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  transition: background .1s;
  gap: 8px;
}

.psbe-item:hover,
.psbe-hl {
  background: var(--bh);
}

.psbe-item:active {
  background: var(--ba);
}

.psbe-item-name {
  font-size: 13px;
  color: var(--t1);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.psbe-item-price {
  font-size: 12px;
  color: var(--p);
  font-weight: 700;
  white-space: nowrap;
  direction: ltr;
  text-align: right;
}

.psbe-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--t4);
  border-top: 1px solid var(--b3);
  direction: rtl;
}

.psbe-nav-hint {
  font-weight: 700;
  font-size: 11px;
  direction: ltr;
}

/* ———— Loading spinner ———— */

@keyframes psbe-spin {
  to { transform: rotate(360deg); }
}

.psbe-inp .ti-loader.spin {
  animation: psbe-spin .8s linear infinite;
}

/* ———— Responsive ———— */

@media (max-width: 600px) {
  .psbe-drop {
    max-height: min(320px, 50vh);
  }
  .psbe-item {
    padding: 6px 10px;
  }
}

```

## FILE: resources/css/theme/pos-sessions-v2.css
```
/* ════════════════════════════════════════════════════════════════════
   pos-sessions-v2.css
   أنماط نظام جلسات POS الاحترافي
   يُستورَد في app.css بعد pos.css
════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   OPEN SESSION MODAL
══════════════════════════════════════════════════ */
.osm-wrap {
  background: var(--bg2);
  border-radius: var(--r4);
  width: 100%;
  max-width: 480px;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow3);
  overflow: hidden;
  border: 1px solid var(--b3);
  animation: modalIn .22s cubic-bezier(.34,1.2,.64,1);
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(.93) translateY(10px); }
  to   { opacity: 1; transform: none; }
}

/* Hero */
.osm-hero {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 20px;
  background: linear-gradient(135deg, var(--em), var(--em3));
  color: #fff;
  flex-shrink: 0;
}
.osm-hero-icon {
  width: 46px;
  height: 46px;
  border-radius: 13px;
  background: rgba(255,255,255,.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.osm-hero-title {
  font-size: 17px;
  font-weight: 900;
  line-height: 1.2;
}
.osm-hero-time {
  font-size: 11px;
  opacity: .8;
  margin-top: 2px;
}
.osm-steps-mini {
  display: flex;
  gap: 5px;
  margin-right: auto;
}
.osm-step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,.35);
  transition: background .2s, width .2s;
}
.osm-step-dot.on {
  background: #fff;
  width: 20px;
  border-radius: 4px;
}

/* Body */
.osm-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.osm-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .8px;
  margin-bottom: -4px;
}
.osm-section-title i { font-size: 14px; }

/* Field */
.osm-field { display: flex; flex-direction: column; gap: 6px; }
.osm-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--t3);
}
.osm-label i { font-size: 13px; }

.osm-inp {
  width: 100%;
  padding: 8px 12px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-family: 'Tajawal', sans-serif;
  font-size: 13px;
  color: var(--t1);
  outline: none;
  transition: border-color .15s, box-shadow .15s;
}
.osm-inp:focus { border-color: var(--em); box-shadow: 0 0 0 3px var(--emb); }
.osm-inp::placeholder { color: var(--t4); }
.csm-textarea { resize: vertical; min-height: 60px; }

/* Warehouse grid */
.osm-warehouse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 7px;
}
.osm-wh-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 12px 10px;
  border-radius: var(--r3);
  border: 2px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--t2);
  font-family: 'Tajawal', sans-serif;
  transition: .14s;
  position: relative;
}
.osm-wh-card i:first-child { font-size: 22px; color: var(--t4); }
.osm-wh-card:hover { border-color: var(--embo); background: var(--emb); color: var(--em); }
.osm-wh-card.on {
  border-color: var(--em);
  background: var(--emb);
  color: var(--em);
  box-shadow: 0 0 0 2px var(--emb);
}
.osm-wh-card.on i:first-child { color: var(--em); }
.osm-default-tag {
  font-size: 9.5px;
  padding: 1px 6px;
  border-radius: 20px;
  background: var(--bg4);
  color: var(--t4);
}
.osm-wh-check {
  position: absolute;
  top: 6px;
  left: 6px;
  font-size: 12px;
  color: var(--em);
  background: var(--bg2);
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fiscal year list */
.osm-fy-list { display: flex; flex-direction: column; gap: 4px; }
.osm-fy-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.osm-fy-row:hover { border-color: var(--embo); background: var(--emb); }
.osm-fy-row.on { border-color: var(--em); background: var(--emb); }
.osm-fy-radio {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid var(--b3);
  flex-shrink: 0;
  transition: .13s;
  position: relative;
}
.osm-fy-row.on .osm-fy-radio {
  border-color: var(--em);
  background: var(--em);
}
.osm-fy-row.on .osm-fy-radio::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: #fff;
}
.osm-fy-info { flex: 1; min-width: 0; }
.osm-fy-name  { font-size: 13px; font-weight: 700; color: var(--t1); }
.osm-fy-dates { font-size: 10.5px; color: var(--t4); }
.osm-current-tag {
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
  background: var(--emb);
  color: var(--em);
  flex-shrink: 0;
}
.osm-fy-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--r2);
  border: 1.5px solid var(--em);
  background: var(--emb);
}
.osm-fy-badge-name { font-size: 13px; font-weight: 700; color: var(--t1); }
.osm-fy-badge-dates { font-size: 10.5px; color: var(--t4); margin-left: auto; }

/* Summary bar */
.osm-summary-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border-radius: var(--r2);
  background: var(--emb);
  border: 1px solid var(--embo);
  color: var(--em);
  font-size: 12.5px;
}
.osm-summary-sep { opacity: .4; }

/* Cash display */
.osm-cash-display {
  background: var(--bg3);
  border: 2px solid var(--b2);
  border-radius: var(--r3);
  padding: 16px;
  text-align: center;
  transition: border-color .15s;
}
.osm-cash-display:focus-within { border-color: var(--em); }
.osm-cash-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 5px;
}
.osm-cash-big {
  font-size: 36px;
  font-weight: 900;
  color: var(--em);
  letter-spacing: -1px;
  line-height: 1;
}
.osm-cash-placeholder { color: var(--b4); font-weight: 400; }
.osm-cash-dzd { font-size: 18px; color: var(--em2); opacity: .7; margin-right: 4px; }
.osm-cash-words { font-size: 11.5px; color: var(--t4); margin-top: 4px; }

/* Quick amounts */
.osm-quick-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.osm-quick-btn {
  padding: 7px 6px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 12px;
  font-weight: 700;
  color: var(--t2);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
  text-align: center;
}
.osm-quick-btn:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }
.osm-quick-btn.on { background: var(--em); border-color: var(--em); color: #fff; }

/* Numpad */
.osm-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.osm-npk {
  padding: 12px 6px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-size: 18px;
  font-weight: 700;
  color: var(--t1);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  transition: .1s;
  text-align: center;
  user-select: none;
}
.osm-npk:hover { background: var(--bg4); }
.osm-npk:active { transform: scale(.92); background: var(--emb); color: var(--em); }
.osm-npk.del { color: var(--red); background: var(--redb); }
.osm-npk.del:hover { background: var(--red); color: #fff; }

/* Confirm input */
.osm-confirm-inp-wrap { position: relative; }
.osm-confirm-inp-wrap.err .osm-inp { border-color: var(--red); }
.osm-confirm-ok {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--em);
  font-size: 16px;
}

.osm-field-err {
  font-size: 11.5px;
  color: var(--red);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Session preview */
.osm-session-preview {
  background: var(--bg3);
  border: 1px solid var(--b2);
  border-radius: var(--r2);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.osm-preview-row {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: var(--t3);
}
.osm-preview-row i { color: var(--t4); font-size: 13px; flex-shrink: 0; }

.osm-error {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  border-radius: var(--r2);
  color: var(--red);
  font-size: 12.5px;
  font-weight: 600;
}

/* Footer */
.osm-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--b2);
  background: var(--bg3);
  flex-shrink: 0;
}
.osm-btn-back {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg2);
  color: var(--t2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.osm-btn-back:hover { background: var(--bg4); }
.osm-btn-next {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 20px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .13s;
}
.osm-btn-next:hover { background: var(--em2); }
.osm-btn-next:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.osm-btn-open {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .14s;
}
.osm-btn-open:hover { background: var(--em2); transform: translateY(-1px); box-shadow: var(--emglow2); }
.osm-btn-open:disabled { opacity: .45; cursor: not-allowed; transform: none; box-shadow: none; }

/* ══════════════════════════════════════════════════
   CLOSE SESSION MODAL
══════════════════════════════════════════════════ */
.csm-wrap {
  background: var(--bg2);
  border-radius: var(--r4);
  width: 100%;
  max-width: 680px;
  max-height: 96vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow3);
  border: 1px solid var(--b3);
  overflow: hidden;
  animation: modalIn .22s cubic-bezier(.34,1.2,.64,1);
}

/* Header */
.csm-header {
  flex-shrink: 0;
  background: var(--bg2);
  border-bottom: 1px solid var(--b2);
}
.csm-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 10px;
}
.csm-header-icon {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--red);
  flex-shrink: 0;
}
.csm-header-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--t1);
}
.csm-header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--t4);
  margin-top: 2px;
  flex-wrap: wrap;
}
.csm-header-meta i { font-size: 12px; }

/* Steps */
.csm-steps {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 18px;
  position: relative;
  border-bottom: 1px solid var(--b2);
}
.csm-steps-progress {
  position: absolute;
  bottom: 0;
  left: 18px;
  right: 18px;
  height: 2px;
  background: var(--b2);
}
.csm-steps-progress-fill {
  height: 100%;
  background: var(--em);
  transition: width .35s ease;
  border-radius: 2px;
}
.csm-step {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: none;
  border: none;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--t4);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: color .15s;
  white-space: nowrap;
}
.csm-step:hover { color: var(--t2); }
.csm-step.active { color: var(--em); }
.csm-step.done { color: var(--em); opacity: .7; }
.csm-step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  background: var(--b2);
  color: var(--t4);
  transition: .15s;
  flex-shrink: 0;
}
.csm-step.active .csm-step-num { background: var(--em); color: #fff; }
.csm-step.done   .csm-step-num { background: var(--em); color: #fff; }
.csm-step-ic { font-size: 13px; }

/* Body */
.csm-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ── Recap ── */
.csm-recap { padding: 18px; display: flex; flex-direction: column; gap: 16px; }

.csm-total-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--em), var(--em3));
  border-radius: var(--r3);
  color: #fff;
}
.csm-tb-label { font-size: 11px; opacity: .8; font-weight: 700; margin-bottom: 4px; }
.csm-tb-amount { font-size: 30px; font-weight: 900; letter-spacing: -1px; line-height: 1; }
.csm-tb-dzd { font-size: 16px; opacity: .7; }
.csm-tb-right { display: flex; gap: 20px; }
.csm-tb-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.csm-tb-stat span { font-size: 18px; font-weight: 900; }
.csm-tb-stat small { font-size: 10px; opacity: .8; }

.csm-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.csm-kpi {
  padding: 11px 12px;
  border-radius: var(--r2);
  background: var(--kb, var(--emb));
  border: 1px solid color-mix(in srgb, var(--kc, var(--em)) 25%, transparent);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.csm-kpi-ic {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--kc, var(--em));
  background: rgba(255,255,255,.5);
  margin-bottom: 3px;
}
.csm-kpi-label { font-size: 10.5px; color: var(--t4); font-weight: 700; }
.csm-kpi-val   { font-size: 15px; font-weight: 900; color: var(--t1); }

.csm-section { display: flex; flex-direction: column; gap: 10px; }
.csm-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--t3);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--b1);
}
.csm-section-total {
  margin-right: auto;
  font-size: 13px;
  font-weight: 900;
  color: var(--em);
}

/* Pay bars */
.csm-pay-bars { display: flex; flex-direction: column; gap: 10px; }
.csm-pay-row { display: flex; align-items: center; gap: 10px; }
.csm-pay-info { min-width: 100px; flex-shrink: 0; }
.csm-pay-name { font-size: 12.5px; font-weight: 700; color: var(--t1); }
.csm-pay-count { font-size: 10.5px; color: var(--t4); }
.csm-pay-bar-wrap { flex: 1; }
.csm-pay-bar { height: 6px; border-radius: 3px; background: var(--b2); overflow: hidden; }
.csm-pay-bar-fill {
  height: 100%;
  background: var(--grad-em);
  border-radius: 3px;
  transition: width .4s ease;
}
.csm-pay-amount { min-width: 80px; text-align: left; font-size: 13px; font-weight: 700; color: var(--t1); flex-shrink: 0; }
.csm-pay-pct { font-size: 10px; color: var(--t4); margin-right: 5px; }

/* Products */
.csm-products { display: flex; flex-direction: column; gap: 3px; }
.csm-product-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: var(--r1);
  transition: background .12s;
}
.csm-product-row:hover { background: var(--bg3); }
.csm-prod-rank {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  background: var(--b1);
  color: var(--t4);
  flex-shrink: 0;
}
.csm-prod-rank.top { background: var(--emb); color: var(--em); }
.csm-prod-name { flex: 1; font-size: 12.5px; color: var(--t2); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.csm-prod-qty  { font-size: 11px; color: var(--t4); font-weight: 700; flex-shrink: 0; }
.csm-prod-amount { font-size: 13px; font-weight: 800; color: var(--em); flex-shrink: 0; }

/* ── Cash ── */
.csm-cash { padding: 18px; display: flex; flex-direction: column; gap: 14px; }

.csm-expected-box {
  padding: 14px 18px;
  background: var(--emb);
  border: 1px solid var(--embo);
  border-radius: var(--r3);
}
.csm-exp-label { font-size: 11px; font-weight: 700; color: var(--t4); margin-bottom: 4px; text-transform: uppercase; letter-spacing: .5px; }
.csm-exp-amount { font-size: 28px; font-weight: 900; color: var(--em); direction: ltr; line-height: 1; }
.csm-exp-breakdown {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--t4);
}
.csm-exp-breakdown strong { color: var(--em); }

.csm-counted-display {
  text-align: center;
  padding: 14px;
  background: var(--bg3);
  border: 2px solid var(--b2);
  border-radius: var(--r3);
}
.csm-counted-label { font-size: 11px; font-weight: 700; color: var(--t4); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
.csm-counted-amount { font-size: 34px; font-weight: 900; color: var(--t1); letter-spacing: -1px; line-height: 1; }
.csm-counted-placeholder { color: var(--b4); font-weight: 400; }
.csm-counted-dzd { font-size: 17px; color: var(--t4); margin-right: 4px; }

.csm-diff-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
  padding: 7px 14px;
  border-radius: var(--r2);
  border: 1px solid;
  font-size: 12.5px;
  font-weight: 700;
}

.csm-numpad {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
}
.csm-npk {
  padding: 13px 6px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg3);
  font-size: 19px;
  font-weight: 700;
  color: var(--t1);
  cursor: pointer;
  font-family: 'IBM Plex Mono', monospace;
  transition: .1s;
  text-align: center;
  user-select: none;
}
.csm-npk:hover { background: var(--bg4); }
.csm-npk:active { transform: scale(.92); background: var(--emb); color: var(--em); }
.csm-npk.del { color: var(--red); background: var(--redb); }
.csm-npk.del:hover { background: var(--red); color: #fff; }

.csm-quick-amounts { display: flex; gap: 6px; }
.csm-qa-btn {
  flex: 1;
  padding: 8px 10px;
  border-radius: var(--r2);
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 12px;
  font-weight: 700;
  color: var(--t2);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
  text-align: center;
}
.csm-qa-btn:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }
.csm-qa-btn.on { background: var(--em); border-color: var(--em); color: #fff; }

/* ── Confirm ── */
.csm-confirm { padding: 18px; display: flex; flex-direction: column; gap: 14px; }

.csm-confirm-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 18px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  border-radius: var(--r3);
  text-align: center;
}
.csm-confirm-title { font-size: 15px; font-weight: 900; color: var(--t1); }
.csm-confirm-hint  { font-size: 12px; color: var(--t4); }

.csm-review-table { border: 1px solid var(--b2); border-radius: var(--r2); overflow: hidden; }
.csm-review-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 14px;
  border-bottom: 1px solid var(--b1);
}
.csm-review-row:last-child { border-bottom: none; }
.csm-review-row--highlight { background: var(--emb); }
.csm-review-row--success   { background: var(--greenb); }
.csm-review-row--danger    { background: var(--redb); }
.csm-review-label { font-size: 13px; color: var(--t3); }
.csm-review-val   { font-size: 13.5px; font-weight: 700; color: var(--t1); }
.csm-review-row--highlight .csm-review-val { color: var(--em); font-size: 15px; font-weight: 900; }
.csm-review-row--success   .csm-review-val { color: var(--green); font-weight: 900; }
.csm-review-row--danger    .csm-review-val { color: var(--red); font-weight: 900; }
.csm-review-sep { height: 6px; background: var(--bg3); }

.csm-note-preview {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--bg3);
  border-radius: var(--r2);
  font-size: 12.5px;
  color: var(--t3);
  border: 1px solid var(--b1);
}
.csm-error-box {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  background: var(--redb);
  border: 1px solid var(--redbo);
  border-radius: var(--r2);
  color: var(--red);
  font-size: 12.5px;
  font-weight: 600;
}

/* Footer */
.csm-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--b2);
  background: var(--bg3);
  flex-shrink: 0;
}
.csm-btn-cancel {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 13px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg2);
  color: var(--t3);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.csm-btn-cancel:hover { background: var(--bg4); color: var(--t1); }
.csm-btn-back {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: var(--r2);
  border: 1px solid var(--b2);
  background: var(--bg2);
  color: var(--t2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.csm-btn-back:hover { background: var(--bg4); }
.csm-btn-next {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 20px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .13s;
}
.csm-btn-next:hover { background: var(--em2); }
.csm-btn-close-session {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: var(--r2);
  border: none;
  background: var(--red);
  color: #fff;
  font-size: 13.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .14s;
}
.csm-btn-close-session:hover { opacity: .88; transform: translateY(-1px); }
.csm-btn-close-session:disabled { opacity: .45; cursor: not-allowed; transform: none; }

/* ══════════════════════════════════════════════════
   SESSION STATS MODAL
══════════════════════════════════════════════════ */
.ssm-wrap {
  background: var(--bg2);
  border-radius: var(--r4);
  width: 100%;
  max-width: 760px;
  height: 96vh;
  max-height: 780px;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow3);
  border: 1px solid var(--b3);
  overflow: hidden;
  animation: modalIn .22s cubic-bezier(.34,1.2,.64,1);
}

/* Header */
.ssm-header { flex-shrink: 0; background: var(--bg2); border-bottom: 1px solid var(--b2); }

.ssm-session-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 10px;
  border-bottom: 1px solid var(--b1);
}
.ssm-session-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--grad-em);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 900;
  flex-shrink: 0;
}
.ssm-session-info { flex: 1; min-width: 0; }
.ssm-session-name { font-size: 14px; font-weight: 800; color: var(--t1); }
.ssm-session-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--t4);
  margin-top: 2px;
  flex-wrap: wrap;
}
.ssm-session-meta i { font-size: 12px; }
.ssm-session-meta span { font-weight: 600; }

.ssm-status-pill {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 20px;
  background: var(--emb);
  color: var(--em);
  font-size: 11.5px;
  font-weight: 800;
  flex-shrink: 0;
}
.ssm-status-pill--closed {
  background: var(--bg4);
  color: var(--t3);
  border: 1px solid var(--b3);
}
.ssm-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--em);
  box-shadow: 0 0 0 2px rgba(10,138,92,.25);
  animation: statusPulse 2s ease-in-out infinite;
}
.ssm-status-dot--closed {
  background: var(--t4);
  box-shadow: none;
  animation: none;
}
@keyframes statusPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(10,138,92,.35); }
  50%      { box-shadow: 0 0 0 4px rgba(10,138,92,0); }
}

.ssm-tabs {
  display: flex;
  align-items: center;
  padding: 0 18px;
  gap: 0;
}
.ssm-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 9px 14px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--t4);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: color .14s;
  white-space: nowrap;
}
.ssm-tab:hover { color: var(--t2); }
.ssm-tab.on { color: var(--em); border-bottom-color: var(--em); }
.ssm-tab i { font-size: 13px; }

/* Body */
.ssm-body { flex: 1; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 16px; min-height: 420px; }

/* KPI Grid */
.ssm-kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.ssm-kpi {
  padding: 14px;
  border-radius: var(--r3);
  background: var(--kb, var(--emb));
  border: 1px solid color-mix(in srgb, var(--kc, var(--em)) 25%, transparent);
  transition: transform .13s, box-shadow .13s;
}
.ssm-kpi:hover { transform: translateY(-2px); box-shadow: var(--shadow2); }
.ssm-kpi--lg { grid-column: span 1; }

.ssm-kpi-header {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}
.ssm-kpi-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--kc, var(--em));
  background: rgba(255,255,255,.5);
  flex-shrink: 0;
}
.ssm-kpi-title { font-size: 11px; font-weight: 700; color: var(--t4); }
.ssm-kpi-value { font-size: 18px; font-weight: 900; color: var(--t1); line-height: 1; margin-bottom: 4px; }
.ssm-kpi--lg .ssm-kpi-value { font-size: 22px; }
.ssm-kpi-sub { font-size: 10.5px; color: var(--t4); }

/* Progress */
.ssm-progress-section { background: var(--bg3); padding: 12px 14px; border-radius: var(--r2); }
.ssm-ps-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
.ssm-ps-label { font-size: 11.5px; font-weight: 700; color: var(--t3); }
.ssm-ps-pct   { font-size: 13px; font-weight: 900; color: var(--em); }
.ssm-progress-bar { height: 8px; border-radius: 4px; background: var(--b2); overflow: hidden; }
.ssm-pb-fill { height: 100%; background: var(--grad-em); border-radius: 4px; transition: width .5s ease; }

/* Quick pay */
.ssm-quick-pay { background: var(--bg3); border-radius: var(--r2); padding: 14px; }
.ssm-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 800;
  color: var(--t3);
  margin-bottom: 10px;
}
.ssm-section-title i { font-size: 14px; }
.ssm-quick-pay-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 7px;
}
.ssm-qp-item {
  padding: 9px 11px;
  background: var(--bg2);
  border-radius: var(--r2);
  border: 1px solid var(--b1);
}
.ssm-qp-name   { font-size: 11px; font-weight: 700; color: var(--t3); margin-bottom: 3px; }
.ssm-qp-amount { font-size: 15px; font-weight: 900; color: var(--em); }
.ssm-qp-count  { font-size: 10px; color: var(--t4); margin-top: 2px; }

.ssm-note-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 9px 12px;
  background: var(--bg3);
  border-radius: var(--r2);
  font-size: 12.5px;
  color: var(--t3);
  border: 1px solid var(--b1);
}

/* Payments tab */
.ssm-payments { display: flex; flex-direction: column; gap: 14px; }
.ssm-pay-total-banner {
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--em), var(--em3));
  border-radius: var(--r3);
  color: #fff;
}
.ssm-ptb-label  { font-size: 11px; opacity: .8; margin-bottom: 4px; font-weight: 700; }
.ssm-ptb-amount { font-size: 30px; font-weight: 900; letter-spacing: -1px; }
.ssm-ptb-credit { font-size: 12px; opacity: .8; margin-top: 4px; }

.ssm-pay-list { display: flex; flex-direction: column; gap: 8px; }
.ssm-pay-card {
  background: var(--bg3);
  border: 1px solid var(--b2);
  border-radius: var(--r2);
  overflow: hidden;
}
.ssm-pay-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 10px;
}
.ssm-pay-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  flex-shrink: 0;
}
.ssm-pay-card-info { flex: 1; min-width: 0; }
.ssm-pay-card-name { font-size: 13.5px; font-weight: 800; color: var(--t1); }
.ssm-pay-card-meta { font-size: 11px; color: var(--t4); margin-top: 1px; }
.ssm-pay-card-amount { font-size: 17px; font-weight: 900; flex-shrink: 0; }
.ssm-pay-card-bar { height: 4px; background: var(--b1); }
.ssm-pay-card-bar-fill { height: 100%; transition: width .4s ease; }

/* Products tab */
.ssm-products { display: flex; flex-direction: column; gap: 2px; }
.ssm-prod-header-row {
  display: grid;
  grid-template-columns: 30px 1fr 60px 90px 60px;
  gap: 8px;
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 800;
  color: var(--t4);
  text-transform: uppercase;
  letter-spacing: .5px;
  border-bottom: 1px solid var(--b2);
  margin-bottom: 4px;
}
.ssm-prod-row {
  display: grid;
  grid-template-columns: 30px 1fr 60px 90px 60px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: var(--r1);
  transition: background .12s;
}
.ssm-prod-row:hover { background: var(--bg3); }
.ssm-prod-rank {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 800;
  background: var(--b1);
  color: var(--t4);
  flex-shrink: 0;
}
.ssm-prod-rank.top { background: var(--emb); color: var(--em); }
.ssm-prod-info { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ssm-prod-name { font-size: 12.5px; font-weight: 600; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ssm-prod-bar  { height: 3px; border-radius: 2px; background: var(--b2); overflow: hidden; }
.ssm-prod-bar-fill { height: 100%; background: var(--grad-em); transition: width .4s ease; }
.ssm-prod-qty  { text-align: center; font-size: 12px; font-weight: 700; color: var(--t3); }
.ssm-prod-ttc  { text-align: left; font-size: 13px; font-weight: 800; color: var(--em); }
.ssm-prod-pct  { text-align: left; font-size: 11.5px; color: var(--t4); font-weight: 600; }

/* Empty state */
.ssm-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px 20px;
  color: var(--t4);
  text-align: center;
}
.ssm-empty i { font-size: 44px; opacity: .15; }
.ssm-empty span { font-size: 13px; font-weight: 600; }

/* Footer */
.ssm-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--b2);
  background: var(--bg3);
  flex-shrink: 0;
}
.ssm-btn-end {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: var(--r2);
  border: 1.5px solid var(--redbo);
  background: var(--redb);
  color: var(--red);
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .13s;
}
.ssm-btn-end:hover { background: var(--red); color: #fff; border-color: var(--red); }
.ssm-btn-close {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 18px;
  border-radius: var(--r2);
  border: none;
  background: var(--em);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  box-shadow: var(--emglow);
  transition: .13s;
}
.ssm-btn-close:hover { background: var(--em2); }

/* ── Spinner ── */
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Responsive ── */
@media (max-width: 640px) {
  .osm-wrap, .csm-wrap, .ssm-wrap { max-width: 100%; border-radius: 22px 22px 0 0; }
  .csm-kpi-grid, .ssm-kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .ssm-prod-header-row, .ssm-prod-row { grid-template-columns: 26px 1fr 50px 80px; }
  .ssm-prod-pct { display: none; }
  .osm-warehouse-grid { grid-template-columns: 1fr 1fr; }
  .csm-steps { overflow-x: auto; }
  .csm-step span { display: none; }
}


/* ═══════════════════════════════════════════════════════════════════
   pos-sessions-page.css — صفحة جلسات POS v3
   يُضاف إلى pos-sessions-v2.css أو يُستورَد مستقلاً
═══════════════════════════════════════════════════════════════════ */

/* ══ Page root ══ */
.pss-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 22px;
  min-height: 100%;
}

/* ══════════════════════════════════════════
   TOPBAR
══════════════════════════════════════════ */
.pss-topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.pss-topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}
.pss-topbar-icon {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--grad-em);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #fff;
  flex-shrink: 0;
  box-shadow: var(--emglow);
}
.pss-topbar-title {
  font-size: 20px;
  font-weight: 900;
  color: var(--t1);
  line-height: 1.2;
}
.pss-topbar-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 3px;
}
.pss-topbar-count {
  font-size: 12px;
  font-weight: 700;
  color: var(--t4);
  background: var(--bg3);
  border: 1px solid var(--b2);
  padding: 1px 8px;
  border-radius: 20px;
}
.pss-topbar-live {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 800;
  color: var(--em);
  background: var(--emb);
  border: 1px solid var(--embo);
  padding: 2px 9px;
  border-radius: 20px;
}
.pss-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ══ Buttons ══ */
.pss-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: var(--r2);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  border: none;
  transition: all .14s;
  white-space: nowrap;
}
.pss-btn--primary {
  background: var(--em);
  color: #fff;
  box-shadow: var(--emglow);
}
.pss-btn--primary:hover { background: var(--em2); transform: translateY(-1px); box-shadow: var(--emglow2); }
.pss-btn--primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.pss-btn--danger {
  background: var(--redb);
  color: var(--red);
  border: 1.5px solid var(--redbo);
}
.pss-btn--danger:hover { background: var(--red); color: #fff; }
.pss-btn--ghost {
  background: var(--bg3);
  color: var(--t3);
  border: 1px solid var(--b2);
}
.pss-btn--ghost:hover { background: var(--bg4); color: var(--t1); }

/* ══ View toggle ══ */
.pss-view-toggle {
  display: flex;
  border: 1px solid var(--b2);
  border-radius: var(--r2);
  overflow: hidden;
  background: var(--bg3);
}
.pss-vt-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--t4);
  cursor: pointer;
  background: none;
  border: none;
  transition: .13s;
}
.pss-vt-btn:hover { color: var(--t2); background: var(--bg4); }
.pss-vt-btn.on { background: var(--bg2); color: var(--em); box-shadow: var(--shadow); }

/* ══ Live dot ══ */
.pss-live-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--em);
  display: inline-block;
  flex-shrink: 0;
  animation: livePulse 1.8s ease-in-out infinite;
}
.pss-live-dot--sm { width: 5px; height: 5px; }
@keyframes livePulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(10,138,92,.4); }
  50%      { box-shadow: 0 0 0 5px rgba(10,138,92,0); }
}

/* ══════════════════════════════════════════
   LIVE SESSION BANNER
══════════════════════════════════════════ */
.pss-live-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  background: linear-gradient(135deg, var(--emb), rgba(10,138,92,.03));
  border: 1.5px solid var(--embo);
  border-radius: var(--r3);
  position: relative;
  overflow: hidden;
  flex-wrap: wrap;
}
.pss-live-banner::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 100%;
  background: var(--grad-em);
}
.pss-live-left {
  display: flex;
  align-items: center;
  gap: 13px;
  flex: 1;
  min-width: 200px;
}
.pss-live-pulse {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: var(--emb);
  border: 2px solid var(--embo);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--em);
  flex-shrink: 0;
  animation: bannerPulse 2.5s ease-in-out infinite;
}
@keyframes bannerPulse {
  0%,100% { box-shadow: 0 0 0 0 var(--embo); }
  50%      { box-shadow: 0 0 0 6px transparent; }
}
.pss-live-title {
  font-size: 15px;
  font-weight: 900;
  color: var(--em);
  margin-bottom: 3px;
}
.pss-live-sub {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--t3);
}
.pss-live-sub i { font-size: 12px; color: var(--t4); }
.pss-live-sub span { color: var(--b4); }

.pss-live-stats {
  display: flex;
  gap: 24px;
  flex-shrink: 0;
}
.pss-live-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.pss-live-stat-val {
  font-size: 18px;
  font-weight: 900;
  color: var(--t1);
  line-height: 1;
}
.pss-live-stat-lbl {
  font-size: 10.5px;
  color: var(--t4);
  font-weight: 700;
}

.pss-live-actions {
  display: flex;
  gap: 7px;
  flex-shrink: 0;
}
.pss-live-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: var(--r2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  border: none;
  transition: .13s;
}
.pss-live-btn--stats {
  background: var(--bg2);
  color: var(--t2);
  border: 1px solid var(--b2);
}
.pss-live-btn--stats:hover { background: var(--bg4); color: var(--em); }
.pss-live-btn--close {
  background: var(--redb);
  color: var(--red);
  border: 1px solid var(--redbo);
}
.pss-live-btn--close:hover { background: var(--red); color: #fff; }

/* ══════════════════════════════════════════
   KPI ROW
══════════════════════════════════════════ */
.pss-kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.pss-kpi {
  background: var(--kb, var(--emb));
  border: 1px solid color-mix(in srgb, var(--kc, var(--em)) 22%, transparent);
  border-radius: var(--r3);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: transform .13s, box-shadow .13s;
  cursor: default;
}
.pss-kpi:hover { transform: translateY(-2px); box-shadow: var(--shadow2); }
.pss-kpi-header { margin-bottom: 4px; }
.pss-kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--kc, var(--em));
  background: rgba(255,255,255,.55);
}
.pss-kpi-icon--pulse { animation: iconPulse 2s ease-in-out infinite; }
@keyframes iconPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(10,138,92,.3); }
  50%      { box-shadow: 0 0 0 5px rgba(10,138,92,0); }
}
.pss-kpi-value {
  font-size: 19px;
  font-weight: 900;
  color: var(--t1);
  line-height: 1;
  direction: ltr;
}
.pss-kpi-label { font-size: 11px; font-weight: 700; color: var(--t4); }
.pss-kpi-sub   { font-size: 10.5px; color: var(--t4); margin-top: 2px; }

/* ══════════════════════════════════════════
   FILTERS BAR
══════════════════════════════════════════ */
.pss-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
  padding: 10px 14px;
}

/* Search */
.pss-search {
  display: flex;
  align-items: center;
  gap: 7px;
  background: var(--bg3);
  border: 1.5px solid var(--b2);
  border-radius: var(--r2);
  padding: 6px 11px;
  transition: .15s;
  min-width: 220px;
}
.pss-search:focus-within {
  border-color: var(--em);
  background: var(--bg2);
  box-shadow: 0 0 0 3px var(--emb);
}
.pss-search-ic { color: var(--t4); font-size: 14px; flex-shrink: 0; }
.pss-search-inp {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-family: 'Tajawal', sans-serif;
  font-size: 12.5px;
  color: var(--t1);
}
.pss-search-inp::placeholder { color: var(--t4); }
.pss-search-clear {
  background: none;
  border: none;
  color: var(--t4);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  transition: color .13s;
}
.pss-search-clear:hover { color: var(--red); }

/* Filter pills */
.pss-filter-pills {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.pss-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1.5px solid var(--b2);
  background: var(--bg3);
  font-size: 12px;
  font-weight: 700;
  color: var(--t3);
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
}
.pss-pill i { font-size: 12px; }
.pss-pill:hover { border-color: var(--embo); color: var(--em); background: var(--emb); }
.pss-pill.on {
  background: var(--em);
  border-color: var(--em);
  color: #fff;
}

/* Date range */
.pss-date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pss-date-inp-wrap {
  display: flex;
  align-items: center;
  gap: 5px;
  background: var(--bg3);
  border: 1.5px solid var(--b2);
  border-radius: var(--r2);
  padding: 5px 10px;
  transition: .15s;
}
.pss-date-inp-wrap:focus-within { border-color: var(--em); box-shadow: 0 0 0 2px var(--emb); }
.pss-date-ic { color: var(--t4); font-size: 12px; flex-shrink: 0; }
.pss-date-inp {
  background: none;
  border: none;
  outline: none;
  font-family: 'Tajawal', sans-serif;
  font-size: 12px;
  color: var(--t1);
  width: 110px;
}
.pss-date-sep { color: var(--t4); font-size: 12px; font-weight: 700; }

.pss-reset-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 20px;
  border: 1.5px solid var(--redbo);
  background: var(--redb);
  color: var(--red);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Tajawal', sans-serif;
  transition: .12s;
}
.pss-reset-btn:hover { background: var(--red); color: #fff; }

.pss-filter-spacer { flex: 1; }

.pss-sync-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--t4);
  font-weight: 600;
}

/* ══════════════════════════════════════════
   TABLE
══════════════════════════════════════════ */
.pss-table-wrap {
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
  overflow: hidden;
  transition: opacity .2s;
}
.pss-table {
  width: 100%;
  border-collapse: collapse;
}
.pss-table thead tr {
  background: var(--bg3);
  border-bottom: 2px solid var(--b2);
}
.pss-table th {
  padding: 10px 14px;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--t4);
  text-align: right;
  text-transform: uppercase;
  letter-spacing: .8px;
  white-space: nowrap;
}
.pss-th-num     { text-align: center; }
.pss-th-actions { width: 80px; }

.pss-table tbody tr {
  border-bottom: 1px solid var(--b1);
  transition: background .12s;
  cursor: pointer;
}
.pss-table tbody tr:last-child { border-bottom: none; }
.pss-table tbody tr:hover { background: var(--bg3); }
.pss-tr--live {
  background: linear-gradient(90deg, var(--emb), transparent 60%);
}
.pss-tr--live:hover { background: linear-gradient(90deg, rgba(10,138,92,.12), var(--bg3)); }
.pss-tr--selected { background: var(--emb) !important; }

.pss-table td {
  padding: 11px 14px;
  font-size: 13px;
  color: var(--t2);
  vertical-align: middle;
}

/* Status badge */
.pss-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 800;
  white-space: nowrap;
}
.pss-badge i { font-size: 11px; }
.pss-badge--open      { background: var(--emb);   color: var(--em);   border: 1px solid var(--embo);   }
.pss-badge--closed    { background: var(--bg4);   color: var(--t3);   border: 1px solid var(--b3);     }
.pss-badge--suspended { background: var(--goldb); color: var(--gold); border: 1px solid var(--goldbo); }

/* User cell */
.pss-user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}
.pss-user-av {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--grad-em);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  flex-shrink: 0;
}
.pss-user-name { font-size: 13px; font-weight: 700; color: var(--t1); }

/* Warehouse cell */
.pss-wh-cell {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--t3);
}
.pss-wh-cell i { color: var(--t4); font-size: 13px; }

/* Date cell */
.pss-date-cell {
  font-size: 12.5px;
  color: var(--t2);
  font-weight: 600;
}
.pss-time {
  display: block;
  font-size: 11px;
  color: var(--t4);
  margin-top: 2px;
  font-family: 'IBM Plex Mono', monospace;
}
.pss-live-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 700;
  color: var(--em);
}

/* Num cells */
.pss-num-cell { text-align: center; }
.pss-num {
  font-size: 14px;
  font-weight: 800;
  color: var(--t1);
}
.pss-duration {
  font-size: 12px;
  font-weight: 700;
  color: var(--t3);
  font-family: 'IBM Plex Mono', monospace;
}

/* Sales cell */
.pss-sales-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.pss-sales-val {
  font-size: 13.5px;
  font-weight: 900;
  color: var(--em);
}
.pss-spark {
  width: 60px;
  height: 4px;
  background: var(--b2);
  border-radius: 2px;
  overflow: hidden;
}
.pss-spark-bar {
  height: 100%;
  border-radius: 2px;
  transition: width .4s ease;
}

/* Row actions */
.pss-row-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}
.pss-action-btn {
  width: 30px;
  height: 30px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t3);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: .12s;
}
.pss-action-btn:hover { background: var(--emb); color: var(--em); border-color: var(--embo); }
.pss-action-btn--danger:hover { background: var(--redb); color: var(--red); border-color: var(--redbo); }

/* ══════════════════════════════════════════
   CARDS VIEW
══════════════════════════════════════════ */
.pss-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  transition: opacity .2s;
}
.pss-card {
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
  padding: 16px;
  cursor: pointer;
  transition: all .15s;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.pss-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow2);
  border-color: var(--b3);
}
.pss-card--live {
  border-color: var(--embo);
  background: linear-gradient(160deg, var(--emb), var(--bg2) 60%);
}
.pss-card-live-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--grad-em);
  animation: liveBar 2s ease-in-out infinite;
}
@keyframes liveBar {
  0%,100% { opacity: 1; }
  50%      { opacity: .5; }
}

/* Card header */
.pss-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pss-card-av {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--grad-em);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
  flex-shrink: 0;
}
.pss-card-info { flex: 1; min-width: 0; }
.pss-card-name { font-size: 14px; font-weight: 800; color: var(--t1); }
.pss-card-wh {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11.5px;
  color: var(--t4);
  margin-top: 2px;
}
.pss-card-wh i { font-size: 11px; }

/* Sales highlight */
.pss-card-sales {
  text-align: center;
  padding: 14px 0 10px;
  border-top: 1px solid var(--b1);
  border-bottom: 1px solid var(--b1);
}
.pss-card-sales-val {
  font-size: 26px;
  font-weight: 900;
  color: var(--em);
  letter-spacing: -.5px;
  line-height: 1;
}
.pss-card-sales-lbl {
  font-size: 11px;
  font-weight: 700;
  color: var(--t4);
  margin-top: 4px;
}

/* Stats row */
.pss-card-stats {
  display: flex;
  align-items: stretch;
}
.pss-card-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.pss-card-stat-val { font-size: 15px; font-weight: 800; color: var(--t1); }
.pss-card-stat-lbl { font-size: 10.5px; color: var(--t4); font-weight: 600; }
.pss-card-stat-sep {
  width: 1px;
  background: var(--b2);
  margin: 4px 0;
  flex-shrink: 0;
}

/* Card footer */
.pss-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}
.pss-card-date {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--t4);
  font-weight: 600;
}
.pss-card-date i { font-size: 12px; }
.pss-card-actions { display: flex; gap: 4px; }

/* ══════════════════════════════════════════
   SKELETON LOADER
══════════════════════════════════════════ */
.pss-loading {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.pss-skeleton {
  height: 56px;
  background: linear-gradient(
    90deg,
    var(--bg3) 25%,
    var(--bg4) 50%,
    var(--bg3) 75%
  );
  background-size: 200% 100%;
  border-radius: var(--r2);
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ══════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════ */
.pss-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 70px 20px;
  text-align: center;
}
.pss-empty-icon {
  width: 70px;
  height: 70px;
  border-radius: 20px;
  background: var(--bg3);
  border: 1px solid var(--b2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--t4);
  opacity: .6;
}
.pss-empty-title { font-size: 16px; font-weight: 900; color: var(--t2); }
.pss-empty-sub   { font-size: 13px; color: var(--t4); max-width: 340px; }
.pss-empty-actions { display: flex; gap: 8px; margin-top: 6px; }

/* ══════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════ */
.pss-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
}
.pss-pagination-info {
  font-size: 12px;
  font-weight: 700;
  color: var(--t4);
}
.pss-pagination-btns {
  display: flex;
  gap: 4px;
  align-items: center;
}
.pss-page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: var(--r1);
  border: 1px solid var(--b2);
  background: var(--bg3);
  color: var(--t2);
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: .12s;
  font-family: 'Tajawal', sans-serif;
}
.pss-page-btn:hover:not(:disabled) { background: var(--emb); color: var(--em); border-color: var(--embo); }
.pss-page-btn.on { background: var(--em); color: #fff; border-color: var(--em); }
.pss-page-btn:disabled { opacity: .35; cursor: not-allowed; }

/* ══════════════════════════════════════════
   SPINNER (shared)
══════════════════════════════════════════ */
.spin { animation: spin360 1s linear infinite; }
@keyframes spin360 { to { transform: rotate(360deg); } }

/* ══════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════ */
@media (max-width: 1200px) {
  .pss-kpi-row { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .pss-kpi-row { grid-template-columns: repeat(2, 1fr); }
  .pss-live-stats { display: none; }
  .pss-table td:nth-child(5),
  .pss-table th:nth-child(5),
  .pss-table td:nth-child(8),
  .pss-table th:nth-child(8) { display: none; }
}
@media (max-width: 640px) {
  .pss-page       { padding: 14px; gap: 12px; }
  .pss-topbar-title { font-size: 16px; }
  .pss-kpi-row    { grid-template-columns: 1fr 1fr; }
  .pss-filters    { gap: 8px; }
  .pss-search     { min-width: 100%; order: -1; }
  .pss-cards-grid { grid-template-columns: 1fr; }
  .pss-live-banner { flex-wrap: wrap; }
  .pss-live-actions { width: 100%; }
  .pss-live-btn   { flex: 1; justify-content: center; }
  .pss-table td:nth-child(3),
  .pss-table th:nth-child(3),
  .pss-table td:nth-child(4),
  .pss-table th:nth-child(4),
  .pss-table td:nth-child(6),
  .pss-table th:nth-child(6) { display: none; }
}
```

## FILE: resources/css/theme/print-settings.css
```
/* ═══════════════════════════════════════════
   print-settings.css — إعدادات الطباعة
   ═══════════════════════════════════════════ */

/* ═══ PAGE ═══ */
.ps-page { padding: 22px; display: flex; flex-direction: column; gap: 16px; min-height: 100%; }

/* ═══ HEADER ═══ */
.ps-header { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.ps-header-left { display: flex; align-items: center; gap: 12px; flex: 1; }
.ps-header-icon {
  width: 48px; height: 48px; border-radius: 14px;
  background: var(--grad-em); display: flex; align-items: center;
  justify-content: center; font-size: 24px; color: #fff;
  box-shadow: var(--emglow); flex-shrink: 0;
}
.ps-header-title { font-size: 20px; font-weight: 900; color: var(--t1); margin: 0; }
.ps-header-sub   { font-size: 12px; color: var(--t4); margin: 2px 0 0; }
.ps-header-actions { display: flex; gap: 8px; flex-shrink: 0; }

/* ═══ TABS ═══ */
.ps-tabs {
  display: flex; gap: 0; border-bottom: 2px solid var(--b2);
  overflow-x: auto; scrollbar-width: none;
}
.ps-tabs::-webkit-scrollbar { display: none; }
.ps-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px; cursor: pointer; background: none; border: none;
  font-size: 13px; font-weight: 700; color: var(--t4);
  border-bottom: 2px solid transparent; margin-bottom: -2px;
  font-family: 'Tajawal', sans-serif; transition: .14s; white-space: nowrap;
}
.ps-tab i { font-size: 15px; }
.ps-tab:hover { color: var(--t2); }
.ps-tab.on { color: var(--em); border-bottom-color: var(--em); }

/* ═══ BUTTONS ═══ */
.ps-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: var(--r2); border: none;
  font-size: 13px; font-weight: 800; cursor: pointer;
  font-family: 'Tajawal', sans-serif; transition: all .14s; white-space: nowrap;
}
.ps-btn--primary { background: var(--em); color: #fff; box-shadow: var(--emglow); }
.ps-btn--primary:hover { background: var(--em2); transform: translateY(-1px); }
.ps-btn--primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }
.ps-btn--saved { background: var(--green) !important; }
.ps-btn--ghost { background: var(--bg3); color: var(--t3); border: 1px solid var(--b2); }
.ps-btn--ghost:hover { background: var(--bg4); color: var(--t1); }
.ps-btn--sm { padding: 6px 12px; font-size: 12px; }
.ps-btn--loading { opacity: .75; cursor: not-allowed; }

.ps-btn-xs {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: var(--r1); border: 1px solid var(--b2);
  background: var(--bg3); color: var(--t3); font-size: 11.5px; font-weight: 700;
  cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .12s;
}
.ps-btn-xs:hover { background: var(--emb); color: var(--em); border-color: var(--embo); }
.ps-btn-xs--ghost:hover { background: var(--redb); color: var(--red); border-color: var(--redbo); }

/* ═══ CONTENT ═══ */
.ps-content { display: flex; flex-direction: column; gap: 16px; }
.ps-section-title { font-size: 14px; font-weight: 800; color: var(--t1); }
.ps-section-sub   { font-size: 12px; color: var(--t4); margin-top: 3px; }

/* ═══ PRINTERS ═══ */
.ps-printers-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r3); gap: 12px; flex-wrap: wrap;
}
.ps-no-printers {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 48px; text-align: center; color: var(--t4);
  background: var(--bg2); border: 1.5px dashed var(--b3); border-radius: var(--r3);
}
.ps-no-printers i  { font-size: 40px; opacity: .4; }
.ps-no-printers p  { font-size: 14px; font-weight: 700; color: var(--t3); margin: 0; }
.ps-no-printers span { font-size: 12px; }

.ps-printers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px; }
.ps-printer-card {
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r3);
  padding: 14px 16px; display: flex; align-items: center; gap: 12px; transition: .14s;
}
.ps-printer-card:hover { border-color: var(--b3); box-shadow: var(--shadow); }
.ps-printer-card--default { border-color: var(--embo); background: var(--emb); }
.ps-printer-icon {
  width: 42px; height: 42px; border-radius: 11px;
  background: var(--bg3); border: 1px solid var(--b2);
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; color: var(--t3); flex-shrink: 0; position: relative;
}
.ps-printer-dot {
  position: absolute; top: -3px; right: -3px;
  width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg2);
}
.ps-printer-dot--ready { background: var(--green); }
.ps-printer-dot--off   { background: var(--red); }
.ps-printer-dot--unk   { background: var(--gold); }
.ps-printer-info { flex: 1; min-width: 0; }
.ps-printer-name { font-size: 13px; font-weight: 700; color: var(--t1); margin-bottom: 3px; }
.ps-printer-name-input { font-size: 13px; font-weight: 700; padding: 2px 6px; margin-bottom: 3px; }
.ps-printer-meta { display: flex; align-items: center; gap: 7px; }
.ps-printer-status { font-size: 11px; font-weight: 700; }
.ps-printer-status--ready   { color: var(--green); }
.ps-printer-status--offline { color: var(--red); }
.ps-printer-status--unknown { color: var(--gold); }
.ps-printer-default-tag {
  font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 20px;
  background: var(--em); color: #fff;
}
.ps-printer-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }

.ps-printer-source-tag {
  font-size: 10px; font-weight: 800; padding: 1px 7px; border-radius: 20px;
}
.ps-printer-source-tag--usb {
  background: var(--blueb, #eff6ff); color: var(--blue, #2563eb);
  border: 1px solid var(--bluebo, #bfdbfe);
}
.ps-printer-source-tag--demo {
  background: var(--goldb, #fef3c7); color: var(--gold, #d97706);
  border: 1px solid var(--goldbo, #fde68a);
}

.ps-usb-section {
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r3);
  padding: 16px 20px;
}
.ps-usb-info {
  font-size: 12px; color: var(--t4); margin: 0 0 10px; display: flex; align-items: center; gap: 6px;
}

.ps-add-printer {
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r3);
  padding: 16px 20px;
}
.ps-add-printer-form { display: flex; gap: 8px; margin-top: 4px; }

/* ═══ DOCUMENT CONFIGS ═══ */
.ps-doc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
.ps-doc-card {
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r3);
  overflow: hidden; transition: .14s;
}
.ps-doc-card:hover { border-color: var(--b3); }
.ps-doc-card--disabled { opacity: .7; }
.ps-doc-card-top {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px; border-bottom: 1px solid var(--b1);
  background: var(--bg3);
}
.ps-doc-code {
  font-size: 11px; font-weight: 900; padding: 2px 8px; border-radius: 6px;
  background: var(--emb); color: var(--em); border: 1px solid var(--embo);
  font-family: 'IBM Plex Mono', monospace; flex-shrink: 0;
}
.ps-doc-name { flex: 1; font-size: 13px; font-weight: 700; color: var(--t1); }
.ps-doc-toggle-wrap { flex-shrink: 0; }
.ps-doc-card-body { padding: 14px; display: flex; flex-direction: column; gap: 10px; }

.ps-paper-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.ps-paper-pill {
  padding: 4px 11px; border-radius: 20px; border: 1.5px solid var(--b2);
  background: var(--bg3); font-size: 11.5px; font-weight: 700; color: var(--t3);
  cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .12s;
}
.ps-paper-pill:hover { border-color: var(--embo); color: var(--em); }
.ps-paper-pill.on { background: var(--em); border-color: var(--em); color: #fff; }

.ps-counter {
  display: flex; align-items: center; gap: 0;
  border: 1px solid var(--b3); border-radius: var(--r1); overflow: hidden;
}
.ps-counter button {
  width: 28px; height: 28px; background: var(--bg3); border: none; border-radius: 0;
  font-size: 16px; cursor: pointer; color: var(--t2); font-weight: 700; transition: .12s;
}
.ps-counter button:hover { background: var(--emb); color: var(--em); }
.ps-counter span {
  width: 36px; text-align: center; font-size: 13px; font-weight: 800;
  color: var(--t1); font-family: 'IBM Plex Mono', monospace;
}

.ps-field-checks { display: flex; flex-direction: column; gap: 7px; }
.ps-check {
  display: flex; align-items: center; gap: 7px; cursor: pointer;
  font-size: 12.5px; color: var(--t2); font-weight: 600;
}
.ps-check input { accent-color: var(--em); width: 14px; height: 14px; cursor: pointer; }

.ps-edit-tpl-btn {
  display: flex; align-items: center; gap: 6px; padding: 7px 12px;
  border-radius: var(--r2); background: var(--emb); border: 1px solid var(--embo);
  color: var(--em); font-size: 12px; font-weight: 700; cursor: pointer;
  font-family: 'Tajawal', sans-serif; transition: .13s; width: 100%; justify-content: center;
}
.ps-edit-tpl-btn:hover { background: var(--em); color: #fff; }

/* ═══ TEMPLATE EDITOR ═══ */
.ps-template-layout { display: flex; flex-direction: column; gap: 14px; }
.ps-tpl-doc-select {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 10px 14px; background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r2);
}
.ps-tpl-doc-label { font-size: 12px; font-weight: 800; color: var(--t4); white-space: nowrap; }
.ps-tpl-pill-size {
  font-size: 9px; color: var(--t4); font-family: monospace;
  background: var(--bg0); padding: 0 6px; border-radius: 6px;
  margin-left: 4px; flex-shrink: 0;
}
.ps-tpl-doc-pill--80mm .ps-tpl-pill-size { color: var(--em); }
.ps-tpl-doc-pill--A4 .ps-tpl-pill-size { color: #2563eb; }
.ps-tpl-doc-pill--A5 .ps-tpl-pill-size { color: #7c3aed; }
.ps-tpl-doc-pill {
  padding: 4px 12px; border-radius: 20px; border: 1.5px solid var(--b2);
  background: var(--bg3); font-size: 12px; font-weight: 700; color: var(--t3);
  cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .12s;
}
.ps-tpl-doc-pill.on { background: var(--em); border-color: var(--em); color: #fff; }

.ps-tpl-cols {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  align-items: start;
}
.ps-tpl-controls {
  display: flex; flex-direction: column; gap: 10px;
  padding-bottom: 40px;
}
.ps-tpl-controls > .ps-section { flex-shrink: 0; }

/* ─ Quick Nav ─ */
.ps-tpl-quicknav {
  display: flex; flex-wrap: wrap; gap: 5px;
  padding: 8px 10px;
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r2);
  position: sticky; top: 0; z-index: 10;
}
.ps-tpl-quicknav-btn {
  padding: 4px 12px; border-radius: 20px;
  border: 1.5px solid var(--b2); background: var(--bg3);
  font-size: 11.5px; font-weight: 700; color: var(--t3);
  cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .12s;
}
.ps-tpl-quicknav-btn:hover {
  background: var(--emb); color: var(--em); border-color: var(--embo);
}

/* ─ Section ─ */
.ps-section {
  background: var(--bg2); border: 1px solid var(--b2); border-radius: var(--r3);
  overflow: visible; flex-shrink: 0;
}
.ps-section-head {
  display: flex; align-items: center; gap: 8px; padding: 11px 14px;
  background: var(--bg3); border: none; cursor: pointer; width: 100%;
  font-size: 13px; font-weight: 800; color: var(--t1);
  font-family: 'Tajawal', sans-serif; transition: .12s; text-align: right;
  position: sticky; top: 0; z-index: 10;
}
.ps-section-head.stuck { box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.ps-section-head i { font-size: 15px; color: var(--em); }
.ps-section-head:hover { background: var(--bg4); }
.ps-section-chevron { margin-right: auto; color: var(--t4) !important; font-size: 12px !important; transition: transform .15s; }
.ps-section-chevron.open { transform: rotate(180deg); }
.ps-section-body {
  padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;
  border-top: 1px solid var(--b1);
}

/* ─ Toggle ─ */
.ps-toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
.ps-toggle-track {
  width: 36px; height: 20px; border-radius: 10px; background: var(--b3);
  position: relative; cursor: pointer; transition: background .15s; flex-shrink: 0;
}
.ps-toggle-track.on { background: var(--em); }
.ps-toggle-thumb {
  position: absolute; top: 2px; right: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: #fff;
  transition: transform .15s; box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.ps-toggle-track.on .ps-toggle-thumb { transform: translateX(-16px); }
.ps-toggle-label { font-size: 12.5px; font-weight: 600; color: var(--t2); }

/* ─ Slider ─ */
.ps-slider-field { display: flex; flex-direction: column; gap: 5px; }
.ps-slider-header { display: flex; justify-content: space-between; align-items: center; }
.ps-slider-label { font-size: 12px; font-weight: 600; color: var(--t3); }
.ps-slider-val {
  font-size: 12px; font-weight: 800; color: var(--em);
  background: var(--emb); border: 1px solid var(--embo);
  padding: 1px 8px; border-radius: 20px; font-family: 'IBM Plex Mono', monospace;
}
.ps-range {
  -webkit-appearance: none; width: 100%; height: 4px;
  border-radius: 2px; background: var(--b3); outline: none; cursor: pointer;
}
.ps-range::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
  background: var(--em); cursor: pointer; box-shadow: 0 1px 4px rgba(10,138,92,.35);
}
.ps-range::-moz-range-thumb {
  width: 16px; height: 16px; border-radius: 50%; border: none;
  background: var(--em); cursor: pointer;
}

/* ─ Fields ─ */
.ps-field { display: flex; flex-direction: column; gap: 5px; }
.ps-field--row { flex-direction: row; align-items: center; justify-content: space-between; }
.ps-field-label { font-size: 11.5px; font-weight: 700; color: var(--t4); }
.ps-input {
  padding: 7px 10px; border: 1.5px solid var(--b3); border-radius: var(--r2);
  background: var(--bg3); color: var(--t1); font-size: 13px; outline: none;
  font-family: 'Tajawal', sans-serif; transition: .14s; width: 100%;
}
.ps-input:focus { border-color: var(--em); background: var(--bg2); box-shadow: 0 0 0 3px var(--emb); }
.ps-textarea { resize: vertical; min-height: 52px; }
.ps-select {
  padding: 7px 10px; border: 1.5px solid var(--b3); border-radius: var(--r2);
  background: var(--bg3); color: var(--t1); font-size: 12.5px; outline: none;
  font-family: 'Tajawal', sans-serif; cursor: pointer; width: 100%;
}
.ps-select:focus { border-color: var(--em); }

/* ═══ SOURCE INFO ═══ */
.ps-preview-source-info {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  background: var(--blueb, #eff6ff);
  border: 1px solid var(--bluebo, #bfdbfe);
  border-radius: var(--r2);
  font-size: 11.5px; color: var(--blue, #2563eb); font-weight: 600;
}

/* ═══ BADGE API ═══ */
.ps-badge-api {
  font-size: 10px; color: var(--green); background: var(--greenb);
  border: 1px solid var(--greenbo); padding: 0 6px;
  border-radius: 10px; margin-right: 6px; font-weight: 700;
  white-space: nowrap;
}

/* ═══ PREVIEW ═══ */
.ps-tpl-preview-col {
  display: flex; flex-direction: column; gap: 10px;
  position: sticky; top: 70px; align-self: start;
  height: calc(100vh - 90px);
}
.ps-preview-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r2);
  flex-shrink: 0;
}
.ps-preview-title { font-size: 13px; font-weight: 800; color: var(--t1); display: flex; align-items: center; gap: 6px; }
.ps-preview-container {
  flex: 1; min-height: 0;
  overflow-y: auto; scrollbar-width: thin;
  background: var(--bg0); border: 1px solid var(--b2); border-radius: var(--r3);
  padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.ps-preview-ruler {
  display: flex; justify-content: space-between;
  width: 302px; font-size: 9px; color: var(--t4); font-family: monospace;
  border-bottom: 1px solid var(--b3); padding-bottom: 4px; margin-bottom: 4px;
  flex-shrink: 0;
}
.ps-preview-paper {
  box-shadow: 0 4px 20px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.06);
  border-radius: 2px; overflow: hidden;
  flex-shrink: 0;
}
.ps-preview-paper--a4 {
  max-height: 800px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.ps-preview-size-badge {
  font-size: 10px; color: var(--t4); font-family: monospace;
  background: var(--bg3); border: 1px solid var(--b2);
  padding: 2px 10px; border-radius: 20px;
  flex-shrink: 0;
}
.ps-tpl-preview-col .ps-btn--primary {
  flex-shrink: 0;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 900px) {
  .ps-tpl-cols { grid-template-columns: 1fr; }
  .ps-tpl-preview-col { position: static; order: -1; height: auto; }
  .ps-tpl-controls { padding-bottom: 0; }
  .ps-preview-container { padding: 12px; max-height: 500px; min-height: 300px; }
  .ps-tpl-quicknav { display: none; }
}
@media (max-width: 640px) {
  .ps-page { padding: 14px; gap: 12px; }
  .ps-header-title { font-size: 16px; }
  .ps-doc-grid { grid-template-columns: 1fr; }
  .ps-printers-grid { grid-template-columns: 1fr; }
}

/* ═══ PRINT ═══ */
@media print {
  .ps-header,
  .ps-tabs,
  .ps-tpl-doc-select,
  .ps-tpl-controls,
  .ps-preview-header,
  .ps-preview-source-info,
  .ps-preview-ruler,
  .ps-preview-size-badge,
  .ps-content,
  #sidebar, #topbar, #mob-nav {
    display: none !important;
  }
  .ps-page,
  .ps-template-layout,
  .ps-tpl-cols,
  .ps-tpl-preview-col,
  .ps-preview-container,
  .ps-preview-paper,
  .ps-preview-paper * {
    display: block !important;
  }
  .ps-page {
    padding: 0 !important;
    margin: 0 !important;
    min-height: auto !important;
  }
  .ps-template-layout { gap: 0 !important; }
  .ps-tpl-cols {
    grid-template-columns: 1fr !important;
    gap: 0 !important;
  }
  .ps-tpl-preview-col {
    position: static !important;
  }
  .ps-preview-container {
    box-shadow: none !important;
    border: none !important;
    padding: 0 !important;
    min-height: auto !important;
  }
  .ps-preview-paper {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 auto;
    font-family: 'Tajawal', sans-serif;
  }
  .ps-preview-paper:not(.ps-preview-paper--a4) {
    width: 302px !important;
  }
  .ps-preview-paper--a4 {
    width: 100% !important;
    max-height: none !important;
    overflow: visible !important;
  }
}

/* ─ spinner ─ */
.spin { animation: spin360 1s linear infinite; display: inline-block; }
@keyframes spin360 { to { transform: rotate(360deg); } }

```

## FILE: resources/css/theme/theme.css
```
/* ══════════════════════════════════════════════════════════════════════
   theme.css — المصدر الوحيد لنظام التصميم v5.0
   نظام إدارة المبيعات الجزائري
   ══════════════════════════════════════════════════════════════════════
   الحل الاحترافي: ملف موحد يجمع كل الملفات القديمة مع إصلاح كل الفروقات
   ══════════════════════════════════════════════════════════════════════ */

@import 'tailwindcss';

/* ════════════════════════════════════════════════════════════════════
   § 1 — DESIGN TOKENS
   ════════════════════════════════════════════════════════════════════ */
:root {
  /* Backgrounds */
  --bg0: #e8eef7;
  --bg1: #f0f4fa;
  --bg2: #ffffff;
  --bg3: #f5f8fd;
  --bg4: #eaf0f8;
  --bg5: #dde5f0;

  /* Borders */
  --b1: rgba(0,0,0,0.05);
  --b2: rgba(0,0,0,0.08);
  --b3: rgba(0,0,0,0.13);
  --b4: rgba(0,0,0,0.20);

  /* Text */
  --t1: #0d1b2a;
  --t2: #1e3a5f;
  --t3: #4a6785;
  --t4: #8aa4c0;

  /* Primary — Emerald */
  --em:   #0a8a5c;
  --em2:  #077a50;
  --em3:  #0dbf84;
  --emb:  rgba(10,138,92,.08);
  --embo: rgba(10,138,92,.20);
  --em2b: rgba(10,138,92,.15);
  --emglow:  0 4px 20px rgba(10,138,92,.30);
  --emglow2: 0 8px 32px rgba(10,138,92,.25);

  /* Semantic colors */
  --gold:   #b87d0a;  --goldb:  rgba(184,125,10,.08);  --goldbo: rgba(184,125,10,.22);
  --red:    #d42b2b;  --redb:   rgba(212,43,43,.07);   --redbo:  rgba(212,43,43,.20);
  --blue:   #1a4fd6;  --blueb:  rgba(26,79,214,.07);   --bluebo: rgba(26,79,214,.20);
  --purple: #6920d4;  --purb:   rgba(105,32,212,.07);  --purbo:  rgba(105,32,212,.20);
  --orange: #c43a0a;  --orb:    rgba(196,58,10,.07);   --orbo:   rgba(196,58,10,.20);
  --teal:   #0d7a8c;  --tealb:  rgba(13,122,140,.07);  --tealbo: rgba(13,122,140,.20);
  --indigo:  #3730a3; --indigob: rgba(55,48,163,.07);

  /* Radii */
  --r1: 5px;  --r2: 10px;  --r3: 14px;  --r4: 20px;  --r5: 28px;

  /* Layout */
  --sb: 264px;  --tb: 60px;  --mb: 64px;

  /* Shadows */
  --shadow:         0 1px 3px rgba(0,0,0,.06), 0 0 0 1px rgba(0,0,0,.05);
  --shadow2:        0 4px 20px rgba(0,0,0,.09), 0 1px 4px rgba(0,0,0,.06);
  --shadow3:        0 12px 40px rgba(0,0,0,.12);
  --shadow-colored: 0 4px 20px rgba(10,138,92,.20);

  /* Gradients */
  --grad-em:     linear-gradient(135deg, #0a8a5c, #0dbf84);
  --grad-em2:    linear-gradient(135deg, #077a50, #0a8a5c);
  --grad-header: linear-gradient(135deg, #0a8a5c 0%, #0dbf84 100%);
  --grad-bg:     linear-gradient(160deg, #f0f4fa 0%, #e8eef7 100%);
  --grad-blue:   linear-gradient(135deg, #1a4fd6, #60a5fa);
  --grad-purple: linear-gradient(135deg, #6920d4, #a78bfa);
  --grad-gold:   linear-gradient(135deg, #b87d0a, #fbbf24);
  --grad-teal:   linear-gradient(135deg, #0d7a8c, #22d3ee);
  --grad-orange: linear-gradient(135deg, #c43a0a, #fb923c);

  /* Glows */
  --glow-blue:   0 4px 20px rgba(26,79,214,.30);
  --glow-purple: 0 4px 20px rgba(105,32,212,.30);
  --glow-gold:   0 4px 20px rgba(184,125,10,.30);
  --glow-teal:   0 4px 20px rgba(13,122,140,.30);
  --glow-orange: 0 4px 20px rgba(196,58,10,.30);
}

/* ════════════════════════════════════════════════════════════════════
   § 2 — DARK THEME
   ════════════════════════════════════════════════════════════════════ */
body.dark {
  --bg0: #050810;  --bg1: #0a0e16;  --bg2: #111520;
  --bg3: #161b28;  --bg4: #1c2232;  --bg5: #22293c;

  --b1: rgba(255,255,255,0.04);  --b2: rgba(255,255,255,0.07);
  --b3: rgba(255,255,255,0.11);  --b4: rgba(255,255,255,0.17);

  --t1: #e8f0f8;  --t2: #a8bdce;  --t3: #6882a0;  --t4: #3d5570;

  --em:   #14a872;  --em2: #1ac485;  --em3: #22e0a0;
  --emb:  rgba(20,168,114,.11);  --embo: rgba(20,168,114,.28);
  --em2b: rgba(20,168,114,.18);
  --emglow:  0 4px 20px rgba(20,168,114,.30);
  --emglow2: 0 8px 32px rgba(20,168,114,.22);

  --gold:   #e0a830;  --goldb:  rgba(224,168,48,.10);  --goldbo: rgba(224,168,48,.28);
  --red:    #e84848;  --redb:   rgba(232,72,72,.10);   --redbo:  rgba(232,72,72,.28);
  --blue:   #4d80ff;  --blueb:  rgba(77,128,255,.10);  --bluebo: rgba(77,128,255,.28);
  --purple: #a04cff;  --purb:   rgba(160,76,255,.10);  --purbo:  rgba(160,76,255,.28);
  --orange: #e06830;  --orb:    rgba(224,104,48,.10);  --orbo:   rgba(224,104,48,.28);
  --teal:   #20b8cc;  --tealb:  rgba(32,184,204,.10);  --tealbo: rgba(32,184,204,.28);

  --shadow:  0 2px 8px rgba(0,0,0,.40);
  --shadow2: 0 8px 32px rgba(0,0,0,.50);
  --shadow3: 0 16px 48px rgba(0,0,0,.60);
  --shadow-colored: 0 4px 20px rgba(20,168,114,.20);

  --grad-em:  linear-gradient(135deg, #14a872, #22e0a0);
  --grad-em2: linear-gradient(135deg, #0d8a5c, #14a872);
}

/* ════════════════════════════════════════════════════════════════════
   § 3 — BASE RESET
   ════════════════════════════════════════════════════════════════════ */
*, *::before, *::after {
  margin: 0; padding: 0; box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}
html { scroll-behavior: smooth; direction: rtl; }
body {
  font-family: 'Tajawal', sans-serif;
  font-size: 14px; line-height: 1.6;
  overflow-x: hidden; min-height: 100vh;
  background: var(--bg1); color: var(--t1);
  transition: background .25s, color .25s;
}
::selection { background: var(--emb); color: var(--em); }

/* ════════════════════════════════════════════════════════════════════
   § 4 — GLOBAL FORM ELEMENTS (يحافظ على سلوك القديم — لا حاجة لـ .inp)
   ════════════════════════════════════════════════════════════════════ */
input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),
select,
textarea {
  background: var(--bg2);
  border: 1px solid var(--b3);
  border-radius: var(--r2);
  padding: 8.5px 12px;
  color: var(--t1);
  font-size: 13px;
  outline: none;
  font-family: 'Tajawal', sans-serif;
  width: 100%;
  transition: border-color .15s, box-shadow .15s;
}
body.dark input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]),
body.dark select,
body.dark textarea {
  background: var(--bg3);
}
input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):focus,
select:focus,
textarea:focus {
  border-color: var(--em);
  box-shadow: 0 0 0 3px var(--emb);
}
input::placeholder { color: var(--t4); }
textarea { resize: vertical; min-height: 70px; }
select option { background: var(--bg2); }
input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }

/* ════════════════════════════════════════════════════════════════════
   § 5 — SCROLLBAR
   ════════════════════════════════════════════════════════════════════ */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--b3); border-radius: 6px; }
::-webkit-scrollbar-thumb:hover { background: var(--b4); }

/* ════════════════════════════════════════════════════════════════════
   § 6 — ICON SYSTEM
   ════════════════════════════════════════════════════════════════════ */
.ic { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ic svg { width: var(--ic-sz, 18px); height: var(--ic-sz, 18px); stroke: currentColor; fill: none; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
.ic-xs svg { --ic-sz: 13px; } .ic-sm svg { --ic-sz: 15px; }
.ic-lg svg { --ic-sz: 22px; } .ic-xl svg { --ic-sz: 28px; } .ic-2xl svg { --ic-sz: 34px; }
.kpi-ic .ic svg { --ic-sz: 17px; } .sbi-ic .ic svg { --ic-sz: 16px; }
.mt-ic  .ic svg { --ic-sz: 22px; stroke-width: 1.6; }
.fab-btn .ic svg { --ic-sz: 26px; stroke: white; stroke-width: 1.8; }
.mdb-ic .ic svg { --ic-sz: 24px; }

/* ════════════════════════════════════════════════════════════════════
   § 7 — KEYFRAMES
   ════════════════════════════════════════════════════════════════════ */
@keyframes pgIn       { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
@keyframes ciIn       { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
@keyframes pillBump   { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
@keyframes badgePulse { 0%,100%{box-shadow:0 0 0 0 rgba(212,43,43,.4)} 50%{box-shadow:0 0 0 4px rgba(212,43,43,0)} }
@keyframes fadeInUp   { from{opacity:0;transform:translateX(-50%) translateY(10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
@keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
@keyframes fadein     { from{opacity:0} to{opacity:1} }
@keyframes slideup    { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
@keyframes slideup-spring { from{opacity:0;transform:translateY(24px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
@keyframes spin       { to{transform:rotate(360deg)} }

/* ════════════════════════════════════════════════════════════════════
   § 8 — TAILWIND UTILITIES
   ════════════════════════════════════════════════════════════════════ */
@utility animate-pg-in       { animation: pgIn .22s ease; }
@utility animate-ci-in       { animation: ciIn .18s ease; }
@utility animate-badge-pulse { animation: badgePulse 2s ease-in-out infinite; }
@utility animate-slide-right { animation: slideInRight .28s cubic-bezier(.34,1.15,.64,1); }
@utility animate-pill-bump   { animation: pillBump .25s ease; }
@utility animate-fadein      { animation: fadein .3s ease both; }
@utility animate-slideup     { animation: slideup .3s ease both; }
@utility animate-slideup-fast{ animation: slideup .2s ease both; }
@utility animate-modal       { animation: slideup-spring .25s cubic-bezier(.34,1.4,.64,1) both; }
@utility animate-spin        { animation: spin .8s linear infinite; }
@utility animate-spin-fast   { animation: spin .6s linear infinite; }

/* ════════════════════════════════════════════════════════════════════
   § 9 — COMPONENT LAYER
   ════════════════════════════════════════════════════════════════════ */
@layer components {

/* ── Layout wrapper ── */
#app-layout { display: flex; min-height: 100vh; direction: rtl; background: var(--bg0); }

/* ════ SIDEBAR ════ */
#sidebar {
  width: var(--sb); flex-shrink: 0;
  background: var(--bg2);
  border-inline-start: 1px solid var(--b2);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh;
  overflow: hidden; overflow-y: auto;
  transition: width .22s cubic-bezier(.4,0,.2,1);
  z-index: 40;
}
.sb-logo {
  display: flex; align-items: center; gap: 10px;
  padding: 16px 14px 12px;
  border-bottom: 1px solid var(--b2); flex-shrink: 0;
  background: var(--bg2);
}
.sb-mark {
  width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  background: var(--grad-em);
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; font-weight: 900; color: #fff;
  box-shadow: var(--emglow); letter-spacing: -1px;
}
.sb-name { font-size: 14px; font-weight: 800; color: var(--t1); line-height: 1.2; }
.sb-sub  { font-size: 10.5px; color: var(--t4); }

.sb-co {
  margin: 10px 10px 2px; padding: 10px 12px 14px;
  background: linear-gradient(135deg, var(--emb), rgba(10,138,92,.04));
  border: 1px solid var(--embo); border-radius: var(--r3);
  font-size: 11px; position: relative; overflow: hidden;
}
.sb-co::before {
  content: ''; position: absolute; top: 0; right: 0;
  width: 3px; height: 100%; background: var(--grad-em);
}
.sb-co-name { font-weight: 800; color: var(--em); font-size: 12px; margin-bottom: 2px; }
.sb-co-info { color: var(--t4); font-size: 10.5px; font-family: 'IBM Plex Mono', monospace; }

.sb-sec { padding: 8px 0 2px; margin-bottom: 4px; }
.sb-lbl {
  font-size: 9.5px; font-weight: 800;
  color: var(--t4); letter-spacing: 1.4px;
  padding: 6px 15px 4px; text-transform: uppercase;
  display: flex; align-items: center; gap: 6px;
}
.sb-lbl::before {
  content: ''; width: 12px; height: 1px;
  background: currentColor; opacity: .4; flex-shrink: 0;
}
.sb-sec:nth-child(3)  .sb-lbl { color: var(--em); }
.sb-sec:nth-child(4)  .sb-lbl { color: var(--blue); }
.sb-sec:nth-child(5)  .sb-lbl { color: var(--purple); }
.sb-sec:nth-child(6)  .sb-lbl { color: var(--gold); }
.sb-sec:nth-child(7)  .sb-lbl { color: var(--orange); }
.sb-sec:nth-child(8)  .sb-lbl { color: var(--red); }
.sb-sec:nth-child(9)  .sb-lbl { color: var(--teal); }
.sb-sec:nth-child(10) .sb-lbl { color: var(--purple); }

.sbi {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 14px; border-radius: 8px; margin-bottom: 1px;
  cursor: pointer; color: var(--t3); font-size: 13px; font-weight: 500;
  text-decoration: none; transition: all .16s; position: relative;
  border-right: 2px solid transparent;
  white-space: nowrap; overflow: hidden; user-select: none;
}
.sbi:hover { background: var(--bg3); color: var(--t2); }
.sbi.on {
  background: var(--emb); color: var(--em);
  font-weight: 700; border-right-color: var(--em);
}
.sbi-ic  { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; color: inherit; }
.sbi-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }
.sbi-badge {
  margin-right: auto; font-size: 9.5px; font-weight: 800;
  padding: 1px 7px; border-radius: 20px;
  background: var(--red); color: #fff;
  animation: badgePulse 2s ease-in-out infinite;
}
.sbi-badge.w { background: var(--gold); }
.sbi-badge.ic-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; padding: 0;
}
.sbi-badge.ic-badge svg { width: 10px; height: 10px; stroke: white; stroke-width: 2.5; }

.sb-foot {
  margin-top: auto; border-top: 1px solid var(--b2);
  padding: 10px; flex-shrink: 0; background: var(--bg2);
}
.sb-user {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 10px; border-radius: var(--r2);
  background: var(--bg3); border: 1px solid var(--b2);
  cursor: pointer; transition: .15s;
}
.sb-user:hover { background: var(--bg4); }
.sb-av {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--grad-em);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.sb-uname { font-size: 12.5px; font-weight: 700; color: var(--t1); }
.sb-urole { font-size: 10.5px; color: var(--t4); }
.sb-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #10b981; flex-shrink: 0; margin-right: auto;
  box-shadow: 0 0 0 2px rgba(16,185,129,.25);
}

/* ════ TOPBAR ════ */
#topbar {
  position: sticky; top: 0; z-index: 100;
  height: var(--tb);
  background: rgba(240,244,250,.92);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--b2);
  padding: 0 22px;
  display: flex; align-items: center; gap: 12px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
  flex-shrink: 0;
}
body.dark #topbar { background: rgba(10,14,22,.92); }

.tb-info { flex: 1; min-width: 0; }
.tb-title { font-size: 15px; font-weight: 800; color: var(--t1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tb-path  { font-size: 11px; color: var(--t4); margin-top: 1px; }
.tb-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.srch {
  display: flex; align-items: center; gap: 7px;
  background: var(--bg3); border: 1px solid var(--b2);
  border-radius: var(--r2); padding: 7px 12px;
  width: 200px; transition: all .15s;
}
.srch:focus-within {
  border-color: var(--em);
  background: var(--bg2);
  box-shadow: 0 0 0 3px var(--emb);
  width: 240px;
}
.srch-ic { color: var(--t4); font-size: 13px; }
.srch input {
  background: transparent; border: none !important; outline: none !important;
  box-shadow: none !important; border-radius: 0 !important;
  color: var(--t1); font-size: 12.5px; width: 100%;
  font-family: 'Tajawal', sans-serif; padding: 0 !important;
}
.srch input::placeholder { color: var(--t4); }

.ib {
  width: 34px; height: 34px; border-radius: var(--r2);
  background: var(--bg3); border: 1px solid var(--b2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 15px; color: var(--t3);
  position: relative; transition: .15s; flex-shrink: 0;
}
.ib:hover { background: var(--bg4); color: var(--t1); }
.ib-n {
  position: absolute; top: -4px; right: -4px;
  width: 16px; height: 16px; border-radius: 50%;
  background: var(--red); color: #fff; font-size: 8.5px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--bg2);
}

.tb-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 15px; border-radius: var(--r2);
  border: 1px solid var(--b3); background: var(--bg3); color: var(--t2);
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  font-family: 'Tajawal', sans-serif; transition: .15s;
  white-space: nowrap;
}
.tb-btn:hover { background: var(--bg4); color: var(--t1); }
.tb-btn.p {
  background: var(--em); border-color: var(--em);
  color: #fff; box-shadow: var(--emglow);
}
.tb-btn.p:hover { background: var(--em2); }

#theme-btn {
  width: 34px; height: 34px; border-radius: var(--r2);
  background: var(--bg3); border: 1px solid var(--b2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 16px; flex-shrink: 0; transition: .15s;
}
#theme-btn:hover { background: var(--bg4); }

/* ════ MAIN ════ */
#main {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
  background: var(--bg1); min-height: 100vh;
}

/* ════ PAGES ════ */
.page { display: none; padding: 22px; }
.page.on { display: block; animation: pgIn .22s ease; }
#p-pos.on { display: flex; flex-direction: column; }

/* ════════════════════════════════════════════════════════════════════
   § 10 — CARD
   ════════════════════════════════════════════════════════════════════ */
.card {
  background: var(--bg2);
  border: 1px solid var(--b2);
  border-radius: var(--r3);
  padding: 18px;
  box-shadow: var(--shadow);
  transition: box-shadow .2s;
}
.card:hover { box-shadow: var(--shadow2); }
.card-hd {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; padding-bottom: 12px;
  border-bottom: 1px solid var(--b1);
}
.card-title {
  font-size: 13.5px; font-weight: 800;
  color: var(--t1); display: flex;
  align-items: center; gap: 7px;
}
.card-sub { font-size: 11.5px; color: var(--t4); }

/* ════════════════════════════════════════════════════════════════════
   § 11 — KPI CARDS
   ════════════════════════════════════════════════════════════════════ */
.kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 20px;
}
/* responsive override below */

/* كلاسات القديمة .ke .kg .kr + الجديدة .kpi-em .kpi-gold .kpi-red — كلتاهما تعمل */
.kpi, .kpi-card {
  background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r3); padding: 16px;
  position: relative; overflow: hidden;
  cursor: default; transition: transform .18s, box-shadow .18s;
  box-shadow: var(--shadow);
}
.kpi:hover, .kpi-card:hover { transform: translateY(-2px); box-shadow: var(--shadow2); }
.kpi::before, .kpi-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
}
.kpi::after, .kpi-card::after {
  content: ''; position: absolute; top: 0; right: 0;
  width: 80px; height: 80px; border-radius: 50%; opacity: .04;
  transform: translate(20px, -20px);
}
/* أسماء قديمة */
.kpi.ke::before,.kpi-card.kpi-em::before { background: linear-gradient(90deg, var(--em), var(--em3)); }
.kpi.kg::before,.kpi-card.kpi-gold::before { background: linear-gradient(90deg, var(--gold), #fbbf24); }
.kpi.kr::before,.kpi-card.kpi-red::before { background: linear-gradient(90deg, var(--red), #f87171); }
.kpi.kb::before,.kpi-card.kpi-blue::before { background: linear-gradient(90deg, var(--blue), #60a5fa); }
.kpi.kp::before,.kpi-card.kpi-purp::before { background: linear-gradient(90deg, var(--purple), #a78bfa); }
.kpi.kt::before,.kpi-card.kpi-teal::before { background: linear-gradient(90deg, var(--teal), #67e8f9); }
.kpi.ko::before,.kpi-card.kpi-orng::before { background: linear-gradient(90deg, var(--orange), #fb923c); }
.kpi.ke::after,.kpi-card.kpi-em::after   { background: var(--em); }
.kpi.kg::after,.kpi-card.kpi-gold::after { background: var(--gold); }
.kpi.kr::after,.kpi-card.kpi-red::after  { background: var(--red); }
.kpi.kb::after,.kpi-card.kpi-blue::after { background: var(--blue); }
.kpi.kp::after,.kpi-card.kpi-purp::after { background: var(--purple); }
.kpi.kt::after,.kpi-card.kpi-teal::after { background: var(--teal); }
body:not(.dark) .kpi.ke,.body:not(.dark) .kpi-card.kpi-em   { background: linear-gradient(150deg, #fff 60%, #f0fdf8); }
body:not(.dark) .kpi.kg,.body:not(.dark) .kpi-card.kpi-gold { background: linear-gradient(150deg, #fff 60%, #fffbeb); }
body:not(.dark) .kpi.kr,.body:not(.dark) .kpi-card.kpi-red  { background: linear-gradient(150deg, #fff 60%, #fef2f2); }
body:not(.dark) .kpi.kb,.body:not(.dark) .kpi-card.kpi-blue { background: linear-gradient(150deg, #fff 60%, #eff6ff); }
body:not(.dark) .kpi.kp,.body:not(.dark) .kpi-card.kpi-purp { background: linear-gradient(150deg, #fff 60%, #f5f3ff); }
body:not(.dark) .kpi.kt,.body:not(.dark) .kpi-card.kpi-teal { background: linear-gradient(150deg, #fff 60%, #ecfeff); }
body:not(.dark) .kpi.ko,.body:not(.dark) .kpi-card.kpi-orng { background: linear-gradient(150deg, #fff 60%, #fff7ed); }

.kpi-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 10px; }
.kpi-ic {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.ke .kpi-ic,.kpi-em .kpi-ic { background: var(--emb); color: var(--em); }
.kg .kpi-ic,.kpi-gold .kpi-ic { background: var(--goldb); color: var(--gold); }
.kr .kpi-ic,.kpi-red .kpi-ic { background: var(--redb); color: var(--red); }
.kb .kpi-ic,.kpi-blue .kpi-ic { background: var(--blueb); color: var(--blue); }
.kp .kpi-ic,.kpi-purp .kpi-ic { background: var(--purb); color: var(--purple); }
.kt .kpi-ic,.kpi-teal .kpi-ic { background: var(--tealb); color: var(--teal); }
.ko .kpi-ic,.kpi-orng .kpi-ic { background: var(--orb); color: var(--orange); }

.kpi-trend {
  font-size: 11px; font-weight: 700;
  padding: 3px 8px; border-radius: 20px;
}
.up  { background: rgba(16,185,129,.12); color: #059669; }
.dn  { background: rgba(212,43,43,.10); color: var(--red); }
.neu { background: var(--bg4); color: var(--t4); }
.kpi-lbl { font-size: 11.5px; color: var(--t3); margin-bottom: 5px; }
.kpi-val {
  font-size: 23px; font-weight: 900; color: var(--t1);
  letter-spacing: -.6px; line-height: 1;
}
.kpi-val .u { font-size: 12px; font-weight: 500; color: var(--t4); margin-right: 2px; }
.kpi-sub { font-size: 11px; color: var(--t4); margin-top: 6px; }

/* ════════════════════════════════════════════════════════════════════
   § 12 — GRIDS
   ════════════════════════════════════════════════════════════════════ */
.g2  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.g3  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
.g4  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
.g65 { display: grid; grid-template-columns: 1.8fr 1fr; gap: 16px; }
.g35 { display: grid; grid-template-columns: 1fr 1.8fr; gap: 16px; }
.g73 { display: grid; grid-template-columns: 2.2fr 1fr; gap: 16px; }

/* ════════════════════════════════════════════════════════════════════
   § 13 — TABLE
   ════════════════════════════════════════════════════════════════════ */
.tw { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; }
thead th {
  padding: 10px 13px; text-align: right; font-size: 11px;
  font-weight: 800; color: var(--t4); letter-spacing: .6px;
  text-transform: uppercase; background: var(--bg3);
  border-bottom: 1px solid var(--b2); white-space: nowrap;
}
thead th:first-child { border-radius: 0 var(--r2) 0 0; }
thead th:last-child  { border-radius: var(--r2) 0 0 0; }
tbody tr { border-bottom: 1px solid var(--b1); transition: background .12s; cursor: pointer; }
tbody tr:hover { background: var(--bg3); }
tbody tr:last-child { border-bottom: none; }
td { padding: 11px 13px; font-size: 13px; color: var(--t2); vertical-align: middle; }
td.s { color: var(--t1); font-weight: 700; }
td.m { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; color: var(--t4); }
td.e { color: var(--em); font-weight: 700; }
td.r { color: var(--red); font-weight: 600; }
td.g { color: var(--gold); font-weight: 600; }
td.b { color: var(--blue); font-weight: 600; }

/* ════════════════════════════════════════════════════════════════════
   § 14 — BADGES / CHIPS
   ════════════════════════════════════════════════════════════════════ */
.bx {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  border: 1px solid transparent; white-space: nowrap;
}
.bx::before {
  content: ''; width: 5px; height: 5px; border-radius: 50%;
  background: currentColor; opacity: .75; flex-shrink: 0;
}
.bx.no-dot::before { display: none; }
body:not(.dark) .be { background: #dcfce7; color: #15803d; border-color: #86efac; }
body:not(.dark) .br { background: #fee2e2; color: #c41c1c; border-color: #fca5a5; }
body:not(.dark) .bg { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
body:not(.dark) .bb { background: #dbeafe; color: #1a40b8; border-color: #93c5fd; }
body:not(.dark) .bp { background: #ede9fe; color: #6520c4; border-color: #c4b5fd; }
body:not(.dark) .bt { background: #cffafe; color: #0d748c; border-color: #67e8f9; }
body:not(.dark) .bo { background: #ffedd5; color: #c43010; border-color: #fdba74; }
body:not(.dark) .bz { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
body:not(.dark) .bi { background: #e0e7ff; color: #3730a3; border-color: #a5b4fc; }
body.dark .be { background: var(--emb);   color: var(--em2);   border-color: var(--embo); }
body.dark .br { background: var(--redb);  color: var(--red);   border-color: var(--redbo); }
body.dark .bg { background: var(--goldb); color: var(--gold);  border-color: var(--goldbo); }
body.dark .bb { background: var(--blueb); color: var(--blue);  border-color: var(--bluebo); }
body.dark .bp { background: var(--purb);  color: var(--purple);border-color: var(--purbo); }
body.dark .bt { background: var(--tealb); color: var(--teal);  border-color: var(--tealbo); }
body.dark .bo { background: var(--orb);   color: var(--orange);border-color: var(--orbo); }
body.dark .bz { background: var(--bg4);   color: var(--t3);    border-color: var(--b3); }

/* ════════════════════════════════════════════════════════════════════
   § 15 — BUTTONS
   ════════════════════════════════════════════════════════════════════ */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 15px; border-radius: var(--r2);
  border: 1px solid var(--b3);
  background: var(--bg3); color: var(--t2);
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  font-family: 'Tajawal', sans-serif; transition: .15s;
  white-space: nowrap; user-select: none;
}
.btn:hover  { background: var(--bg4); color: var(--t1); }
.btn:active { transform: scale(.97); }

/* أسماء القديمة .btn-p و .btn-r تعمل + أسماء الجديدة .primary و .danger */
.btn-p, .btn.primary {
  background: var(--em); border-color: var(--em);
  color: #fff; box-shadow: var(--emglow);
}
.btn-p:hover, .btn.primary:hover { background: var(--em2); box-shadow: var(--emglow2); }
.btn-r, .btn.danger { background: var(--redb); border-color: var(--redbo); color: var(--red); }
.btn-r:hover, .btn.danger:hover { background: var(--red); color: #fff; }
.btn-g { background: var(--goldb); border-color: var(--goldbo); color: var(--gold); }
.btn-g:hover { background: var(--gold); color: #fff; }
.btn-b { background: var(--blueb); border-color: var(--bluebo); color: var(--blue); }
.btn-b:hover { background: var(--blue); color: #fff; }
.btn-sm, .btn.btn-sm { padding: 5px 11px; font-size: 12px; }
.btn-xs, .btn.btn-xs { padding: 4px 9px; font-size: 11px; }
.btn-lg, .btn.btn-lg { padding: 11px 22px; font-size: 14px; border-radius: var(--r3); }
.btn-w  { width: 100%; justify-content: center; }

.icon-btn {
  width: 30px; height: 30px; border-radius: 8px; border: 1px solid var(--b2);
  background: var(--bg2); cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: var(--t3); font-size: 13px;
  transition: background .13s, color .13s; flex-shrink: 0;
}
.icon-btn:hover { background: var(--emb); color: var(--em); }
.icon-btn.hover-gold:hover { background: var(--goldb); color: var(--gold); }
.icon-btn.hover-red:hover  { background: var(--redb);  color: var(--red); }

.btn-add-dashed {
  width: 100%; padding: 13px 20px; border-radius: 14px;
  border: 1.5px dashed var(--b3); background: transparent;
  color: var(--t4); font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all .15s; font-family: 'Tajawal', sans-serif;
}
.btn-add-dashed:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }

/* ════════════════════════════════════════════════════════════════════
   § 16 — FORMS
   ════════════════════════════════════════════════════════════════════ */
.fg  { display: flex; flex-direction: column; gap: 5px; }
.fg.s2 { grid-column: span 2; }
.fg.s3 { grid-column: span 3; }
.fg.s4 { grid-column: span 4; }

label { font-size: 12px; font-weight: 700; color: var(--t3); letter-spacing: .3px; }
.req::after { content: ' *'; color: var(--red); }

.fgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.fgrid.c3 { grid-template-columns: 1fr 1fr 1fr; }
.fgrid.c2 { grid-template-columns: 1fr 1fr; }

/* Input row مع prefix/suffix */
.inp-row {
  display: flex; align-items: stretch;
  border: 1px solid var(--b3); border-radius: var(--r2); overflow: hidden;
  background: var(--bg2); transition: border-color .15s, box-shadow .15s;
}
.inp-row:focus-within {
  border-color: var(--em);
  box-shadow: 0 0 0 3px var(--emb);
}
.inp-row input, .inp-row select {
  border: none !important; outline: none !important;
  border-radius: 0 !important; flex: 1; box-shadow: none !important;
  background: transparent; padding: 8.5px 12px;
}
/* suffix قبل الحقل (يمين في RTL) */
.inp-suf {
  display: flex; align-items: center; justify-content: center;
  padding: 0 12px; font-size: 12px; font-weight: 700;
  color: var(--t4); background: var(--bg3);
  flex-shrink: 0; white-space: nowrap;
  border-left: 1px solid var(--b3);
}
/* prefix بعد الحقل (يسار في RTL) */
.inp-pre {
  display: flex; align-items: center; justify-content: center;
  padding: 0 12px; font-size: 12px; font-weight: 700;
  color: var(--t4); background: var(--bg3);
  flex-shrink: 0; white-space: nowrap;
  border-right: 1px solid var(--b3);
}
.inp-eye {
  display: flex; align-items: center; padding: 0 11px;
  color: var(--t4); font-size: 15px; flex-shrink: 0;
  cursor: pointer; background: transparent; border: none;
  border-inline-start: 1px solid var(--b2); transition: color .13s;
}
.inp-eye:hover { color: var(--t2); }

/* ════════════════════════════════════════════════════════════════════
   § 17 — ALERTS
   ════════════════════════════════════════════════════════════════════ */
.al {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 15px; border-radius: var(--r2);
  border: 1px solid; margin-bottom: 14px; font-size: 13px;
}
.al strong { font-weight: 800; }
/* دعم أسماء القديمة (.al-g .al-w .al-r .al-b) والجديدة (.al-e .al-g .al-b .al-p) */
body:not(.dark) .al-e, body:not(.dark) .al-g.success { background: #f0fdf4; border-color: #86efac; color: #15803d; }
body:not(.dark) .al-r { background: #fef2f2; border-color: #fca5a5; color: #c41c1c; }
body:not(.dark) .al-g, body:not(.dark) .al-w { background: #fffbeb; border-color: #fcd34d; color: #92400e; }
body:not(.dark) .al-b { background: #eff6ff; border-color: #93c5fd; color: #1a40b8; }
body:not(.dark) .al-p { background: #f5f3ff; border-color: #c4b5fd; color: #6520c4; }
body.dark .al-e, body.dark .al-g.success { background: var(--emb);   border-color: var(--embo);   color: var(--em2); }
body.dark .al-r { background: var(--redb);  border-color: var(--redbo);  color: var(--red); }
body.dark .al-g, body.dark .al-w { background: var(--goldb); border-color: var(--goldbo); color: var(--gold); }
body.dark .al-b { background: var(--blueb); border-color: var(--bluebo); color: var(--blue); }
body.dark .al-p { background: var(--purb);  border-color: var(--purbo);  color: var(--purple); }

/* ════════════════════════════════════════════════════════════════════
   § 18 — TABS
   ════════════════════════════════════════════════════════════════════ */
.tabs {
  display: flex; border-bottom: 1px solid var(--b2);
  margin-bottom: 16px; gap: 0; overflow-x: auto;
  scrollbar-width: none;
}
.tabs::-webkit-scrollbar { display: none; }
.tab {
  padding: 9px 16px; cursor: pointer;
  font-size: 13px; font-weight: 700; color: var(--t4);
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: .15s; white-space: nowrap; user-select: none;
  display: flex; align-items: center; gap: 5px;
}
.tab:hover { color: var(--t2); }
.tab.on { color: var(--em); border-bottom-color: var(--em); }

/* ════════════════════════════════════════════════════════════════════
   § 19 — MODALS & OVERLAYS
   ════════════════════════════════════════════════════════════════════ */
.ov {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.62);
  display: flex; align-items: center; justify-content: center;
  z-index: 10001; opacity: 0; pointer-events: none;
  transition: opacity .22s;
  backdrop-filter: blur(6px); padding: 16px;
}
.ov.on { opacity: 1; pointer-events: all; }
.modal {
  background: var(--bg2); border: 1px solid var(--b3);
  border-radius: var(--r4); width: 100%; max-width: 580px;
  box-shadow: var(--shadow3);
  transform: scale(.94) translateY(10px);
  transition: transform .24s cubic-bezier(.34,1.4,.64,1);
  max-height: 90vh; display: flex; flex-direction: column;
}
.ov.on .modal { transform: scale(1) translateY(0); }
.modal-lg { max-width: 720px; }
.modal-xl { max-width: 900px; }
.modal-sm { max-width: 440px; }
.m-hd {
  padding: 16px 20px; border-bottom: 1px solid var(--b2);
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.m-title { font-size: 15px; font-weight: 800; color: var(--t1); }
.m-sub   { font-size: 11.5px; color: var(--t4); margin-top: 1px; }
.m-x {
  width: 28px; height: 28px; border-radius: 7px;
  background: var(--bg3); border: 1px solid var(--b2);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--t3); font-size: 13px; transition: .15s; flex-shrink: 0;
}
.m-x:hover { background: var(--redb); border-color: var(--redbo); color: var(--red); }
.m-body { padding: 20px; overflow-y: auto; }
.m-foot {
  padding: 14px 20px; border-top: 1px solid var(--b2);
  display: flex; align-items: center; justify-content: flex-end;
  gap: 8px; flex-shrink: 0;
  background: var(--bg3); border-radius: 0 0 var(--r4) var(--r4);
}
.m-foot-l { margin-right: auto; display: flex; gap: 8px; }

/* Modal الجديدة بـ gradient header */
.modal-overlay {
  position: fixed; inset: 0; z-index: 10002;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.65); backdrop-filter: blur(8px);
  padding: 16px; animation: fadein .2s ease;
}
.modal-box {
  background: var(--bg2); border-radius: var(--r4); width: 100%;
  border: 1px solid var(--b3); box-shadow: 0 24px 64px rgba(0,0,0,.35);
  overflow: hidden; direction: rtl;
  animation: slideup-spring .25s cubic-bezier(.34,1.4,.64,1) both;
}
.modal-grad-header {
  padding: 20px 24px 16px; background: var(--grad-em);
  position: relative; overflow: hidden;
}
.modal-grad-header::before {
  content: ''; position: absolute; top: -40px; left: -40px;
  width: 140px; height: 140px; border-radius: 50%;
  background: rgba(255,255,255,.07); pointer-events: none;
}
.modal-header-icon {
  width: 44px; height: 44px; border-radius: 13px;
  background: rgba(255,255,255,.2); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; margin-bottom: 10px;
}

/* ════════════════════════════════════════════════════════════════════
   § 20 — PROGRESS BAR, AVATAR, SWITCH, TIMELINE, EMPTY
   ════════════════════════════════════════════════════════════════════ */
.pb { height: 6px; background: var(--bg4); border-radius: 3px; overflow: hidden; }
.pb-f { height: 100%; border-radius: 3px; background: var(--em); transition: width .4s; }

.av {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.av1 { background: linear-gradient(135deg, #0a8a5c, #0dbf84); }
.av2 { background: linear-gradient(135deg, #6920d4, #a78bfa); }
.av3 { background: linear-gradient(135deg, #1a4fd6, #60a5fa); }
.av4 { background: linear-gradient(135deg, #b87d0a, #fbbf24); }
.av5 { background: linear-gradient(135deg, #d42b2b, #f87171); }
.av6 { background: linear-gradient(135deg, #0d7a8c, #67e8f9); }
.av7 { background: linear-gradient(135deg, #c43a0a, #fb923c); }

.sw {
  width: 38px; height: 22px; border-radius: 11px;
  background: var(--bg5); border: 1px solid var(--b3);
  cursor: pointer; position: relative; transition: .18s; flex-shrink: 0;
}
.sw.on { background: var(--em); border-color: var(--em); }
.sw::after {
  content: ''; position: absolute;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; top: 2px; right: 2px;
  transition: transform .18s; box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.sw.on::after { transform: translateX(-16px); }

.tl { padding-right: 16px; position: relative; }
.tl::before {
  content: ''; position: absolute; right: 5px; top: 4px; bottom: 4px;
  width: 1px; background: var(--b2);
}
.tl-i  { position: relative; padding-bottom: 14px; padding-right: 18px; }
.tl-d  { position: absolute; right: -7px; top: 5px; width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--bg2); }
.tl-d.e { background: var(--em2); } .tl-d.g { background: var(--gold); }
.tl-d.b { background: var(--blue); } .tl-d.r { background: var(--red); }
.tl-d.z { background: var(--t4); }  .tl-d.p { background: var(--purple); }
.tl-t { font-size: 10.5px; color: var(--t4); margin-bottom: 2px; }
.tl-x { font-size: 12.5px; color: var(--t2); }
.tl-x strong { color: var(--t1); }

.empty { text-align: center; padding: 56px 20px; }
.empty-ic  { font-size: 48px; opacity: .15; margin-bottom: 14px; }
.empty-tx  { font-size: 14px; color: var(--t4); }
.empty-sub { font-size: 12px; color: var(--t4); margin-top: 6px; }
.empty-dashed {
  text-align: center; padding: 60px 24px; background: var(--bg2);
  border-radius: var(--r4); border: 1.5px dashed var(--b3);
  animation: slideup .3s ease .1s both;
}

/* ════════════════════════════════════════════════════════════════════
   § 21 — CHARTS
   ════════════════════════════════════════════════════════════════════ */
.barchart {
  height: 200px; display: flex; align-items: flex-end;
  gap: 7px; padding: 16px 0 0; position: relative;
}
.barchart::before {
  content: ''; position: absolute; top: 16px; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(to bottom, transparent, transparent calc(25% - .5px), var(--b1) calc(25% - .5px), var(--b1) 25%);
  pointer-events: none;
}
.bc-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.bc-bar {
  width: 100%; border-radius: 5px 5px 0 0; min-height: 4px;
  background: linear-gradient(to top, var(--em), var(--em3));
  position: relative; transition: opacity .2s, height .4s;
}
.bc-bar:hover { opacity: .8; }
.bc-bar.hi { background: linear-gradient(to top, var(--gold), #fbbf24); }
.bc-bar.b  { background: linear-gradient(to top, var(--blue), #60a5fa); }
.bc-bar.r  { background: linear-gradient(to top, var(--red), #f87171); }
.bc-lbl { font-size: 10px; color: var(--t4); white-space: nowrap; }
.bc-v {
  position: absolute; top: -18px; left: 50%; transform: translateX(-50%);
  font-size: 10px; font-weight: 700; color: var(--t3); white-space: nowrap;
}
.spark { display: flex; align-items: flex-end; gap: 3px; height: 36px; }
.sp { flex: 1; border-radius: 2px 2px 0 0; background: var(--emb); min-height: 4px; cursor: default; transition: background .18s; }
.sp:hover, .sp.hi { background: var(--em); }
.donut-w { display: flex; align-items: center; gap: 16px; }
.donut {
  width: 110px; height: 110px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--em2) 0% 38%, var(--gold) 38% 62%, var(--blue) 62% 79%, var(--purple) 79% 88%, var(--t4) 88% 100%);
  position: relative;
}
.donut::after { content: ''; position: absolute; inset: 24px; border-radius: 50%; background: var(--bg2); }
.d-legend { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.d-item   { display: flex; align-items: center; gap: 7px; font-size: 12px; }
.d-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ════════════════════════════════════════════════════════════════════
   § 22 — SUMMARY ROWS, MISC
   ════════════════════════════════════════════════════════════════════ */
.sr  { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; border-bottom: 1px solid var(--b1); gap: 8px; }
.sr:last-child { border-bottom: none; }
.sr-l { font-size: 12.5px; color: var(--t3); }
.sr-v { font-size: 13px; font-weight: 700; color: var(--t1); }

.qamt {
  padding: 5px 11px; border-radius: var(--r1);
  background: var(--bg3); border: 1px solid var(--b2);
  font-size: 12px; font-weight: 700; color: var(--t2);
  cursor: pointer; transition: .14s; font-family: 'Tajawal', sans-serif;
}
.qamt:hover { background: var(--emb); border-color: var(--embo); color: var(--em); }

.sep { height: 1px; background: var(--b1); margin: 12px 0; }
.dot-sep { display: inline-block; width: 3px; height: 3px; border-radius: 50%; background: var(--t4); margin: 0 5px; vertical-align: middle; }

.stat-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  background: var(--bg3); border-radius: var(--r2); border: 1px solid var(--b2);
}
.stat-row-ic { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.stat-row-val { font-size: 16px; font-weight: 900; color: var(--t1); }
.stat-row-lbl { font-size: 11px; color: var(--t4); }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
}
.page-title   { font-size: 20px; font-weight: 900; color: var(--t1); margin-bottom: 3px; }
.page-sub     { font-size: 12.5px; color: var(--t4); }
.page-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.filters { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filters .srch { flex: 1; min-width: 180px; }

.tva-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid var(--b1); font-size: 13px; }
.tva-row:last-child { border-bottom: none; }

.section-divider {
  font-size: 10px; font-weight: 800; color: var(--t4); text-transform: uppercase;
  letter-spacing: 1px; border-bottom: 1px solid var(--b1); padding-bottom: 7px;
  display: flex; align-items: center; gap: 5px;
}
.section-divider i { color: var(--em); }

.toast {
  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
  background: #1e2124; color: #fff; padding: 10px 22px; border-radius: 20px;
  font-size: 13px; z-index: 10020; animation: slideup .2s ease; white-space: nowrap;
  box-shadow: var(--shadow3); pointer-events: none;
}
body.dark .toast { background: #2c2f36; }

.company-card {
  background: var(--bg2); border: 1.5px solid var(--b2); border-radius: 16px;
  padding: 18px 20px; cursor: pointer; transition: all .18s cubic-bezier(.34,1,.64,1);
  display: flex; align-items: center; gap: 16px; position: relative; overflow: hidden;
}
.company-card:hover { transform: translateY(-2px); box-shadow: var(--shadow2); border-color: var(--b3); }
.company-card.suspended { opacity: .6; cursor: not-allowed; }
.company-card.suspended:hover { transform: none; box-shadow: none; }
.company-avatar {
  width: 50px; height: 50px; border-radius: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 900; color: #fff; letter-spacing: -1px;
}

.year-item {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
  border-radius: 12px; border: 1.5px solid var(--b2); background: var(--bg3);
  cursor: pointer; transition: all .14s;
}
.year-item:hover    { background: var(--bg4); }
.year-item.selected { border-color: var(--em); background: var(--emb); }
.year-item-check {
  width: 22px; height: 22px; border-radius: 50%; background: var(--em); color: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; flex-shrink: 0;
}

/* ════════════════════════════════════════════════════════════════════
   § 23 — PRODUCT CARDS
   ════════════════════════════════════════════════════════════════════ */
.prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(155px,1fr)); gap: 12px; }
.prod-c {
  background: var(--bg2); border: 1px solid var(--b2);
  border-radius: var(--r3); padding: 14px;
  cursor: pointer; transition: all .15s; box-shadow: var(--shadow);
}
.prod-c:hover { border-color: var(--em); transform: translateY(-2px); box-shadow: var(--shadow2); }
.prod-img {
  width: 100%; height: 72px; border-radius: var(--r2);
  background: var(--bg3); display: flex; align-items: center;
  justify-content: center; margin-bottom: 10px;
}
.prod-name { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
.prod-meta { font-size: 11px; color: var(--t4); margin-bottom: 7px; }
.prod-row  { display: flex; align-items: center; justify-content: space-between; }

/* ════════════════════════════════════════════════════════════════════
   § 24 — SETTINGS TABS
   ════════════════════════════════════════════════════════════════════ */
.stab {
  padding: 9px 16px; cursor: pointer; font-size: 13px; font-weight: 700;
  color: var(--t4); border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: .15s; white-space: nowrap; user-select: none;
  display: flex; align-items: center; gap: 6px;
}
.stab:hover { color: var(--t2); }
.stab.on    { color: var(--em); border-bottom-color: var(--em); }
.stpanel    { display: none; }
.stpanel.on { display: block; animation: pgIn .2s ease; }
.pt { display: grid; grid-template-columns: minmax(160px,2fr) repeat(4,1fr); }
.pt-hd {
  padding: 9px 12px; background: var(--bg3);
  font-size: 11px; font-weight: 800; color: var(--t4);
  border-bottom: 2px solid var(--b2); text-align: center;
}
.pt-lbl {
  padding: 10px 12px; font-size: 13px; font-weight: 600;
  color: var(--t2); border-bottom: 1px solid var(--b1);
  display: flex; align-items: center;
}
.pt-cell {
  padding: 10px 12px; text-align: center;
  border-bottom: 1px solid var(--b1);
  border-left: 1px solid var(--b1); font-size: 15px;
}

/* ════════════════════════════════════════════════════════════════════
   § 25 — POS SYSTEM — شاشة البيع
   ════════════════════════════════════════════════════════════════════ */

/* Stats bar */
.pos-stats { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--bg2); border-bottom: 1px solid var(--b2); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; min-height: 44px; }
.pos-stats::-webkit-scrollbar { display: none; }
.pos-chip { display: flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; border: 1px solid transparent; flex-shrink: 0; white-space: nowrap; transition: transform .13s; }
.pos-chip.clickable { cursor: pointer; }
.pos-chip.clickable:hover { transform: translateY(-1px); }
.pos-chip.g { background: var(--emb); border-color: var(--embo); color: var(--em); }
.pos-chip.o { background: var(--goldb); border-color: var(--goldbo); color: var(--gold); }
.pos-chip.b { background: var(--blueb); border-color: var(--bluebo); color: var(--blue); }
.pos-chip strong { font-weight: 800; }
.pos-tools { margin-right: auto; display: flex; gap: 3px; flex-shrink: 0; align-items: center; }
.pos-kb-hint { display: flex; gap: 6px; flex-shrink: 0; align-items: center; font-size: 9px; color: var(--t4); font-weight: 700; padding-right: 6px; }
.pos-kb-hint kbd { background: var(--bg4); border: 1px solid var(--b3); border-radius: 4px; padding: 1px 5px; font-size: 9px; font-family: monospace; color: var(--t3); }

/* Layout */
.pos-layout { display: grid; grid-template-columns: 1fr 360px; height: calc(100vh - var(--tb) - 44px); overflow: hidden; }

/* LEFT: Products */
.pos-left { display: flex; flex-direction: column; overflow: hidden; background: var(--bg1); border-left: 1px solid var(--b2); }
.pos-search-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg2); border-bottom: 1px solid var(--b2); flex-shrink: 0; }
.pos-inp { flex: 1; display: flex; align-items: center; gap: 7px; background: var(--bg3); border: 1.5px solid var(--b2); border-radius: var(--r2); padding: 7px 11px; transition: border-color .15s, box-shadow .15s; }
.pos-inp:focus-within { border-color: var(--em); background: var(--bg2); box-shadow: 0 0 0 3px var(--emb); }
.pos-inp input { background: transparent; border: none !important; outline: none !important; box-shadow: none !important; border-radius: 0 !important; color: var(--t1); font-size: 13px; width: 100%; font-family: 'Tajawal', sans-serif; padding: 0 !important; }
.pos-inp input::placeholder { color: var(--t4); }
.view-tog { display: flex; gap: 3px; }
.vtb { width: 28px; height: 28px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--t4); transition: .12s; }
.vtb.on { background: var(--emb); border-color: var(--embo); color: var(--em); }
.vtb:hover:not(.on) { background: var(--bg4); }

/* Category pills */
.pos-cats { display: flex; padding: 0 10px; background: var(--bg2); border-bottom: 1px solid var(--b2); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
.pos-cats::-webkit-scrollbar { display: none; }
.cat-btn { display: flex; align-items: center; gap: 4px; padding: 7px 11px; cursor: pointer; font-size: 12px; font-weight: 600; color: var(--t4); border: none; background: transparent; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .13s; white-space: nowrap; font-family: 'Tajawal', sans-serif; }
.cat-btn:hover { color: var(--t2); }
.cat-btn.on { color: var(--em); border-bottom-color: var(--em); }
.cat-cnt { font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 20px; background: var(--bg4); color: var(--t4); }
.cat-btn.on .cat-cnt { background: var(--emb); color: var(--em); }

/* Quick shortcuts */
.pos-quick { display: flex; align-items: center; gap: 4px; padding: 5px 12px; background: var(--bg2); border-bottom: 1px solid var(--b1); flex-shrink: 0; overflow-x: auto; scrollbar-width: none; }
.pos-quick::-webkit-scrollbar { display: none; }
.ql  { font-size: 10px; color: var(--t4); font-weight: 700; flex-shrink: 0; }
.qsc { display: flex; align-items: center; gap: 3px; padding: 3px 9px; border-radius: 20px; background: var(--bg3); border: 1px solid var(--b2); font-size: 11.5px; font-weight: 700; color: var(--t2); cursor: pointer; font-family: 'Tajawal', sans-serif; transition: all .12s; white-space: nowrap; flex-shrink: 0; -webkit-tap-highlight-color: transparent; }
.qsc:hover, .qsc:active { background: var(--emb); border-color: var(--embo); color: var(--em); transform: translateY(-1px); }

/* Products grid */
.pos-grid-area { flex: 1; overflow-y: auto; padding: 10px 12px; }
.pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px,1fr)); gap: 8px; }
.pgrid.lv { grid-template-columns: 1fr; gap: 4px; }
.no-res { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 50px 20px; color: var(--t4); text-align: center; }

/* Product card */
.pc2 { background: var(--bg2); border: 1.5px solid var(--b2); border-radius: var(--r3); padding: 10px 9px 8px; cursor: pointer; transition: all .14s; position: relative; overflow: hidden; user-select: none; -webkit-tap-highlight-color: transparent; }
.pc2::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--pc-color, var(--em)); opacity: 0; transition: opacity .13s; }
.pc2:hover { border-color: var(--b4); transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.09); }
.pc2:hover::after, .pc2.sel::after { opacity: 1; }
.pc2:active { transform: scale(.95); }
.pc2.sel { border-color: var(--em); background: var(--emb); box-shadow: 0 0 0 1.5px var(--em); }
.pc2.oos { opacity: .45; cursor: not-allowed; }
.pc2.oos:hover { transform: none; box-shadow: none; }
.pc2-badge { position: absolute; top: 5px; left: 5px; min-width: 19px; height: 19px; border-radius: 10px; padding: 0 4px; background: var(--em); color: #fff; font-size: 9.5px; font-weight: 800; display: none; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(10,146,104,.4); }
.pc2.sel .pc2-badge { display: flex; }
.pc2-ic { width: 38px; height: 38px; border-radius: 9px; display: flex; align-items: center; justify-content: center; margin: 0 auto 7px; background: var(--pc-bg, var(--emb)); font-size: 17px; transition: transform .13s; }
.pc2:hover .pc2-ic { transform: scale(1.08); }
.pc2-name  { font-size: 11px; font-weight: 700; color: var(--t1); text-align: center; line-height: 1.3; margin-bottom: 2px; }
.pc2-price { font-size: 13px; font-weight: 900; color: var(--pc-color, var(--em)); text-align: center; margin-bottom: 2px; }
.pc2-stock { font-size: 9.5px; text-align: center; font-weight: 600; }
.pc2-stock.ok { color: var(--t4); } .pc2-stock.lo { color: var(--gold); } .pc2-stock.no { color: var(--red); }
.pgrid.lv .pc2 { display: flex; align-items: center; gap: 9px; padding: 7px 11px; }
.pgrid.lv .pc2-ic { width: 32px; height: 32px; border-radius: 7px; margin: 0; flex-shrink: 0; font-size: 14px; }
.pgrid.lv .pc2-info { flex: 1; min-width: 0; }
.pgrid.lv .pc2-name, .pgrid.lv .pc2-price, .pgrid.lv .pc2-stock { text-align: right; margin: 0; }
.pgrid.lv .pc2-badge { top: 50%; transform: translateY(-50%); left: auto; right: 8px; }

/* RIGHT: Cart */
.pos-cart { display: flex; flex-direction: column; overflow: hidden; background: var(--bg2); }
.cart-top { flex-shrink: 0; background: var(--bg2); border-bottom: 1px solid var(--b2); }
.cart-top-row { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px 6px; }
.cart-ttl { display: flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 800; color: var(--t1); }
.cart-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px; border-radius: 10px; padding: 0 4px; background: var(--em); color: #fff; font-size: 10.5px; font-weight: 800; transition: transform .2s; }
.cart-pill.bump { animation: pillBump .25s ease; }
.cart-acts2 { display: flex; gap: 3px; }
.cart-modes2 { display: flex; margin: 0 12px 7px; border-radius: var(--r2); overflow: hidden; border: 1px solid var(--b2); }
.cmode { flex: 1; padding: 5px 3px; font-size: 11px; font-weight: 700; font-family: 'Tajawal', sans-serif; border: none; cursor: pointer; background: var(--bg3); color: var(--t3); transition: all .13s; display: flex; align-items: center; justify-content: center; gap: 3px; border-left: 1px solid var(--b2); }
.cmode:first-child { border-left: none; }
.cmode.on { background: var(--em); color: #fff; }
.cart-client { padding: 0 12px 8px; }
.cart-client select { width: 100%; padding: 6px 9px; border-radius: var(--r2); border: 1px solid var(--b2); background: var(--bg3); font-family: 'Tajawal', sans-serif; font-size: 12px; color: var(--t1); outline: none; cursor: pointer; transition: border-color .15s; }
.cart-client select:focus { border-color: var(--em); }

.cart-items-body { flex: 1; overflow-y: auto; min-height: 0; }
.cart-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 8px; color: var(--t4); padding: 16px; text-align: center; }
.cart-empty-ic { font-size: 44px; opacity: .1; }

/* Cart item */
.ci { display: flex; align-items: center; gap: 5px; padding: 7px 11px; border-bottom: 1px solid var(--b1); transition: background .1s; animation: ciIn .18s ease; }
.ci:hover { background: var(--bg3); }
.ci-n { width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0; background: var(--emb); color: var(--em); font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
.ci-body { flex: 1; min-width: 0; }
.ci-name { font-size: 12px; font-weight: 700; color: var(--t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ci-prow { display: flex; align-items: center; gap: 3px; margin-top: 1px; }
.ci-pinp { width: 58px; padding: 2px 4px; font-size: 10.5px; border-radius: 4px; border: 1px solid var(--b3); background: var(--bg3); color: var(--t1); font-family: 'IBM Plex Mono', monospace; outline: none; }
.ci-pinp:focus { border-color: var(--em); }
.ci-punit { font-size: 9.5px; color: var(--t4); }
.qc2 { display: flex; align-items: center; gap: 2px; flex-shrink: 0; }
.qb2 { width: 24px; height: 24px; border-radius: 5px; background: var(--bg4); border: 1px solid var(--b2); color: var(--t2); cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: .12s; -webkit-tap-highlight-color: transparent; }
.qb2:hover, .qb2:active { background: var(--em); border-color: var(--em); color: #fff; }
.qn2 { font-size: 13px; font-weight: 800; width: 20px; text-align: center; color: var(--t1); }
.ci-sum { font-size: 12px; font-weight: 800; color: var(--em); min-width: 55px; text-align: left; direction: ltr; flex-shrink: 0; }
.ci-del { width: 18px; height: 18px; border-radius: 4px; border: none; background: transparent; color: var(--t4); cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center; transition: .12s; flex-shrink: 0; }
.ci-del:hover, .ci-del:active { color: var(--red); background: var(--redb); }

/* Cart footer */
.cart-foot { border-top: 1px solid var(--b2); background: var(--bg2); flex-shrink: 0; }
.cart-sums { padding: 6px 12px 4px; }
.sum-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
.sum-l { font-size: 11px; color: var(--t4); }
.sum-v { font-size: 11.5px; font-weight: 700; color: var(--t2); }
.disc-row2 { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
.dtog { padding: 2px 7px; border-radius: var(--r1); font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid var(--b2); background: var(--bg3); color: var(--t3); font-family: 'Tajawal', sans-serif; transition: .12s; }
.dtog.on { background: var(--em); border-color: var(--em); color: #fff; }
.dinp { width: 50px; padding: 2px 6px; font-size: 11.5px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); color: var(--t1); font-family: 'Tajawal', sans-serif; outline: none; }
.dinp:focus { border-color: var(--em); }

/* Grand total */
.grand-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: linear-gradient(135deg, var(--em2), var(--em)); }
.grand-lbl { font-size: 12px; font-weight: 800; color: rgba(255,255,255,.85); }
.grand-val { font-size: 24px; font-weight: 900; color: #fff; direction: ltr; line-height: 1; }
.grand-val .gu { font-size: 12px; font-weight: 500; opacity: .8; }

/* Payment method */
.pay-sec { padding: 6px 12px 4px; }
.pay-sec-lbl { font-size: 9.5px; font-weight: 800; color: var(--t4); letter-spacing: .5px; text-transform: uppercase; margin-bottom: 4px; }
.pmg { display: flex; gap: 4px; margin-bottom: 5px; overflow-x: auto; scrollbar-width: none; }
.pmg::-webkit-scrollbar { display: none; }
.pmb2 { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 5px 6px; border-radius: var(--r1); border: 1.5px solid var(--b2); background: var(--bg3); cursor: pointer; font-size: 10px; font-weight: 700; color: var(--t3); font-family: 'Tajawal', sans-serif; transition: all .13s; -webkit-tap-highlight-color: transparent; white-space: nowrap; flex-shrink: 0; min-width: 48px; }
.pmb2:hover { border-color: var(--b4); color: var(--t2); background: var(--bg4); }
.pmb2.on { border-color: var(--em); background: var(--emb); color: var(--em); box-shadow: 0 0 0 1px var(--em); }
.pmb2 .pmi { font-size: 15px; line-height: 1; }

/* Action buttons */
.cart-btns2 { display: grid; grid-template-columns: 1fr 1.8fr; gap: 6px; padding: 5px 12px 10px; }
.btn-hold2 { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 8px; border-radius: var(--r2); border: 1.5px solid var(--b3); background: var(--bg3); color: var(--t2); font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .13s; -webkit-tap-highlight-color: transparent; }
.btn-hold2:hover { background: var(--bg4); }
.btn-hold2:disabled { opacity: .4; cursor: not-allowed; }
.btn-sell2 { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: var(--r2); background: var(--em); border: none; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; font-family: 'Tajawal', sans-serif; box-shadow: 0 4px 14px rgba(10,146,104,.35); transition: .13s; -webkit-tap-highlight-color: transparent; }
.btn-sell2:hover { background: var(--em2); box-shadow: 0 6px 20px rgba(10,146,104,.45); }
.btn-sell2:active { transform: scale(.97); }
.btn-sell2:disabled { background: var(--bg4); box-shadow: none; color: var(--t4); cursor: not-allowed; border: 1px solid var(--b2); }

/* Pay modal */
.pay-amount-hero { background: linear-gradient(135deg, var(--em2), var(--em)); padding: 16px 20px 14px; text-align: center; }
.pay-ttc-big    { font-size: 40px; font-weight: 900; color: #fff; line-height: 1; direction: ltr; letter-spacing: -1px; }
.pay-ttc-label  { font-size: 11px; color: rgba(255,255,255,.7); margin-bottom: 4px; }
.pay-client-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,.18); border-radius: 20px; padding: 3px 12px; font-size: 11.5px; color: #fff; font-weight: 600; margin-top: 8px; }
.pay-breakdown { display: flex; gap: 0; border-bottom: 1px solid var(--b2); }
.pay-bd-c { flex: 1; padding: 8px 6px; text-align: center; border-left: 1px solid var(--b2); }
.pay-bd-c:last-child { border-left: none; }
.pay-bd-l { font-size: 9px; color: var(--t4); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .5px; }
.pay-bd-v { font-size: 12.5px; font-weight: 800; color: var(--t1); }
.pay-m-grid { display: flex; gap: 5px; padding: 10px 16px 6px; overflow-x: auto; scrollbar-width: none; flex-wrap: wrap; }
.pay-m-grid::-webkit-scrollbar { display: none; }
.pmpill { display: flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; border: 1.5px solid var(--b2); background: var(--bg3); cursor: pointer; font-size: 12px; font-weight: 700; color: var(--t3); font-family: 'Tajawal', sans-serif; transition: all .13s; -webkit-tap-highlight-color: transparent; white-space: nowrap; }
.pmpill:hover { border-color: var(--b4); color: var(--t2); }
.pmpill.on { border-color: var(--em); background: var(--emb); color: var(--em); }
.pmpill .pmi { font-size: 15px; }
.pay-cash-sec { padding: 8px 16px 4px; }
.given-inp { width: 100%; font-size: 26px; font-weight: 800; text-align: center; padding: 9px; border: 1.5px solid var(--b2); border-radius: var(--r2); background: var(--bg3); color: var(--t1); font-family: 'Tajawal', sans-serif; outline: none; direction: ltr; margin-bottom: 8px; }
.given-inp:focus { border-color: var(--em); background: var(--bg2); }
.qamts { display: flex; gap: 5px; flex-wrap: wrap; padding: 0 16px 6px; }
.qa { padding: 4px 10px; border-radius: var(--r2); background: var(--bg4); border: 1px solid var(--b2); font-size: 11.5px; font-weight: 700; color: var(--t2); cursor: pointer; font-family: 'Tajawal', sans-serif; transition: .12s; -webkit-tap-highlight-color: transparent; }
.qa:hover, .qa:active { background: var(--emb); border-color: var(--embo); color: var(--em); }
.change-display { display: flex; justify-content: space-between; align-items: center; margin: 0 16px 8px; padding: 10px 14px; border-radius: var(--r2); background: var(--bg3); border: 1px solid var(--b2); transition: all .2s; }
.change-display.positive { background: var(--emb); border-color: var(--embo); }
.change-display.negative { background: var(--redb); border-color: var(--redbo); }
.change-lbl2 { font-size: 12px; color: var(--t3); font-weight: 600; }
.change-val2 { font-size: 20px; font-weight: 900; }
.numpad { display: grid; grid-template-columns: repeat(3,1fr); gap: 5px; padding: 4px 16px 8px; }
.npk { padding: 11px 8px; border-radius: var(--r2); background: var(--bg3); border: 1px solid var(--b2); font-size: 17px; font-weight: 700; color: var(--t1); cursor: pointer; font-family: 'Tajawal', sans-serif; text-align: center; transition: .12s; -webkit-tap-highlight-color: transparent; }
.npk:hover, .npk:active { background: var(--em); color: #fff; border-color: var(--em); }
.npk.zero { grid-column: span 2; }
.npk.del  { color: var(--red); }
.npk.del:active { background: var(--red); color: #fff; }
.pay-split-sec { padding: 8px 16px 4px; }
.split-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.split-lbl { font-size: 11.5px; color: var(--t4); width: 48px; flex-shrink: 0; font-weight: 600; }
.split-inp { flex: 1; padding: 6px 9px; border-radius: var(--r1); border: 1px solid var(--b2); background: var(--bg3); font-family: 'Tajawal', sans-serif; font-size: 13px; color: var(--t1); outline: none; }
.split-inp:focus { border-color: var(--em); }
.pay-credit-sec { padding: 8px 16px; }
.pay-note-sec   { padding: 4px 16px 8px; }
.pay-note-sec label { font-size: 11px; font-weight: 700; color: var(--t4); display: block; margin-bottom: 4px; }

/* Toast POS */
.pos-toast { position: fixed; top: 74px; left: 50%; transform: translateX(-50%) translateY(-8px); background: var(--em); color: #fff; padding: 9px 20px; border-radius: 30px; font-size: 13px; font-weight: 800; z-index: 99999; box-shadow: 0 4px 18px rgba(10,146,104,.4); font-family: 'Tajawal', sans-serif; white-space: nowrap; pointer-events: none; opacity: 0; transition: all .28s cubic-bezier(.34,1.4,.64,1); }
.pos-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.pos-toast.err  { background: var(--red); box-shadow: 0 4px 18px rgba(220,38,38,.4); }
.pos-toast.warn { background: var(--gold); box-shadow: 0 4px 18px rgba(180,83,9,.4); }

/* Receipt */
.receipt-wrap { background: #fff; border-radius: var(--r2); border: 1px solid var(--b2); padding: 20px; color: #0f172a; font-family: 'Tajawal', sans-serif; }
.receipt-head { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 2px solid #0a8a5c; }
.receipt-logo { font-size: 17px; font-weight: 900; color: #0a8a5c; }
.receipt-meta { font-size: 10.5px; color: #64748b; margin-top: 2px; line-height: 1.5; }
.receipt-num  { font-size: 13px; font-weight: 800; text-align: left; }
.receipt-tbl  { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 10px; }
.receipt-tbl thead tr { background: #f0f4f9; }
.receipt-tbl th { padding: 6px 8px; text-align: right; font-weight: 800; font-size: 10.5px; color: #475569; }
.receipt-tbl td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
.receipt-tbl td.num { text-align: left; direction: ltr; }
.receipt-totals       { display: flex; justify-content: flex-end; }
.receipt-totals-inner { min-width: 180px; }
.receipt-row  { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 3px; }
.receipt-grand { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; color: #0a8a5c; padding-top: 7px; border-top: 1.5px solid #0a8a5c; margin-top: 4px; }
.receipt-foot { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #94a3b8; text-align: center; }
body.dark .receipt-wrap { background: #fff; color: #0f172a; }

/* Mobile total bar */
.mob-total-bar { display: none; align-items: center; justify-content: space-between; padding: 7px 14px; background: var(--bg2); border-bottom: 1px solid var(--b2); flex-shrink: 0; gap: 10px; }
.mob-total-left { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; color: var(--t2); }
.mob-total-right { display: flex; align-items: center; gap: 8px; margin-right: auto; }
.mob-total-label { font-size: 10px; color: var(--t4); font-weight: 600; }
.mob-total-val { font-size: 16px; font-weight: 900; color: var(--em); direction: ltr; min-width: 75px; text-align: left; }
.mob-total-pay-btn { display: flex; align-items: center; gap: 4px; padding: 7px 14px; border-radius: var(--r2); background: var(--em); border: none; color: #fff; font-size: 12.5px; font-weight: 800; cursor: pointer; font-family: 'Tajawal', sans-serif; box-shadow: 0 3px 10px rgba(10,146,104,.28); transition: .13s; -webkit-tap-highlight-color: transparent; white-space: nowrap; }
.mob-total-pay-btn:active { transform: scale(.96); opacity: .9; }
.mob-total-pay-btn:disabled { background: var(--bg4); color: var(--t4); box-shadow: none; }

/* ════════════════════════════════════════════════════════════════════
   § 26 — MOBILE NAV
   ════════════════════════════════════════════════════════════════════ */
#mob-nav  { display: none; }
#mob-drawer { display: none; }
.pos-mob-tabs { display: none; }

/* ════════════════════════════════════════════════════════════════════
   § 27 — RESPONSIVE
   ════════════════════════════════════════════════════════════════════ */
@media(max-width:1200px) and (min-width:769px) { .pos-layout { grid-template-columns: 1fr 330px; } }
@media(max-width:1000px) and (min-width:769px) {
  .pos-layout { grid-template-columns: 1fr 300px; }
  .pgrid { grid-template-columns: repeat(auto-fill, minmax(115px,1fr)); }
  .grand-val { font-size: 20px; }
  .pmb2 { min-width: 40px; padding: 4px 5px; font-size: 9.5px; }
  .pmb2 .pmi { font-size: 13px; }
}

@media(max-width:768px) {
  #sidebar { display: none !important; }
  #main { margin-right: 0 !important; padding-bottom: calc(var(--mb) + env(safe-area-inset-bottom,0px)); min-height: auto; }
  #main:has(#p-pos.on) { padding-bottom: 0; }

  #mob-nav {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0;
    height: var(--mb); z-index: 9999;
    background: var(--bg2); border-top: 1px solid var(--b2);
    box-shadow: 0 -4px 20px rgba(0,0,0,.10);
    padding-bottom: env(safe-area-inset-bottom,0px);
  }
  body.dark #mob-nav { box-shadow: 0 -4px 20px rgba(0,0,0,.35); }

  .mob-tabs { display: flex; width: 100%; align-items: stretch; }
  .mt {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 3px; cursor: pointer; color: var(--t4);
    position: relative; padding: 6px 4px;
    transition: color .16s; user-select: none;
  }
  .mt:active { transform: scale(.92); }
  .mt.on { color: var(--em); }
  .mt.on .mt-ic-wrap { background: var(--emb); border-radius: 16px; padding: 3px 14px; }
  .mt-ic      { font-size: 20px; line-height: 1; }
  .mt-ic-wrap { transition: all .18s; padding: 2px 12px; }
  .mt-lbl     { font-size: 10px; font-weight: 800; font-family: 'Tajawal', sans-serif; line-height: 1; }
  .mt-n {
    position: absolute; top: 3px; right: 10px;
    width: 14px; height: 14px; border-radius: 50%;
    background: var(--red); color: #fff;
    font-size: 8px; font-weight: 800;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--bg2);
  }
  .mt-fab { flex: 0 0 68px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; cursor: pointer; user-select: none; gap: 2px; }
  .fab-btn { width: 54px; height: 54px; border-radius: 50%; background: var(--grad-em); box-shadow: 0 4px 18px rgba(10,138,92,.45); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-top: -20px; border: 3px solid var(--bg2); transition: transform .16s; }
  .mt-fab:active .fab-btn { transform: scale(.92); }

  #mob-drawer {
    display: block; position: fixed; inset: 0;
    z-index: 10000; pointer-events: none; opacity: 0; transition: opacity .22s;
  }
  #mob-drawer.on { pointer-events: all; opacity: 1; }
  .mdb-bg { position: absolute; inset: 0; background: rgba(0,0,0,.50); backdrop-filter: blur(4px); }
  .mdb-panel {
    position: absolute; bottom: 0; left: 0; right: 0;
    background: var(--bg2); border-radius: 24px 24px 0 0;
    padding: 12px 14px calc(env(safe-area-inset-bottom,0px) + 80px);
    transform: translateY(100%);
    transition: transform .28s cubic-bezier(.34,1.15,.64,1);
    border-top: 1px solid var(--b2); max-height: 88vh; overflow-y: auto;
  }
  #mob-drawer.on .mdb-panel { transform: translateY(0); }
  .mdb-handle { width: 36px; height: 4px; border-radius: 2px; background: var(--b3); margin: 0 auto 14px; }
  .mdb-title  { font-size: 11px; font-weight: 800; color: var(--t4); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px; margin-top: 6px; padding-bottom: 6px; border-bottom: 1px solid var(--b1); }
  .mdb-title:first-of-type { margin-top: 0; }
  .mdb-grid   { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 14px; }
  .mdb-item   { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 12px 4px; border-radius: var(--r3); background: var(--bg3); border: 1px solid var(--b1); cursor: pointer; transition: all .15s; user-select: none; }
  .mdb-item:active { transform: scale(.93); background: var(--bg4); }
  .mdb-ic  { font-size: 22px; }
  .mdb-lbl { font-size: 11px; font-weight: 700; color: var(--t2); text-align: center; font-family: 'Tajawal', sans-serif; line-height: 1.3; }
  .mdb-row { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: var(--r2); background: var(--bg3); border: 1px solid var(--b1); cursor: pointer; transition: .15s; user-select: none; margin-top: 10px; }
  .mdb-row:active { background: var(--bg4); }

  #topbar { padding: 0 14px; }
  .srch { display: none; }
  .tb-btn .tb-txt { display: none; }
  .page { padding: 14px; }
  .kpis { grid-template-columns: 1fr 1fr !important; gap: 10px; }
  .kpi-val { font-size: 19px; }
  .g2,.g3,.g4,.g65,.g35,.g73 { grid-template-columns: 1fr !important; }
  .fgrid, .fgrid.c3, .fgrid.c2 { grid-template-columns: 1fr !important; }
  .fg.s2, .fg.s3, .fg.s4 { grid-column: span 1 !important; }
  .barchart { height: 140px; }

  /* POS Mobile */
  .mob-total-bar { position: sticky; top: 0; z-index: 200; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
  .pos-mob-tabs { display: flex; position: sticky; bottom: 0; left: 0; right: 0; height: 52px; z-index: 550; background: var(--bg2); border-top: 1px solid var(--b2); box-shadow: 0 -4px 20px rgba(0,0,0,.12); }
  .pmt { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; font-size: 10px; font-weight: 800; color: var(--t4); font-family: 'Tajawal', sans-serif; transition: color .15s; -webkit-tap-highlight-color: transparent; position: relative; }
  .pmt.on { color: var(--em); }
  .pmt-ic { font-size: 20px; line-height: 1; }
  .pmt-badge { position: absolute; top: 4px; right: calc(50% - 22px); min-width: 17px; height: 17px; border-radius: 9px; padding: 0 4px; background: var(--em); color: #fff; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg2); }
  .pmt-sell-btn { flex: 1.5; display: flex; align-items: center; justify-content: center; gap: 6px; background: var(--em); color: #fff; border: none; cursor: pointer; font-size: 13.5px; font-weight: 800; font-family: 'Tajawal', sans-serif; transition: .13s; -webkit-tap-highlight-color: transparent; }
  .pmt-sell-btn:active { opacity: .85; }
  .pmt-sell-btn:disabled { background: var(--bg4); color: var(--t4); }

  #p-pos.on { display: flex; flex-direction: column; height: calc(100vh - var(--tb) - var(--mb) - 52px); overflow: hidden; }
  #p-pos:not(.on) { display: none !important; }
  #p-pos.on .pos-layout { flex: 1; grid-template-columns: 1fr; height: auto; min-height: 0; grid-template-rows: 1fr; overflow: hidden; }
  #p-pos.on .pos-left, #p-pos.on .pos-cart { height: 100%; grid-column: 1; grid-row: 1; overflow: hidden; display: flex; flex-direction: column; }
  #p-pos.on .pos-left { display: flex; }
  #p-pos.on .pos-cart { display: none; }
  #p-pos.on .mob-show-cart .pos-left { display: none !important; }
  #p-pos.on .mob-show-cart .pos-cart { display: flex !important; }

  .pos-stats { padding: 5px 10px; gap: 4px; }
  .pos-kb-hint { display: none !important; }
  .pos-search-bar { padding: 6px 10px; gap: 6px; }
  .pos-inp { padding: 6px 10px; }
  .view-tog { display: none; }
  .pos-cats { padding: 0 8px; }
  .cat-btn  { padding: 6px 9px; font-size: 11px; }
  .pos-quick { padding: 4px 10px; }
  .ql { display: none; }
  .pos-grid-area { padding: 7px 9px; }
  .pgrid { grid-template-columns: repeat(3,1fr) !important; gap: 6px !important; }
  .pc2 { padding: 7px 7px 6px; }
  .pc2-ic { width: 32px; height: 32px; font-size: 14px; margin-bottom: 5px; border-radius: 8px; }
  .pc2-name  { font-size: 10px; }
  .pc2-price { font-size: 12px; }
  .pc2-stock { font-size: 9px; }
  .cart-top-row { padding: 8px 11px 5px; }
  .cart-modes2  { margin: 0 11px 6px; }
  .cmode { font-size: 10.5px; padding: 4px 2px; }
  .cart-client  { padding: 0 11px 7px; }
  .ci { padding: 6px 10px; }
  .ci-name { font-size: 11.5px; }
  .cart-sums { padding: 5px 11px 3px; }
  .grand-bar { padding: 7px 11px; }
  .grand-val { font-size: 20px; }
  .pay-sec { padding: 4px 11px 3px; }
  .pmg { gap: 3px; }
  .pmb2 { min-width: 42px; padding: 4px 5px; font-size: 9.5px; }
  .pmb2 .pmi { font-size: 13px; }
  .cart-btns2 { padding: 4px 11px 8px; gap: 5px; }
  .btn-hold2  { padding: 8px; font-size: 12px; }
  .btn-sell2  { padding: 9px; font-size: 13px; }
  .pay-ttc-big { font-size: 30px; }
  .given-inp  { font-size: 22px; padding: 8px; }
  .numpad { gap: 4px; padding: 4px 14px 6px; }
  .npk { padding: 10px; font-size: 15px; }
  .pay-m-grid { padding: 8px 14px 4px; }
  .qamts      { padding: 0 14px 4px; }
  .change-display { margin: 0 14px 6px; }
  .pay-cash-sec   { padding: 6px 14px 2px; }
  .pay-note-sec   { padding: 4px 14px 6px; }
}

@media(max-width:420px) {
  .kpi-val { font-size: 17px; }
  .kpis    { gap: 8px; }
  .pgrid   { grid-template-columns: repeat(2,1fr) !important; }
  .pos-chip { padding: 3px 8px; font-size: 10px; }
}

/* ════════════════════════════════════════════════════════════════════
   § 28 — SWITCH
   ════════════════════════════════════════════════════════════════════ */
.sw {
  width: 38px; height: 22px; border-radius: 11px;
  background: var(--bg5); border: 1px solid var(--b3);
  cursor: pointer; position: relative; transition: .18s; flex-shrink: 0;
}
.sw.on { background: var(--em); border-color: var(--em); }
.sw::after {
  content: ''; position: absolute;
  width: 16px; height: 16px; border-radius: 50%;
  background: #fff; top: 2px; right: 2px;
  transition: transform .18s;
  box-shadow: 0 1px 4px rgba(0,0,0,.2);
}
.sw.on::after { transform: translateX(-16px); }

/* ════════════════════════════════════════════════════════════════════
   § 29 — DASHBOARD QUICK ACTIONS (MOBILE)
   ════════════════════════════════════════════════════════════════════ */
.dash-quick { display: none; }

@media(max-width:768px) {
  .dash-quick {
    display: grid !important;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px; margin-bottom: 16px;
  }
  .dq-item {
    display: flex; flex-direction: column; align-items: center;
    gap: 5px; padding: 12px 6px; border-radius: var(--r3);
    background: var(--bg2); border: 1px solid var(--b2);
    cursor: pointer; font-size: 11px; font-weight: 700;
    color: var(--t2); font-family: 'Tajawal', sans-serif;
    transition: all .15s; text-align: center; user-select: none;
  }
  .dq-item:active { background: var(--bg3); transform: scale(.94); }
  .dq-ic { font-size: 22px; }
}

/* ════════════════════════════════════════════════════════════════════
   § 30 — LOADING / SKELETON
   ════════════════════════════════════════════════════════════════════ */
.skel {
  background: linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%);
  background-size: 200% 100%;
  animation: skelShimmer 1.4s ease-in-out infinite;
  border-radius: var(--r2);
}
@keyframes skelShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ════════════════════════════════════════════════════════════════════
   § 31 — PRINT
   ════════════════════════════════════════════════════════════════════ */
@media print {
  #sidebar, #topbar, #mob-nav, .tb-actions,
  .cart-btns2, .pos-mob-tabs, .pos-quick { display: none !important; }
  #main { margin: 0 !important; padding: 0 !important; }
  .receipt-wrap { border: none; box-shadow: none; }
  body { background: #fff !important; color: #000 !important; }
}

} /* end @layer components */



/*  login page costum css        */

.auth-side-panel {
  background: linear-gradient(145deg, var(--em) 0%, #065f46 100%);
}

.auth-logo {
  width: 140px; height: 80px;
  border-radius: 24px;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.25);
}

.auth-feature-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,.15);
}

.auth-support-box {
  background: rgba(0,0,0,.2);
}

.auth-brand-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: var(--grad-em);
  box-shadow: var(--emglow);
}

/* حقل input مع مساحة للزر الأيسر (eye toggle) */
.inp-with-left-action {
  padding-left: 36px;
}

.auth-submit-btn {
  font-family: Tajawal, sans-serif;
}

@media (max-width: 768px) {
  .login-panel      { display: none !important; }
  .login-form-panel { width: 100% !important; }
}

/* ── ADD TO theme.css ── register page custom css */

.auth-side-panel {
  background: linear-gradient(145deg, var(--em) 0%, #065f46 100%);
}

.auth-logo {
  width: 140px; height: 80px;
  border-radius: 24px;
  background: rgba(255,255,255,.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,.25);
}

.auth-feature-icon {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,.15);
}

.auth-support-box {
  background: rgba(0,0,0,.2);
}

.auth-brand-icon {
  width: 40px; height: 40px;
  border-radius: 12px;
  background: var(--grad-em);
  box-shadow: var(--emglow);
}

.auth-submit-btn {
  font-family: Tajawal, sans-serif;
}

.inp-no-right-border {
  border-right: none;
  border-radius: 0 var(--r2) var(--r2) 0;
}

.inp-with-left-action {
  padding-left: 36px;
}

.inp-error {
  border-color: #ef4444;
}

/* شريط قوة كلمة المرور */
.strength-bar {
  background: var(--bar-color, var(--bg4));
}

@media (max-width: 768px) {
  .login-panel      { display: none !important; }
  .login-form-panel { width: 100% !important; }
}


```

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

  /* ── Green ── */
  --green:   #16a34a;
  --greenb:  rgba(22,163,74,.07);
  --greenbo: rgba(22,163,74,.20);

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

  --green:   #30c85c;
  --greenb:  rgba(48,200,92,.10);
  --greenbo: rgba(48,200,92,.28);

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


====================================================
⚠️ تم الدمج فقط لتسهيل المشاركة أو المراجعة
====================================================
