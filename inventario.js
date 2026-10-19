// 1. Configuración de Firebase Oficial de tu Ecosistema Municipal
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

// Captura de referencias del DOM del Modal y Formulario
const modalEquipo = document.getElementById("modalTicket") || document.getElementById("modalEquipo"); 
const formEquipo = document.getElementById("formRegistroEquipo");
const modalTitulo = document.getElementById("modalTitulo");
const editDocId = document.getElementById("editDocId") || document.createElement("input");

if (!editDocId.id) {
    editDocId.type = "hidden";
    editDocId.id = "editDocId";
    if (formEquipo) formEquipo.appendChild(editDocId);
}

let registrosEquiposGlobales = []; // Caché para el buscador
let esUsuarioAdministrador = false; // Privilegios del operador

// --- 2. GESTIÓN Y LIMPIEZA DEL CONTENEDOR MODAL ---
const cerrarModalEquipo = () => {
    if (modalEquipo) modalEquipo.style.display = 'none';
    if (formEquipo) formEquipo.reset();
    editDocId.value = "";
};

const btnCancelar = document.getElementById("btnCancelarModal") || document.querySelector(".btn-panel-cancelar");
if (btnCancelar) btnCancelar.addEventListener("click", cerrarModalEquipo);

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalEquipo && modalEquipo.style.display === 'flex') {
        cerrarModalEquipo();
    }
});

// Vista previa estética de carga de archivos (RF021)
const inputImagen = document.getElementById("equipoImagen");
if (inputImagen) {
    inputImagen.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const extensionesPermitidas = /(\.jpg|\.jpeg|\.png)\$/i;
            if (!extensionesPermitidas.exec(file.name)) {
                alert("El tipo de archivo de las imágenes debe ser: .jpeg, .png, .jpg");
                e.target.value = '';
                return false;
            }
        }
    });
}

// --- 3. LECTURA EN TIEMPO REAL DESDE FIRESTORE (INVENTARIO GLOBAL) ---
function escucharInventarioEquipos() {
    const tbody = document.getElementById("tablaEquiposCuerpo") || document.querySelector("table tbody");
    if (!tbody) return;

    db.collection("equipos")
      .orderBy("fechaCreacion", "desc")
      .onSnapshot((snapshot) => {
          if (snapshot.empty) {
              tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #777; padding: 20px;">No hay ningún equipo registrado en el inventario actual.</td></tr>`;
              return;
          }

          registrosEquiposGlobales = [];
          snapshot.forEach((doc) => {
              registrosEquiposGlobales.push({
                  id: doc.id,
                  ...doc.data()
              });
          });

          inyectarEquiposEnTabla(registrosEquiposGlobales);
      }, (error) => {
          console.error("Error al sincronizar inventario:", error);
      });
}

// --- 4. MOTOR DEL BUSCADOR SUPERIOR CORREGIDO ---
const inputBuscarEquipo = document.getElementById("inputBuscarEquipo") || document.querySelector(".search-box input");
if (inputBuscarEquipo) {
    inputBuscarEquipo.addEventListener("input", (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();

        if (textoBusqueda === "") {
            inyectarEquiposEnTabla(registrosEquiposGlobales);
            return;
        }

        const registrosFiltrados = registrosEquiposGlobales.filter((equipo) => {
            return (equipo.tipo || "").toLowerCase().includes(textoBusqueda) || 
                   (equipo.marca || "").toLowerCase().includes(textoBusqueda) || 
                   (equipo.modelo || "").toLowerCase().includes(textoBusqueda) || 
                   (equipo.encargado || "").toLowerCase().includes(textoBusqueda);
        });

        inyectarEquiposEnTabla(registrosFiltrados);
    });
}
// --- 5. RENDERIZADO DINÁMICO DE FILAS CON ELIMINACIÓN DE BOTONES INNECESARIOS ---
function inyectarEquiposEnTabla(listaEquipos) {
    const tbody = document.getElementById("tablaEquiposCuerpo") || document.querySelector("table tbody");
    if (!tbody) return;

    tbody.innerHTML = "";
    let index = 1;

    listaEquipos.forEach((equipo) => {
        const tr = document.createElement("tr");

        const badgeCondicion = equipo.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';

        // REQUERIMIENTO COMPLETADO: Se eliminó el botón del ojo naranja de la celda de botones
        // Los botones de Editar y Eliminar se bloquean con 'disabled' automáticamente si no es Administrador
        const atributoDisabled = esUsuarioAdministrador ? "" : "disabled";
        const estiloCursor = esUsuarioAdministrador ? "pointer" : "not-allowed";

        tr.innerHTML = `
            <td><strong>${index++}</strong></td>
            <td>${equipo.id}</td>
            <td>${equipo.tipo || ''}</td>
            <td>${equipo.marca || ''}</td>
            <td>${equipo.modelo || ''}</td>
            <td>${equipo.serie || ''}</td>
            <td><span style="font-size: 11px; color: #555;">🖥️ Imagen</span></td>
            <td>${equipo.comentarios || ''}</td>
            <td><span class="badge ${badgeCondicion}">${equipo.condicion || 'Funcional'}</span></td>
            <td>${equipo.area || ''}</td>
            <td>${equipo.departamento || ''}</td>
            <td>${equipo.encargado || ''}</td>
            <td>
                <button class="btn-action-p" style="background-color: #2c9faf; padding: 6px 10px; border-radius: 4px; border: none; color: white; margin-right: 5px; cursor: ${estiloCursor};" ${atributoDisabled} id="btnEditarEq-${equipo.id}">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="btn-action-p" style="background-color: #dc4c64; padding: 6px 10px; border-radius: 4px; border: none; color: white; cursor: ${estiloCursor};" ${atributoDisabled} id="btnEliminarEq-${equipo.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        // Asignación del evento de Edición (Rellena los casilleros del modal)
        tr.querySelector(`#btnEditarEq-${equipo.id}`).addEventListener('click', () => {
            prepararEdicionEquipo(equipo);
        });

        // Asignación del evento de Eliminación
        tr.querySelector(`#btnEliminarEq-${equipo.id}`).addEventListener('click', () => {
            eliminarEquipoDelInventario(equipo.id);
        });

        tbody.appendChild(tr);
    });
}

