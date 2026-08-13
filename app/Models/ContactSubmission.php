<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContactSubmission extends Model
{
    public $timestamps = false;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'name', 'email', 'subject', 'message',
        'attachment_url', 'attachment_file_name', 'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];
}
