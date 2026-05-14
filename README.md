# Dola Bakery — Frontend (Next.js)

Ứng dụng web cửa hàng bánh: giao diện khách hàng (site) và khu vực quản trị (admin), kết nối API Laravel trong monorepo (`../backend`).

---

## Công nghệ

| Thành phần | Phiên bản / Ghi chú |
|------------|---------------------|
| **Next.js** | 14 (App Router) |
| **React** | 18 |
| **Tailwind CSS** | 3.x + PostCSS |
| **HTTP / dữ liệu** | Axios, SWR |
| **Biểu đồ** | Chart.js, react-chartjs-2 |
| **Form / rich text** | React Quill |
| **Email (form liên hệ)** | @emailjs/browser |
| **Icon** | lucide-react |
| **Lint** | ESLint + eslint-config-next |

---

## Yêu cầu môi trường

- **Node.js** 18.x trở lên (khuyến nghị LTS)
- **npm** hoặc **pnpm** / **yarn**
- Backend Laravel chạy (mặc định `http://127.0.0.1:8000`) để gọi API và ảnh qua rewrite trong `next.config.mjs`

---

## Cài đặt và chạy local

```bash
cd frontend
npm install
```

Tạo file **`.env.local`** (không commit) nếu cần trỏ API tùy chỉnh:

```env
# URL gốc của API Laravel (dùng ở client khi fetch trực tiếp)
NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
```

Chạy dev:

```bash
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chế độ phát triển, hot reload |
| `npm run build` | Build production |
| `npm run start` | Chạy server sau khi `build` |
| `npm run lint` | Kiểm tra ESLint |

---

## Cấu trúc thư mục (tóm tắt)

```
frontend/
├── public/              # Ảnh tĩnh, favicon, asset công khai
├── src/
│   ├── app/             # App Router: layout, page, route groups (site), (admin)
│   ├── components/    # Component tái sử dụng (Header, Footer, Slider, …)
│   ├── hooks/         # Custom hooks (vd: useAuth)
│   └── lib/           # Tiện ích (vd: cart)
├── next.config.mjs    # Rewrites API/storage, cấu hình Image
├── tailwind.config.js
└── package.json
```

- **`src/app/(site)/`** — Trang khách: trang chủ, sản phẩm, giỏ, thanh toán, tin tức, chính sách, …
- **`src/app/(admin)/`** — Trang quản trị (sau đăng nhập admin).
- **`src/app/api/`** — Route handlers Next (nếu có); phần lớn dữ liệu lấy từ backend Laravel qua `NEXT_PUBLIC_API_BASE` hoặc rewrite.

---

## Tích hợp backend

- Biến **`NEXT_PUBLIC_API_BASE`**: dùng trong các component fetch (ví dụ banner, sản phẩm).
- File **`next.config.mjs`** định nghĩa **rewrites** từ `/api/*`, `/storage/*`, `/uploads/*` sang cổng Laravel mặc định `127.0.0.1:8000`. Khi deploy production, cần chỉnh `destination` hoặc dùng biến môi trường / reverse proxy (Nginx) cho khớp domain API thật.

---

## Build production

```bash
npm run build
npm run start
```

Đảm bảo `NEXT_PUBLIC_API_BASE` trỏ đúng URL API công khai trên môi trường production.

---

## Bảo mật & thực hành tốt

- Không commit **`.env`**, **`.env.local`**, khóa API hay mật khẩu.
- Ảnh từ domain ngoài phải khai báo trong `next.config.mjs` → `images.remotePatterns` nếu dùng `next/image`.

---

## Liên hệ / Tác giả

**Dương Đào Huỳnh Như**  
**Zalo:** 0933874215

---

*README được cập nhật cho mã nguồn frontend trong dự án Bakery — monorepo kèm backend Laravel.*
