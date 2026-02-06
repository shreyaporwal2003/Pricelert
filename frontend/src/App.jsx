import { useState, useEffect } from "react";

import ThreeBackground from "./components/ThreeBackground";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/Dashboard";
import setAuthToken from "./utils/setAuthToken";

const App = () => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      setToken(storedToken);
      setAuthToken(storedToken);
      setIsAuthenticated(true);
    }

    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthToken(null);
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-indigo-100 to-purple-200">
      <ThreeBackground />

      <div className="relative z-10">
        {isAuthenticated ? (
          <DashboardPage logout={logout} />
        ) : (
          <AuthPage
            setToken={setToken}
            setIsAuthenticated={setIsAuthenticated}
          />
        )}
      </div>
    </div>
  );
};

export default App;