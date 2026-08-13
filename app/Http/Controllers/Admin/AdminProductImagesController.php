<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ProductImages\ProductImageStorageFactory;
use App\Services\ProductImages\ProductImageUploadValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductImagesController extends Controller
{
    public function __construct(
        private ProductImageStorageFactory $factory,
        private ProductImageUploadValidator $validator,
    ) {}

    public function options(): JsonResponse
    {
        return response()->json([
            'defaultProvider' => $this->factory->getDefaultProvider(),
            'providers'       => $this->factory->getAvailableProviders(),
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $file = $request->file('file');

        if (!$file || !$file->isValid()) {
            return response()->json(['message' => 'Файл не передан или повреждён.'], 422);
        }

        $providerName = $request->query('provider') ?: $this->factory->getDefaultProvider();

        try {
            $this->validator->validate(
                $file->getSize(),
                $file->getMimeType() ?? 'application/octet-stream',
                $file->getClientOriginalName()
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        try {
            $storage = $this->factory->resolve($providerName);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if (!$storage->isAvailable()) {
            return response()->json(['message' => "Провайдер «{$providerName}» недоступен."], 422);
        }

        $contentType = $file->getMimeType() ?? 'application/octet-stream';
        $result      = $storage->upload($file->getRealPath(), $contentType, $file->getClientOriginalName());

        return response()->json($result, 201);
    }
}
