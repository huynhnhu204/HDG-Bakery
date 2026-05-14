import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Hướng dẫn mua hàng | Dola Bakery",
  description: "Hướng dẫn chi tiết cách đặt hàng và mua sắm tại Dola Bakery.",
};

export default function ShoppingGuidePage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Hướng dẫn mua hàng", item: "/policy/huong-dan-mua-hang" },
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
            <li className="text-gray-900 font-semibold">Hướng dẫn mua hàng</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Hướng dẫn mua hàng</h1>
              <p className="mt-2 text-gray-700">Các bước đặt hàng đơn giản tại Dola Bakery</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>Bước 1: Chọn sản phẩm</h2>
              <p>
                Duyệt qua danh mục sản phẩm, sử dụng bộ lọc để tìm kiếm theo danh mục, giá,
                hoặc sử dụng thanh tìm kiếm để tìm kiếm nhanh.
              </p>

              <h2>Bước 2: Xem chi tiết</h2>
              <p>
                Click vào sản phẩm để xem thông tin chi tiết, hình ảnh, mô tả và giá cả.
                Bạn có thể xem hình ảnh ở chế độ phóng to.
              </p>

              <h2>Bước 3: Thêm vào giỏ</h2>
              <p>
                Chọn số lượng mong muốn và nhấn "Thêm vào giỏ". Bạn có thể tiếp tục mua sắm
                hoặc vào giỏ hàng để xem lại.
              </p>

              <h2>Bước 4: Thanh toán</h2>
              <p>
                Kiểm tra lại đơn hàng trong giỏ, chọn phương thức thanh toán (COD, chuyển khoản),
                nhập thông tin giao hàng và xác nhận đơn hàng.
              </p>

              <h2>Bước 5: Xác nhận</h2>
              <p>
                Sau khi đặt hàng thành công, bạn sẽ nhận được email xác nhận với mã đơn hàng.
                Nhân viên của chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.
              </p>

              <h2>Lưu ý khi mua hàng</h2>
              <ul>
                <li>Kiểm tra kỹ thông tin sản phẩm trước khi thêm vào giỏ</li>
                <li>Điền đầy đủ và chính xác thông tin giao hàng</li>
                <li>Cung cấp số điện thoại liên hệ chính xác</li>
                <li>Chọn khung giờ giao hàng phù hợp với bạn</li>
              </ul>

              <h2>Hỗ trợ mua hàng</h2>
              <p>
                Nếu gặp khó khăn trong quá trình đặt hàng, vui lòng liên hệ hotline 1900 6750
                hoặc chat với chúng tôi để được hỗ trợ.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <Link href="/product" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">
                Xem sản phẩm
              </Link>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Cần hỗ trợ?</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Giờ làm việc:</strong> 8:00 - 22:00</p>
              </div>
              <div className="mt-6 grid gap-2">
                <Link href="/product" className="rounded-lg bg-amber-600 px-3 py-2 text-center font-semibold text-white hover:bg-amber-700">
                  Mua ngay
                </Link>
                <Link href="/contact" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                  Liên hệ
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
