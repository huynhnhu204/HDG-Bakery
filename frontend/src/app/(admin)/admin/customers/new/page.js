"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

export default function CustomerNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    birthday: "",
    gender: "",
    group: "",
    source: "Website",
    status: 1, // BE định nghĩa: 1 = active, 0 = lock
    address: "",
    note: "",
  });

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const save = async () => {
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Tạo khách hàng thất bại");
      }
      alert("Đã thêm khách hàng");
      router.push("/admin/customers");
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Thêm khách hàng mới</h1>

      <section className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
        <h2 className="font-semibold">Thông tin cơ bản</h2>

        <input
          className="border p-2 rounded w-full"
          placeholder="Họ tên"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Điện thoại"
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <input
          className="border p-2 rounded w-full"
          placeholder="Email"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            className="border p-2 rounded"
            value={form.birthday}
            onChange={(e) => set("birthday", e.target.value)}
          />
          <select
            className="border p-2 rounded"
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
          >
            <option value="">Giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>

        <input
          className="border p-2 rounded w-full"
          placeholder="Địa chỉ"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={form.group}
          onChange={(e) => set("group", e.target.value)}
        >
          <option value="">Nhóm khách</option>
          <option value="VIP">VIP</option>
          <option value="Normal">Thường</option>
        </select>

        <select
          className="border p-2 rounded"
          value={form.source}
          onChange={(e) => set("source", e.target.value)}
        >
          <option value="Website">Website</option>
          <option value="Facebook">Facebook</option>
          <option value="Zalo">Zalo</option>
          <option value="Offline">Offline</option>
        </select>

        <select
          className="border p-2 rounded"
          value={form.status}
          onChange={(e) => set("status", Number(e.target.value))}
        >
          <option value={1}>Hoạt động</option>
          <option value={0}>Khoá</option>
        </select>

        <textarea
          className="border p-2 rounded w-full"
          placeholder="Ghi chú nội bộ"
          value={form.note}
          onChange={(e) => set("note", e.target.value)}
        />
      </section>

      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border rounded-lg"
        >
          Huỷ
        </button>
        <button
          onClick={save}
          className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}
