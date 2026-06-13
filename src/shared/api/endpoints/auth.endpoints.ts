export const authEndpoints = {
  login: "/api/auth/login",
  refresh: "/api/auth/refresh",
  logout: "/api/auth/logout",
  register: "/api/auth/register",
  users: "/api/auth/users",
  userById: (id: number) => `/api/auth/users/${id}`,
  forgotPassword: "/api/auth/forgot-password",
  resetPassword: "/api/auth/reset-password"
} as const;
