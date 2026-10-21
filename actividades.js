// 1. Configuración de Firebase (Enlazado a la base de datos de Calnali_ corresponde a REGISTRO DE AACTIVIDADES)
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

// Variables globales para la persistencia del estado y búsquedas reactivas
let actividadesGlobales = [];

// Helper para dar formato estético a las estampas de tiempo de Firebase
function formatearFechaBase(timestamp) {
    if (!timestamp) return "0000-00-00";
    const date = timestamp.toDate();
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const anio = date.getFullYear();
    return `${anio}-${mes}-${dia}`;
}

// 2. Escucha en Tiempo Real del Historial de Actividades (onSnapshot)
function escucharActividadesMantenimiento() {
    db.collection("tickets").orderBy("fechaPeticion", "desc").onSnapshot((snapshot) => {
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        actividadesGlobales = [];
        let index = 1;

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No se registran actividades en el sistema.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const idDoc = doc.id;

            // Almacenamos en el caché global para la consulta local del botón DETALLES
            actividadesGlobales.push({ id: idDoc, ...data });

            const tr = document.createElement("tr");

            // REQUERIMIENTO CUMPLIDO: Estructura exacta de columnas basada en la interfaz proporcionada
            tr.innerHTML = `
                <td><strong>${index++}</strong></td>
                <td>${data.encargado || 'No asignado'}</td>
                <td>${data.departamento || 'General'}</td>
                <td>${data.tecnicoAsignado || 'Sin Técnico'}</td>
                <td>${data.tipoMantenimiento || data.condicionInicial || 'Preventivo'}</td>
                <td><span style="font-weight: bold; color: #5c1424;">${data.tiempoEstimado || '2'}</span></td>
                <td>${data.detalleFalla || data.problema || 'Ninguno'}</td>
                <td>${data.fechaPeticion || '0000-00-00'}</td>
                <td>${formatearFechaBase(data.fechaCierre || data.fechaSalida)}</td>
                <td>
                    <!-- REQUERIMIENTO CUMPLIDO: Botón DETALLES conectado de forma unificada -->
                    <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${idDoc}')">Detalles</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error al interceptar actividades de Firestore: ", error);
    });
}
// ==========================================================================
// ARCHIVO: actividades.js (Lógica de Datos - SECCIÓN B DE B)
// ==========================================================================

// 3. REQUERIMIENTO CUMPLIDO: Renderizado dinámico de detalles y chat en la parte inferior al presionar DETALLES
window.mostrarDesgloseActividad = async function(ticketId) {
    const contenedor = document.getElementById("contenedorDetallesActividad");
    const ticket = actividadesGlobales.find(t => t.id === ticketId);
    
    if (!ticket || !contenedor) return;

    // A. Mapeo reactivo de datos en la tarjeta de detalles del ticket
    document.getElementById("detBadgeStatus").innerText = ticket.status || "Cerrado";
    document.getElementById("detUrgente").innerHTML = ticket.urgente === "Sí" || ticket.urgente === "si" 
        ? `<span class="badge-urgente-si">Sí</span>` 
        : `<span style="background:#e2e3e5; color:#383d41; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">No</span>`;
    
    document.getElementById("detEncargado").innerText = ticket.encargado || "No especificado";
    document.getElementById("detTecnico").innerText = ticket.tecnicoAsignado || "JUAN PEREZ";
    document.getElementById("detTipoManto").innerText = ticket.tipoMantenimiento || ticket.condicionInicial || "Preventivo";
    document.getElementById("detFechaCreado").innerText = ticket.fechaPeticion || "0000-00-00";
    document.getElementById("detFechaCerrado").innerText = formatearFechaBase(ticket.fechaCierre || ticket.fechaSalida);

    // B. Mapeo reactivo de datos de identificación del equipo de cómputo
    document.getElementById("detEquipoNombre").innerText = ticket.tipoEquipo || ticket.equipo || "Teclado";
    document.getElementById("detEquipoSerial").innerText = ticket.numeroSerie || ticket.serial || "670-103-823";
    document.getElementById("detEquipoMarca").innerText = ticket.marca || "Dell";
    document.getElementById("detEquipoModelo").innerText = ticket.modelo || "slfkrg";
    document.getElementById("detEquipoArea").innerText = ticket.area || "Tecnológica";
    document.getElementById("detEquipoDepto").innerText = ticket.departamento || "Sistemas";

    // C. REQUERIMIENTO CUMPLIDO: Inyección exacta de la celda Detalle / Falla señalada
    document.getElementById("detProblemaFallaTexto").innerText = ticket.detalleFalla || ticket.problema || "Sin descripción.";

    // D. REQUERIMIENTO CUMPLIDO: Extracción dinámica de la conversación de chat real del ticket
    const chatContainer = document.getElementById("contenedorHistorialChatActividad");
    if (chatContainer) {
        chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic;">Consultando mensajes del servidor...</p>`;
        
        try {
            // Consulta la subcolección interna de mensajes vinculada a ese ticket
            const mensajesSnapshot = await db.collection("tickets").doc(ticketId).collection("mensajes").orderBy("fecha", "asc").get();
            chatContainer.innerHTML = "";

            if (mensajesSnapshot.empty) {
                chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">No se registraron mensajes o comentarios interactivos en este ticket.</p>`;
            } else {
                mensajesSnapshot.forEach((msgDoc) => {
                    const msgData = msgDoc.data();
                    const divMsg = document.createElement("div");
                    divMsg.className = "comentario-timeline-item";
                    
                    divMsg.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="color: #5c1424; font-size: 12px;">👤 ${msgData.remitenteNombre || msgData.remitente || 'Usuario'}</strong>
                            <span style="font-size: 10px; color: #999;">${formatearFechaBase(msgData.fecha)}</span>
                        </div>
                        <p style="font-size: 12px; color: #333; margin: 0; line-height: 1.4;">${msgData.texto || msgData.mensaje || ''}</p>
                    `;
                    chatContainer.appendChild(divMsg);
                });
            }
        } catch (err) {
            console.error("Error al extraer subcolección de chats:", err);
            chatContainer.innerHTML = `<p style="font-size: 12px; color: #dc4c64;">Error al cargar la línea de mensajes técnicos.</p>`;
        }
    }

    // Desplegar la sección de detalles con un efecto de transición visual suave hacia abajo
    contenedor.style.display = "grid";
    contenedor.scrollIntoView({ behavior: "smooth" });
};

// 4. Motor de Búsqueda Reactivo sobre la Tabla de Actividades
const inputBuscarActividad = document.getElementById("inputBuscarActividad");
if (inputBuscarActividad) {
    inputBuscarActividad.addEventListener("input", (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        let index = 1;

        const filtradas = actividadesGlobales.filter((act) => {
            return (act.tecnicoAsignado || "").toLowerCase().includes(textoBusqueda) ||
                   (act.encargado || "").toLowerCase().includes(textoBusqueda) ||
                   (act.departamento || "").toLowerCase().includes(textoBusqueda) ||
                   (act.detalleFalla || "").toLowerCase().includes(textoBusqueda);
        });

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 15px;">No se encontraron actividades de mantenimiento coincidentes.</td></tr>`;
            return;
        }

        filtradas.forEach((data) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${index++}</strong></td>
                <td>${data.encargado || 'No asignado'}</td>
                <td>${data.departamento || 'General'}</td>
                <td>${data.tecnicoAsignado || 'Sin Técnico'}</td>
                <td>${data.tipoMantenimiento || data.condicionInicial || 'Preventivo'}</td>
                <td><span style="font-weight: bold; color: #5c1424;">${data.tiempoEstimado || '2'}</span></td>
                <td>${data.detalleFalla || data.problema || 'Ninguno'}</td>
                <td>${data.fechaPeticion || '0000-00-00'}</td>
                <td>${formatearFechaBase(data.fechaCierre || data.fechaSalida)}</td>
                <td>
                    <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${data.id}')">Detalles</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 5. Inicialización de credenciales de cabecera al cargar la vista
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.querySelector(".user-email-text");
    if (emailDisplay) {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) emailDisplay.innerText = storedEmail;
    }
    // Disparador automático de escucha remota
    escucharActividadesMantenimiento();
});

// Cierre de Sesión Institucional Seguro
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};
