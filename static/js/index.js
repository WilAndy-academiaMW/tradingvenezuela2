// ==========================================
// 1. VARIABLES GLOBALES UNIFICADAS
// ==========================================
window.monedaActual = 'ABC.A';
window.temporalidadActual = '1d';
window.candlestickSeries = null;
window.chart = null;
window.seriesData = [];
window.mainData = [];
window.lineasFibo = [];
window.snLines = [];
window.rectLines = [];
window.trendLines = [];
window.reglasGuardadas = [];
window.panelCVDActivo = window.panelCVDActivo || false;

const chartElement = document.getElementById('chart');

// ==========================================
// 2. MENÚS DESPLEGABLES (NAV)
// ==========================================
document.querySelectorAll('.dropdown-content').forEach(menu => {
    menu.style.display = 'none';
});

document.addEventListener('click', function(event) {
    const trigger = event.target.closest('.dropdown-trigger');

    if (trigger) {
        const parent = trigger.closest('.dropdown');
        const menu = parent.querySelector('.dropdown-content');

        document.querySelectorAll('.dropdown-content').forEach(m => {
            if (m !== menu) m.style.display = 'none';
        });

        if (menu.style.display === 'block') {
            menu.style.display = 'none';
        } else {
            menu.style.display = 'block';
        }
    } else {
        document.querySelectorAll('.dropdown-content').forEach(m => {
            m.style.display = 'none';
        });
    }
});

// ==========================================
// 3. INICIALIZACIÓN DEL GRÁFICO
// ==========================================
window.chart = LightweightCharts.createChart(chartElement, {
    width: chartElement.clientWidth,
    height: chartElement.clientHeight,
    layout: {
        background: { color: '#0b0e11' },
        textColor: '#d1d4dc',
        fontSize: 12,
    },
    grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.05)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.05)' }
    },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    timeScale: {
        visible: true,
        timeVisible: true,
        borderColor: '#485c7b',
        barSpacing: 10,
        rightOffset: 20,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        shiftVisibleRangeOnNewBar: true,
    },
    rightPriceScale: {
        borderColor: '#485c7b',
        visible: true,
        autoScale: true,
        mode: LightweightCharts.PriceScaleMode.Normal,
    },
    handleScroll: true,
    handleScale: true,
});

// Auto-resizer
const resizeObserver = new ResizeObserver(entries => {
    if (entries.length === 0 || !entries[0].contentRect) return;
    const { width, height } = entries[0].contentRect;
    window.chart.applyOptions({ width: width, height: height });
});
resizeObserver.observe(chartElement);

// ==========================================
// 4. CONFIGURACIÓN DE LA SERIE DE VELAS
// ==========================================
window.candlestickSeries = window.chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
    priceScaleId: 'right',
});
window.lineSeries = window.candlestickSeries;

