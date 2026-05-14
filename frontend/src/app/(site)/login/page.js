"use client";

import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-lg p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Đăng nhập</h1>
          <p className="text-gray-600">
            Chào mừng quay lại! Hãy đăng nhập để tiếp tục mua sắm.
          </p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition">
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
