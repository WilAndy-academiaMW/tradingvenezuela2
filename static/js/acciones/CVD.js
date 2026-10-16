// ============================================================================
// CVD_PRO_CHARTS.js - CVD + SMA DE SENTIMIENTO (Adaptado a API BVC / SQLite)
// ============================================================================

let deltaChart = null;
let simboloDelta = 'ABC.A';
let datosDeltaOriginal = [];

// Ajusta este valor para la sensibilidad de la línea de tendencia
const PERIODOS_SMA_CVD = 13;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const activo = document.querySelector('.asset-btn.active');
    const symInicial = activo ? activo.getAttribute('data-symbol') : 'ABC.A';

    setTimeout(() => { actualizarDelta(symInicial); }, 1000);

    // Refresco automático cada 30 segundos
    setInterval(() => { actualizarDelta(simboloDelta); }, 30000);

    // Vinculamos los botones de activos al gráfico CVD
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const sym = btn.getAttribute('data-symbol');
            if (sym) {
                console.log(`🔘 [CVD] Cambiando a: ${sym}`);
                actualizarDelta(sym);
            }
        });
    });
});

// --- LÓGICA DE DATOS ---
async function actualizarDelta(symbol) {
    if (symbol) simboloDelta = symbol;
    
    // Normalizar símbolo para que coincida con la estructura de la API (ej: ABC.A, BPV, etc.)
    let limpio = simboloDelta.toUpperCase().replace('_', '.');
    if (limpio === 'ABC_A') limpio = 'ABC.A';
    if (limpio.endsWith('USDT')) limpio = limpio.replace('USDT', '').replace('_', '');

    // URL COMPLETA DIRECTA AL VPS (Evita errores de rutas relativas y CORS local)
    const url = `http://185.217.125.181:5000/api/delta-cvd/${encodeURIComponent(limpio)}`;

    console.log(`🌐 [CVD] Fetch → ${url}`);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`❌ [CVD] HTTP ${response.status} en ${url}`);
            return;
        }

        const responseData = await response.json();
        console.log('📦 [CVD] JSON recibido:', responseData);

        const dataRaw = responseData.delta_cvd || [];
        if (!dataRaw || dataRaw.length === 0) {
            console.warn('⚠️ [CVD] Sin datos en la respuesta');
            return;
        }

        // --- FILTRO ESTRICTO ---
        // Ignoramos las barras que tengan delta 0 y volumen 0
        const dataFiltrada = dataRaw.filter(d => Number(d.delta || 0) !== 0 || Number(d.volumen_barra || 0) !== 0);

        datosDeltaOriginal = [...dataFiltrada];
        procesarYDibujarVelas(datosDeltaOriginal);

    } catch (error) {
        console.error('❌ [CVD] Error en fetch:', error);
    }
}

// --- TRANSFORMAR FILAS EN BARRAS + SMA OSCILANTE ---
function procesarYDibujarVelas(datos) {
    const canvas = document.getElementById('deltaChart');
    const elStatus = document.getElementById('power-status');
    if (!canvas) {
        console.error('❌ [CVD] No se encontró el canvas #deltaChart');
        return;
    }

    const labels = datos.map(d => d.timestamp);

    const cuerposVela = datos.map(d => d.delta || 0);
    const coloresVelas = cuerposVela.map(v => v >= 0 ? '#00ff88' : '#ff6b6b');

    // --- CÁLCULO DE LA SMA SOBRE LAS BARRAS ---
    const dataSMA = cuerposVela.map((_, i, arr) => {
        if (i < PERIODOS_SMA_CVD - 1) return null;
        const slice = arr.slice(i - PERIODOS_SMA_CVD + 1, i + 1);
        return slice.reduce((a, b) => a + b, 0) / PERIODOS_SMA_CVD;
    });

    // --- RENDERIZADO O ACTUALIZACIÓN ---
    if (deltaChart) {
        deltaChart.data.labels = labels;
        deltaChart.data.datasets[0].data = cuerposVela;
        deltaChart.data.datasets[0].backgroundColor = coloresVelas;
        deltaChart.data.datasets[1].data = dataSMA;
        deltaChart.update('none');
    } else {
        deltaChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Intención Delta (Acciones)',
                        data: cuerposVela,
                        backgroundColor: coloresVelas,
                        order: 2,
                        barPercentage: 0.8,
                        categoryPercentage: 0.9
                    },
                    {
                        label: `SMA Delta (${PERIODOS_SMA_CVD})`,
                        data: dataSMA,
                        type: 'line',
                        borderColor: '#fbbf24',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        tension: 0.3,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#aaa', font: { size: 10 } } } },
                scales: {
                    x: { ticks: { color: '#888', font: { size: 8 } }, grid: { color: 'rgba(255,255,255,0.03)' } },
                    y: {
                        ticks: { color: '#888' },
                        grid: {
                            color: (ctx) => ctx.tick.value === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                            lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1
                        }
                    }
                }
            }
        });
    }

    // --- LÓGICA DE CONCLUSIÓN ---
    if (elStatus && cuerposVela.length > 0) {
        const ultimaVela = cuerposVela[cuerposVela.length - 1];
        const ultimas5 = cuerposVela.slice(-5);
        const promedio5 = ultimas5.reduce((a, b) => a + b, 0) / ultimas5.length;

        if (ultimaVela > 0 && promedio5 > 0) {
            elStatus.innerText = "🚀 DOMINIO COMPRADOR (Takers absorbiendo al alza)";
            elStatus.style.color = "#00ff88";
        } else if (ultimaVela < 0 && promedio5 < 0) {
            elStatus.innerText = "🛑 DOMINIO VENDEDOR (Takers presionando a la baja)";
            elStatus.style.color = "#ff6b6b";
        } else {
            elStatus.innerText = "🔄 MERCADO EN TRANSICIÓN (Pelea entre toros y osos)";
            elStatus.style.color = "#ffaa00";
        }
    }
}

window.actualizarDelta = actualizarDelta;