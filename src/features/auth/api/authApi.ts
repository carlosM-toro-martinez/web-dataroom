import { postRequest, putRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import { httpClient } from "@/shared/api/core/httpClient";
import { ApiError } from "@/shared/api/core/apiError";
import {
  forgotPasswordResponseSchema,
  approveDataRoomAccessPayloadSchema,
  approveDataRoomAccessResponseSchema,
  cancelDataRoomAccessPayloadSchema,
  dataRoomAccessRequestPayloadSchema,
  dataRoomAccessRequestResponseSchema,
  dataRoomAccessRequestsResponseSchema,
  loginResponseSchema,
  refreshPayloadSchema,
  refreshResponseSchema,
  rejectDataRoomAccessPayloadSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  registerResponseSchema,
  updateUserPayloadSchema,
  updateUserResponseSchema,
  usersListResponseSchema,
  type ForgotPasswordPayload,
  type ApproveDataRoomAccessPayload,
  type CancelDataRoomAccessPayload,
  type DataRoomAccessRequestPayload,
  type LoginPayload,
  type RefreshPayload,
  type RejectDataRoomAccessPayload,
  type ResetPasswordPayload,
  type RegisterPayload,
  type UpdateUserPayload
} from "@/features/auth/model/auth.schema";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDataRoomAccessPayload(payload: DataRoomAccessRequestPayload) {
  const company = payload.company?.trim();
  return {
    fullName: payload.fullName.trim(),
    email: normalizeEmail(payload.email),
    phone: payload.phone.trim(),
    company: company || undefined,
    reason: payload.reason.trim()
  };
}

export async function login(payload: LoginPayload) {
  const body = loginResponseSafePayload(payload);
  return postRequest({
    url: apiEndpoints.auth.login,
    body,
    schema: loginResponseSchema
  });
}

function loginResponseSafePayload(payload: LoginPayload): LoginPayload {
  return { ...payload, email: normalizeEmail(payload.email) };
}

export async function registerUser(payload: RegisterPayload) {
  return postRequest({
    url: apiEndpoints.auth.register,
    body: { ...payload, email: normalizeEmail(payload.email) },
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
    body: body.email ? { ...body, email: normalizeEmail(body.email) } : body,
    schema: updateUserResponseSchema
  });
}

export async function requestDataRoomAccess(payload: DataRoomAccessRequestPayload) {
  const parsed = dataRoomAccessRequestPayloadSchema.safeParse(normalizeDataRoomAccessPayload(payload));
  if (!parsed.success) {
    throw new ApiError(parsed.error.issues[0]?.message ?? "Please check the form fields.");
  }

  return postRequest({
    url: apiEndpoints.auth.dataRoomAccessRequests,
    body: parsed.data,
    schema: dataRoomAccessRequestResponseSchema
  });
}

export async function getDataRoomAccessRequests() {
  const response = await httpClient.get(apiEndpoints.auth.dataRoomAccessRequests);
  return dataRoomAccessRequestsResponseSchema.parse(response.data);
}

export async function approveDataRoomAccessRequest(id: string, payload: ApproveDataRoomAccessPayload) {
  const body = approveDataRoomAccessPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.auth.dataRoomAccessRequestApprove(id),
    body,
    schema: approveDataRoomAccessResponseSchema
  });
}

export async function rejectDataRoomAccessRequest(id: string, payload: RejectDataRoomAccessPayload) {
  const body = rejectDataRoomAccessPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.auth.dataRoomAccessRequestReject(id),
    body,
    schema: dataRoomAccessRequestResponseSchema
  });
}

export async function cancelDataRoomAccessRequest(id: string, payload: CancelDataRoomAccessPayload) {
  const body = cancelDataRoomAccessPayloadSchema.parse(payload);
  return postRequest({
    url: apiEndpoints.auth.dataRoomAccessRequestCancel(id),
    body,
    schema: dataRoomAccessRequestResponseSchema
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
    body: { ...payload, email: normalizeEmail(payload.email) },
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
