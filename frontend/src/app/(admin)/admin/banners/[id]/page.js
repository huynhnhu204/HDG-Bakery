"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE=(process.env.NEXT_PUBLIC_API_BASE||"http://127.0.0.1:8000").replace(/\/+$/,"");
const API="/api/v1";

async function apiShow(id){
  const res=await fetch(`${BASE}${API}/banners/${id}`,{cache:"no-store"});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function BannerDetailPage(){
  const router=useRouter();
  const { id } = useParams();
  const [row,setRow]=useState(null);
  const [err,setErr]=useState("");

  useEffect(()=>{ (async()=>{
    try{ setRow(await apiShow(id)); }catch(e){ setErr(e.message||"Load failed"); }
  })(); },[id]);

  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!row) return <div className="p-6 text-gray-500">Đang tải…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-sm text-gray-500 mb-2">
        <button onClick={()=>router.push("/admin/banners")} className="hover:underline">Banners</button>
        <span className="mx-1">/</span><span className="text-gray-800">#{id}</span>
      </div>
      <h1 className="text-xl font-semibold mb-4">{row.name}</h1>

      <img src={row.image_url || row.image} alt={row.name} className="w-full h-[22rem] object-cover rounded-xl mb-4"/>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><span className="font-medium">Vị trí:</span> {row.position}</div>
        <div><span className="font-medium">Trạng thái:</span> {String(row.status)}</div>
        <div><span className="font-medium">Thứ tự:</span> {row.sort_order ?? 0}</div>
        <div><span className="font-medium">Link:</span> {row.link || "—"}</div>
      </div>

      {row.description && (
        <div className="mt-4">
          <div className="font-medium mb-1">Mô tả</div>
          <div className="rounded-xl border bg-white p-3">{row.description}</div>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        <button onClick={()=>router.push(`/admin/banners/${id}/edit`)} className="px-4 h-10 rounded-xl bg-black text-white">Sửa</button>
        <button onClick={()=>router.push("/admin/banners")} className="px-4 h-10 rounded-xl border">Quay lại</button>
      </div>
    </div>
  );
}
