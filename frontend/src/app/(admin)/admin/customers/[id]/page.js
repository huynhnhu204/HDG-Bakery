"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, RotateCcw, ShieldAlert, Trash2, User, Mail, Phone, MapPin, Crown } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

async function jfetch(url, { method = "GET", body } = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "₫";

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load(cid) {
    if (!cid) return;
    setLoading(true);
    setErr("");
    try {
      const data = await jfetch(`${BASE}${API}/customers/${encodeURIComponent(cid)}`);
      setC(data);
    } catch (e) {
      setErr(e.message || "Không tải được khách hàng");
      setC(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) load(id); }, [id]);

  async function toTrash() {
    if (!c) return;
    if (!confirm("Đưa khách hàng này vào thùng rác?")) return;
    try {
      await jfetch(`${BASE}${API}/customers/${c.id}`, { method: "DELETE" });
      alert("Đã đưa vào thùng rác.");
      router.push("/admin/customers");
    } catch (e) { alert("Thao tác thất bại: " + e.message); }
  }

  // Optional: restore/purge if you have endpoints for customers (added similar to products in routes)
  async function restore() { alert("Khôi phục khách hàng: cần endpoint /customers/{id}/restore"); }
  async function purge() { alert("Xoá vĩnh viễn: cần endpoint /customers/{id}/purge"); }

  if (!id) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-60" />
          <div className="h-64 bg-gray-100 rounded" />
          <div className="h-24 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-red-600 text-sm">Lỗi: {err}</div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(id)} className="px-3 py-2 rounded-lg border hover:bg-gray-50">Thử lại</button>
          <Link href="/admin/customers" className="px-3 py-2 rounded-lg border hover:bg-gray-50">← Về danh sách</Link>
        </div>
      </div>
    );
  }

  if (!c) return null;

  const levelBadge = (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border bg-orange-50 text-orange-700 border-orange-200">
      <Crown size={12} /> {c.membership_label || c.membership_level || "Đồng"}
    </span>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Link href="/admin/customers" className="inline-flex items-center gap-2 hover:underline">
            <ArrowLeft size={16} /> Danh sách khách hàng
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">#{c.id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/customers/${c.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
            title="Sửa"
          >
            <Edit size={16} /> Sửa
          </Link>

          {Number(c.status) === 1 ? (
            <button
              onClick={toTrash}
              className="px-3 py-2 rounded-lg border text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2"
              title="Đưa vào thùng rác"
            >
              <Trash2 size={16} /> Thùng rác
            </button>
          ) : (
            <>
              <button onClick={restore} className="px-3 py-2 rounded-lg border text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-2">
                <RotateCcw size={16} /> Khôi phục
              </button>
              <button onClick={purge} className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2">
                <ShieldAlert size={16} /> Xoá vĩnh viễn
              </button>
            </>
          )}
        </div>
      </div>

      {/* Title + Status */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{c.name || "—"}</h1>
          <div className="mt-1">{levelBadge}</div>
          <div className="text-xs text-gray-500 font-mono mt-1">User ID: {c.user_id ?? "—"}</div>
        </div>
        <span
          className={
            (Number(c.status) === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600")
            + " px-2 py-1 rounded text-xs font-medium h-6 inline-flex items-center"
          }
          title="Trạng thái"
        >
          {Number(c.status) === 1 ? "Hoạt động" : "Khoá"}
        </span>
      </div>

      {/* Top grid: Info + Membership */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Basic info */}
        <div className="md:col-span-1 space-y-3">
          <div className="rounded-2xl border bg-white p-4 space-y-2">
            <div className="flex items-center gap-2 text-gray-800"><User size={16}/> {c.name || "—"}</div>
            <div className="flex items-center gap-2 text-gray-700"><Mail size={16}/> {c.email || "—"}</div>
            <div className="flex items-center gap-2 text-gray-700"><Phone size={16}/> {c.phone || "—"}</div>
            <div className="flex items-center gap-2 text-gray-700"><MapPin size={16}/> {c.address || "—"}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4 space-y-2">
            <div className="text-sm text-gray-500">Nhóm</div>
            <div className="text-sm">{c.group || "—"}</div>
            <div className="text-sm text-gray-500 mt-2">Ghi chú quyền lợi</div>
            <div className="text-sm whitespace-pre-wrap">{c.benefit_note || "—"}</div>
          </div>
        </div>

        {/* Right: Membership & stats */}
        <div className="md:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-white p-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Hạng hiện tại</div>
                <div className="font-semibold">{c.membership_label || c.membership_level || "Đồng"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Tổng đơn</div>
                <div className="font-semibold">{c.total_orders ?? 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Tổng chi</div>
                <div className="font-semibold">{money(c.total_spent || 0)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">Cập nhật hạng gần nhất: {c.membership_changed_at ? new Date(c.membership_changed_at).toLocaleString("vi-VN") : "—"}</div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium mb-2">Quyền lợi theo hạng</div>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {(() => {
                const key = c.membership_level || "dong";
                if (key === "bachkim") return ["Giảm 12% bánh & đồ uống", "Freeship nội quận cao", "Ưu tiên đặt bánh sinh nhật", "Tặng nến/thiệp miễn phí"].map((x,i)=> <li key={i}>{x}</li>);
                if (key === "vang") return ["Giảm 10%", "Freeship nội quận (tối đa 20k)", "Quà sinh nhật nhỏ"].map((x,i)=> <li key={i}>{x}</li>);
                if (key === "bac") return ["Giảm 5% bánh & đồ uống", "Ưu tiên chat hỗ trợ"].map((x,i)=> <li key={i}>{x}</li>);
                return ["Tích luỹ để nhận ưu đãi cao hơn"].map((x,i)=> <li key={i}>{x}</li>);
              })()}
            </ul>
            <div className="mt-2 text-xs text-gray-500">Không áp với sản phẩm đang giảm sâu.</div>
          </div>
        </div>
      </div>

      {/* Other info */}
      <div className="rounded-2xl border bg-white p-4">
        <div className="text-sm font-medium mb-2">Thông tin khác</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-gray-500">Ngày sinh:</span> {c.birthday ? new Date(c.birthday).toLocaleDateString("vi-VN") : "—"}</div>
          <div><span className="text-gray-500">Giới tính:</span> {c.gender || "—"}</div>
          <div><span className="text-gray-500">Tạo lúc:</span> {c.created_at ? new Date(c.created_at).toLocaleString("vi-VN") : "—"}</div>
          <div><span className="text-gray-500">Cập nhật:</span> {c.updated_at ? new Date(c.updated_at).toLocaleString("vi-VN") : "—"}</div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex items-center justify-between pt-2">
        <Link href="/admin/customers" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-gray-50">
          <ArrowLeft size={16} /> Quay về danh sách
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/customers/${c.id}/edit`}
            className="px-3 py-2 rounded-lg border hover:bg-gray-50 inline-flex items-center gap-2"
          >
            <Edit size={16} /> Sửa
          </Link>

          {Number(c.status) === 1 ? (
            <button onClick={toTrash} className="px-3 py-2 rounded-lg border text-rose-600 hover:bg-rose-50 inline-flex items-center gap-2">
              <Trash2 size={16} /> Thùng rác
            </button>
          ) : (
            <>
              <button onClick={restore} className="px-3 py-2 rounded-lg border text-emerald-600 hover:bg-emerald-50 inline-flex items-center gap-2">
                <RotateCcw size={16} /> Khôi phục
              </button>
              <button onClick={purge} className="px-3 py-2 rounded-lg border text-red-600 hover:bg-red-50 inline-flex items-center gap-2">
                <ShieldAlert size={16} /> Xoá vĩnh viễn
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// (removed duplicate legacy component)
