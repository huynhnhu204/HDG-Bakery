"use client";
import React from "react";
import { BadgeCheck, CreditCard, Headset, Truck } from "lucide-react";

const features = [
  {
    title: "Miễn phí vận chuyển",
    desc: "Áp dụng free ship cho đơn nội thành đủ điều kiện, từ 300 nghìn",
    icon: Truck,
  },
  {
    title: "Dễ đặt & sử dụng",
    desc: "Giao diện rõ ràng, đặt bánh trong vài phút, không cần yêu cầu",
    icon: BadgeCheck,
  },
  {
    title: "Hỗ trợ nhanh chóng",
    desc: "Hotline 09006750 phản hồi tức thì, hỗ trợ ngay",
    icon: Headset,
  },
  {
    title: "Thanh toán đa dạng",
    desc: "Tiền mặt, Chuyển khoản, Momo, VNPAY, Visa, Chuyển khoản Napas",
    icon: CreditCard,
  },
];

export default function FeatureStrip() {
  return (
    <section className="relative py-6 bg-[#faf7f2] border-y border-amber-200" aria-label="Ưu điểm nổi bật của cửa hàng">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 bg-gray-50 rounded-xl p-4 border border-amber-200 hover:bg-amber-50 transition-colors"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <f.icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 leading-tight">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed line-clamp-2">
                  {f.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}