// --- 6. ASIGNAR VALORES AL FORMULARIO PARA ACTUALIZAR ---
function prepararEdicionEquipo(equipo) {
    if (modalTitulo) modalTitulo.innerText = "Modificar Especificaciones del Equipo";
    editDocId.value = equipo.id;

    // Rellenamos cada casillero del formulario con los datos guardados en Firebase
    if (document.getElementById("equipoTipo")) document.getElementById("equipoTipo").value = equipo.tipo || "";
    if (document.getElementById("equipoMarca")) document.getElementById("equipoMarca").value = equipo.marca || "";
    if (document.getElementById("equipoModelo")) document.getElementById("equipoModelo").value = equipo.modelo || "";
    if (document.getElementById("equipoSerie")) document.getElementById("equipoSerie").value = equipo.serie || "";
    if (document.getElementById("equipoComentarios")) document.getElementById("equipoComentarios").value = equipo.comentarios || "";
    if (document.getElementById("equipoCondicion")) document.getElementById("equipoCondicion").value = equipo.condicion || "Funcional";
    if (document.getElementById("equipoArea")) document.getElementById("equipoArea").value = equipo.area || "";
    if (document.getElementById("equipoDepartamento")) document.getElementById("equipoDepartamento").value = equipo.departamento || "";
    if (document.getElementById("equipoEncargado")) document.getElementById("equipoEncargado").value = equipo.encargado || "";

    if (modalEquipo) modalEquipo.style.display = 'flex';
}

// --- 7. PERSISTENCIA DE DATOS: PROCESAR GUARDADO O EDICIÓN ---
window.registrarEquipo = async () => {
    const tipo = document.getElementById("equipoTipo").value;
    const marca = document.getElementById("equipoMarca").value;
    const modelo = document.getElementById("equipoModelo").value;
    const serie = document.getElementById("equipoSerie").value;
    const comentarios = document.getElementById("equipoComentarios").value;
    const condicion = document.getElementById("equipoCondicion").value;
    const area = document.getElementById("equipoArea").value;
    const departamento = document.getElementById("equipoDepartamento").value;
    const encargado = document.getElementById("equipoEncargado").value;
    const idParaEditar = editDocId.value;

    if (!tipo || !marca || !modelo || !serie || !area || !departamento || !encargado) {
        alert("Error: Por favor, rellene todos los campos obligatorios marcados en el formulario.");
        return;
    }

    try {
        const datosEquipo = {
            tipo, marca, modelo, serie, comentarios, condicion, area, departamento, encargado
        };

        if (idParaEditar) {
            // REQUERIMIENTO COMPLETADO: El botón de editar actualiza el documento existente
            await db.collection("equipos").doc(idParaEditar).update(datosEquipo);
            alert("¡Operación realizada correctamente! El equipo ha sido actualizado en el inventario.");
        } else {
            // Registro Regular de un artículo nuevo
            datosEquipo.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("equipos").add(datosEquipo);
            alert("¡Operación realizada correctamente! El equipo ha sido añadido al inventario.");
        }

        cerrarModalEquipo();
        
    } catch (error) {
        console.error("Error al procesar el equipo: ", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
};

const btnGuardar = document.getElementById("btnGuardarEquipo");
if (btnGuardar) btnGuardar.addEventListener("click", window.registrarEquipo);

// --- 8. ELIMINACIÓN DE REGISTROS ---
function eliminarEquipoDelInventario(id) {
    if (confirm("¿Está seguro de que desea dar de baja este equipo del inventario municipal?")) {
        db.collection("equipos").doc(id).delete()
            .then(() => alert("Equipo eliminado correctamente del sistema."))
            .catch((error) => alert("Error al eliminar: " + error.message));
    }
}

// --- 9. LOGOUT INSTITUCIONAL ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};

// --- 10. VERIFICADOR DE PRIVILEGIOS MUNICIPALES AL INICIAR ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    // REQUERIMIENTO COMPLETADO: Se oculta el botón del engrane de configuración de la parte superior
    const btnConfigEngrane = document.querySelector(".fa-gear")?.parentElement || document.querySelector(".fa-cog")?.parentElement;
    if (btnConfigEngrane) btnConfigEngrane.style.display = "none";

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;

        // Validamos si la cuenta activa cuenta con el rol de Administrador
        db.collection("usuarios_encargados")
          .where("usuarioEmail", "==", storedEmail.trim())
          .get()
          .then((snapshot) => {
              if (!snapshot.empty) {
                  snapshot.forEach((doc) => {
                      if (doc.data().role === "Administrador" || doc.data().rol === "Administrador") {
                          esUsuarioAdministrador = true;
                      }
                  });
              }
              // Lanzamos la carga sincrónica del inventario con los privilegios validados
              escucharInventarioEquipos();
          })
          .catch((error) => {
              console.error("Error al validar rol de inventario:", error);
              escucharInventarioEquipos();
          });
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});