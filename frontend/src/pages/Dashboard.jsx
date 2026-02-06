import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import io from "socket.io-client";

import { API_URL, SOCKET_URL } from "../config/api";
import ChartIcon from "../components/icons/ChartIcon";
import MonitorCard from "../components/MonitorCard";

const DashboardPage = ({ logout }) => {
  const [monitors, setMonitors] = useState([]);
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchMonitors = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/monitors`);
      setMonitors(res.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
      setError("Failed to fetch monitors");
    }
  }, [logout]);

  useEffect(() => {
    fetchMonitors();
  }, [fetchMonitors]);

  // ----- WebSocket -----
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      socket.emit("registerUser", token);
    });

    socket.on("priceUpdate", (updatedMonitor) => {
      setMonitors((prev) =>
        prev.map((m) => (m._id === updatedMonitor._id ? updatedMonitor : m))
      );
    });

    return () => socket.disconnect();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await axios.post(`${API_URL}/monitors`, {
        url,
        email,
        targetPrice: parseFloat(targetPrice),
      });

      setUrl("");
      setEmail("");
      setTargetPrice("");
      fetchMonitors();
    } catch {
      setError("Failed to add monitor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/monitors/${id}`);
      fetchMonitors();
    } catch {
      setError("Failed to delete monitor");
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center">
          <ChartIcon />
          <h1 className="text-3xl font-bold text-gray-800">Price Monitor</h1>
        </div>

        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg"
        >
          Logout
        </button>
      </header>

      {/* Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Form */}
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h2 className="text-xl font-semibold mb-4">Add New Product</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="url"
              placeholder="Product URL"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            <input
              type="email"
              placeholder="Alert Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            <input
              type="number"
              placeholder="Target Price"
              required
              step="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-2 rounded-md disabled:bg-gray-400"
            >
              {isLoading ? "Adding..." : "Add Monitor"}
            </button>
          </form>
        </div>

        {/* Monitor List */}
        <div className="lg:col-span-2 space-y-6">
          {monitors.length === 0 ? (
            <div className="bg-white p-8 rounded-xl shadow text-center">
              No monitors added yet.
            </div>
          ) : (
            monitors.map((monitor) => (
              <MonitorCard
                key={monitor._id}
                monitor={monitor}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;