import { Platform } from "react-native";

const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST ?? "192.168.1.31";
const API_PORT = process.env.EXPO_PUBLIC_API_PORT ?? "3000";

const HOST = Platform.select({
  ios: DEV_HOST,
  android: DEV_HOST,
  default:
    typeof window !== "undefined" && window.location?.hostname
      ? window.location.hostname
      : "localhost",
});

export const API_BASE_URL = `http://${HOST}:${API_PORT}`;
export const WS_URL = `ws://${HOST}:${API_PORT}`;
