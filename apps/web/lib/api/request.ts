import { useUserStore } from '@/store/userStore';

const BASE_URL = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    // 直接在 super 中进行类型判断
    super(
      typeof body === 'object' && body !== null && 'message' in body && typeof (body as any).message === 'string'
        ? (body as any).message
        : `HTTP ${status}`
    );
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useUserStore.getState().accessToken;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** GET 请求的 query 参数，自动序列化拼接到 URL；数组会展开为重复参数 ?k=v1&k=v2 */
  params?: Record<string, string | number | boolean | null | undefined | (string | number | boolean)[]> | object;
};

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options;

  // 拼接 query 参数
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += (path.includes('?') ? '&' : '?') + qs;
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  // FormData 时让浏览器自动设置 Content-Type（含 boundary），否则默认 JSON
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      useUserStore.getState().logout();
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}&reason=expired`;
    }
    throw new ApiError(401, { message: '登录已过期，请重新登录' });
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/**
 * 与 request() 相同鉴权/401 处理，但返回 Blob（如治具 SVG 附件）。
 * 错误响应仍按 JSON 解析 message。
 */
export async function requestBlob(
  path: string,
  options: RequestOptions = {},
): Promise<Blob> {
  const { body, params, headers: customHeaders, ...rest } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          searchParams.append(key, String(item));
        }
      } else {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += (path.includes('?') ? '&' : '?') + qs;
  }

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...rest,
    headers,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      useUserStore.getState().logout();
      const redirect = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?redirect=${redirect}&reason=expired`;
    }
    throw new ApiError(401, { message: '登录已过期，请重新登录' });
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorBody);
  }

  return response.blob();
}
