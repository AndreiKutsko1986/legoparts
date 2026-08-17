<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ProductImages\LocalDiskProductImageStorage;
use App\Services\ProductImages\ProductImageUploadValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminProductImagesController extends Controller
{
    public function __construct(
        private LocalDiskProductImageStorage $storage,
        private ProductImageUploadValidator $validator,
    ) {}

    public function upload(Request $request): JsonResponse
    {
        $file = $request->file('file');

        if (!$file || !$file->isValid()) {
            return response()->json(['message' => 'Файл не передан или повреждён.'], 422);
        }

        try {
            $this->validator->validate(
                $file->getSize(),
                $file->getMimeType() ?? 'application/octet-stream',
                $file->getClientOriginalName()
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $contentType = $file->getMimeType() ?? 'application/octet-stream';
        $result      = $this->storage->upload($file->getRealPath(), $contentType, $file->getClientOriginalName());

        return response()->json($result, 201);
    }
}
