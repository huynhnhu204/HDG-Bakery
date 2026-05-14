"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_V1   = API_BASE + "/api/v1";

async function fetchJson(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function Section({ title, children }){
  return (
    <section className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      {children}
    </section>
  );
}

export default function DynamicResolverPage({ params }){
  const [state,setState]=useState({ loading:true, kind:"", data:null, error:null });
  const [pathname, setPathname] = useState("/");
  
  // Get pathname from window.location and update on navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    setPathname(window.location.pathname || "/");
    
    // Listen for browser navigation events
    const handlePopState = () => {
      setPathname(window.location.pathname || "/");
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(()=>{ let alive=true;(async()=>{
    const path = pathname.replace(/\/+$/,'') || '/';
    try{
      // 1) Page (post type=page): GET /posts?type=page&slug=
      const pageSlug = encodeURIComponent(path.replace(/^\//,''));
      if(pageSlug){
        try{
          const j = await fetchJson(`${API_V1}/posts?type=page&slug=${pageSlug}`);
          const list = Array.isArray(j?.data)? j.data : [];
          if(list.length){ if(!alive) return; setState({ loading:false, kind:"page", data:list[0], error:null }); return; }
        }catch{}
      }

      // 2) Topic (blog): /blog/<slug>
      if(path.startsWith('/blog/')){
        const slug = encodeURIComponent(path.slice(6));
        try{
          const j = await fetchJson(`${API_V1}/topics?slug=${slug}`);
          const list = Array.isArray(j?.data)? j.data:[];
          if(list.length){ if(!alive) return; setState({ loading:false, kind:"topic", data:list[0], error:null }); return; }
        }catch{}
      }

      // 3) Category: /a[/b]
      const parts = path.split('/').filter(Boolean);
      if(parts.length){
        const slug1 = encodeURIComponent(parts[0]);
        try{
          const j1 = await fetchJson(`${API_V1}/categories?slug=${slug1}`);
          const r1 = Array.isArray(j1?.data)? j1.data[0]: null;
          if(r1){
            // optional: try sub category by slug2
            if(parts[1]){
              const slug2 = encodeURIComponent(parts[1]);
              try{
                const j2 = await fetchJson(`${API_V1}/categories?parent=${r1.id}&slug=${slug2}`);
                const r2 = Array.isArray(j2?.data)? j2.data[0]: null;
                if(r2){ if(!alive) return; setState({ loading:false, kind:"category", data:r2, error:null }); return; }
              }catch{}
            }
            if(!alive) return; setState({ loading:false, kind:"category", data:r1, error:null }); return;
          }
        }catch{}
      }

      // 4) Fallback: not resolved => friendly page (no 404)
      if(!alive) return; setState({ loading:false, kind:"unknown", data:null, error:null });
    }catch(e){ if(!alive) return; setState({ loading:false, kind:"error", data:null, error:e }); }
  })(); return ()=>{ alive=false }; }, [pathname]);

  if(state.loading){
    return <Section title="Đang tải"> <p className="text-gray-500">Đang tải nội dung…</p> </Section>;
  }

  if(state.kind === 'page'){
    const p = state.data;
    return (
      <Section title={p.title || p.name || 'Trang'}>
        <article className="prose max-w-none" dangerouslySetInnerHTML={{ __html: p.content || p.body || '' }} />
      </Section>
    );
  }

  if(state.kind === 'topic'){
    const t = state.data;
    return (
      <Section title={t.name || 'Chủ đề'}>
        <p className="text-gray-600">Bài viết theo chủ đề sẽ hiển thị ở đây.</p>
      </Section>
    );
  }

  if(state.kind === 'category'){
    const c = state.data;
    return (
      <Section title={c.name || 'Danh mục'}>
        <p className="text-gray-600">Sản phẩm thuộc danh mục sẽ hiển thị ở đây.</p>
      </Section>
    );
  }

  if(state.kind === 'error'){
    return (
      <Section title="Không tải được">
        <p className="text-red-600">Lỗi tải dữ liệu. Vui lòng thử lại.</p>
      </Section>
    );
  }

  // unknown
  return (
    <Section title="Đang cập nhật">
      <p className="text-gray-600">Đường dẫn này chưa có nội dung. Bạn có thể xem:</p>
      <ul className="list-disc pl-6 mt-2 text-blue-700">
        <li><Link href="/">Trang chủ</Link></li>
        <li><Link href="/blog">Blog</Link></li>
      </ul>
    </Section>
  );
}



