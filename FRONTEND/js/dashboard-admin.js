// public/js/dashboard-admin.js
// Requiere api.js y auth.js cargados antes

(function () {
  const POLL_INTERVAL_MS = 15000; // Variable de actualizacion automatica cada 15 segundos
  let lastKnownIds = new Set();    //Conjunto para almacenar los IDs de las reservas conocidas y detectar nuevas reservas.
  let pollTimer = null;           //Es el contro remoto del temporizador que es cada 15 segundos. Esta en null porque no ha iniciado aun.

    document.addEventListener('DOMContentLoaded', () => {   //Espera que se cargue el DOM osea todo el HTML
    // Logout
    const logoutLink = document.getElementById('logout-link');   //A esta variable se le asigna el ID de cerrar sesion
    if (logoutLink) logoutLink.addEventListener('click', (e) => { e.preventDefault(); logout(); }); //Si escucha el evento de hacer click en cerrar sesion, recarga la pagina de login.

    // Cuando damos click en filtrar captura los valores de las fechas(date) por el ID y llama a la funcion loadReservations
    document.getElementById('filter-btn')?.addEventListener('click', () => { //Escucha el evento para ejecutarse cuando hacemos click en Filtrar
      const from = document.getElementById('from').value;
      const to = document.getElementById('to').value;
      loadReservations({ from, to, notifyOnNew: false }); //Trae las reservas en el rango de fechas seleccionado y no notifica de nuevas reservas.
    });

    // Refresh manual
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
      const from = document.getElementById('from').value;
      const to = document.getElementById('to').value;
      loadReservations({ from, to, notifyOnNew: true });  //Aca es lo mismo de filtrar pero notifica si hay nuevas reservas en el rango de fecha.
    });

    // Carga inicial
    loadReservations({ notifyOnNew: false }); //Carga las reservas al iniciar la pagina sin notificar nuevas reservas.

    // setInterval es una función propia de JavaScript que ejecuta un bloque de código cada cierto tiempo (en milisegundos).
    // En este caso, cada 15 segundos (POLL_INTERVAL_MS), se ejecuta la función que carga las reservas.
    pollTimer = setInterval(() => {
      const from = document.getElementById('from').value;
      const to = document.getElementById('to').value;
      loadReservations({ from, to, notifyOnNew: true });  //notifyOnNew en true para que notifique si hay nuevas reservas.
    }, POLL_INTERVAL_MS);
  });

  window.addEventListener('beforeunload', () => {   //Cuando la pagina se cierre o cambie de URL hace lo siguiente
    if (pollTimer) clearInterval(pollTimer);   //Si el temporizador esta activo lo detiene para que no queden procesos abiertos.
  });

  //En esta funcion vamos a llamar al servidor para traer las reservas en el rango de fechas indicado.
  async function loadReservations({ from, to, notifyOnNew = false } = {}) { //El parametro es un objeto con from, to y notifyOnNew
    const params = new URLSearchParams();    //Arma los parametros (clave=valor) de from y to.
    if (from) params.append('from', from);  //append agrega el parametro a from si tiene algun valor
    if (to) params.append('to', to);           //agrega algun parametro a to si tiene valor.
    //Resultado: si ambos existen, se arma algo como ?from=2025-12-01&to=2025-12-15.




    //Se abre bloque para capturar errores
    try {
      const data = await apiFetch(`/reservations?${params.toString()}`); //Llamada HTTP al backend de la tabla reservations con la URL armada con los parametros (params)
      //data = contiene los datos de la reserva id, userName, startDate, etc.
      
      renderReservations(data); //Aqui es donde llama esta funcion con el objeto de las reservas para mostrarlas en el HTML en el contenedor(section) reservas-list.

      // Detectar nuevas reservas
      const currentIds = new Set((data || []).map(r => r.id)); //Se crea un set para que no se repitan los IDS de las reservas.
      const hadIds = lastKnownIds.size > 0; //Si hay mas de 0 IDS entonces no es la primera carga y se vuelve true.
    
      if (notifyOnNew && hadIds) {    //Si se pidio la notificacion y no es la primera carga osea los dos en true entra
        let foundNew = false;
        currentIds.forEach(id => {              //Recorre todos los IDS actuales
          if (!lastKnownIds.has(id)) foundNew = true;     //Pregunta si ese ID ya estaba, si no estaba significa que es una reserva nueva y se vuelve true 
        });
        if (foundNew) showNotify(); //Si encontro nueva reserva llama la funcion para mostrar la notificacion.
      }
      lastKnownIds = currentIds; //Actualiza el set de IDS conocidos con los actuales.
      updateMetaTimestamp();       //Actualiza la fecha y hora de la ultima actualizacion en el HTML
    } catch (err) {
      document.getElementById('reservas-list').innerHTML = '<p>Error al cargar reservas.</p>'; //Si no hace el try muestra este mensaje de error.
      console.error(err);
    }
  }

  function renderReservations(data) {   //Cada reserva se convierte en un bloque visual con sus datos y botones de acción.
    const container = document.getElementById('reservas-list');
    if (!Array.isArray(data) || data.length === 0) {
      container.innerHTML = '<p>No hay reservas en ese rango.</p>';
      return;
    }

    //Cada reserva muestra todos sus datos y los manda al contenedor reservas-list y va creando la lista 
    const html = data.map(r => `  
      <div class="reserva-admin" data-id="${r.id}">
        <h3>Reserva #${r.id} — ${r.status}</h3>
        <p><strong>Usuario:</strong> ${r.userName || r.userId} — <strong>Email:</strong> ${r.userEmail || '—'}</p>
        <p><strong>Tipo:</strong> ${r.roomType || '—'}</p>
        <p><strong>Alojamiento:</strong> ${r.accommodationTitle || 'Alojamiento único'}</p>
        <p><strong>Desde:</strong> ${formatDateTime(r.startDate)} — <strong>Hasta:</strong> ${formatDateTime(r.endDate)}</p>
        <p><strong>Teléfono:</strong> ${r.userPhone || '—'}</p>
        <p><strong>Precio:</strong> ${r.totalPrice || '—'}</p>
        <p><strong>Notas:</strong> ${r.notes || '—'}</p>
        <p><small>Creada: ${r.createdAt ? formatDateTime(r.createdAt) : '—'}</small></p>

        <div class="admin-actions">
          <button class="btn-delete" data-id="${r.id}" title="Eliminar reserva">Eliminar</button>
        </div>
      </div>
    `).join('');
    container.innerHTML = html; //Se une toda la lista y lo manda al section

    // Selecciona todos los botones de eliminar del contenedor de la lista de reservas
    container.querySelectorAll('.btn-delete').forEach(btn => {  //Recorre cada boton
      btn.addEventListener('click', async (e) => {             //Le registrra un escuchador de evento click
        const id = e.currentTarget.getAttribute('data-id');  //Obtiene el atributo de data-id osea el ID de la resera
        if (!id) return;    //Si no hay ID pasa al siguiente ciclo.
        const ok = confirm(`¿Seguro que deseas eliminar la reserva #${id}?`);  //Confirmacion
        if (!ok) return;  // Si el usuario cancelo , osea que esta en false pasa al siguiente ciclo.
        try {
          await apiFetch(`/reservations/${id}`, { method: 'DELETE' }); //Hace el llamado a la tabla reservations y busca el id de la reserva para hacer el metodo DELETE y eliminarla.
          // Remover del DOM la tarjeta eliminada
          const card = container.querySelector(`.reserva-admin[data-id="${id}"]`); //Busca en el DOM la reserva eliminada.
          if (card) card.remove();  // Si la encuentra elimina la tarjeta del DOM.
          // Actualizar memoria de IDs para notificación
          lastKnownIds.delete(Number(id));   //Actualiza el set eliminando el ID de la reserva eliminada
        } catch (err) {
          alert(err.message || 'Error al eliminar la reserva'); //Si no hay exito muestra este error.
          console.error(err);
        }
      });
    });
  }

  function showNotify() {  //Esta funcion muestra una notificacion cuando llega una nueva reserva.
    const bar = document.getElementById('notify');  //Busca el contenedor de notificacion en el HTML
    if (!bar) return;    //Si no lo encuentra se sale de la funcion.
    bar.classList.add('show');    //Hace visible mi contenedor de notificaciones.
    setTimeout(() => bar.classList.remove('show'), 5000); //La notificacion aparece y se oculta a los 5 segundos.

    try {    //Podemos poner un sonido para cuando llegue la notificacion.
      const audio = new Audio('assets/notify.mp3');
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function updateMetaTimestamp() {   //Actualiza la fecha y hora de la ultima actualizacion en el HTML
    const el = document.getElementById('reservas-meta');   //Trae el contenedor y lo asigna a const el
    if (!el) return;
    el.textContent = `Última actualización: ${new Date().toLocaleString()}`; //new date crea un objeto con la hora y fecha actual del sistema y con toLocaleString lo convierte a un formato legible.
  }

  function formatDateTime(dateStr) {  //se usa dentro de renderReservations para mostrar las fechas de inicio, fin y creación de cada reserva en un formato de texto.
    return new Date(dateStr).toLocaleString();
  }
})();
