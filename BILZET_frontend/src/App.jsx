import { useEffect } from "react";
import { useAuth } from "./store/auth";
import AppRoutes from "./routes/AppRoutes";
import { ClerkAuthSync } from "./components/auth/ClerkAuth";
import "./index.css";

import { hasClerk } from "./config/clerk";

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <>
      {hasClerk && <ClerkAuthSync />}
      <AppRoutes />
    </>
  );
}
