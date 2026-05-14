"use client";

import Link from "next/link";
import  ForgotPasswordForm  from "@/components/ForgotPasswordForm";

export default function LoginPage() {
  return (
   <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
  <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6 md:p-8">
    <div className="text-center mb-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Quên mật khẩu</h1>
      <p className="text-gray-600">
        Nhập email của bạn và chúng tôi sẽ gửi mã otp để đặt lại mật khẩu.
      </p>
    </div>

    {/* Thay LoginForm bằng ForgotPasswordForm */}
    <ForgotPasswordForm />

    <div className="mt-6 text-center text-sm text-gray-600 space-y-1">
      <p>
        Nhớ mật khẩu rồi?{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition"
        >
          Đăng nhập
        </Link>
      </p>
      <p>
        Chưa có tài khoản?{" "}
        <Link
          href="/register"
          className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  </div>
</div>

  );
}
