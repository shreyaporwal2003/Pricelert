import { useState } from "react";
import axios from "axios";

import AuthIcon from "../components/icons/AuthIcon";
import { API_URL } from "../config/api";
import setAuthToken from "../utils/setAuthToken";

const AuthPage = ({ setToken, setIsAuthenticated }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = isLogin ? "/auth/login" : "/auth/register";

    try {
      const res = await axios.post(API_URL + endpoint, { email, password });

      const { token } = res.data;

      localStorage.setItem("token", token);
      setToken(token);
      setAuthToken(token);
      setIsAuthenticated(true);
    } catch (err) {
      setError(
        err.response?.data?.msg ||
          err.response?.data?.message ||
          "Authentication failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full transform transition-all hover:scale-105">
        <div className="bg-white p-8 rounded-2xl shadow-2xl border border-gray-100 bg-opacity-90 backdrop-blur-md">
          <div className="flex justify-center">
            <AuthIcon />
          </div>

          <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
            {isLogin ? "Welcome Back!" : "Create Account"}
          </h2>

          <p className="text-center text-gray-500 mb-8">
            {isLogin ? "Sign in to continue" : "Get started with your account"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg shadow-lg disabled:bg-gray-400"
            >
              {isLoading ? "Processing..." : isLogin ? "Login" : "Register"}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isLogin
              ? "Need an account? Register"
              : "Already have an account? Login"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;