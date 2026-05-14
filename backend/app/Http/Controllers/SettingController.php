<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    // GET /api/v1/settings
    public function index()
    {
        $row = Setting::first();
        // Nếu chưa có thì tạo mặc định
        if (!$row) {
            $row = Setting::create([
                'site_name' => 'Dola Bakery',
                'email' => 'support@example.com',
                'phone' => '0900000000',
                'hotline' => '19001000',
                'address' => '70 Lữ Gia, P15, Q11, TP.HCM',
                'status' => 1
            ]);
        }
        return response()->json($row);
    }

    // POST /api/v1/settings
    public function store(Request $r)
    {
        $data = $r->validate([
            'site_name'        => 'required|string|max:191',
            'email'            => 'required|string|max:191',
            'phone'            => 'required|string|max:50',
            'hotline'          => 'required|string|max:50',
            'address'          => 'required|string|max:255',
            'logo'             => 'nullable|string|max:255',
            'favicon'          => 'nullable|string|max:255',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'meta_keywords'    => 'nullable|string',
            'status'           => 'nullable|integer|in:0,1',
        ]);

        $data['status'] = $data['status'] ?? 1;
        $row = Setting::create($data);

        return response()->json($row, 201);
    }

    // PUT /api/v1/settings/{id}
    public function update(Request $r, int $id)
    {
        $row = Setting::findOrFail($id);
        $data = $r->validate([
            'site_name'        => 'sometimes|required|string|max:191',
            'email'            => 'sometimes|required|string|max:191',
            'phone'            => 'sometimes|required|string|max:50',
            'hotline'          => 'sometimes|required|string|max:50',
            'address'          => 'sometimes|required|string|max:255',
            'logo'             => 'nullable|string|max:255',
            'favicon'          => 'nullable|string|max:255',
            'meta_title'       => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'meta_keywords'    => 'nullable|string',
            'status'           => 'nullable|integer|in:0,1',
        ]);

        $row->fill($data)->save();

        return response()->json($row);
    }
}
