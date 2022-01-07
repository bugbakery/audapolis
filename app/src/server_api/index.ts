import { ServerConfig } from '../state/server';

export function fetchFromServer(
  server: ServerConfig,
  method: 'POST' | 'GET' | 'DELETE',
  route: string,
  getParameters?: Record<string, string | boolean | number>,
  body?: {
    form?: Record<string, any>;
    json?: any;
  }
): Promise<Response> {
  const options: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${server.token}` },
  };

  const getString = getParameters ? '?' + encodeGetParams(getParameters) : '';

  if (body?.form) {
    const formData = new FormData();
    Object.entries(body.form).forEach(([k, v]) => {
      formData.append(k, v);
    });
    options.body = formData;
  } else if (body?.json) {
    options.body = JSON.stringify(body.json);
    options.headers = { ...options.headers, 'content-type': 'application/json' };
  }

  return fetch(`${server.hostname}:${server.port}/${route}/${getString}`, options);
}

function encodeGetParams(params: Record<string, string | boolean | number>): string {
  return Object.entries(params)
    .map((kv) => kv.map(encodeURIComponent).join('='))
    .join('&');
}
