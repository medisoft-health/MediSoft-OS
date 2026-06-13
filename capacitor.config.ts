import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.medisofthealth.app",
  appName: "MediSport",
  webDir: "out",
  // Server configuration — loads from your live URL
  server: {
    url: "https://sport.medisofthealth.com",
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
      backgroundColor: "#0F172A",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#0F172A",
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
      iconColor: "#0E9F6E",
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
    backgroundColor: "#0F172A",
  },
};

export default config;
