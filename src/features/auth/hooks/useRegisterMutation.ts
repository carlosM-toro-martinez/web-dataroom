import { useMutation, useQueryClient } from "@tanstack/react-query";
import { registerUser } from "@/features/auth/api/authApi";
import {
  registerPayloadSchema,
  type RegisterPayload
} from "@/features/auth/model/auth.schema";
import { queryKeys } from "@/shared/lib/queryKeys";

export function useRegisterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const parsed = registerPayloadSchema.parse(payload);
      return registerUser(parsed);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });
    }
  });
}
