<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value', 'group'];

    public static function getValue($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function setMany(array $settings)
    {
        foreach ($settings as $key => $value) {
            self::updateOrCreate(['key' => $key], ['value' => $value]);
        }
    }

    public static function getAllAsArray(): array
    {
        return static::pluck('value', 'key')->toArray();
    }
}
