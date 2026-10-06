// 1. Configuración de Firebase y Servicios Institucionales
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// Inicializar de manera segura para evitar duplicidad de instancias
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Referencias a los elementos del DOM de la interfaz
const modal = document.getElementById('modalTicket');
const form = document.getElementById('formRegistroTicket');
const modalTitulo = document.getElementById('modalTitulo');
const editDocId = document.getElementById('editDocId');

// --- 2. GESTIÓN DEL PANEL MODAL (FLOTANTE) ---
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modalTitulo.innerText = "Levantar Nuevo Ticket";
    editDocId.value = ""; 
    
    // Autoseleccionar la fecha actual por defecto al abrir el panel
    const hoy = new Date().toISOString().split('T')[0];
    const inputFecha = document.getElementById('ticketFechaPeticion');
    if (inputFecha) inputFecha.value = hoy;
    
    modal.style.display = 'flex';
});

document.getElementById('btnCancelarModal').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    editDocId.value = "";
});

// --- 3. ESCRITURA Y ACTUALIZACIÓN EN LA COLECCIÓN 'TICKETS' ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('ticketTipo').value;
    const marca = document.getElementById('ticketMarca').value;
    const modelo = document.getElementById('ticketModelo').value;
    const serie = document.getElementById('ticketSerie').value;
    const detalle = document.getElementById('ticketDetalle').value.trim();
    const condicion = document.getElementById('ticketCondicion').value;
    const fechaPeticion = document.getElementById('ticketFechaPeticion').value;
    const urgente = document.getElementById('ticketUrgente').value;
    const idParaEditar = editDocId.value;

    const emailUsuarioLogueado = localStorage.getItem("userEmail");

    if (!emailUsuarioLogueado) {
        alert("Error de sesión: Por favor vuelva a iniciar sesión.");
        window.location.href = "index.html";
        return;
    }

    try {
        const datosTicket = {
            tipo, marca, modelo, serie, detalle, condicion, fechaPeticion, urgente,
            usuarioEmail: emailUsuarioLogueado
        };

        if (idParaEditar) {
            // Edición de un registro existente
            await db.collection("tickets").doc(idParaEditar).update(datosTicket);
            alert("¡Ticket modificado correctamente!");
        } else {
            // Creación de un nuevo registro con marca de tiempo del servidor
            datosTicket.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("tickets").add(datosTicket);
            alert("¡Ticket añadido correctamente!");
        }

        form.reset();
        editDocId.value = "";
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error al procesar el ticket: ", error);
        alert("Error al procesar la operación: " + error.message);
    }
});





