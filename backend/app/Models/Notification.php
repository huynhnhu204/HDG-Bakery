<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'type',
        'title',
        'message',
        'url',
        'reference_id',
        'is_read',
        'read_at',
        'read_by',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Mark notification as read
     */
    public function markAsRead($userId = null)
    {
        $this->update([
            'is_read' => true,
            'read_at' => now(),
            'read_by' => $userId,
        ]);
    }
}








