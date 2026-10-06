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
// NUEVO: Escuchar la tecla 'ESC' para cerrar la ventana flotante
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        form.reset();
        editDocId.value = "";
    }
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
// --- VARIABLES GLOBALES PARA EL BUSCADOR EN TIEMPO REAL ---
let ticketsLocales = []; // Almacén en caché local de los tickets del usuario

// --- 4. CONSULTA HISTORIAL DE TICKETS GENERADOS POR EL USUARIO EN SESIÓN ---
function cargarTicketsDelUsuario(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        
        // Limpiamos y respaldamos los datos de la base de datos en nuestro arreglo local
        ticketsLocales = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            ticketsLocales.push({
                id: doc.id,
                ...data
            });
        });

        // Ejecutamos la función de renderizado inicial con todos los registros
        inyectarTicketsEnTabla(ticketsLocales);

    }, (error) => {
        console.error("Error al cargar historial de tickets: ", error);
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #dc4c64; padding: 20px;">Error de permisos al sincronizar los tickets.</td></tr>`;
        }
    });
}

// --- FUNCIÓN AUXILIAR: PINTAR LAS FILAS EN LA TABLA PRINCIPAL ---
function inyectarTicketsEnTabla(listaDeTickets) {
    const tbody = document.getElementById("tablaTicketsCuerpo");
    if (!tbody) return;

    tbody.innerHTML = ""; 
    let index = 1;

    if (listaDeTickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #777; padding: 20px;">No se encontraron tickets que coincidan con la búsqueda o tu cuenta.</td></tr>`;
        return;
    }

    listaDeTickets.forEach((ticket) => {
        const tr = document.createElement("tr");
        
        // Estilos estéticos condicionales para las etiquetas de control
        const badgeCondicion = ticket.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';
        const badgeUrgencia = ticket.urgente === 'Sí' ? 'badge-urgente' : 'badge-normal';

        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${ticket.fechaPeticion || 'S/F'}</td>
            <td><span class="badge ${badgeUrgencia}">${ticket.urgente || 'No'}</span></td>
            <td>${ticket.tipo || ''}</td>
            <td>${ticket.marca || ''}</td>
            <td>${ticket.modelo || ''}</td>
            <td>${ticket.detalle || ''}</td>
            <td><span class="badge ${badgeCondicion}">${ticket.condicion || ''}</span></td>
            <td>
                <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' 
                    onclick="prepararEdicionTicket('${ticket.id}', '${ticket.tipo}', '${ticket.marca}', '${ticket.modelo}', '${ticket.serie}', '${ticket.detalle}', '${ticket.condicion}', '${ticket.fechaPeticion}', '${ticket.urgente}')">
                    ✏️
                </button>
                <button class='btn-action-t' style='background-color: #dc4c64;' 
                    onclick="eliminarTicket('${ticket.id}')">
                    🗑️
                </button>
            </td>
        `;
        tbody.appendChild(tr);
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
// --- 9. INICIALIZADOR DE CARGA Y EVENTO DE BÚSQUEDA ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");
    const inputBuscar = document.getElementById("inputBuscar");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        // Pinta la tabla con el historial de tickets generados por la cuenta activa
        cargarTicketsDelUsuario(storedEmail);
        
        // Carga los equipos que corresponden al empleado logueado en la ventana flotante
        cargarEquiposDelUsuarioLogueado(storedEmail);
        
        // ESCUCHADOR EN TIEMPO REAL PARA EL INPUT DE BÚSQUEDA
        if (inputBuscar) {
            inputBuscar.addEventListener("input", (e) => {
                const textoBusqueda = e.target.value.toLowerCase().trim();
                
                // Si la barra está vacía, mostramos todos los registros guardados
                if (textoBusqueda === "") {
                    inyectarTicketsEnTabla(ticketsLocales);
                    return;
                }
                
                // Filtramos la caché local buscando coincidencias en múltiples campos técnicos
                const ticketsFiltrados = ticketsLocales.filter((ticket) => {
                    const tipo = (ticket.tipo || "").toLowerCase();
                    const marca = (ticket.marca || "").toLowerCase();
                    const modelo = (ticket.modelo || "").toLowerCase();
                    const detalle = (ticket.detalle || "").toLowerCase();
                    
                    return tipo.includes(textoBusqueda) || 
                           marca.includes(textoBusqueda) || 
                           modelo.includes(textoBusqueda) || 
                           detalle.includes(textoBusqueda);
                });
                
                // Actualizamos la interfaz gráfica con los resultados del filtro
                inyectarTicketsEnTabla(ticketsFiltrados);
            });
        }
        
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});