function cargarGrafica() {
    const tf = window.temporalidadActual;

    const simboloArchivo = window.monedaActual.replace('/', '_').replace('.', '_');

    let temporalidadEndpoint;
    if (tf === '1w')       temporalidadEndpoint = '1week';
    else if (tf === '1M')  temporalidadEndpoint = '1month';
    else                   temporalidadEndpoint = '1day';

    const divisaEndpoint = (window.monedaVisual === 'EUR') ? 'euro' : 'ves';

    const API_BASE = window.API_BASE || 'https://api.tradingvenezuela.com';
    const url = `${API_BASE}/api/acciones/${temporalidadEndpoint}/${divisaEndpoint}/${simboloArchivo}`;

    console.log(`Intentando cargar data [tf=${tf}, moneda=${window.monedaVisual}] desde:`, url);

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
            return response.json();
        })
        .then(data => {
            console.log(`📊 Datos recibidos para ${window.monedaActual} [${tf} - ${window.monedaVisual}]:`, data);

            const filas = (data && data.datos) ? data.datos : [];

            if (!filas.length) {
                console.error("❌ El endpoint devolvió 0 filas para:", url);
                return;
            }

            // Helper para leer columnas con o sin punto
            const leer = (row, ...nombres) => {
                for (const n of nombres) {
                    if (row[n] !== undefined && row[n] !== null && row[n] !== '') {
                        return parseFloat(row[n]);
                    }
                }
                return 0;
            };

            const validRows = filas.filter(row => {
                const max = leer(row, 'Max.', 'Max');
                const min = leer(row, 'Min.', 'Min');
                return row.Fecha && (max !== 0 || min !== 0);
            });

            let formattedData = validRows.map(row => {
                const ts = row.Fecha;
                const dateObj = new Date(ts);
                if (isNaN(dateObj.getTime())) return null;

                let finalTime = (tf === '1d' || tf === '1w' || tf === '1M')
                    ? dateObj.toISOString().split('T')[0]
                    : Math.floor(dateObj.getTime() / 1000);

                return {
                    time:   finalTime,
                    open:   leer(row, 'Apert.', 'Apertura'),
                    high:   leer(row, 'Max.',   'Max'),
                    low:    leer(row, 'Min.',   'Min'),
                    close:  leer(row, 'Cierre'),
                    volume: leer(row, 'VOLUMEN'),
                };
            }).filter(item => item !== null);

            formattedData.sort((a, b) => {
                const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
                const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
                return t1 - t2;
            });

            if (formattedData.length > 0) {
                const ultimoDato = formattedData[formattedData.length - 1];
                const precioDisplay = document.getElementById('price-display');
                if (precioDisplay) {
                    const simboloPrecio = (window.monedaVisual === 'EUR') ? '€' : 'Bs';
                    precioDisplay.innerText = `${simboloPrecio} ${ultimoDato.close.toFixed(3)}`;
                    precioDisplay.className = `text-xl font-mono font-bold ${ultimoDato.close >= ultimoDato.open ? 'text-green-400' : 'text-red-400'}`;
                }
            }

            window.seriesData = formattedData;
            window.candlestickSeries.setData(formattedData);
            window.chart.priceScale('right').applyOptions({ autoScale: true });

                        setTimeout(() => {
                // En lugar de fitContent(), le decimos que muestre solo las últimas N velas
                const totalVelas = formattedData.length;
                const velasAMostrar = 100; // Puedes cambiar este número (ej. 50, 150, 200)
                
                if (totalVelas > velasAMostrar) {
                    // Si hay más de 100 velas, mostramos desde la posición (total - 100) hasta el final
                    window.chart.timeScale().setVisibleLogicalRange({
                        from: totalVelas - velasAMostrar,
                        to: totalVelas
                    });
                } else {
                    // Si hay menos de 100 velas en total, mostramos todo
                    window.chart.timeScale().fitContent();
                }
            }, 50);

            console.log(`✅ Gráfico actualizado [${tf} - ${window.monedaVisual}] para ${window.monedaActual} (${formattedData.length} velas)`);
        })
        .catch(err => {
            console.error(`❌ Error al cargar data [${tf} - ${window.monedaVisual}] para:`, window.monedaActual, url, err);
        });
}

// ==========================================
// 6. GESTIÓN DE CLICS EN EL GRÁFICO (DIBUJOS)
// ==========================================
window.chart.subscribeClick((param) => {
    if (!param.point || !param.time) return;
    const price = window.candlestickSeries.coordinateToPrice(param.point.y);

    // 🔧 Normalizamos el time al formato de las velas según la temporalidad
    const tf = window.temporalidadActual;
    let time = param.time;
    if (tf === '1d' || tf === '1w') {
        if (typeof time !== 'string') {
            time = new Date(time * 1000).toISOString().split('T')[0];
        }
    } else {
        if (typeof time === 'string') {
            time = Math.floor(new Date(time).getTime() / 1000);
        }
    }

    // Lógica para Líneas de Tendencia
    if (window.modoDibujo === 'LINE') {
        window.puntosPendientes.push({ time, price });

        if (window.puntosPendientes.length === 1) {
            window.lineaTemporal = window.crearLineaDiv(
                window.puntosPendientes[0], 
                { time, price }, 
                true, 
                '#FFD700'
            );
        } else if (window.puntosPendientes.length === 2) {
            const p1 = window.puntosPendientes[0];
            const p2 = { time, price };

            const nuevaLinea = window.crearLineaDiv(p1, p2, false, '#FFD700');
            window.trendLines.push(nuevaLinea);

            if (typeof guardarLineaBD === 'function') {
                guardarLineaBD(p1, p2, 'trendline', '#FFD700');
            }

            window.desactivarModoDibujo();
        }
        return;
    }

    // Lógica Rectángulos
    if (window.modoDibujoRectangulo === true) {
        window.puntosRectangulo.push({ time, price });
        if (window.puntosRectangulo.length === 1) {
            window.rectanguloTemporal = window.crearRectanguloDiv(window.puntosRectangulo[0], { time, price }, true);
        } else if (window.puntosRectangulo.length === 2) {
            const nuevoRect = window.crearRectanguloDiv(window.puntosRectangulo[0], window.puntosRectangulo[1], false);
            window.rectangles.push(nuevoRect);
            window.desactivarModoRectangulo();
        }
        return;
    }

    // Lógica Horizontal
    if (window.modoDibujoHorizontal === true) {
        if (price !== null) {
            const nuevaLineaH = window.crearLineaHorizontalDiv(price);
            window.horizontalLines.push(nuevaLineaH);
            window.desactivarModoHorizontal();
        }
        return;
    }
});

