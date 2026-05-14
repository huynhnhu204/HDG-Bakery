import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { notFound } from "next/navigation";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const PAGE_SIZE = 12;

/* ---- helpers ---- */
async function fetchJSON(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
function normImg(src) {
  if (!src) return "/slide1.jpg";
  if (src.startsWith("http") || src.startsWith("/")) return src;
  return `${API_BASE}/${String(src).replace(/^\/+/, "")}`;
}

/* ---- SEO động ---- */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const topic = await fetchJSON(`${API_BASE}/api/v1/topics/slug/${encodeURIComponent(slug)}`);
  if (!topic) return { title: "Chủ đề | Dola Bakery" };

  const title = `${topic.name} | Dola Bakery`;
  const desc  = topic.description?.slice(0, 160) || `Bài viết thuộc chủ đề ${topic.name} tại Dola Bakery.`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const cover = normImg(topic.image);

  return {
    title,
    description: desc,
    alternates: { canonical: `${siteUrl}/topics/${slug}` },
    openGraph: {
      title,
      description: desc,
      images: cover ? [{ url: cover, width: 800, height: 600, alt: topic.name }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description: desc, images: cover ? [cover] : undefined },
  };
}

/* ---- Page ---- */
export default async function TopicDetailPage({ params, searchParams }) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams)?.page || 1));

  // 1) Lấy topic theo slug
  const topic = await fetchJSON(`${API_BASE}/api/v1/topics/slug/${encodeURIComponent(slug)}`);
  if (!topic) notFound();

  // 2) Lấy bài viết theo topic (ưu tiên filter theo slug; BE có thể nhận topic|topic_id tuỳ anh triển khai)
  //    FE sẽ thử theo thứ tự: topic_slug -> topic -> topic_id (fallback).
  let postsPayload =
    await fetchJSON(`${API_BASE}/api/v1/posts?topic_slug=${encodeURIComponent(slug)}&status=1&per_page=${PAGE_SIZE}&page=${page}`)
    || await fetchJSON(`${API_BASE}/api/v1/posts?topic=${encodeURIComponent(slug)}&status=1&per_page=${PAGE_SIZE}&page=${page}`)
    || (topic?.id ? await fetchJSON(`${API_BASE}/api/v1/posts?topic_id=${topic.id}&status=1&per_page=${PAGE_SIZE}&page=${page}`) : null);

  const posts = Array.isArray(postsPayload) ? postsPayload : (postsPayload?.data || []);
  const totalPages = postsPayload?.last_page || 1;
  const total      = postsPayload?.total || posts?.length || 0;

  // JSON-LD (Breadcrumb + CollectionPage)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name: "Chủ đề", item: `${siteUrl}/topics` },
      { "@type": "ListItem", position: 3, name: topic.name, item: `${siteUrl}/topics/${slug}` },
    ],
  };
  const listLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Bài viết: ${topic.name}`,
    hasPart: (posts || []).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title || p.name,
      datePublished: p.created_at,
      image: p.thumbnail ? [normImg(p.thumbnail)] : undefined,
      url: `${siteUrl}/blog/${p.slug || p.id}`,
    })),
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Script id="ld-breadcrumbs" type="application/ld+json">{JSON.stringify(breadcrumbsLd)}</Script>
      <Script id="ld-topic-posts" type="application/ld+json">{JSON.stringify(listLd)}</Script>

      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-amber-700">{topic.name}</h1>
        {topic.description ? (
          <p className="text-gray-600 mt-2 max-w-2xl mx-auto">{topic.description}</p>
        ) : null}
      </div>

      {/* Danh sách bài viết */}
      {(!posts || posts.length === 0) ? (
        <p className="text-center text-gray-500 mt-10">Chưa có bài viết trong chủ đề này.</p>
      ) : (
        <section className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 mt-8">
          {posts.map((p) => {
            const cover = normImg(p.thumbnail || p.image);
            const href  = `/blog/${p.slug || p.id}`; // FE detail (anh có thể làm sau)
            const date  = p.created_at ? new Date(p.created_at).toLocaleDateString("vi-VN") : null;
            const excerpt = p.excerpt || p.description || "";

            return (
              <Link key={p.id} href={href} className="rounded-xl border bg-white hover:shadow-md transition overflow-hidden">
                <div className="relative w-full h-44 bg-amber-50">
                  <Image src={cover} alt={p.title || p.name} fill className="object-cover" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{p.title || p.name}</h3>
                  {date && <div className="text-xs text-gray-500 mt-1">{date}</div>}
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{excerpt}</p>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center items-center gap-2" aria-label="Pagination">
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 9).map((p) => (
            <a
              key={p}
              href={`?page=${p}`}
              aria-current={p === page ? "page" : undefined}
              className={`w-9 h-9 grid place-items-center rounded border text-sm ${
                p === page ? "bg-amber-600 border-amber-600 text-white" : "hover:bg-gray-50"
              }`}
            >
              {p}
            </a>
          ))}
        </nav>
      )}

      {/* Tổng số bài để người dùng biết */}
      <p className="text-center text-sm text-gray-500 mt-4">Tổng {total} bài viết</p>
    </main>
  );
}
