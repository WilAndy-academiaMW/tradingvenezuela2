console.log("🚀 [System] rectangulo.js optimizado con nodos laterales horizontales");

// 1. ESTADO GLOBAL FOR RECTANGLES
window.modoDibujoRectangulo = false;
window.puntosRectangulo = [];
window.rectangles = [];
window.rectanguloTemporal = null;

// Escuchador de movimiento para el rectángulo elástico temporal
document.addEventListener('mousemove', (e) => {
    if (!window.modoDibujoRectangulo || window.puntosRectangulo.length !== 1 || !window.rectanguloTemporal) return;

    const rect = document.getElementById('chart').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    const time = window.chart.timeScale().coordinateToTime(x);
    const price = window.candlestickSeries.coordinateToPrice(y);

    if (time && price) {
        window.rectanguloTemporal.actualizarTemporal({ time, price });
    }
});

// ============================================
// 2. MENÚ CONTEXTUAL MEJORADO
// ============================================
window.mostrarMenuContextualRectangulo = function(e, id) {
    e.preventDefault();
    e.stopPropagation();
    
    const menuExistente = document.getElementById('menu-contextual-rect');
    if (menuExistente) menuExistente.remove();
    const paletaExistente = document.getElementById('paleta-colores-rect');
    if (paletaExistente) paletaExistente.remove();
    
    const menu = document.createElement('div');
    menu.id = 'menu-contextual-rect';
    Object.assign(menu.style, {
        position: 'fixed',
        left: Math.min(e.clientX, window.innerWidth - 180) + 'px',
        top: Math.min(e.clientY, window.innerHeight - 150) + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '6px 0', zIndex: '10001', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    });
    
    const opciones = [
        { texto: '🎨 Cambiar color', color: '#ffd93d', action: (event) => window.cambiarColorRectangulo(event, id) },
        { texto: '📋 Duplicar', color: '#6bcb77', action: () => window.duplicarRectangulo(id) },
        { texto: '🗑️ Eliminar', color: '#ff6b6b', action: () => window.eliminarRectangulo(id) }
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
        const paleta = document.getElementById('paleta-colores-rect');
        if (!menu.contains(event.target) && (!paleta || !paleta.contains(event.target))) {
            menu.remove(); if (paleta) paleta.remove();
            document.removeEventListener('click', cerrarMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenu), 10);
};

// 3. ACTIVAR / DESACTIVAR MODO
window.activarModoRectangulo = function() {
    window.modoDibujoRectangulo = true;
    window.modoDibujo = false; window.modoDibujoHorizontal = false;
    window.puntosRectangulo = [];
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'crosshair';
};

window.desactivarModoRectangulo = function() {
    window.modoDibujoRectangulo = false;
    window.puntosRectangulo = [];
    if (window.rectanguloTemporal) {
        if (window.rectanguloTemporal.div) window.rectanguloTemporal.div.remove();
        window.rectanguloTemporal = null;
    }
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'default';
};

// 4. ELIMINAR
window.eliminarRectangulo = function(id) {
    const index = window.rectangles.findIndex(r => r.id === id);
    if (index !== -1) {
        const r = window.rectangles[index];
        if (r.div) r.div.remove();
        if (r.nodo1) r.nodo1.remove();
        if (r.nodo2) r.nodo2.remove();
        if (r.nodoLat1) r.nodoLat1.remove();
        if (r.nodoLat2) r.nodoLat2.remove();
        window.rectangles.splice(index, 1);
    }
};

// 5. CAMBIAR COLOR
window.cambiarColorRectangulo = function(e, id) {
    const rect = window.rectangles.find(r => r.id === id);
    if (!rect) return;
    
    const paletaExistente = document.getElementById('paleta-colores-rect');
    if (paletaExistente) paletaExistente.remove();
    
    const paleta = document.createElement('div');
    paleta.id = 'paleta-colores-rect';
    Object.assign(paleta.style, {
        position: 'fixed', left: (e.clientX + 20) + 'px', top: e.clientY + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '10px', zIndex: '10002', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });
    
    const colores = ['rgba(38, 166, 154, 0.25)', 'rgba(239, 83, 80, 0.25)', 'rgba(255, 215, 0, 0.25)', 'rgba(168, 85, 247, 0.25)'];
    const bordes = ['#26a69a', '#ef5350', '#FFD700', '#a855f7'];
    
    colores.forEach((color, idx) => {
        const btn = document.createElement('div');
        Object.assign(btn.style, {
            width: '28px', height: '28px', backgroundColor: color, border: `2px solid ${bordes[idx]}`, borderRadius: '4px', cursor: 'pointer'
        });
        btn.onclick = (evt) => {
            evt.stopPropagation();
            rect.colorBg = color;
            rect.colorBorda = bordes[idx];
            rect.div.style.backgroundColor = color;
            rect.div.style.borderColor = bordes[idx];
            [rect.nodo1, rect.nodo2, rect.nodoLat1, rect.nodoLat2].forEach(n => {
                if(n) n.style.backgroundColor = bordes[idx];
            });
            paleta.remove();
            const menu = document.getElementById('menu-contextual-rect');
            if (menu) menu.remove();
        };
        paleta.appendChild(btn);
    });
    document.body.appendChild(paleta);
};

// 6. DUPLICAR
window.duplicarRectangulo = function(id) {
    const r = window.rectangles.find(rect => rect.id === id);
    if (!r) return;
    
    const desfasePrecio = r.p1.price * 0.01;
    const p1 = { time: r.p1.time, price: r.p1.price + desfasePrecio };
    const p2 = { time: r.p2.time, price: r.p2.price + desfasePrecio };
    
    const nuevoRect = window.crearRectanguloDiv(p1, p2, false, r.colorBg, r.colorBorda);
    window.rectangles.push(nuevoRect);
};

// 7. CREAR RECTÁNGULO EN EL DOM
window.crearRectanguloDiv = function(p1, p2, esTemporal = false, bgBase = 'rgba(38, 166, 154, 0.2)', borderBase = '#26a69a') {
    const layer = document.getElementById('drawing-layer');
    if (!layer) return null;

    const rectDiv = document.createElement('div');
    const id = Date.now() + Math.random();

    Object.assign(rectDiv.style, {
        position: 'absolute', backgroundColor: bgBase, border: `1px solid ${borderBase}`,
        pointerEvents: esTemporal ? 'none' : 'auto', zIndex: '98', cursor: 'move'
    });
    layer.appendChild(rectDiv);

    let nodo1, nodo2, nodoLat1, nodoLat2;
    if (!esTemporal) {
        // Nodos diagonales (Esquinas)
        nodo1 = document.createElement('div');
        nodo2 = document.createElement('div');
        
        // Nodos laterales (Solo estirar horizontalmente)
        nodoLat1 = document.createElement('div');
        nodoLat2 = document.createElement('div');

        // Configuración de estilos para esquinas
        [nodo1, nodo2].forEach(nodo => {
            Object.assign(nodo.style, {
                width: '10px', height: '10px', backgroundColor: borderBase, borderRadius: '2px',
                position: 'absolute', cursor: 'nwse-resize', zIndex: '101', transform: 'translate(-50%, -50%)', border: '1px solid #fff'
            });
            layer.appendChild(nodo);
        });

        // Configuración de estilos para laterales (Cambia el cursor a "ew-resize")
        [nodoLat1, nodoLat2].forEach(nodo => {
            Object.assign(nodo.style, {
                width: '10px', height: '10px', backgroundColor: borderBase, borderRadius: '50%',
                position: 'absolute', cursor: 'ew-resize', zIndex: '101', transform: 'translate(-50%, -50%)', border: '1px solid #fff'
            });
            layer.appendChild(nodo);
        });

        // Eventos para esquinas (Afectan precio y tiempo)
        nodo1.onmousedown = (e) => iniciarArrastreRect(e, p1, 'AMBOS', actualizar);
        nodo2.onmousedown = (e) => iniciarArrastreRect(e, p2, 'AMBOS', actualizar);
        
        // Eventos para laterales (Solo cambian el tiempo / horizontal)
        nodoLat1.onmousedown = (e) => iniciarArrastreRect(e, p1, 'TIEMPO', actualizar);
        nodoLat2.onmousedown = (e) => iniciarArrastreRect(e, p2, 'TIEMPO', actualizar);
        
        // Mover el rectángulo completo arrastrando su fondo
        rectDiv.onmousedown = (e) => {
            if (e.button !== 0) return;
            e.preventDefault(); e.stopPropagation();
            window.chart.applyOptions({ handleScroll: false, handleScale: false });
            
            const startX = e.clientX, startY = e.clientY;
            const initP1 = { ...p1 }, initP2 = { ...p2 };
            
            const onMouseMove = (moveEvent) => {
                const x1Coord = window.chart.timeScale().timeToCoordinate(initP1.time) + (moveEvent.clientX - startX);
                const x2Coord = window.chart.timeScale().timeToCoordinate(initP2.time) + (moveEvent.clientX - startX);
                const y1Coord = window.candlestickSeries.priceToCoordinate(initP1.price) + (moveEvent.clientY - startY);
                const y2Coord = window.candlestickSeries.priceToCoordinate(initP2.price) + (moveEvent.clientY - startY);
                
                p1.time = window.chart.timeScale().coordinateToTime(x1Coord) || p1.time;
                p2.time = window.chart.timeScale().coordinateToTime(x2Coord) || p2.time;
                p1.price = window.candlestickSeries.coordinateToPrice(y1Coord) || p1.price;
                p2.price = window.candlestickSeries.coordinateToPrice(y2Coord) || p2.price;
                actualizar();
            };
            
            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                window.chart.applyOptions({ handleScroll: true, handleScale: true });
            };
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        [nodo1, nodo2, nodoLat1, nodoLat2, rectDiv].forEach(el => el.oncontextmenu = (e) => window.mostrarMenuContextualRectangulo(e, id));
    }

    function actualizar() {
        if (!window.candlestickSeries || !window.chart) return;
        const x1 = window.chart.timeScale().timeToCoordinate(p1.time);
        const y1 = window.candlestickSeries.priceToCoordinate(p1.price);
        const x2 = window.chart.timeScale().timeToCoordinate(p2.time);
        const y2 = window.candlestickSeries.priceToCoordinate(p2.price);

        if (x1 === null || x2 === null || y1 === null || y2 === null) {
            rectDiv.style.display = 'none';
            [nodo1, nodo2, nodoLat1, nodoLat2].forEach(n => { if(n) n.style.display = 'none'; });
            return;
        }

        rectDiv.style.display = 'block';
        [nodo1, nodo2, nodoLat1, nodoLat2].forEach(n => { if(n) n.style.display = 'block'; });

        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        Object.assign(rectDiv.style, {
            left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px'
        });

        // Posicionar esquinas
        if (nodo1) {
            nodo1.style.left = x1 + 'px'; nodo1.style.top = y1 + 'px';
            nodo2.style.left = x2 + 'px'; nodo2.style.top = y2 + 'px';
            
            // Posicionar laterales intermedios (Centro vertical, en los bordes izquierdo y derecho)
            const centroY = top + (height / 2);
            nodoLat1.style.left = x1 + 'px'; nodoLat1.style.top = centroY + 'px';
            nodoLat2.style.left = x2 + 'px'; nodoLat2.style.top = centroY + 'px';
        }
    }

    function actualizarTemporal(nuevoP2) { p2 = nuevoP2; actualizar(); }

    actualizar();
    return { div: rectDiv, nodo1, nodo2, nodoLat1, nodoLat2, actualizar, actualizarTemporal, p1, p2, id, colorBg: bgBase, colorBorda: borderBase };
};

// 8. ARRASTRE CONFIGURABLE (AMBOS EJES O SOLO HORIZONTAL)
function iniciarArrastreRect(e, puntoAfectado, modo, callbackActualizar) {
    e.preventDefault(); e.stopPropagation();
    window.chart.applyOptions({ handleScroll: false, handleScale: false });
    
    const onMouseMove = (event) => {
        const rect = document.getElementById('chart').getBoundingClientRect();
        
        // Si el modo es 'AMBOS' cambia precio; si es 'TIEMPO' mantiene el precio fijo
        if (modo === 'AMBOS') {
            const p = window.candlestickSeries.coordinateToPrice(event.clientY - rect.top);
            if (p !== null) puntoAfectado.price = p;
        }
        
        const t = window.chart.timeScale().coordinateToTime(event.clientX - rect.left);
        if (t !== null) puntoAfectado.time = t;
        
        callbackActualizar();
    };
    
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        window.chart.applyOptions({ handleScroll: true, handleScale: true });
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}