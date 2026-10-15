// 1. Configuración de Firebase e Inicialización de Servicios Oficiales Corregida
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

const panelDetalles = document.getElementById('panelGestionInSitu');
const formPanel = document.getElementById('formPanelPeticion');
let registrosGlobales = [];

const ocultarYLimpiarPanel = () => {
    panelDetalles.style.display = 'none';
    formPanel.reset();
    document.getElementById('panelTicketDocId').value = "";
    document.querySelectorAll('#tablaPeticionesCuerpo tr').forEach(tr => {
        tr.classList.remove('fila-seleccionada');
    });
};

document.getElementById('btnCerrarPanelInferior').addEventListener('click', ocultarYLimpiarPanel);
document.getElementById('btnCancelarPanel').addEventListener('click', ocultarYLimpiarPanel);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelDetalles.style.display === 'block') {
        ocultarYLimpiarPanel();
    }
});

// --- 3. EXTRACCIÓN REACTIVA INYECTANDO EL CAMPO STATUS ---
function cargarPeticionesGlobales() {
    db.collection("tickets").onSnapshot(async (ticketsSnapshot) => {
        const tbody = document.getElementById("tablaPeticionesCuerpo");
        if (!tbody) return;

        if (ticketsSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">No hay ningún ticket levantado en el sistema actualmente.</td></tr>`;
            return;
        }

        registrosGlobales = [];

        const [encargadosSnap, peticionesSnap] = await Promise.all([
            db.collection("usuarios_encargados").get(),
            db.collection("peticiones").get()
        ]);

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

        const mapaPeticiones = {};
        peticionesSnap.forEach(doc => {
            mapaPeticiones[doc.data().ticketId] = doc.data();
        });

        ticketsSnapshot.forEach((docTicket) => {
            const ticketData = docTicket.data();
            const ticketId = docTicket.id;
            const correoKey = (ticketData.usuarioEmail || "").trim().toLowerCase();

            const infoEncargado = mapaEncargados[correoKey] || { nombre: "Desconocido", departamento: "No Asignado" };
            const gestionPrevia = mapaPeticiones[ticketId] || {};

            registrosGlobales.push({
                ticketId: ticketId,
                encargado: infoEncargado.nombre,
                departamento: infoEncargado.departamento,
                problema: ticketData.detalle || "Sin descripción de falla",
                fechaEntrada: ticketData.fechaPeticion || "S/F",
                // CAPTURA DEL ATRIBUTO STATUS EN LA CACHÉ
                status: ticketData.status || "Abierto", 
                tecnico: gestionPrevia.tecnico || "",
                tipoMantenimiento: gestionPrevia.tipoMantenimiento || "",
                tiempoEstimado: gestionPrevia.tiempoEstimado || "",
                fechaSalida: gestionPrevia.fechaSalida || "",
                serie: ticketData.serie || "",
                tipoEquipo: ticketData.tipo || "",
                marca: ticketData.marca || "",
                modelo: ticketData.modelo || ""
            });
        });

        inyectarPeticionesEnTabla(registrosGlobales);

    }, (error) => {
        console.error("Falla en la consulta sincrónica del servidor:", error);
        const tbody = document.getElementById("tablaPeticionesCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc4c64; padding: 20px;">Error al enlazar los datos.</td></tr>`;
        }
    });
}
// --- 4. CONSTRUCCIÓN DE FILAS CON REEMPLAZO DE COLUMNA A STATUS ---
function inyectarPeticionesEnTabla(listaRegistros) {
    const tbody = document.getElementById("tablaPeticionesCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    listaRegistros.forEach((reg) => {
        const tr = document.createElement("tr");
        tr.setAttribute("id", `fila-${reg.ticketId}`);

        // REQUERIMIENTO CUMPLIDO: Se sustituyó la columna de botones por una celda de Status estética
        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${reg.encargado}</td>
            <td>${reg.departamento}</td>
            <td>${reg.problema}</td>
            <td>${reg.fechaEntrada}</td>
            <td>
                <span class="badge" style="background-color: #2c9faf; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                    ${reg.status}
                </span>
            </td>
        `;

        // Mantiene la funcionalidad intacta: seleccionar la fila abre el panel inferior de edición
        tr.addEventListener('click', () => {
            document.querySelectorAll('#tablaPeticionesCuerpo tr').forEach(row => row.classList.remove('fila-seleccionada'));
            tr.classList.add('fila-seleccionada');
            
            mostrarPanelModificaciones(reg);
        });

        tbody.appendChild(tr);
    });
}

// --- 5. TRANSFERENCIA DE DATOS HACIA LOS CASILLEROS DEL PANEL ---
function mostrarPanelModificaciones(registro) {
    document.getElementById('panelTicketDocId').value = registro.ticketId;
    document.getElementById('panelEncargado').value = registro.encargado;
    document.getElementById('panelDepartamento').value = registro.departamento;
    document.getElementById('panelProblema').value = registro.problema;

    document.getElementById('panelTecnico').value = registro.tecnico || "";
    document.getElementById('panelTipoMantenimiento').value = registro.tipoMantenimiento || "";
    document.getElementById('panelTiempo').value = registro.tiempoEstimado || "";
    document.getElementById('panelFechaEntrada').value = registro.fechaEntrada !== "S/F" ? registro.fechaEntrada : "";
    document.getElementById('panelFechaSalida').value = registro.fechaSalida || "";

    panelDetalles.style.display = 'block';
    panelDetalles.scrollIntoView({ behavior: 'smooth' });
}

// --- 6. GUARDAR COMO NUEVO REGISTRO EN COLECCIÓN HISTÓRICA INDEPENDIENTE ---
formPanel.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId = document.getElementById('panelTicketDocId').value;
    const encargado = document.getElementById('panelEncargado').value;
    const departamento = document.getElementById('panelDepartamento').value;
    const problema = document.getElementById('panelProblema').value;
    
    const tecnico = document.getElementById('panelTecnico').value;
    const tipoMantenimiento = document.getElementById('panelTipoMantenimiento').value;
    const tiempoEstimado = document.getElementById('panelTiempo').value.trim();
    const fechaEntrada = document.getElementById('panelFechaEntrada').value;
    const fechaSalida = document.getElementById('panelFechaSalida').value;

    if (!ticketId) {
        alert("Error de proceso: Por favor, seleccione un ticket válido de la tabla.");
        return;
    }

    try {
        await db.collection("historico_peticiones_modificadas").add({
            ticketOriginalId: ticketId,
            solicitante: encargado,
            departamento: departamento,
            fallaReportada: problema,
            tecnicoAsignado: tecnico,
            tipoMantenimiento: tipoMantenimiento,
            tiempoEstimadoDias: Number(tiempoEstimado),
            fechaEntrada: fechaEntrada,
            fechaSalidaEstimada: fechaSalida,
            fechaRegistroCambio: firebase.firestore.FieldValue.serverTimestamp(),
            operadorEmail: localStorage.getItem("userEmail")
        });

        alert("¡Operación realizada correctamente! Modificación guardada como un nuevo registro histórico en la base de datos.");
        ocultarYLimpiarPanel();

    } catch (error) {
        console.error("Error al almacenar el cambio en Firestore:", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
});

// --- 7. BUSCADOR MULTICAMPO EN TIEMPO REAL ---
const inputBuscar = document.getElementById("inputBuscarPeticion");
if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();

        if (textoBusqueda === "") {
            inyectarPeticionesEnTabla(registrosGlobales);
            return;
        }

        const registrosFiltrados = registrosGlobales.filter((reg) => {
            return reg.encargado.toLowerCase().includes(textoBusqueda) ||
                   reg.departamento.toLowerCase().includes(textoBusqueda) ||
                   reg.tecnico.toLowerCase().includes(textoBusqueda) ||
                   reg.problema.toLowerCase().includes(textoBusqueda);
        });

        inyectarPeticionesEnTabla(registrosFiltrados);
    });
}

// --- 8. LOGOUT INSTITUCIONAL ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

// --- 9. VERIFICADOR DE SESIÓN INICIAL ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        cargarPeticionesGlobales();
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});
