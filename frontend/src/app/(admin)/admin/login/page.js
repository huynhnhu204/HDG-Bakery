"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const API  = "/api/v1";
const TOKEN_KEY = "admin_token";

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json", Accept:"application/json" },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data?.message || `${res.status} ${res.statusText}`);
  return data;
}

export default function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/admin";

  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("admin@123");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      const res = await postJSON(`${BASE}${API}/admin/login`, { email, password });
      if (!res?.token) throw new Error("Thiếu token");
      localStorage.setItem(TOKEN_KEY, res.token);
      router.replace(next);
    } catch (e) {
      setErr(e.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen grid place-items-center bg-orange-50">
      <section className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-extrabold text-orange-600 mb-6">Đăng nhập nội bộ (Admin / Kho)</h1>
        {err && <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input className="w-full rounded-lg border px-3 py-2" type="email" required
              value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mật khẩu</label>
            <input className="w-full rounded-lg border px-3 py-2" type="password" required
              value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-white font-semibold hover:bg-orange-700 disabled:opacity-60">
            {loading ? "Đang đăng nhập…" : "Đăng nhập"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-gray-600 hover:underline">← Về trang chủ</a>
        </div>
      </section>
    </main>
  );
}
