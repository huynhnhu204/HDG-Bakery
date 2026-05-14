// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";

// const BASE=(process.env.NEXT_PUBLIC_API_BASE||"http://127.0.0.1:8000").replace(/\/+$/,"");
// const API="/api/v1";
// const toSlug=(s="")=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-");

// export default function ProductNewPage(){
//   const router = useRouter();

//   const [cats,setCats]=useState([]);
//   const [loading,setLoading]=useState(true);
//   const [saving,setSaving]=useState(false);
//   const [err,setErr]=useState("");

//   const [form,setForm]=useState({
//     name:"",
//     slug:"",
//     category_id:"",
//     description:"",
//     content:"",
//     price_buy:0,
//     price_sale:"",
//     type:"bread", // vd: bread|cake
//     weight:"",
//     product_new:true,
//     status:1,

//     // ảnh chính
//     thumbnail:"",
//     thumbnail_file:null,
//     image:"",
//     image_file:null,

//     // gallery (tuỳ chọn)
//     gallery_urls:[""],
//     gallery_files:[]
//   });

//   // preview
//   const [thumbPreview,setThumbPreview]=useState("");
//   const [imagePreview,setImagePreview]=useState("");

//   useEffect(()=>{ (async()=>{
//     try{
//       const res=await fetch(`${BASE}${API}/categories?per_page=100`,{cache:"no-store"});
//       const j=await res.json();
//       setCats(j?.data||j||[]);
//     }catch{ setCats([]);}
//     finally{ setLoading(false);}
//   })(); },[]);

//   function onPickThumb(e){
//     const f=e.target.files?.[0]||null;
//     setForm(s=>({...s,thumbnail_file:f}));
//     setThumbPreview(f? URL.createObjectURL(f) : "");
//   }
//   function onPickImage(e){
//     const f=e.target.files?.[0]||null;
//     setForm(s=>({...s,image_file:f}));
//     setImagePreview(f? URL.createObjectURL(f) : "");
//   }
//   function onPickGallery(e){
//     const arr=Array.from(e.target.files||[]);
//     setForm(s=>({...s, gallery_files: arr}));
//   }

//   const canSubmit=useMemo(()=>{
//     return form.name && form.price_buy>=0 && (form.thumbnail_file || form.thumbnail || form.image_file || form.image);
//   },[form]);

//   async function submit(e){
//     e.preventDefault();
//     setErr("");
//     if (!canSubmit){ setErr("Vui lòng nhập tên, giá và ít nhất một ảnh."); return; }

//     const fd = new FormData();
//     const slug = form.slug?.trim() || toSlug(form.name);
//     fd.append("name", form.name);
//     fd.append("slug", slug);
//     if (form.category_id) fd.append("category_id", String(form.category_id));
//     if (form.description) fd.append("description", form.description);
//     if (form.content) fd.append("content", form.content);
//     fd.append("price_buy", String(form.price_buy||0));
//     if (form.price_sale!=="") fd.append("price_sale", String(form.price_sale||0));
//     if (form.type) fd.append("type", form.type);
//     if (form.weight!=="") fd.append("weight", String(form.weight));
//     fd.append("product_new", form.product_new ? "1":"0");
//     fd.append("status", String(form.status));

//     if (form.thumbnail_file) fd.append("thumbnail_file", form.thumbnail_file);
//     else if (form.thumbnail) fd.append("thumbnail", form.thumbnail);

//     if (form.image_file) fd.append("image_file", form.image_file);
//     else if (form.image) fd.append("image", form.image);

//     form.gallery_files.forEach(f => fd.append("gallery_files[]", f));
//     form.gallery_urls.filter(Boolean).forEach(u => fd.append("gallery_urls[]", u));

//     try{
//       setSaving(true);
//       const res = await fetch(`${BASE}${API}/products`, { method:"POST", body:fd });
//       if (!res.ok){ let m=`HTTP ${res.status}`; try{const j=await res.json(); m=j?.message||m;}catch{} throw new Error(m); }
//       const j = await res.json();
//       alert("Đã tạo sản phẩm!");
//       router.push(`/admin/products/${j.id}/edit`);
//     }catch(e2){ setErr(e2.message||"Tạo sản phẩm thất bại."); }
//     finally{ setSaving(false); }
//   }

//   if (loading) return <div className="p-6">Đang tải…</div>;

//   return (
//     <div className="p-6 max-w-5xl mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Thêm sản phẩm</h1>

//       {err && <div className="mb-4 rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{err}</div>}

//       <form onSubmit={submit} className="grid md:grid-cols-3 gap-6">
//         {/* LEFT: Info */}
//         <div className="md:col-span-2 space-y-4">
//           <div className="bg-white rounded-xl border p-4 space-y-3">
//             <label className="block text-sm">Tên *</label>
//             <input value={form.name} onChange={e=>setForm(s=>({...s,name:e.target.value, slug: toSlug(e.target.value)}))} className="w-full border rounded px-3 py-2"/>

