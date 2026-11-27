const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "gestion-mantenimiento-ap-20f51.firebaseapp.com",
    projectId: "gestion-mantenimiento-ap-20f51",
    storageBucket: "gestion-mantenimiento-ap-20f51.firebasestorage.app",
    messagingSenderId: "792321276987",
    appId: "1:792321276987:web:3494cc6f399b0d83e5301e",
    measurementId: "G-XLE9Y7FPGM"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let datosCompletosReporte = [];
let datosFiltradosActuales = [];

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];



function obtenerNombreMes(fechaStr) {
    if (!fechaStr || typeof fechaStr !== "string") return "Sin Mes";
    const partes = fechaStr.split(/[-/]/);
    if (partes.length < 2) return "Sin Mes";
    // Tomamos partes[1] que corresponde al mes en formatos YYYY-MM-DD o DD/MM/YYYY
    const mesNum = parseInt(partes[1], 10);
    return (mesNum >= 1 && mesNum <= 12) ? MESES[mesNum - 1] : "Sin Mes";
}

function obtenerAnio(fechaStr) {
    if (!fechaStr || typeof fechaStr !== "string") return "Sin Año";
    const partes = fechaStr.trim().split(/[-/]/);
    if (partes.length < 3) return "Sin Año";
    // Si el primer segmento tiene 4 dígitos es YYYY-MM-DD; si no, tomamos el tercer segmento (DD/MM/YYYY)
    const anio = partes[0].length === 4 ? partes[0] : partes[2].slice(0, 4);
    return /^\d{4}$/.test(anio) ? anio : "Sin Año";
}


function formatearSalida(ts) {
    if (!ts) return "Pendiente";
    if (ts.toDate) {
        const d = ts.toDate();
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return String(ts);
}

async function cargarHistorialReporte() {
    const tbody = document.getElementById("cuerpoTablaReporte");
    try {
        const [ticketsSnap, equiposSnap, usuariosSnap] = await Promise.all([
            db.collection("tickets").get(),
            db.collection("equipos").get(),
            db.collection("usuarios_encargados").get()
        ]);


        
        const mapaEquiposPorSerie = {};
        const mapaEquiposExacto = {};
        const seriesInvalidas = ["", "s/n", "sn", "n/a", "na", "ninguno", "sin serie", "0", "123", "1234", "12345"];

        // Ordenamos los documentos por ID para que la numeración EQ-001, EQ-002... siempre sea fija
        const docsEquiposOrdenados = [...equiposSnap.docs].sort((a, b) => a.id.localeCompare(b.id));

        docsEquiposOrdenados.forEach((doc, index) => {
            const eq = doc.data();
            const serie = (eq.serie || "").trim().toLowerCase();
            const claveExacta = `${(eq.tipo || "").trim().toLowerCase()}|${(eq.marca || "").trim().toLowerCase()}|${(eq.modelo || "").trim().toLowerCase()}|${serie}`;

            const info = {
                idVisual: eq.idEquipo || eq.codigo || `EQ-${String(index + 1).padStart(3, '0')}`,
                area: eq.area || "General",
                depto: eq.departamento || "General"
            };

            mapaEquiposExacto[claveExacta] = info;
            if (serie && !seriesInvalidas.includes(serie)) {
                mapaEquiposPorSerie[serie] = info;
            }
        });

        const mapaUsuarios = {};
        usuariosSnap.forEach(doc => {
            const u = doc.data();
            if (u.usuarioEmail) {
                mapaUsuarios[u.usuarioEmail.trim().toLowerCase()] = {
                    nombre: u.nombreCompleto || "Sin Nombre",
                    area: u.area || "General",
                    depto: u.departamento || "General"
                };
            }
        });

        datosCompletosReporte = [];
        ticketsSnap.forEach(doc => {
            const t = doc.data();
            const correo = (t.usuarioEmail || "").trim().toLowerCase();
            const serie = (t.serie || "").trim().toLowerCase();
            const claveExactaTicket = `${(t.tipo || "").trim().toLowerCase()}|${(t.marca || "").trim().toLowerCase()}|${(t.modelo || "").trim().toLowerCase()}|${serie}`;

            const usr = mapaUsuarios[correo] || { nombre: "Desconocido", area: "General", depto: "General" };
            const eq = mapaEquiposExacto[claveExactaTicket] || mapaEquiposPorSerie[serie] || { idVisual: "S/ID", area: usr.area, depto: usr.depto };
            const fEntrada = t.fechaPeticion || "Sin fecha";
            const st = t.status || "Abierto";
  
        
        
 



            datosCompletosReporte.push({
                anio: obtenerAnio(fEntrada),
                mes: obtenerNombreMes(fEntrada),
                idEquipo: eq.idVisual,
                tipoEquipo: t.tipo || "No especificado",
                status: st,
                area: t.area || eq.area || usr.area,
                departamento: t.departamento || usr.depto,
                encargado: usr.nombre,
                tecnico: t.tecnicoAsignado || "Sin asignar",
                tipoMantenimiento: t.tipoMantenimiento || "Sin clasificar",
                problema: t.detalle || "Sin descripción",
                fechaEntrada: fEntrada,
                fechaSalida: (st.toLowerCase() === "cerrado") ? formatearSalida(t.fechaCierreReal || t.fechaUltimaGestion) : "En atención"
            });
        });

        poblarFiltros();
        aplicarFiltros();
    } catch (error) {
        console.error("Error reporte:", error);
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#dc4c64;padding:20px;">Error: ${error.message}</td></tr>`;
    }
}

function poblarFiltros() {
    const llenar = (id, campo, def, ordenarDesc = false) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        let unicos = [...new Set(datosCompletosReporte.map(i => i[campo]).filter(Boolean))];
        if (ordenarDesc) unicos.sort((a, b) => b.localeCompare(a));
        sel.innerHTML = `<option value="">${def}</option>` + unicos.map(v => `<option value="${v}">${v}</option>`).join("");
    };
    llenar("filtroAnio", "anio", "Todos los años", true);
    llenar("filtroMes", "mes", "Todos los meses");
    llenar("filtroTipoEquipo", "tipoEquipo", "Todos los tipos");
    llenar("filtroArea", "area", "Todas las áreas");
    llenar("filtroDepartamento", "departamento", "Todos los departamentos");
    llenar("filtroEncargado", "encargado", "Todos los encargados");
    llenar("filtroTecnico", "tecnico", "Todos los técnicos");
    llenar("filtroTipoMant", "tipoMantenimiento", "Todos los mantenimientos");
}

