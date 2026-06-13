import { useMutation } from "@tanstack/react-query";
import { login } from "@/features/auth/api/authApi";
import { useAuth } from "@/features/auth/context/AuthContext";
import { loginPayloadSchema, type LoginPayload } from "@/features/auth/model/auth.schema";

export function useLoginMutation() {
  const auth = useAuth();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const parsed = loginPayloadSchema.parse(payload);
      return login(parsed);
    },
    onSuccess: (response) => {
      auth.login({
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken ?? response.data.accessToken,
        user: response.data.user
      });
    }
  });
}
