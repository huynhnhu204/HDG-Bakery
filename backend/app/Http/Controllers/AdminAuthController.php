<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminAuthController extends Controller
{
    private function isBackofficeRole(?string $role): bool
    {
        return in_array($role, ['admin', 'warehouse'], true);
    }

    public function login(Request $r)
    {
        $data = $r->validate([
            'email'    => ['required','email'],
            'password' => ['required','string','min:6'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Sai email hoặc mật khẩu'], 401);
        }

        if (!$this->isBackofficeRole($user->roles)) {
            return response()->json(['message' => 'Không có quyền truy cập hệ thống nội bộ'], 403);
        }

        $ability = $user->roles === 'warehouse' ? 'warehouse' : 'admin';
        $token = $user->createToken('backoffice', [$ability])->plainTextToken;

        return response()->json([
            'message' => 'Đăng nhập hệ thống nội bộ thành công',
            'token'   => $token,
            'user'    => [
                'id'    => $user->id,
                'email' => $user->email,
                'roles' => $user->roles,
            ],
        ]);
    }

    public function me(Request $r)
    {
        $u = $r->user();
        if (!$u) return response()->json(['message'=>'Unauthenticated'], 401);
        if (!$this->isBackofficeRole($u->roles)) return response()->json(['message'=>'Forbidden'], 403);

        return response()->json([
            'id'    => $u->id,
            'name'  => $u->name,
            'email' => $u->email,
            'roles' => $u->roles,
        ]);
    }

    public function logout(Request $r)
    {
        if ($r->user()?->currentAccessToken()) {
            $r->user()->currentAccessToken()->delete();
        }
        return response()->json(['ok' => true]);
    }
}
