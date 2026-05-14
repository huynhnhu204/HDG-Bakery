"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import axios from "axios";

/** Backend Laravel API */
const BASE_API =
  (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "") + "/api/v1";

/* --- small UI helpers --- */
function DateBadge({ iso }) {
  if (!iso) return null;
  const d = new Date(iso);
  const dd = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <span className="absolute left-2 top-2 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      {dd}
    </span>
  );
}

function ArticleCard({ item }) {
  // Xử lý URL ảnh - nếu là đường dẫn tương đối thì thêm base URL
  const getImageUrl = (src) => {
    console.log('getImageUrl input:', src);
    if (!src || src === 'null' || src === 'undefined') {
      console.log('No valid image, using fallback');
      return "/cake1.jpg"; // Sử dụng ảnh có sẵn để test
    }
    if (src.startsWith("http") || src.startsWith("/")) return src;
    // Nếu là đường dẫn tương đối từ backend, thêm base URL
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";
    const finalUrl = `${baseUrl}/${src.replace(/^\/+/, "")}`;
    console.log('Final image URL:', finalUrl);
    return finalUrl;
  };
  
  const image = getImageUrl(item?.image_url || item?.image);
  const date  = item?.created_at || item?.date;
  const excerpt = item?.description || item?.excerpt || "";
  
  // Debug log để kiểm tra dữ liệu
  console.log('ArticleCard item:', {
    id: item?.id,
    title: item?.title,
    image: item?.image,
    image_url: item?.image_url,
    finalImage: image,
    rawItem: item
  });
  return (
    <article className="overflow-hidden rounded-xl border bg-white shadow-sm">
      <Link href={`/news/${item.slug}`} className="block relative">
        <div className="relative h-[170px] w-full">
          <Image
            src={image}
            alt={item.title}
            fill
            sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
            className="object-cover"
          />
          <DateBadge iso={date} />
        </div>
      </Link>
      <div className="p-3">
        <Link href={`/news/${item.slug}`} className="line-clamp-2 font-semibold text-gray-900 hover:text-amber-700">
          {item.title}
        </Link>
        {excerpt && <p className="mt-1 line-clamp-2 text-sm text-gray-600">{excerpt}</p>}
      </div>
    </article>
  );
}

