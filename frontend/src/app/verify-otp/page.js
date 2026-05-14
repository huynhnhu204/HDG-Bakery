"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function VerifyOtpPage() {
  const search = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [mode, setMode] = useState("verify"); // "verify" hoặc "reset"

  useEffect(() => {
    const q = search?.get("email");
    const m = search?.get("mode");
    if (q) setEmail(q);
    if (m) setMode(m);
  }, [search]);

  async function verify(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const endpoint = mode === "reset" 
        ? `${API_BASE}/api/v1/auth/verify-otp-for-reset`
        : `${API_BASE}/api/v1/auth/verify-otp`;
      
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, otp })
      });
      const j = await r.json();
      if (!r.ok) {
        setMessage(j.message || "Xác thực thất bại.");
        setLoading(false);
        return;
      }

      if (mode === "reset") {
        // Nếu là reset password, lưu reset_token và chuyển đến trang reset password
        if (j.reset_token) {
          setMessage("Xác thực OTP thành công! Đang chuyển đến trang đặt lại mật khẩu...");
          setTimeout(() => {
            router.push(`/reset-password?token=${encodeURIComponent(j.reset_token)}&email=${encodeURIComponent(email)}`);
          }, 1500);
        } else {
          setMessage("Xác thực thành công nhưng không nhận được token. Vui lòng thử lại.");
        }
      } else {
        // Nếu là verify email, hiển thị thông báo và chuyển đến trang đăng nhập
        setMessage("Xác thực email thành công! Bạn có thể đăng nhập.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      }
    } catch (e2) {
      setMessage("Lỗi kết nối. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!email) {
      setMessage("Vui lòng nhập email.");
      return;
    }
    if (resendCooldown > 0) return;
    setMessage("");
    try {
      const endpoint = mode === "reset"
        ? `${API_BASE}/api/v1/auth/forgot-password`
        : `${API_BASE}/api/v1/auth/resend-otp`;
      
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email })
      });
      const j = await r.json();
      setMessage(j.message || (r.ok ? "Đã gửi OTP." : "Không thể gửi OTP."));
      if (r.ok) {
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown(s => {
            if (s <= 1) { clearInterval(timer); return 0; }
            return s - 1;
          });
        }, 1000);
      }
    } catch (e2) {
      setMessage("Lỗi kết nối. Vui lòng thử lại sau.");
    }
  }

  const pageTitle = mode === "reset" ? "Xác thực OTP để đặt lại mật khẩu" : "Xác thực OTP";
  const pageDescription = mode === "reset" 
    ? "Nhập mã OTP đã được gửi đến email của bạn để tiếp tục đặt lại mật khẩu."
    : "Nhập mã OTP đã được gửi đến email của bạn để xác thực tài khoản.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
      <div className="max-w-md w-full bg-white p-6 rounded-xl shadow-lg space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{pageTitle}</h1>
          <p className="text-sm text-gray-600">{pageDescription}</p>
        </div>
        
        {message && (
          <div className={`text-sm text-center p-3 rounded-lg ${
            message.includes("thành công") || message.includes("Đang chuyển")
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message}
          </div>
        )}
        
        <form onSubmit={verify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Email</label>
            <input 
              className="border border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
              type="email" 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              required 
              disabled={mode === "reset"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">Mã OTP (6 số)</label>
            <input 
              className="border border-gray-300 p-2 rounded-lg w-full tracking-widest text-center text-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500" 
              value={otp} 
              onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g, '').slice(0,6))} 
              inputMode="numeric" 
              pattern="[0-9]{6}" 
              required 
              placeholder="000000"
              maxLength={6}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? "Đang xác thực..." : "Xác thực"}
          </button>
        </form>
        
        <button 
          onClick={resend} 
          disabled={resendCooldown>0 || loading} 
          className="w-full px-4 py-2 border border-orange-500 text-orange-600 rounded-lg disabled:opacity-50 hover:bg-orange-50 transition-colors"
        >
          {resendCooldown>0 ? `Gửi lại OTP (${resendCooldown}s)` : "Gửi lại OTP"}
        </button>
      </div>
    </div>
  );
}


