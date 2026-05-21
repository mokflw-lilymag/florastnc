/**
 * Postiz Public API client (self-hosted: {POSTIZ_API_URL}/public/v1)
 * @see https://docs.postiz.com/public-api/introduction
 */

export interface PostizConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PostizIntegration {
  id: string;
  name?: string;
  provider?: string;
  type?: string;
}

export interface CreatePostizPostInput {
  integrationId: string;
  caption: string;
  imageUrl?: string;
  scheduleAt?: Date;
  publishNow?: boolean;
}

export interface PostizPostResult {
  ok: boolean;
  postId?: string;
  error?: string;
  raw?: unknown;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.replace(/\/$/, "");
  return trimmed.endsWith("/public/v1") ? trimmed : `${trimmed}/public/v1`;
}

export function resolvePostizConfig(opts?: {
  apiUrl?: string;
  apiKey?: string;
}): PostizConfig | null {
  const baseUrl = opts?.apiUrl ?? process.env.POSTIZ_API_URL ?? "";
  const apiKey = opts?.apiKey ?? process.env.POSTIZ_API_KEY ?? "";
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: normalizeBaseUrl(baseUrl), apiKey };
}

async function postizFetch<T>(
  config: PostizConfig,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: config.apiKey,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    const text = await res.text();
    let data: T | undefined;
    try {
      data = text ? (JSON.parse(text) as T) : undefined;
    } catch {
      data = text as unknown as T;
    }
    if (!res.ok) {
      return { ok: false, error: typeof data === "string" ? data : JSON.stringify(data), status: res.status };
    }
    return { ok: true, data, status: res.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "fetch_failed", status: 0 };
  }
}

/** GET /integrations — 연결된 채널 목록 */
export async function listPostizIntegrations(config: PostizConfig): Promise<PostizIntegration[]> {
  const res = await postizFetch<{ integrations?: PostizIntegration[] } | PostizIntegration[]>(
    config,
    "/integrations",
    { method: "GET" }
  );
  if (!res.ok || !res.data) return [];
  if (Array.isArray(res.data)) return res.data;
  return res.data.integrations ?? [];
}

export function findInstagramIntegration(integrations: PostizIntegration[]): PostizIntegration | null {
  const ig = integrations.find((i) => {
    const p = (i.provider ?? i.type ?? i.name ?? "").toLowerCase();
    return p.includes("instagram");
  });
  return ig ?? null;
}

/** GET /social/{integration} — Instagram 등 OAuth 연결 URL */
export async function getPostizOAuthUrl(
  config: PostizConfig,
  integration = "instagram",
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const res = await postizFetch<{ url?: string }>(config, `/social/${integration}`, { method: "GET" });
  if (!res.ok || !res.data?.url) {
    return { ok: false, error: res.error ?? "oauth_url_failed" };
  }
  return { ok: true, url: res.data.url };
}

/** POST /posts — 인스타 예약/즉시 게시 */
export async function createPostizPost(
  config: PostizConfig,
  input: CreatePostizPostInput
): Promise<PostizPostResult> {
  const type = input.publishNow ? "now" : "schedule";
  const date = input.scheduleAt?.toISOString() ?? new Date(Date.now() + 30 * 60_000).toISOString();

  const valueBlock: { content: string; image?: { id: string; path: string }[] } = {
    content: input.caption,
  };
  if (input.imageUrl) {
    valueBlock.image = [{ id: "img1", path: input.imageUrl }];
  }

  const body = {
    type,
    date,
    shortLink: false,
    tags: [],
    posts: [
      {
        integration: { id: input.integrationId },
        value: [valueBlock],
        settings: {
          __type: "instagram",
          post_type: "post",
          is_trial_reel: false,
          collaborators: [],
        },
      },
    ],
  };

  const res = await postizFetch<{ id?: string; postId?: string }>(config, "/posts", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, error: res.error ?? "postiz_create_failed", raw: res.data };
  }

  const postId = (res.data as { id?: string })?.id ?? (res.data as { postId?: string })?.postId;
  return { ok: true, postId, raw: res.data };
}

/** GET /posts/{id} — 상태 확인 (fallback용) */
export async function getPostizPostStatus(config: PostizConfig, postId: string): Promise<{ ok: boolean; state?: string }> {
  const res = await postizFetch<{ state?: string; status?: string }>(config, `/posts/${postId}`, { method: "GET" });
  if (!res.ok) return { ok: false };
  return { ok: true, state: res.data?.state ?? res.data?.status };
}
