import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRole,
  deleteRole,
  getRoleCatalog,
  getRoles,
  updateRole,
  type RolePayload
} from "@/features/auth/api/rolesApi";

const rolesKey = ["auth", "roles"] as const;

export function useRolesQuery() {
  return useQuery({ queryKey: rolesKey, queryFn: getRoles });
}

export function useRoleCatalogQuery() {
  return useQuery({ queryKey: [...rolesKey, "catalog"], queryFn: getRoleCatalog, staleTime: Infinity });
}

export function useCreateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { key: string; name: string } & RolePayload) => createRole(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey })
  });
}

export function useUpdateRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, payload }: { key: string; payload: RolePayload }) => updateRole(key, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey })
  });
}

export function useDeleteRoleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => deleteRole(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: rolesKey })
  });
}
