

const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "gestion-mantenimiento-ap-20f51.firebaseapp.com",
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

let actividadesGlobales = [];
let limiteRegistrosActual = 10;

// Función para formatear e incluir de forma exacta Fecha, Hora y Minutos del Servidor
function formatearFechaYHora(timestamp) {
    if (!timestamp) return "0000-00-00 00:00";
    
    // Si es un objeto Timestamp nativo de Firebase
    if (timestamp.toDate) {
        const date = timestamp.toDate();
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        
        const horas = String(date.getHours()).padStart(2, '0');
        const minutos = String(date.getMinutes()).padStart(2, '0');
        
        return `${anio}-${mes}-${dia} ${horas}:${minutos}`;
    }
    
    if (typeof timestamp === 'string') return timestamp;
    return "0000-00-00 00:00";
}

// Escucha en tiempo real de los tickets cerrados con cruce relacional
function escucharActividadesMantenimiento() {
    db.collection("tickets")
      .where("status", "in", ["Cerrado", "CERRADO"])
      .onSnapshot(async (ticketsSnapshot) => {
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        if (ticketsSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No se registran actividades concluidas en el sistema.</td></tr>`;
            return;
        }

        try {
            const encargadosSnap = await db.collection("usuarios_encargados").get();
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

            ticketsSnapshot.forEach((docTicket) => {
                const ticketData = docTicket.data();
                const ticketId = docTicket.id;
                const correoKey = (ticketData.usuarioEmail || "").trim().toLowerCase();

                const infoEncargado = mapaEncargados[correoKey] || { nombre: "Desconocido", departamento: "General" };

                actividadesGlobales.push({
                    id: ticketId,
                    encargado: infoEncargado.nombre,
                    departamento: infoEncargado.departamento,
                    // Mapea de forma exacta 'detalle' de tus formularios levantados
                    problema: ticketData.detalle || "Sin descripción de falla",
                    tecnico: ticketData.tecnicoAsignado || "Sin Técnico",
                    tipoMantenimiento: ticketData.tipoMantenimiento || "Preventivo",
                    tiempoEstimado: ticketData.tiempoEstimadoDias || "2",
                    fechaEntrada: ticketData.fechaPeticion || "0000-00-00",
                    fechaSalida: ticketData.fechaCierreReal || ticketData.fechaUltimaGestion || null,
                    ticketTipo: ticketData.tipo || "",
                    ticketSerie: ticketData.serie || "",
                    ticketMarca: ticketData.marca || "",
                    ticketModelo: ticketData.modelo || "",
                    status: ticketData.status || "Cerrado",
                    urgente: ticketData.urgente || "No"
                });
            });

            renderizarTablaConLimite();

        } catch (err) {
            console.error("Error en mapeo relacional:", err);
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px;">Error al enlazar datos de personal.</td></tr>`;
        }
    });
}

