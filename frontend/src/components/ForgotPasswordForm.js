"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function ForgotPasswordForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // redirect countdown
  const [redirectIn, setRedirectIn] = useState(null); // số giây còn lại
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Vui lòng nhập email hợp lệ.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Không thể gửi OTP. Vui lòng thử lại sau.");
        setSubmitting(false);
        return;
      }

      setMessage(
        "Mã OTP đã được gửi đến email của bạn. OTP có hiệu lực trong 10 phút. Đang chuyển đến trang xác thực..."
      );

      // Bắt đầu đếm ngược 3s rồi chuyển trang
      setRedirectIn(3);
      intervalRef.current = setInterval(() => {
        setRedirectIn((s) => {
          if (s === null) return null;
          return s > 0 ? s - 1 : 0;
        });
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}&mode=reset`);
      }, 3000);
    } catch (err) {
      setError("Không thể gửi OTP. Vui lòng thử lại sau.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const buttonDisabled = submitting || redirectIn !== null;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
          placeholder="you@example.com"
          disabled={redirectIn !== null}
          required
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && (
        <p className="text-sm text-green-600">
          {message}
          {redirectIn !== null && (
            <> Chuyển sau <strong>{redirectIn}</strong>s.</>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={buttonDisabled}
        className="w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
      >
        {submitting
          ? "Đang gửi..."
          : redirectIn !== null
          ? `Đang chuyển (${redirectIn}s)`
          : "Gửi mã OTP"}
      </button>
    </form>
  );
}
