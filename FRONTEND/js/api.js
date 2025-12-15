// Wrapper central para llamadas HTTP al backend.
// Ajusta API_BASE si tu backend corre en otro host (ej: http://localhost:3000/api)
const API_BASE = '/api';

async function apiFetch(path, options = {}) {
    //path: cadena que representa el “resto” de la ruta (por ejemplo, '/auth/login', '/reservations').
    //options = {}: objeto opcional para configurar método HTTP, headers, body, credenciales, etc. Si no lo pasas, se usa {} por defecto.

  //Cuando el JWT lo guarda el backend en el localstorage, el front lo lee desde ahi y lo añade automaticamente en cada peticion.
  const token = localStorage.getItem('accessToken');

  // Preparar headers )
  const headers = Object.assign({}, options.headers || {}); //Crea un objeto de headers de options.headers o un objeto vacio si no existe.
  if (token) headers['Authorization'] = `Bearer ${token}`;  //Si existe el token, añade el header de autorizacion con el token JWT.

  // Si hay body y no es FormData, serializar a JSON
  let body = options.body;
  if (body && !(body instanceof FormData)) { //si el body no es una instancia de FormData (para subir archivos), entonces:
    headers['Content-Type'] = 'application/json';   //Añade el header Content-Type para indicar que el body es JSON
    body = JSON.stringify(body);    //Convierte el body a una cadena JSON. para que backend lo pueda interpretar
  }

  // Ejecutar fetch con URL completa
  const res = await fetch(`${API_BASE}${path}`, { //Se compone concatenando API_BASE y path. Ejemplo: '/api' + '/reservations' → '/api/reservations'
    method: options.method || 'GET',    //Por defecto GET
    headers,                            //Headers preparados arriba con JWT y Content-Type si aplica
    body,                               //Body parseado a JSON si aplica
    credentials: options.credentials || 'same-origin'    
  });

  // Manejo centralizado de 401: token inválido o expirado
  if (res.status === 401) {    //Si la peticion HTTP no fue autorizada y dio un 401 remueve el token del localstorage y redirige a login.
    localStorage.removeItem('accessToken');
    // Redirigir a login para forzar re-autenticación
    window.location.href = '/login.html';
    throw new Error('Unauthorized');
  }

  // Detectar tipo de contenido y parsear
  const contentType = res.headers.get('content-type') || ''; //Obtiene el tipo de contenido de la respuesta HTTP
  const data = contentType.includes('application/json') ? await res.json() : await res.text(); //Obtiene el cuerpo de la respuesta parseado a JSON o texto para usarlo en el FRONTEND.

  // Si la respuesta no es OK, lanzar error con payload
  if (!res.ok) {
    const message = data?.message || data || 'Error en la petición';
    const err = new Error(message);
    err.status = res.status;
    err.payload = data;
    throw err;
  }

  // Devolver datos parseados
  return data;
}

//FLUJO GENERAL:
// El front hace una peticion HTTP al backend usando apiFetch.
// El back valida el JWT y responde con datos JSON autorizando o un 401 si no esta autorizado redirigiendo a login.
// Despues el front procesa los datos recibidos para mostrarlos en pantalla.
// Ejemplo: cargar reservas, crear reserva, actualizar estado, etc.
