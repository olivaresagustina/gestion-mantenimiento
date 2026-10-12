// ==========================================================================
// 1. CONFIGURACIÓN DE FIREBASE E INSTANCIAS DE CONEXIÓN
// ==========================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKlQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// Inicializar Firebase de forma segura evitando duplicidad de instancias
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Almacén en caché local para los tickets consultados
let ticketsLocales = [];
let idTicketSeleccionado = "";

// ==========================================================================
// 2. CONSULTA EN TIEMPO REAL A LA NUBE (FIRESTORE)
// ==========================================================================
function cargarBandejaDeEntrada(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        
        // Limpiamos la caché local antes de meter los datos nuevos
        ticketsLocales = [];
        
        snapshot.forEach((doc) => {
            ticketsLocales.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Pintamos las tarjetas interactivas en la pantalla
        inyectarTicketsComoTarjetas(ticketsLocales);

    }, (error) => {
        console.error("Error al sincronizar las tarjetas de la bandeja: ", error);
        const contenedor = document.getElementById("ticketInboxCardsCuerpo");
        if (contenedor) {
            contenedor.innerHTML = `<div style="text-align: center; padding: 20px; color: #dc4c64;">Error de comunicación con la base de datos de Calnali.</div>`;
        }
    });
}

// ==========================================================================
// 3. RENDERIZADO DINÁMICO DE TARJETAS (ESTILO BANDEJA DE ENTRADA)
// ==========================================================================
function inyectarTicketsComoTarjetas(listaDeTickets) {
    const contenedor = document.getElementById("ticketInboxCardsCuerpo");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (listaDeTickets.length === 0) {
        contenedor.innerHTML = `<div style="text-align: center; padding: 30px; color: #858796;">No se encontraron tickets asignados en tu bandeja de entrada.</div>`;
        return;
    }

    listaDeTickets.forEach((ticket) => {
        const card = document.createElement("div");
        card.className = "ticket-card-item";
        card.setAttribute("onclick", `loadTicketDetailInPanel('${ticket.id}')`);

        // Determinar el estilo de la etiqueta de urgencia
        const badgeUrgencia = ticket.urgente === 'Sí' ? 'status-badge-due' : 'status-badge-normal';

        card.innerHTML = `
            <div class="ticket-card-left">
                <div class="user-avatar-circle">👤</div>
                <div class="ticket-card-info">
                    <span class="ticket-id-code">[#${ticket.id.substring(0, 6).toUpperCase()}] Falla de ${ticket.tipo || 'Equipo'}</span>
                    <div class="ticket-card-subtext">
                        De: <span class="subtext-highlight">${ticket.usuarioEmail}</span> | Marca: <span class="subtext-highlight">${ticket.marca || ''}</span> | Modelo: <span class="subtext-highlight">${ticket.modelo || ''}</span>
                    </div>
                </div>
            </div>
            <div class="ticket-card-right">
                <span class="${badgeUrgencia}">${ticket.urgente === 'Sí' ? 'Urgente' : 'Normal'}</span>
                <div class="ticket-time-counter">
                    <p>Fecha Petición</p>
                    <p><strong>${ticket.fechaPeticion || 'S/F'}</strong></p>
                </div>
            </div>
        `;
        contenedor.appendChild(card);
    });
}

// ==========================================================================
// 4. CONTROL DEL PANEL INFERIOR (DETALLES Y EDICIONES)
// ==========================================================================
window.loadTicketDetailInPanel = function(ticketId) {
    idTicketSeleccionado = ticketId;
    const ticket = ticketsLocales.find(t => t.id === ticketId);
    
    if (!ticket) return;

    // Hacer visible el bloque inferior
    document.getElementById("lowerDetailPanel").style.display = "block";
    document.getElementById("activeTicketTitle").innerText = `Administración del Ticket #${ticketId.toUpperCase()}`;

    // Mapear los datos de la base de datos a las etiquetas del panel inferior
    document.getElementById("lblIdDoc").innerText = ticket.id;
    document.getElementById("lblFecha").innerText = ticket.fechaPeticion || "S/F";
    document.getElementById("lblTipo").innerText = ticket.tipo || "";
    document.getElementById("lblUrgente").innerText = ticket.urgente || "No";
    document.getElementById("lblMarcaModelo").innerText = `${ticket.marca || ''} ${ticket.modelo || ''}`;
    document.getElementById("lblSerie").innerText = ticket.serie || "S/S";
    document.getElementById("lblDetalle").innerText = ticket.detalle || "";
    document.getElementById("ticketCondicionEdicion").value = ticket.condicion || "Mantenimiento";

    // Asignar los eventos de clics a los botones de acción del panel
    document.getElementById("btnEliminarTicket").onclick = () => eliminarTicketIndividual(ticket.id);
    document.getElementById("btnGuardarCambios").onclick = () => actualizarCondicionTicket(ticket.id);
    
    // Desplazamiento suave para que el Administrador note que cargaron los datos
    document.getElementById("lowerDetailPanel").scrollIntoView({ behavior: 'smooth' });
};

// ==========================================================================
// 5. ACCIONES OPERATIVAS: ACTUALIZAR CONDICIÓN Y ELIMINAR TICKET
// ==========================================================================
async function actualizarCondicionTicket(id) {
    const nuevaCondicion = document.getElementById("ticketCondicionEdicion").value;
    try {
        await db.collection("tickets").doc(id).update({
            condicion: nuevaCondicion
        });
        alert("¡Condición del equipo actualizada con éxito en la nube!");
    } catch (error) {
        alert("Error al intentar actualizar la condición: " + error.message);
    }
}

function eliminarTicketIndividual(id) {
    if (confirm("¿Está completamente segura de que desea eliminar este ticket de forma permanente del sistema?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => {
                alert("Ticket eliminado correctamente del Ayuntamiento.");
                document.getElementById("lowerDetailPanel").style.display = "none";
            })
            .catch((error) => {
                alert("Error al intentar eliminar el registro: " + error.message);
            });
    }
}

// Navegación interna de sub-pestañas inferiores
window.switchSubTab = function(evt, tabId) {
    const panels = document.getElementsByClassName("sub-tab-pane");
    for (let i = 0; i < panels.length; i++) {
        panels[i].classList.remove("active");
    }
    document.getElementById(tabId).classList.add("active");
};

// ==========================================================================
// 6. INICIALIZADOR DE SESIÓN Y BARRA DE BÚSQUEDA
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = localStorage.getItem("userEmail");
    const emailDisplay = document.getElementById("userEmailDisplay");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        // Arrancamos la sincronización con Firestore
        cargarBandejaDeEntrada(storedEmail);
        
        // Escuchador en tiempo real para filtrar la barra de búsqueda
        const inputBuscar = document.getElementById("inputBuscar");
        if (inputBuscar) {
            inputBuscar.addEventListener("input", (e) => {
                const texto = e.target.value.toLowerCase().trim();
                
                if (texto === "") {
                    inyectarTicketsComoTarjetas(ticketsLocales);
                    return;
                }
                
                const filtrados = ticketsLocales.filter(t => 
                    (t.tipo || "").toLowerCase().includes(texto) || 
                    (t.detalle || "").toLowerCase().includes(texto) ||
                    (t.marca || "").toLowerCase().includes(texto)
                );
                
                inyectarTicketsComoTarjetas(filtrados);
            });
        }
    } else {
        alert("Sesión inválida. Por favor inicie sesión.");
        window.location.href = "index.html";
    }
});

// Función global de cierre de sesión
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};