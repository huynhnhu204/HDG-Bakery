// src/components/ProfileClient.js
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/* ================== Auth + Local cache ================== */
const TOKEN_KEY   = "auth_token";
const PROFILE_KEY = "dola_profile";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_V1   = `${API_BASE}/api/v1`;

function getToken()  { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
function setProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {} }
function getProfile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; } }
function clearToken(){ try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(PROFILE_KEY); } catch {} }

/* ================== API helpers ================== */
async function apiMe(token) {
  const r = await fetch(`${API_V1}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}
async function apiUpdateProfile(token, body) {
  const r = await fetch(`${API_V1}/auth/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || "Cập nhật thất bại");
  return j;
}
async function apiChangePassword(token, current_password, new_password) {
  const r = await fetch(`${API_V1}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type":"application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ current_password, new_password }),
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || "Đổi mật khẩu thất bại");
  return j;
}
async function apiMyOrders(token, page=1, per=10) {
  const r = await fetch(`${API_V1}/orders/my?per_page=${per}&page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}
// 🔹 Membership
async function apiMyMembership(token) {
  const r = await fetch(`${API_V1}/membership/me`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}
async function apiCancelMyOrder(token, id, reason) {
  const r = await fetch(`${API_V1}/orders/my/${id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || "Không thể huỷ đơn");
  return j;
}
// 🔹 LẤY CHI TIẾT ĐƠN HÀNG
async function apiMyOrderDetail(token, id) {
  const r = await fetch(`${API_V1}/orders/my/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

// 🔹 Gửi lại email xác thực (giống trang đăng ký)
async function apiRequestVerify(email) {
  const r = await fetch(`${API_V1}/auth/resend-verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const j = await r.json().catch(()=> ({}));
  if (!r.ok) throw new Error(j?.message || "Không thể gửi email xác thực");
  return j;
}

/* ================== UI helpers ================== */
const FALLBACK_PROFILE = {
  name: "Người dùng mới",
  email: "",
  avatar: "/logo.png",
  joined: new Date().toISOString().slice(0,10),
  phone: "",
  address: "",
  birthday: "",
  province: "", district: "", ward: "", address_detail: "",
  verified: false,
};

const toDate = (s)=> s ? new Date(s) : null;
const fmtDate = (s)=> {
  const d = toDate(s);
  try { return d ? d.toLocaleDateString("vi-VN") : "—"; } catch { return s || "—"; }
};
// 🔹 Định dạng VND
const fmtVND = (n)=> (Number(n)||0).toLocaleString("vi-VN") + "đ";

function parseAddressLoose(address) {
  if (!address) return { address_detail: "", provinceName: "", districtName: "", wardName: "" };
  const parts = address.split(",").map(s=>s.trim());
  if (parts.length <= 1) return { address_detail: address, provinceName: "", districtName: "", wardName: "" };
  const provinceName = parts[parts.length-1] || "";
  const districtName = parts[parts.length-2] || "";
  const wardName = parts[parts.length-3] || "";
  const address_detail = parts.slice(0, Math.max(1, parts.length-3)).join(", ");
  return { address_detail, provinceName, districtName, wardName };
}

// 🔹 Build URL ảnh tuyệt đối (nếu BE trả đường dẫn tương đối)
const absUrl = (urlOrPath) => {
  if (!urlOrPath) return "";
  return /^https?:\/\//i.test(urlOrPath) ? urlOrPath : `${API_BASE}${urlOrPath}`;
};

/* ================== Component ================== */
export default function ProfileClient() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [profile, setProfileState] = useState(FALLBACK_PROFILE);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });
  const [err, setErr] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  // Đổi mật khẩu
  const [pwd, setPwd] = useState({ current: "", next: "", next2: "" });
  const [pwdBusy, setPwdBusy] = useState(false);

  // Orders
  const [orders, setOrders] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Membership
  const [member, setMember] = useState({ level:"dong", label:"Đồng", total_orders:0, total_spent:0, progress:{ to:"bac", to_label:"Bạc", percent:0, remaining:0 }, benefits:[] });
  const [loadingMember, setLoadingMember] = useState(true);

  // 🔹 Chi tiết đơn
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);

  // 🔹 Cancel modals
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [cancelCreatedAt, setCancelCreatedAt] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelPreset, setCancelPreset] = useState("");
  const [cannotOpen, setCannotOpen] = useState(false);

  // Xác thực tài khoản
  const [verifyBusy, setVerifyBusy] = useState(false);

  // Địa chỉ VN
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);

  const toastTimer = useRef(null);
  const token = useMemo(() => getToken(), []);

  const showToast = (msg, type="success") => {
    setToast({ type, msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast({ type:"", msg:"" }), 2200);
  };
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ================== Load profile ================== */
  useEffect(() => {
    if (!token) { router.replace("/login?next=/profile"); return; }

    const cached = getProfile();
    const afterLoad = (p) => {
      const parsed = parseAddressLoose(p.address || "");
      setProfileState((prev)=> ({
        ...prev, ...p,
        address_detail: parsed.address_detail,
        province: "", district: "", ward: "",
      }));
      setChecking(false);
    };

    if (cached) {
      // Hiển thị cache trước cho nhanh, nhưng vẫn phải sync lại từ server
      // để tránh trạng thái "chưa xác thực" bị cũ sau khi user đã verify.
      afterLoad({ ...FALLBACK_PROFILE, ...cached });
    }

    (async () => {
      try {
        const me = await apiMe(token);
        const p = {
          name: me.customer?.name || me.user?.name || FALLBACK_PROFILE.name,
          email: me.user?.email || "",
          avatar: me.user?.avatar || "/logo.png",
          joined: me.user?.created_at || new Date().toISOString(),
          phone: me.customer?.phone || "",
          address: me.customer?.address || "",
          birthday: me.customer?.birthday || "",
          province: "", district: "", ward: "", address_detail: "",
          verified: !!(me.user?.email_verified_at || me.user?.verified || me.user?.is_verified || me.customer?.verified_at),
        };
        setProfile(p);
        afterLoad(p);
      } catch (e) {
        console.error(e);
        clearToken();
        router.replace("/login");
      }
    })();
  }, [router, token]);

  // Load membership function - định nghĩa trước để có thể gọi từ loadOrders
  const loadMembership = async () => {
    if (!token) return;
    setLoadingMember(true);
    try {
      const j = await apiMyMembership(token);
      setMember(j || {});
      console.log('Membership loaded:', {
        total_orders: j?.total_orders,
        total_spent: j?.total_spent,
        level: j?.level,
        label: j?.label,
        progress: j?.progress,
        raw_response: j
      });
      
      // Kiểm tra nếu dữ liệu = 0 nhưng có đơn hàng delivered
      if ((!j?.total_orders || j.total_orders === 0) && orders.data?.length > 0) {
        const deliveredOrders = orders.data.filter(o => 
          String(o.status_text || o.status).toLowerCase() === 'delivered' || 
          Number(o.status) === 3
        );
        if (deliveredOrders.length > 0) {
          console.warn('⚠️ Membership shows 0 but has delivered orders:', {
            delivered_count: deliveredOrders.length,
            all_orders: orders.data.length,
            membership_response: j
          });
        }
      }
    } catch (e) {
      console.error('Failed to load membership:', e);
      // Giữ giá trị cũ nếu lỗi
    } finally {
      setLoadingMember(false);
    }
  };

  /* ================== Orders ================== */
  async function loadOrders(page=1) {
    if (!token) return;
    setLoadingOrders(true);
    try {
      const j = await apiMyOrders(token, page, 10);
      setOrders(j);
      // Sau khi load orders xong, reload membership để cập nhật số liệu
      // Delay để đảm bảo backend đã xử lý xong
      if (token) {
        setTimeout(() => {
          loadMembership();
        }, 1000);
      }
    } catch (e) {
      console.error(e);
      setOrders({ data: [], current_page: 1, last_page: 1, total: 0 });
    } finally {
      setLoadingOrders(false);
    }
  }
  useEffect(() => { if (token) loadOrders(1); }, [token]);

  // Load membership on mount and when token changes
  useEffect(() => {
    if (token) loadMembership();
  }, [token]);

  // Auto-refresh membership every 30 seconds (in case admin updates order status)
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadMembership();
    }, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  // Reload membership when orders are reloaded (in case admin updated order status)
  useEffect(() => {
    if (token && !loadingOrders) {
      // Delay slightly to ensure backend has processed the update
      const timer = setTimeout(() => {
        loadMembership();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [orders.data.length, token, loadingOrders]);

  function onCancelOrder(id, createdAt) {
    // kiểm tra 12 giờ → nếu quá, mở cảnh báo không thể huỷ
    try {
      const createdTs = new Date(createdAt).getTime();
      const twelveHoursMs = 12 * 60 * 60 * 1000;
      if (!isNaN(createdTs) && (Date.now() - createdTs) > twelveHoursMs) {
        setCannotOpen(true);
        setCancelId(id);
        setCancelCreatedAt(createdAt || "");
        return;
      }
    } catch {}

    // trong 12h → mở modal nhập lý do
    setCancelId(id);
    setCancelCreatedAt(createdAt || "");
    setCancelReason("");
    setCancelPreset("");
    setCancelOpen(true);
  }

  async function submitCancel() {
    if (!cancelId) return;
    const reason = (cancelPreset === 'other' ? cancelReason : cancelPreset) || cancelReason || "";
    setCancelBusy(true);
    try {
      await apiCancelMyOrder(token, cancelId, reason);
      setCancelOpen(false);
      showToast("Đã huỷ đơn hàng", "success");
      loadOrders(orders.current_page);
    } catch (e) {
      showToast(e?.message || "Huỷ đơn thất bại", "error");
    } finally {
      setCancelBusy(false);
    }
  }

  // 🔹 Xem chi tiết đơn (modal)
  async function onViewOrder(id) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError("");
    setSelectedOrder(null);
    setOrderDetails([]);
    try {
      const data = await apiMyOrderDetail(token, id);
      setSelectedOrder(data);
      setOrderDetails(Array.isArray(data?.details) ? data.details : []);
    } catch (e) {
      setDetailError(e?.message || "Không thể tải chi tiết đơn hàng");
    } finally {
      setDetailLoading(false);
    }
  }

  // 🔹 Tính tổng từ chi tiết (fallback khi BE không trả)
  const detailSummary = useMemo(() => {
    const qty = orderDetails.reduce((s,i)=> s + (Number(i.quantity)||0), 0);
    const sum = orderDetails.reduce((s,i)=> s + (Number(i.price)||0) * (Number(i.quantity)||0), 0);
    return { qty, sum };
  }, [orderDetails]);

  /* ================== Địa chỉ VN ================== */
  useEffect(() => {
    let alive = true;
    fetch("https://provinces.open-api.vn/api/p/")
      .then((res) => res.json())
      .then((data) => alive && setProvinces(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    if (profile.province) {
      fetch(`https://provinces.open-api.vn/api/p/${profile.province}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setDistricts(data?.districts || []);
          setWards([]);
          setProfileState((f) => ({ ...f, district: "", ward: "" }));
        })
        .catch(() => {
          if (!alive) return;
          setDistricts([]); setWards([]);
        });
    } else {
      setDistricts([]); setWards([]);
      setProfileState((f) => ({ ...f, district: "", ward: "" }));
    }
    return () => { alive = false; };
  }, [profile.province]);
  useEffect(() => {
    let alive = true;
    if (profile.district) {
      fetch(`https://provinces.open-api.vn/api/d/${profile.district}?depth=2`)
        .then((res) => res.json())
        .then((data) => {
          if (!alive) return;
          setWards(data?.wards || []);
          setProfileState((f) => ({ ...f, ward: "" }));
        })
        .catch(() => {
          if (!alive) return;
          setWards([]);
        });
    } else {
      setWards([]);
      setProfileState((f) => ({ ...f, ward: "" }));
    }
    return () => { alive = false; };
  }, [profile.district]);

  const provinceName = provinces.find(p=> String(p.code) === String(profile.province))?.name || "";
  const districtName = districts.find(d=> String(d.code) === String(profile.district))?.name || "";
  const wardName     = wards.find(w=> String(w.code) === String(profile.ward))?.name || "";

  const fullAddress = [profile.address_detail, wardName, districtName, provinceName]
    .map(s => (s || "").trim())
    .filter(Boolean)
    .join(", ");

  /* ================== UI handlers ================== */
  if (checking) {
    return (
      <main className="container mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-60 bg-orange-200/40 rounded" />
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gray-200" />
              <div className="space-y-2">
                <div className="h-5 w-40 bg-gray-200 rounded" />
                <div className="h-4 w-64 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="h-12 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  const startEdit = () => {
    setErr("");
    setAvatarPreview(profile.avatar || "/logo.png");
    setEditing(true);
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (loading) return;
    setErr(""); setLoading(true);

    if (!profile.name?.trim()) { setErr("Vui lòng nhập họ tên."); setLoading(false); return; }
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) { setErr("Email không hợp lệ."); setLoading(false); return; }

    try {
      const body = {
        ...profile,
        address: fullAddress || profile.address || "",
      };
      delete body.province; delete body.district; delete body.ward; delete body.address_detail;

      const json = await apiUpdateProfile(token, body);

      const saved = json.customer ? {
        ...profile,
        name: json.customer.name ?? profile.name,
        phone: json.customer.phone ?? profile.phone,
        address: json.customer.address ?? fullAddress,
        birthday: json.customer.birthday ?? profile.birthday,
      } : { ...profile, address: fullAddress };

      setProfileState(saved);
      setProfile(saved);
      setEditing(false);
      showToast("Đã lưu thay đổi! 🎉", "success");
    } catch (err) {
      console.error(err);
      setErr(err?.message || "Không thể cập nhật hồ sơ.");
      showToast("Cập nhật thất bại", "error");
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    if (!confirm("Bạn chắc chắn muốn đăng xuất?")) return;
    clearToken();
    router.replace("/login");
  };

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email || "");
      showToast("Đã sao chép email!", "success");
    } catch {
      showToast("Không thể sao chép", "error");
    }
  };

  const onSendVerify = async () => {
    if (verifyBusy || !profile.email) return;
    setVerifyBusy(true);
    try {
      await apiRequestVerify(profile.email);
      showToast("Đã gửi email xác thực. Vui lòng kiểm tra hộp thư và click vào link 'Verify Email'.", "success");
    } catch (e) {
      showToast(e?.message || "Gửi email xác thực thất bại", "error");
    } finally {
      setVerifyBusy(false);
    }
  };

  async function submitChangePassword(e) {
    e.preventDefault();
    if (pwd.next.length < 6) { setErr("Mật khẩu mới tối thiểu 6 ký tự"); return; }
    if (pwd.next !== pwd.next2) { setErr("Xác nhận mật khẩu mới không khớp"); return; }
    setErr(""); setPwdBusy(true);
    try {
      await apiChangePassword(token, pwd.current, pwd.next);
      setPwd({ current:"", next:"", next2:"" });
      showToast("Đổi mật khẩu thành công", "success");
    } catch (e) {
      setErr(e?.message || "Đổi mật khẩu thất bại");
      showToast("Đổi mật khẩu thất bại", "error");
    } finally {
      setPwdBusy(false);
    }
  }

  /* ================== Render ================== */
  return (
    <main className="container mx-auto px-4 py-10">
      {!!toast.msg && (
        <div
          className={`fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-white shadow-lg animate-slideDown
          ${toast.type==="error" ? "bg-red-600" : "bg-emerald-600"}`}
        >
          {toast.msg}
        </div>
      )}

      <h1 className="text-3xl font-bold text-orange-600 mb-6">Hồ sơ cá nhân</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left */}
        <section className="lg:col-span-1 bg-white rounded-2xl shadow border p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-2 ring-orange-200 shadow-sm">
              <Image
                src={(editing ? (avatarPreview || profile.avatar) : profile.avatar) || "/logo.png"}
                alt="avatar"
                fill
                className="object-cover"
                sizes="112px"
                priority
              />
            </div>

            <h2 className="mt-4 text-xl font-semibold">
              {profile.name || "—"}
              <span className="ml-2 inline-flex items-center text-xs rounded-full border px-2 py-0.5 bg-orange-50 text-orange-700 border-orange-200">
                {member.label || "Đồng"}
              </span>
            </h2>

            <div className="mt-2 inline-flex items-center gap-2 text-sm text-gray-600">
              <span className="truncate max-w-[220px]">{profile.email || "—"}</span>
              {profile.email && (
                <button onClick={copyEmail} className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50">
                  Sao chép
                </button>
              )}
            {!profile.verified && profile.email ? (
              <>
                <span className="ml-1 inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-red-50 text-red-700 border border-red-200">
                  Chưa xác thực
                </span>
                <button onClick={onSendVerify} disabled={verifyBusy} className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50 disabled:opacity-60">
                  {verifyBusy ? "Đang gửi…" : "Xác thực"}
                </button>
              </>
            ) : null}
            </div>

            <div className="mt-3 text-xs text-gray-500">
              Tham gia: <span className="font-medium">{fmtDate(profile.joined)}</span>
            </div>

            <div className="mt-5 flex gap-3">
              {!editing ? (
                <>
                  <button onClick={startEdit} className="btn-primary">Chỉnh sửa</button>
                  <button onClick={onLogout} className="btn-danger">Đăng xuất</button>
                </>
              ) : (
                <>
                  <button form="profile-form" type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button onClick={()=>setEditing(false)} className="btn-ghost">Hủy</button>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600">Thống kê thành viên</span>
            <button
              onClick={loadMembership}
              disabled={loadingMember}
              className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Làm mới thống kê"
            >
              {loadingMember ? '⟳ Đang tải...' : '⟳ Làm mới'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-orange-50 to-orange-100/50 p-4">
              <div className="text-xs font-semibold text-gray-600 mb-1">Đơn</div>
              <div className="text-xl font-bold text-orange-700">
                {loadingMember ? '—' : (Number(member.total_orders) || 0)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">đã giao</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
              <div className="text-xs font-semibold text-gray-600 mb-1">Tổng chi</div>
              <div className="text-lg font-bold text-blue-700">
                {loadingMember ? '—' : fmtVND(Number(member.total_spent) || 0)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">VNĐ</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
              <div className="text-xs font-semibold text-gray-600 mb-1">Hạng</div>
              <div className="text-sm font-bold text-purple-700 capitalize">
                {loadingMember ? '—' : (member.label || member.level || 'Đồng')}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">thành viên</div>
            </div>
          </div>
          {/* Tiến độ lên hạng */}
          <div className="mt-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-4">
            {loadingMember ? (
              <div className="text-xs text-gray-500">Đang tải...</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-800">Tiến tới hạng {member?.progress?.to_label || 'Bạc'}</span>
                  <span className="text-sm font-bold text-orange-600">{member?.progress?.percent ?? 0}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-600 rounded-full transition-all duration-500 shadow-sm" 
                    style={{ width: `${Math.min(100, Math.max(0, Number(member?.progress?.percent||0)))}%` }} 
                  />
                </div>
                {typeof member?.progress?.remaining === 'number' && member.progress.remaining > 0 ? (
                  <div className="mt-2 text-xs text-gray-700 font-medium">
                    Mua thêm <span className="text-orange-600 font-bold">{fmtVND(member.progress.remaining)}</span> để lên <span className="text-orange-600 font-bold">{member?.progress?.to_label || 'Bạc'}</span>
                  </div>
                ) : member?.progress?.to_label ? (
                  <div className="mt-2 text-xs text-green-700 font-semibold">
                    🎉 Bạn đã đạt hạng cao nhất!
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-gray-600">
                    Bắt đầu mua hàng để tích lũy điểm và lên hạng
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right - Profile form / view */}
        <section className="lg:col-span-2 bg-white rounded-2xl shadow border p-6">
          {!editing ? (
            <div className="space-y-4 animate-fadeIn">
              <Field label="Điện thoại" value={profile.phone || "—"} />
              <Field label="Địa chỉ" value={profile.address || fullAddress || "—"} />
              <Field label="Ngày sinh" value={profile.birthday ? fmtDate(profile.birthday) : "—"} />
              <div className="pt-2">
                <button onClick={startEdit} className="btn-primary">Chỉnh sửa</button>
              </div>
            </div>
          ) : (
            <form id="profile-form" onSubmit={onSave} className="grid sm:grid-cols-2 gap-4 animate-fadeIn">
              <Input
                label="Họ tên *"
                value={profile.name}
                onChange={(v)=> setProfileState(p=>({ ...p, name:v }))}
                required
                maxLength={120}
              />
              <Input
                label="Email"
                type="email"
                value={profile.email}
                onChange={(v)=> setProfileState(p=>({ ...p, email:v }))}
                placeholder="email@domain.com"
                maxLength={150}
              />
              <Input
                label="Số điện thoại"
                value={profile.phone || ""}
                onChange={(v)=> setProfileState(p=>({ ...p, phone:v }))}
                placeholder="0901 234 567"
                maxLength={20}
              />
              <Input
                label="Ngày sinh"
                type="date"
                value={profile.birthday || ""}
                onChange={(v)=> setProfileState(p=>({ ...p, birthday:v }))}
              />

              {/* Địa chỉ chi tiết */}
              <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
                <Input
                  label="Số nhà / Đường"
                  value={profile.address_detail || ""}
                  onChange={(v)=> setProfileState(p=>({ ...p, address_detail:v }))}
                  placeholder="Số nhà, tên đường…"
                  maxLength={255}
                  showCount
                />
                <label className="block">
                  <div className="mb-1 text-sm font-medium">Tỉnh/Thành phố</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    value={profile.province}
                    onChange={(e)=> setProfileState(p=>({ ...p, province:e.target.value }))}
                  >
                    <option value="">-- Chọn Tỉnh/Thành --</option>
                    {provinces.map(p=>(
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 text-sm font-medium">Quận/Huyện</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    value={profile.district}
                    onChange={(e)=> setProfileState(p=>({ ...p, district:e.target.value }))}
                    disabled={!districts.length}
                  >
                    <option value="">-- Chọn Quận/Huyện --</option>
                    {districts.map(d=>(
                      <option key={d.code} value={d.code}>{d.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="mb-1 text-sm font-medium">Xã/Phường</div>
                  <select
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    value={profile.ward}
                    onChange={(e)=> setProfileState(p=>({ ...p, ward:e.target.value }))}
                    disabled={!wards.length}
                  >
                    <option value="">-- Chọn Xã/Phường --</option>
                    {wards.map(w=>(
                      <option key={w.code} value={w.code}>{w.name}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Avatar */}
              <div className="sm:col-span-2 grid sm:grid-cols-[1fr_320px] gap-4">
                <Input
                  label="URL Avatar"
                  value={profile.avatar || ""}
                  onChange={(v)=> { setProfileState(p=>({ ...p, avatar:v })); setAvatarPreview(v); }}
                  placeholder="https://..."
                />
                <div>
                  <div className="text-sm font-medium mb-1">Xem trước</div>
                  <div className="relative w-full h-[180px] rounded-lg overflow-hidden border bg-gray-50">
                    <Image
                      src={(avatarPreview || profile.avatar || "/logo.png")}
                      alt="preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Dán link ảnh hợp lệ để cập nhật.</p>
                </div>
              </div>

              {err && (
                <div className="sm:col-span-2 text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded">
                  {err}
                </div>
              )}

              <div className="sm:col-span-2 flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button type="button" onClick={()=>setEditing(false)} className="btn-ghost">
                  Hủy
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {/* Section: Đổi mật khẩu */}
      <section className="mt-6 bg-white rounded-2xl shadow border p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Đổi mật khẩu</h2>
        </div>

        <form onSubmit={submitChangePassword} className="mt-4 grid sm:grid-cols-2 gap-4">
          <Input label="Mật khẩu hiện tại" type="password" value={pwd.current}
            onChange={(v)=> setPwd(s=>({...s, current:v}))} required />
          <div />
          <Input label="Mật khẩu mới" type="password" value={pwd.next}
            onChange={(v)=> setPwd(s=>({...s, next:v}))} required />
          <Input label="Nhập lại mật khẩu mới" type="password" value={pwd.next2}
            onChange={(v)=> setPwd(s=>({...s, next2:v}))} required />
          {err && <div className="sm:col-span-2 text-sm text-red-600">{err}</div>}
          <div className="sm:col-span-2">
            <button type="submit" disabled={pwdBusy} className="btn-primary">
              {pwdBusy ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </div>
        </form>
      </section>

      {/* Section: Đơn hàng của tôi */}
      <section className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Đơn hàng của tôi</h2>
          </div>
          <button 
            onClick={() => loadOrders(orders.current_page)} 
            disabled={loadingOrders}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 ${loadingOrders ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loadingOrders ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>

        {loadingOrders ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-gray-200 rounded" />
                    <div className="h-3 w-48 bg-gray-200 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-gray-200 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : !orders.data?.length ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bạn chưa có đơn hàng nào</h3>
            <p className="text-sm text-gray-500 mb-4">Hãy bắt đầu mua sắm để xem đơn hàng của bạn tại đây</p>
            <a 
              href="/product" 
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Mua sắm ngay
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.data.map(o => {
              const status = (o.status_text || o.status || '').toString().toLowerCase();
              const statusConfig = {
                pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', icon: '⏳' },
                processing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🔄' },
                shipped: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🚚' },
                delivered: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', icon: '✅' },
                cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '❌' },
              };
              const config = statusConfig[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '📦' };
              const canCancel = [0, 1].includes(Number(o.status));
              
              return (
                <div 
                  key={o.id} 
                  className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-orange-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-orange-200">
                          <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-900">#{o.code || o.id}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}>
                              <span>{config.icon}</span>
                              <span className="capitalize">{o.status_text || status}</span>
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{new Date(o.created_at).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            <span className="text-gray-300">•</span>
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{new Date(o.created_at).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total & Actions */}
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-0.5">Tổng tiền</div>
                          <div className="text-lg font-bold text-orange-600">{fmtVND(o.total || 0)}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/cart/${o.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-orange-400 hover:text-orange-600"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Chi tiết
                        </a>
                        {canCancel ? (
                          <button 
                            onClick={() => onCancelOrder(o.id, o.created_at)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-all hover:bg-red-100 hover:border-red-400"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Huỷ
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-400">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                            Không thể huỷ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Phân trang */}
            {orders.last_page > 1 && (
              <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <button 
                  disabled={orders.current_page <= 1 || loadingOrders} 
                  onClick={() => loadOrders(orders.current_page - 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Trước
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Trang <span className="font-bold text-orange-600">{orders.current_page}</span> / {orders.last_page}
                </span>
                <button 
                  disabled={orders.current_page >= orders.last_page || loadingOrders} 
                  onClick={() => loadOrders(orders.current_page + 1)}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 🔹 Modal Chi tiết đơn hàng (có ảnh sản phẩm) */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=> setDetailOpen(false)} />
          <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-lg border p-5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">
                Chi tiết đơn hàng {selectedOrder ? `#${selectedOrder.id}` : ""}
              </h3>
              <button className="btn-ghost" onClick={()=> setDetailOpen(false)}>✕</button>
            </div>

            {detailLoading ? (
              <p className="text-gray-500 mt-4">Đang tải chi tiết…</p>
            ) : detailError ? (
              <p className="text-red-600 mt-4">{detailError}</p>
            ) : (
              <>
                {/* Thông tin chung */}
                {selectedOrder && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div>
                        <span className="text-gray-500">Trạng thái:</span>{" "}
                        <span className="font-medium capitalize">{selectedOrder.status_text}</span>
                      </div>
                      <div><span className="text-gray-500">Ngày tạo:</span> {new Date(selectedOrder.created_at).toLocaleString("vi-VN")}</div>
                      {selectedOrder.payment_method && (
                        <div><span className="text-gray-500">Thanh toán:</span> {selectedOrder.payment_method}</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">{selectedOrder.name}</div>
                      <div className="text-gray-600">{selectedOrder.phone}</div>
                      <div className="text-gray-600">{selectedOrder.address}</div>
                    </div>
                  </div>
                )}

                {/* Bảng sản phẩm (thêm ảnh) */}
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-[700px] w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Sản phẩm</th>
                        <th className="px-3 py-2 text-right">Đơn giá</th>
                        <th className="px-3 py-2 text-right">SL</th>
                        <th className="px-3 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderDetails?.length ? orderDetails.map((it, idx) => {
                        const name = it.product_name || it.product?.name || `#${it.product_id}`;
                        const fromDetail = it.thumb || it.image || it.thumbnail || it.product?.thumbnail || it.product?.image;
                        const img = fromDetail ? absUrl(fromDetail) : "https://picsum.photos/seed/dola/80/80";
                        const price = Number(it.price) || 0;
                        const qty   = Number(it.quantity) || 0;
                        return (
                          <tr key={idx} className="border-t align-top">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={img}
                                  alt={name}
                                  width={56}
                                  height={56}
                                  loading="lazy"
                                  className="h-14 w-14 rounded-lg object-cover border"
                                />
                                <div>
                                  <div className="font-medium">{name}</div>
                                  {(it.variant_name || it.variant) && (
                                    <div className="text-xs text-gray-500">
                                      {it.variant_name || it.variant}
                                      {it.variant_weight ? ` · ${it.variant_weight}g` : ""}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right">{fmtVND(price)}</td>
                            <td className="px-3 py-2 text-right">{qty}</td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {fmtVND(price * qty)}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500">Không có sản phẩm.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tổng kết */}
                <div className="mt-4 flex items-center justify-end">
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Tổng số lượng: <span className="font-medium">{detailSummary.qty}</span>
                    </div>
                    <div className="text-base font-bold">
                      Tổng tiền: {fmtVND(selectedOrder?.total ?? detailSummary.sum)}
                    </div>
                  </div>
                </div>

                {/* Link Chi tiết SEO */}
                {selectedOrder?.id && (
                  <div className="mt-4">
                    <a href={`/cart/${selectedOrder.id}`} className="btn-ghost">
                      Chi tiết đơn #{selectedOrder.id}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 🔶 Modal: Không thể huỷ */}
      {cannotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=> setCannotOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-lg border p-6 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="shrink-0 h-10 w-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xl">⚠️</div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Không thể huỷ đơn hàng</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Đơn hàng chỉ có thể huỷ trong vòng <b>12 giờ</b> kể từ khi đặt.
                  Nếu cần hỗ trợ, vui lòng liên hệ bộ phận CSKH.
                </p>
                <div className="mt-3 text-sm bg-gray-50 border rounded-lg p-3">
                  <div>Hotline: <span className="font-semibold text-gray-900">1900 0000</span></div>
                  <div>Email hỗ trợ: <span className="font-semibold text-gray-900">support@dolabakery.vn</span></div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button className="btn-ghost" onClick={()=> setCannotOpen(false)}>Đóng</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🧡 Modal: Xác nhận huỷ + lý do */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=> setCancelOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-lg border p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-900">Huỷ đơn hàng</h3>
            <p className="mt-1 text-sm text-gray-600">Vui lòng chọn lý do huỷ hoặc nhập chi tiết.</p>
            <div className="mt-4 space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" name="cancel-reason" checked={cancelPreset==='change-mind'} onChange={()=> setCancelPreset('change-mind')} />
                <span>Tôi đổi ý / không còn nhu cầu</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="cancel-reason" checked={cancelPreset==='wrong-order'} onChange={()=> setCancelPreset('wrong-order')} />
                <span>Đặt nhầm / đặt sai sản phẩm</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="cancel-reason" checked={cancelPreset==='slow-delivery'} onChange={()=> setCancelPreset('slow-delivery')} />
                <span>Thời gian giao dự kiến quá lâu</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="cancel-reason" checked={cancelPreset==='edit-order'} onChange={()=> setCancelPreset('edit-order')} />
                <span>Muốn thêm/sửa sản phẩm trong đơn</span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="cancel-reason" checked={cancelPreset==='other'} onChange={()=> setCancelPreset('other')} className="mt-2" />
                <span className="w-full">
                  Khác
                  <textarea
                    className="mt-1 w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
                    rows={3}
                    maxLength={500}
                    placeholder="Nhập lý do huỷ (tối đa 500 ký tự)"
                    value={cancelReason}
                    onChange={(e)=> { setCancelReason(e.target.value); setCancelPreset('other'); }}
                  />
                </span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button className="btn-ghost" onClick={()=> setCancelOpen(false)} disabled={cancelBusy}>Đóng</button>
              <button className="btn-primary" onClick={submitCancel} disabled={cancelBusy}>
                {cancelBusy ? 'Đang huỷ…' : 'Xác nhận huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .btn-primary {
          @apply inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-white font-medium
                 hover:bg-orange-700 transition active:translate-y-[1px] disabled:opacity-60;
        }
        .btn-danger {
          @apply inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-white font-medium
                 hover:bg-red-700 transition active:translate-y-[1px];
        }
        .btn-ghost {
          @apply inline-flex items-center justify-center rounded-lg border px-4 py-2.5 font-medium
                 hover:bg-gray-50 transition active:translate-y-[1px];
        }
        .animate-slideDown { animation: slideDown 300ms ease-out both; }
        .animate-fadeIn { animation: fadeIn 280ms ease-out both; }
        @keyframes slideDown {
          from { transform: translate(-50%, -12px); opacity: 0; }
          to   { transform: translate(-50%, 0);     opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}

/* ================== Small components ================== */
function Field({ label, value }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-center">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}

function Input({ label, type="text", value, onChange, placeholder, required, maxLength, showCount }) {
  return (
    <label className="block">
      <div className="mb-1 text-sm font-medium">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e)=> onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-orange-300"
      />
      {showCount && typeof value === "string" && maxLength ? (
        <div className="mt-1 text-right text-xs text-gray-500">{value.length}/{maxLength}</div>
      ) : null}
    </label>
  );
}
