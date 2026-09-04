// Tus credenciales de conexión
const firebaseConfig = {
    apiKey: "AIzaSyDDCGT88IspX4-_TOKlQcdeo-93favOuoy",
    authDomain: "://firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e"
  };
  
  // Inicializamos Firebase con la sintaxis tradicional compatible
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  
  // Función para Iniciar Sesión
  window.login = async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      try {
          await auth.signInWithEmailAndPassword(email, password);
          alert("¡Bienvenido al sistema!");
      } catch (error) {
          alert("Error al ingresar: " + error.message);
      }
  }
  
  // Función para Registrar Usuario
  window.registerUser = async () => {
      const cedula = document.getElementById("cedula").value;
      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;
      const role = document.getElementById("role").value;
  
      if (!cedula || !fullName || !email || !password || !role) {
          alert("Por favor, rellene todos los campos del formulario.");
          return;
      }
  
      try {
          // Registramos en el módulo de autenticación de Firebase
          await auth.createUserWithEmailAndPassword(email, password);
          alert(`¡Usuario registrado con éxito!\nNombre: ${fullName}\nRol: ${role}`);
          document.getElementById("registerForm").reset();
      } catch (error) {
          alert("Error al registrar en Firebase: " + error.message);
      }
  }
  