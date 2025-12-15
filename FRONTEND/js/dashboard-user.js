//Vista de usuario para gestionar sus reservas y ver sus reservas creadas.
(function () {
  const POLL_INTERVAL_MS = 20000;
  let pollTimer = null;

  document.addEventListener('DOMContentLoaded', () => {
    // Requiere sesión; si no hay token, detiene la carga
    if (!requireAuth()) return;

    // Llama el ID del DOM logout-link, escucha el evento hacer clcick y llama a la funcion logout() para redirigir a login.
    const logoutLink = document.getElementById('logout-link');
    logoutLink?.addEventListener('click', (e) => {
      e.preventDefault();
      logout();  //Borra token usuario y redirige.
    });

    // Carga inicial de reservas del usuario se ve vacia si es primera vez que va hacer una reserva despues de registrarse.
    loadMyReservations();

    // Manejo del formulario de creación
    const form = document.getElementById('create-reservation-form'); //Obtiene el formulario por id 
    form?.addEventListener('submit', async (e) => {    //escucha el evento submit del formulario para crear reserva
      e.preventDefault();             //Evita recargar la pagina 
      clearMessage();
      setFormDisabled(form, true);    //Deshabilita el formulario mientras procesa la solicitud

      try {
        const payload = readReservationForm(form);  //Obtiene el tipo de habitacion, fechas y demas inf del formulario

        // Validaciones básicas de fechas
        const valid = validateDateRange(payload.startDate, payload.endDate);   //Valida que fin no sea antes que la fecha de inicio
        if (!valid.ok) {             //Si no concuerda el rango muestra error
          showMessage(valid.message, 'error');
          return;
        }

        // Verificación de solapamiento en cliente contra reservas existentes
        const existing = await apiFetch('/reservations/mine');  //Llama al backend para obtener las reservas del usuario actual
        if (hasOverlap(existing, payload)) {   //hasOverlap verifica si hay repeticiones en alojamiento, tipo y fechas
          showMessage('Ya hay reserva en esas fechas para este alojamiento/tipo.', 'error');
          return;
        }

        // Crear reserva en backend
        await apiFetch('/reservations', { method: 'POST', body: payload }); //Llama la tabla reservations del back para crear una nueva reserva con el payload del formulario del front
        showMessage('Reserva creada correctamente.', 'success');
        form.reset();

        
        await loadMyReservations(); //Recarga las reservas del usuario para mostrar la nueva reserva creada en su sesion iniciada.
      } catch (err) {
        showMessage(err.message || 'Error al crear la reserva', 'error');
        console.error(err);
      } finally {
        setFormDisabled(form, false);
      }
    });

    //Refresca las reservas creadas del viajero cada 20 segundos.
    pollTimer = setInterval(loadMyReservations, POLL_INTERVAL_MS);
  });

  window.addEventListener('beforeunload', () => { //Al cerrar la pestaña o cambiar de URL
    if (pollTimer) clearInterval(pollTimer);    //El temporizador se detiene para evitar procesos abiertos.
  });


  //FUncion para cargar las reservas del usuario autenticado.
  async function loadMyReservations() {
    const container = document.getElementById('reservas-container'); //Busca el contenedor donde se listan las reservas
    if (container) container.innerHTML = '<p>Cargando tus reservas...</p>';//Muestra mensaje de cargando mientras el back responde.

    try {  
      const data = await apiFetch('/reservations/mine'); //Pide al back las reservas del usuario
      renderReservations(container, data);   //Llama a la funcion para mostrar las reservas en el contenedor del HTML
    } catch (err) {
      if (container) container.innerHTML = '<p>Error al cargar tus reservas.</p>';
      console.error(err);
    }
  }

  function renderReservations(container, data) {
    if (!container) return;    //Valida el contenedor
    if (!Array.isArray(data) || data.length === 0) {    //Si no hay reservas muestra este mensaje
      container.innerHTML = '<p>No tienes reservas registradas.</p>';
      return;
    }

    //Cada reserva muestra todos sus datos y los manda al contenedor reservas-list y va creando la lista
    const html = data.map(r => `
      <div class="reserva-user" data-id="${r.id}">
        <h3>Reserva #${r.id} — ${badgeStatus(r.status)}</h3>
        <p><strong>Alojamiento:</strong> ${r.accommodationTitle ?? '—'}</p>
        <p><strong>Tipo de reserva:</strong> ${humanRoomType(r.roomType) ?? '—'}</p>
        <p><strong>Desde:</strong> ${formatDate(r.startDate)} — <strong>Hasta:</strong> ${formatDate(r.endDate)}</p>
        <p><strong>Total:</strong> ${r.totalPrice ?? '—'}</p>
        <p><small>Creada: ${r.createdAt ? formatDate(r.createdAt) : '—'}</small></p>

        <div class="user-actions">
          ${canCancel(r) ? `<button class="btn-cancel" data-id="${r.id}" title="Cancelar reserva">Cancelar</button>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = html; //Se une toda la lista y lo manda al section

    //Boton de cancelar
    container.querySelectorAll('.btn-cancel').forEach(btn => { //Recorre cada boton
      btn.addEventListener('click', async (e) => {     //Escucha al hacer click
        const id = e.currentTarget.getAttribute('data-id');   //ID de la reserva que va cancelar
        if (!id) return;
        const ok = confirm(`¿Seguro que deseas cancelar la reserva #${id}?`);   //Pide confirmacion
        if (!ok) return;

        try {
          await apiFetch(`/reservations/${id}/cancel`, { method: 'POST' }); //LLama al back para cancelar la reserva con el ID
          showMessage('Reserva cancelada.', 'success');

          // Actualizar la tarjeta en el DOM cambia el estado a cancelado
          const card = container.querySelector(`.reserva-user[data-id="${id}"]`);
          if (card) {
            const h3 = card.querySelector('h3');
            if (h3) h3.innerHTML = `Reserva #${id} — ${badgeStatus('cancelado')}`;
            const actions = card.querySelector('.user-actions');
            if (actions) actions.innerHTML = '';
          }
        } catch (err) {
          showMessage(err.message || 'Error al cancelar la reserva', 'error');
          console.error(err);
        }
      });
    });
  }

  // funcion para leer los datos del formulario de reserva
  function readReservationForm(form) {
    const accommodationId = document.getElementById('accommodationId')?.value;
    const roomType = document.getElementById('roomType')?.value;
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;

    return {
      accommodationId,     // string o número según backend
      roomType,            // 'single' | 'double' | 'full'
      startDate,           // 'YYYY-MM-DD'
      endDate              // 'YYYY-MM-DD'
      // notes: puedes añadir si luego agregas un textarea
    };
  }

  function validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) {     //Valida que ambas fechas esten seleccionadas
      return { ok: false, message: 'Debes seleccionar ambas fechas.' };
    }
    const start = new Date(startDate); //Convierte las fechas a objetos Date para comparar
    const end = new Date(endDate);          //Convierte las fechas a objetos Date para comparar
    const today = new Date();               //Fecha actual

    // Normalizar horas para comparar solo fechas
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    if (end < start) return { ok: false, message: 'La fecha fin no puede ser anterior a la fecha inicio.' };
    if (start < today) return { ok: false, message: 'No puedes reservar en fechas pasadas.' };
    return { ok: true };
  }

  // Verifica repeticion de reservas existentes del usuario
  function hasOverlap(existingReservations, newRes) {
    if (!Array.isArray(existingReservations)) return false; //Si no es un array no hay repeticion

    const newStart = new Date(newRes.startDate); // Convierte la fecha de entrada y de salida a objetos Date(fechas)
    const newEnd = new Date(newRes.endDate);

    // Consideramos repeticion si:
    // - Mismo alojamiento
    // - Mismo tipo de reserva
    // - Estado actual de la reserva existente no es 'cancelled'
    // - Rangos de fecha repetidos:
    return existingReservations.some(r => { //Recorre todas las reservas existentes
      if (!r) return false;   //Si no hay reserva pasa a la siguiente
      const sameAcc = String(r.accommodationId ?? r.accommodation?.id ?? '') === String(newRes.accommodationId ?? ''); //Compara si el alojamiento es el mismo al alojamiento nuevo
      const sameType = String(r.roomType ?? '') === String(newRes.roomType ?? '');   //Compara si el tipo de habitacion es el mismo al tipo nuevo
      const isActive = r.status !== 'cancelled';   //Verifica que el estado de la reserva no sea cancelada

      if (!sameAcc || !sameType || !isActive) return false; //Si no coincide alguno retorna

      const rStart = new Date(r.startDate);  //Convierte las fechas a objetos de tipo Date
      const rEnd = new Date(r.endDate);
      return (newStart <= rEnd) && (rStart <= newEnd); //Por ultimo verifica si se repiten las fechas
    });
  }

  //Deshabilita o habilita todos los campos del formulario mientras se procesa la petición.
  function setFormDisabled(form, disabled) {
    if (!form) return;
    Array.from(form.elements).forEach(el => {
      if ('disabled' in el) el.disabled = disabled;
    });
  }

  //Muestra mensajes de exito o error en el HTML
  function showMessage(text, type = 'info') {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = text;
    el.className = ''; // limpia clases anteriores
    el.classList.add(`msg-${type}`); // msg-success | msg-error | msg-info
  }

  //Borra el mensaje mostradp
  function clearMessage() {
    const el = document.getElementById('message');
    if (!el) return;
    el.textContent = '';
    el.className = '';
  }

  // --- Presentación ---

  function formatDate(dateStr) { //Convierte una fecha en formato YYYY-MM-DD para usarlo en el front
    return new Date(dateStr).toLocaleDateString();
  }
 
  function humanRoomType(rt) {  //Convierte el tipo de habitacion de codigo a texto legible
    const map = { single: 'Habitación sencilla', double: 'Habitación doble', full: 'Alojamiento completo' };
    return map[rt] || rt;
  }

  function badgeStatus(status) {//Almacena los diferentes estados en string, clave valor para el objeto map
    const map = {
      pending: '<span class="badge badge-pending">pendiente</span>',
      confirmed: '<span class="badge badge-confirmed">confirmada</span>',
      cancelled: '<span class="badge badge-cancelled">cancelada</span>',
      finished: '<span class="badge badge-finished">finalizada</span>',
    };
    return map[status] || `<span class="badge">${status ?? '—'}</span>`; //Valor por defecto si no coincide
  }
})();
