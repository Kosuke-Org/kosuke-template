import axios, { type AxiosInstance } from 'axios';

let renderApiInstance: AxiosInstance | null = null;

function initializeRenderApi(): AxiosInstance {
  if (!renderApiInstance) {
    const RENDER_API_KEY = process.env.RENDER_API_KEY;

    if (!RENDER_API_KEY) {
      throw new Error('Missing RENDER_API_KEY environment variable');
    }

    renderApiInstance = axios.create({
      baseURL: 'https://api.render.com/v1',
      headers: {
        Authorization: `Bearer ${RENDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
  }

  return renderApiInstance;
}

// Lazy-loaded API client with generic typing
export const renderApi = {
  get: <T>(...args: Parameters<AxiosInstance['get']>) => initializeRenderApi().get<T>(...args),
  post: <T>(...args: Parameters<AxiosInstance['post']>) => initializeRenderApi().post<T>(...args),
};

export class RenderApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly data: unknown
  ) {
    super(`Render API Error: ${status}`);
  }
}

export async function handleApiError(error: unknown): Promise<never> {
  if (axios.isAxiosError(error)) {
    throw new RenderApiError(error.response?.status || 500, error.response?.data);
  }
  throw error;
}
