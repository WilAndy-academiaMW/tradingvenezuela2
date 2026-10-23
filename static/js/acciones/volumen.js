// ============================================================================
// volumen.js - Gráfica Histórica de Volumen (Barras)
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
            
            // Si no hay datos, no dibujar
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

        // Destruir gráfica anterior si existe
        if (chartInstance) {
            chartInstance.destroy();
        }

        const labels = datosGlobales.map(d => d.fecha);
        
        let datasets = [];
        let titleText = "";

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

            datasets.push({
                label: 'Volumen Total',
                data: dataTotal,
                type: 'bar',
                backgroundColor: 'rgba(96, 165, 250, 0.7)', // Azul semitransparente
                borderColor: '#60a5fa',
                borderWidth: 1,
                borderRadius: 4 // Bordes redondeados
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

            datasets.push({
                label: 'Operaciones (O)',
                data: dataO,
                type: 'bar',
                backgroundColor: 'rgba(0, 255, 136, 0.7)', // Verde semitransparente
                borderColor: '#00ff88',
                borderWidth: 1,
                borderRadius: 4
            });
            datasets.push({
                label: 'Cierre (C)',
                data: dataC,
                type: 'bar',
                backgroundColor: 'rgba(255, 170, 0, 0.7)', // Naranja semitransparente
                borderColor: '#ffaa00',
                borderWidth: 1,
                borderRadius: 4
            });
        }

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
                interaction: {
                    mode: 'index',
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
                        grid: { display: false }, // Ocultamos las líneas verticales para que se vea más limpio
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
            }
        });
    }

    // Exponer la función global para que app.js la llame al cambiar de botón
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