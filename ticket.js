// 1. Credenciales Oficiales de Conexión completas
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com", 
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// Inicializar servicios de manera segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Captura de elementos DOM
const modal = document.getElementById('modalTicket');
const form = document.getElementById('formRegistroTicket');
const modalTitulo = document.getElementById('modalTitulo');
const editDocId = document.getElementById('editDocId');

// --- 2. GESTIÓN DE MODAL ---
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modalTitulo.innerText = "Levantar Nuevo Ticket";
    editDocId.value = ""; 
    modal.style.display = 'flex';
});

document.getElementById('btnCancelarModal').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    editDocId.value = "";
});

// --- 3. ESCRITURA / ACTUALIZACIÓN FILTRADA ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('ticketTipo').value;
    const marca = document.getElementById('ticketMarca').value.trim();
    const modelo = document.getElementById('ticketModelo').value.trim();
    const serie = document.getElementById('ticketSerie').value.trim();
    const detalle = document.getElementById('ticketDetalle').value.trim();
    const condicion = document.getElementById('ticketCondicion').value;
    const idParaEditar = editDocId.value;

    const emailUsuarioLogueado = localStorage.getItem("userEmail");

    if (!emailUsuarioLogueado) {
        alert("Error de sesión: Por favor vuelva a iniciar sesión.");
        window.location.href = "index.html";
        return;
    }

    try {
        if (idParaEditar) {
            await db.collection("tickets").doc(idParaEditar).update({
                tipo, marca, modelo, serie, detalle, condicion
            });
            alert("¡Ticket modificado correctamente!");
        } else {
            await db.collection("tickets").add({
                tipo, marca, modelo, serie, detalle, condicion,
                usuarioEmail: emailUsuarioLogueado,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("¡Ticket añadido correctamente!");
        }

        form.reset();
        editDocId.value = "";
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error en el servidor: ", error);
        alert("Error al procesar la operación: " + error.message);
    }
});




// --- 4. FUNCIÓN DE LECTURA REACTIVA FILTRADA POR USUARIO ---
// --- FUNCIÓN CORREGIDA CON CAMPOS EXACTOS DE FIRESTORE ---
function cargarTicketsDelUsuario(emailUsuario) {
    const tbody = document.getElementById("tablaTicketsCuerpo");
    if (!tbody) return;

    // 1. Buscamos al empleado usando el campo exacto de tu captura: "usuarioEmail"
    db.collection("usuarios_encargados")
      .where("usuarioEmail", "==", emailUsuario)
      .get()
      .then((usuarioSnapshot) => {
          if (usuarioSnapshot.empty) {
              tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc4c64; padding: 20px;">Tu cuenta de correo no está vinculada a ningún empleado en el catálogo de Encargados.</td></tr>`;
              return;
          }

          // Extraemos el nombre completo del empleado (Ej: "Juan Pérez")
          let nombreEmpleado = "";
          usuarioSnapshot.forEach((doc) => {
              nombreEmpleado = doc.data().nombreCompleto;
          });

          if (!nombreEmpleado) return;

          // 2. Buscamos en 'equipos' usando tu campo de ordenamiento exacto: "fechaRegistro"
          db.collection("equipos")
            .where("encargado", "==", nombreEmpleado.trim())
            .orderBy("fechaRegistro", "asc") // Ajustado a tu campo real de Firebase
            .onSnapshot((snapshot) => {
              
              tbody.innerHTML = ""; 
              let index = 1;

              if (snapshot.empty) {
                  tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #777; padding: 20px;">No tienes ningún equipo de cómputo asignado a tu nombre en el inventario actual.</td></tr>`;
                  return;
              }

              snapshot.forEach((doc) => {
                  const data = doc.data();
                  const tr = document.createElement("tr");
                  const badgeStyle = data.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';

                  tr.innerHTML = `
                      <td><strong>${index++}</strong></td>
                      <td>${data.tipo || ''}</td>
                      <td>${data.marca || ''}</td>
                      <td>${data.modelo || ''}</td>
                      <td>${data.serie || ''}</td>
                      <td>${data.comentarios || 'Sin detalles adicionales'}</td>
                      <td><span class="badge ${badgeStyle}">${data.condicion || ''}</span></td>
                      <td>
                          <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' 
                              onclick="prepararEdicionTicket('${doc.id}', '${data.tipo}', '${data.marca}', '${data.modelo}', '${data.serie}', '${data.comentarios || ''}', '${data.condicion}')">
                              ✏️
                          </button>
                          <button class='btn-action-t' style='background-color: #dc4c64;' 
                              onclick="eliminarTicket('${doc.id}')">
                              🗑️
                          </button>
                      </td>
                  `;
                  tbody.appendChild(tr);
              });
          }, (error) => {
              console.error("Error en Firestore al cargar equipos:", error);
              tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc4c64; padding: 20px;">Error al cargar tus equipos asignados. Revisa el índice compuesto.</td></tr>`;
          });

      }).catch((error) => {
          console.error("Error al buscar el nombre del encargado:", error);
          tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc4c64; padding: 20px;">Error de sincronización de usuario.</td></tr>`;
      });
}







