<?php

namespace App\Services\ProductImages;

class LocalDiskProductImageStorage implements ProductImageStorageInterface
{
    private string $absoluteRootPath;

    public function __construct(private ProductImageUploadValidator $validator)
    {
        $rootPath = config('product_images.local.root_path', 'uploads/products');

        $this->absoluteRootPath = str_starts_with($rootPath, '/')
            ? $rootPath
            : base_path($rootPath);

        if (!is_dir($this->absoluteRootPath)) {
            mkdir($this->absoluteRootPath, 0755, true);
        }
    }

    public function getProvider(): string { return 'local'; }

    public function getLabel(): string { return 'Диск сервера'; }

    public function getDescription(): string
    {
        return 'Файл сохраняется в папку на сервере и отдаётся по URL API.';
    }

    public function isAvailable(): bool { return true; }

    public function upload(string $filePath, string $contentType, string $originalFileName): array
    {
        $size = filesize($filePath);
        $this->validator->validate($size, $contentType, $originalFileName);

        $ext      = $this->validator->resolveExtension($contentType, $originalFileName);
        $fileName = bin2hex(random_bytes(16)) . $ext;
        $destPath = $this->absoluteRootPath . DIRECTORY_SEPARATOR . $fileName;

        if (!copy($filePath, $destPath)) {
            throw new \RuntimeException('Не удалось сохранить файл изображения.');
        }

        $publicBaseUrl = rtrim(config('product_images.local.public_base_url', ''), '/');
        $url           = $publicBaseUrl . '/' . $fileName;

        return ['provider' => $this->getProvider(), 'url' => $url, 'storageKey' => $fileName];
    }
}
