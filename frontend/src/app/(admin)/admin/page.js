"use client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  // Thống kê tổng quan
  const stats = [
    { label: "Lượt truy cập", value: "3.5K", diff: "+0.42%" },
    { label: "Tổng lợi nhuận", value: "$4.2K", diff: "+4.35%" },
    { label: "Sản phẩm hiện có", value: "3.5K", diff: "+2.95%" },
    { label: "Người dùng", value: "3.5K", diff: "-0.95%" },
  ];

  const lineData = {
    labels: ["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"],
    datasets: [
      {
        label: "Doanh thu nhận được",
        data: [20, 35, 40, 60, 70, 90, 100, 80, 60, 70, 90, 100],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.3)",
        fill: true,
      },
      {
        label: "Công nợ",
        data: [15, 25, 35, 40, 60, 70, 85, 60, 50, 60, 80, 90],
        borderColor: "#a855f7",
        backgroundColor: "rgba(168,85,247,0.3)",
        fill: true,
      },
    ],
  };

  const barData = {
    labels: ["T7", "CN", "T2", "T3", "T4", "T5", "T6"],
    datasets: [
      {
        label: "Doanh số",
        data: [40, 60, 80, 60, 50, 70, 90],
        backgroundColor: "#3b82f6",
      },
      {
        label: "Doanh thu",
        data: [50, 70, 60, 40, 80, 60, 70],
        backgroundColor: "#a855f7",
      },
    ],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Khối thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white shadow rounded p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-gray-500">{s.label}</div>
            <div
              className={`text-sm ${
                s.diff.startsWith("-") ? "text-red-500" : "text-green-600"
              }`}
            >
              {s.diff}
            </div>
          </div>
        ))}
      </div>

      {/* Biểu đồ */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Tổng quan thanh toán</h2>
          <Line data={lineData} />
        </div>
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Lợi nhuận tuần này</h2>
          <Bar data={barData} />
        </div>
      </div>

      {/* Nguồn traffic & trò chuyện */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Kênh hàng đầu</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Nguồn</th>
                <th>Khách truy cập</th>
                <th>Doanh thu</th>
                <th>Đơn hàng</th>
                <th>Tỉ lệ chuyển đổi</th>
              </tr>
            </thead>
            <tbody>
              {["Google", "X.com", "Github", "Vimeo", "Facebook"].map((src, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2">{src}</td>
                  <td>3.5K</td>
                  <td className="text-green-600">$4,220</td>
                  <td>3465</td>
                  <td>2.59%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white shadow rounded p-4">
          <h2 className="font-semibold mb-2">Tin nhắn gần đây</h2>
          <ul className="space-y-3">
            {[
              { name: "Jacob Jones", msg: "Hẹn gặp lại bạn vào ngày mai…" },
              { name: "William Smith", msg: "Cảm ơn vì đã hỗ trợ nhanh chóng" },
              { name: "Jahurul Haque", msg: "Bao giờ thì cập nhật?" },
              { name: "M. Chowdhury", msg: "Đã hiểu rồi" },
              { name: "Abagami", msg: "Chào, bạn khỏe không?" },
            ].map((c, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200" />
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-gray-500">{c.msg}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
