import { postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { httpClient } from "@/shared/api/core/httpClient";
import {
  forgotPasswordResponseSchema,
  loginResponseSchema,
  refreshPayloadSchema,
  refreshResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  registerResponseSchema,
  updateUserPayloadSchema,
  updateUserResponseSchema,
  usersListResponseSchema,
  type ForgotPasswordPayload,
  type LoginPayload,
  type RefreshPayload,
  type ResetPasswordPayload,
  type RegisterPayload,
  type UpdateUserPayload
} from "@/features/auth/model/auth.schema";

export async function login(payload: LoginPayload) {
  return postRequest({
    url: apiEndpoints.auth.login,
    body: payload,
    schema: loginResponseSchema
  });
}

export async function registerUser(payload: RegisterPayload) {
  return postRequest({
    url: apiEndpoints.auth.register,
    body: payload,
    schema: registerResponseSchema
  });
}

export async function getUsersList() {
  const response = await httpClient.get(apiEndpoints.auth.users);
  const payload = response.data as unknown;
  const normalized =
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    payload.data &&
    typeof payload.data === "object" &&
    "data" in payload.data
      ? payload.data
      : payload;

  return usersListResponseSchema.parse(normalized);
}

export async function updateUserById(id: number, payload: UpdateUserPayload) {
  const body = updateUserPayloadSchema.parse(payload);
  return putRequest({
    url: apiEndpoints.auth.userById(id),
    body,
    schema: updateUserResponseSchema
  });
}

export async function refreshSession(payload: RefreshPayload) {
  const body = refreshPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.auth.refresh,
    body,
    schema: refreshResponseSchema
  });
}

export async function logoutSession(payload: RefreshPayload) {
  const body = refreshPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.auth.logout,
    body,
    schema: forgotPasswordResponseSchema
  });
}

export async function forgotPassword(payload: ForgotPasswordPayload) {
  return postRequest({
    url: apiEndpoints.auth.forgotPassword,
    body: payload,
    schema: forgotPasswordResponseSchema
  });
}

export async function resetPassword(payload: ResetPasswordPayload) {
  const body = resetPasswordRequestSchema.parse({ password: payload.password });

  return postRequest({
    url: `${apiEndpoints.auth.resetPassword}?token=${encodeURIComponent(payload.token)}`,
    body,
    schema: resetPasswordResponseSchema
  });
}