// 7. SINCRONIZACIÓN DE ZOOM Y MOVIMIENTO
// ==========================================
window.renderPending = false;
window.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (window.renderPending) return;
    window.renderPending = true;

    requestAnimationFrame(() => {
        // Actualizar líneas de tendencia
        if (window.trendLines && Array.isArray(window.trendLines)) {
            window.trendLines.forEach(linea => {
                if (linea && typeof linea.actualizar === 'function') {
                    linea.actualizar();
                }
            });
        }
        window.horizontalLines?.forEach(l => l?.actualizar?.());
        window.rectangles?.forEach(r => r?.actualizar?.());

        // 🚀 ¡AQUÍ ESTABA FALTANDO CONECTARLO! Actualizar las posiciones de Riesgo (RR)
        if (window.riesgosGuardados && Array.isArray(window.riesgosGuardados)) {
            window.riesgosGuardados.forEach(riesgo => {
                if (riesgo && typeof riesgo.actualizar === 'function') {
                    riesgo.actualizar();
                }
            });
        }

        window.renderPending = false;
    });
});

// ==========================================
// 8. CAMBIO DE MONEDA Y TEMPORALIDAD
// ==========================================
function cambiarMoneda(simbolo) {
    window.monedaActual = simbolo;
    actualizarMarcaDeAgua();

    const header = document.getElementById('current-symbol');
    if (header) header.innerText = simbolo;

    document.querySelectorAll('.asset-row').forEach(row => {
        row.classList.remove('active-asset');
        if(row.getAttribute('data-symbol') === simbolo) {
            row.classList.add('active-asset');
        }
    });

    if (typeof limpiarTodo === 'function') limpiarTodo();
    cargarGrafica();
}

function cambiarTF(tf, elementoSeleccionado) {
    window.temporalidadActual = tf;
    document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('active'));
    elementoSeleccionado.classList.add('active');

    limpiarTodo();
    actualizarMarcaDeAgua();
    cargarGrafica();
}

function asegurarDrawingLayer() {
    let layer = document.getElementById('drawing-layer');
    if (!layer) {
        const chartContainer = document.querySelector('.chart-container');
        layer = document.createElement('div');
        layer.id = 'drawing-layer';
        Object.assign(layer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: '50', overflow: 'hidden'
        });
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(layer);
    }
    return layer;
}

document.addEventListener('DOMContentLoaded', function() {
    asegurarDrawingLayer();
});

// Limpieza total
function limpiarTodo() {
    if (window.limpiarFibo) window.limpiarFibo();
    if (typeof window.limpiarLineasTendencia === 'function') {
        window.limpiarLineasTendencia();
    }
}

// ==========================================
// 9. MARCA DE AGUA
// ==========================================
function actualizarMarcaDeAgua() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;

    let watermark = document.getElementById('chart-watermark');
    if (!watermark) {
        watermark = document.createElement('div');
        watermark.id = 'chart-watermark';
        Object.assign(watermark.style, {
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            pointerEvents: 'none', zIndex: '5', opacity: '0.07', fontFamily: 'sans-serif',
            userSelect: 'none', textAlign: 'center'
        });
        chartContainer.appendChild(watermark);
    }

    watermark.innerHTML = `
        <h1 style="font-size: 80px; font-weight: bold; color: #ffffff; margin: 0; line-height: 1;">${window.monedaActual}</h1>
        <p style="font-size: 32px; font-weight: 600; color: #ffffff; margin: 10px 0 0 0;">${window.temporalidadActual.toUpperCase()}</p>
    `;
}

// Carga inicial al abrir la página
actualizarMarcaDeAgua();
cargarGrafica();