import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDrillingCampaign,
  createDrillingHole,
  createDrillingShiftReport,
  getDrillingCampaigns,
  getDrillingHole,
  getDrillingHoles,
  getDrillingShiftReports,
  getDrillingSummary
} from "@/features/sondajes/api/sondajesApi";

const base = ["sondajes"] as const;

function useInvalidateSondajes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: base });
}

export function useDrillingSummaryQuery(enabled = true) {
  return useQuery({ queryKey: [...base, "summary"], queryFn: getDrillingSummary, enabled });
}

export function useDrillingCampaignsQuery(params?: { category?: string; status?: string }) {
  return useQuery({ queryKey: [...base, "campaigns", params], queryFn: () => getDrillingCampaigns(params) });
}

export function useDrillingHolesQuery(params?: { campaignId?: string; status?: string; category?: string }) {
  return useQuery({ queryKey: [...base, "holes", params], queryFn: () => getDrillingHoles(params) });
}

export function useDrillingHoleQuery(id?: string) {
  return useQuery({
    queryKey: [...base, "hole", id],
    queryFn: () => getDrillingHole(id as string),
    enabled: Boolean(id)
  });
}

export function useDrillingShiftReportsQuery(holeId?: string) {
  return useQuery({
    queryKey: [...base, "shift-reports", holeId],
    queryFn: () => getDrillingShiftReports(holeId as string),
    enabled: Boolean(holeId)
  });
}

export function useCreateDrillingCampaignMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: createDrillingCampaign, onSuccess: invalidate });
}

export function useCreateDrillingHoleMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({ mutationFn: createDrillingHole, onSuccess: invalidate });
}

export function useCreateDrillingShiftReportMutation() {
  const invalidate = useInvalidateSondajes();
  return useMutation({
    mutationFn: ({ holeId, payload }: { holeId: string; payload: Record<string, unknown> }) =>
      createDrillingShiftReport(holeId, payload),
    onSuccess: invalidate
  });
}
