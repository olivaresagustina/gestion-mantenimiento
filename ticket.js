// 1. Credenciales Oficiales Corregidas de Conexión
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

// Variables globales para la captura de elementos DOM
const modal = document.getElementById('modalTicket');
const form = document.getElementById('formRegistroTicket');
const modalTitulo = document.getElementById('modalTitulo');
const editDocId = document.getElementById('editDocId');

// --- 2. GESTIÓN Y MANEJO DE LA VENTANA MODAL ---
document.getElementById('btnAbrirModal').addEventListener('click', () => {
    modalTitulo.innerText = "Levantar Nuevo Ticket";
    editDocId.value = ""; // Nos aseguramos de limpiar el id de edición
    modal.style.display = 'flex';
});

document.getElementById('btnCancelarModal').addEventListener('click', () => {
    modal.style.display = 'none';
    form.reset();
    editDocId.value = "";
});


// --- 3. ESCRITURA Y ACTUALIZACIÓN EN FIRESTORE ENLAZADO AL USUARIO ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = document.getElementById('ticketTipo').value;
    const marca = document.getElementById('ticketMarca').value.trim();
    const modelo = document.getElementById('ticketModelo').value.trim();
    const serie = document.getElementById('ticketSerie').value.trim();
    const detalle = document.getElementById('ticketDetalle').value.trim();
    const condicion = document.getElementById('ticketCondicion').value;
    const idParaEditar = editDocId.value;

    // Recuperamos el correo activo guardado en el inicio de sesión
    const emailUsuarioLogueado = localStorage.getItem("userEmail");

    if (!emailUsuarioLogueado) {
        alert("Error de sesión: No se detectó un usuario activo. Por favor vuelva a iniciar sesión.");
        window.location.href = "index.html";
        return;
    }

    try {
        if (idParaEditar) {
            // MODO EDICIÓN: Modifica el documento sin alterar el dueño original
            await db.collection("tickets").doc(idParaEditar).update({
                tipo, marca, modelo, serie, detalle, condicion
            });
            alert("¡Operación realizada correctamente! El ticket ha sido modificado.");
        } else {
            // MODO CREACIÓN: Guarda vinculando permanentemente el email de la sesión activa
            await db.collection("tickets").add({
                tipo, marca, modelo, serie, detalle, condicion,
                usuarioEmail: emailUsuarioLogueado, // <--- FILTRO CLAVE
                fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
            });
            alert("¡Operación realizada correctamente! El ticket ha sido añadido a tu lista.");
        }

        form.reset();
        editDocId.value = "";
        modal.style.display = 'none';

    } catch (error) {
        console.error("Detalle del error en el servidor: ", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
});


// --- 4. FUNCIÓN DE LECTURA REACTIVA EN TIEMPO REAL CON FILTRO SEGURO (.where) ---
function cargarTicketsDelUsuario(emailUsuario) {
    // Aplicamos el filtro .where para traer ÚNICAMENTE los registros de este correo específico
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .orderBy("fechaCreacion", "desc")
      .onSnapshot((snapshot) => {
        
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (!tbody) return;

        tbody.innerHTML = ""; // Limpiamos filas previas de la pantalla
        let index = snapshot.size; // Enumeración descendente estética de los registros del usuario

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #777; padding: 20px;">No tienes ningún equipo o ticket registrado en tu cuenta actual.</td></tr>`;
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const tr = document.createElement("tr");

            // Selector dinámico de clases para el diseño de las celdas de condición
            const badgeStyle = data.condicion === 'Mantenimiento' ? 'badge-mantenimiento' : 'badge-funcional';

            tr.innerHTML = `
                <td><strong>${index--}</strong></td>
                <td>${data.tipo || ''}</td>
                <td>${data.marca || ''}</td>
                <td>${data.modelo || ''}</td>
                <td>${data.serie || ''}</td>
                <td>${data.detalle || ''}</td>
                <td><span class="badge ${badgeStyle}">${data.condicion || ''}</span></td>
                <td>
                    <button class='btn-action-t' style='background-color: #2c9faf; margin-right: 5px;' 
                        onclick="prepararEdicionTicket('${doc.id}', '${data.tipo}', '${data.marca}', '${data.modelo}', '${data.serie}', '${data.detalle}', '${data.condicion}')">
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
        console.error("Error en la lectura reactiva filtrada de Firestore: ", error);
        
        // Manejo amigable de la falta de índices compuestos iniciales en Firestore si fuese el caso
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc4c64;">Error al cargar la tabla filtrada. Revisa la consola del navegador.</td></tr>`;
        }
    });
}


// --- 5. PREPARAR INTERFAZ PARA EDICIÓN DE DATOS ---
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


// --- 6. BAJA / ELIMINACIÓN DE UN REGISTRO ---
window.eliminarTicket = function(id) {
    if (confirm("¿Está completamente seguro de que desea eliminar permanentemente este registro del inventario?")) {
        db.collection("tickets").doc(id).delete()
            .then(() => alert("Registro eliminado de la base de datos correctamente."))
            .catch((error) => alert("Error al intentar eliminar el registro: " + error.message));
    }
};


// --- 7. CONTROL DE CIERRE DE SESIÓN SEGURO ---
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear();
        window.location.href = "index.html";
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};


// --- 8. DISPARADOR AUTOMÁTICO INICIAL AL CARGAR LA PÁGINA ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        // Lanzamos la carga pasando exclusivamente el email activo detectado
        cargarTicketsDelUsuario(storedEmail);
    } else {
        alert("Acceso denegado: Por favor inicia sesión primero.");
        window.location.href = "index.html";
    }
});
