// ==========================================
// 1. VARIABLES GLOBALES UNIFICADAS
// ==========================================
window.monedaActual = 'ABC.A';
window.temporalidadActual = '1M';
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

// Variables para el Scroll Infinito
window.velasCargadas = 0;
window.cargandoVelas = false;
window.maxVelasPorBloque = 500;

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
        scaleMargins: {
            top: 0.1,
            bottom: 0.1,
        },
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

// ==========================================
// FUNCIÓN AUXILIAR PARA FORMATEAR DATOS (BLINDADA)
// ==========================================
function formatearDatos(filas, tf) {
    const leer = (row, ...nombres) => {
        for (const n of nombres) {
            if (row[n] !== undefined && row[n] !== null && row[n] !== '') {
                const val = parseFloat(row[n]);
                return isNaN(val) ? null : val;
            }
        }
        return null;
    };

    let formattedData = filas.map(row => {
        const ts = row.Fecha;
        if (!ts) return null;

        const dateObj = new Date(ts);
        if (isNaN(dateObj.getTime())) return null;

        let finalTime = (tf === '1d' || tf === '1w' || tf === '1M')
            ? dateObj.toISOString().split('T')[0]
            : Math.floor(dateObj.getTime() / 1000);

        if (!finalTime) return null;

        const open = leer(row, 'Apert.', 'Apertura');
        const high = leer(row, 'Max.', 'Max');
        const low = leer(row, 'Min.', 'Min');
        const close = leer(row, 'Cierre');
        const volume = leer(row, 'VOLUMEN');

        // Validación estricta: Si falta algún precio o hay incoherencias, descartar
        if (open === null || high === null || low === null || close === null) return null;
        if (high < low) return null;
        if (close === 0 || open === 0) return null;

        return {
            time:   finalTime,
            open:   open,
            high:   high,
            low:    low,
            close:  close,
            volume: volume !== null ? volume : 0,
        };
    }).filter(item => item !== null);

    // ORDENAR por tiempo ascendente
    formattedData.sort((a, b) => {
        const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
        const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
        return t1 - t2;
    });

    // ELIMINAR DUPLICADOS (Esto evita el error 'Value is null')
    const dataUnica = [];
    const fechasVistas = new Set();

    formattedData.forEach(vela => {
        if (!fechasVistas.has(vela.time)) {
            dataUnica.push(vela);
            fechasVistas.add(vela.time);
        }
    });

    return dataUnica;
}

