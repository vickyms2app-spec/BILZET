import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/auth";
import AppRoutes from "./routes/AppRoutes";
import "./index.css";
export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  );
}
