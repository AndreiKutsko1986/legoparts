<?php

namespace App\Services\ProductImages;

interface ProductImageStorageInterface
{
    public function getProvider(): string;

    public function getLabel(): string;

    public function getDescription(): string;

    public function isAvailable(): bool;

    /**
     * @return array{provider: string, url: string, storageKey: string}
     */
    public function upload(string $filePath, string $contentType, string $originalFileName): array;
}
