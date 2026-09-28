// 1. Credenciales Oficiales de Conexión de tu Proyecto
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

// 2. Inicializar Firebase de forma segura si no se ha iniciado antes
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();

// Elementos Globales de la Interfaz
const modal = document.getElementById('modalAreas');
const form = document.getElementById('formRegistroAreas');

// 3. Manejo y Control de la Ventana Modal
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modal.style.display = 'flex';
});

document.getElementById('btnCancelarModal').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
});

// Cerrar la ventana si se hace clic fuera del formulario
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
        form.reset();
    }
});

// 4. Función de Registro (Escritura en Cloud Firestore)
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evitamos que la página se recargue

    const areaValue = document.getElementById('inputArea').value.trim();
    const deptoValue = document.getElementById('inputDepartamento').value.trim();

    if (!areaValue || !deptoValue) {
        alert("Por favor, rellene todos los campos del formulario.");
        return;
    }

    try {
        // Almacenamos en una nueva colección llamada 'areas_departamentos'
        await db.collection("areas_departamentos").add({
            area: areaValue,
            departamento: deptoValue,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("¡Operación realizada correctamente! El registro ha sido añadido.");
        form.reset();
        modal.style.display = 'none';

    } catch (error) {
        console.error("Error al guardar en Firestore: ", error);
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
                    <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;'>✏️</button>
                    <button class='btn-action-t' style='background-color: #dc4c64;' onclick="eliminarRegistro('${doc.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error de lectura reactiva en Firestore: ", error);
    });
}

// 6. Función para dar de Baja (Eliminación en Firestore)
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
