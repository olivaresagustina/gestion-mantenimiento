// 1. Configuración de Firebase e Inicialización de Servicios Oficiales
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
let esUsuarioAdministrador = false; // Control de privilegios

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

// --- NUEVA FUNCIÓN: JALAR ADMINISTRADORES PARA EL CAMPO TÉCNICO ---
function cargarTecnicosAdministradores() {
    const selectTecnico = document.getElementById("panelTecnico");
    if (!selectTecnico) return;

    db.collection("usuarios_encargados")
      .where("rol", "==", "Administrador")
      .get()
      .then((snapshot) => {
          selectTecnico.innerHTML = '<option value="">-- Seleccione Técnico --</option>';
          
          if (snapshot.empty) {
              selectTecnico.innerHTML = '<option value="">No hay administradores registrados</option>';
              return;
          }

          snapshot.forEach((doc) => {
              const datosUser = doc.data();
              if (datosUser.nombreCompleto) {
                  const option = document.createElement("option");
                  option.value = datosUser.nombreCompleto;
                  option.textContent = datosUser.nombreCompleto;
                  selectTecnico.appendChild(option);
              }
          });
      })
      .catch((error) => {
          console.error("Error al obtener los administradores: ", error);
          selectTecnico.innerHTML = '<option value="">Error al cargar técnicos</option>';
      });
}

// --- 3. EXTRACCIÓN REACTIVA EN TIEMPO REAL DESDE CLOUD FIRESTORE ---
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

            const infoEncargado = mapaEncargados[correoKey] || { nombre: "Desconocido", departamento: "General" };
            const gestionPrevia = mapaPeticiones[ticketId] || {};

            registrosGlobales.push({
                ticketId: ticketId,
                encargado: infoEncargado.nombre,
                departamento: infoEncargado.departamento,
                problema: ticketData.detalle || "Sin descripción de falla",
                fechaEntrada: ticketData.fechaPeticion || "S/F",
                status: ticketData.status || "Abierto", 
                tecnico: ticketData.tecnicoAsignado || gestionPrevia.tecnico || "",
                tipoMantenimiento: ticketData.tipoMantenimiento || gestionPrevia.tipoMantenimiento || "",
                tiempoEstimado: ticketData.tiempoEstimadoDias || gestionPrevia.tiempoEstimado || "",
                fechaSalida: ticketData.fechaSalidaEstimada || gestionPrevia.fechaSalida || "",
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

// --- 4. CONSTRUCCIÓN DE FILAS CON ENLACE DE DATOS ---
function inyectarPeticionesEnTabla(listaRegistros) {
    const tbody = document.getElementById("tablaPeticionesCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    listaRegistros.forEach((reg) => {
        const tr = document.createElement("tr");
        tr.setAttribute("id", `fila-${reg.ticketId}`);

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

        tr.addEventListener('click', () => {
            document.querySelectorAll('#tablaPeticionesCuerpo tr').forEach(row => row.classList.remove('fila-seleccionada'));
            tr.classList.add('fila-seleccionada');
            
            mostrarPanelModificaciones(reg);
        });

        tbody.appendChild(tr);
    });
}
// --- 5. TRANSFERENCIA DE DATOS Y RENDERIZADO DEL STATUS EN EL PANEL ---
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

    const selectorStatus = document.getElementById('panelStatusTicket');
    if (selectorStatus) {
        selectorStatus.value = registro.status || "Abierto";
    }

    // APLICACIÓN DE SEGURIDAD EN EL PANEL FLOTANTE
    // Si NO es Administrador (es decir, es Director), se bloquean todos los inputs y el botón de enviar
    const inputsFormulario = formPanel.querySelectorAll('select, input:not([type="hidden"]), button[type="submit"]');
    inputsFormulario.forEach(input => {
        if (!esUsuarioAdministrador) {
            input.setAttribute('disabled', 'true');
            input.style.cursor = 'not-allowed';
            if(input.tagName === 'BUTTON') input.style.opacity = '0.5';
        } else {
            input.removeAttribute('disabled');
            input.style.cursor = 'pointer';
            if(input.tagName === 'BUTTON') input.style.opacity = '1';
        }
    });

    panelDetalles.style.display = 'block';
    panelDetalles.scrollIntoView({ behavior: 'smooth' });
}

// --- 6. GUARDAR Y ACTUALIZAR EN LA COLECCIÓN 'TICKETS' EXISTENTE ---
formPanel.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Doble validación por código para evitar inyecciones por consola
    if (!esUsuarioAdministrador) {
        alert("Error de privilegios: Tu rol de Director no permite modificar peticiones.");
        return;
    }

    const ticketId = document.getElementById('panelTicketDocId').value;
    const tecnico = document.getElementById('panelTecnico').value;
    const tipoMantenimiento = document.getElementById('panelTipoMantenimiento').value;
    const tiempoEstimado = document.getElementById('panelTiempo').value.trim();
    const fechaSalida = document.getElementById('panelFechaSalida').value;
    const nuevoStatus = document.getElementById('panelStatusTicket').value; 

    if (!ticketId) {
        alert("Error de proceso: Por favor, seleccione un ticket válido de la tabla.");
        return;
    }

    try {
        const datosActualizados = {
            tecnicoAsignado: tecnico,
            tipoMantenimiento: tipoMantenimiento,
            tiempoEstimadoDias: Number(tiempoEstimado),
            fechaSalidaEstimada: fechaSalida,
            status: nuevoStatus, 
            fechaUltimaGestion: firebase.firestore.FieldValue.serverTimestamp(),
            gestionadoPorEmail: localStorage.getItem("userEmail")
        };

        if (nuevoStatus === "Cerrado" || nuevoStatus === "CERRADO") {
            datosActualizados.fechaCierreReal = firebase.firestore.FieldValue.serverTimestamp();
        }

        await db.collection("tickets").doc(ticketId).update(datosActualizados);

        alert("¡Operación realizada correctamente! El ticket ha sido gestionado y actualizado en la base de datos.");
        ocultarYLimpiarPanel();

    } catch (error) {
        console.error("Error al actualizar el ticket en Firestore:", error);
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

// --- 9. VERIFICADOR DE SESIÓN E INICIALIZACIÓN MUNICIPAL ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");
    const storedRole = localStorage.getItem("userRole");

    // A. CONTROL ESTRICTO DE ACCESO
    if (!storedEmail || !storedRole) {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
        return;
    }

    if (storedRole === "Encargado") {
        alert("No tienes permisos para acceder a la Bandeja de Gestión.");
        window.location.href = "ticket.html";
        return;
    }

    // B. CONFIGURAR COMPORTAMIENTO SI ES ADMIN O DIRECTOR
    if (storedRole === "Administrador") {
        esUsuarioAdministrador = true;
    } else if (storedRole === "Director") {
        esUsuarioAdministrador = false; 
        console.log("Modo de vista de solo lectura configurado para Dirección.");
        
        // Ocultamos las pestañas que el director no debe ver en su barra lateral
        const segMenu = document.getElementById("seguridadMenuLink"); 
        const invMenu = document.getElementById("inventarioMenuLink");
        if (segMenu) segMenu.style.display = "none";
        if (invMenu) invMenu.style.display = "none";
    }

    // C. INICIALIZAR RENDERIZADO
    if (emailDisplay) emailDisplay.innerText = storedEmail;
    cargarPeticionesGlobales();
    cargarTecnicosAdministradores();
});
