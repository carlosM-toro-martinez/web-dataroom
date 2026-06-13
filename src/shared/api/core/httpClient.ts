import axios from "axios";
import { env } from "@/shared/config/env";
import { normalizeApiError } from "@/shared/api/core/apiError";
import { getStoredAuthSession, setStoredAuthSession } from "@/features/auth/lib/authSessionStorage";
import { getAuthToken, setAuthToken } from "@/shared/lib/authToken";

function normalizeBaseUrl(raw: string) {
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

const resolvedBaseUrl = normalizeBaseUrl(env.VITE_API_BASE_URL || "http://localhost:3000");

export const httpClient = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 12_000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

if (import.meta.env.DEV) {
  // Helps verify runtime env loading in browser console.
  console.info("[httpClient] baseURL:", resolvedBaseUrl);
}

function maskSensitive(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(maskSensitive);
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
    (accumulator, [key, currentValue]) => {
      const lowerKey = key.toLowerCase();
      const shouldMask =
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey === "authorization";

      accumulator[key] = shouldMask ? "***" : maskSensitive(currentValue);
      return accumulator;
    },
    {}
  );
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessTokenIfPossible(): Promise<string | null> {
  const stored = getStoredAuthSession();
  if (!stored?.refreshToken) return null;

  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    try {
      const response = await axios.post(
        `${resolvedBaseUrl}/api/auth/refresh`,
        { refreshToken: stored.refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          timeout: 12_000
        }
      );

      const data = response.data as {
        data?: { accessToken?: string; refreshToken?: string };
      };
      const newAccessToken = data?.data?.accessToken;
      if (!newAccessToken) return null;

      const nextSession = {
        ...stored,
        accessToken: newAccessToken,
        refreshToken: data?.data?.refreshToken ?? stored.refreshToken
      };
      setStoredAuthSession(nextSession);
      setAuthToken(newAccessToken);
      return newAccessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

httpClient.interceptors.request.use((config) => {
  const nextConfig = config;
  nextConfig.headers["X-Requested-With"] = "XMLHttpRequest";
  const token = getAuthToken();
  if (token) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (import.meta.env.DEV) {
    const method = (nextConfig.method ?? "GET").toUpperCase();
    console.info(`[API ->] ${method} ${nextConfig.url ?? ""}`, {
      params: maskSensitive(nextConfig.params),
      data: maskSensitive(nextConfig.data)
    });
  }

  return nextConfig;
});

httpClient.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      const method = (response.config.method ?? "GET").toUpperCase();
      console.info(`[API <-] ${response.status} ${method} ${response.config.url ?? ""}`, {
        data: maskSensitive(response.data)
      });
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const originalRequest = error.config;
      const statusCode = error.response?.status;
      const url = originalRequest?.url ?? "";
      const alreadyRetried = Boolean(
        (originalRequest as { _retry?: boolean } | undefined)?._retry
      );
      const isAuthRoute = url.includes("/api/auth/login") || url.includes("/api/auth/refresh");

      if (statusCode === 401 && originalRequest && !alreadyRetried && !isAuthRoute) {
        (originalRequest as { _retry?: boolean })._retry = true;
        return refreshAccessTokenIfPossible().then((newToken) => {
          if (!newToken) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("auth:unauthorized"));
            }
            return Promise.reject(normalizeApiError(error));
          }

          const nextRequest = originalRequest;
          nextRequest.headers = nextRequest.headers ?? {};
          nextRequest.headers.Authorization = `Bearer ${newToken}`;
          return httpClient(nextRequest);
        });
      }
    }

    const normalized = normalizeApiError(error);
    if (normalized.statusCode === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }

    if (import.meta.env.DEV) {
      console.error("[API xx]", {
        message: normalized.message,
        statusCode: normalized.statusCode,
        code: normalized.code,
        details: maskSensitive(normalized.details)
      });
    }

    return Promise.reject(normalized);
  }
);
