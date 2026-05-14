// src/app/(site)/cart/[id]/page.js
export const dynamic = "force-dynamic";

const API_BASE =
  (process.env.BACKEND_API || process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000")
    .replace(/\/+$/, "");

export async function generateMetadata({ params }) {
  const id = params?.id;
  return {
    title: `Đơn hàng #${id} | Dola Bakery`,
    description: `Xem chi tiết đơn hàng #${id} tại Dola Bakery.`,
    alternates: { canonical: `/cart/${id}` },
    robots: { index: false, follow: false },            // 🔒 Private page → noindex
    openGraph: {
      title: `Đơn hàng #${id} | Dola Bakery`,
      description: `Thông tin chi tiết đơn hàng #${id}`,
      url: `http://localhost:3000/cart/${id}`,
      type: "article",
    },
  };
}

export default function CartOrderDetailPage({ params }) {
  const id = params?.id;
  return (
    <main className="container mx-auto px-4 py-10" itemScope itemType="https://schema.org/Order">
      <header className="mb-6">
       
        <noscript>
          <p className="text-rose-600 mt-2">
            Trình duyệt của bạn đang tắt JavaScript. Vui lòng bật để xem chi tiết đơn hàng.
          </p>
        </noscript>
      </header>

      {/* Client: tự lấy token từ localStorage, gọi /api/v1/orders/my/{id} */}
      <OrderDetailClient id={id} apiBase={API_BASE} />

      <footer className="sr-only">
        {/* Dành cho SEO screen reader */}
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Trang chủ</a></li>
            <li><a href="/profile">Hồ sơ</a></li>
            <li aria-current="page">Đơn hàng #{id}</li>
          </ol>
        </nav>
      </footer>
    </main>
  );
}

import OrderDetailClient from "./OrderDetailClient";
