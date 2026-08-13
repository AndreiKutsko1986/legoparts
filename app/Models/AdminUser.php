<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminUser extends Model
{
    public $timestamps = false;

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'id', 'login', 'password_hash', 'api_key', 'is_active', 'full_access', 'created_at',
    ];

    protected $hidden = ['password_hash', 'api_key'];

    protected $casts = [
        'is_active'   => 'boolean',
        'full_access' => 'boolean',
        'created_at'  => 'datetime',
    ];
}
