// Tus credenciales oficiales de conexión (CORREGIDO el authDomain que estaba roto)
const firebaseConfig = {
  apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
  authDomain: "gestion-mantenimiento-ap-20f51.firebaseapp.com",
  projectId: "gestion-mantenimiento-ap-20f51",
  storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
  messagingSenderId: "792321276987",
  appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
  measurementId: "G-XLE9Y7FPGM"
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

// Función para iniciar sesión (ACTUALIZADA con redirección)
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
        
        // Guardamos el correo en la sesión del navegador para mostrarlo en el Dashboard
        localStorage.setItem("userEmail", email);
        
        // REDIRECCIÓN: Te manda directo al nuevo Menú Principal
        window.location.href = "menu.html";
    } catch (error) {
        alert("Error al ingresar: " + error.message);
    }
}

// Función para cerrar sesión de forma segura desde el Dashboard
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear(); // Limpia los datos de sesión
        window.location.href = "index.html"; // Regresa al formulario de inicio
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
}

// Código automático para pintar el correo real del usuario en el Dashboard al entrar
window.addEventListener('DOMContentLoaded', () => {
    const emailDisplay = document.getElementById("userEmailDisplay");
    if (emailDisplay) {
        const storedEmail = localStorage.getItem("userEmail");
        if (storedEmail) {
            emailDisplay.innerText = storedEmail;
        }
    }
});
