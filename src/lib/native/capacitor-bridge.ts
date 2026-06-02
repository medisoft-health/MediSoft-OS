/**
 * MediSoft Capacitor Native Bridge
 *
 * This module provides a unified interface to access native device features
 * when running as a Capacitor app. It gracefully degrades when running in
 * a standard browser (PWA mode).
 */

import { Capacitor } from "@capacitor/core";

// ─── Platform Detection ────────────────────────────────────────────────────────

export const isNativePlatform = () => Capacitor.isNativePlatform();
export const getPlatform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
export const isIOS = () => getPlatform() === "ios";
export const isAndroid = () => getPlatform() === "android";
export const isWeb = () => getPlatform() === "web";

// ─── Camera ────────────────────────────────────────────────────────────────────

export async function takePhoto() {
  if (!isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      correctOrientation: true,
    });
    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (error) {
    console.warn("Camera not available:", error);
    return null;
  }
}

export async function pickImage() {
  if (!isNativePlatform()) return null;

  const { Camera, CameraResultType, CameraSource } = await import(
    "@capacitor/camera"
  );
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
    });
    return image.base64String ? `data:image/jpeg;base64,${image.base64String}` : null;
  } catch (error) {
    console.warn("Photo picker not available:", error);
    return null;
  }
}

// ─── Push Notifications ────────────────────────────────────────────────────────

export async function registerPushNotifications() {
  if (!isNativePlatform()) return null;

  const { PushNotifications } = await import("@capacitor/push-notifications");

  try {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === "granted") {
      await PushNotifications.register();

      // Listen for registration token
      PushNotifications.addListener("registration", (token) => {
        console.log("Push registration token:", token.value);
        // TODO: Send token to your server for push notifications
        savePushToken(token.value);
      });

      // Listen for push notification received
      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification) => {
          console.log("Push notification received:", notification);
        }
      );

      // Listen for push notification action (user tapped)
      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (notification) => {
          console.log("Push notification action:", notification);
        }
      );

      return true;
    }
    return false;
  } catch (error) {
    console.warn("Push notifications not available:", error);
    return false;
  }
}

async function savePushToken(token: string) {
  try {
    await fetch("/api/push-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform: getPlatform() }),
    });
  } catch (error) {
    console.warn("Failed to save push token:", error);
  }
}

// ─── Local Notifications ───────────────────────────────────────────────────────

export async function scheduleLocalNotification(
  title: string,
  body: string,
  scheduleAt?: Date
) {
  if (!isNativePlatform()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          schedule: scheduleAt ? { at: scheduleAt } : undefined,
          sound: "beep.wav",
          smallIcon: "ic_stat_icon_config_sample",
        },
      ],
    });
  } catch (error) {
    console.warn("Local notifications not available:", error);
  }
}

// ─── Haptics ───────────────────────────────────────────────────────────────────

export async function hapticFeedback(
  style: "light" | "medium" | "heavy" = "medium"
) {
  if (!isNativePlatform()) return;

  const { Haptics, ImpactStyle } = await import("@capacitor/haptics");

  const styleMap = {
    light: ImpactStyle.Light,
    medium: ImpactStyle.Medium,
    heavy: ImpactStyle.Heavy,
  };

  try {
    await Haptics.impact({ style: styleMap[style] });
  } catch (error) {
    // Silently fail on devices without haptics
  }
}

export async function hapticNotification(
  type: "success" | "warning" | "error" = "success"
) {
  if (!isNativePlatform()) return;

  const { Haptics, NotificationType } = await import("@capacitor/haptics");

  const typeMap = {
    success: NotificationType.Success,
    warning: NotificationType.Warning,
    error: NotificationType.Error,
  };

  try {
    await Haptics.notification({ type: typeMap[type] });
  } catch (error) {
    // Silently fail
  }
}

// ─── Geolocation ───────────────────────────────────────────────────────────────

