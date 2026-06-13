import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/features/auth/api/authApi";
import {
  resetPasswordPayloadSchema,
  type ResetPasswordPayload
} from "@/features/auth/model/auth.schema";

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      const parsed = resetPasswordPayloadSchema.parse(payload);
      return resetPassword(parsed);
    }
  });
}
