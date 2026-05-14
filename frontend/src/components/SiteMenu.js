"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const API_V1 =
  (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000") // ⚠️ đồng nhất với localhost
    .replace(/\/+$/, "") + "/api/v1";

/* ==== Palette ==== */
const COLORS = {
  text: "text-white/90",
  textSub: "text-white/80",
  hover: "hover:text-amber-300",
  panelBg: "bg-black/80",
  border: "border-white/10",
  itemHover: "hover:bg-white/10",
  divider: "border-white/10",
  ctaBtn: "bg-white/10 hover:bg-white/15 text-white",
};

/* ==== Fallback nếu API rỗng/lỗi ==== */
const FALLBACK_TREE = [
  { id: "home", name: "Trang chủ", link: "/" },
  {
    id: "sanpham",
    name: "Sản phẩm",
    link: "/products",
    children: [
      {
        id: "banhngot",
        name: "Bánh ngọt",
        link: "/category/banh-ngot",
        children: [
          { id: "bonglan", name: "Bông lan", link: "/category/bong-lan" },
          { id: "cupcake", name: "Cupcake", link: "/category/cupcake" },
        ],
      },
      {
        id: "banhmi",
        name: "Bánh mì",
        link: "/category/banh-mi",
        children: [
          { id: "banhmi-meat", name: "Nhân mặn", link: "/category/banh-mi-nhan-man" },
          { id: "banhmi-sweet", name: "Nhân ngọt", link: "/category/banh-mi-nhan-ngot" },
        ],
      },
    ],
  },
  { id: "news", name: "Tin tức", link: "/news" },
  { id: "contact", name: "Liên hệ", link: "/contact" },
];

/* ==== Chuẩn hoá payload nhiều kiểu: array | {data} | {tree} | {pos: []} ==== */
function normalizeMenuPayload(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.tree)) return payload.tree;
  if (typeof payload === "object") {
    const keys = Object.keys(payload);
    if (keys.length) {
      const first = payload[keys[0]];
      if (Array.isArray(first)) return first;
    }
  }
  return [];
}

