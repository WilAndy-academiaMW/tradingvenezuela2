/**
 * Herramienta de Fibonacci - Golden Pocket Profesional con Nodos Movibles y Menú Contextual
 */
function initFibonacciTool() {
    if (!window.chart) {
        setTimeout(initFibonacciTool, 100);
        return;
    }

    let fiboToolActive = false;
    let fiboPrimerPunto = null;
    let isFiboDrawingFrame = false;
    let previewSeries = []; 

    if (!window.fiboDataList) window.fiboDataList = [];

    const colores = {
        n0: '#ef5350',      // Rojo (Inicio/Final)
        n382: '#90a4ae',    // Gris azulado
        n50: '#4caf50',     // Verde
        n618: '#ffb300',    // ORO (Golden Pocket)
        n786: '#7e57c2',    // Morado
        n100: '#ef5350'     // Rojo
    };

    window.toggleFiboTool = function() {
        fiboToolActive = !fiboToolActive;
        const btn = document.getElementById('btnFibo');
        if (fiboToolActive) {
            if (btn) btn.classList.replace('bg-gray-800', 'bg-yellow-600');
            window.chart.applyOptions({ handleScroll: false, handleScale: false });
            console.log("📏 Fibonacci Activo: Haz clic en el inicio del impulso.");
        } else {
            desactivarFiboTool();
        }
    };

    function desactivarFiboTool() {
        fiboToolActive = false;
        fiboPrimerPunto = null;
        limpiarPrevisualizacion();
        const btn = document.getElementById('btnFibo');
        if (btn) btn.classList.replace('bg-yellow-600', 'bg-gray-800');
        window.chart.applyOptions({ handleScroll: true, handleScale: true });
    }

    function limpiarPrevisualizacion() {
        previewSeries.forEach(s => { try { window.chart.removeSeries(s); } catch(e) {} });
        previewSeries = [];
    }

    function calcularNivelesDinamicos(p1, p2) {
        const diff = p2 - p1;
        return [
            { ratio: 0, price: p1, label: "0.0%", color: colores.n0 },
            { ratio: 0.382, price: p1 + diff * 0.382, label: "38.2%", color: colores.n382 },
            { ratio: 0.5, price: p1 + diff * 0.5, label: "50.0%", color: colores.n50 },
            { ratio: 0.618, price: p1 + diff * 0.618, label: "61.8% GOLDEN", color: colores.n618, bold: true },
            { ratio: 0.688, price: p1 + diff * 0.688, label: "68.8% GOLDEN", color: colores.n618, bold: true },
            { ratio: 0.786, price: p1 + diff * 0.786, label: "78.6%", color: colores.n786 },
            { ratio: 1, price: p2, label: "100.0%", color: colores.n100 }
        ];
    }

    // Actualiza la posición de las líneas de un Fibonacci guardado
    function actualizarLineasFiboObjeto(fiboObj) {
        const niveles = calcularNivelesDinamicos(fiboObj.p1.price, fiboObj.p2.price);
        niveles.forEach((n, index) => {
            if (fiboObj.series[index]) {
                const data = [
                    { time: fiboObj.p1.time, value: n.price },
                    { time: fiboObj.p2.time, value: n.price }
                ].sort((a, b) => {
                    const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
                    const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
                    return t1 - t2;
                });
                fiboObj.series[index].setData(data);
            }
        });
    }

    // Posiciona visualmente los nodos HTML en la pantalla
    function actualizarPosicionNodosFibo(fiboObj) {
        const drawingLayer = document.getElementById('drawing-layer');
        if (!drawingLayer) return;

        const timeScale = window.chart.timeScale();
        
        [ {p: fiboObj.p1, node: fiboObj.nodo1}, {p: fiboObj.p2, node: fiboObj.nodo2} ].forEach(item => {
            if (!item.node) return;
            const x = timeScale.timeToCoordinate(item.p.time);
            const y = window.candlestickSeries.priceToCoordinate(item.p.price);

            if (x === null || y === null || x < 0 || y < 0 || x > drawingLayer.clientWidth || y > drawingLayer.clientHeight) {
                item.node.style.display = 'none';
            } else {
                item.node.style.display = 'block';
                item.node.style.left = `${x}px`;
                item.node.style.top = `${y}px`;
            }
        });
    }

    // Crear nodos interactivos con eventos de arrastre y clic derecho
    function crearNodoVisual(fiboObj, esPunto1) {
        const drawingLayer = document.getElementById('drawing-layer');
        if (!drawingLayer) return null;

        const nodo = document.createElement('div');
        Object.assign(nodo.style, {
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: '#ffb300',
            border: '2px solid #ffffff',
            borderRadius: '50%',
            transform: 'translate(-6px, -6px)',
            cursor: 'pointer',
            zIndex: '60',
            pointerEvents: 'auto'
        });

        drawingLayer.appendChild(nodo);

        let arrastrando = false;

        nodo.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Click izquierdo para arrastrar
                e.stopPropagation();
                arrastrando = true;
                window.chart.applyOptions({ handleScroll: false, handleScale: false });
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!arrastrando) return;
            const rect = drawingLayer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const timeScale = window.chart.timeScale();
            const nuevoTiempo = timeScale.coordinateToTime(mouseX);
            const nuevoPrecio = window.candlestickSeries.coordinateToPrice(mouseY);

            if (nuevoPrecio !== null) {
                if (esPunto1) {
                    fiboObj.p1.price = nuevoPrecio;
                    if (nuevoTiempo) fiboObj.p1.time = nuevoTiempo;
                } else {
                    fiboObj.p2.price = nuevoPrecio;
                    if (nuevoTiempo) fiboObj.p2.time = nuevoTiempo;
                }
                actualizarLineasFiboObjeto(fiboObj);
                actualizarPosicionNodosFibo(fiboObj);
            }
        });

        window.addEventListener('mouseup', () => {
            if (arrastrando) {
                arrastrando = false;
                window.chart.applyOptions({ handleScroll: true, handleScale: true });
            }
        });

        // Click derecho para menú de borrar
        nodo.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            mostrarMenuContextualFibo(e.clientX, e.clientY, fiboObj);
        });

        return nodo;
    }

    // Menú contextual flotante para eliminar el Fibonacci
    function mostrarMenuContextualFibo(x, y, fiboObj) {
        document.querySelectorAll('.fibo-context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'fibo-context-menu';
        Object.assign(menu.style, {
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            backgroundColor: '#1e222d',
            border: '1px solid #485c7b',
            borderRadius: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: '1000',
            padding: '6px 0',
            cursor: 'pointer'
        });

        menu.innerHTML = `<div style="padding: 6px 16px; color: #ef5350; font-size: 13px; font-family: sans-serif; font-weight: bold;" id="del-fibo-btn">🗑️ Borrar Fibonacci</div>`;
        document.body.appendChild(menu);

        menu.querySelector('#del-fibo-btn').onclick = () => {
            // Eliminar series gráficas
            fiboObj.series.forEach(s => { try { window.chart.removeSeries(s); } catch(e) {} });
            // Eliminar nodos HTML
            if (fiboObj.nodo1) fiboObj.nodo1.remove();
            if (fiboObj.nodo2) fiboObj.nodo2.remove();
            // Retirar de la lista global
            window.fiboDataList = window.fiboDataList.filter(f => f !== fiboObj);
            menu.remove();
        };

        const cerrarMenu = () => {
            menu.remove();
            window.removeEventListener('click', cerrarMenu);
        };
        setTimeout(() => window.addEventListener('click', cerrarMenu), 10);
    }

    // --- MOVIMIENTO (VISTA PREVIA) ---
    window.chart.subscribeCrosshairMove(param => {
        if (!fiboToolActive || !fiboPrimerPunto || !param.point || isFiboDrawingFrame) return;

        isFiboDrawingFrame = true;
        requestAnimationFrame(() => {
            if (!fiboPrimerPunto || previewSeries.length === 0) {
                isFiboDrawingFrame = false;
                return;
            }

            const precioActual = window.candlestickSeries.coordinateToPrice(param.point.y);
            const tiempoActual = param.time || fiboPrimerPunto.time;

            if (precioActual !== null) {
                const niveles = calcularNivelesDinamicos(fiboPrimerPunto.price, precioActual);

                niveles.forEach((n, index) => {
                    if (previewSeries[index]) {
                        const data = [
                            { time: fiboPrimerPunto.time, value: n.price },
                            { time: tiempoActual, value: n.price }
                        ].sort((a, b) => {
                            const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
                            const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
                            return t1 - t2;
                        });
                        previewSeries[index].setData(data);
                    }
                });
            }
            isFiboDrawingFrame = false;
        });
    });

    // --- CLIC (FIJAR) ---
    window.chart.subscribeClick(param => {
        if (!fiboToolActive || !param.point) return;

        const precioClick = window.candlestickSeries.coordinateToPrice(param.point.y);
        const tiempoClick = param.time;

        if (precioClick === null || !tiempoClick) return;

        if (!fiboPrimerPunto) {
            fiboPrimerPunto = { time: tiempoClick, price: precioClick };
            const nivelesBase = calcularNivelesDinamicos(precioClick, precioClick);

           nivelesBase.forEach(n => {
                 const s = window.chart.addLineSeries({
                     color: n.color,
                     lineWidth: n.bold ? 3 : 1,
                     lineStyle: 0,
                     lastValueVisible: false,
                     priceLineVisible: false,
                     title: n.label
                 });
                 previewSeries.push(s);
             });
            console.log("📍 Punto inicial fijado. Mueve el mouse al final del impulso.");
        } else {
            // SEGUNDO CLIC: Finalizar y crear objeto interactivo
            const seriesFinales = [...previewSeries];
            
            const nuevoFiboObj = {
                p1: { ...fiboPrimerPunto },
                p2: { time: tiempoClick, price: precioClick },
                series: seriesFinales,
                nodo1: null,
                nodo2: null
            };

            // Crear los nodos visuales interactivos
            nuevoFiboObj.nodo1 = crearNodoVisual(nuevoFiboObj, true);
            nuevoFiboObj.nodo2 = crearNodoVisual(nuevoFiboObj, false);

            window.fiboDataList.push(nuevoFiboObj);
            actualizarPosicionNodosFibo(nuevoFiboObj);

            previewSeries = [];
            fiboPrimerPunto = null;

            console.log("✅ Fibonacci completado e interactivo.");
            desactivarFiboTool();
        }
    });

    // Actualizar nodos y líneas cuando se mueva o haga zoom en el gráfico
    const oldOnVisibleRangeChange = window.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (window.fiboDataList) {
            window.fiboDataList.forEach(fiboObj => actualizarPosicionNodosFibo(fiboObj));
        }
    });

    window.limpiarFibo = function() {
        console.log("🧹 Limpiando todos los Fibonacci...");

        if (window.fiboDataList && window.fiboDataList.length > 0) {
            window.fiboDataList.forEach(fiboObjeto => {
                if (fiboObjeto.series) {
                    fiboObjeto.series.forEach(s => {
                        try { window.chart.removeSeries(s); } catch(e) {}
                    });
                }
                if (fiboObjeto.nodo1) fiboObjeto.nodo1.remove();
                if (fiboObjeto.nodo2) fiboObjeto.nodo2.remove();
            });
            window.fiboDataList = [];
        }

        limpiarPrevisualizacion();
        fiboPrimerPunto = null;
        fiboToolActive = false;
        window.chart.applyOptions({ handleScroll: true, handleScale: true });

        const btn = document.getElementById('btnFibo');
        if (btn) btn.classList.replace('bg-yellow-600', 'bg-gray-800');

        console.log("✅ Fibonacci reseteado.");
    };
}

initFibonacciTool();