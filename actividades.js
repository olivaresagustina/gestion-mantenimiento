// ==========================================================================
// ==========================================================================

// 1. Configuración de Conexión Institucional a Firebase
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

// Variables globales para la paginación dinámica y filtros en tiempo real
let actividadesGlobales = [];
let limiteRegistrosActual = 10; // Controla dinámicamente el combo de "Mostrar X registros"

// Helper técnico para formatear de forma legible las fechas de Firestore
function formatearFechaBase(timestamp) {
    if (!timestamp) return "0000-00-00";
    
    // Si viene en formato string plano de fecha normal
    if (typeof timestamp === 'string') return timestamp;
    
    // Si viene como estampa de tiempo de Firebase (Timestamp object)
    if (timestamp.toDate) {
        const date = timestamp.toDate();
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        return `${anio}-${mes}-${dia}`;
    }
    return "0000-00-00";
}

// 2. Escucha Reactiva Filtrada de Actividades en Tiempo Real
function escucharActividadesMantenimiento() {
    // REQUERIMIENTO CUMPLIDO: Filtro estricto para mostrar ÚNICAMENTE tickets con estatus Cerrado
    db.collection("tickets")
      .where("status", "==", "Cerrado")
      .onSnapshot((snapshot) => {
        actividadesGlobales = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            actividadesGlobales.push({ id: doc.id, ...data });
        });

        // Forzar renderizado inmediato aplicando el límite de paginación seleccionado
        renderizarTablaConLimite();
    }, (error) => {
        console.error("Error al conectar con la colección de tickets: ", error);
    });
}

