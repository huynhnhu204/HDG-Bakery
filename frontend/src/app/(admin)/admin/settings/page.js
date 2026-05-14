"use client";
import { useEffect, useMemo, useState } from "react";
import { Save, Eye, MapPin, CheckCircle2, AlertCircle, Plus, Trash2 } from "lucide-react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";

export default function AdminSettings() {
  const [form, setForm] = useState({
    // Thông tin chung
    site_name: "",
    email: "",
    phone: "",
    hotline: "",
    address: "",
    logo: "",
    favicon: "",

    // Liên hệ & MXH
    social_facebook: "",
    social_instagram: "",
    social_zalo: "",
    social_tiktok: "",
    google_map_link: "",
    google_map_lat: "",
    google_map_lng: "",
    order_notify_email: "",
    order_notify_phone: "",

    // Giờ mở cửa & nghỉ lễ (JSON string)
    opening_hours_json: "",
    holidays_json: "",

    // Giao hàng
    delivery_areas_json: "",
    delivery_fee_rules_json: "",
    delivery_time_note: "",
    preorder_min_hours: "",
    preorder_min_days: "",
    cutoff_time: "",
    fast_zone_json: "",

    // Thanh toán
    payment_cash: true,
    payment_bank: true,
    payment_wallet: false,
    payment_qr: false,
    payment_note: "",

    // Banner thông báo
    top_banner_enabled: false,
    top_banner_text: "",

    // Giới thiệu & chính sách (HTML)
    about_html: "",
    policy_return_html: "",
    policy_shipping_html: "",
    policy_privacy_html: "",
    policy_terms_html: "",

    // SEO & Business
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    google_business_link: "",

    // Dị ứng
    allergens_enabled: false,
    allergens_note: "",
    allergens_list_json: "",

    // Giao diện
    theme_primary_color: "#f09a29",
    hero_image: "",
    homepage_layout_json: "",

    // Đo lường
    ga_measurement_id: "",
    fb_pixel_id: "",
    extra_head_scripts: "",

    // Email gửi đi
    mail_from_name: "",
    mail_from_address: "",
    mail_transport: "smtp",
    mail_host: "",
    mail_port: "",
    mail_username: "",
    mail_password: "",
    mail_encryption: "",

    // Bảo trì & xuất bản
    maintenance_mode: false,
    maintenance_message: "",
    settings_draft_json: "",
    settings_published_at: "",
    settings_version: 1,

    // Toggle hiển thị ngoài web
    show_hotline_header: true,
    show_open_hours_header: false,
    show_address_header: false,
    show_social_footer: true,
  });
  const [id, setId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // UI-friendly states (will sync with JSON fields)
  const days = ["mon","tue","wed","thu","fri","sat","sun"];
  const [openingHours, setOpeningHours] = useState({
    mon: { enabled: false, open: "08:00", close: "20:00" },
    tue: { enabled: false, open: "08:00", close: "20:00" },
    wed: { enabled: false, open: "08:00", close: "20:00" },
    thu: { enabled: false, open: "08:00", close: "20:00" },
    fri: { enabled: false, open: "08:00", close: "21:00" },
    sat: { enabled: false, open: "08:00", close: "21:00" },
    sun: { enabled: false, open: "08:00", close: "20:00" },
  });
  const [holidays, setHolidays] = useState([]); // {date,label}[]
  const [deliveryAreas, setDeliveryAreas] = useState([]); // {name, eta_note}[]
  const [districtFees, setDistrictFees] = useState([]); // {district, fee, free_from}[]
  const [distanceFees, setDistanceFees] = useState([]); // {km_from, km_to, fee_per_km, base_fee}[]
  const [fastZone, setFastZone] = useState({ radius_km: "", eta_note: "" });
  const allergenOptions = ["egg","milk","nuts","gluten","soy","sesame"];
  const [allergens, setAllergens] = useState([]);
  const homepageBlockOptions = [
    { key: "hero", label: "Ảnh lớn (Hero)" },
    { key: "featured_products", label: "Sản phẩm nổi bật" },
    { key: "promo_banner", label: "Banner khuyến mãi" },
    { key: "posts", label: "Bài viết" },
  ];
  const [homepageBlocks, setHomepageBlocks] = useState([]);

  useEffect(() => {
    (async () => {
      const res = await fetch(`${BASE}${API}/settings`);
      const data = await res.json();
      if (data?.id) setId(data.id);
      const next = {
        ...form,
        ...Object.keys(form).reduce((acc, k) => {
          acc[k] = data?.[k] ?? form[k];
          return acc;
        }, {}),
      };
      // Parse JSON-like fields into UI state (safe try/catch)
      try {
        if (data?.opening_hours_json) {
          const oj = JSON.parse(data.opening_hours_json);
          const oh = { ...openingHours };
          days.forEach((d) => {
            const slots = Array.isArray(oj[d]) ? oj[d] : [];
            if (slots[0]) {
              oh[d] = { enabled: true, open: slots[0].open || "08:00", close: slots[0].close || "20:00" };
            } else {
              oh[d] = { ...oh[d], enabled: false };
            }
          });
          setOpeningHours(oh);
        }
      } catch {}
      try { if (data?.holidays_json) setHolidays(JSON.parse(data.holidays_json)); } catch {}
      try { if (data?.delivery_areas_json) setDeliveryAreas(JSON.parse(data.delivery_areas_json)); } catch {}
      try {
        if (data?.delivery_fee_rules_json) {
          const rules = JSON.parse(data.delivery_fee_rules_json);
          setDistrictFees(rules.filter((r) => r.type === "district").map((r) => ({ district: r.district || "", fee: r.fee || "", free_from: r.free_from || "" })));
          setDistanceFees(rules.filter((r) => r.type === "distance").map((r) => ({ km_from: r.km_from || "", km_to: r.km_to || "", fee_per_km: r.fee_per_km || "", base_fee: r.base_fee || "" })));
        }
      } catch {}
      try { if (data?.fast_zone_json) setFastZone(JSON.parse(data.fast_zone_json)); } catch {}
      try { if (data?.allergens_list_json) setAllergens(JSON.parse(data.allergens_list_json)); } catch {}
      try {
        if (data?.homepage_layout_json) {
          const obj = JSON.parse(data.homepage_layout_json);
          if (Array.isArray(obj.blocks)) setHomepageBlocks(obj.blocks);
        }
      } catch {}
      setForm((f) => ({
        ...f,
        ...next,
      }));
      setLoading(false);
    })();
  }, []);

  const hasBasicErrors = useMemo(() => {
    const emailOk = !form.email || /.+@.+\..+/.test(form.email);
    const orderEmailOk = !form.order_notify_email || /.+@.+\..+/.test(form.order_notify_email);
    const phoneOk = !form.phone || /^\+?\d[\d\s-]{6,}$/.test(form.phone);
    const hotlineOk = !form.hotline || /^\+?\d[\d\s-]{6,}$/.test(form.hotline);
    return !(emailOk && orderEmailOk && phoneOk && hotlineOk);
  }, [form]);

  async function save() {
    setError("");
    if (hasBasicErrors) {
      setError("Vui lòng kiểm tra lại email/số điện thoại");
      return;
    }
    // Build JSON fields from UI-friendly state
    const opening_hours_json = JSON.stringify(days.reduce((acc, d) => {
      const row = openingHours[d];
      acc[d] = row?.enabled ? [{ open: row.open, close: row.close }] : [];
      return acc;
    }, {}));
    const holidays_json = JSON.stringify(holidays.filter((h) => h && h.date));
    const delivery_areas_json = JSON.stringify(deliveryAreas.filter((a) => a && a.name));
    const delivery_fee_rules_json = JSON.stringify([
      ...districtFees.filter((r) => r && r.district).map((r) => ({ type: "district", district: r.district, fee: Number(r.fee || 0), free_from: r.free_from ? Number(r.free_from) : undefined })),
      ...distanceFees.filter((r) => r && (r.km_from !== "" || r.km_to !== "")).map((r) => ({ type: "distance", km_from: Number(r.km_from || 0), km_to: r.km_to === "" ? null : Number(r.km_to), fee_per_km: Number(r.fee_per_km || 0), base_fee: Number(r.base_fee || 0) })),
    ]);
    const fast_zone_json = JSON.stringify({ radius_km: fastZone.radius_km ? Number(fastZone.radius_km) : undefined, eta_note: fastZone.eta_note || undefined });
    const allergens_list_json = JSON.stringify(allergens);
    const homepage_layout_json = JSON.stringify({ blocks: homepageBlocks });

    const payload = {
      ...form,
      opening_hours_json,
      holidays_json,
      delivery_areas_json,
      delivery_fee_rules_json,
      fast_zone_json,
      allergens_list_json,
      homepage_layout_json,
    };
    setSaving(true);
    const method = id ? "PUT" : "POST";
    const url = id ? `${BASE}${API}/settings/${id}` : `${BASE}${API}/settings`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setSaving(false);
      alert("❌ Lưu thất bại! Kiểm tra console/log nhé.");
      console.error(await res.text());
      return;
    }

    setSaving(false);
    alert("✅ Đã lưu thành công!");
  }

  if (loading) return <div className="p-6 text-gray-500">Đang tải cấu hình…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cài đặt website</h1>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50"
            rel="noreferrer"
          >
            <Eye size={16} /> Xem trước
          </a>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-60"
          >
            <Save size={18} /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Thông tin chung */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Thông tin chung</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Tên website</span>
            <input
              value={form.site_name}
              onChange={(e) => setForm((f) => ({ ...f, site_name: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-300 outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Email</span>
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-300 outline-none"
              placeholder="vi du: hello@tenmien.vn"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Điện thoại</span>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-300 outline-none"
              placeholder="+84 909 000 000"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Hotline</span>
            <input
              value={form.hotline}
              onChange={(e) => setForm((f) => ({ ...f, hotline: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-300 outline-none"
              placeholder="1900 xxxx"
            />
          </label>
          <label className="md:col-span-2 block">
            <span className="text-sm text-gray-600">Địa chỉ</span>
            <div className="flex gap-2">
              <input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                className="mt-1 w-full border rounded-lg px-3 py-2"
              />
            </div>
          </label>
          <label>
            <span className="text-sm text-gray-600">Logo (URL)</span>
            <input
              value={form.logo}
              onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="/uploads/logo.png"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Favicon (URL)</span>
            <input
              value={form.favicon}
              onChange={(e) => setForm((f) => ({ ...f, favicon: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="/uploads/favicon.png"
            />
          </label>
        </div>
      </section>

      {/* Liên hệ & Mạng xã hội */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Liên hệ & Mạng xã hội</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-gray-600">Facebook</span>
            <input
              value={form.social_facebook}
              onChange={(e) => setForm((f) => ({ ...f, social_facebook: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="https://facebook.com/tenpage"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Instagram</span>
            <input
              value={form.social_instagram}
              onChange={(e) => setForm((f) => ({ ...f, social_instagram: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="https://instagram.com/tenpage"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">Zalo</span>
            <input
              value={form.social_zalo}
              onChange={(e) => setForm((f) => ({ ...f, social_zalo: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="https://zalo.me/0909xxxxxx"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-600">TikTok</span>
            <input
              value={form.social_tiktok}
              onChange={(e) => setForm((f) => ({ ...f, social_tiktok: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="https://tiktok.com/@tenpage"
            />
          </label>
          <label className="md:col-span-2 block">
            <span className="text-sm text-gray-600">Google Map Link</span>
            <div className="flex gap-2">
              <input
                value={form.google_map_link}
                onChange={(e) => setForm((f) => ({ ...f, google_map_link: e.target.value }))}
                className="mt-1 w-full border rounded-lg px-3 py-2"
                placeholder="https://maps.google.com/..."
              />
              <a
                href={form.google_map_link || "https://maps.google.com"}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-gray-50"
              >
                <MapPin size={16} /> Mở bản đồ
              </a>
            </div>
          </label>
          <label>
            <span className="text-sm text-gray-600">Lat</span>
            <input
              value={form.google_map_lat}
              onChange={(e) => setForm((f) => ({ ...f, google_map_lat: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="10.762622"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Lng</span>
            <input
              value={form.google_map_lng}
              onChange={(e) => setForm((f) => ({ ...f, google_map_lng: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="106.660172"
            />
          </label>
          <label>
            <span className="text-sm text-gray-800">Email nhận đơn</span>
            <input
              value={form.order_notify_email}
              onChange={(e) => setForm((f) => ({ ...f, order_notify_email: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="orders@yourshop.com"
            />
          </label>
          <label>
            <span className="text-sm text-gray-800">Số nhận cuộc gọi</span>
            <input
              value={form.order_notify_phone}
              onChange={(e) => setForm((f) => ({ ...f, order_notify_phone: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="0909 000 000"
            />
          </label>
        </div>
      </section>

      {/* Giờ mở cửa & ngày nghỉ */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Giờ mở cửa & Ngày nghỉ</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-1 pr-4">Ngày</th>
                  <th className="py-1 pr-4">Mở cửa</th>
                  <th className="py-1 pr-4">Đóng cửa</th>
                  <th className="py-1">Bật</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d} className="border-t">
                    <td className="py-2 pr-4 capitalize">{d}</td>
                    <td className="py-2 pr-4">
                      <input type="time" value={openingHours[d].open} onChange={(e) => setOpeningHours((oh) => ({ ...oh, [d]: { ...oh[d], open: e.target.value } }))} className="border rounded px-2 py-1" />
                    </td>
                    <td className="py-2 pr-4">
                      <input type="time" value={openingHours[d].close} onChange={(e) => setOpeningHours((oh) => ({ ...oh, [d]: { ...oh[d], close: e.target.value } }))} className="border rounded px-2 py-1" />
                    </td>
                    <td className="py-2">
                      <input type="checkbox" checked={openingHours[d].enabled} onChange={(e) => setOpeningHours((oh) => ({ ...oh, [d]: { ...oh[d], enabled: e.target.checked } }))} className="h-4 w-4 accent-orange-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div className="font-medium text-gray-800 mb-2">Ngày nghỉ lễ</div>
            <div className="space-y-2">
              {holidays.map((h, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <input type="date" value={h.date || ""} onChange={(e) => setHolidays((arr) => arr.map((x, i) => i === idx ? { ...x, date: e.target.value } : x))} className="border rounded px-3 py-2" />
                  <input type="text" placeholder="Nhãn" value={h.label || ""} onChange={(e) => setHolidays((arr) => arr.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))} className="border rounded px-3 py-2 md:col-span-2" />
                  <button onClick={() => setHolidays((arr) => arr.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-sm"><Trash2 size={14} /> Xoá</button>
                </div>
              ))}
              <button onClick={() => setHolidays((arr) => [...arr, { date: "", label: "" }])} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"><Plus size={14} /> Thêm ngày nghỉ</button>
            </div>
          </div>
        </div>
      </section>

      {/* Giao hàng */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Giao hàng</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <div className="font-medium text-gray-800 mb-2">Khu vực phục vụ</div>
            <div className="space-y-2">
              {deliveryAreas.map((a, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                  <input value={a.name || ""} onChange={(e) => setDeliveryAreas((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} className="border rounded px-3 py-2" placeholder="Tên khu vực (vd: Q11)" />
                  <input value={a.eta_note || ""} onChange={(e) => setDeliveryAreas((arr) => arr.map((x, i) => i === idx ? { ...x, eta_note: e.target.value } : x))} className="border rounded px-3 py-2 md:col-span-2" placeholder="Thời gian dự kiến (vd: 30–45 phút)" />
                  <button onClick={() => setDeliveryAreas((arr) => arr.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-sm"><Trash2 size={14} /> Xoá</button>
                </div>
              ))}
              <button onClick={() => setDeliveryAreas((arr) => [...arr, { name: "", eta_note: "" }])} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"><Plus size={14} /> Thêm khu vực</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="font-medium text-gray-800 mb-2">Phí theo quận</div>
              <div className="space-y-2">
                {districtFees.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                    <input value={r.district || ""} onChange={(e) => setDistrictFees((arr) => arr.map((x, i) => i === idx ? { ...x, district: e.target.value } : x))} className="border rounded px-2 py-1 col-span-1" placeholder="Quận" />
                    <input type="number" value={r.fee || ""} onChange={(e) => setDistrictFees((arr) => arr.map((x, i) => i === idx ? { ...x, fee: e.target.value } : x))} className="border rounded px-2 py-1 col-span-1" placeholder="Phí" />
                    <input type="number" value={r.free_from || ""} onChange={(e) => setDistrictFees((arr) => arr.map((x, i) => i === idx ? { ...x, free_from: e.target.value } : x))} className="border rounded px-2 py-1 col-span-1" placeholder="Miễn phí từ" />
                    <button onClick={() => setDistrictFees((arr) => arr.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-sm col-span-1 justify-self-start"><Trash2 size={14} /> Xoá</button>
                  </div>
                ))}
                <button onClick={() => setDistrictFees((arr) => [...arr, { district: "", fee: "", free_from: "" }])} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"><Plus size={14} /> Thêm phí quận</button>
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-800 mb-2">Phí theo khoảng cách</div>
              <div className="space-y-2">
                {distanceFees.map((r, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <input type="number" value={r.km_from || ""} onChange={(e) => setDistanceFees((arr) => arr.map((x, i) => i === idx ? { ...x, km_from: e.target.value } : x))} className="border rounded px-2 py-1" placeholder="Từ km" />
                    <input type="number" value={r.km_to || ""} onChange={(e) => setDistanceFees((arr) => arr.map((x, i) => i === idx ? { ...x, km_to: e.target.value } : x))} className="border rounded px-2 py-1" placeholder="Đến km" />
                    <input type="number" value={r.fee_per_km || ""} onChange={(e) => setDistanceFees((arr) => arr.map((x, i) => i === idx ? { ...x, fee_per_km: e.target.value } : x))} className="border rounded px-2 py-1" placeholder="đ/km" />
                    <input type="number" value={r.base_fee || ""} onChange={(e) => setDistanceFees((arr) => arr.map((x, i) => i === idx ? { ...x, base_fee: e.target.value } : x))} className="border rounded px-2 py-1" placeholder="Phí nền" />
                    <button onClick={() => setDistanceFees((arr) => arr.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700 inline-flex items-center gap-1 text-sm"><Trash2 size={14} /> Xoá</button>
                  </div>
                ))}
                <button onClick={() => setDistanceFees((arr) => [...arr, { km_from: "", km_to: "", fee_per_km: "", base_fee: "" }])} className="inline-flex items-center gap-2 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm"><Plus size={14} /> Thêm bậc khoảng cách</button>
              </div>
            </div>
          </div>
          <label>
            <span className="text-sm text-gray-600">Ghi chú thời gian giao</span>
            <input
              value={form.delivery_time_note}
              onChange={(e) => setForm((f) => ({ ...f, delivery_time_note: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Giao trong 30–60 phút tùy khu vực"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Đặt trước tối thiểu (giờ)</span>
            <input
              value={form.preorder_min_hours}
              onChange={(e) => setForm((f) => ({ ...f, preorder_min_hours: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Đặt trước tối thiểu (ngày)</span>
            <input
              value={form.preorder_min_days}
              onChange={(e) => setForm((f) => ({ ...f, preorder_min_days: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              type="number"
              min={0}
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Giờ cắt đơn</span>
            <input
              value={form.cutoff_time}
              onChange={(e) => setForm((f) => ({ ...f, cutoff_time: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              type="time"
            />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
            <label>
              <span className="text-sm text-gray-600">Bán kính giao nhanh (km)</span>
              <input type="number" value={fastZone.radius_km} onChange={(e) => setFastZone((fz) => ({ ...fz, radius_km: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="2" />
            </label>
            <label>
              <span className="text-sm text-gray-600">Ghi chú giao nhanh</span>
              <input value={fastZone.eta_note} onChange={(e) => setFastZone((fz) => ({ ...fz, eta_note: e.target.value }))} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="~20 phút quanh tiệm" />
            </label>
          </div>
        </div>
      </section>

      {/* Thanh toán */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Hình thức thanh toán</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle label="Tiền mặt" value={form.payment_cash} onChange={(v) => setForm((f) => ({ ...f, payment_cash: v }))} />
          <Toggle label="Chuyển khoản" value={form.payment_bank} onChange={(v) => setForm((f) => ({ ...f, payment_bank: v }))} />
          <Toggle label="Ví điện tử" value={form.payment_wallet} onChange={(v) => setForm((f) => ({ ...f, payment_wallet: v }))} />
          <Toggle label="QR" value={form.payment_qr} onChange={(v) => setForm((f) => ({ ...f, payment_qr: v }))} />
          <label className="md:col-span-2">
            <span className="text-sm text-gray-600">Ghi chú thanh toán</span>
            <input
              value={form.payment_note}
              onChange={(e) => setForm((f) => ({ ...f, payment_note: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
        </div>
      </section>

      {/* Banner thông báo */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Thông báo trên web (Banner)</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Toggle label="Bật banner" value={form.top_banner_enabled} onChange={(v) => setForm((f) => ({ ...f, top_banner_enabled: v }))} />
          <label>
            <span className="text-sm text-gray-600">Nội dung banner</span>
            <input
              value={form.top_banner_text}
              onChange={(e) => setForm((f) => ({ ...f, top_banner_text: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="Giờ vàng 15–17h giảm 15%"
            />
          </label>
        </div>
      </section>

      {/* Giới thiệu & Chính sách */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Giới thiệu & Chính sách</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HtmlField label="Giới thiệu" value={form.about_html} onChange={(v) => setForm((f) => ({ ...f, about_html: v }))} />
          <HtmlField label="Chính sách đổi trả" value={form.policy_return_html} onChange={(v) => setForm((f) => ({ ...f, policy_return_html: v }))} />
          <HtmlField label="Chính sách giao hàng" value={form.policy_shipping_html} onChange={(v) => setForm((f) => ({ ...f, policy_shipping_html: v }))} />
          <HtmlField label="Bảo mật" value={form.policy_privacy_html} onChange={(v) => setForm((f) => ({ ...f, policy_privacy_html: v }))} />
          <HtmlField label="Điều khoản" value={form.policy_terms_html} onChange={(v) => setForm((f) => ({ ...f, policy_terms_html: v }))} />
        </div>
      </section>

      {/* SEO & Business */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">SEO & Google Business</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-sm text-gray-600">Meta title</span>
            <input
              value={form.meta_title}
              onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Meta keywords</span>
            <input
              value={form.meta_keywords}
              onChange={(e) => setForm((f) => ({ ...f, meta_keywords: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm text-gray-600">Meta description</span>
            <textarea
              value={form.meta_description}
              onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 h-24"
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm text-gray-600">Google Business / Maps link</span>
            <input
              value={form.google_business_link}
              onChange={(e) => setForm((f) => ({ ...f, google_business_link: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="https://g.page/..."
            />
          </label>
        </div>
      </section>

      {/* Dị ứng & thành phần */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Dị ứng / Thành phần</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <Toggle label="Hiển thị cảnh báo dị ứng" value={form.allergens_enabled} onChange={(v) => setForm((f) => ({ ...f, allergens_enabled: v }))} />
          <label>
            <span className="text-sm text-gray-600">Ghi chú dị ứng</span>
            <input
              value={form.allergens_note}
              onChange={(e) => setForm((f) => ({ ...f, allergens_note: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <div className="md:col-span-2">
            <span className="text-sm text-gray-600">Chọn các thành phần có thể gây dị ứng</span>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              {allergenOptions.map((opt) => (
                <Toggle key={opt} label={opt} value={allergens.includes(opt)} onChange={(v) => setAllergens((list) => v ? Array.from(new Set([...list, opt])) : list.filter((x) => x !== opt))} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Tuỳ chỉnh giao diện */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Tuỳ chỉnh giao diện</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-sm text-gray-600">Màu chủ đạo</span>
            <input
              type="color"
              value={form.theme_primary_color}
              onChange={(e) => setForm((f) => ({ ...f, theme_primary_color: e.target.value }))}
              className="mt-1 h-10 w-16 border rounded"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Ảnh bìa (URL)</span>
            <input
              value={form.hero_image}
              onChange={(e) => setForm((f) => ({ ...f, hero_image: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="/uploads/hero.jpg"
            />
          </label>
          <div className="md:col-span-2">
            <span className="text-sm text-gray-600">Chọn các khối trang chủ</span>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              {homepageBlockOptions.map((b) => (
                <Toggle key={b.key} label={b.label} value={homepageBlocks.includes(b.key)} onChange={(v) => setHomepageBlocks((arr) => v ? Array.from(new Set([...arr, b.key])) : arr.filter((x) => x !== b.key))} />
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">Thứ tự mặc định: hero → featured_products → promo_banner → posts</div>
          </div>
        </div>
      </section>

      {/* Mã đo lường */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Mã đo lường</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-sm text-gray-600">GA Measurement ID</span>
            <input
              value={form.ga_measurement_id}
              onChange={(e) => setForm((f) => ({ ...f, ga_measurement_id: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="G-XXXXXXX"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Facebook Pixel ID</span>
            <input
              value={form.fb_pixel_id}
              onChange={(e) => setForm((f) => ({ ...f, fb_pixel_id: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="1234567890"
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm text-gray-600">Mã chèn vào thẻ head</span>
            <textarea
              value={form.extra_head_scripts}
              onChange={(e) => setForm((f) => ({ ...f, extra_head_scripts: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 h-24 font-mono text-xs"
              placeholder="<!-- thẻ script -->"
            />
          </label>
        </div>
      </section>

      {/* Email gửi đi */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Email gửi đi</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label>
            <span className="text-sm text-gray-600">From name</span>
            <input
              value={form.mail_from_name}
              onChange={(e) => setForm((f) => ({ ...f, mail_from_name: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">From address</span>
            <input
              value={form.mail_from_address}
              onChange={(e) => setForm((f) => ({ ...f, mail_from_address: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Transport</span>
            <select
              value={form.mail_transport}
              onChange={(e) => setForm((f) => ({ ...f, mail_transport: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            >
              <option value="smtp">smtp</option>
              <option value="sendmail">sendmail</option>
              <option value="log">log</option>
            </select>
          </label>
          <label>
            <span className="text-sm text-gray-600">Host</span>
            <input
              value={form.mail_host}
              onChange={(e) => setForm((f) => ({ ...f, mail_host: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Port</span>
            <input
              type="number"
              value={form.mail_port}
              onChange={(e) => setForm((f) => ({ ...f, mail_port: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Username</span>
            <input
              value={form.mail_username}
              onChange={(e) => setForm((f) => ({ ...f, mail_username: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Password</span>
            <input
              type="password"
              value={form.mail_password}
              onChange={(e) => setForm((f) => ({ ...f, mail_password: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label>
            <span className="text-sm text-gray-600">Encryption</span>
            <input
              value={form.mail_encryption}
              onChange={(e) => setForm((f) => ({ ...f, mail_encryption: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              placeholder="tls/ssl"
            />
          </label>
        </div>
      </section>

      {/* Bảo trì & xuất bản */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Bảo trì & Xuất bản</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <Toggle label="Bật chế độ bảo trì" value={form.maintenance_mode} onChange={(v) => setForm((f) => ({ ...f, maintenance_mode: v }))} />
          <label>
            <span className="text-sm text-gray-600">Thông báo bảo trì</span>
            <input
              value={form.maintenance_message}
              onChange={(e) => setForm((f) => ({ ...f, maintenance_message: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2"
            />
          </label>
          <label className="md:col-span-2">
            <span className="text-sm text-gray-600">Bản nháp (JSON)</span>
            <textarea
              value={form.settings_draft_json}
              onChange={(e) => setForm((f) => ({ ...f, settings_draft_json: e.target.value }))}
              className="mt-1 w-full border rounded-lg px-3 py-2 h-24 font-mono text-xs"
              placeholder='{"top_banner_enabled":true}'
            />
          </label>
          <div className="text-xs text-gray-500 md:col-span-2 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-600" />
            Đã xuất bản lúc: {form.settings_published_at || "—"} • Phiên bản: {form.settings_version || 1}
          </div>
        </div>
      </section>

      {/* Hiển thị ngoài web */}
      <section className="rounded-xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Hiển thị ngoài web (Header/Footer)</h2>
          <SmallSave onClick={save} saving={saving} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Toggle label="Hiện Hotline trên Header" value={form.show_hotline_header} onChange={(v) => setForm((f) => ({ ...f, show_hotline_header: v }))} />
          <Toggle label="Hiện giờ mở cửa trên Header" value={form.show_open_hours_header} onChange={(v) => setForm((f) => ({ ...f, show_open_hours_header: v }))} />
          <Toggle label="Hiện địa chỉ trên Header" value={form.show_address_header} onChange={(v) => setForm((f) => ({ ...f, show_address_header: v }))} />
          <Toggle label="Hiện MXH ở Footer" value={form.show_social_footer} onChange={(v) => setForm((f) => ({ ...f, show_social_footer: v }))} />
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-60"
        >
          <Save size={18} /> {saving ? "Đang lưu…" : "Lưu tất cả"}
        </button>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-3 select-none">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-orange-600"
      />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  );
}

function HtmlField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full border rounded-lg px-3 py-2 h-32"
        placeholder="<p>Nội dung HTML đơn giản...</p>"
      />
    </label>
  );
}

function SmallSave({ onClick, saving }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
    >
      <Save size={14} /> {saving ? "Đang lưu…" : "Lưu khối này"}
    </button>
  );
}