// ==========================================
// 5. CARGA INICIAL DE LA GRÁFICA
// ==========================================
// ==========================================
// 5. CARGA INICIAL DE LA GRÁFICA (PROGRESIVA)
// ==========================================
// ==========================================
// 5. CARGA INICIAL DE LA GRÁFICA (ULTRA RÁPIDA + ZOOM FIJO)
// ==========================================
// ==========================================
// 5. CARGA INICIAL DE LA GRÁFICA (STREAMING POR LOTES)
// ==========================================
async function cargarGrafica() {
    const tf = window.temporalidadActual;
    const simboloArchivo = window.monedaActual.replace('/', '_').replace('.', '_');

    let temporalidadEndpoint;
    if (tf === '1w')       temporalidadEndpoint = '1week';
    else if (tf === '1M')  temporalidadEndpoint = '1month';
    else                   temporalidadEndpoint = '1day';

    const divisaEndpoint = (window.monedaVisual === 'EUR') ? 'euro' : 'ves';
    const API_BASE = window.API_BASE || 'https://api.tradingvenezuela.com';

    console.log(`⚡ [Streaming] Iniciando carga por lotes para ${window.monedaActual} (${tf})...`);
    
    window.cargandoVelas = true;
    window.seriesData = [];
    window.velasCargadas = 0;

    // Limpiamos la gráfica antes de empezar
    window.candlestickSeries.setData([]);

    // Configuración del lote
    const LOTE = 100; // Traer de 100 en 100
    const LIMITE_TOTAL = window.maxVelasPorBloque || 500; // Total a cargar inicialmente
    let offset = 0;
    let primeraCarga = true;

    try {
        while (offset < LIMITE_TOTAL) {
            // Verificamos que el usuario no haya cambiado de moneda mientras cargaba
            const simboloActual = window.monedaActual.replace('/', '_').replace('.', '_');
            if (simboloActual !== simboloArchivo) {
                console.log("🛑 El usuario cambió de moneda. Deteniendo carga.");
                break;
            }

            const url = `${API_BASE}/api/acciones/${temporalidadEndpoint}/${divisaEndpoint}/${simboloArchivo}?limit=${LOTE}&offset=${offset}`;
            
            // Hacemos la petición (await detiene el bucle hasta que llegue este lote)
            const response = await fetch(url);
            const data = await response.json();
            const filas = (data && data.datos) ? data.datos : [];

            if (!filas.length) {
                // No hay más datos en el servidor
                break;
            }

            const nuevasVelas = formatearDatos(filas, tf);
            
            if (nuevasVelas.length > 0) {
                // 👇 MEZCLAMOS LOS DATOS NUEVOS CON LOS QUE YA TENÍAMOS 👇
                // Importante: el formatearDatos los ordena de viejo a nuevo.
                // Como el offset trae los más nuevos primero, debemos insertarlos al principio.
                window.seriesData = [...nuevasVelas, ...window.seriesData];
                
                // Eliminar duplicados (por si el offset se solapa)
                const dataUnica = [];
                const fechasVistas = new Set();
                window.seriesData.forEach(vela => {
                    if (!fechasVistas.has(vela.time)) {
                        dataUnica.push(vela);
                        fechasVistas.add(vela.time);
                    }
                });
                window.seriesData = dataUnica;
                window.velasCargadas = dataUnica.length;

                // 👇 DIBUJAMOS INMEDIATAMENTE 👇
                window.candlestickSeries.setData(window.seriesData);

                // Si es la primera carga, hacemos zoom a las últimas 100 velas
                if (primeraCarga && window.seriesData.length > 0) {
                    const total = window.seriesData.length;
                    const velasAMostrar = Math.min(100, total);
                    window.chart.timeScale().setVisibleLogicalRange({
                        from: total - velasAMostrar,
                        to: total
                    });
                    primeraCarga = false;
                }

                console.log(`📦 Lote de ${nuevasVelas.length} velas dibujado. Total en gráfico: ${window.velasCargadas}`);
            }

            // Actualizamos el offset para la siguiente petición
            offset += LOTE;
            
            // Pequeña pausa opcional para no saturar el navegador (10ms)
            await new Promise(r => setTimeout(r, 10)); 
        }

        // Al final, actualizamos el precio superior con el último dato
        if (window.seriesData.length > 0) {
            const ultimoDato = window.seriesData[window.seriesData.length - 1];
            const precioDisplay = document.getElementById('price-display');
            if (precioDisplay) {
                const simboloPrecio = (window.monedaVisual === 'EUR') ? '€' : 'Bs';
                precioDisplay.innerText = `${simboloPrecio} ${ultimoDato.close.toFixed(3)}`;
                precioDisplay.className = `text-xl font-mono font-bold ${ultimoDato.close >= ultimoDato.open ? 'text-green-400' : 'text-red-400'}`;
            }
        }

        console.log(`✅ [Streaming] Carga completada. Total: ${window.velasCargadas} velas.`);
        window.cargandoVelas = false;

    } catch (error) {
        console.error("❌ Error en carga por lotes:", error);
        window.cargandoVelas = false;
    }
}

