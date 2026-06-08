// The id-preview-*.lovable.app host gates every request (including
// /api/public/*) behind an auth-bridge redirect, which breaks client
// fetches from inside the preview iframe. The stable
// project--{id}-dev.lovable.app host serves the same preview build but
// does not gate /api/public/*, so we route API calls there when we
// detect we're running on the id-preview host.

const PROJECT_ID = "a8137fc9-0b3f-4ceb-8c7f-920230242066";

export function apiBase(): string {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host.startsWith("id-preview--")) {
    return `https://project--${PROJECT_ID}-dev.lovable.app`;
  }
  return "";
}

export function apiUrl(path: string): string {
  return `${apiBase()}${path}`;
}
