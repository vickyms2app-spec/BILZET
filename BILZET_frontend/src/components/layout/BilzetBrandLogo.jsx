import React from "react";
import Logo from "../common/Logo";

/**
 * Drop-in backward compatibility wrapper for BilzetBrandLogo
 */
export default function BilzetBrandLogo({ collapsed = false, theme = "dark", size = "md", className = "" }) {
  return <Logo collapsed={collapsed} theme={theme} size={size} className={className} />;
}
