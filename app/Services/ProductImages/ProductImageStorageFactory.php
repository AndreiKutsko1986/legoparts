<?php

namespace App\Services\ProductImages;

use Illuminate\Container\Container;

class ProductImageStorageFactory
{
    public function __construct(
        private LocalDiskProductImageStorage $localDisk,
        private Container $container
    ) {}

    public function getDefaultProvider(): string
    {
        $configured = config('product_images.default_provider', 'local');

        if (strcasecmp($configured, 's3') === 0 && config('product_images.s3.enabled')) {
            return 's3';
        }

        return 'local';
    }

    public function getAvailableProviders(): array
    {
        $s3 = $this->container->make(S3ProductImageStorage::class);

        return [
            [
                'provider'    => $this->localDisk->getProvider(),
                'label'       => $this->localDisk->getLabel(),
                'description' => $this->localDisk->getDescription(),
                'isAvailable' => $this->localDisk->isAvailable(),
            ],
            [
                'provider'    => $s3->getProvider(),
                'label'       => $s3->getLabel(),
                'description' => $s3->getDescription(),
                'isAvailable' => $s3->isAvailable(),
            ],
        ];
    }

    public function resolve(string $provider): ProductImageStorageInterface
    {
        return match (strtolower($provider)) {
            'local' => $this->localDisk,
            's3'    => $this->container->make(S3ProductImageStorage::class),
            default => throw new \InvalidArgumentException('Неизвестный способ хранения изображения.'),
        };
    }
}
