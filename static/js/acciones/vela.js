// ============================================================================
// vela.js - Precio (Bs) + burbujas de volumen coloreadas por delta
// ============================================================================

(function() {
    let deltaChart = null;
    let intervaloDelta = null;
    let intentos = 0;
    const MAX_INTENTOS = 20;

    // ============ CONFIGURACIÓN ============
    const API_BASE = 'https://api.tradingvenezuela.com';
    const SIMBOLO_DEFAULT = 'ABC.A';
    const REFRESH_MS = 180000;
    const RADIO_MIN = 3;
    const RADIO_MAX = 28;
    // =======================================

    // Formateador de Bs con separador de miles venezolano
    function fmtBs(valor) {
        return Number(valor).toLocaleString('es-VE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function esperarChartJS() {
        if (typeof Chart !== 'undefined') {
            inicializar();
            return;
        }
        intentos++;
        if (intentos < MAX_INTENTOS) setTimeout(esperarChartJS, 500);
    }

    function inicializar() {
        // 🔥 ID ÚNICO, nadie más lo usa
        const canvas = document.getElementById("velaDeltaChart");
        if (!canvas) {
            console.warn("⚠️ No se encontró el canvas #velaDeltaChart");
            return;
        }

        window.actualizarVelaDelta = async function(symbol) {
            try {
                const moneda = (symbol || SIMBOLO_DEFAULT).toUpperCase();
                const url = `${API_BASE}/api/vela-delta/${moneda}?_=${Date.now()}`;

                console.log(`🔎 Consultando: ${url}`);

                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
                }
                const json = await response.json();
                const velas = json.velas_delta || [];

                if (!velas || velas.length === 0) {
                    console.warn(`⚠️ No hay velas delta para: ${moneda}`);
                    return;
                }

                // 1. EXTRAER DATOS
                const labels = velas.map(v => {
                    const ts = v.timestamp || '';
                    return ts.includes(' ') ? ts.split(' ')[1] : ts;
                });
                const precios = velas.map(v => Number(v.precio) || 0);
                const volumenes = velas.map(v => Number(v.volumen) || 0);
                const deltas = velas.map(v => Number(v.delta) || 0);
                const intensidades = velas.map(v => Number(v.intensidad_color) || 0);

                // 2. TAMAÑO DE LOS PUNTOS según volumen
                const maxVol = Math.max(...volumenes.map(v => Math.abs(v)), 1);
                const radios = volumenes.map(vol => {
                    if (vol <= 0) return RADIO_MIN;
                    const ratio = Math.sqrt(Math.abs(vol) / maxVol);
                    return RADIO_MIN + ratio * (RADIO_MAX - RADIO_MIN);
                });

                // 3. COLORES
                const coloresPuntos = velas.map((v, i) => {
                    const delta = deltas[i];
                    const intensidad = intensidades[i];
                    const alpha = Math.max(0.25, Math.min(1, intensidad / 10));
                    if (delta >= 0) {
                        return `rgba(52, 211, 153, ${alpha})`;
                    } else {
                        return `rgba(248, 113, 113, ${alpha})`;
                    }
                });

                const bordesPuntos = velas.map((v, i) => {
                    if (deltas[i] >= 0) return 'rgba(16, 185, 129, 1)';
                    return 'rgba(220, 38, 38, 1)';
                });

                // 4. DESTRUIR GRÁFICO ANTERIOR
                if (deltaChart) deltaChart.destroy();
                const ctx = canvas.getContext("2d");

                // 5. PLUGIN FONDO
                const pluginFondo = {
                    id: 'fondoVelaDelta',
                    beforeDraw: (chart) => {
                        const { ctx, chartArea: { top, bottom, left, right } } = chart;
                        ctx.save();
                        ctx.fillStyle = '#0a0a1a';
                        ctx.fillRect(left, top, right - left, bottom - top);
                        ctx.restore();
                    }
                };

                // 6. CREAR GRÁFICO
                deltaChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Precio',
                                data: precios,
                                borderColor: 'rgba(59, 130, 246, 0.85)',
                                borderWidth: 2,
                                tension: 0.35,
                                fill: false,
                                pointBackgroundColor: coloresPuntos,
                                pointBorderColor: bordesPuntos,
                                pointBorderWidth: 1.5,
                                pointRadius: radios,
                                pointHoverRadius: radios.map(r => r + 3),
                                pointHitRadius: 15
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 400 },
                        interaction: {
                            mode: 'index',
                            intersect: false
                        },
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(10, 10, 26, 0.95)',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1,
                                titleColor: '#fff',
                                bodyColor: '#d1d5db',
                                padding: 10,
                                callbacks: {
                                    title: (items) => {
                                        const idx = items[0].dataIndex;
                                        return velas[idx].timestamp;
                                    },
                                    label: (ctx) => {
                                        const v = velas[ctx.dataIndex];
                                        const tipo = v.tipo || (v.delta >= 0 ? 'COMPRA' : 'VENTA');
                                        const emoji = v.delta >= 0 ? '🟢' : '🔴';
                                        return [
                                            `Precio: Bs ${fmtBs(v.precio)}`,
                                            `${emoji} ${tipo}`,
                                            `Volumen: ${Number(v.volumen).toLocaleString('es-VE')}`,
                                            `Delta: ${Number(v.delta).toLocaleString('es-VE')}`,
                                            `Intensidad: ${v.intensidad_color}/10`
                                        ];
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { color: 'rgba(255,255,255,0.03)' },
                                ticks: {
                                    color: '#9ca3af',
                                    font: { size: 10 },
                                    maxRotation: 0,
                                    autoSkip: true,
                                    maxTicksLimit: 12
                                }
                            },
                            y: {
                                grid: { color: 'rgba(255,255,255,0.04)' },
                                ticks: {
                                    color: '#93c5fd',
                                    font: { size: 10 },
                                    callback: (val) => `Bs ${fmtBs(val)}`
                                },
                                title: {
                                    display: true,
                                    text: 'Precio (Bs)',
                                    color: '#93c5fd',
                                    font: { size: 11 }
                                }
                            }
                        }
                    },
                    plugins: [pluginFondo]
                });

                // AUTO REFRESH
                if (intervaloDelta) clearInterval(intervaloDelta);
                intervaloDelta = setInterval(() => window.actualizarVelaDelta(symbol), REFRESH_MS);

            } catch (error) {
                console.error("❌ Error en vela delta:", error);
            }
        };

        window.actualizarVelaDelta(SIMBOLO_DEFAULT);
    }

    esperarChartJS();
})();