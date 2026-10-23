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
    editDocId.value = ""; 
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

// Cerrar la ventana con ESC
window.addEventListener('keydown', function(e) {
    var modalAreas = document.getElementById('modalAreas');
    if (e.key === 'Escape' && modalAreas && modalAreas.style.display === 'flex') {
        document.getElementById('btnCancelarModal').click();
    }
});

// 4. Función de Registro y Edición unificada (Escritura / Actualización en Firestore)
form.addEventListener('submit', async (e) => {
    e.preventDefault(); 

    const areaValue = document.getElementById('inputArea').value.trim();
    const deptoValue = document.getElementById('inputDepartamento').value.trim();
    const idParaEditar = editDocId.value;

    if (!areaValue || !deptoValue) {
        alert("Por favor, rellene todos los campos del formulario.");
        return;
    }

    try {
        if (idParaEditar) {
            // Modo Edición
            await db.collection("areas_departamentos").doc(idParaEditar).update({
                area: areaValue,
                departamento: deptoValue
            });
            alert("¡Operación realizada correctamente! El registro ha sido modificado.");
        } else {
            // Modo Creación
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
    editDocId.value = id; 
    
    document.getElementById('inputArea').value = area;
    document.getElementById('inputDepartamento').value = departamento;
    
    modal.style.display = 'flex'; 
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

// 8. FUNCIÓN LOGOUT CONECTADA A GOOGLE FIREBASE AUTH
window.logout = async () => {
    try {
        const auth = firebase.auth(); 
        await auth.signOut();
        localStorage.clear(); 
        window.location.href = "index.html"; 
    } catch (error) {
        alert("Error al cerrar sesión institucional: " + error.message);
    }
}

// 9. VERIFICADOR DE SESIÓN CON FILTRADO DE SEGURIDAD ABSOLUTO
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.querySelector(".user-email-text");
    const storedEmail = localStorage.getItem("userEmail");
    const storedRole = localStorage.getItem("userRole");

    // A. CONTROL DE ENTRADA EXTREMO
    if (!storedEmail || !storedRole) {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
        return;
    }

    // B. EXPULSIÓN DE ROLES NO AUTORIZADOS (Dirección y Encargados)
    if (storedRole === "Encargado") {
        alert("Acceso denegado. No tienes permisos para administrar este catálogo.");
        window.location.href = "ticket.html";
        return;
    } else if (storedRole === "Director") {
        alert("Acceso denegado. Esta sección es exclusiva para el Administrador del sistema.");
        window.location.href = "menu.html";
        return;
    }

    // C. CONTINUAR CON LA CARGA SI ES ADMINISTRADOR
    if (emailDisplay) {
        emailDisplay.innerText = storedEmail;
    }
    
    cargarAreasYDepartamentos();
});

