<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RecursiveIteratorIterator;
use RecursiveDirectoryIterator;

class ExportModuleCommand extends Command
{
    protected $signature = 'module:export 
                            {name : Module name (e.g. Invoice)} 
                            {--with-routes}
                            {--with-migrations}';

    protected $description = 'Smart export of Laravel module with dependency graph and sorting';

    private array $visited = [];
    private array $files = [];   // unique set
    private array $graph = [];   // dependency graph

    // ==========================
    // 🚀 MAIN
    // ==========================

    public function handle()
    {
        $module = $this->argument('name');

        $this->info("🚀 Exporting module: {$module}");

        $entries = $this->findEntryPoints($module);

        if (empty($entries)) {
            $this->error("❌ No entry files found.");
            return;
        }

        foreach ($entries as $file) {
            $this->processFile($file);
        }

        if ($this->option('with-routes')) {
            $this->includeRoutes($module);
        }

        if ($this->option('with-migrations')) {
            $this->includeMigrations($module);
        }

        $this->generateOutput($module);
        $this->generateGraph($module);

        $this->info("✅ Export completed.");
    }

    // ==========================
    // 🔍 ENTRY POINTS
    // ==========================

    private function findEntryPoints(string $module): array
    {
        $results = [];

        $iterator = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(app_path())
        );

        foreach ($iterator as $file) {
            if ($file->getExtension() !== 'php') continue;

            $content = file_get_contents($file->getPathname());

            if (
                str_contains($content, "class {$module}") ||
                str_contains($content, "{$module}Controller")
            ) {
                $results[] = $file->getPathname();
            }
        }

