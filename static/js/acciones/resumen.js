// ============================================================================
// RESUMEN - Solo llena las 4 tarjetas del símbolo activo
// ============================================================================

const url = `https://api.tradingvenezuela.com/api/resumen?_=${Date.now()}`;
let simboloActual = 'ABC.A';

// ============================================================================
// FORMATEADORES
// ============================================================================
function fmtBs(valor) {
    if (valor === null || valor === undefined) return 'Bs --';
    const num = Number(valor);
    const abs = Math.abs(num);
    if (abs >= 1e12) return `Bs ${(num / 1e12).toFixed(2)}T`;
    if (abs >= 1e9)  return `Bs ${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6)  return `Bs ${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3)  return `Bs ${(num / 1e3).toFixed(2)}K`;
    return `Bs ${num.toFixed(2)}`;
}

function fmtUSD(valor) {
    if (valor === null || valor === undefined) return '$--';
    const num = Number(valor);
    const abs = Math.abs(num);
    if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (abs >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3)  return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
}

function fmtPrecio(valor) {
    const num = Number(valor) || 0;
    return `$${num.toFixed(2)}`;
}

function fmtVar(valor) {
    const num = Number(valor) || 0;
    const signo = num > 0 ? '+' : '';
    return `${signo}${num.toFixed(2)}%`;
}

// ============================================================================
// FETCH Y RENDER
// ============================================================================
async function cargarResumen() {
    const url = `${API_BASE}/api/resumen?_=${Date.now()}`;
    console.log(`🌐 [RESUMEN] ${url}`);

    try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const json = await r.json();
        const mercado = json.mercado || [];

        const item = mercado.find(m => m.simbolo === simboloActual);
        if (!item) {
            console.warn(`⚠️ Sin datos para ${simboloActual}`);
            return;
        }

        renderizarDestacado(item);

        document.getElementById('chart-subtitle').textContent =
            `Actualizado: ${new Date().toLocaleTimeString('es-VE')}`;

    } catch (e) {
        console.error('❌ [RESUMEN]', e);
    }
}

// ============================================================================
// RENDER: SOLO LAS 4 TARJETAS
// ============================================================================
function renderizarDestacado(item) {
    const varRel = Number(item.var_rel) || 0;
    const flecha = varRel > 0 ? '▲' : varRel < 0 ? '▼' : '▬';
    const colorVar = varRel > 0 ? '#00ff88' : varRel < 0 ? '#ff6b6b' : '#9ca3af';

    document.getElementById('chart-title').textContent = `📊 ${item.simbolo}`;

    document.getElementById('info-simbolo').textContent = item.simbolo || '--';
    document.getElementById('info-precio').textContent = fmtPrecio(item.precio_ult);

    const varEl = document.getElementById('info-var');
    varEl.textContent = `${flecha} ${fmtVar(item.var_rel)}`;
    varEl.style.color = colorVar;

    document.getElementById('info-capitali').innerHTML = `
        <div style="color:#93c5fd;">${fmtBs(item.capitali_bs)}</div>
        <div style="color:#60a5fa; font-size:11px;">${fmtUSD(item.capitali_us)}</div>
    `;
}

// ============================================================================
// CAMBIAR SÍMBOLO (lo llama app.js)
// ============================================================================
window.actualizarResumenTarjetas = function(sym) {
    simboloActual = (sym || 'BNC').toUpperCase();
    cargarResumen();
};

// ============================================================================
// INIT
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [RESUMEN] DOM cargado');
    cargarResumen();
    setInterval(cargarResumen, 30000);
});