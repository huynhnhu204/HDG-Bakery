"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

const toInt = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const slugify = (s = "") =>
  s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s\/-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

async function apiMenus(path, { method = "GET", body } = {}) {
  const t = typeof window !== "undefined" ? localStorage.getItem(KEY) : "";
  const res = await fetch(`${BASE}${API}/menus${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = j?.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function treeToOptions(tree, depth = 0) {
  const out = [];
  (tree || []).forEach((n) => {
    out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name}` });
    if (n.children?.length) out.push(...treeToOptions(n.children, depth + 1));
  });
  return out;
}

export default function AdminMenuCreatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [tree, setTree] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [categories, setCategories] = useState([]);
  const [topics, setTopics] = useState([]);
  const [pages, setPages] = useState([]);
  const [filter, setFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [form, setForm] = useState({
    name: "",
    link: "",
    type: "custom",
    position: "mainmenu",
    parent_id: "",
    sort_order: 0,
    status: true,
    table_id: "",
    autoLink: true,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await apiMenus(`/tree?position=${encodeURIComponent(form.position)}&status=1`);
        setTree(Array.isArray(data) ? data : []);
      } catch {}
    })();
  }, [form.position]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingSources(true);
        const [cat, top, pag] = await Promise.all([
          fetch(`${BASE}${API}/categories?per_page=200`, { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:[]})),
          fetch(`${BASE}${API}/topics?per_page=200`, { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:[]})),
          fetch(`${BASE}${API}/posts?per_page=200&type=page`, { cache: "no-store" }).then(r=>r.json()).catch(()=>({data:[]})),
        ]);
        if(!alive) return;
        setCategories(Array.isArray(cat?.data) ? cat.data : []);
        setTopics(Array.isArray(top?.data) ? top.data : []);
        setPages(Array.isArray(pag?.data) ? pag.data : []);
      } finally { setLoadingSources(false); }
    })();
    return () => { alive = false; };
  }, []);

  const parentOptions = useMemo(() => treeToOptions(tree), [tree]);
  const isGroup = form.type === "group";

  const filteredSource = useMemo(() => {
    const q = (filter || "").toLowerCase().trim();
    const match = (s) => String(s || "").toLowerCase().includes(q);
    if (form.type === "category") return (categories || []).filter((x) => match(x.name || x.title));
    if (form.type === "topic")    return (topics || []).filter((x) => match(x.name || x.title));
    if (form.type === "page")     return (pages || []).filter((x) => match(x.title || x.name));
    return [];
  }, [form.type, filter, categories, topics, pages]);

  function pickSourceItem(item){
    if (!item) return;
    if (form.type === "category") {
      const slug = item.slug || slugify(item.name || "");
      setForm((f) => ({ ...f, name: item.name || item.title || "", link: `/category/${slug}`, table_id: item.id, autoLink: false }));
    } else if (form.type === "topic") {
      const slug = item.slug || slugify(item.name || "");
      setForm((f) => ({ ...f, name: item.name || item.title || "", link: `/blog/${slug}`, table_id: item.id, autoLink: false }));
    } else if (form.type === "page") {
      const slug = item.slug || slugify(item.title || item.name || "");
      setForm((f) => ({ ...f, name: item.title || item.name || "", link: `/${slug}`, table_id: item.id, autoLink: false }));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");

    let finalLink = (form.link || "").trim();
    if (!isGroup && !finalLink && form.name.trim()) {
      finalLink = `/${slugify(form.name)}`;
    }
    if (!isGroup && !finalLink) {
      finalLink = "/";
    }

    const payload = {
      name: (form.name || "").trim(),
      type: form.type || "custom",
      position: form.position || "mainmenu",
      parent_id: form.parent_id ? toInt(form.parent_id, 0) : 0,
      sort_order: toInt(form.sort_order, 0),
      status: form.status ? 1 : 0,
      ...(isGroup ? {} : { link: finalLink }),
      ...(form.table_id ? { table_id: toInt(form.table_id) } : {}),
    };

    if (!payload.name) { setErr("Vui lòng nhập tên menu."); return; }

    try {
      setSaving(true);
      await apiMenus("", { method: "POST", body: payload });
      router.push("/admin/menu?created=1");
    } catch (e2) {
      setErr(e2.message || "Tạo menu thất bại.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <button 
            onClick={() => router.push("/admin/menu")} 
            className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Quay lại Menu
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Thêm menu mới</h1>
          <p className="text-sm text-gray-500 mt-1">Tạo menu item mới cho website</p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          {/* Error Message */}
          {err && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{err}</span>
            </div>
          )}

          {/* Main Form Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Step 1: Chọn loại menu */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                1. Chọn loại menu
              </label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  {v:"custom", label:"Tự nhập", icon:"✏️", desc:"Nhập tên và link thủ công"},
                  {v:"category", label:"Danh mục", icon:"📁", desc:"Chọn từ danh mục sản phẩm"},
                  {v:"topic", label:"Chủ đề", icon:"📰", desc:"Chọn từ chủ đề tin tức"},
                  {v:"page", label:"Trang", icon:"📄", desc:"Chọn từ trang tĩnh"},
                  {v:"group", label:"Nhóm", icon:"📂", desc:"Thư mục cha (không có link)"},
                ].map(o=> (
                  <button 
                    type="button" 
                    key={o.v}
                    onClick={()=>{ 
                      setForm(f=>({...f, type:o.v, link: "", table_id: ""})); 
                      setFilter(""); 
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      form.type===o.v
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-2xl mb-1">{o.icon}</div>
                    <div className={`font-medium text-sm ${form.type===o.v ? "text-blue-700" : "text-gray-700"}`}>
                      {o.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Chọn nguồn (nếu không phải custom/group) */}
            {form.type !== "custom" && form.type !== "group" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  2. Chọn {form.type === "category" ? "danh mục" : form.type === "topic" ? "chủ đề" : "trang"}
                </label>
                <div className="space-y-3">
                  <input 
                    value={filter} 
                    onChange={(e)=>setFilter(e.target.value)} 
                    placeholder={`Tìm ${form.type === "category" ? "danh mục" : form.type === "topic" ? "chủ đề" : "trang"}...`} 
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
                    {loadingSources ? (
                      <div className="p-4 text-center text-sm text-gray-500">Đang tải...</div>
                    ) : filteredSource.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">Không tìm thấy</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {filteredSource.map(it=> (
                          <button 
                            key={it.id} 
                            type="button" 
                            onClick={()=>pickSourceItem(it)}
                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-gray-900">{it.name || it.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">ID: {it.id}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Thông tin cơ bản */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {form.type === "custom" || form.type === "group" ? "2." : "3."} Thông tin menu
              </label>
              <div className="space-y-4">
                {/* Tên */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tên menu <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setForm((f) => {
                        const updated = { ...f, name: newName };
                        if (f.autoLink && f.type === "custom" && !isGroup && newName.trim()) {
                          updated.link = `/${slugify(newName)}`;
                        }
                        return updated;
                      });
                    }}
                    placeholder="Ví dụ: Trang chủ, Sản phẩm, Liên hệ..."
                    className="h-11 w-full rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Link */}
                {!isGroup && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-gray-700">
                        Đường dẫn (Link) <span className="text-red-500">*</span>
                      </label>
                      {form.type === "custom" && (
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.autoLink}
                            onChange={(e) => {
                              const autoLink = e.target.checked;
                              setForm((f) => ({
                                ...f,
                                autoLink,
                                link: autoLink && f.name.trim() ? `/${slugify(f.name)}` : f.link,
                              }));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Tự động tạo từ tên</span>
                        </label>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={form.link}
                        onChange={(e) => setForm((f) => ({ ...f, link: e.target.value, autoLink: false }))}
                        placeholder={form.autoLink && form.type === "custom" ? "Tự động tạo từ tên..." : "/duong-dan hoặc https://..."}
                        disabled={isGroup || (form.autoLink && form.type === "custom")}
                        className="flex-1 h-11 rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                      />
                      {!form.autoLink && form.type === "custom" && (
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, link: `/${slugify(f.name || "")}` }))}
                          className="px-4 h-11 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-sm whitespace-nowrap"
                        >
                          Tạo từ tên
                        </button>
                      )}
                    </div>
                    {form.type === "custom" && form.autoLink && (
                      <p className="text-xs text-gray-500 mt-1.5">
                        Link sẽ tự động tạo từ tên. Tắt checkbox để nhập thủ công.
                      </p>
                    )}
                  </div>
                )}

                {/* Vị trí và Menu cha */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vị trí</label>
                    <select
                      value={form.position}
                      onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="mainmenu">Menu chính (Header)</option>
                      <option value="footermenu">Menu chân trang (Footer)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Menu cha</label>
                    <select
                      value={form.parent_id ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-gray-300 px-4 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">— Không có (Menu gốc) —</option>
                      {parentOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Options */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <span>Tùy chọn nâng cao</span>
                <svg 
                  className={`w-5 h-5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Thứ tự hiển thị</label>
                      <input
                        type="number"
                        value={form.sort_order}
                        onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                        placeholder="0"
                        className="h-11 w-full rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">Số nhỏ hơn sẽ hiển thị trước</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Trạng thái</label>
                      <div className="flex items-center gap-3 h-11">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, status: !f.status }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            form.status ? "bg-green-600" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              form.status ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-600">
                          {form.status ? "Hiển thị" : "Ẩn"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {form.type !== "custom" && form.type !== "group" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">ID nguồn (tùy chọn)</label>
                      <input
                        type="number"
                        value={form.table_id || ""}
                        onChange={(e)=> setForm((f)=>({ ...f, table_id: e.target.value }))}
                        placeholder={`ID ${form.type}`}
                        className="h-11 w-full rounded-lg border border-gray-300 px-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">ID tham chiếu đến bảng {form.type}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="px-6 h-11 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={saving} 
              className="px-6 h-11 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang lưu...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Tạo menu
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
