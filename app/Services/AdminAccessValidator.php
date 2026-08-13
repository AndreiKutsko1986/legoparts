<?php

namespace App\Services;

use App\Models\AdminUser;
use App\Support\AdminKeyHelper;

class AdminAccessValidator
{
    private string $configApiKey;

    public function __construct()
    {
        $this->configApiKey = AdminKeyHelper::getRequiredApiKey();
    }

    public function isAuthorized(?string $providedKey): bool
    {
        if (AdminKeyHelper::keysMatch($providedKey, $this->configApiKey)) {
            return true;
        }

        if (empty($providedKey)) {
            return false;
        }

        $userApiKeys = AdminUser::where('is_active', true)
            ->where('full_access', true)
            ->pluck('api_key');

        foreach ($userApiKeys as $apiKey) {
            if (AdminKeyHelper::keysMatch($providedKey, $apiKey)) {
                return true;
            }
        }

        return false;
    }
}
