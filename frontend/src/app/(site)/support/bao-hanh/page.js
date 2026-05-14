import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Hướng dẫn bảo hành | Dola Bakery",
  description: "Chính sách và hướng dẫn bảo hành sản phẩm tại Dola Bakery.",
};

export default function WarrantyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Hướng dẫn bảo hành", item: "/support/bao-hanh" },
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
            <li><Link href="/support" className="hover:underline">Hỗ trợ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Bảo hành</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Hướng dẫn bảo hành</h1>
              <p className="mt-2 text-gray-700">Chính sách bảo hành sản phẩm tại Dola Bakery</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>Chính sách bảo hành</h2>
              <p>
                Chúng tôi cam kết chất lượng sản phẩm và chính sách bảo hành như sau:
              </p>
              <ul>
                <li>Bảo hành chất lượng trong vòng 24 giờ từ khi nhận hàng</li>
                <li>Hoàn tiền 100% nếu sản phẩm không đúng chất lượng đã cam kết</li>
                <li>Đổi hàng mới nếu sản phẩm có lỗi</li>
              </ul>

              <h2>Điều kiện bảo hành</h2>
              <p>Để được bảo hành, bạn cần:</p>
              <ul>
                <li>Có hóa đơn mua hàng hoặc mã đơn hàng</li>
                <li>Sản phẩm còn nguyên vẹn, chưa sử dụng hoặc chỉ sử dụng với lý do kiểm tra chất lượng</li>
                <li>Liên hệ trong vòng 24 giờ kể từ khi nhận hàng</li>
                <li>Sản phẩm bị lỗi không do sử dụng sai mục đích</li>
              </ul>

              <h2>Quy trình bảo hành</h2>
              <ol>
                <li><strong>Liên hệ:</strong> Gọi 1900 6750 hoặc gửi email đến heyzun@support.vn</li>
                <li><strong>Cung cấp thông tin:</strong> Mã đơn hàng, ảnh sản phẩm, mô tả vấn đề</li>
                <li><strong>Xác nhận:</strong> Chúng tôi sẽ xác nhận và đề xuất phương án giải quyết</li>
                <li><strong>Xử lý:</strong> Đổi hàng mới hoặc hoàn tiền theo cam kết</li>
              </ol>

              <h2>Không thuộc bảo hành</h2>
              <p>Các trường hợp không được bảo hành:</p>
              <ul>
                <li>Sản phẩm đã sử dụng hoàn toàn</li>
                <li>Hư hỏng do người dùng</li>
                <li>Không có hóa đơn</li>
                <li>Quá thời gian 24 giờ</li>
                <li>Sản phẩm đã bị thay đổi hoặc sửa chữa</li>
              </ul>

              <h2>Cam kết chất lượng</h2>
              <p>
                Dola Bakery luôn đặt chất lượng lên hàng đầu. Tất cả sản phẩm được làm từ nguyên liệu
                tươi ngon, không chất bảo quản, đảm bảo an toàn vệ sinh thực phẩm.
              </p>
            </div>

            <div className="mt-8 flex gap-3">
              <Link href="/support/khieu-nai" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">
                Gửi yêu cầu bảo hành
              </Link>
              <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 hover:bg-gray-50">
                Liên hệ
              </Link>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Cần hỗ trợ?</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Thời gian:</strong> 24/7</p>
              </div>
              <div className="mt-6">
                <Link href="/support/chat" className="block w-full text-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700">
                  💬 Chat
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}


