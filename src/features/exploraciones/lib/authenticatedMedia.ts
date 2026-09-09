import { getVisitorDeviceId } from "@/features/auth/lib/visitorDevice";
import { getAuthToken } from "@/shared/lib/authToken";

export function isAuthenticatedDataRoomMedia(src: string) {
  try {
    const url = new URL(src, window.location.origin);
    return url.pathname.includes("/media/data-room/");
  } catch {
    return false;
  }
}

export function authenticatedDataRoomMediaRequest(src: string) {
  const url = new URL(src, window.location.origin);
  url.search = "";

  const headers = new Headers();
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  headers.set("x-device-id", getVisitorDeviceId());

  return { url: url.toString(), headers };
}
