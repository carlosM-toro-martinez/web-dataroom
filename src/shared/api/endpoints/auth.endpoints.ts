export const authEndpoints = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  register: "/api/auth/register",
  users: "/api/auth/users",
  userById: (id: number) => `/api/auth/users/${id}`,
  dataRoomAccessRequests: "/api/auth/data-room/access-requests",
  dataRoomAccessRequestApprove: (id: string) => `/api/auth/data-room/access-requests/${id}/approve`,
  dataRoomAccessRequestReject: (id: string) => `/api/auth/data-room/access-requests/${id}/reject`,
  dataRoomAccessRequestCancel: (id: string) => `/api/auth/data-room/access-requests/${id}/cancel`,
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password"
} as const;