// --- 5. PREPARAR EDICIÓN ---
window.prepararEdicionTicket = function(id, tipo, marca, modelo, serie, detalle, condicion) {
    modalTitulo.innerText = "Modificar Ticket de Mantenimiento";
    editDocId.value = id;

    document.getElementById('ticketTipo').value = tipo;
    document.getElementById('ticketMarca').value = marca;
    document.getElementById('ticketModelo').value = modelo;
    document.getElementById('ticketSerie').value = serie;
    document.getElementById('ticketDetalle').value = detalle;
    document.getElementById('ticketCondicion').value = condicion;

    modal.style.display = 'flex';
};

// --- 6. ELIMINACIÓN ---
window.eliminarTicket = function(id) {
    if (confirm("¿Está seguro de que desea eliminar este registro?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => alert("Registro eliminado correctamente."))
            .catch((error) => alert("Error al eliminar: " + error.message));
    }
};

// --- 7. LOGOUT ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

// --- 8. INICIALIZADOR (ACTUALIZADO CON CARGA DE INVENTARIO) ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        // Carga los tickets del usuario
        cargarTicketsDelUsuario(storedEmail);
        // NUEVO: Ejecuta la extracción de equipos desde el almacén global
        cargarEquiposDisponibles(); 
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});

// --- 9. NUEVAS FUNCIONES DE CONEXIÓN CON LA COLECCIÓN DE EQUIPOS ---
function cargarEquiposDisponibles() {
    const selectEquipo = document.getElementById("ticketTipo");
    if (!selectEquipo) return;

    // Conectamos a la colección global 'equipos'
    db.collection("equipos").orderBy("fechaRegistro", "asc").get().then((snapshot) => {
        selectEquipo.innerHTML = '<option value="">-- Seleccione un Equipo del Inventario --</option>';
        
        if (snapshot.empty) {
            selectEquipo.innerHTML = '<option value="">No hay equipos registrados en el inventario</option>';
            return;
        }

        snapshot.forEach((doc) => {
            const datos = doc.data();
            // Formateamos una etiqueta visual atractiva e informativa para el selector
            const descripcionEquipo = `${datos.tipo || 'Equipo'} - ${datos.marca || ''} ${datos.modelo || ''} (S/N: ${datos.serie || 'S/S'})`;
            
            const option = document.createElement("option");
            option.value = datos.tipo; // Almacenamos el tipo base (Ej: Laptop)
            option.textContent = descripcionEquipo; // Texto que verá el usuario encargado
            
            // Inyectamos los datos técnicos ocultos usando atributos personalizados
            option.setAttribute('data-marca', datos.marca || '');
            option.setAttribute('data-modelo', datos.modelo || '');
            option.setAttribute('data-serie', datos.serie || '');

            selectEquipo.appendChild(option);
        });
    }).catch((error) => {
        console.error("Error de vinculación al inventario general:", error);
        selectEquipo.innerHTML = '<option value="">Error al cargar catálogo de inventario</option>';
    });
}

// Escuchador dinámico: rellena de forma inteligente Marca, Modelo y Serie al seleccionar el equipo
document.getElementById("ticketTipo").addEventListener("change", (e) => {
    const optionSeleccionada = e.target.options[e.target.selectedIndex];
    if (!optionSeleccionada || e.target.value === "") {
        // Si vuelve a la opción vacía limpiamos los inputs
        document.getElementById("ticketMarca").value = "";
        document.getElementById("ticketModelo").value = "";
        document.getElementById("ticketSerie").value = "";
        return;
    }

    // Extraemos la metadata técnica del atributo e inyectamos directamente en el formulario
    document.getElementById("ticketMarca").value = optionSeleccionada.getAttribute('data-marca');
    document.getElementById("ticketModelo").value = optionSeleccionada.getAttribute('data-modelo');
    document.getElementById("ticketSerie").value = optionSeleccionada.getAttribute('data-serie');
});
