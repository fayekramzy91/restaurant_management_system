<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AuditLogger
{
    /**
     * Keys that must never be stored in old_values / new_values.
     */
    private const SENSITIVE_KEYS = [
        'password',
        'token',
        'secret',
        'api_key',
        'remember_token',
        'current_password',
        'password_confirmation',
    ];

    /**
     * Record an audit event.
     *
     * Never throws — failures are logged as a warning and null is returned
     * so that the calling operation is never interrupted.
     */
    public function log(
        string  $action,
        ?Model  $auditable = null,
        array   $oldValues = [],
        array   $newValues = [],
        ?string $description = null,
    ): ?AuditLog {
        try {
            return AuditLog::create([
                'user_id'        => Auth::id(),
                'action'         => $action,
                'auditable_type' => $auditable ? get_class($auditable) : null,
                'auditable_id'   => $auditable?->getKey(),
                'old_values'     => empty($oldValues) ? null : self::sanitize($oldValues),
                'new_values'     => empty($newValues) ? null : self::sanitize($newValues),
                'description'    => $description,
                'ip_address'     => request()->ip(),
                'user_agent'     => request()->userAgent(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('AuditLogger failed', [
                'action' => $action,
                'error'  => $e->getMessage(),
            ]);

            return null;
        }
    }

    /**
     * Strip sensitive keys from a values array before storage.
     */
    public static function sanitize(array $values): array
    {
        return array_diff_key($values, array_flip(self::SENSITIVE_KEYS));
    }
}
