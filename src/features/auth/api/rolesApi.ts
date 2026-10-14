import { z } from "zod";
import { deleteRequest, getRequest, patchRequest, postRequest } from "@/shared/api/core/request";
import { apiEndpoints } from "@/shared/api/endpoints";
import {
  meResponseSchema,
  roleCatalogResponseSchema,
  roleResponseSchema,
  rolesListResponseSchema,
  type PermissionMap
} from "@/features/auth/model/auth.schema";

export type RolePayload = {
  key?: string;
  name?: string;
  description?: string | null;
  permissions?: PermissionMap;
};

export async function getCurrentUser() {
  return (await getRequest({ url: apiEndpoints.auth.me, schema: meResponseSchema })).data;
}

export async function getRoles() {
  return (await getRequest({ url: apiEndpoints.auth.roles, schema: rolesListResponseSchema })).data;
}

export async function getRoleCatalog() {
  return (await getRequest({ url: apiEndpoints.auth.rolesCatalog, schema: roleCatalogResponseSchema })).data;
}

export async function createRole(payload: Required<Pick<RolePayload, "key" | "name">> & RolePayload) {
  return (await postRequest({ url: apiEndpoints.auth.roles, body: payload, schema: roleResponseSchema })).data;
}

export async function updateRole(key: string, payload: RolePayload) {
  return (await patchRequest({ url: apiEndpoints.auth.roleByKey(key), body: payload, schema: roleResponseSchema })).data;
}

export async function deleteRole(key: string) {
  await deleteRequest({ url: apiEndpoints.auth.roleByKey(key), schema: z.unknown() });
}
