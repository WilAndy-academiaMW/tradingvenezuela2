// ============================================================================
// volumen.js - Gráfica Histórica de Volumen (Barras) - PROMEDIOS FUERA
// ============================================================================

(function() {
    let chartInstance = null;
    let datosGlobales = [];
    let simboloActual = "BNC";
    
    // Estado de los botones
    let divisaActual = "bs"; // 'bs' o 'usd'
    let modoActual = "total"; // 'total' o 'oc'

    // Formateador de números
    const formatNumber = (num) => {
        if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
        return num.toFixed(2);
    };

    // Inicializar eventos de los botones
    function initBotones() {
        const btnBs = document.getElementById('btn-divisa-bs');
        const btnUsd = document.getElementById('btn-divisa-usd');
        const btnTotal = document.getElementById('btn-modo-total');
        const btnOc = document.getElementById('btn-modo-oc');

        if (!btnBs) return; // Si no existe el HTML, salir

        // Eventos Divisa
        btnBs.addEventListener('click', () => {
            divisaActual = "bs";
            btnBs.style.background = "#2563eb"; btnBs.style.color = "white";
            btnUsd.style.background = "transparent"; btnUsd.style.color = "#9ca3af";
            renderChart();
        });

        btnUsd.addEventListener('click', () => {
            divisaActual = "usd";
            btnUsd.style.background = "#2563eb"; btnUsd.style.color = "white";
            btnBs.style.background = "transparent"; btnBs.style.color = "#9ca3af";
            renderChart();
        });

        // Eventos Modo
        btnTotal.addEventListener('click', () => {
            modoActual = "total";
            btnTotal.style.background = "#2563eb"; btnTotal.style.color = "white";
            btnOc.style.background = "transparent"; btnOc.style.color = "#9ca3af";
            renderChart();
        });

        btnOc.addEventListener('click', () => {
            modoActual = "oc";
            btnOc.style.background = "#2563eb"; btnOc.style.color = "white";
            btnTotal.style.background = "transparent"; btnTotal.style.color = "#9ca3af";
            renderChart();
        });
    }

    // Cargar datos desde la API
    async function cargarDatos(simbolo) {
        simboloActual = simbolo;
        try {
            const res = await fetch(`https://api.tradingvenezuela.com/api/volumen/${simbolo}?t=${new Date().getTime()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            datosGlobales = json.volumen || [];
            
            if (datosGlobales.length === 0) {
                if (chartInstance) chartInstance.destroy();
                return;
            }

            renderChart();
        } catch (e) {
            console.error("❌ Error cargando volumen:", e);
        }
    }

    // Renderizar la gráfica
    function renderChart() {
        const canvas = document.getElementById('volumenChart');
        if (!canvas || datosGlobales.length === 0) return;
        const ctx = canvas.getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
        }

        const labels = datosGlobales.map(d => d.fecha);
        
        let datasets = [];
        let titleText = "";
        
        // Variables para calcular los promedios
        let promTotal = 0;
        let promO = 0;
        let promC = 0;

        if (modoActual === "total") {
            // MODO TOTAL
            let dataTotal = [];
            if (divisaActual === "bs") {
                dataTotal = datosGlobales.map(d => d.bs_total);
                titleText = "Volumen Total (Bs)";
            } else {
                dataTotal = datosGlobales.map(d => d.usd_total);
                titleText = "Volumen Total (USD)";
            }
            
            const valoresValidos = dataTotal.filter(v => v !== null && v !== undefined);
            if (valoresValidos.length > 0) {
                promTotal = valoresValidos.reduce((a, b) => a + b, 0) / valoresValidos.length;
            }

            datasets.push({
                label: 'Volumen Total',
                data: dataTotal,
                type: 'bar',
                backgroundColor: 'rgba(96, 165, 250, 0.7)', 
                borderColor: '#60a5fa',
                borderWidth: 1,
                borderRadius: 4 
            });

        } else {
            // MODO O / C (Logarítmico)
            let dataO = [];
            let dataC = [];

            if (divisaActual === "bs") {
                dataO = datosGlobales.map(d => d.bs_O > 0 ? d.bs_O : null);
                dataC = datosGlobales.map(d => d.bs_C > 0 ? d.bs_C : null);
                titleText = "Volumen O / C (Bs) - Escala Log";
            } else {
                dataO = datosGlobales.map(d => d.usd_O > 0 ? d.usd_O : null);
                dataC = datosGlobales.map(d => d.usd_C > 0 ? d.usd_C : null);
                titleText = "Volumen O / C (USD) - Escala Log";
            }
            
            const valO = dataO.filter(v => v !== null && v !== undefined);
            if (valO.length > 0) promO = valO.reduce((a, b) => a + b, 0) / valO.length;
            
            const valC = dataC.filter(v => v !== null && v !== undefined);
            if (valC.length > 0) promC = valC.reduce((a, b) => a + b, 0) / valC.length;

            datasets.push({
                label: 'Operaciones (O)',
                data: dataO,
                type: 'bar',
                backgroundColor: 'rgba(0, 255, 136, 0.7)', 
                borderColor: '#00ff88',
                borderWidth: 1,
                borderRadius: 4
            });
            datasets.push({
                label: 'Cierre (C)',
                data: dataC,
                type: 'bar',
                backgroundColor: 'rgba(255, 170, 0, 0.7)', 
                borderColor: '#ffaa00',
                borderWidth: 1,
                borderRadius: 4
            });
        }

        // 🔥 PLUGIN PARA DIBUJAR LAS LÍNEAS DEL PROMEDIO Y TEXTOS ARRIBA 🔥
        const promedioPlugin = {
            id: 'promedioLine',
            afterDraw: (chart) => {
                const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
                
                const dibujarLinea = (valor, color) => {
                    if (valor <= 0) return;
                    const yPos = y.getPixelForValue(valor);
                    if (yPos < top || yPos > bottom) return;

                    ctx.save();
                    
                    // Línea punteada
                    ctx.beginPath();
                    ctx.moveTo(left, yPos);
                    ctx.lineTo(right, yPos);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = color; 
                    ctx.setLineDash([5, 5]); 
                    ctx.stroke();
                    ctx.restore();
                };

                // Textos fuera de la gráfica (en el margen superior)
                const prefijo = divisaActual === 'bs' ? 'Bs. ' : '$ ';
                ctx.save();
                ctx.font = 'bold 11px "Courier New", monospace';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';

                // Ajustamos la posición Y para que queden por encima del gráfico (top - 10)
                const yTextPos = top - 5; 
                
                if (modoActual === 'total') {
                    dibujarLinea(promTotal, '#ffd700');
                    const texto = `Prom: ${prefijo}${promTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    ctx.fillStyle = '#ffd700';
                    ctx.fillText(texto, right, yTextPos);
                } else {
                    dibujarLinea(promO, '#00ff88');
                    dibujarLinea(promC, '#ffaa00');
                    
                    const textoO = `Prom O: ${prefijo}${promO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    const textoC = `Prom C: ${prefijo}${promC.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    
                    // Los dibujamos uno al lado del otro
                    ctx.fillStyle = '#00ff88';
                    ctx.fillText(textoO, right - 200, yTextPos); 
                    
                    ctx.fillStyle = '#ffaa00';
                    ctx.fillText(textoC, right, yTextPos);
                }
                ctx.restore();
            }
        };

        // Crear la gráfica
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 15 // 👈 Damos un poco de margen arriba para que los textos respiren
                    }
                },
                interaction: {
                    mode: 'index', // 👈 Volvemos al modo cruzado
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: { 
                            color: '#9ca3af', 
                            font: { family: "'Courier New', monospace", size: 11 },
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    },
                    title: {
                        display: true,
                        text: titleText,
                        color: '#fff',
                        font: { family: "'Courier New', monospace", size: 12, weight: 'normal' },
                        padding: { bottom: 20 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(10, 10, 26, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#ccc',
                        borderColor: '#1a1a3e',
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) label += ': ';
                                if (context.parsed.y !== null) {
                                    const prefijo = divisaActual === 'bs' ? 'Bs. ' : '$ ';
                                    label += prefijo + context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }, 
                        ticks: { 
                            color: '#6b7280', 
                            font: { family: "'Courier New', monospace", size: 10 },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    },
                    y: {
                        type: modoActual === 'oc' ? 'logarithmic' : 'linear',
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: { 
                            color: '#6b7280', 
                            font: { family: "'Courier New', monospace", size: 10 },
                            callback: function(value) { return formatNumber(value); }
                        }
                    }
                }
            },
            plugins: [promedioPlugin]
        });
    }

    // Exponer la función global
    window.actualizarVolumen = function(simbolo) {
        cargarDatos(simbolo);
    };

    // Iniciar
    document.addEventListener("DOMContentLoaded", () => {
        initBotones();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initBotones();
    }

})();