<?php

namespace App\Services\ProductImages;

class ProductImageUploadValidator
{
    private static array $extensionByContentType = [
        'image/jpeg'               => '.jpg',
        'image/png'                => '.png',
        'image/webp'               => '.webp',
        'image/gif'                => '.gif',
        'image/svg+xml'            => '.svg',
        'image/x-icon'             => '.ico',
        'image/vnd.microsoft.icon' => '.ico',
    ];

    public function validate(int $size, string $contentType, string $originalFileName): void
    {
        $maxSize = config('product_images.max_file_size', 5 * 1024 * 1024);

        if ($size <= 0) {
            throw new \InvalidArgumentException('Файл изображения пуст.');
        }

        if ($size > $maxSize) {
            $mb = intdiv($maxSize, 1024 * 1024);
            throw new \InvalidArgumentException("Размер файла превышает {$mb} МБ.");
        }

        $contentType = $this->normalizeContentType($contentType, $originalFileName);
        $allowed = config('product_images.allowed_content_types', []);

        if (!in_array(strtolower($contentType), array_map('strtolower', $allowed), true)) {
            throw new \InvalidArgumentException('Допустимы только изображения JPEG, PNG, WebP, GIF, SVG и ICO.');
        }

        $ext = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
        if ($ext !== '' && !in_array('.' . $ext, array_values(self::$extensionByContentType), true)) {
            throw new \InvalidArgumentException('Недопустимое расширение файла изображения.');
        }
    }

    public function resolveExtension(string $contentType, string $originalFileName): string
    {
        $contentType = $this->normalizeContentType($contentType, $originalFileName);

        if (isset(self::$extensionByContentType[strtolower($contentType)])) {
            return self::$extensionByContentType[strtolower($contentType)];
        }

        $ext = pathinfo($originalFileName, PATHINFO_EXTENSION);
        return $ext !== '' ? '.' . strtolower($ext) : '.jpg';
    }

    private function normalizeContentType(string $contentType, string $originalFileName): string
    {
        $ext = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));

        if ($ext === 'svg' && (trim($contentType) === '' || $contentType === 'application/octet-stream')) {
            return 'image/svg+xml';
        }

        if ($ext === 'ico' && (trim($contentType) === '' || $contentType === 'application/octet-stream')) {
            return 'image/x-icon';
        }

        return $contentType;
    }
}
