// 1. Configuración de Firebase (Debe coincidir exactamente con los datos de tu archivo auth.js)
const firebaseConfig = {
    apiKey: "AIzaSyDDCGTBBIspX4-_TOktQCdeo-9JfaVouoY",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "://appspot.com",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399bcd3e5301e1",
    measurementId: "G-XLE9Y7FPGM"
};

// 2. Inicializar Firebase de manera segura si no se ha inicializado previamente
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Instanciar los servicios de la base de datos
const db = firebase.firestore();

// 3. Vista previa local del nombre del archivo cargado (Estética del Formulario)
document.getElementById("equipoImagen").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        // Validar extensiones permitidas según RF021
        const extensionesPermitidas = /(\.jpg|\.jpeg|\.png)$/i;
        if (!extensionesPermitidas.exec(file.name)) {
            alert("El tipo de archivo de las imágenes debe ser: .jpeg, .png, .jpg");
            e.target.value = '';
            return false;
        }
        console.log("Archivo seleccionado listo para procesar: " + file.name);
    }
});

// 4. Función asíncrona para guardar el Equipo de Cómputo en Firebase
window.registrarEquipo = async () => {
    // Captura de elementos del DOM
    const tipo = document.getElementById("equipoTipo").value;
    const marca = document.getElementById("equipoMarca").value;
    const modelo = document.getElementById("equipoModelo").value;
    const serie = document.getElementById("equipoSerie").value;
    const comentarios = document.getElementById("equipoComentarios").value;
    const condicion = document.getElementById("equipoCondicion").value;
    const area = document.getElementById("equipoArea").value;
    const departamento = document.getElementById("equipoDepartamento").value;
    const encargado = document.getElementById("equipoEncargado").value;

    // Validación según el requerimiento RF018 (Mensaje si está incompleto)
    if (!tipo || !marca || !modelo || !serie || !area || !departamento || !encargado) {
        alert("Error: Por favor, rellene todos los campos obligatorios marcados en el formulario.");
        return;
    }

    try {
        // Guardar estructura JSON en la colección "equipos" de Cloud Firestore
        await db.collection("equipos").add({
            tipo: tipo,
            marca: marca,
            modelo: modelo,
            serie: serie,
            comentarios: comentarios,
            condicion: condicion,
            area: area,
            departamento: departamento,
            encargado: encargado,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Alerta de éxito según el requerimiento RF019
        alert("¡Operación realizada correctamente! El equipo ha sido añadido al inventario.");
        
        // Resetear el formulario automáticamente tras el registro exitoso
        document.getElementById("formRegistroEquipo").reset();
        
    } catch (error) {
        console.error("Detalle del error en Firebase: ", error);
        alert("Error al procesar la operación en el servidor: " + error.message);
    }
};

// 5. Escuchador de eventos del botón "Guardar Registro"
document.getElementById("btnGuardarEquipo").addEventListener("click", window.registrarEquipo);
