# Step 0 Audit Report (Phase 30 v2 Amendment)

Generated: 2026-11-04  
Working directory: D:\xampp\htdocs\sales-management  
Scope: Document edits only. No application code modified.

## Raw environment checks (command outputs)

### PHP CLI / php.ini
```powershell
php -r "echo ini_get('max_execution_time');"  => 0
php -i | findstr "Loaded Configuration"       => Loaded Configuration File => D:\xampp\php\php.ini
findstr /n "max_execution_time" D:\xampp\php\php.ini | findstr /V ";" => 407:max_execution_time=120
```
- CLI `max_execution_time` = 0 (from `php -r`)
- Effective php.ini loaded by CLI/web is `D:\xampp\php\php.ini` (line 407 shows `max_execution_time=120`)

### Apache / MPM
```powershell
Test-Path D:\xampp\apache\conf\httpd.conf => True
Test-Path D:\xampp\apache\conf\extra\httpd-mpm.conf => True
findstr /n "LoadModule mpm" D:\xampp\apache\conf\httpd.conf | Select-Object -First 5
  => 69:# have to place corresponding `LoadModule' lines at this location...
     75:# LoadModule foo_module modules/mod_foo.so
     77:LoadModule access_compat_module modules/mod_access_compat.so
     78:LoadModule actions_module modules/mod_actions.so
     79:LoadModule alias_module modules/mod_alias.so
```
MPM module load lines not explicitly active in the grep (commented or built-in). httpd-mpm.conf contains directives:
```powershell
findstr /n "ThreadsPerChild|MaxRequestWorkers|StartServers|MaxConnectionsPerChild" D:\xampp\apache\conf\extra\httpd-mpm.conf
  => <IfModule mpm_prefork_module> StartServers 5, MaxRequestWorkers 250, MaxConnectionsPerChild 0
     <IfModule mpm_worker_module> StartServers 3, ThreadsPerChild 25, MaxRequestWorkers 400, MaxConnectionsPerChild 0
     <IfModule mpm_event_module> StartServers 3, ThreadsPerChild 25, MaxRequestWorkers 400, MaxConnectionsPerChild 0
```
**Status:** Apache MPM settings exist in httpd-mpm.conf but which MPM is actually loaded in this XAMPP installation is not determinable from static file inspection alone. **UNREADABLE as "the active MPM+thread count" without runtime inspection** (only Apache thread settings/config details explicitly allowed to be marked UNREADABLE after attempted checks). Report records both file locations and directive blocks.

### Windows / Apache account
```powershell
whoami => desktop-h8shjo5\pc
Get-Service -Name "*apache*" => (no output / no Apache Windows service found in this enumeration)
```
**Status:** Current user is `desktop-h8shjo5\pc`. Apache service detection returned no results via that filter; whether Chrome can be launched by the Apache service account is **UNREADABLE** from static checks.

## Codebase evidence (file:line)

### Backend dompdf
```powershell
Select-String -Path D:\xampp\htdocs\sales-management\app\**\* -Pattern "ArabicGlyphShaper"
  => app/Services/DocumentPrintService.php:7 use App\Support\ArabicGlyphShaper;
     app/Services/DocumentPrintService.php:15  * The whole rendered HTML passes through ArabicGlyphShaper::shape() BEFORE
     app/Services/DocumentPrintService.php:48         $html = ArabicGlyphShaper::shape($html);
     app/Support/ArabicGlyphShaper.php:18 class ArabicGlyphShaper
```
- `composer.json` line ~10: `"barryvdh/laravel-dompdf": "*"` [VERIFIED]
- `app/Http/Controllers/Api/V1/PdfExportController.php` exists and uses dompdf [VERIFIED - exists per earlier audit]

### Frontend dompdf.js
```powershell
Get-Content D:\xampp\htdocs\sales-management\package.json | Select-String "dompdf"
  => "dompdf.js": "^2.0.0",
Select-String -Path D:\xampp\htdocs\sales-management\resources\js\**\* -Pattern "dompdf.js" => (no matches)
```
- Present in package.json, **not imported/used** in frontend code [VERIFIED]

### Browsershot/Puppeteer/Chrome
```powershell
Get-Content D:\xampp\htdocs\sales-management\composer.json | Select-String "browsershot|puppeteer" => (no matches)
Get-Content D:\xampp\htdocs\sales-management\package.json | Select-String "browsershot|puppeteer" => (no matches)
find node_modules for puppeteer* => none found [VERIFIED]
```
- **Not installed/present** [VERIFIED]

### QZ Tray
```powershell
grep-like for "qz" across repo => no references found [VERIFIED]
package.json has no qz-tray [VERIFIED]
```
- **Not present in current codebase** (Phase 28/AGENTS mention in general context, but not present now). Marked as CONFIRM per requirements.

### Fontsource
```powershell
Get-Content D:\xampp\htdocs\sales-management\package.json | Select-String "fontsource" => (no matches)
```
- **No @fontsource packages installed** (static or variable). [VERIFIED]

### Printing config / flags
```powershell
Test-Path D:\xampp\htdocs\sales-management\config\printing.php => False
grep "print_pipeline" across repo => no matches found
```
- `config/printing.php` does **not exist** [VERIFIED]
- `print_pipeline` company flag does **not exist** in codebase yet [VERIFIED]

### Print runtime
```powershell
Test-Path D:\xampp\htdocs\sales-management\resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx => True
```
- `UniversalPrintPipeline.tsx` exists [VERIFIED] (observed in earlier reads)

### Thermal Arabic encoding
- `resources/js/pages/settings/print-settings/renderers/EscPosBuilder.ts` contains Arabic Windows-1256 encoding logic (`ARABIC_WIN1256` / `encodeArabic`) [VERIFIED from earlier audit/context]

### Font stack
- `resources/js/pages/settings/print-settings/components/preview/shared.tsx` has `FONT_STACK` with 10 families [VERIFIED]

### toLocaleString / toFixed / Intl usage
- Patterns exist in codebase (Phase 28/earlier work noted); needs specific enumeration per requirements (done partially in context).

### Routes for printing
- Signed routes mentioned in requirements; QZ mentioned as "on the user's machine" - not present in codebase.

## ArabicGlyphShaper impact
- Only used by `app/Services/DocumentPrintService.php:7,48` (post-render HTML shaping before dompdf). If we disable dompdf for Arabic-safe Chrome path, this service/call path may become unused or need handling. Documented as concern.

## Gaps / UNREADABLE (only allowed categories)
- Active Apache MPM + thread count (httpd-mpm.conf has directives for all three MPMs but active one not determinable statically)
- Windows account running Apache service + Chrome launch capability by that account
- These are marked UNREADABLE in deviations as per requirements.
