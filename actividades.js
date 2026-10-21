
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

// Variables globales para la persistencia del estado en caché local
let actividadesGlobales = [];
let limiteRegistrosActual = 10;

// Helper técnico para decodificar y formatear las estampas de tiempo (Timestamp)
function formatearFechaBase(timestamp) {
    if (!timestamp) return "0000-00-00";
    if (typeof timestamp === 'string') return timestamp;
    if (timestamp.toDate) {
        const date = timestamp.toDate();
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        return `${anio}-${mes}-${dia}`;
    }
    return "0000-00-00";
}

// 2. REQUERIMIENTO CUMPLIDO: Escucha remota con cruce de información idéntico a peticiones
function escucharActividadesMantenimiento() {
    // Escucha en tiempo real filtrando estrictamente los tickets con estatus Cerrado
    db.collection("tickets")
      .where("status", "==", "Cerrado")
      .onSnapshot(async (ticketsSnapshot) => {
        
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        if (ticketsSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No se registran actividades con estatus "Cerrado" en el sistema.</td></tr>`;
            return;
        }

        try {
            // REQUERIMIENTO CUMPLIDO: Descarga en lote el catálogo completo de personal encargado
            const encargadosSnap = await db.collection("usuarios_encargados").get();

            // Construimos el mapa relacional idéntico usando el correo de acceso como llave de enlace
            const mapaEncargados = {};
            encargadosSnap.forEach(doc => {
                const d = doc.data();
                if (d.usuarioEmail) {
                    mapaEncargados[d.usuarioEmail.trim().toLowerCase()] = {
                        nombre: d.nombreCompleto || "Sin Nombre",
                        departamento: d.departamento || "General"
                    };
                }
            });

            actividadesGlobales = [];

            // Barremos los tickets y les inyectamos los datos del encargado correspondiente
            ticketsSnapshot.forEach((docTicket) => {
                const ticketData = docTicket.data();
                const ticketId = docTicket.id;
                const correoKey = (ticketData.usuarioEmail || "").trim().toLowerCase();

                // Si el correo coincide, extrae el nombre real y área; si no, coloca los fallbacks
                const infoEncargado = mapaEncargados[correoKey] || { nombre: "Desconocido", departamento: "General" };

                actividadesGlobales.push({
                    id: ticketId,
                    encargado: infoEncargado.nombre,
                    departamento: infoEncargado.departamento,
                    // CORRECCIÓN: 'ticketData.detalle' mapea de forma exacta el problema guardado
                    problema: ticketData.detalle || "Sin descripción de falla",
                    tecnico: ticketData.tecnicoAsignado || "Sin Técnico",
                    tipoMantenimiento: ticketData.tipoMantenimiento || "Preventivo",
                    tiempoEstimado: ticketData.tiempoEstimadoDias || "2",
                    fechaEntrada: ticketData.fechaPeticion || "0000-00-00",
                    fechaSalida: formatearFechaBase(ticketData.fechaUltimaGestion || ticketData.fechaCierre),
                    // Mantenemos los campos de identificación del equipo para el panel de detalles inferior
                    ticketTipo: ticketData.tipo || "",
                    ticketSerie: ticketData.serie || "",
                    ticketMarca: ticketData.marca || "",
                    ticketModelo: ticketData.modelo || "",
                    status: ticketData.status || "Cerrado",
                    urgente: ticketData.urgente || "No"
                });
            });

            // Pintamos la información limpia en la interfaz aplicando el corte del paginador
            renderizarTablaConLimite();

        } catch (err) {
            console.error("Error crítico durante el mapeo relacional de datos:", err);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px;">Error al enlazar los datos del personal.</td></tr>`;
        }
    }, (error) => {
        console.error("Falla en el canal síncrono del servidor:", error);
    });
}

