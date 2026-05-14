"use client";

import { useEffect } from "react";

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log error
    console.error("Admin Error:", error);
  }, [error]);

  return (
    <div className="container mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-red-900 mb-2">Đã xảy ra lỗi</h2>
        <p className="text-red-700 mb-4">
          {error?.message || "Đã xảy ra lỗi không xác định"}
        </p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}


