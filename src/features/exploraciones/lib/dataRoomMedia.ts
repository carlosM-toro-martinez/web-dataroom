import { getVisitorDeviceId } from "@/features/auth/lib/visitorDevice";
import { env } from "@/shared/config/env";
import { getAuthToken } from "@/shared/lib/authToken";

export type DataRoomMediaKey = "intro-video" | "model-1" | "model-2";

function apiBaseUrl() {
  const base = env.VITE_API_BASE_URL.replace(/\/+$/, "");
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function dataRoomMediaUrl(key: DataRoomMediaKey) {
  const params = new URLSearchParams();
  const token = getAuthToken();
  if (token) params.set("access_token", token);
  params.set("device_id", getVisitorDeviceId());
  return `${apiBaseUrl()}/media/data-room/${key}?${params.toString()}`;
}
