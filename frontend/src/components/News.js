import Image from "next/image";
import Link from "next/link";

/** Đọc API_BASE từ env, fallback localhost */
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000")
  .replace(/\/+$/, "");

/** Chuẩn hóa ảnh (tương đối -> tuyệt đối) */
function normImg(src) {
  if (!src) return "/slide1.jpg";
  return src.startsWith("http") || src.startsWith("/")
    ? src
    : `${API_BASE}/${src.replace(/^\/+/, "")}`;
}

/** Format dd/MM/yyyy cho created_at */
function toVNDate(s) {
  try {
    const d = new Date(s);
    return d.toLocaleDateString("vi-VN");
  } catch {
    return s ?? "";
  }
}

/** Gọi API lấy bài viết (status=1), giới hạn số lượng */
async function fetchPosts(limit = 4) {
  const url = `${API_BASE}/api/v1/posts?status=1&per_page=${limit}`;
  const res = await fetch(url, { cache: "no-store" }); // luôn lấy mới
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  // Hỗ trợ cả {data:[...]} hoặc mảng trực tiếp
  const list = Array.isArray(json) ? json : json?.data || [];
  return list;
}

/** Server Component */
export default async function News({ limit = 6 }) {
  let posts = [];
  try {
    posts = await fetchPosts(limit);
  } catch (e) {
    // Render fallback gọn gàng khi lỗi
    return (
      <section className="mb-10">
        <h2 className="text-xl md:text-2xl text-orange-600 font-bold mb-6">
          Tin tức mới nhất
        </h2>
        <p className="text-red-600">Không tải được tin tức: {String(e?.message || "Lỗi")}</p>
      </section>
    );
  }

  if (!posts.length) {
    return (
      <section className="mb-10">
        <h2 className="text-xl md:text-2xl text-orange-600 font-bold mb-6">
          Tin tức mới nhất
        </h2>
        <p className="text-gray-500">Chưa có bài viết</p>
      </section>
    );
  }

  return (
    <section className="mb-10 py-8 bg-[#faf7f2] border-y border-amber-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Title với decorative underline */}
        <div className="text-center mb-8 relative">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-wide inline-block" style={{ fontFamily: 'Georgia, serif' }}>
            Tin tức mới nhất
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-40 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
          </h2>
        </div>

        {/* Horizontal Scrollable - 3 items visible */}
        <div className="overflow-x-auto pb-4 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex gap-6" style={{ width: 'max-content' }}>
            {posts.map((post) => {
              const href = `/news/${post.slug || post.id}`;
              const img = normImg(post.image);
              const date = toVNDate(post.created_at);
              
              return (
                <article
                  key={post.id}
                  className="bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow flex-shrink-0"
                  style={{ width: '380px' }}
                >
                  <Link href={href} className="block">
                    <div className="relative w-full h-56 overflow-hidden rounded-t-lg">
                      <Image
                        src={img}
                        alt={post.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-300"
                        sizes="380px"
                        loading="lazy"
                      />
                      {/* Date badge ở góc trên trái */}
                      <div className="absolute top-3 left-3 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                        {date}
                      </div>
                    </div>
                    <div className="p-5 text-center">
                      <h3 className="text-lg font-bold text-gray-900 mb-3 hover:text-amber-600 transition-colors leading-tight">
                        {post.title}
                      </h3>
                      {/* Đường kẻ ngang màu vàng - căn giữa */}
                      <div className="w-20 h-0.5 bg-amber-600 mb-4 mx-auto"></div>
                      <p className="text-sm text-gray-700 line-clamp-4 leading-relaxed">
                        {post.description || ""}
                      </p>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
