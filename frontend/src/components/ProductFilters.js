// "use client";

// import { useSearchParams } from "next/navigation";
// import { useEffect, useState } from "react";

// /**
//  * props:
//  * - categories: [{slug, label}]
//  * - facetCounts: { [slug]: number }
//  */
// export default function ProductFilters({ categories, facetCounts }) {
//   const sp = useSearchParams();

//   const [q, setQ] = useState(sp.get("q") ?? "");
//   const [category, setCategory] = useState(sp.get("category") ?? "");
//   const [pmin, setPmin] = useState(sp.get("pmin") ?? "");
//   const [pmax, setPmax] = useState(sp.get("pmax") ?? "");

//   // Sync state with URL search params on back/forward navigation
//   useEffect(() => {
//     setQ(sp.get("q") ?? "");
//     setCategory(sp.get("category") ?? "");
//     setPmin(sp.get("pmin") ?? "");
//     setPmax(sp.get("pmax") ?? "");
//   }, [sp]);

//   const onSubmit = (e) => {
//     e.preventDefault();
//     const usp = new URLSearchParams();
//     if (q) usp.set("q", q);
//     if (category) usp.set("category", category);
//     if (pmin) usp.set("pmin", pmin);
//     if (pmax) usp.set("pmax", pmax);
//     usp.set("page", "1"); // Reset to page 1 when filters change
//     window.location.search = usp.toString();
//   };

//   const onClear = () => (window.location.href = "/product");

//   return (
//     <form
//       onSubmit={onSubmit}
//       className="mb-8 grid gap-4 sm:grid-cols-2 md:grid-cols-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200"
//       aria-label="Bộ lọc sản phẩm bánh ngọt"
//     >
//       <div className="sm:col-span-2">
//         <label
//           htmlFor="search"
//           className="block text-sm font-medium text-gray-700 mb-1"
//         >
//           Tìm kiếm bánh
//         </label>
//         <input
//           id="search"
//           data-testid="filter-search"
//           value={q}
//           onChange={(e) => setQ(e.target.value)}
//           placeholder="Tìm bánh ngọt, mã sản phẩm..."
//           className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
//           aria-describedby="search-description"
//         />
//         <span id="search-description" className="sr-only">
//           Nhập tên hoặc mã sản phẩm để tìm kiếm bánh ngọt
//         </span>
//       </div>

//       <div>
//         <label
//           htmlFor="category"
//           className="block text-sm font-medium text-gray-700 mb-1"
//         >
//           Danh mục
//         </label>
//         <select
//           id="category"
//           data-testid="filter-category"
//           value={category}
//           onChange={(e) => setCategory(e.target.value)}
//           className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
//           aria-describedby="category-description"
//         >
//           <option value="">Tất cả danh mục</option>
//           {categories.map((c) => (
//             <option key={c.slug} value={c.slug}>
//               {c.label}{" "}
//               {typeof facetCounts?.[c.slug] === "number"
//                 ? `(${facetCounts[c.slug]})`
//                 : ""}
//             </option>
//           ))}
//         </select>
//         <span id="category-description" className="sr-only">
//           Chọn danh mục bánh như bánh ngọt, bánh mì, hoặc bánh quy
//         </span>
//       </div>

//       <div>
//         <label
//           htmlFor="pmin"
//           className="block text-sm font-medium text-gray-700 mb-1"
//         >
//           Giá từ
//         </label>
//         <input
//           id="pmin"
//           data-testid="filter-pmin"
//           type="number"
//           min={0}
//           value={pmin}
//           onChange={(e) => setPmin(e.target.value)}
//           placeholder="VD: 50,000"
//           className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
//           aria-describedby="pmin-description"
//         />
//         <span id="pmin-description" className="sr-only">
//           Nhập giá tối thiểu để lọc sản phẩm
//         </span>
//       </div>

//       <div>
//         <label
//           htmlFor="pmax"
//           className="block text-sm font-medium text-gray-700 mb-1"
//         >
//           Giá đến
//         </label>
//         <input
//           id="pmax"
//           data-testid="filter-pmax"
//           type="number"
//           min={0}
//           value={pmax}
//           onChange={(e) => setPmax(e.target.value)}
//           placeholder="VD: 300,000"
//           className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
//           aria-describedby="pmax-description"
//         />
//         <span id="pmax-description" className="sr-only">
//           Nhập giá tối đa để lọc sản phẩm
//         </span>
//       </div>

//       <div className="sm:col-span-2 md:col-span-4 flex items-center gap-3">
//         <button
//           type="submit"
//           data-testid="filter-submit"
//           className="rounded-lg bg-orange-600 px-5 py-2.5 text-white font-semibold hover:bg-orange-700 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
//         >
//           Lọc bánh
//         </button>
//         <button
//           type="button"
//           data-testid="filter-clear"
//           onClick={onClear}
//           className="rounded-lg border border-gray-300 px-5 py-2.5 text-gray-700 font-medium hover:bg-gray-50 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors duration-200"
//         >
//           Xóa bộ lọc
//         </button>
//       </div>
//     </form>
//   );
// }dola-bakery/src/components/ProductFilters.js