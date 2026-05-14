import CheckoutClient from "@/components/CheckoutClient";

export const metadata = {
  title: "Thanh toán | Dola Bakery",
  description: "Điền thông tin giao hàng và thanh toán.",
};

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-extrabold text-gray-900 md:text-5xl">Thanh toán</h1>
          <p className="text-gray-600">Hoàn tất đơn hàng của bạn</p>
        </div>
        <CheckoutClient />
      </div>
    </main>
  );
}
