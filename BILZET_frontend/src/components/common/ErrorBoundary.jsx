import React, { Component } from "react";
import Logo from "./Logo";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("BILZET Unhandled Render Error:", error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem("bilzet_access_token");
    localStorage.removeItem("bilzet_refresh_token");
    window.location.href = "/login";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#081028",
          color: "#fff",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          padding: "24px",
        }}>
          <div style={{
            maxWidth: "480px",
            width: "100%",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "32px",
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}>
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
              <Logo variant="full" theme="dark" size="lg" />
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}>
              Something interrupted your session
            </h2>
            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.5", marginBottom: "24px" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering the page."}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "#1a5cff",
                  color: "#fff",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
              >
                Refresh Page
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "10px 20px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.1)",
                  color: "#cbd5e1",
                  fontWeight: "600",
                  fontSize: "14px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                Reset &amp; Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
