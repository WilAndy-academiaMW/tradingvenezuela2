console.log("🚀 [System] elliot.js cargado - Ondas con Líneas Nativas y Nodos Interactivos");

window.modoDibujoElliot = false;
window.elliotActual = null;
window.elliotsGuardados = window.elliotsGuardados || [];

// 1. Manejador de clics en el gráfico para colocar los puntos de Elliot
document.addEventListener('DOMContentLoaded', () => {
    const chartContainer = document.getElementById('chart');
    if (chartContainer) {
        chartContainer.addEventListener('click', (e) => {
            if (!window.modoDibujoElliot) return;

            const rect = chartContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

            const time = window.chart.timeScale().coordinateToTime(x);
            const price = window.candlestickSeries.coordinateToPrice(y);

            if (time === null || price === null) return;

            // Si no hay una estructura activa, iniciamos una nueva (Punto 0)
            if (!window.elliotActual) {
                window.elliotActual = window.crearEstructuraElliot({ time, price });
            } else {
                // Agregar siguiente punto (hasta completar 5 ondas: puntos 0 al 5)
                window.elliotActual.agregarPunto({ time, price });

                // Si ya completamos la onda 5, finalizamos el modo dibujo para esta estructura
                if (window.elliotActual.puntos.length >= 6) {
                    window.elliotActual.finalizar();
                    window.elliotActual = null;
                    window.modoDibujoElliot = false;
                    chartContainer.style.cursor = 'default';
                    console.log("✅ Onda de Elliot completada (Puntos 0 a 5).");
                }
            }
        });
    }
});

// Escuchador para el tramo elástico en tiempo real al mover el mouse
document.addEventListener('mousemove', (e) => {
    if (!window.modoDibujoElliot || !window.elliotActual) return;
    const chartContainer = document.getElementById('chart');
    if (!chartContainer) return;
    
    const rect = chartContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    const time = window.chart.timeScale().coordinateToTime(x);
    const price = window.candlestickSeries.coordinateToPrice(y);

    if (time !== null && price !== null) {
        window.elliotActual.actualizarTramoTemporal({ time, price });
    }
});

// Cancelar con la tecla Escape
document.addEventListener('keydown', (e) => {
    if (window.modoDibujoElliot && window.elliotActual && e.key === 'Escape') {
        window.elliotActual.destruir();
        window.modoDibujoElliot = false;
        window.elliotActual = null;
        const chartContainer = document.getElementById('chart');
        if (chartContainer) chartContainer.style.cursor = 'default';
        console.log("❌ Dibujo de Elliot cancelado por el usuario.");
    }
});

window.activarModoElliot = function() {
    window.modoDibujoElliot = true;
    window.modoDibujo = false; 
    window.modoDibujoHorizontal = false; 
    window.modoDibujoRectangulo = false; 
    window.modoDibujoRuta = false;
    window.elliotActual = null;
    
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'crosshair';
    console.log("🎯 Modo Elliot activado. Haz clic en el gráfico para colocar el punto 0.");
};

// Función auxiliar segura para ordenar cronológicamente los puntos de las líneas
function ordenarDatosLinea(p1, p2) {
    const t1 = typeof p1.time === 'string' ? new Date(p1.time).getTime() : p1.time;
    const t2 = typeof p2.time === 'string' ? new Date(p2.time).getTime() : p2.time;
    
    if (t1 <= t2) {
        return [{ time: p1.time, value: p1.price }, { time: p2.time, value: p2.price }];
    } else {
        return [{ time: p2.time, value: p2.price }, { time: p1.time, value: p1.price }];
    }
}