function MegaDropdown({ node }) {
  if (!node?.children?.length) {
    return (
      <Link
        href={node.link || "/"}
        className={`${COLORS.text} ${COLORS.hover} font-semibold whitespace-nowrap`}
      >
        {node.name}
      </Link>
    );
  }

  // Chia children thành 2 nhóm: 3 đầu tiên và phần còn lại
  const firstThree = node.children.slice(0, 3);
  const remaining = node.children.slice(3);

  // Component render một menu con
  const renderMenuCol = (col) => (
    <div key={col.id} className="min-w-[200px]">
      <Link
        href={col.link || "#"}
        className={`mb-1.5 block text-base font-bold text-white ${COLORS.hover} whitespace-nowrap`}
      >
        {col.name}
      </Link>

      {col.children?.length ? (
        <ul className="space-y-1">
          {col.children.map((g) => (
            <li key={g.id}>
              <Link
                href={g.link || "#"}
                className={`${COLORS.textSub} ${COLORS.hover} block rounded-lg px-2 py-1 ${COLORS.itemHover}`}
              >
                {g.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );

  return (
    <div className="relative group">
      {/* trigger */}
      <button
        type="button"
        className={`${COLORS.text} ${COLORS.hover} font-semibold whitespace-nowrap`}
      >
        {node.name}
      </button>

      {/* panel */}
      <div
        className="
          pointer-events-none opacity-0 translate-y-2
          group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto
          transition duration-200 ease-out
          absolute left-1/2 top-full -translate-x-1/2
          z-[70]
        "
      >
        <div
          className={`
            w-auto max-w-[92vw] min-w-[240px]
            rounded-xl border ${COLORS.border} ${COLORS.panelBg} backdrop-blur
            p-3 shadow-2xl
          `}
          style={{ WebkitBackdropFilter: "blur(8px)" }}
        >
          {/* Hàng đầu: 3 menu con đầu tiên */}
          <div className="grid grid-flow-col auto-cols-[minmax(200px,auto)] gap-4">
            {firstThree.map(renderMenuCol)}
          </div>

          {/* Hàng thứ 2: Các menu từ mục thứ 4 trở đi */}
          {remaining.length > 0 && (
            <div className="grid grid-flow-col auto-cols-[minmax(200px,auto)] gap-4 mt-3">
              {remaining.map(renderMenuCol)}
            </div>
          )}

          <div className={`mt-3 border-t ${COLORS.divider} pt-2`}>
            <Link
              href={node.link || "#"}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${COLORS.ctaBtn}`}
            >
              Tất cả {node.name}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 5l7 7-7 7M20 12H4" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ variant }) {
  if (variant === "footer") {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="h-4 w-28 bg-white/20 rounded mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-3 w-40 bg-white/10 rounded" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <ul className="flex gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="h-4 w-20 bg-white/20 rounded" />
        ))}
      </ul>
    );
  }

  // header
  return (
    <nav>
      <ul className="flex items-center gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="h-4 w-20 bg-white/20 rounded" />
        ))}
      </ul>
    </nav>
  );
}

export default function SiteMenu({
  position = "mainmenu",
  variant = "header",
  className = "",
  useFallback = true,
}) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const didMount = useRef(false);
  const bcRef = useRef(null);

  async function loadTree() {
    try {
      setLoading(true);
      setErr("");
      const url = `${API_V1}/menus/tree?position=${encodeURIComponent(position)}&status=1&_=${Date.now()}`;
      const res = await fetch(url, { cache: "no-store" });
      let data;
      try { data = await res.json(); } catch { data = null; }
      const normalized = normalizeMenuPayload(data);

      if (Array.isArray(normalized) && normalized.length) {
        setTree(normalized);
      } else {
        if (useFallback && !didMount.current) setTree(FALLBACK_TREE);
        else setTree([]);
      }
    } catch (e) {
      setErr(e?.message || "Lỗi tải menu");
      if (useFallback && !didMount.current) setTree(FALLBACK_TREE);
    } finally {
      setLoading(false);
      didMount.current = true;
    }
  }

  useEffect(() => {
    let alive = true;

    loadTree();

    // 👂 nghe sự kiện cập nhật menu từ admin FE (trong cùng tab)
    const onMenusUpdated = () => alive && loadTree();
    window.addEventListener("menus-updated", onMenusUpdated);

    // 👂 BroadcastChannel để nhận signal xuyên tab
    try {
      bcRef.current = new BroadcastChannel("menus");
      const onMsg = (ev) => {
        if (ev?.data === "updated" && alive) loadTree();
      };
      bcRef.current.addEventListener("message", onMsg);
      // lưu cleanup
      bcRef.current.__onMsg = onMsg;
    } catch {}

    // ♻️ khi tab quay lại, refetch
    const onVis = () => {
      if (document.visibilityState === "visible") loadTree();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      window.removeEventListener("menus-updated", onMenusUpdated);
      document.removeEventListener("visibilitychange", onVis);
      if (bcRef.current) {
        bcRef.current.removeEventListener("message", bcRef.current.__onMsg);
        bcRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, useFallback]);

  if (loading) return <Skeleton variant={variant} />;

  // Nếu vẫn rỗng, hiển thị fallback nhỏ gọn để không “mất menu”
  if (!tree.length) {
    return (
      <nav className={className}>
        <ul className="flex items-center gap-8">
          <li>
            <Link href="/" className={`${COLORS.text} ${COLORS.hover} font-semibold`}>Trang chủ</Link>
          </li>
          <li>
            <Link href="/products" className={`${COLORS.text} ${COLORS.hover} font-semibold`}>Sản phẩm</Link>
          </li>
          <li>
            <Link href="/news" className={`${COLORS.text} ${COLORS.hover} font-semibold`}>Tin tức</Link>
          </li>
          <li>
            <Link href="/contact" className={`${COLORS.text} ${COLORS.hover} font-semibold`}>Liên hệ</Link>
          </li>
        </ul>
        {err ? <p className="mt-2 text-xs text-white/60">Lỗi tải menu: {err}</p> : null}
      </nav>
    );
  }

  if (variant === "footer") {
    return (
      <div className={className}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tree.map((n) => (
            <div key={n.id}>
              <div className="font-semibold mb-2 text-white">{n.name}</div>
              {n.children?.length ? (
                <ul className="space-y-1 text-sm">
                  {n.children.map((c) => (
                    <li key={c.id}>
                      <Link href={c.link || "#"} className="text-white/80 hover:text-white">
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Link href={n.link || "#"} className="text-white/80 hover:text-white text-sm">
                  {n.link ? "Xem" : n.name}
                </Link>
              )}
            </div>
          ))}
        </div>
        {err ? <p className="mt-3 text-xs text-white/60">Lỗi tải menu: {err}</p> : null}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <ul className={className}>
        {tree.map((n) => (
          <li key={n.id}>
            <Link href={n.link || "#"} className="text-white/90 hover:text-amber-300">
              {n.name}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  // header (mega) — ❌ đã bỏ .slice(0, 8) để không cắt mất item mới
  return (
    <nav className={className}>
      <ul className="flex items-center gap-8 overflow-visible">
        {tree.map((n) => (
          <li key={n.id} className="relative">
            {n.children?.length ? (
              <MegaDropdown node={n} />
            ) : (
              <Link
                href={n.link || "/"}
                className={`${COLORS.text} ${COLORS.hover} font-semibold whitespace-nowrap`}
              >
                {n.name}
              </Link>
            )}
          </li>
        ))}
      </ul>
      {err ? <p className="mt-2 text-xs text-white/60">Lỗi tải menu: {err}</p> : null}
    </nav>
  );
}
