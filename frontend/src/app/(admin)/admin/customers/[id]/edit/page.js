"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

export default function CustomerEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;
  const [form, setForm] = useState(null);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    const load = async () => {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/customers/${id}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const d = await res.json();
      setForm(d);
    };
    load();
  }, [id]);

  const save = async () => {
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/customers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      alert("Đã cập nhật khách hàng");
      router.push("/admin/customers");
    } catch (err) {
      alert(err.message);
    }
  };

  if (!form) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Sửa khách hàng #{id}</h1>

      <section className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
        <input className="border p-2 rounded w-full" placeholder="Họ tên"
          value={form.name} onChange={(e) => set("name", e.target.value)} />
        <input className="border p-2 rounded w-full" placeholder="Điện thoại"
          value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
        <input className="border p-2 rounded w-full" placeholder="Email"
          value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
        <input className="border p-2 rounded w-full" placeholder="Địa chỉ"
          value={form.address || ""} onChange={(e) => set("address", e.target.value)} />
        <input type="date" className="border p-2 rounded"
          value={form.birthday || ""} onChange={(e) => set("birthday", e.target.value)} />
        <select className="border p-2 rounded"
          value={form.gender || ""} onChange={(e) => set("gender", e.target.value)}>
          <option value="">Giới tính</option>
          <option value="male">Nam</option>
          <option value="female">Nữ</option>
          <option value="other">Khác</option>
        </select>
        <select className="border p-2 rounded"
          value={form.status} onChange={(e) => set("status", +e.target.value)}>
          <option value={1}>Hoạt động</option>
          <option value={0}>Khoá</option>
        </select>
      </section>

      <div className="flex gap-3">
        <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg">Huỷ</button>
        <button onClick={save} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          Lưu
        </button>
      </div>
    </div>
  );
}