window.crearEstructuraElliot = function(puntoInicial, colorBase = '#38bdf8') {
    let layer = document.getElementById('drawing-layer');
    if (!layer) {
        layer = document.createElement('div');
        layer.id = 'drawing-layer';
        Object.assign(layer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '50'
        });
        document.getElementById('chart').appendChild(layer);
    }

    const id = Date.now() + Math.random();
    
    let objetoElliot = {
        id: id,
        puntos: [puntoInicial],
        seriesLineas: [], 
        divsNodos: [],    
        divsTextos: [],   
        lineaTemporalSeries: null, 
        textoTemporalDiv: null,    
        color: colorBase,

        agregarPunto: function(nuevoPunto) {
            this.puntos.push(nuevoPunto);
            this.crearElementosGraficos(this.puntos.length - 1);
            this.actualizar();
        },

        crearElementosGraficos: function(indice) {
            if (indice > 0) {
                // CORREGIDO: Usando addLineSeries nativo directo de Lightweight Charts
                const lineaSeries = window.chart.addLineSeries({
                    color: this.color,
                    lineWidth: 2,
                    lineStyle: 0,
                    lastValueVisible: false,
                    priceLineVisible: false
                });
                this.seriesLineas.push(lineaSeries);
            }

            // Crear Nodo interactivo
            const nodo = document.createElement('div');
            Object.assign(nodo.style, {
                width: '12px', height: '12px', backgroundColor: '#1c2030', borderRadius: '50%',
                position: 'absolute', zIndex: '101', transform: 'translate(-50%, -50%)', border: `2px solid ${this.color}`, cursor: 'pointer', pointerEvents: 'auto'
            });
            layer.appendChild(nodo);
            this.divsNodos.push(nodo);

            // Crear Etiqueta de Texto
            const etiqueta = document.createElement('div');
            Object.assign(etiqueta.style, {
                position: 'absolute', backgroundColor: 'rgba(28, 32, 48, 0.8)', color: '#fff',
                padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'sans-serif',
                zIndex: '102', transform: 'translate(10px, -20px)', pointerEvents: 'none', border: `1px solid ${this.color}`
            });
            layer.appendChild(etiqueta);
            this.divsTextos.push(etiqueta);
            
            const puntoActualRef = this.puntos[indice];
            nodo.onmousedown = (e) => {
                if (e.button === 0) {
                    iniciarArrastreElliot(e, puntoActualRef, () => this.actualizar());
                }
            };

            nodo.oncontextmenu = (e) => {
                e.preventDefault();
                e.stopPropagation();
                mostrarMenuContextualElliot(e.clientX, e.clientY, this);
            };
        },

        actualizarTramoTemporal: function(puntoMouse) {
            if (this.puntos.length === 0) return;
            
            if (!this.lineaTemporalSeries) {
                // CORREGIDO: Usando addLineSeries nativo directo de Lightweight Charts
                this.lineaTemporalSeries = window.chart.addLineSeries({
                    color: this.color,
                    lineWidth: 2,
                    lineStyle: 2, 
                    lastValueVisible: false,
                    priceLineVisible: false
                });

                this.textoTemporalDiv = document.createElement('div');
                Object.assign(this.textoTemporalDiv.style, {
                    position: 'absolute', color: '#ffd93d', padding: '2px 6px', fontSize: '11px', fontFamily: 'sans-serif', zIndex: '102', pointerEvents: 'none', textShadow: '1px 1px 2px #000'
                });
                layer.appendChild(this.textoTemporalDiv);
            }
            
            const ultimoPunto = this.puntos[this.puntos.length - 1];
            this.lineaTemporalSeries.setData(ordenarDatosLinea(ultimoPunto, puntoMouse));

            const x2 = window.chart.timeScale().timeToCoordinate(puntoMouse.time);
            const y2 = window.candlestickSeries.priceToCoordinate(puntoMouse.price);

            if (x2 !== null && y2 !== null) {
                const indiceSiguiente = this.puntos.length;
                this.textoTemporalDiv.textContent = calcularTextoElliot(this.puntos, puntoMouse, indiceSiguiente);
                this.textoTemporalDiv.style.left = x2 + 'px';
                this.textoTemporalDiv.style.top = (y2 - 20) + 'px';
            }
        },

        actualizar: function() {
            if (!window.candlestickSeries || !window.chart) return;

            // 1. Actualizar líneas nativas ordenadas correctamente
            for (let i = 0; i < this.puntos.length - 1; i++) {
                if (this.seriesLineas[i]) {
                    const dataOrdenada = ordenarDatosLinea(this.puntos[i], this.puntos[i+1]);
                    this.seriesLineas[i].setData(dataOrdenada);
                }
            }

            // 2. Actualizar posiciones físicas en pantalla de nodos y textos
            for (let i = 0; i < this.puntos.length; i++) {
                const x = window.chart.timeScale().timeToCoordinate(this.puntos[i].time);
                const y = window.candlestickSeries.priceToCoordinate(this.puntos[i].price);

                if (x !== null && y !== null && this.divsNodos[i]) {
                    this.divsNodos[i].style.left = x + 'px';
                    this.divsNodos[i].style.top = y + 'px';
                    
                    this.divsTextos[i].style.left = x + 'px';
                    this.divsTextos[i].style.top = y + 'px';
                    this.divsTextos[i].textContent = calcularTextoElliot(this.puntos, this.puntos[i], i);
                }
            }
        },

        finalizar: function() {
            if (this.lineaTemporalSeries) {
                try { window.chart.removeSeries(this.lineaTemporalSeries); } catch(e) {}
                this.lineaTemporalSeries = null;
            }
            if (this.textoTemporalDiv) {
                this.textoTemporalDiv.remove();
                this.textoTemporalDiv = null;
            }
            if (!window.elliotsGuardados.includes(this)) {
                window.elliotsGuardados.push(this);
            }
        },

        destruir: function() {
            this.seriesLineas.forEach(s => {
                try { window.chart.removeSeries(s); } catch(e) {}
            });
            this.divsNodos.forEach(n => n.remove());
            this.divsTextos.forEach(t => t.remove());
            
            if (this.lineaTemporalSeries) {
                try { window.chart.removeSeries(this.lineaTemporalSeries); } catch(e) {}
            }
            if (this.textoTemporalDiv) this.textoTemporalDiv.remove();

            window.elliotsGuardados = window.elliotsGuardados.filter(e => e !== this);
        }
    };

    objetoElliot.crearElementosGraficos(0);
    objetoElliot.actualizar();
    return objetoElliot;
};

