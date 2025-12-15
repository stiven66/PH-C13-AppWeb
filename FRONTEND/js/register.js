// Manejo del formulario de registro de usuarios
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const messageEl = document.getElementById('message');

  if (!form) return;

  form.addEventListener('submit', async (e) => { //Cuando hace clcick en registrarse hace lo siguiente
    e.preventDefault();   // Evita que recargue la pagina
    clearMessage();   //Borra mensaje 

    // Leer valores del formulario
    const email = document.getElementById('email')?.value.trim(); //Asigna el valor del campo del email, password y name del formulario a las variables. trim elimina espacios en blanco al inicio y final.
    const password = document.getElementById('password')?.value.trim();
    const name = document.getElementById('name')?.value.trim();

    // Validaciones básicas
    if (!email || !password || !name) {  //Mira que los campos no esten vacios
      showMessage('Todos los campos son obligatorios.', 'error');
      return;
    }
    if (password.length < 6) {   //Mira que la contraseña tenga mas de 5 caracteres
      showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
      return;
    }

    try {
      // Llamada al backend para crear usuario con el metodo POST
      const res = await apiFetch('/auth/register', {  
        method: 'POST',
        body: { email, password, name }
      });

      showMessage('Registro exitoso. Ahora puedes iniciar sesión.', 'success');
      form.reset();   //Limpia el form de registro

      // Redirigir automáticamente al login
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);

    } catch (err) {
      showMessage(err.message || 'Error al registrar usuario.', 'error');
      console.error(err);
    }
  });

  function showMessage(text, type = 'info') { //Muestra mensaje de exito o error en el HTML 
    if (!messageEl) return; //Si no existe mensaje se sale de la funcion
    messageEl.textContent = text;
    messageEl.className = '';
    messageEl.classList.add(`msg-${type}`);
  }

  function clearMessage() {  //Borra el mensaje mostrado
    if (!messageEl) return;
    messageEl.textContent = '';
    messageEl.className = '';
  }
});
