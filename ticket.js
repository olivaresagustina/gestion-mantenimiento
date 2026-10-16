// 1. Configuración de Firebase y Servicios Institucionales Oficiales
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

const modal = document.getElementById('modalTicket');
const form = document.getElementById('formRegistroTicket');
const modalTitulo = document.getElementById('modalTitulo');
const editDocId = document.getElementById('editDocId');

// --- VARIABLES ADICIONALES DEL DOM PARA EL CHAT INTERACTIVO DEL USUARIO ---
const panelChatUser = document.getElementById('panelChatUsuario');
const contenedorMsgsUser = document.getElementById('chatUsuarioMensajes');
const formChatUser = document.getElementById('formResponderChatUsuario');
let desuscribirChatUser = null;

// Cierre manual de la sala del chat en espejo
if (document.getElementById('btnCerrarChatUsuario')) {
    document.getElementById('btnCerrarChatUsuario').addEventListener('click', () => {
        panelChatUser.style.display = 'none';
        if (desuscribirChatUser) { 
            desuscribirChatUser(); 
            desuscribirChatUser = null; 
        }
    });
}

// --- 2. GESTIÓN DEL PANEL MODAL FLOTANTE ---
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modalTitulo.innerText = "Levantar Nuevo Ticket";
    editDocId.value = ""; 
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

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        form.reset();
        editDocId.value = "";
    }
});

// --- 3. ESCRITURA, ALMACENAMIENTO Y CONTROL DEL STATUS DEFAULT ---
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
            // Edición: Actualiza manteniendo sus datos previos
            await db.collection("tickets").doc(idParaEditar).update(datosTicket);
            alert("¡Ticket modificado correctamente!");
        } else {
            // Inyección automática del Status por defecto al crear
            datosTicket.status = "Abierto";
            datosTicket.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("tickets").add(datosTicket);
            alert("¡Ticket añadido correctamente!");
        }

        form.reset();
        editDocId.value = "";
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error al procesar el ticket: ", error);
        alert("Error al procesar la operation: " + error.message);
    }
});
// --- 4. CONSULTA HISTORIAL DE TICKETS GENERADOS POR EL USUARIO EN SESIÓN ---
let ticketsLocales = []; 

function cargarTicketsDelUsuario(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        
        ticketsLocales = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            ticketsLocales.push({
                id: doc.id,
                ...data
            });
        });

        inyectarTicketsEnTabla(ticketsLocales);

    }, (error) => {
        console.error("Error al cargar historial de tickets: ", error);
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px;">Error de permisos al sincronizar los tickets.</td></tr>`;
        }
    });
}

