"use client";

import { useState } from "react";
import ReviewsSummary from "@/components/ReviewsSummary";
import ReviewsList from "@/components/ReviewsList";
import ReviewForm from "@/components/ReviewForm";

export default function ProductReviewsSection({ product }) {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleReviewSuccess = () => {
    setRefreshKey((k) => k + 1); // Trigger refresh
    setShowForm(false);
  };

  return (
    <section className="mt-14">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl md:text-[28px] font-serif font-bold text-amber-700">
          Đánh giá sản phẩm
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
        >
          ✏️ Viết đánh giá
        </button>
      </div>

      <ReviewsSummary key={`summary-${refreshKey}`} productId={product.id} />

      <ReviewsList
        key={`list-${refreshKey}`}
        productId={product.id}
        initialLimit={5}
        showViewAll={true}
      />

      {showForm && (
        <ReviewForm
          productId={product.id}
          productName={product.name}
          onSuccess={handleReviewSuccess}
          onClose={() => setShowForm(false)}
        />
      )}
    </section>
  );
}
