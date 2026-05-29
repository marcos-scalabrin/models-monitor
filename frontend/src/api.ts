import type {
  MetaInfo,
  ProfileInfo,
  Recommendation,
  ScoredModel,
} from "./types";

const BASE = "/api";

async function getJSON<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(BASE + path, window.location.origin);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => getJSON<MetaInfo>("/meta"),
  profiles: () => getJSON<ProfileInfo[]>("/profiles"),
  models: (profile: string, alpha: number) =>
    getJSON<ScoredModel[]>("/models", { profile, alpha, limit: 2000 }),
  recommend: (profile: string, alpha: number, top = 3) =>
    getJSON<Recommendation>("/recommend", { profile, alpha, top }),
  refresh: async (): Promise<MetaInfo> => {
    const res = await fetch(BASE + "/refresh", { method: "POST" });
    if (!res.ok) throw new Error(`refresh -> ${res.status}`);
    return res.json();
  },
};
