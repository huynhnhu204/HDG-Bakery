"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const KEY = "admin_token";

function getToken(){ try{ return localStorage.getItem(KEY);}catch{return null;} }
async function api(url, opt={}){
  const token = getToken();
  const headers = { Accept:"application/json", ...(opt.body?{"Content-Type":"application/json"}:{}) , ...(token?{Authorization:`Bearer ${token}`}:{}) };
  const r = await fetch(url,{...opt, headers});
  const j = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.message || `HTTP ${r.status}`);
  return j;
}

export default function MenuEditPage(){
  const { id } = useParams();
  const router = useRouter();
  const [f,setF]=useState(null);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState("");
  const [ok,setOk]=useState("");

  useEffect(()=>{(async()=>{
    try{
      const j = await api(`${BASE}${API}/menus/${id}`);
      setF(j?.data || j);
    }catch(e){ setErr(e.message);} finally{ setLoading(false); }
  })();},[id]);

  const save = async(e)=>{
    e.preventDefault(); setErr(""); setOk("");
    try{
      const payload = {
        name: f.name,
        link: f.link,
        parent_id: f.parent_id,
        sort_order: f.sort_order,
        status: f.status,
      };
      await api(`${BASE}${API}/menus/${id}`, { method:"PATCH", body: JSON.stringify(payload) });
      setOk("Đã cập nhật menu");
      setTimeout(()=>router.replace("/admin/menu"), 800);
    }catch(e){ setErr(e.message); }
  };

  if(loading) return <div className="p-6">Đang tải…</div>;
  if(!f) return <div className="p-6 text-red-600">Không tìm thấy menu</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sửa menu #{id}</h1>
      <form onSubmit={save} className="bg-white border rounded-lg p-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên *</label>
            <input value={f.name||""} onChange={e=>setF(s=>({...s,name:e.target.value}))} required className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Liên kết</label>
            <input value={f.link||""} onChange={e=>setF(s=>({...s,link:e.target.value}))} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Menu cha</label>
            <input value={f.parent_id||""} onChange={e=>setF(s=>({...s,parent_id:e.target.value}))} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Thứ tự</label>
            <input type="number" value={f.sort_order||0} onChange={e=>setF(s=>({...s,sort_order:e.target.value}))} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Trạng thái</label>
            <select value={f.status??1} onChange={e=>setF(s=>({...s,status:Number(e.target.value)}))} className="w-full border rounded-lg px-3 py-2">
              <option value={1}>Hiển thị</option>
              <option value={0}>Ẩn</option>
            </select>
          </div>
        </div>

        {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">{err}</div>}
        {ok && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700">{ok}</div>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={()=>history.back()} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Hủy</button>
          <button type="submit" className="px-5 py-2 rounded-lg bg-black text-white hover:bg-gray-800">Lưu</button>
        </div>
      </form>
    </div>
  );
}

