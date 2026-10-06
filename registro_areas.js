// 1. Credenciales Oficiales de Conexión de tu Proyecto Corregidas
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// 2. Inicializar Firebase de forma segura
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();

// Elementos Globales de la Interfaz
const modal = document.getElementById('modalAreas');
const form = document.getElementById('formRegistroAreas');
const modalTitulo = document.getElementById('modalTitulo');
const editDocId = document.getElementById('editDocId');

// 3. Manejo y Control de la Ventana Modal
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modalTitulo.innerText = "Agregar Área o Departamento";
    editDocId.value = ""; // Limpiamos el ID de edición por si acaso
    modal.style.display = 'flex';
});

document.getElementById('btnCancelarModal').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    editDocId.value = "";
});

// Cerrar la ventana si se hace clic fuera del formulario
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        form.reset();
        editDocId.value = "";
    }
});



//cerrar la ventana con ESC
window.addEventListener('keydown', function(e) {
    var modalAreas = document.getElementById('modalAreas');
    if (e.key === 'Escape' && modalAreas && modalAreas.style.display === 'flex') {
        document.getElementById('btnCancelarModal').click();
    }
});




// 4. Función de Registro y Edición unificada (Escritura / Actualización en Firestore)
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue

    const areaValue = document.getElementById('inputArea').value.trim();
    const deptoValue = document.getElementById('inputDepartamento').value.trim();
    const idParaEditar = editDocId.value;

    if (!areaValue || !deptoValue) {
        alert("Por favor, rellene todos los campos del formulario.");
        return;
    }

    try {
        if (idParaEditar) {
            // SI HAY UN ID: Modo Edición (Actualizar registro existente)
            await db.collection("areas_departamentos").doc(idParaEditar).update({
                area: areaValue,
                departamento: deptoValue
                // Mantenemos la fechaCreacion original intacta
            });
            alert("¡Operación realizada correctamente! El registro ha sido modificado.");
        } else {
            // NO HAY ID: Modo Creación (Añadir nuevo registro)
            await db.collection("areas_departamentos").add({
                area: areaValue,
                departamento: deptoValue,
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("¡Operación realizada correctamente! El registro ha sido añadido.");
        }

        form.reset();
        editDocId.value = "";
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error al procesar en Firestore: ", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
});

// 5. Función de Lectura en Tiempo Real (onSnapshot)
function cargarAreasYDepartamentos() {
    db.collection("areas_departamentos").orderBy("fechaCreacion", "asc").onSnapshot((snapshot) => {
        const tbody = document.getElementById("tablaAreasCuerpo");
        if (!tbody) return;
        
        tbody.innerHTML = ""; // Limpiamos filas anteriores
        let index = 1;

        snapshot.forEach((doc) => {
            const data = doc.data();
            const tr = document.createElement("tr");

            // Pasamos los valores entre comillas simples escapadas a la función prepararEdicion
            tr.innerHTML = `
                <td>${index++}</td>
                <td>${data.area || ''}</td>
                <td>${data.departamento || ''}</td>
                <td>
                    <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' onclick="prepararEdicion('${doc.id}', '${data.area || ''}', '${data.departamento || ''}')">✏️</button>
                    <button class='btn-action-t' style='background-color: #dc4c64;' onclick="eliminarRegistro('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error de lectura reactiva en Firestore: ", error);
    });
}

// 6. Nueva función para cargar los datos en el modal antes de editar
window.prepararEdicion = function(id, area, departamento) {
    modalTitulo.innerText = "Modificar Área o Departamento";
    editDocId.value = id; // Guardamos el ID del documento en el input invisible
    
    // Inyectamos los textos actuales en los inputs
    document.getElementById('inputArea').value = area;
    document.getElementById('inputDepartamento').value = departamento;
    
    modal.style.display = 'flex'; // Desplegamos el modal flotante
};

// 7. Función para dar de Baja (Eliminación en Firestore)
window.eliminarRegistro = function(id) {
    if (confirm("¿Está seguro de que desea eliminar este registro del sistema?")) {
        db.collection("areas_departamentos").doc(id).delete()
            .then(() => {
                alert("Registro eliminado de la base de datos correctamente.");
            })
            .catch((error) => {
                alert("Error al intentar eliminar el registro: " + error.message);
            });
    }
};

// Carga automática inicial de la tabla
window.addEventListener('DOMContentLoaded', cargarAreasYDepartamentos);



  // --- CÓDIGO CORREGIDO: INICIALIZACIÓN DE DATOS Y FUNCIÓN LOGOUT ---
  window.addEventListener('DOMContentLoaded', () => {
    // CORRECCIÓN: El elemento en este HTML tiene la clase 'user-email-text'
    const emailDisplay = document.querySelector(".user-email-text");
    if (emailDisplay) {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) {
            emailDisplay.innerText = storedEmail;
        }
    }
});

// FUNCIÓN LOGOUT CONECTADA A GOOGLE FIREBASE AUTH
window.logout = async () => {
    try {
        const auth = firebase.auth(); // Instanciamos Auth localmente de forma segura
        await auth.signOut();
        localStorage.clear(); // Limpiamos datos de sesión en el navegador
        window.location.href = "index.html"; // Redirección al login
    } catch (error) {
        alert("Error al cerrar sesión institucional: " + error.message);
    }
}