// ==========================================
// 6. SCROLL INFINITO
// ==========================================
window.chart.timeScale().subscribeVisibleLogicalRangeChange(logicalRange => {
    if (window.cargandoVelas || !logicalRange || logicalRange.from > 10) return;

    if (logicalRange.from <= 0) {
        window.cargandoVelas = true;
        console.log("⏳ Llegaste al principio. Cargando 500 velas más antiguas...");

        const tf = window.temporalidadActual;
        const simboloArchivo = window.monedaActual.replace('/', '_').replace('.', '_');
        let temporalidadEndpoint = (tf === '1w') ? '1week' : (tf === '1M') ? '1month' : '1day';
        const divisaEndpoint = (window.monedaVisual === 'EUR') ? 'euro' : 'ves';
        const API_BASE = window.API_BASE || 'https://api.tradingvenezuela.com';

        const url = `${API_BASE}/api/acciones/${temporalidadEndpoint}/${divisaEndpoint}/${simboloArchivo}?limit=${window.maxVelasPorBloque}&offset=${window.velasCargadas}`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                const filas = data.datos || [];
                if (!filas.length) {
                    console.log("📭 No hay más velas antiguas.");
                    window.cargandoVelas = false;
                    return;
                }

                const nuevasVelas = formatearDatos(filas, tf);
                if (nuevasVelas.length === 0) {
                    window.cargandoVelas = false;
                    return;
                }
                
                // Combinar y eliminar duplicados
                const dataCombinada = [...nuevasVelas, ...window.seriesData];
                const dataUnica = [];
                const fechasVistas = new Set();

                // Ordenar antes de deduplicar
                dataCombinada.sort((a, b) => {
                    const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
                    const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
                    return t1 - t2;
                });

                dataCombinada.forEach(vela => {
                    if (!fechasVistas.has(vela.time)) {
                        dataUnica.push(vela);
                        fechasVistas.add(vela.time);
                    }
                });

                window.seriesData = dataUnica;
                window.velasCargadas = dataUnica.length;

                window.candlestickSeries.setData(dataUnica);
                console.log(`✅ Se añadieron velas antiguas. Total: ${dataUnica.length}`);
                window.cargandoVelas = false;
            })
            .catch(err => {
                console.error("❌ Error cargando velas antiguas:", err);
                window.cargandoVelas = false;
            });
    }
});

// ==========================================
// 7. GESTIÓN DE CLICS EN EL GRÁFICO
// ==========================================
window.chart.subscribeClick((param) => {
    if (!param.point || !param.time) return;
    const price = window.candlestickSeries.coordinateToPrice(param.point.y);

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

    if (window.modoDibujo === 'LINE') {
        window.puntosPendientes.push({ time, price });
        if (window.puntosPendientes.length === 1) {
            window.lineaTemporal = window.crearLineaDiv(window.puntosPendientes[0], { time, price }, true, '#FFD700');
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

    if (window.modoDibujoHorizontal === true) {
        if (price !== null) {
            const nuevaLineaH = window.crearLineaHorizontalDiv(price);
            window.horizontalLines.push(nuevaLineaH);
            window.desactivarModoHorizontal();
        }
        return;
    }
});

// ==========================================
// 8. SINCRONIZACIÓN DE ZOOM Y MOVIMIENTO
// ==========================================
window.renderPending = false;
window.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    if (window.renderPending) return;
    window.renderPending = true;

    requestAnimationFrame(() => {
        if (window.trendLines && Array.isArray(window.trendLines)) {
            window.trendLines.forEach(linea => {
                if (linea && typeof linea.actualizar === 'function') linea.actualizar();
            });
        }
        window.horizontalLines?.forEach(l => l?.actualizar?.());
        window.rectangles?.forEach(r => r?.actualizar?.());
        if (window.riesgosGuardados && Array.isArray(window.riesgosGuardados)) {
            window.riesgosGuardados.forEach(riesgo => {
                if (riesgo && typeof riesgo.actualizar === 'function') riesgo.actualizar();
            });
        }
        window.renderPending = false;
    });
});

// ==========================================
// 9. CAMBIO DE MONEDA Y TEMPORALIDAD
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
    
    // Reseteo de seguridad
    window.velasCargadas = 0;
    window.seriesData = [];
    
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

function limpiarTodo() {
    if (window.limpiarFibo) window.limpiarFibo();
    if (typeof window.limpiarLineasTendencia === 'function') {
        window.limpiarLineasTendencia();
    }
}

// ==========================================
// 10. MARCA DE AGUA
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

// ==========================================
// 11. ARRANQUE INICIAL
// ==========================================
actualizarMarcaDeAgua();
const headerInicial = document.getElementById('current-symbol');
if (headerInicial) headerInicial.innerText = window.monedaActual;
cargarGrafica();