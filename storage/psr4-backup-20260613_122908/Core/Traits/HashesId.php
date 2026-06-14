<?php

namespace App\Core\Traits;

use Vinkla\Hashids\Facades\Hashids;
use Illuminate\Support\Facades\Log;

/**
 * HashesId Trait - Enhanced v2.0
 *
 * IMPROVEMENTS:
 * - ✅ Comprehensive error handling
 * - ✅ Logging for debugging
 * - ✅ Better validation
 * - ✅ Support for custom error messages
 * - ✅ Added helper methods
 */
trait HashesId
{
    /**
     * Get the hashed route key for the model
     */
    public function getRouteKey()
    {
        try {
            $id = $this->getKey();

            if (empty($id)) {
                Log::warning('HashesId: Attempted to hash empty ID', [
                    'model' => get_class($this)
                ]);
                return null;
            }

            return Hashids::encode($id);

        } catch (\Throwable $e) {
            Log::error('HashesId: Failed to encode ID', [
                'model' => get_class($this),
                'id' => $this->getKey(),
                'error' => $e->getMessage()
            ]);

            // Fallback to original ID in case of error
            return $this->getKey();
        }
    }

    /**
     * ✅ Retrieve the model for a bound value (Enhanced with error handling)
     */
    public function resolveRouteBinding($value, $field = null)
    {
        try {
            // 1. Validate input
            if (empty($value)) {
                return null;
            }

            // 2. Try to decode the hash
            $decoded = Hashids::decode($value);

            if (empty($decoded)) {
                Log::debug('HashesId: Failed to decode hash', [
                    'model' => get_class($this),
                    'value' => $value
                ]);

                // ✅ Throw 404 instead of returning null
                abort(404, $this->getNotFoundMessage());
            }

            $id = $decoded[0];

            // 3. Validate decoded ID
            if (!is_numeric($id) || $id <= 0) {
                Log::warning('HashesId: Invalid decoded ID', [
                    'model' => get_class($this),
                    'value' => $value,
                    'decoded' => $id
                ]);

                abort(404, $this->getNotFoundMessage());
            }

            // 4. Find the model
            $model = $this->where($this->getRouteKeyName(), $id)->first();

            if (!$model) {
                Log::info('HashesId: Model not found', [
                    'model' => get_class($this),
                    'id' => $id,
                    'hash' => $value
                ]);

                abort(404, $this->getNotFoundMessage());
            }

            return $model;

        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) {
            // Re-throw HTTP exceptions (like 404)
            throw $e;

        } catch (\Throwable $e) {
            Log::error('HashesId: Unexpected error in route binding', [
                'model' => get_class($this),
                'value' => $value,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            abort(500, 'An error occurred while processing your request.');
        }
    }

    /**
     * ✅ Get custom "not found" message
     */
    protected function getNotFoundMessage(): string
    {
        $modelName = class_basename(get_class($this));

        // Check if model has custom message property
        if (property_exists($this, 'notFoundMessage')) {
            return $this->notFoundMessage;
        }

        return __('messages.model_not_found', [
            'model' => $modelName
        ], "{$modelName} not found.");
    }

    /**
     * ✅ Encode an ID to hash (static helper)
     */
    public static function encodeId($id): ?string
    {
        try {
            if (empty($id) || !is_numeric($id)) {
                return null;
            }

            return Hashids::encode($id);

        } catch (\Throwable $e) {
            Log::error('HashesId: Static encode failed', [
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * ✅ Decode a hash to ID (static helper)
     */
    public static function decodeId(string $hash): ?int
    {
        try {
            if (empty($hash)) {
                return null;
            }

            $decoded = Hashids::decode($hash);

            if (empty($decoded)) {
                return null;
            }

            return $decoded[0];

        } catch (\Throwable $e) {
            Log::error('HashesId: Static decode failed', [
                'hash' => $hash,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * ✅ Check if a value is a valid hash
     */
    public static function isValidHash(string $value): bool
    {
        try {
            $decoded = Hashids::decode($value);
            return !empty($decoded) && is_numeric($decoded[0]) && $decoded[0] > 0;

        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * ✅ Get hashed ID attribute (for API responses)
     */
    public function getHashedIdAttribute(): ?string
    {
        return $this->getRouteKey();
    }

    /**
     * ✅ Get URL with hashed ID
     */
    public function getUrlAttribute(): string
    {
        $routeName = $this->getRouteNameForUrl();
        $hashedId = $this->getRouteKey();

        if (!$routeName || !$hashedId) {
            return '#';
        }

        try {
            return route($routeName, ['id' => $hashedId]);
        } catch (\Throwable $e) {
            Log::error('HashesId: Failed to generate URL', [
                'model' => get_class($this),
                'route' => $routeName,
                'id' => $hashedId,
                'error' => $e->getMessage()
            ]);
            return '#';
        }
    }

    /**
     * ✅ Get route name for URL generation
     * Override this in your model if needed
     */
    protected function getRouteNameForUrl(): ?string
    {
        // Default pattern: model.show
        $modelName = strtolower(class_basename(get_class($this)));
        return "{$modelName}.show";
    }

    /**
     * ✅ Append hashed_id to array/JSON output
     */
    public function initializeHashesId(): void
    {
        // Automatically append hashed_id when model is converted to array/JSON
        if (!in_array('hashed_id', $this->appends)) {
            $this->append('hashed_id');
        }
    }
}
