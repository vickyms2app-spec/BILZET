import { BrowserRouter } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "./store/auth";
import AppRoutes from "./routes/AppRoutes";
import { ClerkAuthSync } from "./components/auth/ClerkAuth";
import "./index.css";

const hasClerk = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {hasClerk && <ClerkAuthSync />}
      <AppRoutes />
    </BrowserRouter>
  );
}