// Sincronizador global de Zoom / Panning
if (window.chart && window.chart.timeScale) {
    window.chart.timeScale().subscribeVisibleTimeRangeChange(() => {
        if (window.elliotsGuardados && window.elliotsGuardados.length > 0) {
            window.elliotsGuardados.forEach(elliot => elliot.actualizar());
        }
    });
}

function mostrarMenuContextualElliot(x, y, elliotObj) {
    document.querySelectorAll('.elliot-context-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'elliot-context-menu';
    Object.assign(menu.style, {
        position: 'fixed', left: `${x}px`, top: `${y}px`,
        backgroundColor: '#1e222d', border: '1px solid #485c7b',
        borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        zIndex: '1000', padding: '6px 0', cursor: 'pointer'
    });

    menu.innerHTML = `<div style="padding: 6px 16px; color: #ef5350; font-size: 13px; font-family: sans-serif; font-weight: bold;" id="del-elliot-btn">🗑️ Borrar Onda de Elliot</div>`;
    document.body.appendChild(menu);

    menu.querySelector('#del-elliot-btn').onclick = () => {
        elliotObj.destruir();
        menu.remove();
    };

    const cerrarMenu = () => {
        menu.remove();
        window.removeEventListener('click', cerrarMenu);
    };
    setTimeout(() => window.addEventListener('click', cerrarMenu), 10);
}

function calcularTextoElliot(arregloPuntos, puntoAEvaluar, i) {
    if (i === 0) return "0";
    if (i === 1) return "1";

    let porcentaje = "0.0";
    try {
        if (i === 2) {
            const w1 = Math.abs(arregloPuntos[1].price - arregloPuntos[0].price);
            const w2 = Math.abs(puntoAEvaluar.price - arregloPuntos[1].price);
            if(w1 > 0) porcentaje = ((w2 / w1) * 100).toFixed(1);
            return `2 (${porcentaje}%)`;
        } 
        else if (i === 3) {
            const w1 = Math.abs(arregloPuntos[1].price - arregloPuntos[0].price);
            const w3 = Math.abs(puntoAEvaluar.price - arregloPuntos[2].price);
            if(w1 > 0) porcentaje = ((w3 / w1) * 100).toFixed(1);
            return `3 (${porcentaje}%)`;
        } 
        else if (i === 4) {
            const w3 = Math.abs(arregloPuntos[3].price - arregloPuntos[2].price);
            const w4 = Math.abs(puntoAEvaluar.price - arregloPuntos[3].price);
            if(w3 > 0) porcentaje = ((w4 / w3) * 100).toFixed(1);
            return `4 (${porcentaje}%)`;
        } 
        else if (i === 5) {
            const w1 = Math.abs(arregloPuntos[1].price - arregloPuntos[0].price);
            const w5_val = Math.abs(puntoAEvaluar.price - arregloPuntos[4].price);
            if(w1 > 0) porcentaje = ((w5_val / w1) * 100).toFixed(1);
            return `5 (${porcentaje}%)`;
        }
    } catch (e) {
        return `${i}`;
    }
    return `${i}`;
}

function iniciarArrastreElliot(e, puntoAfectado, callbackActualizar) {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    window.chart.applyOptions({ handleScroll: false, handleScale: false });
    
    const onMouseMove = (event) => {
        const rect = document.getElementById('chart').getBoundingClientRect();
        const p = window.candlestickSeries.coordinateToPrice(event.clientY - rect.top);
        const t = window.chart.timeScale().coordinateToTime(event.clientX - rect.left);
        
        if (p !== null && t !== null) {
            puntoAfectado.price = p;
            puntoAfectado.time = t;
            callbackActualizar(); 
        }
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.chart.applyOptions({ handleScroll: true, handleScale: true });
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}