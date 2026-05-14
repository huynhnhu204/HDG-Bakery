"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function ResetPasswordPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = search?.get("token");
    const e = search?.get("email");
    if (t) setToken(t);
    if (e) setEmail(e);
    
    // Nếu không có token, chuyển về trang forgot-password
    if (!t) {
      setError("Token không hợp lệ. Vui lòng yêu cầu lại.");
      setTimeout(() => {
        router.push("/forgot-password");
      }, 3000);
    }
  }, [search, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    // Validate
    if (!newPassword || newPassword.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (!token) {
      setError("Token không hợp lệ. Vui lòng yêu cầu lại.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          reset_token: token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setMessage("Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...");
      
      // Chuyển đến trang đăng nhập sau 2 giây
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("Lỗi kết nối. Vui lòng thử lại sau.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 md:p-8 text-center">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Đặt lại mật khẩu thành công!</h1>
            <p className="text-gray-600">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Đặt lại mật khẩu</h1>
          <p className="text-gray-600">
            Nhập mật khẩu mới của bạn
          </p>
          {email && (
            <p className="text-sm text-gray-500 mt-2">
              Email: <span className="font-medium">{email}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 text-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Mật khẩu mới
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
              required
              minLength={6}
              disabled={loading || !token}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Nhập lại mật khẩu mới"
              required
              minLength={6}
              disabled={loading || !token}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Nhớ mật khẩu rồi?{" "}
            <Link
              href="/login"
              className="font-semibold text-orange-500 hover:text-orange-600 hover:underline transition"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


