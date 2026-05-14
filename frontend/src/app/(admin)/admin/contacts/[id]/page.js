"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";

const BASE =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(
    /\/+$/,
    ""
  );
const API = "/api/v1";
const KEY = "admin_token";

async function getJSON(url, token) {
  const r = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `${r.status} ${r.statusText}`);
  return d;
}

export default function ContactDetail() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const t = localStorage.getItem(KEY);
        const data = await getJSON(`${BASE}${API}/contacts/${id}`, t);
        if (alive) setContact(data);
      } catch (e) {
        console.error("Load contact error:", e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xoá liên hệ này?")) return;
    try {
      const t = localStorage.getItem(KEY);
      const res = await fetch(`${BASE}${API}/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Xoá thất bại");
      alert("Đã xoá liên hệ");
      router.push("/admin/contacts");
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!contact) {
    return <p className="p-6 text-gray-500">Không tìm thấy liên hệ</p>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/contacts")}
            className="p-2 rounded hover:bg-gray-100"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Chi tiết liên hệ #{contact.id}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/contacts/${id}/edit`)}
            className="px-3 py-1 flex items-center gap-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Edit size={16} /> Sửa
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-1 flex items-center gap-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Trash2 size={16} /> Xoá
          </button>
        </div>
      </div>

      {/* Thông tin liên hệ */}
      <section className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h2 className="font-semibold text-lg">Thông tin liên hệ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <p><span className="font-medium">Họ tên:</span> {contact.name}</p>
          <p><span className="font-medium">Điện thoại:</span> {contact.phone || "—"}</p>
          <p><span className="font-medium">Email:</span> {contact.email || "—"}</p>
          <p><span className="font-medium">Kênh:</span> {contact.channel || "—"}</p>
          <p><span className="font-medium">Loại liên hệ:</span> {contact.type || "—"}</p>
          <p><span className="font-medium">Ưu tiên:</span> {contact.priority || "—"}</p>
          <p><span className="font-medium">Trạng thái:</span> {contact.status || "—"}</p>
          <p><span className="font-medium">Người phụ trách:</span> {contact.assignee || "—"}</p>
        </div>
      </section>

      {/* Nội dung */}
      <section className="bg-white p-6 rounded-lg border shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">Nội dung</h2>
        <p><span className="font-medium">Chủ đề:</span> {contact.subject}</p>
        <div className="border rounded p-3 text-gray-700 whitespace-pre-wrap">
          {contact.message || contact.content || "—"}
        </div>
      </section>

      {/* Liên kết */}
      <section className="bg-white p-6 rounded-lg border shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">Liên kết dữ liệu</h2>
        <p><span className="font-medium">Khách hàng:</span> {contact.customer_id || "—"}</p>
        <p><span className="font-medium">Đơn hàng liên quan:</span> {contact.order_id || "—"}</p>
        <p><span className="font-medium">Tags:</span> {contact.tags || "—"}</p>
      </section>

      {/* Audit log (nếu có) */}
      <section className="bg-white p-6 rounded-lg border shadow-sm space-y-3">
        <h2 className="font-semibold text-lg">Hoạt động</h2>
        {contact.updated_at ? (
          <ul className="text-sm text-gray-600">
            <li>Ngày tạo: {new Date(contact.created_at).toLocaleString("vi-VN")}</li>
            <li>Cập nhật lần cuối: {new Date(contact.updated_at).toLocaleString("vi-VN")}</li>
          </ul>
        ) : (
          <p className="text-gray-500">Chưa có log</p>
        )}
      </section>
    </div>
  );
}
