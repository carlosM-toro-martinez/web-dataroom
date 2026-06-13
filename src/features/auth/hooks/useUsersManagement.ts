import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getUsersList, updateUserById } from "@/features/auth/api/authApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import { updateUserPayloadSchema, type UpdateUserPayload } from "@/features/auth/model/auth.schema";

export function useUsersListQuery() {
  return useQuery({
    queryKey: queryKeys.auth.users(),
    queryFn: getUsersList,
    refetchInterval: 45_000
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateUserPayload }) => {
      const parsed = updateUserPayloadSchema.parse(payload);
      return updateUserById(id, parsed);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });
    }
  });
}
