console.log("🚀 [System] horizontal.js cargado");

// 1. ESTADO GLOBAL FOR HORIZONTAL LINES
window.modoDibujoHorizontal = false;
window.horizontalLines = [];

// ============================================
// 2. MENÚ CONTEXTUAL MEJORADO
// ============================================
window.mostrarMenuContextualHorizontal = function(e, id) {
    e.preventDefault();
    e.stopPropagation();

    // Eliminar menús anteriores
    const menuExistente = document.getElementById('menu-contextual-horizontal');
    if (menuExistente) menuExistente.remove();
    const paletaExistente = document.getElementById('paleta-colores-horizontal');
    if (paletaExistente) paletaExistente.remove();

    const menu = document.createElement('div');
    menu.id = 'menu-contextual-horizontal';
    Object.assign(menu.style, {
        position: 'fixed',
        left: Math.min(e.clientX, window.innerWidth - 180) + 'px',
        top: Math.min(e.clientY, window.innerHeight - 150) + 'px',
        backgroundColor: '#1c2030',
        border: '1px solid #3c4257',
        borderRadius: '8px',
        padding: '6px 0',
        zIndex: '10001',
        minWidth: '160px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    });

    const opciones = [
        { texto: '🎨 Cambiar color', color: '#ffd93d', action: (event) => window.cambiarColorHorizontal(event, id) },
        { texto: '📋 Duplicar', color: '#6bcb77', action: () => window.duplicarHorizontal(id) },
        { texto: '🗑️ Eliminar', color: '#ff6b6b', action: () => window.eliminarHorizontal(id) }
    ];

    opciones.forEach(op => {
        const item = document.createElement('div');
        item.textContent = op.texto;
        Object.assign(item.style, {
            padding: '10px 16px',
            color: '#d1d4dc',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: 'sans-serif',
            transition: 'background 0.2s, color 0.2s'
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
        const paleta = document.getElementById('paleta-colores-horizontal');
        if (!menu.contains(event.target) && (!paleta || !paleta.contains(event.target))) {
            menu.remove();
            if (paleta) paleta.remove();
            document.removeEventListener('click', cerrarMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenu), 10);
};

// 3. ACTIVAR/DESACTIVAR MODO
window.activarModoHorizontal = function() {
    window.modoDibujoHorizontal = true;
    window.modoDibujo = false; // Desactiva la línea de tendencia por si acaso
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'crosshair';
};

window.desactivarModoHorizontal = function() {
    window.modoDibujoHorizontal = false;
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'default';
};

// 4. ELIMINAR LÍNEA
// 4. ELIMINAR LÍNEA INDIVIDUAL
window.eliminarHorizontal = function(id) {
    const index = window.horizontalLines.findIndex(l => l.id === id);
    if (index !== -1) {
        const linea = window.horizontalLines[index];
        linea.eliminada = true; // 1. Marcamos como eliminada para matar su bucle de actualización
        if (linea.div) linea.div.remove(); // 2. Quitamos del DOM
        if (linea.nodo) linea.nodo.remove();
        window.horizontalLines.splice(index, 1); // 3. Sacamos del array
    }
};



// 5. CAMBIAR COLOR
window.cambiarColorHorizontal = function(e, id) {
    const linea = window.horizontalLines.find(l => l.id === id);
    if (!linea) return;

    const paletaExistente = document.getElementById('paleta-colores-horizontal');
    if (paletaExistente) paletaExistente.remove();

    const paleta = document.createElement('div');
    paleta.id = 'paleta-colores-horizontal';
    Object.assign(paleta.style, {
        position: 'fixed',
        left: (e.clientX + 20) + 'px',
        top: e.clientY + 'px',
        backgroundColor: '#1c2030',
        border: '1px solid #3c4257',
        borderRadius: '8px',
        padding: '10px',
        zIndex: '10002',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });

    const colores = ['#38bdf8', '#FFD700', '#FF6B6B', '#4ECDC4', '#26a69a', '#ef5350', '#96CEB4', '#a855f7'];

    colores.forEach(color => {
        const btn = document.createElement('div');
        Object.assign(btn.style, {
            width: '28px', height: '28px', backgroundColor: color, borderRadius: '4px', cursor: 'pointer', transition: 'transform 0.1s'
        });
        btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = (evt) => {
            evt.stopPropagation();
            linea.color = color;
            linea.div.style.backgroundColor = color;
            if (linea.nodo) { linea.nodo.style.backgroundColor = color; }
            paleta.remove();
            const menu = document.getElementById('menu-contextual-horizontal');
            if (menu) menu.remove();
        };
        paleta.appendChild(btn);
    });

    document.body.appendChild(paleta);
};

// 6. DUPLICAR LÍNEA
window.duplicarHorizontal = function(id) {
    const linea = window.horizontalLines.find(l => l.id === id);
    if (!linea) return;

    // Un pequeño desfase del 0.4% en precio hacia arriba
    const desfasePrecio = linea.price * 0.004;

    const nuevaLinea = window.crearLineaHorizontalDiv(linea.price + desfasePrecio, linea.color || '#38bdf8');
    window.horizontalLines.push(nuevaLinea);
};

// 7. CREAR LÍNEA HORIZONTAL EN EL DOM
// 7. CREAR LÍNEA HORIZONTAL EN EL DOM
window.crearLineaHorizontalDiv = function(precioInicial, colorBase = '#38bdf8') {
    const layer = document.getElementById('drawing-layer');
    if (!layer) return null;

    const lineaDiv = document.createElement('div');
    const nodo = document.createElement('div');
    const id = Date.now() + Math.random();

    // Contenedor / Datos de la línea
    // 🔽 Agregamos eliminada: false al estado inicial
    const datosLinea = { id, price: precioInicial, color: colorBase, div: lineaDiv, nodo: nodo, eliminada: false };

    // Estilo de la línea (Ancho 100% infinito en horizontal)
    Object.assign(lineaDiv.style, {
        position: 'absolute', backgroundColor: colorBase, height: '2px', width: '100%',
        left: '0', pointerEvents: 'auto', zIndex: '99', cursor: 'row-resize'
    });

    // Estilo del Nodo de Arrastre
    Object.assign(nodo.style, {
        width: '12px', height: '12px', backgroundColor: colorBase, borderRadius: '50%',
        position: 'absolute', left: '50px', cursor: 'row-resize', zIndex: '101',
        transform: 'translate(-50%, -50%)', border: '1px solid #ffffff', pointerEvents: 'auto'
    });

    layer.appendChild(lineaDiv);
    layer.appendChild(nodo);

    // Eventos de arrastre
    lineaDiv.onmousedown = (e) => iniciarArrastreHorizontal(e, datosLinea, actualizar);
    nodo.onmousedown = (e) => iniciarArrastreHorizontal(e, datosLinea, actualizar);

    // Eventos de click derecho
    [lineaDiv, nodo].forEach(el => {
        el.oncontextmenu = (e) => window.mostrarMenuContextualHorizontal(e, id);
    });

    function actualizar() {
        // 🔽 EL SEGURO: Si fue eliminada, frena el redibujado y no permitas que reviva
        if (datosLinea.eliminada) return;

        if (!window.candlestickSeries || !window.chart) return;

        const y = window.candlestickSeries.priceToCoordinate(datosLinea.price);

        if (y === null) {
            lineaDiv.style.display = 'none';
            nodo.style.display = 'none';
            return;
        }

        lineaDiv.style.display = 'block';
        nodo.style.display = 'block';

        lineaDiv.style.top = y + 'px';
        nodo.style.top = y + 'px';
    }

    datosLinea.actualizar = actualizar;
    actualizar();
    return datosLinea;
};

// 8. ARRASTRE EXCLUSIVAMENTE VERTICAL (Y)
function iniciarArrastreHorizontal(e, datosLinea, callbackActualizar) {
    e.preventDefault();
    e.stopPropagation();

    window.chart.applyOptions({ handleScroll: false, handleScale: false });

    const onMouseMove = (event) => {
        const rect = document.getElementById('chart').getBoundingClientRect();
        const y = event.clientY - rect.top;

        const p = window.candlestickSeries.coordinateToPrice(y);

        if (p !== null) {
            datosLinea.price = p;
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

// 9. LIMPIAR TODAS LAS LÍNEAS HORIZONTALES (Para usar en limpiarTodo)
window.limpiarHorizontales = function() {
    if (window.horizontalLines && window.horizontalLines.length > 0) {
        window.horizontalLines.forEach(linea => {
            linea.eliminada = true; // Rompe el lazo de actualización
            if (linea.div) linea.div.remove();
            if (linea.nodo) linea.nodo.remove();
        });
        window.horizontalLines.length = 0; // Vacía por completo la lista
    }

    // Por si acaso quedó el menú contextual abierto en la pantalla
    const menu = document.getElementById('menu-contextual-horizontal');
    if (menu) menu.remove();
    const paleta = document.getElementById('paleta-colores-horizontal');
    if (paleta) paleta.remove();
};