function aplicarFiltros() {
    const val = id => document.getElementById(id).value;
    const fAnio = val("filtroAnio"), fMes = val("filtroMes"), fTipo = val("filtroTipoEquipo"),
          fSt = val("filtroStatus"), fArea = val("filtroArea"), fDepto = val("filtroDepartamento"),
          fEnc = val("filtroEncargado"), fTec = val("filtroTecnico"), fMant = val("filtroTipoMant");

    datosFiltradosActuales = datosCompletosReporte.filter(r =>
        (!fAnio || r.anio === fAnio) && (!fMes || r.mes === fMes) && (!fTipo || r.tipoEquipo === fTipo) &&
        (!fSt || r.status.toLowerCase() === fSt.toLowerCase()) && (!fArea || r.area === fArea) &&
        (!fDepto || r.departamento === fDepto) && (!fEnc || r.encargado === fEnc) &&
        (!fTec || r.tecnico === fTec) && (!fMant || r.tipoMantenimiento === fMant)
    );

    const tbody = document.getElementById("cuerpoTablaReporte");
    document.getElementById("contadorRegistros").innerText = datosFiltradosActuales.length;

    if (datosFiltradosActuales.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;color:#777;padding:20px;">No hay registros con estos filtros.</td></tr>`;
        return;
    }

    tbody.innerHTML = datosFiltradosActuales.map(r => {
        let bg = "#2c9faf";
        if (r.status.toLowerCase() === "asignado") bg = "#b8904c";
        if (r.status.toLowerCase() === "cerrado") bg = "#198754";
        return `<tr>
            <td><strong>${r.mes}</strong></td><td>${r.idEquipo}</td><td>${r.tipoEquipo}</td>
            <td><span style="background:${bg};color:#fff;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:bold;">${r.status.toUpperCase()}</span></td>
            <td>${r.area}</td><td>${r.departamento}</td><td>${r.encargado}</td><td>${r.tecnico}</td>
            <td>${r.tipoMantenimiento}</td><td>${r.problema}</td><td>${r.fechaEntrada}</td><td>${r.fechaSalida}</td>
        </tr>`;
    }).join("");
}

