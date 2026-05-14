import ClientGuard from "./ClientGuard";

export const metadata = {
  title: "Bảng điều khiển Admin | Dola Bakery",
  description: "Khu vực quản trị Dola Bakery.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/admin" },
};

export default function AdminLayout({ children }) {

  return <ClientGuard>
   
    {children}
    
    </ClientGuard>;
}
