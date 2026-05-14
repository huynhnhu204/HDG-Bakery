"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, XCircle, Mail } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

export default function ContactNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    content: "",
  });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: JSON.stringify(f),
      });

      if (!res.ok) throw new Error(await res.text());
      alert("✅ Đã thêm liên hệ thành công!");
      router.push("/admin/contacts");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-amber-700 flex items-center gap-2">
          <Mail className="text-amber-600" size={26} /> Thêm liên hệ mới
        </h1>
        <button
          onClick={() => router.push("/admin/contacts")}
          className="text-sm text-gray-500 hover:underline"
        >
          ← Quay lại danh sách
        </button>
      </div>

      {/* Form */}
      <form
        onSubmit={submit}
        className="bg-white border rounded-xl shadow-sm p-6 space-y-6"
      >
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            ⚠️ {err}
          </div>
        )}

        {/* Họ tên */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Họ tên <span className="text-red-500">*</span>
          </label>
          <input
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            required
            placeholder="VD: Nguyễn Văn A"
            className="w-full h-10 border rounded-xl px-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>

        {/* Email + Số điện thoại */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={f.email}
              onChange={(e) => setF({ ...f, email: e.target.value })}
              required
              placeholder="example@gmail.com"
              className="w-full h-10 border rounded-xl px-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Số điện thoại <span className="text-red-500">*</span>
            </label>
            <input
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
              required
              placeholder="VD: 0901234567"
              className="w-full h-10 border rounded-xl px-3 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none"
            />
          </div>
        </div>

        {/* Nội dung */}
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Nội dung <span className="text-red-500">*</span>
          </label>
          <textarea
            value={f.content}
            onChange={(e) => setF({ ...f, content: e.target.value })}
            required
            rows={5}
            placeholder="Nhập nội dung liên hệ..."
            className="w-full border rounded-xl px-3 py-2 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className={`flex items-center gap-2 px-5 h-10 rounded-xl text-white font-medium transition-all ${
              saving
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-sm"
            }`}
          >
            <Send size={18} /> {saving ? "Đang lưu…" : "Lưu liên hệ"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/contacts")}
            className="flex items-center gap-2 px-5 h-10 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
          >
            <XCircle size={18} /> Hủy
          </button>
        </div>
      </form>
    </div>
  );
}
