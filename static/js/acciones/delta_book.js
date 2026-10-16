// ============================================================================
// DELTA OPERACIONES - Capturas con volumen real (compras arriba vs ventas abajo)
// Consume: /api/resumen-captura/<simbolo>
// ============================================================================

let deltaOpsInterval = null;
let simboloDeltaOps = 'BNC';

// Config
const API_BASE_OPS = 'http://185.217.125.181:5000';
const REFRESH_MS_OPS = 60000; // 1 min
const MAX_FILAS = 15;

// ============================================================================
// FORMATEAR USD
// ============================================================================
function formatUSD_OPS(valor) {
    if (!valor || valor === 0) return '$0';
    const abs = Math.abs(valor);
    if (abs >= 1_000_000_000) return `$${(valor / 1_000_000_000).toFixed(1)}B`;
    if (abs >= 1_000_000)     return `$${(valor / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)         return `$${(valor / 1_000).toFixed(1)}k`;
    return `$${valor.toFixed(2)}`;
}

// ============================================================================
// FETCH Y PROCESAR
// ============================================================================
async function actualizarDeltaOperaciones(symbol) {
    if (symbol) simboloDeltaOps = symbol;
    const moneda = simboloDeltaOps.trim();
    const url = `${API_BASE_OPS}/api/resumen-captura/${moneda}?_=${Date.now()}`;

    console.log(`🌐 [DELTA OPS] Solicitando: ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ [DELTA OPS] HTTP ${response.status}`);
            dibujarDeltaOpsVacio();
            return;
        }

        const json = await response.json();
        const capturas = json.resumen_capturas || [];

        console.log(`📦 [DELTA OPS] Capturas recibidas: ${capturas.length}`);

        procesarDeltaOps(capturas);
    } catch (error) {
        console.error('❌ [DELTA OPS] Error:', error);
        dibujarDeltaOpsVacio();
    }
}

// ============================================================================
// PROCESAR: calcular delta según variación de precio
// ============================================================================
function procesarDeltaOps(capturas) {
    if (!capturas || capturas.length === 0) {
        dibujarDeltaOpsVacio();
        return;
    }

    // Calcular delta por captura comparando precio con la anterior
    const conDelta = capturas.map((cap, i) => {
        const precio = Number(cap.precio) || 0;
        const volumen = Number(cap.volumen) || 0;
        const ask = Number(cap.ask) || 0;
        const bid = Number(cap.bid) || 0;
        const precioPrev = i > 0 ? Number(capturas[i - 1].precio) || 0 : precio;

        let delta = 0;
        let tipo = 'NEUTRAL';

        if (precio > precioPrev) {
            delta = volumen;      // subió → compra
            tipo = 'COMPRA';
        } else if (precio < precioPrev) {
            delta = -volumen;     // bajó → venta
            tipo = 'VENTA';
        } else {
            // Sin cambio de precio → usar ask/bid como proxy
            delta = (bid >= ask) ? volumen : -volumen;
            tipo = (bid >= ask) ? 'COMPRA' : 'VENTA';
        }

        return {
            timestamp: cap.timestamp,
            precio: precio,
            volumen: volumen,
            ask: ask,
            bid: bid,
            delta: delta,
            tipo: tipo,
            volumen_usd: volumen * precio
        };
    });

    // Separar en ventas (delta negativo) y compras (delta positivo)
    const ventas  = conDelta.filter(c => c.delta < 0).reverse(); // última arriba
    const compras = conDelta.filter(c => c.delta > 0).reverse(); // última arriba

    // Calcular totales y dominancia
    const totalCompras = compras.reduce((s, c) => s + Math.abs(c.delta), 0);
    const totalVentas  = ventas.reduce((s, c) => s + Math.abs(c.delta), 0);
    const total        = totalCompras + totalVentas;
    const pctCompra    = total > 0 ? (totalCompras / total) * 100 : 50;
    const pctVenta     = total > 0 ? (totalVentas  / total) * 100 : 50;

    // Último precio
    const precioActual = conDelta.length > 0 ? conDelta[conDelta.length - 1].precio : 0;

    actualizarDominanciaOps(pctCompra, pctVenta, precioActual);

    // Máximo volumen para normalizar la barra de fuerza
    const maxVol = Math.max(...conDelta.map(c => Math.abs(c.volumen)), 1);

    dibujarTablaOps(
        compras.slice(0, MAX_FILAS),
        ventas.slice(0, MAX_FILAS),
        maxVol
    );
}

// ============================================================================
// DOMINANCIA
// ============================================================================
function actualizarDominanciaOps(compra, venta, precioActual) {
    const barra = document.getElementById('dominance-fill-delta');
    if (barra) barra.style.width = `${compra}%`;

    const texto = document.getElementById('dominancia-porcentaje-delta');
    if (texto) texto.innerHTML = `${compra.toFixed(1)}% / ${venta.toFixed(1)}%`;

    const textoCentro = document.getElementById('dominancia-texto-delta');
    if (textoCentro) textoCentro.textContent = `${compra.toFixed(1)}% / ${venta.toFixed(1)}%`;

    const sentimiento = document.getElementById('market-sentiment-delta');
    if (sentimiento) {
        if (compra > 60)      sentimiento.innerHTML = '🟢 FUERTE PRESIÓN COMPRADORA';
        else if (venta > 60)  sentimiento.innerHTML = '🔴 FUERTE PRESIÓN VENDEDORA';
        else                  sentimiento.innerHTML = '⚖️ MERCADO EQUILIBRADO';
        sentimiento.style.color = compra > 60 ? '#00ff88' : venta > 60 ? '#ff6b6b' : '#ffaa00';
    }

    const precioEl = document.getElementById('precio-actual-delta');
    if (precioEl && precioActual > 0) {
        precioEl.innerHTML = `💰 $${precioActual.toFixed(2)}`;
    }
}

// ============================================================================
// DIBUJAR TABLA
// ============================================================================
function dibujarTablaOps(compras, ventas, maxVol) {
    const maxRef = maxVol > 0 ? maxVol : 1;

    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    };

    const renderRows = (containerId, data, isCompra) => {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`❌ [DELTA OPS] Contenedor '${containerId}' no encontrado`);
        return;
    }
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = `<div style="color:#666;text-align:center;padding:20px;font-size:14px;">Sin ${isCompra ? 'compras' : 'ventas'} registradas</div>`;
        return;
    }

    data.forEach((item, index) => {
        const row = document.createElement('div');
        const intensidad = Math.abs(item.volumen) / maxRef;
        const precioStr = `$${item.precio.toFixed(2)}`;
        
        let fechaStr = '';
        let horaStr = '';
        if (item.timestamp && item.timestamp.includes(' ')) {
            const [fecha, hora] = item.timestamp.split(' ');
            const [year, month, day] = fecha.split('-');
            fechaStr = `${day}/${month}`;
            horaStr = hora;
        } else {
            horaStr = item.timestamp || '';
        }
        
        const askStr = item.ask.toFixed(2);
        const bidStr = item.bid.toFixed(2);
        const volStr = item.volumen.toLocaleString(undefined, { maximumFractionDigits: 0 });
        const usdStr = formatUSD_OPS(item.volumen_usd);
        const deltaStr = isCompra ? `+${item.delta.toLocaleString()}` : item.delta.toLocaleString();

        const colorBase = isCompra ? '#00ff88' : '#ff6b6b';
        const bgColor = index % 2 === 0 ? hexToRgba(colorBase, 0.03) : hexToRgba(colorBase, 0.08);
        const colorBorde = hexToRgba(colorBase, Math.max(0.3, Math.min(intensidad * 0.8, 1)));

        row.style.cssText = `
            display: grid;
            grid-template-columns: 130px 110px 100px 100px 120px 110px 1fr;
            gap: 8px;
            padding: 10px 12px;
            background: ${bgColor};
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            align-items: center;
            border-left: 4px solid ${colorBorde};
            transition: all 0.2s ease;
        `;

        row.innerHTML = `
            <span style="color: #aaa; font-size: 12px; line-height: 1.3;">
                ${fechaStr}<br>${horaStr}
            </span>
            <span style="color: #fff; font-weight: 600; font-size: 15px;">${precioStr}</span>
            <span style="color: #ff6b6b; font-size: 13px;">${askStr}</span>
            <span style="color: #00ff88; font-size: 13px;">${bidStr}</span>
            <span style="color: #ccc; font-size: 14px;">${volStr}</span>
            <span style="color: #ffd700; font-size: 14px; font-weight: bold;">${usdStr}</span>
            <span style="color: ${colorBase}; font-weight: bold; font-size: 15px;">${deltaStr}</span>
        `;
        container.appendChild(row);
    });
};

    renderRows('delta-asks', ventas, false);
    renderRows('delta-bids', compras, true);
}

// ============================================================================
// VACÍO
// ============================================================================
function dibujarDeltaOpsVacio() {
    const asks = document.getElementById('delta-asks');
    const bids = document.getElementById('delta-bids');
    const msg = '<div style="color:#666;text-align:center;padding:20px;font-size:12px;">Sin datos o cargando...</div>';
    if (asks) asks.innerHTML = msg;
    if (bids) bids.innerHTML = msg;
}

// ============================================================================
// EXPONER GLOBALMENTE
// ============================================================================
window.actualizarDeltaOperaciones = actualizarDeltaOperaciones;

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 [DELTA OPS] DOM cargado');

    const botones = document.querySelectorAll('.asset-btn');
    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            botones.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const symbol = btn.getAttribute('data-symbol');
            if (symbol) {
                console.log(`🔘 [DELTA OPS] Cambiando a: ${symbol}`);
                actualizarDeltaOperaciones(symbol);
            }
        });
    });

    // Símbolo inicial
    const btnActivo = document.querySelector('.asset-btn.active');
    const symbolInicial = btnActivo ? btnActivo.getAttribute('data-symbol') : 'BNC';

   

    if (deltaOpsInterval) clearInterval(deltaOpsInterval);
    deltaOpsInterval = setInterval(() => {
        actualizarDeltaOperaciones(simboloDeltaOps);
    }, REFRESH_MS_OPS);
});