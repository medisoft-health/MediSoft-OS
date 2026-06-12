"use client";

import * as React from "react";

/**
 * Registers the MediSport-specific service worker (sport-sw.js) so the
 * standalone platform is installable as its own PWA on Android/iOS.
 */
export function SportPwaRegister() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sport-sw.js", { scope: "/" })
        .catch(() => {
          /* silent */
        });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
  return null;
}
