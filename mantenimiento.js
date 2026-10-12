// Función que reacciona al clic sobre una tarjeta de la bandeja superior
function loadTicketDetailInPanel(ticketId) {
    // Hace visible el panel inferior de edición
    const detailPanel = document.getElementById("lowerDetailPanel");
    detailPanel.style.display = "block";
    
    // Cambia el título dinámicamente con el ID seleccionado
    document.getElementById("activeTicketTitle").innerText = "Detalles del ticket: " + ticketId;
    
    // Desplaza la pantalla suavemente hacia abajo para que el Administrador vea los detalles
    detailPanel.scrollIntoView({ behavior: 'smooth' });
}

// Función para cambiar entre las sub-pestañas inferiores
function switchSubTab(evt, tabId) {
    const panels = document.getElementsByClassName("sub-tab-pane");
    for (let i = 0; i < panels.length; i++) {
        panels[i].classList.remove("active");
    }
    const links = document.getElementsByClassName("sub-tab-link");
    for (let i = 0; i < links.length; i++) {
        links[i].classList.remove("active");
    }
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}
