<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ContactSubmission;
use App\Models\StoreContactSettings;
use App\Services\ContactAttachmentStorage;
use App\Support\Pagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AdminContactController extends Controller
{
    public function getSettings(): JsonResponse
    {
        $s = StoreContactSettings::firstOrCreate(
            ['id' => StoreContactSettings::SINGLETON_ID],
            StoreContactSettings::defaults()
        );

        return response()->json(self::mapContactInfo($s));
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'storeName'     => 'required|string|max:200',
            'email'         => 'required|email|max:200',
            'phone'         => 'required|string|max:50',
            'address'       => 'required|string|max:4000',
            'businessHours' => 'required|string|max:200',
        ]);

        $s = StoreContactSettings::firstOrNew(
            ['id' => StoreContactSettings::SINGLETON_ID],
            StoreContactSettings::defaults()
        );

        if (!$s->exists) {
            $s->id = StoreContactSettings::SINGLETON_ID;
        }

        $s->store_name     = trim($data['storeName']);
        $s->email          = trim($data['email']);
        $s->phone          = trim($data['phone']);
        $s->address        = trim($data['address']);
        $s->business_hours = trim($data['businessHours']);
        $s->updated_at     = now();
        $s->save();

        return response()->json(self::mapContactInfo($s));
    }

    public function messages(Request $request): JsonResponse
    {
        $page     = max(1, (int) $request->query('page', 1));
        $pageSize = min(Pagination::MAX_PAGE_SIZE, max(1, (int) $request->query('pageSize', Pagination::DEFAULT_PAGE_SIZE)));

        $skip = 0;
        $take = $pageSize;
        if (!Pagination::tryGetValues($page, $pageSize, $skip, $take)) {
            return response()->json(['message' => Pagination::errorMessage()], 422);
        }

        $total   = ContactSubmission::count();
        $records = ContactSubmission::orderByDesc('created_at')->skip($skip)->take($take)->get();

        return response()->json(
            $records->map(fn (ContactSubmission $s) => $this->mapSubmission($s))->values()->all()
        )->header('X-Total-Count', $total);
    }

    public function downloadAttachment(string $id): BinaryFileResponse|JsonResponse
    {
        $submission = ContactSubmission::findOrFail($id);

        if (empty($submission->attachment_url)) {
            return response()->json(['message' => 'Вложение не найдено.'], 404);
        }

        $filePath = ContactAttachmentStorage::getFilePath($submission->attachment_url);

        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Файл не найден.'], 404);
        }

        $downloadName = $submission->attachment_file_name ?? basename($filePath);
        return response()->download($filePath, $downloadName);
    }

    private function mapSubmission(ContactSubmission $s): array
    {
        return [
            'id'                 => $s->id,
            'name'               => $s->name,
            'email'              => $s->email,
            'subject'            => $s->subject,
            'message'            => $s->message,
            'attachmentUrl'      => $s->attachment_url !== null ? "/api/admin/contact/messages/{$s->id}/attachment" : null,
            'attachmentFileName' => $s->attachment_file_name,
            'createdAt'          => $s->created_at->toIso8601String(),
        ];
    }

    private static function mapContactInfo(StoreContactSettings $s): array
    {
        return [
            'storeName'     => $s->store_name,
            'email'         => $s->email,
            'phone'         => $s->phone,
            'address'       => $s->address,
            'businessHours' => $s->business_hours,
        ];
    }
}
