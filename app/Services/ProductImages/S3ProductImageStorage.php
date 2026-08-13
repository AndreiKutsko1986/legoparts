<?php

namespace App\Services\ProductImages;

use Aws\S3\S3Client;

class S3ProductImageStorage implements ProductImageStorageInterface
{
    public function __construct(private ProductImageUploadValidator $validator) {}

    public function getProvider(): string { return 's3'; }

    public function getLabel(): string { return 'S3 + CDN'; }

    public function getDescription(): string
    {
        return $this->isConfigured()
            ? 'Файл загружается в S3-совместимое хранилище, ссылка строится через CDN.'
            : 'Заполните S3_* в .env (SERVICE_URL, BUCKET, ACCESS_KEY, SECRET_KEY, CDN_BASE_URL).';
    }

    public function isAvailable(): bool
    {
        return (bool) config('product_images.s3.enabled') && $this->isConfigured();
    }

    public function upload(string $filePath, string $contentType, string $originalFileName): array
    {
        if (!config('product_images.s3.enabled')) {
            throw new \InvalidArgumentException('S3-хранилище отключено. Установите S3_ENABLED=true.');
        }

        if (!$this->isConfigured()) {
            throw new \InvalidArgumentException(
                'S3-хранилище не настроено. Заполните S3_SERVICE_URL, S3_BUCKET, S3_ACCESS_KEY и S3_SECRET_KEY.'
            );
        }

        $size = filesize($filePath);
        $this->validator->validate($size, $contentType, $originalFileName);

        $ext       = $this->validator->resolveExtension($contentType, $originalFileName);
        $prefix    = trim(config('product_images.s3.key_prefix', 'products'), '/');
        $objectKey = $prefix . '/' . bin2hex(random_bytes(16)) . $ext;

        $client = $this->createClient();
        $client->putObject([
            'Bucket'      => config('product_images.s3.bucket'),
            'Key'         => $objectKey,
            'SourceFile'  => $filePath,
            'ContentType' => $contentType,
        ]);

        $url = $this->buildPublicUrl($objectKey);

        return ['provider' => $this->getProvider(), 'url' => $url, 'storageKey' => $objectKey];
    }

    private function createClient(): S3Client
    {
        return new S3Client([
            'version'          => 'latest',
            'region'           => 'us-east-1',
            'endpoint'         => config('product_images.s3.service_url'),
            'use_path_style_endpoint' => (bool) config('product_images.s3.force_path_style'),
            'credentials'      => [
                'key'    => config('product_images.s3.access_key'),
                'secret' => config('product_images.s3.secret_key'),
            ],
        ]);
    }

    private function buildPublicUrl(string $objectKey): string
    {
        $cdn = config('product_images.s3.cdn_base_url', '');
        if (!empty(trim($cdn))) {
            return rtrim($cdn, '/') . '/' . $objectKey;
        }

        $serviceUrl = rtrim(config('product_images.s3.service_url', ''), '/');
        $bucket     = config('product_images.s3.bucket');
        return "{$serviceUrl}/{$bucket}/{$objectKey}";
    }

    private function isConfigured(): bool
    {
        return !empty(config('product_images.s3.service_url'))
            && !empty(config('product_images.s3.bucket'))
            && !empty(config('product_images.s3.access_key'))
            && !empty(config('product_images.s3.secret_key'));
    }
}
