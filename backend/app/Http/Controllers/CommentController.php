<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class CommentController extends Controller
{
    /**
     * GET /api/v1/comments?post_id=
     */
    public function index(Request $request)
    {
        $postId = $request->query('post_id');
        
        $query = Comment::query()->approved()->orderByDesc('created_at');
        
        if ($postId) {
            $query->where('post_id', $postId);
        }
        
        $comments = $query->get();
        
        return response()->json($comments);
    }

    /**
     * POST /api/v1/comments
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'post_id' => ['nullable', 'integer', 'exists:post,id'],
            'name'    => ['required', 'string', 'max:191'],
            'email'   => ['required', 'email', 'max:191'],
            'content' => ['required', 'string'],
        ]);

        $data['status'] = 1; // Auto approve
        $data['created_at'] = Carbon::now();
        $data['created_by'] = auth()->id() ?? null;

        $comment = Comment::create($data);
        
        // Load post relationship if exists
        if ($comment->post_id) {
            $comment->load('post');
        }

        // Tạo thông báo cho admin
        try {
            $postTitle = $comment->post ? $comment->post->title : 'Bài viết';
            Notification::create([
                'type' => 'comment',
                'title' => 'Bình luận mới',
                'message' => "{$data['name']} đã bình luận trên bài viết: {$postTitle}",
                'url' => $comment->post_id ? "/admin/posts/{$comment->post_id}" : "/admin/comments",
                'reference_id' => $comment->id,
                'is_read' => false,
            ]);
        } catch (\Exception $e) {
            \Log::error("Failed to create notification for comment", [
                'comment_id' => $comment->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json($comment, 201);
    }

    /**
     * GET /api/v1/comments/{id}
     */
    public function show(int $id)
    {
        $comment = Comment::findOrFail($id);
        return response()->json($comment);
    }
}