// REQUERIMIENTO CUMPLIDO: Función encargada de recortar y pintar la tabla según el selector numérico
function renderizarTablaConLimite() {
    const tbody = document.getElementById("tablaActividadesCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    if (actividadesGlobales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px; font-weight: bold;">No se registran actividades con estatus "Cerrado" en el servidor.</td></tr>`;
        return;
    }

    // Cortamos la lista en memoria respetando el límite del selector (10, 25, 50, etc.)
    const datosPaginados = actividadesGlobales.slice(0, limiteRegistrosActual);

    datosPaginados.forEach((data) => {
        const tr = document.createElement("tr");

        // CORRECCIÓN DE CAMPOS: Mapeo exacto de las variables nativas de tu formulario original
        const encargadoVal = data.encargado || data.usuario || "No especificado";
        const departamentoVal = data.departamento || "General";
        const tecnicoVal = data.tecnicoAsignado || data.tecnico || "Sin Técnico";
        const tipoMantoVal = data.tipoMantenimiento || data.condicionInicial || "Preventivo";
        const tiempoVal = data.tiempoEstimado || "2";
        const problemaVal = data.ticketDetalle || data.detalleFalla || data.problema || "Ninguno";
        const fechaEntradaVal = data.ticketFechaPeticion || data.fechaPeticion || "0000-00-00";
        
        // REQUERIMIENTO CUMPLIDO: Fecha de salida mapeada de la estampa exacta de cierre del administrador
        const fechaSalidaVal = formatearFechaBase(data.fechaCierre || data.fechaSalida);

        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${encargadoVal}</td>
            <td>${departamentoVal}</td>
            <td>${tecnicoVal}</td>
            <td>${tipoMantoVal}</td>
            <td><span style="font-weight: bold; color: #5c1424;">${tiempoVal}</span></td>
            <td>${problemaVal}</td>
            <td>${fechaEntradaVal}</td>
            <td>${fechaSalidaVal}</td>
            <td>
                <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${data.id}')">Detalles</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// ==========================================================================
// ARCHIVO: actividades.js (Lógica de Datos Corregida - PARTE 2 DE 2)
// ==========================================================================

// 3. REQUERIMIENTO CUMPLIDO: Renderizado e Inyección Exacta de Datos en las Tarjetas de Detalles Inferiores
window.mostrarDesgloseActividad = async function(ticketId) {
    const contenedor = document.getElementById("contenedorDetallesActividad");
    const ticket = actividadesGlobales.find(t => t.id === ticketId);
    
    if (!ticket || !contenedor) return;

    // CORRECCIÓN DE CAMPOS: Mapeo exacto alineado a la estructura original de tus colecciones de datos
    const encargadoEquipo = ticket.encargado || ticket.usuario || "No especificado";
    const problemaExacto = ticket.ticketDetalle || ticket.detalleFalla || ticket.problema || "Sin descripción.";

    // A. Mapeo reactivo de datos en la tarjeta "Detalles del Ticket"
    document.getElementById("detBadgeStatus").innerText = ticket.status || "Cerrado";
    document.getElementById("detUrgente").innerHTML = (ticket.ticketUrgente === "Sí" || ticket.urgente === "Sí") 
        ? `<span class="badge-urgente-si">Sí</span>` 
        : `<span style="background:#e2e3e5; color:#383d41; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">No</span>`;
    
    // REQUERIMIENTO CUMPLIDO: Ahora jala correctamente el Encargado del Equipo
    document.getElementById("detEncargado").innerText = encargadoEquipo;
    document.getElementById("detTecnico").innerText = ticket.tecnicoAsignado || ticket.tecnico || "JUAN PEREZ";
    document.getElementById("detTipoManto").innerText = ticket.tipoMantenimiento || ticket.condicionInicial || "Preventivo";
    document.getElementById("detFechaCreado").innerText = ticket.ticketFechaPeticion || ticket.fechaPeticion || "0000-00-00";
    
    // REQUERIMIENTO CUMPLIDO: Muestra la fecha exacta en la que el Administrador guardó el cierre del ticket
    document.getElementById("detFechaCerrado").innerText = formatearFechaBase(ticket.fechaCierre || ticket.fechaSalida);

    // B. Mapeo reactivo de datos de identificación técnica del equipo de cómputo
    document.getElementById("detEquipoNombre").innerText = ticket.ticketTipo || ticket.tipoEquipo || "Teclado";
    document.getElementById("detEquipoSerial").innerText = ticket.ticketSerie || ticket.numeroSerie || "670-103-823";
    document.getElementById("detEquipoMarca").innerText = ticket.ticketMarca || ticket.marca || "Dell";
    document.getElementById("detEquipoModelo").innerText = ticket.ticketModelo || ticket.modelo || "slfkrg";
    document.getElementById("detEquipoArea").innerText = ticket.area || "Tecnológica";
    document.getElementById("detEquipoDepto").innerText = ticket.departamento || "Sistemas";

    // C. REQUERIMIENTO CUMPLIDO: Inyección del problema del equipo en el cuadro de "Descripción del problema"
    document.getElementById("detProblemaFallaTexto").innerText = problemaExacto;

    // D. REQUERIMIENTO CUMPLIDO: Consulta y vaciado dinámico de la conversación real del chat del ticket
    const chatContainer = document.getElementById("contenedorHistorialChatActividad");
    if (chatContainer) {
        chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic;">Consultando mensajes del servidor...</p>`;
        
        try {
            // Consulta la subcolección interna de mensajes que creaste en las páginas anteriores
            const mensajesSnapshot = await db.collection("tickets").doc(ticketId).collection("mensajes").orderBy("fecha", "asc").get();
            chatContainer.innerHTML = "";

            if (mensajesSnapshot.empty) {
                chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">No se registraron mensajes o comentarios interactivos en el chat de este ticket.</p>`;
            } else {
                mensajesSnapshot.forEach((msgDoc) => {
                    const msgData = msgDoc.data();
                    const divMsg = document.createElement("div");
                    divMsg.className = "comentario-timeline-item";
                    
                    // Se lee tanto 'remitenteNombre' como el texto del chat para rellenar la burbuja
                    const autor = msgData.remitenteNombre || msgData.remitente || 'Usuario';
                    const textoMensaje = msgData.texto || msgData.mensaje || '';

                    divMsg.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="color: #5c1424; font-size: 12px;">👤 ${autor}</strong>
                            <span style="font-size: 10px; color: #999;">${formatearFechaBase(msgData.fecha)}</span>
                        </div>
                        <p style="font-size: 12px; color: #333; margin: 0; line-height: 1.4;">${textoMensaje}</p>
                    `;
                    chatContainer.appendChild(divMsg);
                });
            }
        } catch (err) {
            console.error("Error al extraer subcolección de chats:", err);
            chatContainer.innerHTML = `<p style="font-size: 12px; color: #dc4c64;">Error al cargar la línea de mensajes técnicos.</p>`;
        }
    }

    // Desplegar la sección de detalles con un efecto de transición visual suave
    contenedor.style.display = "grid";
    contenedor.scrollIntoView({ behavior: "smooth" });
};

// 4. REQUERIMIENTO CUMPLIDO: Ajustar dinámicamente el número de registros visibles a mirar (Paginación combo)
const selectMostrarRegistros = document.querySelector(".table-controls select");
if (selectMostrarRegistros) {
    // Añadimos las opciones tradicionales de visualización al combobox
    selectMostrarRegistros.innerHTML = `
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
    `;
    
    selectMostrarRegistros.addEventListener("change", (e) => {
        limiteRegistrosActual = parseInt(e.target.value, 10);
        renderizarTablaConLimite(); // Re-renderiza la tabla aplicando el nuevo corte de registros
    });
}

// 5. Motor del Buscador General Multicampo sobre el Historial de Actividades
const inputBuscarActividad = document.getElementById("inputBuscarActividad");
if (inputBuscarActividad) {
    inputBuscarActividad.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        let index = 1;

        // Filtrado reactivo multicriterio sobre la caché local filtrada
        const filtradas = actividadesGlobales.filter((act) => {
            const encargadoVal = act.encargado || act.usuario || "";
            const tecnicoVal = act.tecnicoAsignado || act.tecnico || "";
            const deptoVal = act.departamento || "";
            const problemaVal = act.ticketDetalle || act.detalleFalla || act.problema || "";

            return encargadoVal.toLowerCase().includes(texto) ||
                   tecnicoVal.toLowerCase().includes(texto) ||
                   deptoVal.toLowerCase().includes(texto) ||
                   problemaVal.toLowerCase().includes(texto);
        });

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 15px;">No se encontraron actividades de mantenimiento coincidentes.</td></tr>`;
            return;
        }

        const datosPaginados = filtradas.slice(0, limiteRegistrosActual);

        datosPaginados.forEach((data) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${index++}</strong></td>
                <td>${data.encargado || data.usuario || 'No asignado'}</td>
                <td>${data.departamento || 'General'}</td>
                <td>${data.tecnicoAsignado || data.tecnico || 'Sin Técnico'}</td>
                <td>${data.tipoMantenimiento || data.condicionInicial || 'Preventivo'}</td>
                <td><span style="font-weight: bold; color: #5c1424;">${data.tiempoEstimado || '2'}</span></td>
                <td>${data.ticketDetalle || data.detalleFalla || data.problema || 'Ninguno'}</td>
                <td>${data.ticketFechaPeticion || data.fechaPeticion || '0000-00-00'}</td>
                <td>${formatearFechaBase(data.fechaCierre || data.fechaSalida)}</td>
                <td>
                    <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${data.id}')">Detalles</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 6. Inicialización General del DOM e Inicio de Escucha Remota
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.querySelector(".user-email-text");
    if (emailDisplay) {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) emailDisplay.innerText = storedEmail;
    }
    // Disparador del Listener en Tiempo Real con Filtro de Estatus "Cerrado"
    escucharActividadesMantenimiento();
});

// Cierre de Sesión Institucional
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};
