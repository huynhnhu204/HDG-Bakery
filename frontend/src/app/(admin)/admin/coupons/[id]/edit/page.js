"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const ADMIN_TOKEN_KEY = "admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers, cache: "no-store" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data;
}

export default function EditCouponPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    discount_type: "percent",
    discount_value: "",
    max_discount: "",
    min_order_amount: "",
    apply_to: "all",
    category_ids: [],
    product_ids: [],
    exclude_product_ids: [],
    delivery_method: "all",
    advance_hours: "0",
    customer_restriction: "all",
    exclude_sale_items: false,
    start_date: "",
    end_date: "",
    time_start: "",
    time_end: "",
    total_usage_limit: "",
    usage_per_customer: "1",
    allowed_customer_emails: [],
    can_stack_with_ship: false,
    success_message: "",
    error_message: "",
    status: 1,
  });

  // Helpers
  const pad = (n) => String(n).padStart(2, "0");
  const formatDatetimeLocal = (d) => {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${y}-${m}-${day}T${hh}:${mm}`;
  };
  const parseMySqlDateTime = (s) => {
    if (!s || typeof s !== "string") return new Date(s);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return new Date(s);
    const [_, yy, mm, dd, HH, MM, SS] = m;
    return new Date(
      Number(yy),
      Number(mm) - 1,
      Number(dd),
      Number(HH),
      Number(MM),
      Number(SS || 0),
      0
    );
  };
  const toMySqlDateTime = (localStr) => {
    if (!localStr) return "";
    const d = new Date(localStr);
    if (Number.isNaN(d.getTime())) {
      throw new Error("Ngày/giờ không hợp lệ");
    }
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  };

  // Load coupon detail
  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setErr("");
      try {
        const data = await apiFetch(`${BASE}${API}/coupons/${id}`);
        const c = data?.data || data;
        // Parse datetime to datetime-local
        let startLocal = "";
        let endLocal = "";
        try {
          if (c.start_date) startLocal = formatDatetimeLocal(parseMySqlDateTime(c.start_date));
          if (c.end_date) endLocal = formatDatetimeLocal(parseMySqlDateTime(c.end_date));
        } catch {}
        // Parse time window "HH:MM-HH:MM"
        let timeStart = "";
        let timeEnd = "";
        if (typeof c.time_restriction === "string" && c.time_restriction.includes("-")) {
          const [s, e] = c.time_restriction.split("-");
          timeStart = s || "";
          timeEnd = e || "";
        }
        if (mounted) {
          setForm({
            name: c.name ?? "",
            code: c.code ?? "",
            description: c.description ?? "",
            discount_type: c.discount_type ?? "percent",
            discount_value: c.discount_value ?? "",
            max_discount: c.max_discount ?? "",
            min_order_amount: c.min_order_amount ?? "",
            apply_to: c.apply_to ?? "all",
            category_ids: Array.isArray(c.category_ids) ? c.category_ids : (c.category_ids ? [c.category_ids].filter(Boolean) : []),
            product_ids: Array.isArray(c.product_ids) ? c.product_ids : (c.product_ids ? [c.product_ids].filter(Boolean) : []),
            exclude_product_ids: Array.isArray(c.exclude_product_ids) ? c.exclude_product_ids : [],
            delivery_method: c.delivery_method ?? "all",
            advance_hours: (c.advance_hours ?? 0).toString(),
            customer_restriction: c.customer_restriction ?? "all",
            exclude_sale_items: !!c.exclude_sale_items,
            start_date: startLocal,
            end_date: endLocal,
            time_start: timeStart,
            time_end: timeEnd,
            total_usage_limit: c.total_usage_limit ?? "",
            usage_per_customer: (c.usage_per_customer ?? 1).toString(),
            allowed_customer_emails: Array.isArray(c.allowed_customer_emails) ? c.allowed_customer_emails : [],
            can_stack_with_ship: !!c.can_stack_with_ship,
            success_message: c.success_message ?? "",
            error_message: c.error_message ?? "",
            status: c.status ?? 1,
          });
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setOkMsg("");
    try {
      // Validate time window
      let timeRestriction = "";
      if (form.time_start && form.time_end) {
        if (form.time_start >= form.time_end) {
          throw new Error("Khoảng giờ không hợp lệ (giờ bắt đầu phải trước giờ kết thúc)");
        }
        timeRestriction = `${form.time_start}-${form.time_end}`;
      }
      // Validate and normalize dates
      const startMySql = toMySqlDateTime(form.start_date);
      const endMySql = toMySqlDateTime(form.end_date);
      const startJs = new Date(startMySql.replace(" ", "T"));
      const endJs = new Date(endMySql.replace(" ", "T"));
      if (!(startJs < endJs)) {
        throw new Error("Ngày bắt đầu phải trước ngày kết thúc");
      }

      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        description: form.description.trim(),
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        apply_to: form.apply_to,
        category_ids: form.apply_to === "category" ? form.category_ids : null,
        product_ids: form.apply_to === "product" ? form.product_ids : null,
        exclude_product_ids: form.exclude_product_ids.length > 0 ? form.exclude_product_ids : null,
        delivery_method: form.delivery_method,
        advance_hours: Number(form.advance_hours),
        customer_restriction: form.customer_restriction,
        exclude_sale_items: form.exclude_sale_items,
        start_date: startMySql,
        end_date: endMySql,
        time_restriction: timeRestriction || null,
        total_usage_limit: form.total_usage_limit ? Number(form.total_usage_limit) : 0,
        usage_per_customer: Number(form.usage_per_customer),
        allowed_customer_emails: form.allowed_customer_emails.length > 0 ? form.allowed_customer_emails : null,
        can_stack_with_ship: form.can_stack_with_ship,
        success_message: form.success_message.trim() || null,
        error_message: form.error_message.trim() || null,
        status: form.status,
      };

      await apiFetch(`${BASE}${API}/coupons/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setOkMsg("Cập nhật mã giảm giá thành công!");
      setTimeout(() => router.push("/admin/coupons"), 1200);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Chỉnh sửa mã giảm giá</h1>
          <p className="text-gray-600 mt-2">Cập nhật thời gian và điều kiện áp dụng</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-6">
          {/* Basic info */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">1. Thông tin cơ bản</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên chương trình *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={loading || saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã giảm giá *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
                  className="w-full rounded-lg border px-3 py-2 font-mono"
                  disabled={loading || saving}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm("description", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={loading || saving}
                />
              </div>
            </div>
          </section>

          {/* Discount */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">2. Loại giảm giá</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="percent"
                  checked={form.discount_type === "percent"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                  disabled={saving}
                />
                <span>Giảm theo %</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="fixed"
                  checked={form.discount_type === "fixed"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                  disabled={saving}
                />
                <span>Giảm số tiền cố định</span>
              </label>
              <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="discount_type"
                  value="free_ship"
                  checked={form.discount_type === "free_ship"}
                  onChange={(e) => updateForm("discount_type", e.target.value)}
                  disabled={saving}
                />
                <span>Miễn phí ship</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {form.discount_type !== "free_ship" && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {form.discount_type === "percent" ? "Phần trăm giảm (%) *" : "Số tiền giảm (VND) *"}
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.discount_value}
                    onChange={(e) => updateForm("discount_value", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={saving}
                  />
                </div>
              )}
              {form.discount_type === "percent" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tối đa giảm (VND)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.max_discount}
                    onChange={(e) => updateForm("max_discount", e.target.value)}
                    className="w-full rounded-lg border px-3 py-2"
                    disabled={saving}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Đơn tối thiểu (VND)</label>
                <input
                  type="number"
                  min="0"
                  value={form.min_order_amount}
                  onChange={(e) => updateForm("min_order_amount", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          {/* Time window */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">3. Thời gian hiệu lực</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Ngày bắt đầu *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => updateForm("start_date", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={saving || loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ngày kết thúc *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => updateForm("end_date", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={saving || loading}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Khung giờ trong ngày (tùy chọn)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Từ giờ</span>
                    <input
                      type="time"
                      value={form.time_start}
                      onChange={(e) => updateForm("time_start", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 mb-1">Đến giờ</span>
                    <input
                      type="time"
                      value={form.time_end}
                      onChange={(e) => updateForm("time_end", e.target.value)}
                      className="w-full rounded-lg border px-3 py-2"
                      disabled={saving}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Để trống cả 2 ô nếu áp dụng cả ngày.</p>
              </div>
            </div>
          </section>

          {/* Usage limits */}
          <section className="border-b pb-6">
            <h2 className="text-xl font-semibold mb-4">4. Giới hạn sử dụng</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tổng số lần dùng</label>
                <input
                  type="number"
                  min="0"
                  value={form.total_usage_limit}
                  onChange={(e) => updateForm("total_usage_limit", e.target.value)}
                  placeholder="0 = không giới hạn"
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={saving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số lần / 1 khách</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.usage_per_customer}
                  onChange={(e) => updateForm("usage_per_customer", e.target.value)}
                  className="w-full rounded-lg border px-3 py-2"
                  disabled={saving}
                />
              </div>
            </div>
          </section>

          {/* Status */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Trạng thái</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={1}
                  checked={form.status === 1}
                  onChange={(e) => updateForm("status", Number(e.target.value))}
                  disabled={saving}
                />
                <span>Đang hoạt động</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value={0}
                  checked={form.status === 0}
                  onChange={(e) => updateForm("status", Number(e.target.value))}
                  disabled={saving}
                />
                <span>Tạm tắt</span>
              </label>
            </div>
          </section>

          {/* Actions and alerts */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>

          {err && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{err}</p>
            </div>
          )}
          {okMsg && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{okMsg}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}