function renderizarTablaConLimite() {
    const tbody = document.getElementById("tablaActividadesCuerpo");
    if (!tbody) return;
    tbody.innerHTML = "";
    let index = 1;

    const datosPaginados = actividadesGlobales.slice(0, limiteRegistrosActual);

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
            <td>${formatearFechaYHora(reg.fechaSalida)}</td>
            <td>
                <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${reg.id}')">Detalles</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// ==========================================================================
// ARCHIVO: actividades.js (Lógica de Tiempos y Chat Sincronizada - PARTE 2 DE 2)
// ==========================================================================

// 3. REQUERIMIENTO CUMPLIDO: Renderizado de datos e inyección de la subcolección real "chat"
window.mostrarDesgloseActividad = async function(ticketId) {
    const contenedor = document.getElementById("contenedorDetallesActividad");
    const reg = actividadesGlobales.find(t => t.id === ticketId);
    
    if (!reg || !contenedor) return;

    // A. Mapeo de datos en la tarjeta "Detalles del Ticket"
    document.getElementById("detBadgeStatus").innerText = reg.status || "Cerrado";
    document.getElementById("detUrgente").innerHTML = (reg.urgente === "Sí" || reg.urgente === "si") 
        ? `<span class="badge-urgente-si">Sí</span>` 
        : `<span style="background:#e2e3e5; color:#383d41; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold;">No</span>`;
    
    document.getElementById("detEncargado").innerText = reg.encargado;
    document.getElementById("detTecnico").innerText = reg.tecnico;
    document.getElementById("detTipoManto").innerText = reg.tipoMantenimiento;
    document.getElementById("detFechaCreado").innerText = reg.fechaEntrada;
    document.getElementById("detFechaCerrado").innerText = formatearFechaYHora(reg.fechaSalida);

    // B. Mapeo de datos de identificación técnica del equipo de cómputo
    document.getElementById("detEquipoNombre").innerText = reg.ticketTipo || "Equipo de Cómputo";
    document.getElementById("detEquipoSerial").innerText = reg.ticketSerie || "S/N";
    document.getElementById("detEquipoMarca").innerText = reg.ticketMarca || "S/M";
    document.getElementById("detEquipoModelo").innerText = reg.ticketModelo || "S/M";
    document.getElementById("detEquipoArea").innerText = "General";
    document.getElementById("detEquipoDepto").innerText = reg.departamento;

    // C. REQUERIMIENTO CUMPLIDO: Inyección de la celda de la falla en el cuadro de "Descripción del problema"
    document.getElementById("detProblemaFallaTexto").innerText = reg.problema;

    // D. REQUERIMIENTO CUMPLIDO CORREGIDO: Extracción de la subcolección exacta "chat" (Campos: texto y fechaEnvio)
    const chatContainer = document.getElementById("contenedorHistorialChatActividad");
    if (chatContainer) {
        chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic;">Consultando mensajes del servidor...</p>`;
        
        try {
            // CORRECCIÓN CLAVE: Consulta síncrona a la subcolección ".collection('chat')" ordenada por 'fechaEnvio'
            const mensajesSnapshot = await db.collection("tickets").doc(ticketId).collection("chat").orderBy("fechaEnvio", "asc").get();
            chatContainer.innerHTML = "";

            if (mensajesSnapshot.empty) {
                chatContainer.innerHTML = `<p style="font-size: 12px; color: #777; font-style: italic; padding: 10px; background: #fafafa; border-radius: 4px; border: 1px dashed #ddd;">No se encontraron comentarios registrados en la línea técnica de este ticket.</p>`;
            } else {
                mensajesSnapshot.forEach((msgDoc) => {
                    const msgData = msgDoc.data();
                    
                    // Sincronización exacta con los nombres de campos de tus otros archivos js
                    const autor = msgData.remitenteNombre || "Soporte";
                    const textoMensaje = msgData.texto || "";
                    const fechaMensaje = msgData.fechaEnvio || null;

                    const divMsg = document.createElement("div");
                    divMsg.className = "comentario-timeline-item";
                    divMsg.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <strong style="color: #5c1424; font-size: 12px;">👤 ${autor}</strong>
                            <span style="font-size: 10px; color: #999;">${formatearFechaYHora(fechaMensaje)}</span>
                        </div>
                        <p style="font-size: 12px; color: #333; margin: 0; line-height: 1.4;">${textoMensaje}</p>
                    `;
                    chatContainer.appendChild(divMsg);
                });
            }
        } catch (err) {
            console.error("Error al extraer subcolección 'chat' de la BD:", err);
            chatContainer.innerHTML = `<p style="font-size: 12px; color: #dc4c64;">Error al cargar la línea de mensajes técnicos.</p>`;
        }
    }

    // Despliegue visual suave hacia la tarjeta de desglose inferior
    contenedor.style.display = "grid";
    contenedor.scrollIntoView({ behavior: "smooth" });
};

// 4. Ajustar el número de registros visibles a mirar (Paginación combo)
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
        renderizarTablaConLimite();
    });
}

// 5. Motor de Búsqueda General Multicampo
const inputBuscarActividad = document.getElementById("inputBuscarActividad");
if (inputBuscarActividad) {
    inputBuscarActividad.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase().trim();
        const tbody = document.getElementById("tablaActividadesCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        let index = 1;

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
                <td>${formatearFechaYHora(reg.fechaSalida)}</td>
                <td>
                    <button class="btn-detalles-act" onclick="mostrarDesgloseActividad('${reg.id}')">Detalles</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}




// --- 6. INICIALIZACIÓN GENERAL DEL DOM CON EXPULSIÓN DE ROLES INSTITUCIONALES ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.querySelector(".user-email-text");
    const storedEmail = localStorage.getItem("userEmail");
    const storedRole = localStorage.getItem("userRole"); // Capturamos el privilegio de la sesión

    // A. CONTROL DE ACCESO CRÍTICO: Si no hay credenciales locales, rebota al login
    if (!storedEmail || !storedRole) {
        alert("Acceso denegado. Por favor inicia sesión de forma correcta.");
        window.location.href = "index.html";
        return;
    }

    // B. FILTRO DE EXPULSIÓN ABSOLUTA (Encargados y Directores)
    if (storedRole === "Encargado") {
        alert("Acceso denegado. No tienes los permisos requeridos para auditar la bitácora.");
        window.location.href = "ticket.html"; // Su única página permitida
        return;
    } else if (storedRole === "Director") {
        alert("Acceso denegado. Esta sección es exclusiva para el Administrador del sistema.");
        window.location.href = "menu.html"; // Regresa a su Dashboard permitido
        return;
    }

    // C. CONTINUAR CON LA CARGA EXCLUSIVA PARA EL ADMINISTRADOR
    if (emailDisplay) {
        emailDisplay.innerText = storedEmail;
    }
    
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