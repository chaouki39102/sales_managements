<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ExportModuleCommand extends Command
{
    protected $signature = 'module:export
                            {name : Module name}
                            {--with-routes}
                            {--with-migrations}';

    protected $description = 'Export Laravel module files by module name';

    private array $files = [];

    // ==========================
    // 🚀 MAIN
    // ==========================

    public function handle()
    {
        $module = $this->argument('name');

        $this->info("🚀 Exporting module: {$module}");

        $this->scanModuleFiles($module);

        if ($this->option('with-routes')) {
            $this->includeRoutes($module);
        }

        if ($this->option('with-migrations')) {
            $this->includeMigrations($module);
        }

        if (empty($this->files)) {
            $this->error('❌ No files found.');
            return;
        }

        $this->generateOutput($module);

        $this->info('✅ Export completed.');
    }

    // ==========================
    // 🔍 MODULE SCAN
    // ==========================

    private function scanModuleFiles(string $module): void
    {
        $paths = [
            'Models'        => app_path('Models'),
            'Controllers'   => app_path('Http/Controllers'),
            'Services'      => app_path('Services'),
            'Repositories'  => app_path('Repositories'),
            'Requests'      => app_path('Http/Requests'),
            'Policies'      => app_path('Policies'),
        ];

        foreach ($paths as $group => $path) {

            if (!is_dir($path)) {
                continue;
            }

            $files = glob($path . '/**/*' . $module . '*.php', GLOB_BRACE);

            // fallback recursive
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($path)
            );

            foreach ($iterator as $file) {

                if (!$file->isFile()) {
                    continue;
                }

                if ($file->getExtension() !== 'php') {
                    continue;
                }

                $fileName = $file->getFilename();

                if (stripos($fileName, $module) !== false) {
                    $this->files[$group][] = $file->getPathname();

                    $this->line("📦 {$file->getPathname()}");
                }
            }
        }
    }

    // ==========================
    // 📡 ROUTES
    // ==========================

    private function includeRoutes(string $module): void
    {
        foreach (glob(base_path('routes/*.php')) as $file) {

            $content = file_get_contents($file);

            if (stripos($content, $module) !== false) {
                $this->files['Routes'][] = $file;

                $this->line("🛣️ {$file}");
            }
        }
    }

    // ==========================
    // 🗄️ MIGRATIONS
    // ==========================

    private function includeMigrations(string $module): void
    {
        foreach (glob(database_path('migrations/*.php')) as $file) {

            if (stripos($file, $module) !== false) {
                $this->files['Migrations'][] = $file;

                $this->line("🗄️ {$file}");
            }
        }
    }

    // ==========================
    // 📄 OUTPUT
    // ==========================

    private function generateOutput(string $module): void
    {
        $outputFile = base_path("export_{$module}.md");

        $content = "# Module Export: {$module}\n";
        $content .= "Generated at: " . now() . "\n\n";

        foreach ($this->files as $group => $files) {

            if (empty($files)) {
                continue;
            }

            $content .= "## {$group}\n\n";

            foreach (array_unique($files) as $file) {

                if (!file_exists($file)) {
                    continue;
                }

                $content .= "### 📁 {$file}\n";
                $content .= "```php\n";
                $content .= file_get_contents($file);
                $content .= "\n```\n\n";
            }
        }

        file_put_contents($outputFile, $content);

        $this->info("📄 Exported: {$outputFile}");
    }
}
