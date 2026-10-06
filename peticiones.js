// 1. Configuración de Firebase e Inicialización de Servicios
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

// Captura de elementos del DOM
const modal = document.getElementById('modalGestionPeticion');
const form = document.getElementById('formGestionPeticion');
let registrosGlobales = []; // Caché para el filtro del buscador en tiempo real

// --- 2. GESTIÓN DEL MODAL FLOTANTE ---
document.getElementById('btnCerrarModalPet').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    document.getElementById('ticketDocId').value = "";
});

// Accesibilidad con la tecla ESC
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
        form.reset();
        document.getElementById('ticketDocId').value = "";
    }
});
// --- 3. LECTURA REACTIVA GLOBAL Y CRUCE DE DATOS ---
function cargarPeticionesGlobales() {
    // 1. Escuchamos en tiempo real la colección de tickets (sin importar el usuario)
    db.collection("tickets").onSnapshot(async (ticketsSnapshot) => {
        const tbody = document.getElementById("tablaPeticionesCuerpo");
        if (!tbody) return;

        if (ticketsSnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No hay ningún ticket levantado en el sistema actualmente.</td></tr>`;
            return;
        }

        // Limpiamos caché global para el buscador
        registrosGlobales = [];

        // Descargamos en paralelo los catálogos auxiliares para agilizar el cruce
        const [encargadosSnap, peticionesSnap] = await Promise.all([
            db.collection("usuarios_encargados").get(),
            db.collection("peticiones").get()
        ]);

        // Mapeamos encargados por correo electrónico para obtener su nombre y departamento
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

        // Mapeamos las peticiones ya gestionadas usando el ID del ticket como llave
        const mapaPeticiones = {};
        peticionesSnap.forEach(doc => {
            mapaPeticiones[doc.data().ticketId] = doc.data();
        });

        // Procesamos cada ticket levantado
        ticketsSnapshot.forEach((docTicket) => {
            const ticketData = docTicket.data();
            const ticketId = docTicket.id;
            const correoKey = (ticketData.usuarioEmail || "").trim().toLowerCase();

            // Obtenemos datos del encargado mediante el cruce por correo electrónico
            const infoEncargado = mapaEncargados[correoKey] || { nombre: "Desconocido", departamento: "No Asignado" };
            
            // Obtenemos datos de gestión previa si ya existen en la colección 'peticiones'
            const gestionPrevia = mapaPeticiones[ticketId] || {};

            // Consolidamos el objeto completo para la tabla y el buscador
            registrosGlobales.push({
                ticketId: ticketId,
                encargado: infoEncargado.nombre,
                departamento: infoEncargado.departamento,
                problema: ticketData.detalle || "Sin descripción de falla",
                fechaEntrada: ticketData.fechaPeticion || "S/F", // Jalado directamente del registro original del ticket
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

        // Pintamos la tabla con la caché unificada
        inyectarPeticionesEnTabla(registrosGlobales);

    }, (error) => {
        console.error("Error crítico en la lectura global de Firestore:", error);
        const tbody = document.getElementById("tablaPeticionesCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px;">Error de autenticación o reglas al sincronizar el panel.</td></tr>`;
        }
    });
}

// --- 4. RENDERIZADO DINÁMICO DE FILAS EN LA TABLA ---
function inyectarPeticionesEnTabla(listaRegistros) {
    const tbody = document.getElementById("tablaPeticionesCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    listaRegistros.forEach((reg) => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${reg.encargado}</td>
            <td>${reg.departamento}</td>
            <td>${reg.tecnico || '<em style="color:#aaa;">Vacío</em>'}</td>
            <td>${reg.tipoMantenimiento || '<em style="color:#aaa;">Vacío</em>'}</td>
            <td>${reg.tiempoEstimado || '<em style="color:#aaa;">Vacío</em>'}</td>
            <td>${reg.problema}</td>
            <td>${reg.fechaEntrada}</td>
            <td>${reg.fechaSalida || '<em style="color:#aaa;">Vacío</em>'}</td>
            <td>
                <button class="btn-action-p" style="background-color: #2c9faf;" 
                    onclick="abrirGestionModal('${reg.ticketId}', '${reg.encargado.replace(/'/g, "\\'")}', '${reg.problema.replace(/'/g, "\\'")}', '${reg.fechaEntrada}', '${reg.tecnico}', '${reg.tipoMantenimiento}', '${reg.tiempoEstimado}', '${reg.fechaSalida}')">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}