// Exportación a Excel (.XLS) con tabla formateada, colores institucionales y columnas separadas
document.getElementById("btnExportarExcel").addEventListener("click", () => {
    if (!datosFiltradosActuales.length) return alert("No hay datos para exportar.");

    let tablaHTML = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://w3.org">
        <head><meta charset="UTF-8"></head>
        <body>
            <table border="1" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
                <thead>
                    <tr>
                        <th colspan="12" style="background-color: #5c1424; color: #ffffff; font-size: 15px; padding: 10px; text-align: center;">
                            H. AYUNTAMIENTO DE CALNALI 2024-2027 - HISTORIAL DE MANTENIMIENTO
                        </th>
                    </tr>
                    <tr style="background-color: #bc955c; color: #ffffff; font-weight: bold;">
                        <th>Mes</th><th>ID Equipo</th><th>Tipo de Equipo</th><th>Status Ticket</th>
                        <th>Área</th><th>Departamento</th><th>Encargado del Equipo</th><th>Técnico en Atención</th>
                        <th>Tipo de Mantenimiento</th><th>Problema</th><th>Fecha de Entrada</th><th>Fecha de Salida</th>
                    </tr>
                </thead>
                <tbody>
    `;

    datosFiltradosActuales.forEach(r => {
        tablaHTML += `
            <tr>
                <td>${r.mes}</td><td>${r.idEquipo}</td><td>${r.tipoEquipo}</td><td>${r.status}</td>
                <td>${r.area}</td><td>${r.departamento}</td><td>${r.encargado}</td><td>${r.tecnico}</td>
                <td>${r.tipoMantenimiento}</td><td>${r.problema}</td><td>${r.fechaEntrada}</td><td>${r.fechaSalida}</td>
            </tr>
        `;
    });

    tablaHTML += `</tbody></table></body></html>`;

    const blob = new Blob(["\uFEFF" + tablaHTML], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Historial_Mantenimiento_Calnali_${new Date().toISOString().slice(0,10)}.xls`;
    a.click();
});


document.getElementById("btnImprimirPDF").addEventListener("click", () => {
    if (!datosFiltradosActuales.length) return alert("No hay datos para generar el PDF.");

    const btn = document.getElementById("btnImprimirPDF");
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = "⏳ Generando PDF...";
    btn.disabled = true;

    const fechaStr = new Date().toLocaleDateString('es-MX', { 
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const contenedorPDF = document.createElement("div");
    contenedorPDF.style.padding = "5px";
    contenedorPDF.style.fontFamily = "Arial, sans-serif";
    contenedorPDF.style.background = "#ffffff";
    contenedorPDF.style.width = "980px";

    contenedorPDF.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #5c1424; padding-bottom:6px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:10px;">
                <img src="logo.png" style="width:45px; height:auto;">
                <div>
                    <h2 style="margin:0; color:#5c1424; font-size:16px;">H. AYUNTAMIENTO DE CALNALI 2024-2027</h2>
                    <p style="margin:2px 0 0; font-size:11px; color:#333;">Reporte Oficial: Historial de Mantenimiento de Equipo de Cómputo</p>
                </div>
            </div>
            <div style="text-align:right; font-size:10px; color:#333;">
                <strong>Emisión:</strong> ${fechaStr}<br>
                <strong>Registros:</strong> ${datosFiltradosActuales.length}
            </div>
        </div>
        ${document.querySelector(".tabla-scroll").innerHTML}
    `;

    const tabla = contenedorPDF.querySelector("table");
    tabla.style.width = "100%";
    tabla.style.minWidth = "100%";
    tabla.style.fontSize = "7.5px";
    tabla.querySelectorAll("th, td").forEach(celda => {
        celda.style.padding = "2.5px 4px";
    });
    tabla.querySelectorAll("td span").forEach(badge => {
        badge.style.padding = "1px 4px";
        badge.style.fontSize = "6.5px";
    });

    const opciones = {
        margin:       6,
        filename:     `Historial_Mantenimiento_Calnali_${new Date().toISOString().slice(0,10)}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'letter', orientation: 'landscape' }
    };

    html2pdf().set(opciones).from(contenedorPDF).save()
        .then(() => {
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        })
        .catch(err => {
            console.error("Error al generar PDF:", err);
            alert("Hubo un detalle al generar el PDF. Intenta de nuevo.");
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
        });
});

document.getElementById("btnLimpiarFiltros").addEventListener("click", () => {
    document.querySelectorAll(".filtros-grid select").forEach(s => s.value = "");
    aplicarFiltros();
});

document.querySelectorAll(".filtros-grid select").forEach(s => s.addEventListener("change", aplicarFiltros));

window.addEventListener('DOMContentLoaded', () => {
    const email = localStorage.getItem("userEmail");
    const role = localStorage.getItem("userRole");
    if (!email || !role) { window.location.href = "index.html"; return; }
    if (role === "Encargado") { window.location.href = "ticket.html"; return; }

    const disp = document.getElementById("userEmailDisplay");
    if (disp) disp.innerText = email;
    cargarHistorialReporte();
});

window.logout = async () => {
    await auth.signOut();
    localStorage.clear();
    window.location.href = "index.html";
};
