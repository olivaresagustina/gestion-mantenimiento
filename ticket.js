// 1. CORRECCIÓN: Credenciales Oficiales de Conexión completas
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com", // <--- Arreglado
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
function cargarTicketsDelUsuario(emailUsuario) {
    db.collection("tickets")
      .where("usuarioEmail", "==", emailUsuario)
      .onSnapshot((snapshot) => {
        
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (!tbody) return;

        tbody.innerHTML = ""; 
        let index = 1;

        if (snapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #777; padding: 20px;">No tienes ningún equipo registrado en tu cuenta actual.</td></tr>`;
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
        console.error("Error en Firestore: ", error);
        const tbody = document.getElementById("tablaTicketsCuerpo");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #dc4c64; padding: 20px;">Error al cargar los datos. Revisa las reglas o la consola.</td></tr>`;
        }
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

// --- 8. INICIALIZADOR ---
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    const storedEmail = localStorage.getItem("userEmail");

    if (storedEmail) {
        if (emailDisplay) emailDisplay.innerText = storedEmail;
        cargarTicketsDelUsuario(storedEmail);
    } else {
        alert("Acceso denegado. Por favor inicia sesión.");
        window.location.href = "index.html";
    }
});