export async function getCurrentLocation() {
  if (!isNativePlatform()) {
    // Fallback to browser geolocation
    return new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null)
      );
    });
  }

  const { Geolocation } = await import("@capacitor/geolocation");

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch (error) {
    console.warn("Geolocation not available:", error);
    return null;
  }
}

// ─── Share ─────────────────────────────────────────────────────────────────────

export async function shareContent(options: {
  title?: string;
  text?: string;
  url?: string;
}) {
  if (!isNativePlatform()) {
    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share(options);
      return true;
    }
    return false;
  }

  const { Share } = await import("@capacitor/share");

  try {
    await Share.share(options);
    return true;
  } catch (error) {
    console.warn("Share not available:", error);
    return false;
  }
}

// ─── Biometric Auth ────────────────────────────────────────────────────────────

export async function authenticateWithBiometrics(reason?: string) {
  if (!isNativePlatform()) return true; // Skip on web

  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    await BiometricAuth.authenticate({
      reason: reason || "Authenticate to access MediSoft",
      allowDeviceCredential: true,
    });
    return true;
  } catch (error) {
    console.warn("Biometric auth failed:", error);
    return false;
  }
}

export async function isBiometricAvailable() {
  if (!isNativePlatform()) return false;

  try {
    const { BiometricAuth } = await import(
      "@aparajita/capacitor-biometric-auth"
    );
    const result = await BiometricAuth.checkBiometry();
    return result.isAvailable;
  } catch (error) {
    return false;
  }
}

// ─── Network Status ────────────────────────────────────────────────────────────

export async function getNetworkStatus() {
  const { Network } = await import("@capacitor/network");

  try {
    const status = await Network.getStatus();
    return {
      connected: status.connected,
      connectionType: status.connectionType,
    };
  } catch (error) {
    return { connected: navigator.onLine, connectionType: "unknown" };
  }
}

export async function onNetworkChange(
  callback: (connected: boolean) => void
) {
  const { Network } = await import("@capacitor/network");

  Network.addListener("networkStatusChange", (status) => {
    callback(status.connected);
  });
}

// ─── Device Info ───────────────────────────────────────────────────────────────

export async function getDeviceInfo() {
  const { Device } = await import("@capacitor/device");

  try {
    const info = await Device.getInfo();
    return {
      model: info.model,
      platform: info.platform,
      osVersion: info.osVersion,
      manufacturer: info.manufacturer,
      isVirtual: info.isVirtual,
    };
  } catch (error) {
    return null;
  }
}

// ─── Status Bar ────────────────────────────────────────────────────────────────

export async function setStatusBarLight() {
  if (!isNativePlatform()) return;

  const { StatusBar, Style } = await import("@capacitor/status-bar");

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#FFFFFF" });
  } catch (error) {
    // Silently fail on web
  }
}

export async function setStatusBarDark() {
  if (!isNativePlatform()) return;

  const { StatusBar, Style } = await import("@capacitor/status-bar");

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0f172a" });
  } catch (error) {
    // Silently fail on web
  }
}

// ─── Keyboard ──────────────────────────────────────────────────────────────────

export async function hideKeyboard() {
  if (!isNativePlatform()) return;

  const { Keyboard } = await import("@capacitor/keyboard");

  try {
    await Keyboard.hide();
  } catch (error) {
    // Silently fail
  }
}

// ─── App Badge ─────────────────────────────────────────────────────────────────

export async function setAppBadge(count: number) {
  if (!isNativePlatform()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");

  try {
    // On iOS, badge is managed through notifications
    // This is a simplified approach
    if (count === 0) {
      // Clear badge
    }
  } catch (error) {
    // Silently fail
  }
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

export async function showToast(text: string, duration: "short" | "long" = "short") {
  if (!isNativePlatform()) return;

  const { Toast } = await import("@capacitor/toast");

  try {
    await Toast.show({ text, duration });
  } catch (error) {
    // Silently fail
  }
}
