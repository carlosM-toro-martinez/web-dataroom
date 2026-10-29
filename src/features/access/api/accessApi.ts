import { getRequest } from "@/shared/api/core/request";
import { accessOverviewSchema } from "@/features/access/model/access.schema";

export async function getAccessOverview() {
  return (await getRequest({ url: "/api/access/overview", schema: accessOverviewSchema })).data;
}