        return array_unique($results);
    }

    // ==========================
    // 🔗 PROCESS FILE
    // ==========================

    private function processFile(string $file)
    {
        if (isset($this->visited[$file])) return;
        if (!file_exists($file)) return;

        $this->visited[$file] = true;
        $this->files[$file] = true;

        $this->line("📦 " . $file);

        $content = file_get_contents($file);

        // create graph node
        if (!isset($this->graph[$file])) {
            $this->graph[$file] = [];
        }

        // 1. use statements
        preg_match_all('/use\s+([^;]+);/', $content, $uses);

        foreach ($uses[1] as $class) {
            $path = $this->resolveClass($class);

            if ($path) {
                $this->graph[$file][$path] = true;
                $this->processFile($path);
            }
        }

        // 2. constructor injection
        preg_match_all('/__construct\s*\(([^)]*)\)/', $content, $constructors);

        foreach ($constructors[1] as $params) {
            preg_match_all('/([A-Z][A-Za-z0-9_\\\\]+)/', $params, $matches);

            foreach ($matches[1] as $class) {
                $path = $this->resolveClass($class);

                if ($path) {
                    $this->graph[$file][$path] = true;
                    $this->processFile($path);
                }
            }
        }
    }

    // ==========================
    // 🧠 CLASS RESOLVER
    // ==========================

    private function resolveClass(string $class): ?string
    {
        if (!str_starts_with($class, 'App\\')) return null;

        $relative = str_replace('App\\', '', $class);
        $relative = str_replace('\\', '/', $relative);

        $path = app_path($relative . '.php');

        return file_exists($path) ? $path : null;
    }

    // ==========================
    // 📡 ROUTES
    // ==========================

    private function includeRoutes(string $module)
    {
        foreach (glob(base_path('routes/*.php')) as $file) {
            $content = file_get_contents($file);

            if (str_contains($content, $module)) {
                $this->files[$file] = true;
            }
        }
    }

    // ==========================
    // 🗄️ MIGRATIONS
    // ==========================

    private function includeMigrations(string $module)
    {
        foreach (glob(database_path('migrations/*.php')) as $file) {
            if (str_contains(strtolower($file), strtolower($module))) {
                $this->files[$file] = true;
            }
        }
    }

    // ==========================
    // 📊 TOPOLOGICAL SORT
    // ==========================

    private function sortByDependency(): array
    {
        $visited = [];
        $temp = [];
        $result = [];

        $visit = function ($node) use (&$visit, &$visited, &$temp, &$result) {
            if (isset($visited[$node])) return;
            if (isset($temp[$node])) return;

            $temp[$node] = true;

            foreach ($this->graph[$node] ?? [] as $dep => $_) {
                $visit($dep);
            }

            $visited[$node] = true;
            $result[] = $node;
        };

        foreach (array_keys($this->graph) as $node) {
            $visit($node);
        }

        return $result;
    }

    // ==========================
    // 📄 OUTPUT
    // ==========================

    private function generateOutput(string $module)
    {
        $outputFile = base_path("export_{$module}.md");

        $content = "# Module Export: {$module}\n";
        $content .= "Generated at: " . now() . "\n\n";

        $sorted = $this->sortByDependency();
        $groups = $this->groupFiles();

        foreach ($groups as $group => $files) {

            if (empty($files)) continue;

            $content .= "## {$group}\n\n";

            foreach ($sorted as $file) {

                if (!in_array($file, $files)) continue;

                $content .= "### 📁 {$file}\n";
                $content .= "```php\n";
                $content .= file_get_contents($file);
                $content .= "\n```\n\n";
            }
        }

        file_put_contents($outputFile, $content);

        $this->info("📄 Exported: {$outputFile}");
    }

    // ==========================
    // 🧩 GROUPING
    // ==========================

    private function groupFiles(): array
    {
        $groups = [
            'Models' => [],
            'Controllers' => [],
            'Services' => [],
            'Repositories' => [],
            'Requests' => [],
            'Resources' => [],
            'Policies' => [],
            'Others' => [],
        ];

        foreach (array_keys($this->files) as $file) {

            if (str_contains($file, 'Models')) $groups['Models'][] = $file;
            elseif (str_contains($file, 'Controllers')) $groups['Controllers'][] = $file;
            elseif (str_contains($file, 'Services')) $groups['Services'][] = $file;
            elseif (str_contains($file, 'Repositories')) $groups['Repositories'][] = $file;
            elseif (str_contains($file, 'Requests')) $groups['Requests'][] = $file;
            elseif (str_contains($file, 'Resources')) $groups['Resources'][] = $file;
            elseif (str_contains($file, 'Policies')) $groups['Policies'][] = $file;
            else $groups['Others'][] = $file;
        }

        return $groups;
    }

    // ==========================
    // 📊 GRAPH OUTPUT
    // ==========================

private function generateGraph(string $module)
{
    $file = base_path("graph_{$module}.md");

    // ==========================
    // 🧠 Build unique edges
    // ==========================
    $edges = [];

    foreach ($this->graph as $from => $deps) {
        foreach ($deps as $to => $_) {

            $fromName = basename($from);
            $toName = basename($to);

            $key = $fromName . '->' . $toName;
            $edges[$key] = "  {$fromName} --> {$toName}";
        }
    }

    // ==========================
    // 📊 Graph
    // ==========================
    $out = "# 📊 Dependency Graph: {$module}\n\n";

    $out .= "```mermaid\n";
    $out .= "graph TD\n";

    foreach ($edges as $line) {
        $out .= $line . "\n";
    }

    $out .= "```\n\n";

    // ==========================
    // 🧠 SOURCE CODE SECTION
    // ==========================
    $out .= "# 📦 SOURCE CODE\n\n";

    $sorted = $this->sortByDependency();

    $printed = [];

    foreach ($sorted as $filePath) {

        if (!isset($this->files[$filePath])) continue;
        if (isset($printed[$filePath])) continue;
        if (!file_exists($filePath)) continue;

        $printed[$filePath] = true;

        $out .= "## 📁 " . $filePath . "\n";
        $out .= "```php\n";
        $out .= file_get_contents($filePath);
        $out .= "\n```\n\n";
    }

    file_put_contents($file, $out);

    $this->info("📊 Graph + Code generated: {$file}");
}
}