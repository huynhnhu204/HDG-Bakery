import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Trung tâm hỗ trợ | Dola Bakery",
  description: "Trung tâm hỗ trợ khách hàng 24/7 tại Dola Bakery.",
};

export default function SupportCenterPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Trung tâm hỗ trợ", item: "/support/ho-tro" },
    ],
  };

  return (
    <main className="min-h-dvh">
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </Script>

      <nav aria-label="Breadcrumb" className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 h-12 flex items-center text-sm">
          <ol className="flex items-center gap-1 text-gray-600">
            <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Trung tâm hỗ trợ</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Trung tâm hỗ trợ</h1>
              <p className="mt-2 text-gray-700">
                Chúng tôi luôn sẵn sàng hỗ trợ bạn mọi lúc, mọi nơi
              </p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>Liên hệ với chúng tôi</h2>
              <p>
                Dola Bakery luôn sẵn sàng hỗ trợ khách hàng với nhiều kênh liên hệ khác nhau:
              </p>
              <ul>
                <li><strong>Hotline:</strong> 1900 6750 (miễn phí)</li>
                <li><strong>Email:</strong> heyzun@support.vn</li>
                <li><strong>Chat trực tuyến:</strong> 24/7 trên website</li>
                <li><strong>Địa chỉ:</strong> 70 Lữ Gia, P.15, Q.11, TP.HCM</li>
              </ul>

              <h2>Giờ làm việc</h2>
              <p>
                Chúng tôi phục vụ khách hàng <strong>tất cả các ngày trong tuần</strong>:
              </p>
              <ul>
                <li><strong>Từ 8:00 - 22:00:</strong> Trực tuyến (hotline, chat, email)</li>
                <li><strong>Từ 8:00 - 18:00:</strong> Tại cửa hàng</li>
              </ul>

              <h2>Dịch vụ hỗ trợ</h2>
              <div className="grid md:grid-cols-2 gap-4 mt-6">
                <div className="p-4 bg-white border rounded-xl">
                  <h3 className="font-bold text-lg mb-2">📞 Tư vấn đặt hàng</h3>
                  <p className="text-sm text-gray-700">
                    Tư vấn chi tiết về sản phẩm, giúp bạn chọn bánh phù hợp nhất
                  </p>
                </div>
                <div className="p-4 bg-white border rounded-xl">
                  <h3 className="font-bold text-lg mb-2">🚚 Theo dõi đơn hàng</h3>
                  <p className="text-sm text-gray-700">
                    Cập nhật tình trạng đơn hàng và thời gian giao hàng
                  </p>
                </div>
                <div className="p-4 bg-white border rounded-xl">
                  <h3 className="font-bold text-lg mb-2">🔄 Đổi trả/Refund</h3>
                  <p className="text-sm text-gray-700">
                    Xử lý yêu cầu đổi trả, hoàn tiền nhanh chóng, đơn giản
                  </p>
                </div>
                <div className="p-4 bg-white border rounded-xl">
                  <h3 className="font-bold text-lg mb-2">⚙️ Sửa chữa & Bảo hành</h3>
                  <p className="text-sm text-gray-700">
                    Hỗ trợ kỹ thuật, bảo hành sản phẩm theo chính sách
                  </p>
                </div>
              </div>

              <h2>Cam kết của chúng tôi</h2>
              <ul>
                <li>Phản hồi nhanh trong vòng 15 phút</li>
                <li>Giải quyết 100% thắc mắc của khách hàng</li>
                <li>Đội ngũ nhân viên tận tâm, chuyên nghiệp</li>
                <li>Chất lượng phục vụ luôn được đặt lên hàng đầu</li>
              </ul>
            </div>

            <div className="mt-8 flex gap-3">
              <Link href="/support/chat" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">
                💬 Chat với chúng tôi
              </Link>
              <Link href="tel:19006750" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 hover:bg-gray-50">
                📞 Gọi ngay: 1900 6750
              </Link>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Kênh hỗ trợ</h3>
              <div className="space-y-3">
                <a href="tel:19006750" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition">
                  <span className="text-2xl">📞</span>
                  <div className="text-sm">
                    <div className="font-semibold">Hotline</div>
                    <div className="text-gray-600">1900 6750</div>
                  </div>
                </a>
                <a href="mailto:heyzun@support.vn" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                  <span className="text-2xl">✉️</span>
                  <div className="text-sm">
                    <div className="font-semibold">Email</div>
                    <div className="text-gray-600 text-xs">heyzun@support.vn</div>
                  </div>
                </a>
                <Link href="/support/chat" className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition">
                  <span className="text-2xl">💬</span>
                  <div className="text-sm">
                    <div className="font-semibold">Chat trực tuyến</div>
                    <div className="text-gray-600">24/7</div>
                  </div>
                </Link>
              </div>
              <div className="mt-6">
                <Link href="/support/faq" className="block w-full text-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  📚 Câu hỏi thường gặp
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}