export default function NewsPage() {
  const sp = useSearchParams();
  const page = Math.max(1, Number(sp.get("page") || 1));
  // cat = topic_id (ID)
  const cat  = sp.get("cat") || "";
  const perPage = 8;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // topics dùng để đếm bài đang hiển thị
  const [topics, setTopics] = useState([]);     // [{id,name,slug,posts_count}]
  const [featured, setFeatured] = useState([]); // 4 bài nổi bật / mới nhất

  const listUrl = useMemo(() => {
    const u = new URL(`${BASE_API}/posts`);
    u.searchParams.set("post_type", "post");
    u.searchParams.set("status", "1");
    u.searchParams.set("page", String(page));
    u.searchParams.set("per_page", String(perPage));
    if (cat) u.searchParams.set("topic_id", String(cat));
    return u.toString();
  }, [page, perPage, cat]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr("");

    Promise.all([
      axios.get(listUrl),
      // ✅ chỉ đếm bài hiển thị: withCounts=1&visibleOnly=1; _ts chống cache
      axios.get(`${BASE_API}/topics?withCounts=1&visibleOnly=1&_ts=${Date.now()}`)
           .catch(() => ({ data: { data: [] } })),
      axios.get(`${BASE_API}/posts?post_type=post&status=1&per_page=4&page=1`)
           .catch(() => ({ data: { data: [] } })),
    ])
      .then(([listRes, topicsRes, featuredRes]) => {
        if (!mounted) return;

        // posts (paged)
        const paged = listRes?.data;
        setItems(paged?.data || []);
        setTotalPages(paged?.last_page || 1);

        // topics: hỗ trợ cả mảng và paginate
        const tdata = Array.isArray(topicsRes?.data) ? topicsRes.data : (topicsRes?.data?.data || []);
        setTopics(tdata);

        // featured
        const f = Array.isArray(featuredRes?.data) ? featuredRes.data : (featuredRes?.data?.data || []);
        setFeatured(f);
      })
      .catch((e) => {
        if (!mounted) return;
        setErr(e?.message || "Fetch failed");
      })
      .finally(() => mounted && setLoading(false));

    return () => { mounted = false; };
  }, [listUrl]);

  const countsByTopicId = useMemo(() => {
    if (!Array.isArray(topics)) return {};
    return Object.fromEntries(topics.map((t) => [String(t.id), t.posts_count ?? 0]));
  }, [topics]);

  const activeTopic = useMemo(() => {
    if (!Array.isArray(topics)) return null;
    return topics.find((t) => String(t.id) === String(cat)) || null;
  }, [topics, cat]);

  const urlFor = (p) => {
    const usp = new URLSearchParams();
    if (cat) usp.set("cat", String(cat));
    usp.set("page", String(p));
    return `/news?${usp.toString()}`;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-600">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
        </ol>
        <div>
          <span className="text-gray-900 font-semibold">Tin tức</span>
          {activeTopic && (
            <span className="ml-2 text-gray-500">• {activeTopic.name} ({countsByTopicId[String(cat)] || 0})</span>
          )}
        </div>
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: list */}
        <section className="lg:col-span-2">
          {loading ? (
            <p className="text-gray-500">Đang tải…</p>
          ) : err ? (
            <p className="text-red-600">Không tải được dữ liệu: {err}</p>
          ) : items.length === 0 ? (
            <p className="text-gray-500">Chưa có bài viết.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {items.map((it) => <ArticleCard key={it.slug || it.id} item={it} />)}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-6 flex items-center justify-center gap-2">
                  <Link
                    href={urlFor(Math.max(1, page - 1))}
                    aria-disabled={page === 1}
                    className={
                      "rounded border px-3 py-1.5 " +
                      (page === 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50")
                    }
                  >
                    ←
                  </Link>

                  {Array.from({ length: totalPages }).map((_, i) => {
                    const p = i + 1;
                    return (
                      <Link
                        key={p}
                        href={urlFor(p)}
                        className={
                          "rounded border px-3 py-1.5 text-sm " +
                          (page === p ? "border-amber-600 bg-amber-600 text-white" : "hover:bg-gray-50")
                        }
                        aria-current={page === p ? "page" : undefined}
                      >
                        {p}
                      </Link>
                    );
                  })}

                  <Link
                    href={urlFor(Math.min(totalPages, page + 1))}
                    aria-disabled={page === totalPages}
                    className={
                      "rounded border px-3 py-1.5 " +
                      (page === totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50")
                    }
                  >
                    →
                  </Link>
                </nav>
              )}
            </>
          )}
        </section>

        {/* Right: sidebar */}
        <aside className="space-y-5">
          <div className="rounded-xl border bg-amber-100/60 p-4">
            <h3 className="mb-3 font-bold text-amber-900">Danh mục tin tức</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link
                  href="/news"
                  className={
                    "flex items-center justify-between rounded px-2 py-1.5 hover:bg-amber-200/60 " +
                    (!cat ? "font-semibold text-amber-900" : "text-gray-700")
                  }
                >
                  <span>Tất cả</span>
                  <span className="text-xs opacity-70">
                    {Array.isArray(topics) ? topics.reduce((a, t) => a + (t.posts_count ?? 0), 0) : 0}
                  </span>
                </Link>
              </li>

              {Array.isArray(topics) && topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/news?cat=${t.id}`}
                    className={
                      "flex items-center justify-between rounded px-2 py-1.5 hover:bg-amber-200/60 " +
                      (String(cat) === String(t.id) ? "font-semibold text-amber-900" : "text-gray-700")
                    }
                  >
                    <span>{t.name}</span>
                    <span className="text-xs opacity-70">{t.posts_count ?? 0}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-amber-100/60 p-4">
            <h3 className="mb-3 font-bold text-amber-900">Tin nổi bật</h3>
            <ul className="space-y-3">
              {featured.map((f) => {
                // Xử lý URL ảnh cho featured posts
                const getImageUrl = (src) => {
                  console.log('Featured getImageUrl input:', src);
                  if (!src || src === 'null' || src === 'undefined') {
                    console.log('Featured: No valid image, using fallback');
                    return "/cake1.jpg";
                  }
                  if (src.startsWith("http") || src.startsWith("/")) return src;
                  const baseUrl = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";
                  const finalUrl = `${baseUrl}/${src.replace(/^\/+/, "")}`;
                  console.log('Featured final URL:', finalUrl);
                  return finalUrl;
                };
                
                return (
                  <li key={f.slug || f.id}>
                    <Link href={`/news/${f.slug}`} className="flex gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded">
                        <Image 
                          src={getImageUrl(f.image_url || f.image)} 
                          alt={f.title} 
                          fill 
                          sizes="64px" 
                          className="object-cover"
                        />
                      </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-amber-700">{f.title}</p>
                      <p className="text-xs text-gray-500">
                        {f.created_at ? new Date(f.created_at).toLocaleDateString("vi-VN") : ""}
                      </p>
                    </div>
                  </Link>
                </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