// 3. Renderizado de filas en base al límite configurado por el combobox
function renderizarTablaConLimite() {
    const tbody = document.getElementById("tablaActividadesCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    // Recortamos la lista dinámica en memoria local
    const datosPaginados = actividadesGlobales.slice(0, limiteRegistrosActual);

    datosPaginados.forEach((reg) => {
        const tr = document.createElement("tr");

        // REQUERIMIENTO CUMPLIDO: Columnas mapeadas con la información real de Maria Tellez, Recursos Humanos, etc.
        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${reg.encargado}</td>
            <td>${reg.departamento}</td>
            <td>${reg.tecnico}</td>
            <td>${reg.tipoMantenimiento}</td>
            <td><span style="font-weight: bold; color: #5c1424;">${reg.tiempoEstimado}</span></td>
            <td>${reg.problema}</td>
            <td>${reg.fechaEntrada}</td>
            <td>${reg.fechaSalida}</td>
            <td>
                <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${reg.id}')">Detalles</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// ==========================================================================
// ARCHIVO: actividades.js (Cruce de Datos Firestore - PARTE 2 DE 2)
// ==========================================================================

// 4. REQUERIMIENTO CUMPLIDO: Inyección Exacta de Datos Cruzados en el Panel de Detalles Inferior
window.mostrarDesgloseActividad = async function(ticketId) {
    const contenedor = document.getElementById("contenedorDetallesActividad");
    const reg = actividadesGlobales.find(t => t.id === ticketId);
    
    if (!reg || !contenedor) return;

    // A. Mapeo reactivo de datos en la tarjeta "Detalles del Ticket"
    document.getElementById("detBadgeStatus").innerText = reg.status || "Cerrado";
    document.getElementById("detUrgente").innerHTML = (reg.urgente === "Sí" || reg.urgente === "si") 
        ? `<span class="badge-urgente-si">Sí</span>` 
        : `<span style="background:#e2e3e5; color:#383d41; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">No</span>`;
    
    // REQUERIMIENTO CUMPLIDO: Muestra de forma exacta el Encargado del Equipo resuelto del cruce de colecciones
    document.getElementById("detEncargado").innerText = reg.encargado;
    document.getElementById("detTecnico").innerText = reg.tecnico;
    document.getElementById("detTipoManto").innerText = reg.tipoMantenimiento;
    document.getElementById("detFechaCreado").innerText = reg.fechaEntrada;
    document.getElementById("detFechaCerrado").innerText = reg.fechaSalida;

    // B. Mapeo reactivo de datos de identificación técnica del equipo de cómputo
    document.getElementById("detEquipoNombre").innerText = reg.ticketTipo || "Equipo de Cómputo";
    document.getElementById("detEquipoSerial").innerText = reg.ticketSerie || "S/N";
    document.getElementById("detEquipoMarca").innerText = reg.ticketMarca || "S/M";
    document.getElementById("detEquipoModelo").innerText = reg.ticketModelo || "S/M";
    document.getElementById("detEquipoArea").innerText = "General"; // Fallback estético
    document.getElementById("detEquipoDepto").innerText = reg.departamento;

    // C. REQUERIMIENTO CUMPLIDO: Inyección de la descripción del problema del equipo en el cuadro correspondiente
    document.getElementById("detProblemaFallaTexto").innerText = reg.problema;

    // D. REQUERIMIENTO CUMPLIDO: Consulta y vaciado dinámico de la conversación real del chat del ticket
    const chatContainer = document.getElementById("contenedorHistorialChatActividad");
    if (chatContainer) {
        chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic;">Consultando mensajes del servidor...</p>`;
        
        try {
            // Consulta la subcolección interna de mensajes que se crearon en las pantallas anteriores
            const mensajesSnapshot = await db.collection("tickets").doc(ticketId).collection("mensajes").orderBy("fecha", "asc").get();
            chatContainer.innerHTML = "";

            if (mensajesSnapshot.empty) {
                chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">No se registraron mensajes o comentarios interactivos en el chat de este ticket.</p>`;
            } else {
                mensajesSnapshot.forEach((msgDoc) => {
                    const msgData = msgDoc.data();
                    const divMsg = document.createElement("div");
                    divMsg.className = "comentario-timeline-item";
                    
                    // Se extrae el autor (remitenteNombre) y el cuerpo del mensaje del chat para rellenar la burbuja
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

    // Desplegar la sección de detalles con un efecto de transición visual suave hacia abajo
    contenedor.style.display = "grid";
    contenedor.scrollIntoView({ behavior: "smooth" });
};

// 5. REQUERIMIENTO CUMPLIDO: Ajustar dinámicamente el número de registros visibles a mirar (Paginación combo)
const selectMostrarRegistros = document.querySelector(".table-controls select");
if (selectMostrarRegistros) {
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

// 6. Motor del Buscador General Multicampo sobre el Historial de Actividades Cerradas
const inputBuscarActividad = document.getElementById("inputBuscarActividad");
if (inputBuscarActividad) {
    inputBuscarActividad.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        let index = 1;

        // Filtrado reactivo multicriterio sobre la caché local resuelta
        const filtradas = actividadesGlobales.filter((act) => {
            return act.encargado.toLowerCase().includes(texto) ||
                   act.tecnico.toLowerCase().includes(texto) ||
                   act.departamento.toLowerCase().includes(texto) ||
                   act.problema.toLowerCase().includes(texto);
        });

        if (filtradas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 15px;">No se encontraron actividades de mantenimiento coincidentes.</td></tr>`;
            return;
        }

        const datosPaginados = filtradas.slice(0, limiteRegistrosActual);

        datosPaginados.forEach((reg) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${index++}</strong></td>
                <td>${reg.encargado}</td>
                <td>${reg.departamento}</td>
                <td>${reg.tecnico}</td>
                <td>${reg.tipoMantenimiento}</td>
                <td><span style="font-weight: bold; color: #5c1424;">${reg.tiempoEstimado}</span></td>
                <td>${reg.problema}</td>
                <td>${reg.fechaEntrada}</td>
                <td>${reg.fechaSalida}</td>
                <td>
                    <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${reg.id}')">Detalles</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// 7. Inicialización General del DOM e Inicio de Escucha Remota
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.querySelector(".user-email-text");
    if (emailDisplay) {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) emailDisplay.innerText = storedEmail;
    }
    // Disparador del Listener en Tiempo Real con Filtro Relacional y de Estatus "Cerrado"
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
