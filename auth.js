// Asegúrate de que las credenciales oficiales estén inicializadas
const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "gestion-mantenimiento-ap-20f51.firebaseapp.com", //  CORREGIDO
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};
    
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// FUNCIÓN DE INICIO DE SESIÓN CON FILTRADO DE ROLES INSTITUCIONALES
window.login = async () => {
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    
    if (!email || !password) {
        alert("Por favor, ingresa tu correo y contraseña.");
        return;
    }

    try {
        // 1. Validar autenticación básica en la nube de Google
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // 2. Consultar el rol del usuario de forma exacta en Firestore
        const usuarioSnapshot = await db.collection("usuarios_encargados")
                                        .where("usuarioEmail", "==", email)
                                        .get();

        if (usuarioSnapshot.empty) {
            // Si el usuario se autentica pero no está en la base de datos de personal
            await auth.signOut();
            alert("Error: Tu cuenta no está dada de alta en el sistema de personal del Ayuntamiento.");
            return;
        }

        let rolUsuario = "Encargado"; // Rol base por defecto
        usuarioSnapshot.forEach((doc) => {
            if (doc.data().rol) {
                rolUsuario = doc.data().rol;
            }
        });

        // 3. Guardar datos en la sesión local del navegador para la persistencia del menú
        localStorage.setItem("userEmail", email);
        localStorage.setItem("userRole", rolUsuario);
        
        // 4. REDIRECCIÓN EN BASE A PRIVILEGIOS EXACTOS
        if (rolUsuario === "Encargado") {
            alert("Acceso correcto. Redirigiendo a tu Almacén de Tickets...");
            window.location.href = "ticket.html"; 
        } else if (rolUsuario === "Director" || rolUsuario === "Administrador") {
            alert(`Acceso correcto como: ${rolUsuario}. Redirigiendo al Menú Principal...`);
            window.location.href = "menu.html"; 
        }

    } catch (error) {
        console.error("Error al ingresar:", error);
        alert("Error al ingresar: Verifique que su correo o contraseña sean correctos.");
    }
};

// Cierre de sesión seguro limpiando toda la memoria local
window.logout = async () => {
    try {
        await auth.signOut();
        localStorage.clear(); 
        window.location.href = "index.html"; 
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
    }
};
