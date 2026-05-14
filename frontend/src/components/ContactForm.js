"use client";

import { useState } from "react";

const API_BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function ContactForm() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());

    setLoading(true);
    setMsg("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          phone: data.phone,
          content: data.content, // sửa lại key chuẩn với backend
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Gửi liên hệ thất bại");
      }

      await res.json();
      setMsg("✅ Đã gửi thành công! Cảm ơn bạn, chúng tôi sẽ liên hệ sớm.");
      form.reset();
    } catch (err) {
      console.error("Contact error:", err);
      setMsg("❌ Lỗi khi gửi, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Họ và tên*"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email*"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      <input
        name="phone"
        placeholder="Điện thoại"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
      />

      <textarea
        name="content" // đổi từ "message" thành "content"
        rows={4}
        required
        placeholder="Nội dung*"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
      />

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {loading ? "Đang gửi…" : "Gửi thông tin"}
      </button>

      {msg && <p className="mt-2 text-sm text-center">{msg}</p>}
    </form>
  );
}
