"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

export default function ContactEditPage() {
  const router = useRouter();
  const { id } = useParams();

  const [form, setForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
    channel: "",
    source: "",
    subject: "",
    content: "",
    attachments: [],

    type: "",
    priority: "Trung bình",
    status: "Mới",
    assignee: "",
    sla_due: "",

    customer_id: "",
    order_id: "",
    tags: "",

    internal_note: "",
  });

  const [loading, setLoading] = useState(true);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  // Load contact detail
  useEffect(() => {
    if (!id) return;
    let alive = true;

    (async () => {
      try {
        const t = localStorage.getItem(KEY);
        const res = await fetch(`${BASE}${API}/contacts/${id}`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const d = await res.json();
        if (res.ok && alive) {
          setForm((s) => ({ ...s, ...d }));
        }
      } catch (e) {
        console.error("Load error:", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const save = async (back = false) => {
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      alert("Đã lưu thay đổi");
      if (back) router.push("/admin/contacts");
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Chỉnh sửa liên hệ #{form.id}</h1>

      {/* --- Thông tin liên hệ --- */}
      <section className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold">Thông tin liên hệ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input disabled className="border p-2 rounded bg-gray-100" value={form.id} placeholder="ID" />
          <input className="border p-2 rounded" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Họ tên *" />
          <input className="border p-2 rounded" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Số điện thoại" />
          <input className="border p-2 rounded" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="Email" />
          <select className="border p-2 rounded" value={form.channel} onChange={(e) => set("channel", e.target.value)}>
            <option value="">Kênh</option>
            <option>Form</option>
            <option>Email</option>
            <option>Zalo</option>
            <option>Facebook</option>
            <option>Điện thoại</option>
            <option>Khác</option>
          </select>
          <input className="border p-2 rounded" value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="Nguồn" />
        </div>
      </section>

      {/* --- Nội dung --- */}
      <section className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold">Nội dung</h2>
        <input className="border p-2 rounded w-full" value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Chủ đề *" />
        <textarea className="border p-2 rounded w-full" rows={4} value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Nội dung chi tiết *" />
        <div>
          <label className="block mb-1 text-sm">Tệp đính kèm</label>
          <input type="file" multiple className="border p-2 rounded w-full" />
          <div className="mt-2 text-sm text-gray-500">({form.attachments?.length || 0}) file hiện có</div>
        </div>
      </section>

      {/* --- Phân loại & SLA --- */}
      <section className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold">Phân loại & SLA</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="border p-2 rounded" value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="">Loại liên hệ</option>
            <option>Hỗ trợ</option>
            <option>Bán hàng</option>
            <option>Hợp tác</option>
            <option>Khiếu nại</option>
            <option>Góp ý</option>
          </select>
          <select className="border p-2 rounded" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            <option>Thấp</option>
            <option>Trung bình</option>
            <option>Cao</option>
            <option>Khẩn</option>
          </select>
          <select className="border p-2 rounded" value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option>Mới</option>
            <option>Đang xử lý</option>
            <option>Chờ khách</option>
            <option>Đã xong</option>
            <option>Đã đóng</option>
            <option>Spam</option>
          </select>
          <input className="border p-2 rounded" value={form.assignee} onChange={(e) => set("assignee", e.target.value)} placeholder="Người phụ trách" />
          <input type="date" className="border p-2 rounded" value={form.sla_due || ""} onChange={(e) => set("sla_due", e.target.value)} />
        </div>
      </section>

      {/* --- Liên kết dữ liệu --- */}
      <section className="bg-white rounded-lg border p-6 space-y-4 shadow-sm">
        <h2 className="font-semibold">Liên kết dữ liệu</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input className="border p-2 rounded" value={form.customer_id} onChange={(e) => set("customer_id", e.target.value)} placeholder="Khách hàng ID" />
          <input className="border p-2 rounded" value={form.order_id} onChange={(e) => set("order_id", e.target.value)} placeholder="Mã đơn hàng liên quan" />
          <input className="border p-2 rounded md:col-span-2" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Tag/Nhãn" />
        </div>
      </section>

      {/* --- Ghi chú nội bộ --- */}
      <section className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="font-semibold">Ghi chú nội bộ</h2>
        <textarea className="border p-2 rounded w-full" rows={3} value={form.internal_note} onChange={(e) => set("internal_note", e.target.value)} />
      </section>

      {/* --- Nút hành động --- */}
      <div className="flex gap-2">
        <button onClick={() => router.back()} className="px-4 py-2 border rounded-lg">Huỷ</button>
        <button onClick={() => save(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Lưu</button>
        <button onClick={() => save(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">Lưu & quay lại</button>
      </div>
    </div>
  );
}
