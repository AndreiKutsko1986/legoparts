<?php

namespace App\Http\Controllers;

use App\Models\ContactSubmission;
use App\Models\StoreContactSettings;
use App\Services\ContactAttachmentStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ContactController extends Controller
{
    public function info(): JsonResponse
    {
        $s = StoreContactSettings::firstOrCreate(
            ['id' => StoreContactSettings::SINGLETON_ID],
            StoreContactSettings::defaults()
        );

        return response()->json([
            'storeName'     => $s->store_name,
            'email'         => $s->email,
            'phone'         => $s->phone,
            'address'       => $s->address,
            'businessHours' => $s->business_hours,
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $request->validate([
            'name'    => 'required|string|max:200',
            'email'   => 'required|email|max:200',
            'subject' => 'required|string|max:200',
            'message' => 'required|string|max:4000',
        ]);

        $attachmentUrl      = null;
        $attachmentFileName = null;

        $file = $request->file('attachment');
        if ($file && $file->isValid()) {
            $result = ContactAttachmentStorage::save($file);
            if ($result) {
                $attachmentUrl      = $result['storageKey'];
                $attachmentFileName = $result['fileName'];
            }
        }

        $id         = (string) Str::uuid();
        $submission = new ContactSubmission([
            'id'                   => $id,
            'name'                 => trim($request->input('name')),
            'email'                => trim($request->input('email')),
            'subject'              => trim($request->input('subject')),
            'message'              => trim($request->input('message')),
            'attachment_url'       => $attachmentUrl,
            'attachment_file_name' => $attachmentFileName,
            'created_at'           => now(),
        ]);
        $submission->save();

        return response()->json([
            'id'                 => $id,
            'name'               => $submission->name,
            'email'              => $submission->email,
            'subject'            => $submission->subject,
            'message'            => $submission->message,
            'attachmentUrl'      => $attachmentUrl !== null ? "/api/admin/contact/messages/{$id}/attachment" : null,
            'attachmentFileName' => $attachmentFileName,
            'createdAt'          => $submission->created_at->toIso8601String(),
        ], 201);
    }
}
