
// 1. Configuración de Firebase e Instancias Básicas
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKlQcdeo-93favOuoY",
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

let ticketsLocales = [];
let idTicketSeleccionado = "";

// 2. Cargar Tickets desde Firestore en Tiempo Real
function cargarBandejaDeEntrada(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        ticketsLocales = [];
        snapshot.forEach((doc) => {
            ticketsLocales.push({ id: doc.id, ...doc.data() });
        });
        inyectarTicketsComoTarjetas(ticketsLocales);
    }, (error) => {
        console.error("Error al sincronizar las tarjetas: ", error);
    });
}

// 3. Convertir Registros en Tarjetas Interactivas
function inyectarTicketsComoTarjetas(listaDeTickets) {
    const contenedor = document.getElementById("ticketInboxCardsCuerpo");
    if (!contenedor) return;

    contenedor.innerHTML = "";

    if (listaDeTickets.length === 0) {
        contenedor.innerHTML = `<div style="text-align: center; padding: 20px; color: #777;">No se encontraron tickets en tu bandeja.</div>`;
        return;
    }

    listaDeTickets.forEach((ticket) => {
        const card = document.createElement("div");
        card.className = "ticket-card-item";
        card.setAttribute("onclick", `loadTicketDetailInPanel('${ticket.id}')`);

        const badgeUrgencia = ticket.urgente === 'Sí' ? 'status-badge-due' : 'status-badge-normal';

        card.innerHTML = `
            <div class="ticket-card-left">
                <div class="user-avatar-circle">👤</div>
                <div class="ticket-card-info">
                    <span class="ticket-id-code">[#${ticket.id.substring(0,6).toUpperCase()}] Falla de ${ticket.tipo || 'Equipo'}</span>
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

// 4. Mostrar Panel Inferior con los Datos del Ticket Seleccionado
window.loadTicketDetailInPanel = function(ticketId) {
    idTicketSeleccionado = ticketId;
    const ticket = ticketsLocales.find(t => t.id === ticketId);
    
    if (!ticket) return;

    document.getElementById("lowerDetailPanel").style.display = "block";
    document.getElementById("activeTicketTitle").innerText = `Administración del Ticket ##${ticketId.toUpperCase()}`;

    // Mapeamos los datos a las etiquetas del panel inferior
    document.getElementById("lblIdDoc").innerText = ticket.id;
    document.getElementById("lblFecha").innerText = ticket.fechaPeticion || "S/F";
    document.getElementById("lblTipo").innerText = ticket.tipo || "";
    document.getElementById("lblUrgente").innerText = ticket.urgente || "No";
    document.getElementById("lblMarcaModelo").innerText = `${ticket.marca || ''} ${ticket.modelo || ''}`;
    document.getElementById("lblSerie").innerText = ticket.serie || "S/S";
    document.getElementById("lblDetalle").innerText = ticket.detalle || "";
    document.getElementById("ticketCondicionEdicion").value = ticket.condicion || "Mantenimiento";

    // Configuramos acciones de los botones del panel inferior
    document.getElementById("btnEliminarTicket").onclick = () => eliminarTicketIndividual(ticket.id);
    document.getElementById("btnGuardarCambios").onclick = () => actualizarCondicionTicket(ticket.id);
    
    document.getElementById("lowerDetailPanel").scrollIntoView({ behavior: 'smooth' });
};

// 5. Funciones Operativas (Modificar Estado y Eliminar)
async function actualizarCondicionTicket(id) {
    const nuevaCondicion = document.getElementById("ticketCondicionEdicion").value;
    try {
        await db.collection("tickets").doc(id).update({ condicion: nuevaCondicion });
        alert("¡Condición del equipo actualizada con éxito!");
    } catch (error) {
        alert("Error al actualizar: " + error.message);
    }
}

function eliminarTicketIndividual(id) {
    if (confirm("¿Segura que deseas eliminar este ticket permanentemente del ayuntamiento?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => {
                alert("Ticket eliminado.");
                document.getElementById("lowerDetailPanel").style.display = "none";
            });
    }
}

// Intercambio de sub-pestañas
window.switchSubTab = function(evt, tabId) {
    document.getElementById(tabId).classList.add("active");
};

// Carga Inicial
window.addEventListener('DOMContentLoaded', () => {
    const storedEmail = localStorage.getItem("userEmail");
    const emailDisplay = document.getElementById("userEmailDisplay");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        cargarBandejaDeEntrada(storedEmail);
        
        // Configuración en tiempo real de la barra de búsqueda superior
        document.getElementById("inputBuscar").addEventListener("input", (e) => {
            const texto = e.target.value.toLowerCase().trim();
            if (texto === "") {
                inyectarTicketsComoTarjetas(ticketsLocales);
                return;
            }
            const filtrados = ticketsLocales.filter(t => 
                (t.tipo || "").toLowerCase().includes(texto) || 
                (t.detalle || "").toLowerCase().includes(texto)
            );
            inyectarTicketsComoTarjetas(filtrados);
        });
    } else {
        window.location.href = "index.html";
    }
});

// Logout
window.logout = async () => {
    await auth.signOut();
    localStorage.clear();
    window.location.href = "index.html";
};