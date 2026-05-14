<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    private function generateUniqueUsername(string $email, ?string $name = null): string
    {
        $base = $name ? Str::slug($name, '') : '';
        if (!$base) {
            $base = explode('@', $email)[0] ?? 'user';
        }
        $base = preg_replace('/[^a-zA-Z0-9_]/', '', $base) ?: 'user';
        $username = strtolower(substr($base, 0, 25));
        $suffix = 0;

        while (User::where('username', $username)->exists()) {
            $suffix++;
            $username = strtolower(substr($base, 0, max(1, 25 - strlen((string) $suffix))) . $suffix);
        }

        return $username;
    }

    /** Đăng ký */
    public function register(Request $r)
    {
        try {
            $data = $r->validate([
                'name'     => ['required', 'string', 'max:120'],
                'email'    => [
                    'required',
                    'email',
                    'max:255',
                    Rule::unique('user','email')->where(fn($q)=>$q->whereNull('deleted_at')),
                ],
                'password' => ['required', 'string', 'min:6'],
                'phone'    => ['nullable', 'string', 'max:20'],
                'address'  => ['nullable', 'string', 'max:500'],
                'birthday' => ['nullable', 'date'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            $firstError = collect($errors)->flatten()->first();
            return response()->json([
                'message' => $firstError,
                'errors' => $errors
            ], 422);
        }

        $username = explode('@', $data['email'])[0];

        try {
            $user = User::create([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'phone'    => $data['phone'] ?? null,
                'username' => $username,
                'password' => Hash::make($data['password']),
                'roles'    => 'customer',
                'status'   => 1,
            ]);

            $customer = Customer::create([
                'user_id'  => $user->id,
                'name'     => $data['name'],
                'email'    => $data['email'],
                'phone'    => $data['phone'] ?? null,
                'address'  => $data['address'] ?? null,
                'birthday' => $data['birthday'] ?? null,
            ]);

            // Gửi link xác thực (email)
            try {
                $this->sendVerifyLink($user);
            } catch (\Throwable $e) {
                Log::error('Failed to send verification email: ' . $e->getMessage());
            }

            return response()->json([
                'message'  => 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
                'user'     => $user,
                'customer' => $customer,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Lỗi hệ thống: ' . $e->getMessage()
            ], 500);
        }
    }

    /** Gửi LINK xác thực qua SMTP */
    private function sendVerifyLink(User $user): void
    {
        $token = Str::random(40);
        cache()->put("verify_{$user->id}", $token, now()->addHours(24));
        $verifyUrl = url("/api/v1/auth/verify?uid={$user->id}&token={$token}");

        Mail::send('emails.verify', compact('user', 'verifyUrl'), function ($m) use ($user) {
            $m->to($user->email)->subject('Xác thực tài khoản - Dola Bakery');
        });
        Log::info('SMTP: Verification email sent successfully', ['email' => $user->email]);
    }

    /** Gửi OTP cho người dùng qua email, lưu cache 10 phút */
    private function sendOtpForUser(User $user): void
    {
        $otp = (string) random_int(100000, 999999);
        cache()->put("otp_{$user->id}", $otp, now()->addMinutes(10));
        cache()->put("otp_attempts_{$user->id}", 0, now()->addMinutes(10));

        Mail::send('emails.verify_otp', ['user' => $user, 'otp' => $otp], function ($m) use ($user) {
            $m->to($user->email)->subject('Mã xác thực OTP - Dola Bakery');
        });
        Log::info('SMTP: OTP sent successfully', ['email' => $user->email]);
    }

    /** Xác thực email */
    public function verifyEmail(Request $r)
    {
        $uid   = (int) $r->query('uid');
        $token = (string) $r->query('token');
        
        try {
            $user = User::findOrFail($uid);
        } catch (\Exception $e) {
            return redirect(config('app.frontend_url', 'http://localhost:3000') . '/verify?error=notfound');
        }

        if (!$token || cache()->get("verify_{$uid}") !== $token) {
            return redirect(config('app.frontend_url', 'http://localhost:3000') . '/verify?error=invalid');
        }

        try {
            $user->email_verified_at = now();
            $user->save();
            cache()->forget("verify_{$uid}");
            
            return redirect(config('app.frontend_url', 'http://localhost:3000') . '/verify?success=1');
        } catch (\Exception $e) {
            return redirect(config('app.frontend_url', 'http://localhost:3000') . '/verify?error=system');
        }
    }

    /** Gửi lại mail xác thực */
    public function resendVerify(Request $r)
    {
        $r->validate(['email'=>'required|email']);
        $user = User::where('email', $r->email)->first();
        if (!$user) return response()->json(['message'=>'Không tìm thấy tài khoản'], 404);
        
        if ($user->email_verified_at) {
            return response()->json(['message'=>'Email đã được xác thực rồi'], 400);
        }

        try {
            $this->sendVerifyLink($user);
            
            return response()->json(['message'=>'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư của bạn.']);
        } catch (\Throwable $e) {
            Log::error('Failed to resend verification email: ' . $e->getMessage());
            return response()->json(['message'=>'Không thể gửi email. Vui lòng thử lại sau.'], 500);
        }
    }

    /** Xác thực email bằng OTP */
    public function verifyOtp(Request $r)
    {
        $data = $r->validate([
            'email' => ['required','email'],
            'otp'   => ['required','digits:6'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        }

        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email đã được xác thực'], 400);
        }

        $key = "otp_{$user->id}";
        $attemptKey = "otp_attempts_{$user->id}";
        $cachedOtp = cache()->get($key);

        if (!$cachedOtp) {
            return response()->json(['message' => 'OTP đã hết hạn. Vui lòng yêu cầu gửi lại.'], 400);
        }

        // Giới hạn số lần nhập sai
        $attempts = (int) cache()->get($attemptKey, 0);
        if ($attempts >= 5) {
            return response()->json(['message' => 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu OTP mới.'], 429);
        }

        if ($data['otp'] !== $cachedOtp) {
            cache()->put($attemptKey, $attempts + 1, now()->addMinutes(10));
            return response()->json(['message' => 'OTP không đúng. Vui lòng kiểm tra lại.'], 400);
        }

        // Thành công
        $user->email_verified_at = now();
        $user->save();
        cache()->forget($key);
        cache()->forget($attemptKey);

        return response()->json(['message' => 'Xác thực email thành công']);
    }

    /** Gửi lại OTP (rate limit 60s) */
    public function resendOtp(Request $r)
    {
        $data = $r->validate([
            'email' => ['required','email'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user) return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        if ($user->email_verified_at) {
            return response()->json(['message' => 'Email đã được xác thực'], 400);
        }

        $limiterKey = 'resend_otp_' . $user->id;
        if (cache()->has($limiterKey)) {
            return response()->json(['message' => 'Vui lòng chờ trước khi gửi lại OTP.'], 429);
        }

        try {
            $this->sendOtpForUser($user);
            cache()->put($limiterKey, 1, now()->addSeconds(60));
            return response()->json(['message' => 'Đã gửi OTP. Vui lòng kiểm tra hộp thư.']);
        } catch (\Throwable $e) {
            Log::error('Failed to resend OTP: ' . $e->getMessage());
            return response()->json(['message' => 'Không thể gửi OTP. Vui lòng thử lại sau.'], 500);
        }
    }

    /** Đăng nhập: identifier = email | phone | username */
    public function login(Request $r)
    {
        // Validate input
        try {
            $data = $r->validate([
                'identifier' => ['required', 'string'],
                'password'   => ['required', 'string', 'min:6'],
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            $errors = $e->errors();
            $firstError = collect($errors)->flatten()->first();
            return response()->json([
                'message' => $firstError,
                'errors' => $errors
            ], 422);
        }

        $id = $data['identifier'];
        $user = User::where('email',$id)
            ->orWhere('phone',$id)
            ->orWhere('username',$id)
            ->first();

        // Kiểm tra tài khoản tồn tại
        if (!$user) {
            // Kiểm tra xem có phải là email không
            if (filter_var($id, FILTER_VALIDATE_EMAIL)) {
                return response()->json([
                    'message' => 'Không tìm thấy tài khoản với email này. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới.',
                    'type' => 'account_not_found'
                ], 404);
            } else {
                return response()->json([
                    'message' => 'Không tìm thấy tài khoản với thông tin đăng nhập này.',
                    'type' => 'account_not_found'
                ], 404);
            }
        }

        // Kiểm tra mật khẩu
        if (!Hash::check($data['password'], $user->password)) {
            return response()->json([
                'message' => 'Mật khẩu không đúng. Vui lòng kiểm tra lại.',
                'type' => 'wrong_password'
            ], 401);
        }

        // Kiểm tra trạng thái tài khoản
        if ((int)$user->status !== 1) {
            return response()->json([
                'message' => 'Tài khoản của bạn đang bị khoá. Vui lòng liên hệ admin để được hỗ trợ.',
                'type' => 'account_locked'
            ], 403);
        }

        $needs_verify = is_null($user->email_verified_at);

        $token = $user->createToken('auth', ['customer'])->plainTextToken;

        return response()->json([
            'message'       => 'Đăng nhập thành công!',
            'token'         => $token,
            'user'          => $user,
            'needs_verify'  => $needs_verify,
        ]);
    }

    /** Đăng nhập Google bằng ID token từ Google Identity Services */
    public function googleLogin(Request $r)
    {
        $data = $r->validate([
            'id_token' => ['required', 'string'],
        ]);

        $googleClientId = env('GOOGLE_CLIENT_ID');
        if (!$googleClientId) {
            return response()->json([
                'message' => 'Chưa cấu hình GOOGLE_CLIENT_ID trên backend.',
            ], 500);
        }

        try {
            $verify = Http::asForm()->post('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $data['id_token'],
            ]);

            if (!$verify->ok()) {
                return response()->json([
                    'message' => 'Google token không hợp lệ.',
                ], 401);
            }

            $payload = $verify->json();
            if (($payload['aud'] ?? null) !== $googleClientId) {
                return response()->json([
                    'message' => 'Token không đúng ứng dụng Google Client ID.',
                ], 401);
            }

            if (($payload['email_verified'] ?? 'false') !== 'true') {
                return response()->json([
                    'message' => 'Email Google chưa được xác thực.',
                ], 401);
            }

            $email = strtolower(trim((string) ($payload['email'] ?? '')));
            if (!$email) {
                return response()->json([
                    'message' => 'Không đọc được email từ Google.',
                ], 422);
            }

            $name = trim((string) ($payload['name'] ?? 'Google User'));
            $picture = trim((string) ($payload['picture'] ?? ''));

            $user = User::where('email', $email)->first();
            if (!$user) {
                $user = User::create([
                    'name' => $name ?: 'Google User',
                    'email' => $email,
                    'phone' => null,
                    'username' => $this->generateUniqueUsername($email, $name),
                    'password' => Hash::make(Str::random(32)),
                    'roles' => 'customer',
                    'status' => 1,
                    'avatar' => $picture ?: null,
                    'email_verified_at' => now(),
                ]);
            } else {
                $updates = [];
                if (!$user->email_verified_at) {
                    $updates['email_verified_at'] = now();
                }
                if (!$user->avatar && $picture) {
                    $updates['avatar'] = $picture;
                }
                if ((int) $user->status !== 1) {
                    $updates['status'] = 1;
                }
                if (!empty($updates)) {
                    $user->update($updates);
                }
            }

            Customer::firstOrCreate(
                ['user_id' => $user->id],
                [
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                ]
            );

            $token = $user->createToken('auth', ['customer'])->plainTextToken;

            return response()->json([
                'message' => 'Đăng nhập Google thành công!',
                'token' => $token,
                'user' => $user,
                'needs_verify' => false,
            ]);
        } catch (\Throwable $e) {
            Log::error('Google login error: ' . $e->getMessage());
            if (str_contains($e->getMessage(), 'Connection refused')) {
                return response()->json([
                    'message' => 'Không kết nối được cơ sở dữ liệu. Vui lòng kiểm tra MySQL đang chạy.',
                ], 500);
            }
            return response()->json([
                'message' => 'Lỗi đăng nhập Google. Vui lòng thử lại.',
            ], 500);
        }
    }

    /** Thông tin người dùng hiện tại */
    public function me(Request $r)
    {
        try {
            $user = $r->user();
            if (!$user) {
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
            $customer = Customer::where('user_id', $user->id)->first();
            return response()->json(compact('user', 'customer'));
        } catch (\Throwable $e) {
            Log::error('AuthController::me error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
                'user_id' => $r->user()?->id,
            ]);
            return response()->json([
                'message' => 'Lỗi khi lấy thông tin người dùng: ' . $e->getMessage()
            ], 500);
        }
    }

    /** Đăng xuất */
    public function logout(Request $r)
    {
        $user = $r->user();
        if ($user) {
            // Revoke all tokens for this user to avoid IDE false-positive on currentAccessToken()->delete().
            $user->tokens()->delete();
        }
        return response()->json(['message'=>'Đã đăng xuất']);
    }

    /** Cập nhật hồ sơ */
    public function updateProfile(Request $r)
    {
        $user = $r->user();
        $data = $r->validate([
            'name'     => 'required|string|max:120',
            'email'    => [
                'required','email','max:255',
                Rule::unique('user','email')
                    ->ignore($user->id)
                    ->where(fn($q)=>$q->whereNull('deleted_at')), // bỏ qua record đã xóa mềm
            ],
            'phone'    => 'nullable|string|max:20',
            'address'  => 'nullable|string|max:255',
            'birthday' => 'nullable|date',
            'avatar'   => 'nullable|string|max:255',
        ]);

        $user->update([
            'name'   => $data['name'],
            'email'  => $data['email'],
            'phone'  => $data['phone'] ?? null,
            'avatar' => $data['avatar'] ?? null,
        ]);

        $customer = Customer::where('user_id',$user->id)->first();
        if ($customer) {
            $customer->update([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'phone'    => $data['phone'] ?? null,
                'address'  => $data['address'] ?? null,
                'birthday' => $data['birthday'] ?? null,
            ]);
        }

        return response()->json(['message'=>'Cập nhật thành công','user'=>$user,'customer'=>$customer]);
    }

    /** Đổi mật khẩu */
    public function changePassword(Request $r)
    {
        $r->validate([
            'current_password' => 'required|string|min:6',
            'new_password'     => 'required|string|min:6|different:current_password',
        ]);

        $user = $r->user();

        if (!Hash::check($r->current_password, $user->password)) {
            return response()->json(['message' => 'Mật khẩu hiện tại không đúng'], 400);
        }

        // Hash mật khẩu mới
        $user->password = Hash::make($r->new_password);
        $user->save();

        // (Tuỳ chọn) đăng xuất các token khác:
        // $user->tokens()->where('id','!=',$r->user()->currentAccessToken()->id)->delete();

        return response()->json(['message' => 'Đổi mật khẩu thành công']);
    }

    /** Gửi OTP cho reset password */
    private function sendOtpForPasswordReset(User $user): void
    {
        $otp = (string) random_int(100000, 999999);
        cache()->put("reset_otp_{$user->id}", $otp, now()->addMinutes(10));
        cache()->put("reset_otp_attempts_{$user->id}", 0, now()->addMinutes(10));

        Mail::send('emails.reset_password_otp', ['user' => $user, 'otp' => $otp], function ($m) use ($user) {
            $m->to($user->email)->subject('Mã OTP đặt lại mật khẩu - Dola Bakery');
        });
        Log::info('SMTP: Reset password OTP sent successfully to ' . $user->email);
    }

    /** Gửi OTP để reset password (public) */
    public function forgotPassword(Request $r)
    {
        $data = $r->validate([
            'email' => ['required', 'email'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản với email này'], 404);
        }

        // Kiểm tra rate limit
        $limiterKey = 'forgot_password_' . $user->id;
        if (cache()->has($limiterKey)) {
            return response()->json(['message' => 'Vui lòng chờ 60 giây trước khi yêu cầu lại.'], 429);
        }

        try {
            $this->sendOtpForPasswordReset($user);
            cache()->put($limiterKey, 1, now()->addSeconds(60));
            return response()->json(['message' => 'Đã gửi mã OTP đến email của bạn. Vui lòng kiểm tra hộp thư.']);
        } catch (\Throwable $e) {
            $errorMessage = $e->getMessage();
            Log::error('Failed to send reset password OTP: ' . $errorMessage);

            $lower = strtolower($errorMessage);
            $isSmtpAuthError = str_contains($lower, 'failed to authenticate')
                || str_contains($lower, 'username and password not accepted')
                || str_contains($lower, '535');

            if ($isSmtpAuthError) {
                return response()->json([
                    'message' => 'SMTP đăng nhập thất bại. Vui lòng kiểm tra MAIL_USERNAME/MAIL_PASSWORD (Gmail App Password).'
                ], 422);
            }

            return response()->json(['message' => 'Không thể gửi OTP. Vui lòng thử lại sau.'], 500);
        }
    }

    /** Xác thực OTP cho reset password */
    public function verifyOtpForReset(Request $r)
    {
        $data = $r->validate([
            'email' => ['required', 'email'],
            'otp'   => ['required', 'digits:6'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        }

        $key = "reset_otp_{$user->id}";
        $attemptKey = "reset_otp_attempts_{$user->id}";
        $cachedOtp = cache()->get($key);

        if (!$cachedOtp) {
            return response()->json(['message' => 'OTP đã hết hạn. Vui lòng yêu cầu gửi lại.'], 400);
        }

        // Giới hạn số lần nhập sai
        $attempts = (int) cache()->get($attemptKey, 0);
        if ($attempts >= 5) {
            return response()->json(['message' => 'Bạn đã nhập sai quá số lần cho phép. Vui lòng yêu cầu OTP mới.'], 429);
        }

        if ($data['otp'] !== $cachedOtp) {
            cache()->put($attemptKey, $attempts + 1, now()->addMinutes(10));
            return response()->json(['message' => 'OTP không đúng. Vui lòng kiểm tra lại.'], 400);
        }

        // Tạo token để cho phép reset password (valid 10 phút)
        $resetToken = Str::random(60);
        cache()->put("reset_token_{$resetToken}", $user->id, now()->addMinutes(10));

        // Xóa OTP sau khi verify thành công
        cache()->forget($key);
        cache()->forget($attemptKey);

        return response()->json([
            'message' => 'Xác thực OTP thành công',
            'reset_token' => $resetToken,
        ]);
    }

    /** Reset password sau khi verify OTP */
    public function resetPassword(Request $r)
    {
        $data = $r->validate([
            'reset_token' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:6'],
            'confirm_password' => ['required', 'string', 'min:6', 'same:new_password'],
        ]);

        // Kiểm tra reset token
        $userId = cache()->get("reset_token_{$data['reset_token']}");
        if (!$userId) {
            return response()->json(['message' => 'Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.'], 400);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'Không tìm thấy tài khoản'], 404);
        }

        // Đổi mật khẩu
        $user->password = Hash::make($data['new_password']);
        $user->save();

        // Xóa reset token
        cache()->forget("reset_token_{$data['reset_token']}");

        return response()->json(['message' => 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập với mật khẩu mới.']);
    }
}
