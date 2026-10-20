// ==========================================================================
//Continuacion registro equipo
// ==========================================================================

// 1. Configuración de Firebase (Datos institucionales del Ayuntamiento)
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// Inicializar servicios de Firebase de forma segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// Variables globales de control y caché local
let equiposGlobales = [];
let editEquipoId = ""; // Almacena el ID cuando estamos en modo Edición

// 2. Validación estética de extensiones para la imagen del equipo
const campoImagen = document.getElementById("equipoImagen");
if (campoImagen) {
    campoImagen.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            const extensionesPermitidas = /(\.jpg|\.jpeg|\.png)$/i;
            if (!extensionesPermitidas.exec(file.name)) {
                alert("El tipo de archivo de las imágenes debe ser: .jpeg, .png, .jpg");
                e.target.value = '';
                return false;
            }
            console.log("Imagen lista para procesar: " + file.name);
        }
    });
}

// 3. Función Unificada: Guardar Registro Nuevo o Modificar Existente
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

    // Validación estricta de campos obligatorios marcados en la interfaz
    if (!tipo || !marca || !modelo || !serie || !area || !departamento || !encargado) {
        alert("Error: Por favor, rellene todos los campos obligatorios marcados en el formulario.");
        return;
    }

    try {
        const datosEquipo = {
            tipo, marca, modelo, serie, comentarios, condicion, area, departamento, encargado
        };

        if (editEquipoId) {
            // MODO EDICIÓN: Actualiza el documento en base a su ID único
            await db.collection("equipos").doc(editEquipoId).update(datosEquipo);
            alert("¡Operación realizada correctamente! El equipo ha sido modificado en el inventario.");
            editEquipoId = "";
            
            const tituloForm = document.getElementById("tituloFormEquipo");
            if (tituloForm) tituloForm.innerText = "REGISTRAR NUEVO EQUIPO";
        } else {
            // MODO CREACIÓN: Inserta un nuevo documento con marca de tiempo del servidor
            datosEquipo.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection("equipos").add(datosEquipo);
            alert("¡Operación realizada correctamente! El equipo ha sido añadido al inventario.");
        }

        // Limpieza y reseteo de la interfaz flotante
        document.getElementById("formRegistroEquipo").reset();
        
        // Bloquear selectores dependientes después de limpiar
        document.getElementById("equipoDepartamento").innerHTML = '<option value="">Selecciona primero un área...</option>';
        document.getElementById("equipoEncargado").innerHTML = '<option value="">Selecciona primero un departamento...</option>';
        
    } catch (error) {
        console.error("Error en operación del servidor: ", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
};
// ==========================================================================
// ARCHIVO: inventario.js (Control de Inventario - PARTE 2 DE 3)
// ==========================================================================

// 4. Carga de Datos en Tiempo Real y Renderizado de la Tabla General
function cargarInventarioEquipos() {
    db.collection("equipos").onSnapshot((snapshot) => {
        const tbody = document.getElementById("tablaEquiposCuerpo");
        if (!tbody) return;

        tbody.innerHTML = "";
        equiposGlobales = [];
        let index = 1;

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #777; padding: 20px;">No hay ningún equipo registrado en el sistema.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const idDoc = doc.id;

            // Guardamos en la caché local para que el buscador funcione de inmediato
            equiposGlobales.push({ id: idDoc, ...data });

            const tr = document.createElement("tr");

            // REQUERIMIENTO CUMPLIDO: Se eliminó el botón de engrane del header y los botones de "ojo" de las celdas de acción.
            // REQUERIMIENTO CUMPLIDO: El botón de editar (✏️) ahora funciona de forma reactiva cargando los datos al formulario.
            tr.innerHTML = `
                <td><input type="checkbox" class="check-equipo" data-id="${idDoc}"></td>
                <td><strong>${index++}</strong></td>
                <td>${data.tipo || ''}</td>
                <td>${data.marca || ''}</td>
                <td>${data.modelo || ''}</td>
                <td>${data.serie || ''}</td>
                <td>
                    <span style="font-size: 11px; color: #555; display: inline-flex; align-items: center; gap: 4px;">
                        🖼️ Equipo
                    </span>
                </td>
                <td>${data.comentarios || ''}</td>
                <td>
                    <span class="badge" style="background-color: ${data.condicion === 'Mantenimiento' ? '#dc4c64' : '#2c9faf'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                        ${data.condicion || 'Funcional'}
                    </span>
                </td>
                <td>${data.area || ''}</td>
                <td>${data.departamento || ''}</td>
                <td>${data.encargado || ''}</td>
                <td>
                    <button class='btn-action-t' style='background-color: #2c9faf; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;' onclick="prepararEdicionEquipo('${idDoc}', '${data.tipo || ''}', '${data.marca || ''}', '${data.modelo || ''}', '${data.serie || ''}', '${data.comentarios || ''}', '${data.condicion || ''}', '${data.area || ''}', '${data.departamento || ''}', '${data.encargado || ''}')">✏️</button>
                    <button class='btn-action-t' style='background-color: #dc4c64; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;' onclick="eliminarEquipo('${idDoc}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error al leer la colección de equipos: ", error);
    });
}

// 5. REQUERIMIENTO CUMPLIDO: Función para mapear datos exactos al formulario al presionar Editar
window.prepararEdicionEquipo = async function(id, tipo, marca, modelo, serie, comentarios, condicion, area, departamento, encargado) {
    editEquipoId = id; // Fijamos el ID del documento en memoria global

    const tituloForm = document.getElementById("tituloFormEquipo");
    if (tituloForm) tituloForm.innerText = "MODIFICAR EQUIPO DE CÓMPUTO";

    // Inyección de textos básicos e inmediatos
    document.getElementById("equipoTipo").value = tipo;
    document.getElementById("equipoMarca").value = marca;
    document.getElementById("equipoModelo").value = modelo;
    document.getElementById("equipoSerie").value = serie;
    document.getElementById("equipoComentarios").value = comentarios;
    document.getElementById("equipoCondicion").value = condicion;

    // Sincronización asíncrona de los selectores en cascada para la edición
    document.getElementById("equipoArea").value = area;
    
    // Forzamos la carga del departamento correspondiente al área guardada
    await cargarDepartamentosPorArea(area);
    document.getElementById("equipoDepartamento").value = departamento;

    // Forzamos la carga del encargado correspondiente al departamento guardado
    await cargarEncargadosPorDepartamento(departamento);
    document.getElementById("equipoEncargado").value = encargado;

    // Movimiento fluido del scroll hacia la ventana o sección del formulario
    const formulario = document.getElementById("formRegistroEquipo");
    if (formulario) formulario.scrollIntoView({ behavior: 'smooth' });
};

// 6. Eliminar registro físico de Cloud Firestore
window.eliminarEquipo = function(id) {
    if (confirm("¿Está seguro de que desea eliminar este equipo de cómputo del inventario global?")) {
        db.collection("equipos").doc(id).delete()
            .then(() => alert("Equipo removido del inventario correctamente."))
            .catch((error) => alert("Error al remover el equipo: " + error.message));
    }
};
// ==========================================================================
// ARCHIVO: inventario.js (Control de Inventario - PARTE 3 DE 3)
// ==========================================================================

// 7. REQUERIMIENTO CUMPLIDO: Motor del Buscador Multicampo en Tiempo Real
const inputBuscarEquipo = document.getElementById("inputBuscarEquipo");
if (inputBuscarEquipo) {
    inputBuscarEquipo.addEventListener("input", (e) => {
        const textoBusqueda = e.target.value.toLowerCase().trim();

        if (textoBusqueda === "") {
            reinyectarTablaFiltrada(equiposGlobales);
            return;
        }

        // Filtro reactivo multicriterio sobre la caché local (optimiza memoria)
        const filtrados = equiposGlobales.filter((eq) => {
            return (eq.tipo || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.marca || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.modelo || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.serie || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.encargado || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.area || "").toLowerCase().includes(textoBusqueda) ||
                   (eq.departamento || "").toLowerCase().includes(textoBusqueda);
        });

        reinyectarTablaFiltrada(filtrados);
    });
}

// Función auxiliar del buscador para reconstruir de inmediato el cuerpo de la tabla
function reinyectarTablaFiltrada(listaFiltrada) {
    const tbody = document.getElementById("tablaEquiposCuerpo");
    if (!tbody) return;
    tbody.innerHTML = "";
    let index = 1;

    if (listaFiltrada.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #dc4c64; padding: 20px;">No se encontraron equipos que coincidan con la búsqueda.</td></tr>`;
        return;
    }

    listaFiltrada.forEach((data) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="checkbox" class="check-equipo" data-id="${data.id}"></td>
            <td><strong>${index++}</strong></td>
            <td>${data.tipo || ''}</td>
            <td>${data.marca || ''}</td>
            <td>${data.modelo || ''}</td>
            <td>${data.serie || ''}</td>
            <td>
                <span style="font-size: 11px; color: #555; display: inline-flex; align-items: center; gap: 4px;">
                    🖼️ Equipo
                </span>
            </td>
            <td>${data.comentarios || ''}</td>
            <td>
                <span class="badge" style="background-color: ${data.condicion === 'Mantenimiento' ? '#dc4c64' : '#2c9faf'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                    ${data.condicion || 'Funcional'}
                </span>
            </td>
            <td>${data.area || ''}</td>
            <td>${data.departamento || ''}</td>
            <td>${data.encargado || ''}</td>
            <td>
                <button class='btn-action-t' style='background-color: #2c9faf; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;' onclick="prepararEdicionEquipo('${data.id}', '${data.tipo || ''}', '${data.marca || ''}', '${data.modelo || ''}', '${data.serie || ''}', '${data.comentarios || ''}', '${data.condicion || ''}', '${data.area || ''}', '${data.departamento || ''}', '${data.encargado || ''}')">✏️</button>
                <button class='btn-action-t' style='background-color: #dc4c64; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;' onclick="eliminarEquipo('${data.id}')">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 8. REQUERIMIENTO CUMPLIDO: Algoritmos para Carga de Selectores Dinámicos en Cascada
function cargarTodasLasAreas() {
    const selectArea = document.getElementById("equipoArea");
    if (!selectArea) return;

    db.collection("areas_departamentos").get().then((snapshot) => {
        selectArea.innerHTML = '<option value="">-- Seleccione Área --</option>';
        const areasAgregadas = new Set();

        snapshot.forEach((doc) => {
            const areaName = doc.data().area;
            if (areaName && !areasAgregadas.has(areaName)) {
                areasAgregadas.add(areaName);
                const option = document.createElement("option");
                option.value = areaName;
                option.textContent = areaName;
                selectArea.appendChild(option);
            }
        });
    }).catch(err => console.error("Error al obtener áreas:", err));
}

function cargarDepartamentosPorArea(areaSeleccionada) {
    return new Promise((resolve) => {
        const selectDepto = document.getElementById("equipoDepartamento");
        if (!selectDepto) return resolve();

        if (!areaSeleccionada) {
            selectDepto.innerHTML = '<option value="">Selecciona primero un área...</option>';
            return resolve();
        }

        db.collection("areas_departamentos")
          .where("area", "==", areaSeleccionada)
          .get()
          .then((snapshot) => {
              selectDepto.innerHTML = '<option value="">-- Seleccione Departamento --</option>';
              const deptosAgregados = new Set();

              snapshot.forEach((doc) => {
                  const deptoName = doc.data().departamento;
                  if (deptoName && !deptosAgregados.has(deptoName)) {
                      deptosAgregados.add(deptoName);
                      const option = document.createElement("option");
                      option.value = deptoName;
                      option.textContent = deptoName;
                      selectDepto.appendChild(option);
                  }
              });
              resolve();
          }).catch(err => {
              console.error("Error al cargar departamentos:", err);
              resolve();
          });
    });
}

function cargarEncargadosPorDepartamento(deptoSeleccionado) {
    return new Promise((resolve) => {
        const selectEncargado = document.getElementById("equipoEncargado");
        if (!selectEncargado) return resolve();

        if (!deptoSeleccionado) {
            selectEncargado.innerHTML = '<option value="">Selecciona primero un departamento...</option>';
            return resolve();
        }

        db.collection("usuarios_encargados")
          .where("departamento", "==", deptoSeleccionado)
          .get()
          .then((snapshot) => {
              selectEncargado.innerHTML = '<option value="">-- Seleccione Encargado --</option>';
              
              if (snapshot.empty) {
                  selectEncargado.innerHTML = '<option value="">No hay encargados en este depto</option>';
                  return resolve();
              }

              snapshot.forEach((doc) => {
                  const nombre = doc.data().nombreCompleto;
                  if (nombre) {
                      const option = document.createElement("option");
                      option.value = nombre;
                      option.textContent = nombre;
                      selectEncargado.appendChild(option);
                  }
              });
              resolve();
          }).catch(err => {
              console.error("Error al cargar encargados:", err);
              resolve();
          });
    });
}

// Eventos de escucha para los selectores del formulario flotante
const elArea = document.getElementById("equipoArea");
if (elArea) {
    elArea.addEventListener("change", (e) => {
        cargarDepartamentosPorArea(e.target.value);
        document.getElementById("equipoEncargado").innerHTML = '<option value="">Selecciona primero un departamento...</option>';
    });
}

const elDepto = document.getElementById("equipoDepartamento");
if (elDepto) {
    elDepto.addEventListener("change", (e) => {
        cargarEncargadosPorDepartamento(e.target.value);
    });
}

// 9. Inicialización de Sesión e Inyección Automática al Cargar la Página
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        
        // Ejecución de lectores base
        cargarInventarioEquipos();
        cargarTodasLasAreas();
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});

// 10. Control del botón del Formulario e Invocación de Cierre Segura
const btnGuardar = document.getElementById("btnGuardarEquipo");
if (btnGuardar) {
    btnGuardar.addEventListener("click", window.registrarEquipo);
}

window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};
