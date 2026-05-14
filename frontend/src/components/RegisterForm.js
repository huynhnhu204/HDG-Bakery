"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const GH_DATA_URL = "https://raw.githubusercontent.com/kenzouno1/DiaGioiHanhChinhVN/master/data.json";

export default function RegisterForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  const [form, setForm] = useState({
    name: "", 
    email: "", 
    password: "", 
    phone: "", 
    birthday: "",
    province: "", 
    district: "", 
    ward: "", 
    address_detail: "",
  });

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [vnData, setVnData] = useState(null);

  // OTP Modal state
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpMsg, setOtpMsg] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    async function loadAll() {
      try {
        // Try GitHub raw dataset (stable, CORS-friendly)
        const r = await fetch(GH_DATA_URL, { cache: "force-cache" });
        if (r.ok) {
          const data = await r.json();
          setVnData(data);
          const provs = data.map(p => ({ code: String(p.Id), name: p.Name }));
          setProvinces(provs);
          return;
        }
      } catch (e) {
        console.warn("GitHub data load failed", e);
      }

      // Fallback: open-api.vn
      try {
        const r1 = await fetch("https://provinces.open-api.vn/api/?depth=1");
        if (r1.ok) {
          const data = await r1.json();
          const list = Array.isArray(data) ? data.map(p => ({ code: String(p.code), name: p.name })) : [];
          setProvinces(list);
          setVnData(null);
          return;
        }
        const r2 = await fetch("https://provinces.open-api.vn/api/p/");
        if (r2.ok) {
          const data2 = await r2.json();
          const list2 = Array.isArray(data2) ? data2.map(p => ({ code: String(p.code), name: p.name })) : [];
          setProvinces(list2);
          setVnData(null);
        }
      } catch (e2) {
        console.error("Fallback province API failed", e2);
      }
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (!form.province) { setDistricts([]); setWards([]); return; }
    // Prefer local dataset if available
    if (vnData) {
      const p = vnData.find(x => String(x.Id) === String(form.province));
      const dists = p ? (p.Districts || []).map(d => ({ code: String(d.Id), name: d.Name, raw: d })) : [];
      setDistricts(dists);
      setWards([]);
      return;
    }
    // Fallback remote
    fetch(`https://provinces.open-api.vn/api/p/${form.province}?depth=2`)
      .then(r=>r.json())
      .then(d=>setDistricts((d.districts||[]).map(x=>({ code:String(x.code), name:x.name }))))
      .catch(console.error);
  }, [form.province, vnData]);

  useEffect(() => {
    if (!form.district) { setWards([]); return; }
    if (vnData) {
      // Find selected district in cached province
      const p = vnData.find(x => String(x.Id) === String(form.province));
      const d = p ? (p.Districts || []).find(xx => String(xx.Id) === String(form.district)) : null;
      const ws = d ? (d.Wards || []).map(w => ({ code: String(w.Id), name: w.Name })) : [];
      setWards(ws);
      return;
    }
    // Fallback remote
    fetch(`https://provinces.open-api.vn/api/d/${form.district}?depth=2`)
      .then(r=>r.json())
      .then(d=>setWards((d.wards||[]).map(x=>({ code:String(x.code), name:x.name }))))
      .catch(console.error);
  }, [form.district, form.province, vnData]);

  const set = (k, v) => {
    setForm(s => ({ ...s, [k]: v }));
    // Clear error when user types
    if (errors[k]) {
      setErrors({ ...errors, [k]: null });
    }
    if (generalError) setGeneralError("");
  };

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setGeneralError("");

    try {
      const fullAddress = [
        form.address_detail,
        wards.find(w => String(w.code) === String(form.ward))?.name,
        districts.find(d => String(d.code) === String(form.district))?.name,
        provinces.find(p => String(p.code) === String(form.province))?.name,
      ].filter(Boolean).join(", ");

      const r = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type":"application/json", Accept:"application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || null,
          birthday: form.birthday || null,
          address: fullAddress || null,
        }),
      });

      const j = await r.json();

      if (!r.ok) {
        // Parse validation errors
        if (j.errors) {
          const parsedErrors = {};
          Object.keys(j.errors).forEach(key => {
            parsedErrors[key] = Array.isArray(j.errors[key]) ? j.errors[key][0] : j.errors[key];
          });
          setErrors(parsedErrors);
        }
        
        // Show general error
        if (j.message) {
          setGeneralError(j.message);
        } else {
          setGeneralError("Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
        }
        setLoading(false);
        return;
      }

      // Success - show OTP modal (optional), and also inform about verify link
      setGeneralError("");
      setShowOtp(true);
      setOtpMsg("📧 Đăng ký thành công! Bạn có thể nhập mã OTP để xác thực ngay hoặc kiểm tra email để bấm liên kết xác thực trong 24 giờ.");
    } catch (e2) {
      setGeneralError("Lỗi kết nối. Vui lòng thử lại sau.");
      console.error(e2);
    } finally {
      setLoading(false);
    }
  }

  function getError(field) {
    return errors[field];
  }

  return (
    <form onSubmit={submit} className="max-w-lg mx-auto bg-white p-6 rounded-xl shadow space-y-4 relative">
      <h1 className="text-2xl font-bold text-center text-gray-800">Đăng ký</h1>
      <p className="text-center text-sm text-gray-600">Tạo tài khoản mới để bắt đầu mua sắm</p>

      {/* General Error */}
      {generalError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">{generalError}</p>
        </div>
      )}
      
      {/* Success message (if any) */}
      {!generalError && Object.keys(errors).length === 0 && !loading && (
        <div className="text-center text-sm text-gray-500">
          Điền thông tin bên dưới để tạo tài khoản mới
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên *</label>
        <input 
          className={`border ${getError('name') ? 'border-red-500' : ''} p-2 rounded w-full focus:ring-2 focus:ring-orange-200`}
          placeholder="Nhập họ và tên" 
          value={form.name} 
          onChange={e=>set("name", e.target.value)} 
          required 
        />
        {getError('name') && <p className="text-xs text-red-600 mt-1">{getError('name')}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
        <input 
          className={`border ${getError('email') ? 'border-red-500' : ''} p-2 rounded w-full focus:ring-2 focus:ring-orange-200`}
          placeholder="example@email.com" 
          type="email" 
          value={form.email} 
          onChange={e=>set("email", e.target.value)} 
          required 
        />
        {getError('email') && <p className="text-xs text-red-600 mt-1">{getError('email')}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu * (tối thiểu 6 ký tự)</label>
        <input 
          className={`border ${getError('password') ? 'border-red-500' : ''} p-2 rounded w-full focus:ring-2 focus:ring-orange-200`}
          placeholder="Nhập mật khẩu" 
          type="password" 
          value={form.password} 
          onChange={e=>set("password", e.target.value)} 
          required 
          minLength={6}
        />
        {getError('password') && <p className="text-xs text-red-600 mt-1">{getError('password')}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
        <input 
          className={`border ${getError('phone') ? 'border-red-500' : ''} p-2 rounded w-full focus:ring-2 focus:ring-orange-200`}
          placeholder="0123456789" 
          value={form.phone} 
          onChange={e=>set("phone", e.target.value)} 
        />
        {getError('phone') && <p className="text-xs text-red-600 mt-1">{getError('phone')}</p>}
      </div>

      {/* Birthday */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày sinh</label>
        <input 
          className="border p-2 rounded w-full focus:ring-2 focus:ring-orange-200" 
          type="date" 
          value={form.birthday} 
          onChange={e=>set("birthday", e.target.value)} 
        />
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh/Thành phố</label>
        <select 
          className="border p-2 rounded w-full focus:ring-2 focus:ring-orange-200"
          value={form.province} 
          onChange={e=>set("province", e.target.value)}
        >
          <option value="">-- Chọn tỉnh/thành phố --</option>
          {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quận/Huyện</label>
        <select 
          className="border p-2 rounded w-full focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100" 
          value={form.district} 
          onChange={e=>set("district", e.target.value)} 
          disabled={!districts.length}
        >
          <option value="">-- Chọn quận/huyện --</option>
          {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phường/Xã</label>
        <select 
          className="border p-2 rounded w-full focus:ring-2 focus:ring-orange-200 disabled:bg-gray-100" 
          value={form.ward} 
          onChange={e=>set("ward", e.target.value)} 
          disabled={!wards.length}
        >
          <option value="">-- Chọn phường/xã --</option>
          {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Số nhà, tên đường</label>
        <input 
          className="border p-2 rounded w-full focus:ring-2 focus:ring-orange-200" 
          placeholder="Số nhà, tên đường" 
          value={form.address_detail} 
          onChange={e=>set("address_detail", e.target.value)} 
        />
      </div>

      <button 
        type="submit" 
        disabled={loading} 
        className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
      >
        {loading ? "Đang đăng ký..." : "Đăng ký"}
      </button>

      <p className="text-center text-sm text-gray-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="text-orange-600 hover:underline font-medium">
          Đăng nhập ngay
        </Link>
      </p>

      {/* OTP Modal */}
      {showOtp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Xác thực OTP</h2>
              <button type="button" onClick={()=>setShowOtp(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {otpMsg && <div className="text-sm text-gray-700">{otpMsg}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input disabled value={form.email} className="border p-2 rounded w-full bg-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mã OTP (6 số)</label>
                <input value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} inputMode="numeric" pattern="[0-9]{6}" className="border p-2 rounded w-full tracking-widest text-center text-lg" placeholder="______" />
              </div>
              <div className="flex gap-2">
                <button type="button" disabled={otpLoading} onClick={async ()=>{
                  setOtpMsg(""); setOtpLoading(true);
                  try {
                    const r = await fetch(`${API_BASE}/api/v1/auth/verify-otp`, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ email: form.email, otp }) });
                    const j = await r.json();
                    if (!r.ok) { setOtpMsg(j.message || 'Xác thực thất bại.'); }
                    else { setOtpMsg('✅ Xác thực thành công! Bạn có thể đăng nhập.'); setTimeout(()=>{ setShowOtp(false); router.push('/login'); }, 800); }
                  } catch (e) { setOtpMsg('Lỗi kết nối.'); }
                  finally { setOtpLoading(false); }
                }} className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg disabled:opacity-50">{otpLoading? 'Đang xác thực...' : 'Xác thực'}</button>
                <button type="button" disabled={resendCooldown>0} onClick={async ()=>{
                  setOtpMsg("");
                  try {
                    const r = await fetch(`${API_BASE}/api/v1/auth/resend-otp`, { method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json'}, body: JSON.stringify({ email: form.email }) });
                    const j = await r.json();
                    setOtpMsg(j.message || (r.ok ? 'Đã gửi OTP.' : 'Không thể gửi OTP.'));
                    if (r.ok) { setResendCooldown(60); const t = setInterval(()=> setResendCooldown(s=>{ if (s<=1){clearInterval(t); return 0;} return s-1; }), 1000); }
                  } catch (e) { setOtpMsg('Lỗi kết nối.'); }
                }} className="px-4 py-2 border border-orange-500 text-orange-600 rounded-lg disabled:opacity-50">{resendCooldown>0? `Gửi lại OTP (${resendCooldown}s)` : 'Gửi lại OTP'}</button>
              </div>
              <div className="text-xs text-gray-500">Hoặc kiểm tra email để bấm liên kết xác thực (hiệu lực 24 giờ).</div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
