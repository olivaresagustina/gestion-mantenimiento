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
let esUsuarioAdministrador = false; // Variable de control de privilegios del frontend

// --- 2. GESTIÓN Y LIMPIEZA DEL PANEL DE CHAT ---
const cerrarPanelChat = () => {
    panelChat.style.display = 'none';
    formChat.reset();
    document.getElementById('chatTicketDocId').value = "";
    
    if (desuscribirChatListener) {
        desuscribirChatListener();
        desuscribirChatListener = null;
    }

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

// --- 3. CONSULTA REACTIVA GLOBAL POR STATUS ASIGNADO CON VERIFICACIÓN DE MENSAJES ---
function cargarTicketsAsignadosGlobales() {
    const tbody = document.getElementById("tablaAsignadosCuerpo");
    if (!tbody) return;

    db.collection("tickets")
      .where("status", "==", "Asignado")
      .onSnapshot(async (snapshot) => {

          if (snapshot.empty) {
              tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #777; padding: 20px;">No hay ningún ticket con status 'Asignado' en el Ayuntamiento actualmente.</td></tr>`;
              return;
          }

          // Traemos en paralelo la información de los encargados para realizar el cruce de nombres
          const encargadosSnap = await db.collection("usuarios_encargados").get();
          const mapaEncargados = {};
          encargadosSnap.forEach(doc => {
              const d = doc.data();
              if (d.usuarioEmail) {
                  mapaEncargados[d.usuarioEmail.trim().toLowerCase()] = d.nombreCompleto || "Sin Nombre";
              }
          });

          // Mapeamos los documentos en un arreglo de promesas para revisar los chats en segundo plano
          const promesasTickets = snapshot.docs.map(async (doc) => {
              const data = doc.data();
              const ticketId = doc.id;
              const correoKey = (data.usuarioEmail || "").trim().toLowerCase();
              const nombreSolicitante = mapaEncargados[correoKey] || "Desconocido";

              const chatSnapshot = await db.collection("tickets")
                                             .doc(ticketId)
                                             .collection("chat")
                                             .orderBy("fechaEnvio", "desc")
                                             .limit(1)
                                             .get();

              let tieneRespuestaUsuario = false;

              if (!chatSnapshot.empty) {
                  const ultimoMsg = chatSnapshot.docs[0].data();
                  if (ultimoMsg.remitenteRol === "Usuario") {
                      tieneRespuestaUsuario = true;
                  }
              }

              return {
                  ticketId: ticketId,
                  encargado: nombreSolicitante,
                  hasNewAnswer: tieneRespuestaUsuario,
                  departamento: data.departamento || "General",
                  tecnico: data.tecnicoAsignado || "No Asignado",
                  tipoMantenimiento: data.tipoMantenimiento || "No Especificado",
                  tiempoEstimado: data.tiempoEstimadoDias || "0",
                  problema: data.detalle || "Sin especificación",
                  fechaEntrada: data.fechaPeticion || "S/F",
                  fechaSalida: data.fechaSalidaEstimada || "S/F",
                  status: data.status || "Asignado",
                  tipo: data.tipo || "",
                  marca: data.marca || "",
                  modelo: data.modelo || ""
              };
          });

          registrosAsignados = await Promise.all(promesasTickets);
          inyectarTicketsEnTabla(registrosAsignados);

      }, (error) => {
          console.error("Error en sincronía global de asignaciones:", error);
          tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: #dc4c64; padding: 20px;">Error de sincronización con el servidor de base de datos.</td></tr>`;
      });
}
// --- 4. RENDERIZADO DINÁMICO DE 10 COLUMNAS CON IDENTIFICACIÓN DE PRIVILEGIOS ---
function inyectarTicketsEnTabla(listaRegistros) {
    const tbody = document.getElementById("tablaAsignadosCuerpo");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    listaRegistros.forEach((reg) => {
        const tr = document.createElement("tr");
        tr.setAttribute("id", `fila-${reg.ticketId}`);

        let alertaRespuestaHTML = "";
        if (reg.hasNewAnswer) {
            alertaRespuestaHTML = `
                <span class="badge-alerta-admin" style="background-color: #5c1424; color: white; padding: 2px 7px; border-radius: 20px; font-weight: bold; font-size: 10px; margin-left: 5px; display: inline-flex; align-items: center; gap: 4px; animation: pulseAdmin 1.8s infinite; border: 1px solid #b8904c;">
                    <span style="width: 5px; height: 5px; background-color: #b8904c; border-radius: 50%; display: inline-block;"></span> 
                    Respuesta
                </span>
                <style>
                    @keyframes pulseAdmin {
                        0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(92, 20, 36, 0.4); }
                        70% { transform: scale(1.03); box-shadow: 0 0 0 5px rgba(92, 20, 36, 0); }
                        100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(92, 20, 36, 0); }
                    }
                </style>
            `;
        }

        // REQUERIMIENTO COMPLETADO: El atributo 'disabled' se inyecta dinámicamente si NO es Administrador
        const atributoDisabled = esUsuarioAdministrador ? "" : "disabled";

        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${reg.encargado}</td>
            <td>${reg.departamento}</td>
            <td>${reg.tecnico}</td>
            <td>${reg.tipoMantenimiento}</td>
            <td>${reg.tiempoEstimado}</td>
            <td>${reg.problema}</td>
            <td>${reg.fechaEntrada}</td>
            <td>${reg.fechaSalida}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 4px;">
                    <select class="select-status-celda" data-id="${reg.ticketId}" ${atributoDisabled} style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background-color: #b8904c; color: white; border: none; cursor: ${esUsuarioAdministrador ? 'pointer' : 'not-allowed'}; outline: none;">
                        <option value="Abierto" ${reg.status === 'Abierto' ? 'selected' : ''}>ABIERTO</option>
                        <option value="Asignado" ${reg.status === 'Asignado' ? 'selected' : ''}>ASIGNADO</option>
                        <option value="Cerrado" ${reg.status === 'Cerrado' ? 'selected' : ''}>CERRADO</option>
                    </select>
                    ${alertaRespuestaHTML}
                </div>
            </td>
        `;

        const selector = tr.querySelector('.select-status-celda');
        selector.addEventListener('click', (e) => e.stopPropagation());

        // Evento de actualización (Solo se activará si el Administrador interactúa)CORREGIDO.......................

      
                selector.addEventListener('change', async (e) => {
                    const ticketIdId = e.target.getAttribute('data-id');
                    const nuevoEstado = e.target.value;
        
                    try {
                        // Objeto base con la actualización de estatus y estampa de última gestión
                        const camposActualizados = {
                            status: nuevoEstado,
                            fechaUltimoCambioStatus: firebase.firestore.FieldValue.serverTimestamp()
                        };
        
                        // REQUERIMIENTO CUMPLIDO: Si el técnico cierra desde aquí, también capturamos fecha y hora exacta del servidor
                        if (nuevoEstado === "Cerrado" || nuevoEstado === "CERRADO") {
                            camposActualizados.fechaCierreReal = firebase.firestore.FieldValue.serverTimestamp();
                        }
        
                        // Actualizamos el documento unificado en Cloud Firestore
                        await db.collection("tickets").doc(ticketIdId).update(camposActualizados);
                        
                        alert(`¡Status del ticket actualizado correctamente a: ${nuevoEstado}!`);
                    } catch (error) {
                        console.error("Error al actualizar el status desde la celda:", error);
                        alert("No se pudo actualizar el estado: " + error.message);
                    }
                });
        


        tr.addEventListener('click', () => {
            document.querySelectorAll('#tablaAsignadosCuerpo tr').forEach(row => row.classList.remove('fila-seleccionada'));
            tr.classList.add('fila-seleccionada');
            
            activarSalaChatInterna(reg);
        });

        tbody.appendChild(tr);
    });
}

// --- 5. MONITOREO DE LA SUBCOLECCIÓN DE CHAT EN TIEMPO REAL ---
function activarSalaChatInterna(ticket) {
    if (desuscribirChatListener) desuscribirChatListener();

    document.getElementById('chatTicketDocId').value = ticket.ticketId;
    
    document.getElementById('chatTicketResumen').innerHTML = `
        <strong>Solicitante:</strong> ${ticket.encargado} (${ticket.departamento}) <br>
        <strong>Equipo afectado:</strong> ${ticket.tipo} ${ticket.marca} ${ticket.modelo} <br>
        <strong>Falla reportada:</strong> "${ticket.problema}"
    `;

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

                if (msg.remitenteRol === "Administrador") {
                    burbuja.classList.add("msg-admin");
                } else {
                    burbuja.classList.add("msg-usuario");
                }

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

            contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
        }, (error) => {
            console.error("Error al cargar la sala de chat:", error);
        });

    panelChat.style.display = 'block';
    panelChat.scrollIntoView({ behavior: 'smooth' });
}

// --- 6. ENVIAR MENSAJE A LA SUBCOLECCIÓN INTERNA ---
formChat.addEventListener('submit', async (e) => {
    e.preventDefault();

    const ticketId = document.getElementById('chatTicketDocId').value;
    const textoMensaje = document.getElementById('inputTextoMensaje').value.trim();
    const correoAdmin = localStorage.getItem("userEmail");

    if (!ticketId || !textoMensaje) return;

    try {
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

// --- 7. BUSCADOR MULTICAMPO EN TIEMPO REAL ---
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
                   reg.tecnico.toLowerCase().includes(texto) ||
                   reg.problema.toLowerCase().includes(texto);
        });

        inyectarTicketsEnTabla(filtrados);
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

// --- 9. VERIFICADOR DE SESIÓN INICIAL E IDENTIFICACIÓN DEL ROL ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;

        // Comprobamos el rol de la cuenta en la colección de encargados antes de pintar la tabla
        db.collection("usuarios_encargados")
          .where("usuarioEmail", "==", storedEmail.trim())
          .get()
          .then((snapshot) => {
              if (!snapshot.empty) {
                  snapshot.forEach((doc) => {
                      if (doc.data().rol === "Administrador") {
                          esUsuarioAdministrador = true;
                      }
                  });
              }
              // Lanzamos la descarga global con los privilegios ya configurados en memoria
              cargarTicketsAsignadosGlobales();
          })
          .catch((error) => {
              console.error("Error al validar rol del usuario:", error);
              cargarTicketsAsignadosGlobales();
          });

    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});