// --- FUNCIÓN AUXILIAR: PINTAR LAS FILAS E INYECTAR LA COLUMNA STATUS Y EVENTO CHAT ---
function inyectarTicketsEnTabla(listaDeTickets) {
    const tbody = document.getElementById("tablaTicketsCuerpo");
    if (!tbody) return;

    tbody.innerHTML = ""; 
    let index = 1;

    if (listaDeTickets.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No se encontraron tickets que coincidan con la búsqueda o tu cuenta.</td></tr>`;
        return;
    }

    listaDeTickets.forEach((ticket) => {
        const tr = document.createElement("tr");
        tr.style.cursor = "pointer"; // Indica visualmente que toda la fila es interactiva
        
        const badgeCondicion = ticket.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';
        const badgeUrgencia = ticket.urgente === 'Sí' ? 'badge-urgente' : 'badge-normal';
        const statusActual = ticket.status || "Abierto";

        // Renderizado de las 10 columnas alineadas exactamente con la estructura de tu HTML
        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${ticket.fechaPeticion || 'S/F'}</td>
            <td><span class="badge ${badgeUrgencia}">${ticket.urgente || 'No'}</span></td>
            <td>${ticket.tipo || ''}</td>
            <td>${ticket.marca || ''}</td>
            <td>${ticket.modelo || ''}</td>
            <td>${ticket.detalle || ''}</td>
            <td><span class="badge ${badgeCondicion}">${ticket.condicion || ''}</span></td>
            <td><span class="badge badge-funcional" style="background-color: #2c9faf; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px;">${statusActual}</span></td>
            <td>
                <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' id="btnEditar-${ticket.id}">
                    ✏️
                </button>
                <button class='btn-action-t' style='background-color: #dc4c64;' id="btnEliminar-${ticket.id}">
                    🗑️
                </button>
            </td>
        `;

        // Detener la propagación del clic en el botón de edición para que no abra el chat por accidente
        tr.querySelector(`#btnEditar-${ticket.id}`).addEventListener('click', (e) => {
            e.stopPropagation();
            prepararEdicionTicket(ticket.id, ticket.tipo, ticket.marca, ticket.modelo, ticket.serie, ticket.detalle, ticket.condicion, ticket.fechaPeticion, ticket.urgente);
        });

        // Detener la propagación del clic en el botón de eliminación
        tr.querySelector(`#btnEliminar-${ticket.id}`).addEventListener('click', (e) => {
            e.stopPropagation();
            eliminarTicket(ticket.id);
        });

        // COMPORTAMIENTO INTEGRADOR: Dar clic en cualquier parte libre de la fila despliega el chat en espejo abajo
        tr.addEventListener('click', () => {
            activarChatDesdeUsuario(ticket);
        });

        tbody.appendChild(tr);
    });
}
// --- 5. ENLACE REACTIVO CON LA SUBCOLECCIÓN DE CHAT DESDE EL USUARIO ---
function activarChatDesdeUsuario(ticket) {
    if (desuscribirChatUser) desuscribirChatUser();

    document.getElementById('chatUsuarioTicketId').value = ticket.id;
    
    document.getElementById('chatUsuarioResumen').innerHTML = `
        <strong>Equipo en Revisión:</strong> ${ticket.tipo || 'Computadora'} ${ticket.marca || ''} (${ticket.modelo || ''})<br>
        <strong>Falla reportada:</strong> "${ticket.detalle || 'Sin detalle'}"
    `;

    desuscribirChatUser = db.collection("tickets")
        .doc(ticket.id)
        .collection("chat")
        .orderBy("fechaEnvio", "asc")
        .onSnapshot((snapshot) => {
            contenedorMsgsUser.innerHTML = "";

            if (snapshot.empty) {
                contenedorMsgsUser.innerHTML = `<em style="color: #aaa; text-align: center; display: block; margin-top: 15px;">No hay mensajes previos. El personal de Soporte Técnico iniciará el contacto por aquí.</em>`;
                return;
            }

            snapshot.forEach((doc) => {
                const msg = doc.data();
                const burbuja = document.createElement("div");
                
                burbuja.style.maxWidth = "75%";
                burbuja.style.padding = "8px 14px";
                burbuja.style.borderRadius = "8px";
                burbuja.style.fontSize = "13px";
                burbuja.style.lineHeight = "1.4";
                burbuja.style.display = "flex";
                burbuja.style.flexDirection = "column";

                if (msg.remitenteRol === "Administrador") {
                    burbuja.style.backgroundColor = "#eef2f3";
                    burbuja.style.color = "#333";
                    burbuja.style.alignSelf = "flex-start";
                    burbuja.style.border = "1px solid #ddd";
                    burbuja.style.borderBottomLeftRadius = "0";
                } else {
                    burbuja.style.backgroundColor = "#5c1424"; 
                    burbuja.style.color = "white";
                    burbuja.style.alignSelf = "flex-end";
                    burbuja.style.borderBottomRightRadius = "0";
                }

                let horaTexto = "S/H";
                if (msg.fechaEnvio) {
                    const date = msg.fechaEnvio.toDate();
                    horaTexto = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                burbuja.innerHTML = `
                    <span>${msg.texto}</span>
                    <span style="font-size: 9px; margin-top: 4px; text-align: right; opacity: 0.7;">
                        ${msg.remitenteNombre} • ${horaTexto}
                    </span>
                `;
                contenedorMsgsUser.appendChild(burbuja);
            });

            contenedorMsgsUser.scrollTop = contenedorMsgsUser.scrollHeight;
        }, (error) => {
            console.error("Error al sincronizar el chat del usuario:", error);
        });

    panelChatUser.style.display = 'block';
    panelChatUser.scrollIntoView({ behavior: 'smooth' });
}

// --- 6. PERSISTENCIA: ENVIAR RESPUESTA DEL USUARIO A LA SUBCOLECCIÓN ---
formChatUser.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId = document.getElementById('chatUsuarioTicketId').value;
    const textoMensaje = document.getElementById('inputMensajeUsuario').value.trim();
    const correoUsuario = localStorage.getItem("userEmail");

    if (!ticketId || !textoMensaje) return;

    try {
        await db.collection("tickets").doc(ticketId).collection("chat").add({
            texto: textoMensaje,
            remitenteEmail: correoUsuario,
            remitenteNombre: "Usuario / Solicitante",
            remitenteRol: "Usuario",
            fechaEnvio: firebase.firestore.FieldValue.serverTimestamp()
        });

        formChatUser.reset();
    } catch (error) {
        console.error("Error al registrar el mensaje del usuario:", error);
        alert("No se pudo enviar la respuesta: " + error.message);
    }
});
// --- 7. FILTRAR MENÚ DESPLEGABLE: SOLO EQUIPOS DEL EMPLEADO LOGUEADO ---
function cargarEquiposDelUsuarioLogueado(emailUsuario) {
    const selectEquipo = document.getElementById("ticketTipo");
    if (!selectEquipo) return;

    selectEquipo.innerHTML = '<option value="">Cargando tus equipos asignados...</option>';

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

// --- 8. PREPARAR EDICIÓN (PRESERVA LOS CAMPOS ANTERIORES) ---
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

// --- 9. ELIMINACIÓN DE REGISTROS ---
window.eliminarTicket = function(id) {
    if (confirm("¿Está seguro de que desea eliminar este ticket de mantenimiento?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => alert("Ticket eliminado correctamente."))
            .catch((error) => alert("Error al eliminar: " + error.message));
    }
};

// --- 10. LOGOUT INSTITUCIONAL ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

// --- 11. INICIALIZADOR DE CARGA Y EVENTO DE BÚSQUEDA ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");
    const inputBuscar = document.getElementById("inputBuscar");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        cargarTicketsDelUsuario(storedEmail);
        cargarEquiposDelUsuarioLogueado(storedEmail);
        
        if (inputBuscar) {
            inputBuscar.addEventListener("input", (e) => {
                const textoBusqueda = e.target.value.toLowerCase().trim();
                
                if (textoBusqueda === "") {
                    inyectarTicketsEnTabla(ticketsLocales);
                    return;
                }
                
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
                
                inyectarTicketsEnTabla(ticketsFiltrados);
            });
        }
        
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});
