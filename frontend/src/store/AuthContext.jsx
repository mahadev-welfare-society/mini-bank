import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Set a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 10000); // 10 second timeout

    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Verify token and get user profile
      api
        .post("/auth/profile/get", {})
        .then((response) => {
          if (response.data.success) {
            setUser(response.data.data);
          } else {
            localStorage.removeItem("token");
            delete api.defaults.headers.common["Authorization"];
          }
        })
        .catch((error) => {
          localStorage.removeItem("token");
          delete api.defaults.headers.common["Authorization"];
          // Force redirect to login if there's a network error
          if (
            error.code === "ERR_NETWORK" ||
            error.message.includes("Network Error")
          ) {
            window.location.href = "/login";
          }
        })
        .finally(() => {
          clearTimeout(timeout);
          setLoading(false);
        });
    } else {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post("/auth/login", { email, password });

      if (response.data.success) {
        const { access_token, user: userData } = response.data.data;
        localStorage.setItem("token", access_token);
        api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const value = {
    user,
    setUser,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
