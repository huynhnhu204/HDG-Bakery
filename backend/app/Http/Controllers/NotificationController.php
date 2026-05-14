<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    /**
     * GET /api/v1/admin/notifications
     * Lấy danh sách thông báo
     */
    public function index(Request $request)
    {
        try {
            $limit = (int) $request->query('limit', 20);
            $unreadOnly = $request->query('unread_only', false);

            \Log::info("NotificationController::index called", [
                'limit' => $limit,
                'unread_only' => $unreadOnly,
                'user_id' => auth()->id(),
            ]);

            $query = Notification::query()
                ->orderByDesc('created_at');

            if ($unreadOnly) {
                $query->where('is_read', false);
            }

            $notifications = $query->limit($limit)->get();
            \Log::info("NotificationController: Found " . $notifications->count() . " notifications");

            // Đếm số thông báo chưa đọc
            $unreadCount = Notification::where('is_read', false)->count();
            \Log::info("NotificationController: Unread count: " . $unreadCount);

            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
            ]);
        } catch (\Exception $e) {
            \Log::error("Failed to fetch notifications: " . $e->getMessage(), [
                'exception' => $e->getTraceAsString(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
            // Trả về empty array nếu có lỗi nhưng vẫn log chi tiết
            return response()->json([
                'notifications' => [],
                'unread_count' => 0,
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 200);
        }
    }

    /**
     * POST /api/v1/admin/notifications/{id}/read
     * Đánh dấu thông báo đã đọc
     */
    public function markAsRead($id)
    {
        $notification = Notification::findOrFail($id);
        $userId = auth()->id();

        $notification->markAsRead($userId);

        // Đếm lại số thông báo chưa đọc
        $unreadCount = Notification::where('is_read', false)->count();

        return response()->json([
            'message' => 'Notification marked as read',
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * POST /api/v1/admin/notifications/read-all
     * Đánh dấu tất cả thông báo đã đọc
     */
    public function markAllAsRead()
    {
        $userId = auth()->id();
        
        Notification::where('is_read', false)->update([
            'is_read' => true,
            'read_at' => now(),
            'read_by' => $userId,
        ]);

        return response()->json([
            'message' => 'All notifications marked as read',
            'unread_count' => 0,
        ]);
    }

    /**
     * GET /api/v1/admin/notifications/unread-count
     * Lấy số lượng thông báo chưa đọc
     */
    public function unreadCount()
    {
        $count = Notification::where('is_read', false)->count();
        return response()->json(['count' => $count]);
    }
}


