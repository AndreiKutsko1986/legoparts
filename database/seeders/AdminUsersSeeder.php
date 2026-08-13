<?php

namespace Database\Seeders;

use App\Models\AdminUser;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminUsersSeeder extends Seeder
{
    public function run(): void
    {
        $login    = config('admin.bootstrap_login', '');
        $password = config('admin.bootstrap_password', '');

        if (empty(trim($login)) || empty(trim($password))) {
            $this->command->warn('ADMIN_BOOTSTRAP_LOGIN / ADMIN_BOOTSTRAP_PASSWORD не заданы — пользователь не создан.');
            return;
        }

        $existing = AdminUser::where('login', $login)->first();

        if ($existing) {
            $this->command->info("Администратор «{$login}» уже существует — пропуск.");
            return;
        }

        $apiKey = base64_encode(random_bytes(32));

        AdminUser::create([
            'id'            => (string) Str::uuid(),
            'login'         => $login,
            'password_hash' => password_hash($password, PASSWORD_BCRYPT),
            'api_key'       => $apiKey,
            'is_active'     => true,
            'full_access'   => true,
            'created_at'    => now(),
        ]);

        $this->command->info("Администратор «{$login}» создан.");
        $this->command->line("API-ключ: {$apiKey}");
        $this->command->line('Сохраните ключ в надёжном месте — он больше не будет показан.');
    }
}
