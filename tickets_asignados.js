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

// Referencias de la interfaz gráfica
const panelChat = document.getElementById('panelChatInSitu');
const contenedorMensajes = document.getElementById('chatContenedorMensajes');
const formChat = document.getElementById('formEnviarMensaje');

let registrosAsignados = []; // Caché local para optimizar el buscador
let desuscribirChatListener = null; // Guardado del listener activo para evitar fugas de memoria

// --- 2. GESTIÓN Y LIMPIEZA DEL PANEL DE CHAT ---
const cerrarPanelChat = () => {
    panelChat.style.display = 'none';
    formChat.reset();
    document.getElementById('chatTicketDocId').value = "";
    
    // Detener la escucha en tiempo real del chat anterior si existe
    if (desuscribirChatListener) {
        desuscribirChatListener();
        desuscribirChatListener = null;
    }

    // Quitar selección visual de la tabla
    document.querySelectorAll('#tablaAsignadosCuerpo tr').forEach(tr => {
        tr.classList.remove('fila-seleccionada');
    });
};

document.getElementById('btnCerrarChatInferior').addEventListener('click', cerrarPanelChat);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelChat.style.display === 'block') {
        cerrarPanelChat();
    }
});

// --- 3. IDENTIFICAR NOMBRE DEL ADMINISTRADOR Y CARGAR SUS TICKETS ---
function inicializarMóduloAsignados(emailLogueado) {
    // Buscamos el nombre del empleado para cruzarlo con sus asignaciones técnicas
    db.collection("usuarios_encargados")
      .where("usuarioEmail", "==", emailLogueado)
      .get()
      .then((usuarioSnapshot) => {
          if (usuarioSnapshot.empty) {
              document.getElementById("tablaAsignadosCuerpo").innerHTML = `<tr><td colspan="6" style="text-align: center; color: #dc4c64; padding: 20px;">Tu cuenta no se encuentra vinculada a la lista de Encargados.</td></tr>`;
              return;
          }

          let nombreAdmin = "";
          usuarioSnapshot.forEach((doc) => {
              nombreAdmin = doc.data().nombreCompleto;
          });

          if (nombreAdmin) {
              escucharTicketsAsignados(nombreAdmin);
          }
      })
      .catch((error) => {
          console.error("Error al validar privilegios de administrador:", error);
      });
}

