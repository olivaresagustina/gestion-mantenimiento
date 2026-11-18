const firebaseConfig = {
    apiKey: "AIzaSyDDcGT88IspX4-_TOKtQcdeo-93favOuoY",
    authDomain: "://firebaseapp.com",
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

        const mapaEquipos = {};
        let idxEq = 1;
        equiposSnap.forEach(doc => {
            const eq = doc.data();
            const serie = (eq.serie || "").trim().toLowerCase();
            const info = {
                idVisual: eq.idEquipo || eq.codigo || `EQ-${String(idxEq++).padStart(3, '0')}`,
                area: eq.area || "General",
                depto: eq.departamento || "General"
            };
            if (serie) mapaEquipos[serie] = info;
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

            const usr = mapaUsuarios[correo] || { nombre: "Desconocido", area: "General", depto: "General" };
            const eq = mapaEquipos[serie] || { idVisual: t.serie || "S/ID", area: usr.area, depto: usr.depto };
            const fEntrada = t.fechaPeticion || "Sin fecha";
            const st = t.status || "Abierto";

            datosCompletosReporte.push({
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
    const llenar = (id, campo, def) => {
        const sel = document.getElementById(id);
        if (!sel) return;
        const unicos = [...new Set(datosCompletosReporte.map(i => i[campo]).filter(Boolean))];
        sel.innerHTML = `<option value="">${def}</option>` + unicos.map(v => `<option value="${v}">${v}</option>`).join("");
    };
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
    const fMes = val("filtroMes"), fTipo = val("filtroTipoEquipo"), fSt = val("filtroStatus"),
          fArea = val("filtroArea"), fDepto = val("filtroDepartamento"), fEnc = val("filtroEncargado"),
          fTec = val("filtroTecnico"), fMant = val("filtroTipoMant");

    datosFiltradosActuales = datosCompletosReporte.filter(r =>
        (!fMes || r.mes === fMes) && (!fTipo || r.tipoEquipo === fTipo) &&
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

document.getElementById("btnExportarExcel").addEventListener("click", () => {
    if (!datosFiltradosActuales.length) return alert("No hay datos para exportar.");
    const headers = ["Mes","ID Equipo","Tipo de Equipo","Status Ticket","Área","Departamento","Encargado","Técnico","Tipo Mantenimiento","Problema","Fecha Entrada","Fecha Salida"];
    const filas = [headers.join(",")];
    datosFiltradosActuales.forEach(r => {
        const row = [r.mes, r.idEquipo, r.tipoEquipo, r.status, r.area, r.departamento, r.encargado, r.tecnico, r.tipoMantenimiento, r.problema, r.fechaEntrada, r.fechaSalida]
            .map(c => `"${String(c).replace(/"/g, '""')}"`);
        filas.push(row.join(","));
    });
    const blob = new Blob(["\uFEFF" + filas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Historial_Mantenimiento_Calnali_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
});

document.getElementById("btnImprimirPDF").addEventListener("click", () => {
    document.getElementById("fechaEmisionPDF").innerText = new Date().toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
    window.print();
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
