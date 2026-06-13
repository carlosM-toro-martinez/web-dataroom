import axios from "axios";
import { normalizeApiError } from "@/shared/api/core/apiError";

export const staticClient = axios.create({
  baseURL: "/",
  timeout: 12_000,
  headers: {
    Accept: "application/json"
  }
});

staticClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error))
);