// --- 4. CONSULTA HISTORIAL DE TICKETS GENERADOS POR EL USUARIO ---
function cargarTicketsDelUsuario(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (!tbody) return;

        tbody.innerHTML = ""; 
        let index = 1;

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #777; padding: 20px;">No has levantado ningún ticket de mantenimiento aún.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const tr = document.createElement("tr");
            const badgeStyle = data.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';

            // Agregamos un indicador visual por si el ticket es urgente
            const formatoDetalle = data.urgente === 'Sí' ? `⚠️ <strong>[URGENTE]</strong> ${data.detalle}` : data.detalle;

            tr.innerHTML = `
                <td><strong>${index++}</strong></td>
                <td>${data.tipo || ''}</td>
                <td>${data.marca || ''}</td>
                <td>${data.modelo || ''}</td>
                <td>${data.serie || ''}</td>
                <td>${formatoDetalle || ''}</td>
                <td><span class="badge ${badgeStyle}">${data.condicion || ''}</span></td>
                <td>
                    <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' 
                        onclick="prepararEdicionTicket('${doc.id}', '${data.tipo}', '${data.marca}', '${data.modelo}', '${data.serie}', '${data.detalle}', '${data.condicion}', '${data.fechaPeticion}', '${data.urgente}')">
                        ✏️
                    </button>
                    <button class='btn-action-t' style='background-color: #dc4c64;' 
                        onclick="eliminarTicket('${doc.id}')">
                        🗑️
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error al cargar historial de tickets: ", error);
    });
}




// --- 5. FILTRAR MENÚ DESPLEGABLE: SOLO EQUIPOS DEL EMPLEADO LOGUEADO ---
// --- 5. FILTRAR MENÚ DESPLEGABLE: SOLO EQUIPOS DEL EMPLEADO LOGUEADO (OPTIMIZADO) ---
function cargarEquiposDelUsuarioLogueado(emailUsuario) {
    const selectEquipo = document.getElementById("ticketTipo");
    if (!selectEquipo) return;

    // Limpiamos el selector de inmediato para borrar residuos globales
    selectEquipo.innerHTML = '<option value="">Cargando tus equipos asignados...</option>';

    // Buscamos el nombre del empleado a través de su correo de cuenta activa
    db.collection("usuarios_encargados")
      .where("usuarioEmail", "==", emailUsuario)
      .get()
      .then((usuarioSnapshot) => {
          if (usuarioSnapshot.empty) {
              selectEquipo.innerHTML = '<option value="">Tu correo no está asignado a un Encargado</option>';
              return;
          }

          let nombreEmpleado = "";
          usuarioSnapshot.forEach((doc) => {
              nombreEmpleado = doc.data().nombreCompleto;
          });

          if (!nombreEmpleado) return;

          // Obtenemos de la base de datos de inventario ÚNICAMENTE los equipos de este empleado
          db.collection("equipos")
            .where("encargado", "==", nombreEmpleado.trim())
            .get()
            .then((equiposSnapshot) => {
                selectEquipo.innerHTML = '<option value="">-- Seleccione un Equipo de su Almacén --</option>';
                
                if (equiposSnapshot.empty) {
                    selectEquipo.innerHTML = '<option value="">No tienes equipos asignados a tu nombre</option>';
                    return;
                }

                equiposSnapshot.forEach((doc) => {
                    const datos = doc.data();
                    const descripcion = `${datos.tipo || 'Equipo'} - ${datos.marca || ''} ${datos.modelo || ''} (S/N: ${datos.serie || 'S/S'})`;
                    
                    const option = document.createElement("option");
                    option.value = datos.tipo;
                    option.textContent = descripcion;
                    
                    option.setAttribute('data-marca', datos.marca || '');
                    option.setAttribute('data-modelo', datos.modelo || '');
                    option.setAttribute('data-serie', datos.serie || '');

                    selectEquipo.appendChild(option);
                });
            }).catch((err) => {
                console.error("Error al obtener equipos del encargado:", err);
                selectEquipo.innerHTML = '<option value="">Error al cargar tus equipos</option>';
            });
      }).catch((err) => {
          console.error("Error al cargar selector de equipos:", err);
          selectEquipo.innerHTML = '<option value="">Error de sincronización</option>';
      });
}





// Escuchador para autocompletar cajas técnicas al cambiar la opción seleccionada
document.getElementById("ticketTipo").addEventListener("change", (e) => {
    const option = e.target.options[e.target.selectedIndex];
    if (!option || e.target.value === "") {
        document.getElementById("ticketMarca").value = "";
        document.getElementById("ticketModelo").value = "";
        document.getElementById("ticketSerie").value = "";
        return;
    }
    document.getElementById("ticketMarca").value = option.getAttribute('data-marca');
    document.getElementById("ticketModelo").value = option.getAttribute('data-modelo');
    document.getElementById("ticketSerie").value = option.getAttribute('data-serie');
});

// --- 6. PREPARAR EDICIÓN (CON NUEVOS CAMPOS) ---
window.prepararEdicionTicket = function(id, tipo, marca, modelo, serie, detalle, condicion, fechaPeticion, urgente) {
    modalTitulo.innerText = "Modificar Ticket de Mantenimiento";
    editDocId.value = id;

    document.getElementById('ticketTipo').value = tipo;
    document.getElementById('ticketMarca').value = marca;
    document.getElementById('ticketModelo').value = modelo;
    document.getElementById('ticketSerie').value = serie;
    document.getElementById('ticketDetalle').value = detalle;
    document.getElementById('ticketCondicion').value = condicion;
    document.getElementById('ticketFechaPeticion').value = fechaPeticion || "";
    document.getElementById('ticketUrgente').value = urgente || "No";

    modal.style.display = 'flex';
};

// --- 7. ELIMINACIÓN ---
window.eliminarTicket = function(id) {
    if (confirm("¿Está seguro de que desea eliminar este ticket de mantenimiento?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => alert("Ticket eliminado correctamente."))
            .catch((error) => alert("Error al eliminar: " + error.message));
    }
};

// --- 8. LOGOUT ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

// --- 9. INICIALIZADOR DEL SISTEMA ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        // Carga la tabla con los tickets que ha generado el usuario logueado
        cargarTicketsDelUsuario(storedEmail);
        
        // Filtra el menú desplegable del formulario para mostrar solo sus equipos
        cargarEquiposDelUsuarioLogueado(storedEmail);
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});

