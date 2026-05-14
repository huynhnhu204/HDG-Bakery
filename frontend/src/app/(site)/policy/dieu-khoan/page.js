import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Điều khoản sử dụng | Dola Bakery",
  description: "Điều khoản và điều kiện sử dụng dịch vụ tại Dola Bakery.",
};

export default function TermsPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Điều khoản sử dụng", item: "/policy/dieu-khoan" },
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
            <li><Link href="/policy" className="hover:underline">Chính sách</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Điều khoản</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Điều khoản sử dụng</h1>
              <p className="mt-2 text-gray-700">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>1. Chấp nhận điều khoản</h2>
              <p>
                Bằng việc truy cập và sử dụng website của chúng tôi, bạn đồng ý tuân thủ và bị ràng buộc bởi các điều khoản
                và điều kiện sử dụng sau đây.
              </p>

              <h2>2. Điều kiện sử dụng</h2>
              <p>Bạn đồng ý sử dụng website này chỉ cho mục đích hợp pháp:</p>
              <ul>
                <li>Không sử dụng website cho bất kỳ mục đích bất hợp pháp</li>
                <li>Không vi phạm quyền sở hữu trí tuệ của người khác</li>
                <li>Không truyền tải vi-rút, mã độc hoặc các thành phần có hại</li>
                <li>Không cố gắng truy cập trái phép vào hệ thống</li>
              </ul>

              <h2>3. Tài khoản người dùng</h2>
              <p>Khi đăng ký tài khoản, bạn có trách nhiệm:</p>
              <ul>
                <li>Cung cấp thông tin chính xác, đầy đủ và cập nhật</li>
                <li>Bảo mật thông tin đăng nhập và chịu trách nhiệm về mọi hoạt động trên tài khoản</li>
                <li>Thông báo ngay lập tức nếu phát hiện việc sử dụng trái phép</li>
              </ul>

              <h2>4. Sở hữu trí tuệ</h2>
              <p>
                Tất cả nội dung trên website này là tài sản của chúng tôi hoặc các nhà cung cấp nội dung.
                Việc sử dụng trái phép có thể bị truy tố theo pháp luật.
              </p>

              <h2>5. Đơn hàng và thanh toán</h2>
              <ul>
                <li>Giá sản phẩm có thể thay đổi mà không cần thông báo trước</li>
                <li>Chúng tôi có quyền từ chối hoặc hủy đơn hàng bất kỳ</li>
                <li>Thanh toán phải được hoàn tất trước khi giao hàng (trừ COD)</li>
              </ul>

              <h2>6. Miễn trừ trách nhiệm</h2>
              <p>
                Chúng tôi không đảm bảo rằng website sẽ hoạt động liên tục. Chúng tôi không chịu trách nhiệm về
                bất kỳ thiệt hại nào phát sinh từ việc sử dụng website.
              </p>

              <h2>7. Luật áp dụng</h2>
              <p>Các điều khoản này được điều chỉnh bởi pháp luật Việt Nam.</p>
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
