import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../api/http";

export function useConnectionStatus() {
  const [status, setStatus] = useState("connecting"); // 'online' | 'connecting' | 'offline'
  const [lastChecked, setLastChecked] = useState(null);

  const checkConnection = async () => {
    if (!navigator.onLine) {
      setStatus("offline");
      setLastChecked(new Date());
      return;
    }

    try {
      // Check backend health endpoint
      const res = await axios.get(`${API}/health`, { timeout: 3500 });
      if (res.status === 200) {
        setStatus("online");
      } else {
        setStatus("offline");
      }
    } catch (err) {
      setStatus("offline");
    } finally {
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkConnection();

    // Check periodically every 15 seconds
    const interval = setInterval(checkConnection, 15000);

    // Listen to browser network changes
    const handleOnline = () => {
      setStatus("connecting");
      checkConnection();
    };
    const handleOffline = () => setStatus("offline");

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { status, checkConnection, lastChecked };
}

export default useConnectionStatus;
