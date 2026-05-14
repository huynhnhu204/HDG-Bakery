"use client";

import { useState } from "react";
import FavoriteButton from "@/components/FavoriteButton";
import Toast from "@/components/Toast";

/**
 * Client wrapper cho trang product để quản lý toast và favorite button
 */
export function ProductFavoriteButton({ productId, className }) {
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  return (
    <>
      <FavoriteButton
        productId={productId}
        className={className}
        showToast={showToast}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
