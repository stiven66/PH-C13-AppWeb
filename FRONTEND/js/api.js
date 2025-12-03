const API_BASE = '/api'; // Ajusta si tu backend corre en otro host

async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Serializar body si no es FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  // Manejo centralizado de 401
  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = data?.message || data || 'Error en la petición';
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  return data;
}
