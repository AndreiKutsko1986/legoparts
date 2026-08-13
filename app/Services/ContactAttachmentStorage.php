<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;

class ContactAttachmentStorage
{
    private const MAX_FILE_SIZE = 5 * 1024 * 1024;

    private static array $allowedExtensions = [
        'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'doc', 'docx', 'zip',
    ];

    public static function save(UploadedFile $file): ?array
    {
        if ($file->getSize() === 0) {
            return null;
        }

        if ($file->getSize() > self::MAX_FILE_SIZE) {
            throw new \InvalidArgumentException('Размер файла не должен превышать 5 МБ.');
        }

        $ext = strtolower($file->getClientOriginalExtension());
        if ($ext === '' || !in_array($ext, self::$allowedExtensions, true)) {
            throw new \InvalidArgumentException('Недопустимый тип файла.');
        }

        $root = self::getPrivateRoot();
        if (!is_dir($root)) {
            mkdir($root, 0755, true);
        }

        $storedFileName = bin2hex(random_bytes(16)) . '.' . $ext;
        $file->move($root, $storedFileName);

        return [
            'storageKey' => $storedFileName,
            'fileName'   => $file->getClientOriginalName(),
        ];
    }

    public static function getFilePath(string $storageKeyOrUrl): string
    {
        $fileName = self::getStoredFileName($storageKeyOrUrl);

        if ($fileName === null || $fileName !== basename($fileName)) {
            throw new \InvalidArgumentException('Недопустимое вложение.');
        }

        $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        if (!in_array($ext, self::$allowedExtensions, true)) {
            throw new \InvalidArgumentException('Недопустимое вложение.');
        }

        $privatePath = self::getPrivateRoot() . DIRECTORY_SEPARATOR . $fileName;
        if (file_exists($privatePath)) {
            return $privatePath;
        }

        // Legacy: attachments stored in the public uploads folder before migration
        $legacyRoot = base_path(config('product_images.local.root_path', 'uploads/products'));
        return $legacyRoot . DIRECTORY_SEPARATOR . 'contact-attachments' . DIRECTORY_SEPARATOR . $fileName;
    }

    public static function getStoredFileName(?string $storageKeyOrUrl): ?string
    {
        if (empty($storageKeyOrUrl)) {
            return null;
        }

        $value = trim($storageKeyOrUrl);

        if (filter_var($value, FILTER_VALIDATE_URL)) {
            $parsed   = parse_url($value);
            $fileName = basename($parsed['path'] ?? '');
        } else {
            $fileName = $value;
        }

        if ($fileName !== basename($fileName)) {
            return null;
        }

        return $fileName;
    }

    private static function getPrivateRoot(): string
    {
        return storage_path('app/private/contact-attachments');
    }
}
