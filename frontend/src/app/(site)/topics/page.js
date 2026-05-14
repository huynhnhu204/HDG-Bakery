import Link from "next/link";
import Image from "next/image";
import Script from "next/script";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const PAGE_TITLE = "Chủ đề tin tức | Dola Bakery";
const PAGE_DESC  = "Khám phá các chủ đề bài viết: khuyến mãi, công thức, câu chuyện và tin tức mới nhất từ Dola Bakery.";

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

/* ---- SEO ---- */
export async function generateMetadata() {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/+$/, "");
  return {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    alternates: { canonical: `${siteUrl}/topics` },
    openGraph: { title: PAGE_TITLE, description: PAGE_DESC, url: `${siteUrl}/topics` },
    twitter: { card: "summary", title: PAGE_TITLE, description: PAGE_DESC },
  };
}

/* ---- Page ---- */
export default async function TopicsIndexPage() {
  // Lấy toàn bộ topic (kèm đếm post) cho FE
  const data = await fetchJSON(`${API_BASE}/api/v1/topics?withCounts=1&per_page=500`);
  const topics = Array.isArray(data) ? data : (data?.data || []);

  // JSON-LD ItemList
  const listLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: (topics || []).map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `/topics/${t.slug}`,
      name: t.name,
    })),
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <Script id="ld-topics" type="application/ld+json">{JSON.stringify(listLd)}</Script>

      <h1 className="text-3xl font-extrabold text-amber-700 text-center">Chủ đề tin tức</h1>
      <p className="text-center text-gray-600 mt-2">
        Khuyến mãi, công thức, hướng dẫn và câu chuyện từ Dola Bakery.
      </p>

      {(!topics || topics.length === 0) ? (
        <p className="text-center text-gray-500 mt-10">Chưa có chủ đề nào.</p>
      ) : (
        <section className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
          {topics.map((t) => (
            <Link
              key={t.id || t.slug}
              href={`/topics/${t.slug}`}
              className="rounded-xl border bg-white hover:shadow-md transition overflow-hidden"
            >
              <div className="relative w-full h-40 bg-amber-50">
                <Image
                  src={normImg(t.image)}
                  alt={t.name}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-1">{t.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {t.description || "—"}
                </p>
                <div className="mt-2 text-xs text-gray-600">
                  {Number(t.posts_count ?? 0).toLocaleString("vi-VN")} bài viết
                </div>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
