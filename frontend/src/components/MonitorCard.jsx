import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const MonitorCard = ({ monitor, onDelete }) => {
  const formattedHistory = monitor.priceHistory.map((h) => ({
    ...h,
    date: new Date(h.date).toLocaleDateString(),
  }));

  const prices = monitor.priceHistory.map((h) => h.price);

  const minPrice = Math.min(...prices, monitor.targetPrice);
  const maxPrice = Math.max(...prices, monitor.targetPrice);

  const yAxisDomain = [minPrice - 10, maxPrice + 10];

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl border border-gray-100 bg-opacity-90 backdrop-blur-md transform transition-all hover:scale-105 hover:shadow-3xl hover:border-indigo-200">
      {/* ---------- Header ---------- */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <a
            href={monitor.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-indigo-700 hover:text-indigo-900 hover:underline break-words transition-colors"
          >
            {monitor.url}
          </a>

          <p className="text-sm text-gray-500 mt-1">
            Alerting: {monitor.email}
          </p>
        </div>

        <button
          onClick={() => onDelete(monitor._id)}
          className="ml-4 text-gray-400 hover:text-red-500 transition-colors transform hover:scale-110"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* ---------- Price Info ---------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center border-t border-b border-gray-100 py-4">
        <div className="p-4 bg-gradient-to-b from-gray-50 to-white rounded-lg shadow-inner">
          <p className="text-sm font-medium text-gray-500">Current Price</p>
          <p className="text-2xl font-bold text-gray-800">
            ₹{monitor.currentPrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-b from-green-50 to-white rounded-lg shadow-inner">
          <p className="text-sm font-medium text-gray-500">Target Price</p>
          <p className="text-2xl font-bold text-green-600">
            ₹{monitor.targetPrice.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="p-4 bg-gradient-to-b from-gray-50 to-white rounded-lg shadow-inner">
          <p className="text-sm font-medium text-gray-500">Last Checked</p>
          <p className="text-md text-gray-600 mt-2">
            {new Date(monitor.lastChecked).toLocaleString()}
          </p>
        </div>
      </div>

      {/* ---------- Chart ---------- */}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedHistory}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

            <XAxis dataKey="date" stroke="#9ca3af" />

            <YAxis domain={yAxisDomain} stroke="#9ca3af" />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(8px)",
                border: "1px solid #e0e0e0",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
              formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
            />

            <Legend />

            <Line
              type="monotone"
              dataKey="price"
              stroke="#4f46e5"
              strokeWidth={2}
              activeDot={{ r: 8 }}
              dot={{ r: 4 }}
            />

            <ReferenceLine
              y={monitor.targetPrice}
              label={{
                value: "Target Price",
                position: "insideTopRight",
                fill: "#2f855a",
              }}
              stroke="#2f855a"
              strokeDasharray="5 5"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MonitorCard;