//             <label className="block text-sm">Slug</label>
//             <input value={form.slug} onChange={e=>setForm(s=>({...s,slug:e.target.value}))} className="w-full border rounded px-3 py-2"/>

//             <label className="block text-sm">Mô tả ngắn</label>
//             <textarea value={form.description} onChange={e=>setForm(s=>({...s,description:e.target.value}))} rows={3} className="w-full border rounded px-3 py-2"/>

//             <label className="block text-sm">Mô tả chi tiết</label>
//             <textarea value={form.content} onChange={e=>setForm(s=>({...s,content:e.target.value}))} rows={6} className="w-full border rounded px-3 py-2"/>
//           </div>

//           <div className="bg-white rounded-xl border p-4 grid sm:grid-cols-2 gap-3">
//             <div>
//               <label className="block text-sm">Giá gốc (VND) *</label>
//               <input type="number" value={form.price_buy} onChange={e=>setForm(s=>({...s,price_buy:+e.target.value||0}))} className="w-full border rounded px-3 py-2"/>
//             </div>
//             <div>
//               <label className="block text-sm">Giá KM (VND)</label>
//               <input type="number" value={form.price_sale} onChange={e=>setForm(s=>({...s,price_sale:e.target.value}))} className="w-full border rounded px-3 py-2"/>
//             </div>
//             <div>
//               <label className="block text-sm">Khối lượng (g)</label>
//               <input type="number" value={form.weight} onChange={e=>setForm(s=>({...s,weight:e.target.value}))} className="w-full border rounded px-3 py-2"/>
//             </div>
//             <div>
//               <label className="block text-sm">Loại</label>
//               <select value={form.type} onChange={e=>setForm(s=>({...s,type:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white">
//                 <option value="bread">Bánh mì</option>
//                 <option value="cake">Bánh kem</option>
//                 <option value="pastry">Pastry</option>
//                 <option value="drink">Đồ uống</option>
//               </select>
//             </div>
//           </div>

//           {/* Gallery optional */}
//           <div className="bg-white rounded-xl border p-4 space-y-3">
//             <div className="flex items-center justify-between">
//               <label className="text-sm font-semibold">Thư viện ảnh (tuỳ chọn)</label>
//               <input type="file" accept="image/*" multiple onChange={onPickGallery} className="text-sm"/>
//             </div>
//             {form.gallery_urls.map((u,idx)=>(
//               <div key={idx} className="flex gap-2">
//                 <input value={u} onChange={e=>{
//                   const v=[...form.gallery_urls]; v[idx]=e.target.value; setForm(s=>({...s,gallery_urls:v}));
//                 }} placeholder="https://... hoặc /storage/..." className="flex-1 border rounded px-3 py-2"/>
//                 <button type="button" onClick={()=>{
//                   const v=form.gallery_urls.filter((_,i)=>i!==idx);
//                   setForm(s=>({...s,gallery_urls: v.length? v : [""]}));
//                 }} className="px-3 py-2 border rounded">Xoá</button>
//               </div>
//             ))}
//             <button type="button" onClick={()=>setForm(s=>({...s,gallery_urls:[...s.gallery_urls,""]}))} className="px-3 py-2 border rounded">+ Thêm URL</button>
//           </div>
//         </div>

//         {/* RIGHT: media & meta */}
//         <div className="space-y-4">
//           <div className="bg-white rounded-xl border p-4 space-y-3">
//             <label className="block text-sm font-semibold">Danh mục</label>
//             <select value={form.category_id} onChange={e=>setForm(s=>({...s,category_id:e.target.value}))} className="w-full border rounded px-3 py-2 bg-white">
//               <option value="">— Chọn danh mục —</option>
//               {cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
//             </select>

//             <label className="block text-sm">Trạng thái</label>
//             <select value={form.status} onChange={e=>setForm(s=>({...s,status:+e.target.value}))} className="w-full border rounded px-3 py-2 bg-white">
//               <option value={1}>Hiển thị</option>
//               <option value={0}>Ẩn</option>
//             </select>

//             <label className="flex items-center gap-2 text-sm">
//               <input type="checkbox" checked={!!form.product_new} onChange={e=>setForm(s=>({...s,product_new:e.target.checked}))}/>
//               Sản phẩm mới
//             </label>
//           </div>