// --- 5. DISPARADOR DE LA VENTANA MODAL DE GESTIÓN TÉCNICA ---
window.abrirGestionModal = function(ticketId, encargado, problema, fechaEntrada, tecnico, tipoMantenimiento, tiempoEstimado, fechaSalida) {
    // Inyectamos el ID del documento original en el input oculto
    document.getElementById('ticketDocId').value = ticketId;

    // Pintamos los datos que se jalan del ticket original en los campos bloqueados (grises)
    document.getElementById('modalEncargado').value = encargado;
    document.getElementById('modalProblema').value = problema;

    // Rellenamos los campos de escritura con datos previos si ya existía una gestión, o los dejamos vacíos
    document.getElementById('petTecnico').value = tecnico !== "undefined" && tecnico !== "" ? tecnico : "";
    document.getElementById('petTipoMantenimiento').value = tipoMantenimiento !== "undefined" && tipoMantenimiento !== "" ? tipoMantenimiento : "";
    document.getElementById('petTiempo').value = tiempoEstimado !== "undefined" && tiempoEstimado !== "" ? tiempoEstimado : "";
    document.getElementById('petFechaSalida').value = fechaSalida !== "undefined" && fechaSalida !== "" ? fechaSalida : "";

    // Desplegamos la ventana modal con animación flex
    modal.style.display = 'flex';
};

// --- 6. ACCIÓN DE GUARDADO EN LA NUEVA COLECCIÓN 'PETICIONES' ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId = document.getElementById('ticketDocId').value;
    const tecnico = document.getElementById('petTecnico').value;
    const tipoMantenimiento = document.getElementById('petTipoMantenimiento').value;
    const tiempoEstimado = document.getElementById('petTiempo').value.trim();
    const fechaSalida = document.getElementById('petFechaSalida').value;

    if (!ticketId) {
        alert("Error crítico: No se reconoció el ID del ticket original.");
        return;
    }

    try {
        // Guardamos los datos vinculando el registro directamente al ID del ticket original
        // Usamos .doc(ticketId).set() para que si ya existe lo actualice, y si no, lo cree de cero
        await db.collection("peticiones").doc(ticketId).set({
            ticketId: ticketId,
            tecnico: tecnico,
            tipoMantenimiento: tipoMantenimiento,
            tiempoEstimado: tiempoEstimado,
            fechaSalida: fechaSalida,
            fechaGestion: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("¡Gestión técnica de la petición guardada con éxito!");
        
        // Cerramos el modal de forma limpia y restablecemos los controles del formulario
        modal.style.display = 'none';
        form.reset();
        document.getElementById('ticketDocId').value = "";

    } catch (error) {
        console.error("Error al almacenar la petición de soporte:", error);
        alert("Error al procesar la operación: " + error.message);
    }
});

// --- 7. BARRA DE BÚSQUEDA MULTICAMPO EN TIEMPO REAL ---
const inputBuscar = document.getElementById("inputBuscarPeticion");
if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();

        if (textoBusqueda === "") {
            inyectarPeticionesEnTabla(registrosGlobales);
            return;
        }

        // Filtramos la caché local analizando múltiples parámetros de la celda
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
        alert("Error al cerrar sesión municipal: " + error.message);
    }
};

// --- 9. INICIALIZADOR DE SEGURIDAD AL CARGAR LA PÁGINA ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        // Ejecuta el motor reactivo de cruce de datos global
        cargarPeticionesGlobales();
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});
