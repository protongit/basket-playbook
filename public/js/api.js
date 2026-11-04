let unauthorizedHandler = null;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

async function request(path, { method = "GET", body, signal } = {}) {
  const options = {
    method,
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(path, options);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;
  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(
      response.status,
      payload?.error || `Error HTTP ${response.status}`,
    );
  }
  return payload;
}

export function api(path, options) {
  return request(`/api${path}`, options);
}

export function publicApi(path, options) {
  return request(`/api${path}`, options);
}