//           <div className="bg-white rounded-xl border p-4 space-y-3">
//             <label className="text-sm font-semibold">Thumbnail *</label>
//             {thumbPreview || form.thumbnail ? (
//               <img src={thumbPreview || form.thumbnail} alt="thumb" className="w-full h-40 object-cover rounded border"/>
//             ) : <div className="w-full h-40 rounded border bg-gray-50 flex items-center justify-center text-gray-400">Chưa có ảnh</div>}
//             <input type="file" accept="image/*" onChange={onPickThumb} className="text-sm"/>
//             <div className="flex items-center gap-2">
//               <span className="text-sm text-gray-500">Hoặc URL:</span>
//               <input value={form.thumbnail} onChange={e=>setForm(s=>({...s,thumbnail:e.target.value}))} placeholder="/storage/..." className="flex-1 border rounded px-3 py-1.5"/>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl border p-4 space-y-3">
//             <label className="text-sm font-semibold">Ảnh chính</label>
//             {imagePreview || form.image ? (
//               <img src={imagePreview || form.image} alt="main" className="w-full h-40 object-cover rounded border"/>
//             ) : <div className="w-full h-40 rounded border bg-gray-50 flex items-center justify-center text-gray-400">Chưa có</div>}
//             <input type="file" accept="image/*" onChange={onPickImage} className="text-sm"/>
//             <div className="flex items-center gap-2">
//               <span className="text-sm text-gray-500">Hoặc URL:</span>
//               <input value={form.image} onChange={e=>setForm(s=>({...s,image:e.target.value}))} placeholder="/storage/..." className="flex-1 border rounded px-3 py-1.5"/>
//             </div>
//           </div>

//           <button type="submit" disabled={saving||!canSubmit} className="w-full h-11 rounded-xl bg-black text-white">
//             {saving? "Đang lưu…" : "Tạo sản phẩm"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

export default function BannerNewPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    name: "",
    link: "",
    position: "slideshow",
    sort_order: 0,
    description: "",
    status: 1,
    image_file: null,
    image_preview: "",
  });

  async function submit(e) {
    e.preventDefault();
    const fd = new FormData();
    const t  = localStorage.getItem(KEY);

    const send = (k, v) => v !== undefined && v !== null && fd.append(k, v);
    send("name", f.name);
    send("link", f.link);
    send("position", f.position);
    send("sort_order", f.sort_order);
    send("description", f.description);
    send("status", f.status);

    if (f.image_file) fd.append("image_file", f.image_file);

    try {
      setSaving(true);
      const res = await fetch(`${BASE}${API}/banners`, {
        method: "POST",
        headers: t ? { Authorization: `Bearer ${t}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      alert("✅ Banner đã được thêm!");
      router.push("/admin/banners");
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">🖼️ Thêm banner mới</h1>
        <Link href="/admin/banners" className="bg-gray-200 px-3 py-2 rounded-lg">← Về danh sách</Link>
      </div>

      <form onSubmit={submit} className="space-y-6 bg-white shadow rounded-xl p-5">

        {/* Tên & link */}
        <div>
          <label className="block mb-1 font-medium">Tên banner *</label>
          <input
            required
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            className="border rounded w-full p-2"
            placeholder="VD: Khuyến mãi Giáng Sinh"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium">Liên kết (link)</label>
          <input
            value={f.link}
            onChange={(e) => setF({ ...f, link: e.target.value })}
            className="border rounded w-full p-2"
            placeholder="VD: https://example.com"
          />
        </div>

        {/* Vị trí & thứ tự */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Vị trí hiển thị</label>
            <select
              value={f.position}
              onChange={(e) => setF({ ...f, position: e.target.value })}
              className="border rounded w-full p-2"
            >
              <option value="slideshow">Slideshow</option>
              <option value="ads">Quảng cáo</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Thứ tự (sort_order)</label>
            <input
              type="number"
              value={f.sort_order}
              onChange={(e) => setF({ ...f, sort_order: e.target.value })}
              className="border rounded w-full p-2"
              min="0"
            />
          </div>
        </div>

        {/* Ảnh */}
        <div>
          <label className="block mb-2 font-medium">Ảnh banner *</label>
          <input
            type="file"
            accept="image/*"
            required
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setF({ ...f, image_file: file, image_preview: URL.createObjectURL(file) });
            }}
          />
          {f.image_preview && (
            <img
              src={f.image_preview}
              alt="preview"
              className="mt-3 rounded-lg border w-full max-w-sm"
            />
          )}
        </div>

        {/* Mô tả */}
        <div>
          <label className="block mb-1 font-medium">Mô tả (tuỳ chọn)</label>
          <textarea
            value={f.description}
            onChange={(e) => setF({ ...f, description: e.target.value })}
            className="border rounded w-full p-2"
            rows={3}
          />
        </div>

        {/* Trạng thái */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!f.status}
              onChange={(e) => setF({ ...f, status: e.target.checked ? 1 : 0 })}
            />
            Hiển thị (status = 1)
          </label>
        </div>

        {/* Nút hành động */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            {saving ? "Đang lưu..." : "Lưu banner"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/banners")}
            className="bg-gray-300 px-4 py-2 rounded-lg"
          >
            Huỷ
          </button>
        </div>
      </form>
    </div>
  );
}
