import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveDataRoomAccessRequest,
  getDataRoomAccessRequests,
  getUsersList,
  rejectDataRoomAccessRequest,
  updateUserById
} from "@/features/auth/api/authApi";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
  approveDataRoomAccessPayloadSchema,
  rejectDataRoomAccessPayloadSchema,
  updateUserPayloadSchema,
  type ApproveDataRoomAccessPayload,
  type RejectDataRoomAccessPayload,
  type UpdateUserPayload
} from "@/features/auth/model/auth.schema";

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

export function useDataRoomAccessRequestsQuery() {
  return useQuery({
    queryKey: queryKeys.auth.dataRoomAccessRequests(),
    queryFn: getDataRoomAccessRequests,
    refetchInterval: 45_000
  });
}

export function useApproveDataRoomAccessRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveDataRoomAccessPayload }) =>
      approveDataRoomAccessRequest(id, approveDataRoomAccessPayloadSchema.parse(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.dataRoomAccessRequests() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.users() });
    }
  });
}

export function useRejectDataRoomAccessRequestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RejectDataRoomAccessPayload }) =>
      rejectDataRoomAccessRequest(id, rejectDataRoomAccessPayloadSchema.parse(payload)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.dataRoomAccessRequests() });
    }
  });
}
