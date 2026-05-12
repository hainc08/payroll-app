const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || '/api';

function buildUrl(path, params) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalized}`, window.location.origin);

  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

function buildHeaders(extraHeaders = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (!headers['Content-Type'] && !(extraHeaders instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(method, path, options = {}) {
  const { params, data, headers: rawHeaders, ...rest } = options;
  const url = buildUrl(path, params);
  const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
  const headers = buildHeaders(isFormData ? rawHeaders : rawHeaders || {});

  if (isFormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(url, {
    method,
    headers,
    body:
      data === undefined
        ? undefined
        : isFormData
        ? data
        : JSON.stringify(data),
    credentials: 'include',
    ...rest,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && payload.message) ||
      response.statusText ||
      'Request failed';
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return { data: payload, status: response.status };
}

const api = {
  get(path, options) {
    return request('GET', path, options);
  },
  post(path, data, options = {}) {
    return request('POST', path, { ...options, data });
  },
  put(path, data, options = {}) {
    return request('PUT', path, { ...options, data });
  },
  delete(path, options) {
    return request('DELETE', path, options);
  },
};

export default api;

