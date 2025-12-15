// Manejo de autenticación del lado frontend: login/logout y helpers de sesión.


//Define las claves usadas en localStorage.
const TOKEN_KEY = 'accessToken';    //JWT generado por el back
const USER_KEY = 'currentUser';     //Guarda un objeto con datos como id, nombre, email, rol, etc del usuario.

// Inicia sesión: llama API, guarda token y usuario, redirige por rol
async function login(email, password) {
  // Llamar a la API de login
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  // Validar y guardar token
  if (!res || !res.accessToken) {
    throw new Error('Respuesta de login inválida');
  }
  localStorage.setItem(TOKEN_KEY, res.accessToken); //Guarda el JWT en localStorage. A partir de aquí, apiFetch lo añadirá en Authorization.

  //Llama al backend para obtener el perfil del usuario autenticado.
  const me = await apiFetch('/auth/me'); // requiere el token recién guardado
  if (me) {
    localStorage.setItem(USER_KEY, JSON.stringify(me)); //Guarda el perfil en localStorage para consultas rápidas en el frontend.
  }

  //Segun el rol carga la vista de HTML para admin o viajero
  const role = me?.role || res.role;
  if (role === 'admin') {
    window.location.href = '/dashboard-admin.html';
  } else {
    window.location.href = '/dashboard-user.html';
  }
}

// Cierra sesión:
function logout() {
  localStorage.removeItem(TOKEN_KEY);  //Limpia el token JWT
  localStorage.removeItem(USER_KEY);    //Borra el objeto del usuario
  window.location.href = './login.html';   //Por ultimo carga la pagina para volver a iniciar sesion.
}

// Obtiene el usuario actual desde localStorage (sin llamar API)
function getCurrentUser() {
  const raw = localStorage.getItem(USER_KEY);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

// Verifica si hay sesión abierta (token en localStorage)
function isAuthenticated() {
  return !!localStorage.getItem(TOKEN_KEY);  //Devuelve true si existe el token, false si no.
}

// Protege páginas: si no hay token, redirige a login
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = './login.html';
    return false;
  }
  return true;
}

// Protege por rol: requiere sesión y rol específico (ej: 'admin')
function requireRole(expectedRole) {
  if (!requireAuth()) return false; //Primero verifica que haya sesión abierta si no redirige a login.
  const user = getCurrentUser();
  if (!user || user.role !== expectedRole) {    //Verifica que el rol del usuario coincida con el esperado.
    window.location.href = '/index.html'; // Si no coincide redirige a la pagina principal.
    return false;
  }
  return true;
}
