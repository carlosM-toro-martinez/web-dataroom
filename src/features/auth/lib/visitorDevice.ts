const VISITOR_DEVICE_KEY = "marte-visitor-device-id";

export function getVisitorDeviceId() {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(VISITOR_DEVICE_KEY);
  if (existing) return existing;

  const deviceId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  window.localStorage.setItem(VISITOR_DEVICE_KEY, deviceId);
  return deviceId;
}
