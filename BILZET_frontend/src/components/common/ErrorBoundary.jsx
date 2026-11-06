import React, { Component } from "react";
import Logo from "./Logo";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("BILZET Unhandled Render Error:", error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem("bilzet_access_token");
      localStorage.removeItem("bilzet_refresh_token");
      localStorage.removeItem("token");
      sessionStorage.removeItem("bilzet_skip_clerk");
    } catch (_) {}
    window.location.href = "/sign-in";
  };

  handleRetry = () => {
    try {
      sessionStorage.removeItem("bilzet_skip_clerk");
    } catch (_) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const errMsg = String(this.state.error?.message || "");
      const isActualOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      const isClerkAuthIssue =
        errMsg.includes("Clerk") ||
        errMsg.includes("clerk") ||
        errMsg.includes("publishableKey") ||
        errMsg.includes("failed_to_load_clerk");

      const title = isActualOffline
        ? "Network Connection Offline"
        : isClerkAuthIssue
        ? "Authentication Service Unavailable"
        : "Something interrupted your session";

      const description = isActualOffline
        ? "Your browser appears to be offline. Please check your internet connection and try again."
        : isClerkAuthIssue
        ? "Unable to establish a secure connection with Clerk authentication services. Please verify your connection or try again."
        : (this.state.error?.message || "An unexpected error occurred while rendering the page.");

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#081028",
            color: "#fff",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(16px)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "center" }}>
              <Logo variant="full" theme="dark" size="lg" />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px", color: "#f8fafc" }}>
              {title}
            </h2>

            <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.5", marginBottom: "20px" }}>
              {description}
            </p>

            {/* Diagnostic error detail accordion */}
            {errMsg && (
              <div style={{ marginBottom: "20px", textAlign: "left" }}>
                <button
                  type="button"
                  onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#38bdf8",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                    textDecoration: "underline",
                  }}
                >
                  {this.state.showDetails ? "Hide technical details ▲" : "View technical details ▼"}
                </button>
                {this.state.showDetails && (
                  <pre
                    style={{
                      marginTop: "8px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "11px",
                      color: "#fca5a5",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {errMsg}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  padding: "10px 22px",
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
                Retry Connection
              </button>
              <button
                type="button"
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
                Sign In
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
