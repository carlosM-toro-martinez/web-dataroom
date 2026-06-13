export const EXPLORACIONES_DOMAINS = ["minmartesrl.com", "www.minmartesrl.com"] as const;
export const LOCAL_PREVIEW_DOMAINS = ["localhost", "127.0.0.1"] as const;

export function isExploracionesDomain(hostname: string) {
  return EXPLORACIONES_DOMAINS.includes(hostname as (typeof EXPLORACIONES_DOMAINS)[number]);
}

export function isCorporatePreviewDomain(hostname: string) {
  if (isExploracionesDomain(hostname)) return true;
  if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
    return LOCAL_PREVIEW_DOMAINS.includes(
      hostname as (typeof LOCAL_PREVIEW_DOMAINS)[number]
    );
  }
  return false;
}

export function getPostLogoutPath(hostname: string) {
  return "/";
}
