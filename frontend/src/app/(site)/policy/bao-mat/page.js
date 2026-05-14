import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Chính sách bảo mật | Dola Bakery",
  description: "Chính sách bảo mật thông tin khách hàng tại Dola Bakery. Cam kết bảo vệ thông tin cá nhân của bạn.",
  alternates: { canonical: "/policy/bao-mat" },
};

export default function PrivacyPolicyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Chính sách bảo mật", item: "/policy/bao-mat" },
    ],
  };

  return (
    <main className="min-h-dvh">
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </Script>

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 h-12 flex items-center text-sm">
          <ol className="flex items-center gap-1 text-gray-600">
            <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li><Link href="/policy" className="hover:underline">Chính sách</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Bảo mật</li>
          </ol>
        </div>
      </nav>

      {/* Content */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">
                Chính sách bảo mật
              </h1>
              <p className="mt-2 text-gray-700">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>1. Thu thập thông tin</h2>
              <p>
                Chúng tôi thu thập thông tin của bạn khi bạn đăng ký tài khoản, đặt hàng, liên hệ với chúng tôi, hoặc sử dụng các dịch vụ của chúng tôi.
              </p>
              <ul>
                <li>Họ tên, địa chỉ email, số điện thoại</li>
                <li>Địa chỉ giao hàng</li>
                <li>Thông tin thanh toán (được mã hóa an toàn)</li>
                <li>Thông tin đăng nhập và tài khoản</li>
              </ul>

              <h2>2. Sử dụng thông tin</h2>
              <p>Chúng tôi sử dụng thông tin của bạn để:</p>
              <ul>
                <li>Xử lý và giao dịch đơn hàng của bạn</li>
                <li>Giao tiếp với bạn về đơn hàng, sản phẩm và dịch vụ</li>
                <li>Cải thiện dịch vụ và trải nghiệm của khách hàng</li>
                <li>Gửi thông tin khuyến mãi (với sự đồng ý của bạn)</li>
              </ul>

              <h2>3. Bảo vệ thông tin</h2>
              <p>
                Chúng tôi sử dụng các biện pháp bảo mật tiên tiến để bảo vệ thông tin cá nhân của bạn khỏi truy cập trái phép,
                sử dụng hoặc tiết lộ. Dữ liệu thanh toán được mã hóa theo tiêu chuẩn SSL/TLS.
              </p>

              <h2>4. Chia sẻ thông tin</h2>
              <p>
                Chúng tôi không bán, cho thuê hoặc chia sẻ thông tin cá nhân của bạn cho bên thứ ba,
                trừ trường hợp cần thiết để cung cấp dịch vụ (như đối tác vận chuyển, thanh toán) hoặc theo yêu cầu pháp lý.
              </p>

              <h2>5. Quyền của bạn</h2>
              <p>Bạn có quyền:</p>
              <ul>
                <li>Truy cập và chỉnh sửa thông tin cá nhân của mình</li>
                <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân</li>
                <li>Từ chối nhận email marketing</li>
                <li>Khiếu nại về việc xử lý dữ liệu</li>
              </ul>

              <h2>6. Cookies</h2>
              <p>
                Website của chúng tôi sử dụng cookies để cải thiện trải nghiệm người dùng,
                ghi nhớ sở thích và phân tích lưu lượng truy cập. Bạn có thể tắt cookies trong cài đặt trình duyệt.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">
                Liên hệ ngay
              </Link>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Thông tin liên hệ</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Địa chỉ:</strong> 70 Lữ Gia, P.15, Q.11, TP.HCM</p>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="block w-full text-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700">
                  Liên hệ tư vấn
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
