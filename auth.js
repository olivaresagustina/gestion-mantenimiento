// Tus credenciales oficiales de conexión (CORREGIDO el authDomain que estaba roto)
const firebaseConfig = {
    apiKey: "AIzaSyDDCGT88IspX4-_TOKlQcdeo-93favOuoy",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e"
};
  
// Inicializamos Firebase de forma tradicional compatible con navegadores
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Función para registrar usuarios (Presidencia Municipal)
window.registerUser = async () => {
    const cedula = document.getElementById("cedula").value;
    const fullName = document.getElementById("fullName").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const role = document.getElementById("role").value;

    // Validación básica de campos vacíos
    if (!cedula || !fullName || !email || !password || !role) {
        alert("Por favor, rellene todos los campos del formulario.");
        return;
    }

    try {
        // Guarda al usuario en la nube de Google Firebase Auth
        await auth.createUserWithEmailAndPassword(email, password);
        alert(`¡Usuario registrado con éxito en la nube!\nNombre: ${fullName}\nRol: ${role}`);
        document.getElementById("registerForm").reset();
    } catch (error) {
        alert("Error al registrar en Firebase: " + error.message);
    }
}

// Función para iniciar sesión
window.login = async () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    
    // Validación básica de campos vacíos
    if (!email || !password) {
        alert("Por favor, ingresa tu correo y contraseña.");
        return;
    }

    try {
        // Ejecuta el inicio de sesión en Google
        await auth.signInWithEmailAndPassword(email, password);
        alert("¡Bienvenido al sistema de la Presidencia Municipal!");
    } catch (error) {
        alert("Error al ingresar: " + error.message);
    }
}

  