function mostrarSeccion(seccionId) {
  const secciones = document.querySelectorAll('.panel-seccion');
  secciones.forEach(sec => sec.style.display = 'none');
  document.getElementById(seccionId).style.display = 'block';
}

function cerrarSesion() {
  // Aquí puedes limpiar el token o redirigir al login
  alert("Sesión cerrada");
  window.location.href = "login.html";
}