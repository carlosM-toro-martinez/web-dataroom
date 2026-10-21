import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { httpClient } from "@/shared/api/core/httpClient";

export type AnalyticsFilters = {
  category?: "EXPLORATION" | "PRODUCTION" | "";
  source?: "INTERIOR" | "SURFACE" | "";
  from?: string;
  to?: string;
};

export type ElementSel = { element?: string; unit?: string };

export type Overview = {
  totals: {
    samples: number; interior: number; surface: number; exploration: number; production: number;
    with_coords: number; with_results: number; registered: number; dispatched: number; completed: number;
    last30: number; prev30: number;
  };
  dispatches: { pending: number; completed: number };
  byMonth: Array<{ month: string; samples: number; exploration: number; production: number }>;
  elements: Array<{ symbol: string; unit: string; samples: number; results: number; avg: number; max: number }>;
};

export type GradeGroup = { key: string; label: string; parent: string | null; n: number; avg: number; median: number; max: number; min: number; last_at: string | null };
export type Grades = {
  element: string | null; unit: string | null; groupBy?: string;
  groups: GradeGroup[];
  trend: Array<{ month: string; n: number; avg: number; max: number }>;
  top: Array<{ code: string; value: number; area: string; level: string; labor: string; objective: string; source: string; at: string }>;
  belowDetection: number;
};

export type Coverage = {
  labors: Array<{ source: string; category: string; area: string; level: string; labor: string; samples: number; with_coords: number; with_results: number; registered: number; last_at: string | null; days_since: number | null }>;
  emptyLabors: Array<{ source: string; category: string; area: string; level: string; labor: string }>;
};

export type Laboratories = {
  laboratories: Array<{ lab_key: string; lab: string; items: number; completed: number; pending: number; timed: number; avg_days: number | null; median_days: number | null; p90_days: number | null; normal_days: number }>;
  pending: Array<{ source: string; folio: number; lab_key: string; lab: string; sent_at: string; items: number; pending: number; days_waiting: number; normal_days: number; overdue: boolean }>;
  defaultNormalDays: number;
};

export type Quality = {
  element: string | null; unit: string | null; tolerance: number;
  pairs: Array<{ lab_a: string; lab_b: string; n: number; bias_pct: number; mean_abs_pct: number; within: number; corr: number | null }>;
  worst: Array<{ code: string; lab_a: string; lab_b: string; va: number; vb: number; diff_pct: number }>;
};

export type Estimation = {
  element: string | null; unit: string | null;
  levels: Array<{ id: string; label: string; parent: string; samples: number; points: number }>;
  selectedLevelId: string | null;
  points?: Array<{ id: string; code: string; east: number; north: number; value: number }>;
  result: null | {
    points: number; step: number; radius: number;
    bounds: { minEast: number; maxEast: number; minNorth: number; maxNorth: number };
    cells: Array<{ east: number; north: number; estimate: number; distance: number }>;
    suggestions: Array<{ east: number; north: number; estimate: number; distance: number; score: number }>;
    validation: { n: number; rmse: number; meanError: number; correlation: number | null };
    stats: { min: number; max: number; mean: number; p75: number };
  };
};

const clean = (params: Record<string, string | undefined>) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ""));

async function get<T>(path: string, params: Record<string, string | undefined>) {
  const response = await httpClient.get(`/api/analytics/${path}`, { params: clean(params) });
  return response.data.data as T;
}

const base = (f: AnalyticsFilters) => ({ category: f.category, source: f.source, from: f.from, to: f.to });
const options = { placeholderData: keepPreviousData, staleTime: 60_000 } as const;

export const useOverview = (f: AnalyticsFilters) =>
  useQuery({ queryKey: ["analytics", "overview", f], queryFn: () => get<Overview>("overview", base(f)), ...options });
export const useGrades = (f: AnalyticsFilters, e: ElementSel, groupBy: string) =>
  useQuery({ queryKey: ["analytics", "grades", f, e, groupBy], queryFn: () => get<Grades>("grades", { ...base(f), ...e, groupBy }), ...options });
export const useCoverage = (f: AnalyticsFilters) =>
  useQuery({ queryKey: ["analytics", "coverage", f], queryFn: () => get<Coverage>("coverage", base(f)), ...options });
export const useLaboratories = (f: AnalyticsFilters) =>
  useQuery({ queryKey: ["analytics", "laboratories", f], queryFn: () => get<Laboratories>("laboratories", base(f)), ...options });
export const useQuality = (f: AnalyticsFilters, e: ElementSel) =>
  useQuery({ queryKey: ["analytics", "quality", f, e], queryFn: () => get<Quality>("quality", { ...base(f), ...e }), ...options });
export const useEstimation = (f: AnalyticsFilters, e: ElementSel, levelId: string | undefined, enabled: boolean) =>
  useQuery({ queryKey: ["analytics", "estimation", f, e, levelId], queryFn: () => get<Estimation>("estimation", { ...base(f), ...e, levelId }), enabled, ...options });
