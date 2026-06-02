"use client";

import { useEffect, useState, useCallback } from "react";
import {
  isNativePlatform,
  getPlatform,
  takePhoto,
  pickImage,
  registerPushNotifications,
  hapticFeedback,
  hapticNotification,
  getCurrentLocation,
  shareContent,
  authenticateWithBiometrics,
  isBiometricAvailable,
  getNetworkStatus,
  onNetworkChange,
  getDeviceInfo,
  setStatusBarLight,
  showToast,
  scheduleLocalNotification,
} from "./capacitor-bridge";

/**
 * React hook that provides access to all native device features.
 * Gracefully degrades when running in a browser.
 *
 * Usage:
 * ```tsx
 * const { isNative, camera, haptics, location, share, biometrics } = useNative();
 *
 * // Take a photo
 * const photo = await camera.take();
 *
 * // Haptic feedback on button press
 * haptics.impact("medium");
 *
 * // Share a prescription
 * share({ title: "Prescription", text: "..." });
 * ```
 */
export function useNative() {
  const [isNative, setIsNative] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "web">("web");
  const [isOnline, setIsOnline] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    setIsNative(isNativePlatform());
    setPlatform(getPlatform() as "ios" | "android" | "web");

    // Check network status
    getNetworkStatus().then((status) => setIsOnline(status.connected));

    // Listen for network changes
    onNetworkChange((connected) => setIsOnline(connected));

    // Check biometric availability
    isBiometricAvailable().then(setBiometricAvailable);

    // Set status bar for native
    if (isNativePlatform()) {
      setStatusBarLight();
      registerPushNotifications();
    }
  }, []);

  // Camera functions
  const camera = {
    take: useCallback(async () => await takePhoto(), []),
    pick: useCallback(async () => await pickImage(), []),
  };

  // Haptics functions
  const haptics = {
    impact: useCallback(
      async (style: "light" | "medium" | "heavy" = "medium") =>
        await hapticFeedback(style),
      []
    ),
    notification: useCallback(
      async (type: "success" | "warning" | "error" = "success") =>
        await hapticNotification(type),
      []
    ),
  };

  // Location
  const location = {
    getCurrent: useCallback(async () => await getCurrentLocation(), []),
  };

  // Share
  const share = useCallback(
    async (options: { title?: string; text?: string; url?: string }) =>
      await shareContent(options),
    []
  );

  // Biometrics
  const biometrics = {
    available: biometricAvailable,
    authenticate: useCallback(
      async (reason?: string) => await authenticateWithBiometrics(reason),
      []
    ),
  };

  // Toast
  const toast = useCallback(
    async (text: string, duration: "short" | "long" = "short") =>
      await showToast(text, duration),
    []
  );

  // Notifications
  const notifications = {
    schedule: useCallback(
      async (title: string, body: string, at?: Date) =>
        await scheduleLocalNotification(title, body, at),
      []
    ),
  };

  // Device info
  const device = {
    getInfo: useCallback(async () => await getDeviceInfo(), []),
  };

  return {
    isNative,
    platform,
    isOnline,
    camera,
    haptics,
    location,
    share,
    biometrics,
    toast,
    notifications,
    device,
  };
}
