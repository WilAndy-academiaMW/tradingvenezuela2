console.log("🚀 [System] ruta.js optimizado con arrastre de nodos interconectados");

// 1. ESTADO GLOBAL
window.modoDibujoRuta = false;
window.rutaActual = null; 
window.rutasGuardadas = [];

// Escuchador para el tramo elástico en tiempo real
document.addEventListener('mousemove', (e) => {
    if (!window.modoDibujoRuta || !window.rutaActual) return;

    const rect = document.getElementById('chart').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    const time = window.chart.timeScale().coordinateToTime(x);
    const price = window.candlestickSeries.coordinateToPrice(y);

    if (time && price) {
        window.rutaActual.actualizarTramoTemporal({ time, price });
    }
});

// Escuchador de teclado para cerrar la ruta con Escape o Enter
document.addEventListener('keydown', (e) => {
    if (window.modoDibujoRuta && window.rutaActual && (e.key === 'Escape' || e.key === 'Enter')) {
        window.finalizarRutaActual();
    }
});

// ============================================
// 2. MENÚ CONTEXTUAL MEJORADO
// ============================================
window.mostrarMenuContextualRuta = function(e, id) {
    e.preventDefault();
    e.stopPropagation();
    
    const menuExistente = document.getElementById('menu-contextual-ruta');
    if (menuExistente) menuExistente.remove();
    const paletaExistente = document.getElementById('paleta-colores-ruta');
    if (paletaExistente) paletaExistente.remove();
    
    const menu = document.createElement('div');
    menu.id = 'menu-contextual-ruta';
    Object.assign(menu.style, {
        position: 'fixed',
        left: Math.min(e.clientX, window.innerWidth - 180) + 'px',
        top: Math.min(e.clientY, window.innerHeight - 150) + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '6px 0', zIndex: '10001', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    });
    
    const opciones = [
        { texto: '🎨 Cambiar color', color: '#ffd93d', action: (event) => window.cambiarColorRuta(event, id) },
        { texto: '📋 Duplicar', color: '#6bcb77', action: () => window.duplicarRuta(id) },
        { texto: '🗑️ Eliminar', color: '#ff6b6b', action: () => window.eliminarRuta(id) }
    ];
    
    opciones.forEach(op => {
        const item = document.createElement('div');
        item.textContent = op.texto;
        Object.assign(item.style, {
            padding: '10px 16px', color: '#d1d4dc', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif', transition: 'background 0.2s'
        });
        item.onmouseover = () => { item.style.backgroundColor = '#2c3247'; item.style.color = op.color; };
        item.onmouseout = () => { item.style.backgroundColor = 'transparent'; item.style.color = '#d1d4dc'; };
        item.onclick = (evt) => {
            evt.stopPropagation();
            op.action(evt);
            if (op.texto !== '🎨 Cambiar color') menu.remove(); 
        };
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    const cerrarMenu = (event) => {
        const paleta = document.getElementById('paleta-colores-ruta');
        if (!menu.contains(event.target) && (!paleta || !paleta.contains(event.target))) {
            menu.remove(); if (paleta) paleta.remove();
            document.removeEventListener('click', cerrarMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenu), 10);
};

// 3. ACTIVAR / FINALIZAR MODOS
window.activarModoRuta = function() {
    window.modoDibujoRuta = true;
    window.modoDibujo = false; window.modoDibujoHorizontal = false; window.modoDibujoRectangulo = false;
    window.rutaActual = null;
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'crosshair';
};

window.finalizarRutaActual = function() {
    if (window.rutaActual) {
        if (window.rutaActual.lineaTemporalDiv) window.rutaActual.lineaTemporalDiv.remove();
        
        if (window.rutaActual.puntos.length >= 2) {
            window.rutaActual.convertirAFinal();
            window.rutasGuardadas.push(window.rutaActual);
        } else {
            window.rutaActual.destruir();
        }
    }
    window.modoDibujoRuta = false;
    window.rutaActual = null;
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'default';
};

// 4. ELIMINAR
window.eliminarRuta = function(id) {
    const index = window.rutasGuardadas.findIndex(r => r.id === id);
    if (index !== -1) {
        window.rutasGuardadas[index].destruir();
        window.rutasGuardadas.splice(index, 1);
    }
};

// 5. CAMBIAR COLOR
window.cambiarColorRuta = function(e, id) {
    const ruta = window.rutasGuardadas.find(r => r.id === id);
    if (!ruta) return;
    
    const paletaExistente = document.getElementById('paleta-colores-ruta');
    if (paletaExistente) paletaExistente.remove();
    
    const paleta = document.createElement('div');
    paleta.id = 'paleta-colores-ruta';
    Object.assign(paleta.style, {
        position: 'fixed', left: (e.clientX + 20) + 'px', top: e.clientY + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '10px', zIndex: '10002', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });
    
    const colores = ['#a855f7', '#FFD700', '#FF6B6B', '#4ECDC4', '#26a69a', '#ef5350', '#38bdf8', '#ffffff'];
    
    colores.forEach(color => {
        const btn = document.createElement('div');
        Object.assign(btn.style, { width: '28px', height: '28px', backgroundColor: color, borderRadius: '4px', cursor: 'pointer' });
        btn.onclick = (evt) => {
            evt.stopPropagation();
            ruta.cambiarColor(color);
            paleta.remove();
            const menu = document.getElementById('menu-contextual-ruta');
            if (menu) menu.remove();
        };
        paleta.appendChild(btn);
    });
    document.body.appendChild(paleta);
};

// 6. DUPLICAR RUTA
window.duplicarRuta = function(id) {
    const r = window.rutasGuardadas.find(ruta => ruta.id === id);
    if (!r) return;
    
    const desfasePrecio = r.puntos[0].price * 0.01; 
    const nuevosPuntos = r.puntos.map(p => ({ time: p.time, price: p.price + desfasePrecio }));
    
    const nuevaRuta = window.crearEstructuraRuta(nuevosPuntos[0], r.color);
    for(let i = 1; i < nuevosPuntos.length; i++) {
        nuevaRuta.agregarPunto(nuevosPuntos[i]);
    }
    nuevaRuta.convertirAFinal();
    window.rutasGuardadas.push(nuevaRuta);
};

// 7. OBJETO CONTROLADOR DE LA RUTA EN EL DOM
window.crearEstructuraRuta = function(puntoInicial, colorBase = '#a855f7') {
    const layer = document.getElementById('drawing-layer');
    const id = Date.now() + Math.random();
    
    let objetoRuta = {
        id: id,
        puntos: [puntoInicial],
        divsLineas: [],
        divsNodos: [],
        lineaTemporalDiv: null,
        color: colorBase,
        esFinalizada: false,

        agregarPunto: function(nuevoPunto) {
            this.puntos.push(nuevoPunto);
            this.crearElementosGraficos();
            this.actualizar();
        },

        crearElementosGraficos: function() {
            // Si hay más de un punto, creamos la línea que une el penúltimo con el nuevo
            if (this.puntos.length > 1) {
                const linea = document.createElement('div');
                Object.assign(linea.style, {
                    position: 'absolute', backgroundColor: this.color, height: '3px', transformOrigin: '0 0', zIndex: '99', borderRadius: '2px'
                });
                layer.appendChild(linea);
                this.divsLineas.push(linea);
            }

            // Crear el Nodo (punto circular de control)
            const nodo = document.createElement('div');
            Object.assign(nodo.style, {
                width: '12px', height: '12px', backgroundColor: this.color, borderRadius: '50%',
                position: 'absolute', zIndex: '101', transform: 'translate(-50%, -50%)', border: '1px solid #fff', cursor: 'pointer'
            });
            layer.appendChild(nodo);
            this.divsNodos.push(nodo);
            
            const indicePunto = this.puntos.length - 1;
            
            // 🔥 AQUÍ ESTÁ LA MAGIA: Al mover el nodo, se ejecuta `this.actualizar()` que reposiciona todas las líneas dependientes
            nodo.onmousedown = (e) => iniciarArrastreRuta(e, this.puntos[indicePunto], () => this.actualizar());
        },

        actualizarTramoTemporal: function(puntoMouse) {
            if (this.puntos.length === 0) return;
            if (!this.lineaTemporalDiv) {
                this.lineaTemporalDiv = document.createElement('div');
                Object.assign(this.lineaTemporalDiv.style, {
                    position: 'absolute', backgroundColor: this.color, height: '2px', opacity: '0.6', transformOrigin: '0 0', zIndex: '97', pointerEvents: 'none'
                });
                layer.appendChild(this.lineaTemporalDiv);
            }
            
            const ultimoPuntoFijo = this.puntos[this.puntos.length - 1];
            const x1 = window.chart.timeScale().timeToCoordinate(ultimoPuntoFijo.time);
            const y1 = window.candlestickSeries.priceToCoordinate(ultimoPuntoFijo.price);
            const x2 = window.chart.timeScale().timeToCoordinate(puntoMouse.time);
            const y2 = window.candlestickSeries.priceToCoordinate(puntoMouse.price);

            if (x1 === null || x2 === null || y1 === null || y2 === null) {
                this.lineaTemporalDiv.style.display = 'none'; return;
            }
            this.lineaTemporalDiv.style.display = 'block';
            const dx = x2 - x1, dy = y2 - y1;
            this.lineaTemporalDiv.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
            this.lineaTemporalDiv.style.left = x1 + 'px';
            this.lineaTemporalDiv.style.top = y1 + 'px';
            this.lineaTemporalDiv.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
        },

        actualizar: function() {
            if (!window.candlestickSeries || !window.chart) return;

            // 1. Recorrer y redibujar cada línea de tramo usando las nuevas coordenadas actualizadas de los puntos
            for (let i = 0; i < this.puntos.length - 1; i++) {
                const p1 = this.puntos[i];
                const p2 = this.puntos[i + 1];
                const linea = this.divsLineas[i];

                const x1 = window.chart.timeScale().timeToCoordinate(p1.time);
                const y1 = window.candlestickSeries.priceToCoordinate(p1.price);
                const x2 = window.chart.timeScale().timeToCoordinate(p2.time);
                const y2 = window.candlestickSeries.priceToCoordinate(p2.price);

                if (x1 === null || x2 === null || y1 === null || y2 === null) {
                    if (linea) linea.style.display = 'none'; continue;
                }
                if (linea) {
                    linea.style.display = 'block';
                    const dx = x2 - x1, dy = y2 - y1;
                    linea.style.width = Math.sqrt(dx * dx + dy * dy) + 'px';
                    linea.style.left = x1 + 'px';
                    linea.style.top = y1 + 'px';
                    linea.style.transform = `rotate(${Math.atan2(dy, dx) * 180 / Math.PI}deg)`;
                }
            }

            // 2. Mover los circulitos de control a las posiciones de los puntos mapeados
            for (let i = 0; i < this.puntos.length; i++) {
                const p = this.puntos[i];
                const nodo = this.divsNodos[i];
                const x = window.chart.timeScale().timeToCoordinate(p.time);
                const y = window.candlestickSeries.priceToCoordinate(p.price);

                if (x === null || y === null) {
                    if (nodo) nodo.style.display = 'none';
                } else if (nodo) {
                    nodo.style.display = 'block';
                    nodo.style.left = x + 'px';
                    nodo.style.top = y + 'px';
                }
            }
        },

        convertirAFinal: function() {
            this.esFinalizada = true;
            this.divsLineas.forEach(l => l.oncontextmenu = (e) => window.mostrarMenuContextualRuta(e, this.id));
            this.divsNodos.forEach(n => n.oncontextmenu = (e) => window.mostrarMenuContextualRuta(e, this.id));
        },

        cambiarColor: function(nuevoColor) {
            this.color = nuevoColor;
            this.divsLineas.forEach(l => l.style.backgroundColor = nuevoColor);
            this.divsNodos.forEach(n => n.style.backgroundColor = nuevoColor);
        },

        destruir: function() {
            this.divsLineas.forEach(l => l.remove());
            this.divsNodos.forEach(n => n.remove());
            if (this.lineaTemporalDiv) this.lineaTemporalDiv.remove();
        }
    };

    objetoRuta.crearElementosGraficos();
    return objetoRuta;
};

// 8. MANIPULACIÓN Y ARRASTRE DE NODOS EN TIEMPO REAL
function iniciarArrastreRuta(e, puntoAfectado, callbackActualizar) {
    e.preventDefault(); e.stopPropagation();
    
    // Bloquear paneo y escalado nativo del chart mientras movemos la estructura
    window.chart.applyOptions({ handleScroll: false, handleScale: false });
    
    const onMouseMove = (event) => {
        const rect = document.getElementById('chart').getBoundingClientRect();
        const p = window.candlestickSeries.coordinateToPrice(event.clientY - rect.top);
        const t = window.chart.timeScale().coordinateToTime(event.clientX - rect.left);
        
        if (p !== null && t !== null) {
            // Modifica los datos del objeto punto en memoria
            puntoAfectado.price = p;
            puntoAfectado.time = t;
            // Forzar actualización total de líneas vinculadas
            callbackActualizar();
        }
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        // Desbloquear navegación del gráfico
        window.chart.applyOptions({ handleScroll: true, handleScale: true });
    };
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}