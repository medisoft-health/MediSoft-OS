import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.medisofthealth.app",
  appName: "MediSoft",
  webDir: "out",
  // Server configuration — loads from your live URL
  server: {
    url: "https://app.medisofthealth.com",
    cleartext: false,
    // Allow navigation to these origins
    allowNavigation: [
      "app.medisofthealth.com",
      "*.medisofthealth.com",
      "accounts.google.com",
      "healthcare.googleapis.com",
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FFFFFF",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#FFFFFF",
    },
    Keyboard: {
      resize: "body" as any,
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      // iOS camera permissions
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#0D9488",
      sound: "beep.wav",
    },
  },
  // iOS specific settings
  ios: {
    contentInset: "automatic",
    allowsLinkPreview: true,
    scrollEnabled: true,
    scheme: "MediSoft",
    preferredContentMode: "mobile",
  },
  // Android specific settings
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#FFFFFF",
  },
};

export default config;
