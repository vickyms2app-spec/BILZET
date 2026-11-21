/**
 * BILZET PDF & Canvas Color Compatibility Utility
 * 
 * Resolves the "Attempting to parse an unsupported color function 'oklch'" error
 * when exporting invoices and quotations to PDF or sharing via WhatsApp.
 * 
 * Works seamlessly with Tailwind CSS v4 modern color functions (oklch, oklab, lab, lch)
 * by converting them to mathematically exact standard sRGB / HEX values using the browser's
 * native 2D Canvas Color management engine.
 */

let cachedCanvasCtx = null;
function getCanvasContext() {
  if (!cachedCanvasCtx && typeof document !== "undefined") {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      cachedCanvasCtx = canvas.getContext("2d", { willReadFrequently: true });
    } catch (_) {}
  }
  return cachedCanvasCtx;
}

const colorCache = new Map();

/**
 * Converts any modern CSS color (oklch, oklab, lab, lch, color-mix) to standard sRGB hex/rgba.
 * Relies on the browser engine's native color space conversion for 100% visual fidelity.
 */
export function convertToRgbColor(colorStr) {
  if (!colorStr || typeof colorStr !== "string") return colorStr;
  const trimmed = colorStr.trim();
  
  // Fast path: if color is already hex, standard rgb/rgba, or standard named color
  if (
    !trimmed.includes("oklch") &&
    !trimmed.includes("oklab") &&
    !trimmed.includes("color(") &&
    !trimmed.includes("lab(") &&
    !trimmed.includes("lch(") &&
    !trimmed.includes("color-mix(")
  ) {
    return colorStr;
  }

  if (colorCache.has(trimmed)) {
    return colorCache.get(trimmed);
  }

  try {
    const ctx = getCanvasContext();
    if (!ctx) return colorStr;
    ctx.fillStyle = "#000000"; // Reset fallback
    ctx.fillStyle = trimmed;
    const computed = ctx.fillStyle;
    colorCache.set(trimmed, computed);
    return computed;
  } catch (_) {
    return colorStr;
  }
}

/**
 * Replaces modern color functions in complex CSS values (e.g., box-shadows, gradients, borders).
 */
export function sanitizeCssValue(value) {
  if (!value || typeof value !== "string") return value;
  if (
    !value.includes("oklch") &&
    !value.includes("oklab") &&
    !value.includes("color(") &&
    !value.includes("lab(") &&
    !value.includes("lch(") &&
    !value.includes("color-mix(")
  ) {
    return value;
  }

  // Matches oklch(...), oklab(...), lab(...), lch(...), color(...), color-mix(...)
  const modernColorRegex = /(?:oklch|oklab|color-mix|color|lab|lch)\((?:[^)(]+|\((?:[^)(]+|\([^)(]*\))*\))*\)/gi;
  return value.replace(modernColorRegex, (match) => {
    return convertToRgbColor(match);
  });
}

/**
 * CSS Color properties that can contain oklch/modern colors
 */
const COLOR_PROPERTIES = [
  "color",
  "background-color",
  "border-color",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "box-shadow",
  "text-shadow",
  "fill",
  "stroke",
  "background-image",
];

/**
 * Sanitizes all elements in the cloned DOM tree before canvas capture.
 * Replaces any computed or inline oklch/modern color values with standard sRGB equivalents.
 */
export function sanitizeClonedDocumentForPdf(clonedDoc, rootElement) {
  if (!clonedDoc) return;

  try {
    const targetElements = rootElement
      ? [rootElement, ...rootElement.querySelectorAll("*")]
      : Array.from(clonedDoc.querySelectorAll("*"));

    for (const el of targetElements) {
      if (!el || !el.style) continue;

      // Check inline styles first
      for (const prop of COLOR_PROPERTIES) {
        const inlineVal = el.style.getPropertyValue(prop);
        if (inlineVal && /oklch|oklab|lab|lch|color\(/i.test(inlineVal)) {
          el.style.setProperty(prop, sanitizeCssValue(inlineVal));
        }
      }

      // Read computed styles to catch inherited Tailwind v4 oklch rules
      if (typeof window !== "undefined" && window.getComputedStyle) {
        try {
          const comp = window.getComputedStyle(el);
          if (comp) {
            for (const prop of COLOR_PROPERTIES) {
              const compVal = comp.getPropertyValue(prop);
              if (compVal && /oklch|oklab|lab|lch|color\(/i.test(compVal)) {
                el.style.setProperty(prop, sanitizeCssValue(compVal));
              }
            }
          }
        } catch (_) {}
      }
    }

    // Sanitize any <style> tags injected in the cloned document
    const styleTags = clonedDoc.querySelectorAll("style");
    for (const styleEl of styleTags) {
      if (styleEl.textContent && /oklch|oklab|lab|lch|color\(/i.test(styleEl.textContent)) {
        styleEl.textContent = sanitizeCssValue(styleEl.textContent);
      }
    }
  } catch (err) {
    console.warn("Color sanitization warning during PDF preparation:", err);
  }
}

/**
 * Preload all images (logos, signatures, QR codes) inside a printable element
 * to ensure they are rendered into the canvas without missing graphics.
 */
export async function preloadPrintableImages(element) {
  if (!element) return;
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth !== 0) return Promise.resolve();
      return new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
        // Safety timeout in case an external image stalls
        setTimeout(resolve, 2500);
      });
    })
  );
}
