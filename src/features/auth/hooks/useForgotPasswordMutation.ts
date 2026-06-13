import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/features/auth/api/authApi";
import {
  forgotPasswordPayloadSchema,
  type ForgotPasswordPayload
} from "@/features/auth/model/auth.schema";

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const parsed = forgotPasswordPayloadSchema.parse(payload);
      return forgotPassword(parsed);
    }
  });
}
