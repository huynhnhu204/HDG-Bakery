"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";

/** ĐỔI BASE_API nếu bạn không dùng prefix /v1  */
const BASE_API = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000")
  .replace(/\/+$/, "") + "/api/v1";

/** Chuẩn hoá ảnh (hỗ trợ đường dẫn tương đối từ backend, fallback ảnh local) */
function resolveNewsImage(src) {
  const fallback = "/cake1.jpg";
  if (!src) return fallback;
  const raw = String(src).trim();
  if (!raw || raw === "null" || raw === "undefined") return fallback;
  if (raw.startsWith("//")) return `http:${raw}`;
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
    return raw;
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE?.replace(/\/+$/, "") || "http://127.0.0.1:8000";
  return `${baseUrl}/${raw.replace(/^\/+/, "")}`;
}

function formatVNDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (err) {
    console.warn("Invalid date:", iso, err);
    return "";
  }
}

// Badge ngày giống trang /news
function DateBadge({ iso }) {
  if (!iso) return null;
  return (
    <span className="absolute left-2 top-2 rounded bg-amber-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      {formatVNDate(iso)}
    </span>
  );
}

export default function NewsDetailPage() {
  const params = useParams();                    // ✅ lấy params kiểu client
  const slug = useMemo(() => {
    const s = params?.slug;
    return Array.isArray(s) ? s[0] : s;          // hỗ trợ [slug] hoặc [...slug]
  }, [params]);

  const [post, setPost] = useState(null);
  const [err, setErr] = useState("");
  const [otherPosts, setOtherPosts] = useState([]);
  const [loadingOthers, setLoadingOthers] = useState(false);
  const [commentForm, setCommentForm] = useState({
    fullName: "",
    email: "",
    message: "",
  });
  const [commentStatus, setCommentStatus] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [comments, setComments] = useState([]);
  const [topics, setTopics] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);
  const [sidebarErr, setSidebarErr] = useState("");

  const fetchOtherPosts = useCallback((currentPostId) => {
    setLoadingOthers(true);
    axios
      .get(`${BASE_API}/posts?post_type=post&status=1&per_page=6&page=1`)
      .then((res) => {
        const allPosts = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        // Filter out current post by ID or slug
        const filtered = allPosts.filter(
          (p) => p.id !== currentPostId && p.slug !== slug
        );
        // Limit to 3 posts maximum
        setOtherPosts(filtered.slice(0, 3));
      })
      .catch((e) => {
        console.error("Failed to fetch other posts:", e);
        setOtherPosts([]);
      })
      .finally(() => setLoadingOthers(false));
  }, [slug]);

  useEffect(() => {
    let mounted = true;
    setSidebarLoading(true);
    setSidebarErr("");

    Promise.all([
      axios
        .get(`${BASE_API}/topics?withCounts=1&visibleOnly=1&_ts=${Date.now()}`)
        .catch(() => ({ data: { data: [] } })),
      axios
        .get(`${BASE_API}/posts?post_type=post&status=1&per_page=4&page=1`)
        .catch(() => ({ data: { data: [] } })),
    ])
      .then(([topicsRes, featuredRes]) => {
        if (!mounted) return;
        const tdata = Array.isArray(topicsRes?.data)
          ? topicsRes.data
          : topicsRes?.data?.data || [];
        const fdata = Array.isArray(featuredRes?.data)
          ? featuredRes.data
          : featuredRes?.data?.data || [];
        setTopics(tdata);
        setFeatured(fdata);
      })
      .catch((e) => {
        if (!mounted) return;
        setSidebarErr(e?.message || "Không tải được dữ liệu.");
      })
      .finally(() => {
        if (mounted) setSidebarLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFormChange = useCallback((field, value) => {
    setCommentForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const fetchComments = useCallback((postId) => {
    if (!postId) return;
    axios
      .get(`${BASE_API}/comments?post_id=${postId}`)
      .then((res) => {
        const commentsList = Array.isArray(res.data) ? res.data : [];
        setComments(commentsList);
      })
      .catch((e) => {
        console.error("Failed to fetch comments:", e);
        setComments([]);
      });
  }, []);

  const handleCommentSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const fullName = commentForm.fullName.trim();
      const email = commentForm.email.trim();
      const message = commentForm.message.trim();

      if (!fullName || !email || !message) {
        setCommentError("Vui lòng nhập đầy đủ thông tin.");
        return;
      }

      if (!post?.id) {
        setCommentError("Không tìm thấy bài viết.");
        return;
      }

      setSubmittingComment(true);
      setCommentError("");
      setCommentStatus("");

      const payload = {
        post_id: post.id,
        name: fullName,
        email,
        content: message,
      };

      try {
        const res = await axios.post(`${BASE_API}/comments`, payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        // Thêm comment mới vào đầu danh sách
        const newComment = res.data;
        setComments((prev) => [newComment, ...prev]);
        setCommentStatus("✅ Cảm ơn bạn! Bình luận đã được ghi nhận.");
        setCommentForm({
          fullName: "",
          email: "",
          message: "",
        });
      } catch (error) {
        console.error("Submit comment failed:", error);
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          "Không thể gửi bình luận, vui lòng thử lại.";
        setCommentError(msg);
      } finally {
        setSubmittingComment(false);
      }
    },
    [commentForm, post]
  );

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    setErr("");
    setPost(null);

    axios
      .get(`${BASE_API}/posts/slug/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (mounted) {
          setPost(res.data);
          // Fetch other posts after getting current post
          fetchOtherPosts(res.data.id || res.data.slug);
          // Fetch comments for this post
          if (res.data.id) {
            fetchComments(res.data.id);
          }
        }
      })
      .catch((e) => mounted && setErr(e?.message || "Fetch failed"));

    return () => { mounted = false; };
  }, [slug, fetchOtherPosts, fetchComments]);

  if (!slug) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-gray-500">Không tìm thấy slug.</p>
      </main>
    );
  }

  if (err) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-red-600">Không tải được dữ liệu: {err}</p>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="container mx-auto px-4 py-10">
        <p className="text-gray-500">Đang tải…</p>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-600">
        <ol className="flex items-center gap-1">
          <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
          <li aria-hidden="true" className="px-1">/</li>
          <li><Link href="/news" className="hover:underline">Tin tức</Link></li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,2.1fr)_minmax(260px,1fr)] lg:items-start">
        <article className="lg:pr-6">
          <header className="mb-4">
            <h1 className="text-3xl font-extrabold text-gray-900">{post.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {post.created_at ? new Date(post.created_at).toLocaleDateString("vi-VN") : ""}
            </p>
          </header>

          {(post.image_url || post.image) && (
            <div className="relative mb-5 h-[280px] w-full overflow-hidden rounded-xl">
            <Image
              src={resolveNewsImage(post.image_url || post.image)}
                alt={post.title || "news image"}
                fill
                sizes="(min-width:768px) 700px, 100vw"
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="prose max-w-none prose-p:text-gray-700">
            {/* Nếu backend trả HTML trong content */}
            {typeof post.content === "string" && post.content.trim().startsWith("<") ? (
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            ) : Array.isArray(post.content) ? (
              post.content.map((p, i) => <p key={i}>{p}</p>)
            ) : (
              <p>{post.content}</p>
            )}
          </div>

          {/* Bình luận đã gửi trong phiên hiện tại */}
          {comments.length > 0 && (
            <section className="mt-12 rounded-xl border border-gray-200 bg-white/70 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Bình luận gần đây ({comments.length})
              </h2>
              <ul className="mt-4 space-y-4">
                {comments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-gray-100 bg-gray-50/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <span className="text-xs text-gray-500">
                        {formatVNDate(c.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-line">
                      {c.message}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Form bình luận */}
          <section className="mt-14">
            <h2 className="text-center text-3xl font-semibold text-gray-900">
              Viết bình luận của bạn
            </h2>
            <p className="mt-3 text-center text-sm text-gray-600">
              Chia sẻ cảm nhận hoặc câu hỏi để chúng tôi hỗ trợ bạn tốt hơn.
            </p>

            <form
              className="mt-10 space-y-8"
              onSubmit={handleCommentSubmit}
            >
              <div className="grid gap-8 md:grid-cols-2">
                <label className="flex flex-col">
                  <span className="mb-3 text-sm font-medium text-gray-700">Họ và tên</span>
                  <input
                    type="text"
                    value={commentForm.fullName}
                    onChange={(e) => handleFormChange("fullName", e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="rounded-none border-x-0 border-t-0 border-b-2 border-amber-500 bg-transparent px-0 pb-2 text-sm text-gray-800 outline-none transition focus:border-amber-600"
                  />
                </label>
                <label className="flex flex-col">
                  <span className="mb-3 text-sm font-medium text-gray-700">Email</span>
                  <input
                    type="email"
                    value={commentForm.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="email@example.com"
                    className="rounded-none border-x-0 border-t-0 border-b-2 border-amber-500 bg-transparent px-0 pb-2 text-sm text-gray-800 outline-none transition focus:border-amber-600"
                  />
                </label>
              </div>

              <label className="flex flex-col">
                <span className="mb-3 text-sm font-medium text-gray-700">Nội dung</span>
                <textarea
                  rows={6}
                  value={commentForm.message}
                  onChange={(e) => handleFormChange("message", e.target.value)}
                  placeholder="Bạn muốn chia sẻ điều gì?"
                  className="rounded-none border-x-0 border-t-0 border-b-2 border-amber-500 bg-transparent px-0 pb-2 text-sm text-gray-800 outline-none transition focus:border-amber-600"
                />
              </label>

              {commentStatus && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  {commentStatus}
                </div>
              )}
            {commentError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {commentError}
              </div>
            )}

              <div className="flex justify-start">
                <button
                  type="submit"
                disabled={submittingComment}
                className="rounded-md bg-amber-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                {submittingComment ? "Đang gửi…" : "Gửi thông tin"}
                </button>
              </div>
            </form>
          </section>

          {/* Hiển thị danh sách bình luận */}
          {comments.length > 0 && (
            <section className="mt-12">
              <h3 className="mb-6 text-2xl font-semibold text-gray-900">
                Bình luận ({comments.length})
              </h3>
              <div className="space-y-6">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="border-b border-gray-200 pb-6 last:border-b-0"
                  >
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{comment.name}</p>
                        <p className="text-xs text-gray-500">
                          {comment.created_at
                            ? formatVNDate(comment.created_at)
                            : ""}
                        </p>
                      </div>
                    </div>
                    <p className="ml-[52px] text-sm leading-relaxed text-gray-700">
                      {comment.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <footer className="mt-8">
            <Link href="/news" className="rounded border px-3 py-2 text-sm hover:bg-gray-50">
              ← Quay lại Tin tức
            </Link>
          </footer>
        </article>

        <aside className="space-y-6 lg:sticky lg:top-28">
          {sidebarLoading ? (
            <p className="text-sm text-gray-500">Đang tải dữ liệu…</p>
          ) : sidebarErr ? (
            <p className="text-sm text-red-600">{sidebarErr}</p>
          ) : (
            <>
              <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-amber-900">Danh mục tin tức</h3>
                {Array.isArray(topics) && topics.length > 0 ? (
                  <ul className="space-y-2 text-sm">
                    {topics.map((t) => (
                      <li key={t.id}>
                        <Link
                          href={`/news?cat=${t.id}`}
                          className="flex items-center justify-between rounded-md px-2 py-1.5 text-gray-700 transition hover:bg-amber-200/60 hover:text-amber-900"
                        >
                          <span>{t.name}</span>
                          <span className="text-xs opacity-70">{t.posts_count ?? 0}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có danh mục.</p>
                )}
              </section>

              <section className="rounded-xl border border-amber-100 bg-white/80 p-5 shadow-sm">
                <h3 className="mb-4 text-base font-semibold text-amber-900">Tin tức nổi bật</h3>
                {Array.isArray(featured) && featured.length > 0 ? (
                  <ul className="space-y-4">
                    {featured.map((f) => (
                      <li key={f.slug || f.id}>
                        <Link href={`/news/${f.slug}`} className="flex gap-3">
                          <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded">
                        <Image 
                          src={resolveNewsImage(f.image_url || f.image)} 
                              alt={f.title}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-sm font-medium text-gray-900 transition hover:text-amber-700">
                              {f.title}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {f.created_at ? formatVNDate(f.created_at) : ""}
                            </p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có tin nổi bật.</p>
                )}
              </section>
            </>
          )}
        </aside>
      </div>

      {/* Hiển thị các bài viết khác - Full width section */}
      {otherPosts.length > 0 && (
        <section className="mt-16 w-full bg-white/80 py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center mb-8 relative">
              <h2
                className="text-3xl md:text-4xl font-bold text-gray-900 inline-block tracking-wide"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Tin liên quan
                <div className="absolute -bottom-2 left-1/2 h-1 w-40 -translate-x-1/2 transform bg-gradient-to-r from-transparent via-amber-400 to-transparent"></div>
              </h2>
            </div>

            <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3">
              {otherPosts.map((item) => {
                const date = item?.created_at || item?.date;
                const description = item?.description || item?.excerpt || "";
                return (
                  <article
                    key={item.slug || item.id}
                    className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-lg"
                  >
                    <Link href={`/news/${item.slug}`} className="block">
                      <div className="relative h-[260px] w-full overflow-hidden">
                        <Image
                          src={resolveNewsImage(item.image_url || item.image)}
                          alt={item.title}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                          sizes="(min-width:1280px) 30vw, (min-width:768px) 50vw, 100vw"
                          loading="lazy"
                        />
                        <div className="absolute left-3 top-3 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                          {formatVNDate(date)}
                        </div>
                      </div>
                      <div className="px-5 pb-6 pt-5 text-center">
                        <h3 className="line-clamp-2 text-lg font-bold text-gray-900 transition-colors hover:text-amber-600">
                          {item.title}
                        </h3>
                        <div className="mx-auto mt-3 h-0.5 w-20 bg-amber-600"></div>
                        <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-gray-700">
                          {description}
                        </p>
                      </div>
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {loadingOthers && (
        <section className="mt-14 w-full px-4 text-center">
          <h2 className="text-3xl font-semibold text-gray-900 mb-3">Tin liên quan</h2>
          <p className="text-gray-500">Đang tải…</p>
        </section>
      )}
    </main>
  );
}