// --- 4. CONSULTA REACTIVA FILTRANDO ASIGNACIONES DIRECTAS ---
function escucharTicketsAsignados(nombreTecnico) {
    // Escucha en tiempo real la colección de tickets donde este administrador fue seleccionado
    db.collection("tickets")
      .where("tecnicoAsignado", "==", nombreTecnico.trim())
      .onSnapshot(async (snapshot) => {
          const tbody = document.getElementById("tablaAsignadosCuerpo");
          if (!tbody) return;

          if (snapshot.empty) {
              tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #777; padding: 20px;">No cuentas con tickets bajo tu responsabilidad actualmente.</td></tr>`;
              return;
          }

          registrosAsignados = [];

          // Obtenemos los datos de encargados para conocer el solicitante de forma clara
          const encargadosSnap = await db.collection("usuarios_encargados").get();
          const mapaEncargados = {};
          encargadosSnap.forEach(doc => {
              const d = doc.data();
              if (d.usuarioEmail) {
                  mapaEncargados[d.usuarioEmail.trim().toLowerCase()] = d.nombreCompleto || "Sin Nombre";
              }
          });

          snapshot.forEach((doc) => {
              const data = doc.data();
              const correoKey = (data.usuarioEmail || "").trim().toLowerCase();
              const nombreSolicitante = mapaEncargados[correoKey] || "Desconocido";

              registrosAsignados.push({
                  ticketId: doc.id,
                  encargado: nombreSolicitante,
                  departamento: data.departamento || "General",
                  problema: data.detalle || "Sin especificación",
                  fechaEntrada: data.fechaPeticion || "S/F",
                  status: data.status || "Asignado",
                  tipo: data.tipo || "",
                  marca: data.marca || "",
                  modelo: data.modelo || ""
              });
          });

          inyectarTicketsEnTabla(registrosAsignados);

      }, (error) => {
          console.error("Error en sincronía de asignaciones:", error);
      });
}
// --- 5. RENDERIZADO DINÁMICO DE FILAS SCROLLABLES ---
function inyectarTicketsEnTabla(listaRegistros) {
    const tbody = document.getElementById("tablaAsignadosCuerpo");
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
                <span class="badge" style="background-color: #b8904c; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                    ${reg.status}
                </span>
            </td>
        `;

        // Al hacer clic, se abre e inicializa la sala de chat correspondiente
        tr.addEventListener('click', () => {
            document.querySelectorAll('#tablaAsignadosCuerpo tr').forEach(row => row.classList.remove('fila-seleccionada'));
            tr.classList.add('fila-seleccionada');
            
            activarSalaChatInterna(reg);
        });

        tbody.appendChild(tr);
    });
}

// --- 6. MONITOREO DE LA SUBCOLECCIÓN DE CHAT EN TIEMPO REAL ---
function activarSalaChatInterna(ticket) {
    // Si ya había una sala abierta, cerramos su listener para liberar recursos
    if (desuscribirChatListener) desuscribirChatListener();

    document.getElementById('chatTicketDocId').value = ticket.ticketId;
    
    // Inyectamos un encabezado informativo para el técnico dentro de la sala
    document.getElementById('chatTicketResumen').innerHTML = `
        <strong>Solicitante:</strong> ${ticket.encargado} (${ticket.departamento}) <br>
        <strong>Equipo afectado:</strong> ${ticket.tipo} ${ticket.marca} ${ticket.modelo} <br>
        <strong>Falla reportada:</strong> "${ticket.problema}"
    `;

    // Escuchamos la subcolección de chat ordenando por fecha de envío de manera ascendente
    desuscribirChatListener = db.collection("tickets")
        .doc(ticket.ticketId)
        .collection("chat")
        .orderBy("fechaEnvio", "asc")
        .onSnapshot((snapshot) => {
            contenedorMensajes.innerHTML = "";

            if (snapshot.empty) {
                contenedorMensajes.innerHTML = `<em style="color: #aaa; text-align: center; display: block; margin-top: 20px;">No hay mensajes en esta sala. Envía una notificación para iniciar la comunicación.</em>`;
                return;
            }

            snapshot.forEach((doc) => {
                const msg = doc.data();
                const burbuja = document.createElement("div");
                burbuja.classList.add("msg-burbuja");

                // Evaluamos el remitente para aplicar estilos estéticos condicionales
                if (msg.remitenteRol === "Administrador") {
                    burbuja.classList.add("msg-admin");
                } else {
                    burbuja.classList.add("msg-usuario");
                }

                // Formatear hora de envío de manera segura
                let horaTexto = "S/H";
                if (msg.fechaEnvio) {
                    const date = msg.fechaEnvio.toDate();
                    horaTexto = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }

                burbuja.innerHTML = `
                    ${msg.texto}
                    <span class="msg-meta">${msg.remitenteNombre} • ${horaTexto}</span>
                `;
                contenedorMensajes.appendChild(burbuja);
            });

            // Hacer scroll automático al último mensaje recibido
            contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
        }, (error) => {
            console.error("Error al cargar la sala de chat:", error);
        });

    panelChat.style.display = 'block';
    panelChat.scrollIntoView({ behavior: 'smooth' });
}

// --- 7. PERSISTENCIA: ENVIAR MENSAJE A LA SUBCOLECCIÓN ---
formChat.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId = document.getElementById('chatTicketDocId').value;
    const textoMensaje = document.getElementById('inputTextoMensaje').value.trim();
    const correoAdmin = localStorage.getItem("userEmail");

    if (!ticketId || !textoMensaje) return;

    try {
        // Añadimos el nuevo documento dentro de la subcolección 'chat' del ticket activo
        await db.collection("tickets").doc(ticketId).collection("chat").add({
            texto: textoMensaje,
            remitenteEmail: correoAdmin,
            remitenteNombre: "Soporte Técnico",
            remitenteRol: "Administrador",
            fechaEnvio: firebase.firestore.FieldValue.serverTimestamp()
        });

        formChat.reset();
    } catch (error) {
        console.error("Error al subir el mensaje:", error);
        alert("No se pudo enviar el mensaje: " + error.message);
    }
});

// --- 8. BUSCADOR INTEGRADO ---
const inputBuscar = document.getElementById("inputBuscarAsignados");
if (inputBuscar) {
    inputBuscar.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase().trim();

        if (texto === "") {
            inyectarTicketsEnTabla(registrosAsignados);
            return;
        }

        const filtrados = registrosAsignados.filter(reg => {
            return reg.encargado.toLowerCase().includes(texto) ||
                   reg.departamento.toLowerCase().includes(texto) ||
                   reg.problema.toLowerCase().includes(texto);
        });

        inyectarTicketsEnTabla(filtrados);
    });
}

// --- 9. LOGOUT Y AUTENTICACIÓN ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        inicializarMóduloAsignados(storedEmail);
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});
