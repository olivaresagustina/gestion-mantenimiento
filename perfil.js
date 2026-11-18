// --- CONTROL DEL MENÚ DESPLEGABLE DE PERFIL ---
window.addEventListener('DOMContentLoaded', () => {
    const dropdownContainer = document.getElementById("userProfileDropdown");
    const btnTrigger = document.getElementById("btnUserDropdown");
    const dropdownMenu = document.getElementById("userDropdownMenu");
    const roleBadge = document.getElementById("dropdownUserRole");

    // Mostrar el rol guardado en el encabezado del menú desplegable
    const storedRole = localStorage.getItem("userRole");
    if (roleBadge && storedRole) {
        roleBadge.innerText = storedRole;
    }

    if (btnTrigger && dropdownMenu && dropdownContainer) {
        // Abrir / cerrar al hacer clic en el correo
        btnTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle("mostrar");
            dropdownContainer.classList.toggle("activo");
        });

        // Cerrar automáticamente si el usuario hace clic fuera del menú
        window.addEventListener("click", (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownMenu.classList.remove("mostrar");
                dropdownContainer.classList.remove("activo");
            }
        });
    }
});
