<?php
// app/Services/CompanyContextService.php
namespace App\Services;

class CompanyContextService
{
    private ?int $companyId = null;

    public function set(int $id): void
    {
        $this->companyId = $id;
    }

    public function get(): ?int
    {
        return $this->companyId;
    }

    public function has(): bool
    {
        return $this->companyId !== null;
    }

    public function clear(): void
    {
        $this->companyId = null;
    }

    /**
     * تنفيذ كود ضمن سياق شركة مؤقت — مفيد للـ Jobs والـ Artisan Commands
     */
    public function runAs(int $companyId, callable $callback): mixed
    {
        $previous = $this->companyId;
        $this->companyId = $companyId;

        try {
            return $callback();
        } finally {
            $this->companyId = $previous;
        }
    }
}
