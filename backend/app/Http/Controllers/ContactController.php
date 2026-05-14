<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class ContactController extends Controller
{
    /**
     * GET /api/contacts?q=&status=&page=
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $status = $request->query('status');

        $rs = Contact::query()
            ->when($q !== '', function ($qBuilder) use ($q) {
                $qBuilder->where(function ($x) use ($q) {
                    $x->where('name', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%")
                      ->orWhere('content', 'like', "%{$q}%");
                });
            })
            ->when($status !== null && $status !== '', function ($qb) use ($status) {
                $qb->where('status', (int) $status);
            })
            ->orderByDesc('id')
            ->paginate(10);

        return response()->json($rs);
    }

    /**
     * POST /api/contacts
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'integer', 'min:0'],
            'name'    => ['required', 'string', 'max:191'],
            'email'   => ['required', 'email', 'max:191'],
            'phone'   => ['required', 'string', 'max:50'],
            'content' => ['required', 'string'],
        ]);

        $data['reply_id']   = 0;
        $data['created_at'] = Carbon::now();
        $data['created_by'] = auth()->id ?? 1;
        $data['status']     = 1;

        $contact = Contact::create($data);

        // Tạo thông báo cho admin
        try {
            $notification = Notification::create([
                'type' => 'contact',
                'title' => 'Liên hệ mới',
                'message' => "Tin nhắn từ {$data['name']} ({$data['email']})",
                'url' => "/admin/contacts/{$contact->id}",
                'reference_id' => $contact->id,
                'is_read' => false,
            ]);
            \Log::info("Notification created for contact {$contact->id}: notification ID {$notification->id}");
        } catch (\Exception $e) {
            \Log::error("Failed to create notification for contact {$contact->id}: " . $e->getMessage(), [
                'exception' => $e->getTraceAsString(),
                'contact_id' => $contact->id,
            ]);
        }

        return response()->json($contact, 201);
    }

    /**
     * GET /api/contacts/{id}
     */
    public function show(int $id)
    {
        $contact = Contact::findOrFail($id);
        return response()->json($contact);
    }

    /**
     * PUT/PATCH /api/contacts/{id}
     */
    public function update(Request $request, int $id)
    {
        $contact = Contact::findOrFail($id);

        $data = $request->validate([
            'user_id'   => ['nullable', 'integer', 'min:0'],
            'name'      => ['sometimes', 'required', 'string', 'max:191'],
            'email'     => ['sometimes', 'required', 'email', 'max:191'],
            'phone'     => ['sometimes', 'required', 'string', 'max:50'],
            'content'   => ['sometimes', 'required', 'string'],
            'reply_id'  => ['sometimes', 'integer', 'min:0'],
            'status'    => ['sometimes', 'integer', Rule::in([0,1])],
        ]);

        $data['updated_at'] = Carbon::now();
        $data['updated_by'] = auth()->id ?? 1;

        $contact->fill($data)->save();

        return response()->json($contact);
    }

    /**
     * DELETE /api/contacts/{id} — Đưa vào thùng rác (status=0)
     */
    public function destroy(int $id)
    {
        $contact = Contact::findOrFail($id);
        $contact->status     = 0;
        $contact->updated_at = Carbon::now();
        $contact->updated_by = auth()->id() ?? 1;
        $contact->save();

        return response()->json(['message' => 'Hidden']);
    }

    /** GET /api/v1/contacts/trash — danh sách đang ẩn (status=0) */
    public function trash(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $perPage = max(1, (int) $request->query('per_page', 20));

        $rs = Contact::query()
            ->where('status', 0)
            ->when($q !== '', function ($qBuilder) use ($q) {
                $qBuilder->where(function ($x) use ($q) {
                    $x->where('name', 'like', "%{$q}%")
                      ->orWhere('email', 'like', "%{$q}%")
                      ->orWhere('phone', 'like', "%{$q}%")
                      ->orWhere('content', 'like', "%{$q}%");
                });
            })
            ->orderByDesc('updated_at')
            ->paginate($perPage);

        return response()->json([
            'data'         => $rs->items(),
            'total'        => $rs->total(),
            'last_page'    => $rs->lastPage(),
            'current_page' => $rs->currentPage(),
            'per_page'     => $rs->perPage(),
        ]);
    }

    /** POST /api/v1/contacts/{id}/restore — khôi phục từ thùng rác */
    public function restore(int $id)
    {
        $contact = Contact::findOrFail($id);
        $contact->status = 1;
        $contact->updated_at = Carbon::now();
        $contact->updated_by = auth()->id() ?? 1;
        $contact->save();

        return response()->json(['message' => 'Restored']);
    }

    /** POST /api/v1/contacts/restore  body: { ids: [] } */
    public function bulkRestore(Request $request)
    {
        $ids = (array)$request->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Contact::whereIn('id', $ids)->update([
            'status'     => 1,
            'updated_at' => Carbon::now(),
            'updated_by' => auth()->id() ?? 1,
        ]);

        return response()->json(['message' => 'Restored', 'count' => count($ids)]);
    }

    /** DELETE /api/v1/contacts/{id}/purge — xoá vĩnh viễn */
    public function purge(int $id)
    {
        $contact = Contact::findOrFail($id);
        $contact->delete();

        return response()->json(['message' => 'Purged']);
    }

    /** DELETE /api/v1/contacts/purge  body: { ids: [] } */
    public function bulkPurge(Request $request)
    {
        $ids = (array)$request->input('ids', []);
        $ids = array_values(array_filter(array_map('intval', $ids)));
        if (!$ids) return response()->json(['message' => 'No IDs'], 422);

        Contact::whereIn('id', $ids)->delete();

        return response()->json(['message' => 'Purged', 'count' => count($ids)]);
    }
}
