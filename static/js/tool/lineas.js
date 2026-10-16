console.log("🚀 [System] lineas.js optimizado con Líneas Nativas, Nodos y Persistencia SQLite");

// 1. ESTADO GLOBAL
window.modoDibujo = false;
window.puntosPendientes = [];
window.trendLines = window.trendLines || [];
window.lineaTemporal = null;

// Escuchador de movimiento para la línea temporal interactiva
document.addEventListener('mousemove', (e) => {
    if (window.modoDibujo !== 'LINE' || window.puntosPendientes.length !== 1 || !window.lineaTemporal) return;

    const rect = document.getElementById('chart').getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return;

    const time = window.chart.timeScale().coordinateToTime(x);
    const price = window.candlestickSeries.coordinateToPrice(y);

    if (time !== null && price !== null) {
        window.lineaTemporal.actualizarTemporal({ time, price });
    }
});

// ============================================
// 2. MENÚ CONTEXTUAL MEJORADO
// ============================================
window.mostrarMenuContextualLinea = function(e, id) {
    e.preventDefault();
    e.stopPropagation();

    const menuExistente = document.getElementById('menu-contextual-linea');
    if (menuExistente) menuExistente.remove();
    const paletaExistente = document.getElementById('paleta-colores-linea');
    if (paletaExistente) paletaExistente.remove();

    const menu = document.createElement('div');
    menu.id = 'menu-contextual-linea';
    Object.assign(menu.style, {
        position: 'fixed',
        left: Math.min(e.clientX, window.innerWidth - 180) + 'px',
        top: Math.min(e.clientY, window.innerHeight - 150) + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '6px 0', zIndex: '10001', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    });

    const opciones = [
        { texto: '🎨 Cambiar color', color: '#ffd93d', action: (event) => window.cambiarColorLinea(event, id) },
        { texto: '📋 Duplicar', color: '#6bcb77', action: () => window.duplicarLinea(id) },
        { texto: '🗑️ Eliminar', color: '#ff6b6b', action: () => window.eliminarLinea(id) }
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
        const paleta = document.getElementById('paleta-colores-linea');
        if (!menu.contains(event.target) && (!paleta || !paleta.contains(event.target))) {
            menu.remove(); if (paleta) paleta.remove();
            document.removeEventListener('click', cerrarMenu);
        }
    };
    setTimeout(() => document.addEventListener('click', cerrarMenu), 10);
};

// 3. ACTIVAR/DESACTIVAR MODO LÍNEA
window.activarModoLinea = function() {
    window.modoDibujo = 'LINE';
    window.puntosPendientes = [];
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'crosshair';
};

window.desactivarModoDibujo = function() {
    window.modoDibujo = false;
    window.puntosPendientes = [];
    if (window.lineaTemporal) {
        if (window.lineaTemporal.serie) {
            try { window.chart.removeSeries(window.lineaTemporal.serie); } catch(e) {}
        }
        if (window.lineaTemporal.nodo1) window.lineaTemporal.nodo1.remove();
        if (window.lineaTemporal.nodo2) window.lineaTemporal.nodo2.remove();
        window.lineaTemporal = null;
    }
    const chartContainer = document.getElementById('chart');
    if (chartContainer) chartContainer.style.cursor = 'default';
};

// 4. ELIMINAR LÍNEA INDIVIDUAL
window.eliminarLinea = function(id) {
    const index = window.trendLines.findIndex(l => l.id === id);
    if (index !== -1) {
        const linea = window.trendLines[index];
        linea.eliminada = true;
        if (linea.serie) {
            try { window.chart.removeSeries(linea.serie); } catch(e) {}
        }
        if (linea.nodo1) linea.nodo1.remove();
        if (linea.nodo2) linea.nodo2.remove();
        window.trendLines.splice(index, 1);
        // Aquí podrías agregar un endpoint para eliminar de la BD si lo deseas
    }
};

// 5. CAMBIAR COLOR
window.cambiarColorLinea = function(e, id) {
    const linea = window.trendLines.find(l => l.id === id);
    if (!linea) return;

    const paletaExistente = document.getElementById('paleta-colores-linea');
    if (paletaExistente) paletaExistente.remove();

    const paleta = document.createElement('div');
    paleta.id = 'paleta-colores-linea';
    Object.assign(paleta.style, {
        position: 'fixed', left: (e.clientX + 20) + 'px', top: e.clientY + 'px',
        backgroundColor: '#1c2030', border: '1px solid #3c4257', borderRadius: '8px',
        padding: '10px', zIndex: '10002', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    });

    const colores = ['#FFD700', '#FF6B6B', '#4ECDC4', '#26a69a', '#ef5350', '#96CEB4', '#38bdf8', '#a855f7'];

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
            if (linea.serie) {
                linea.serie.applyOptions({ color: color });
            }
            if (linea.nodo1) { 
                linea.nodo1.style.backgroundColor = color; 
                linea.nodo2.style.backgroundColor = color; 
            }
            paleta.remove();
            const menu = document.getElementById('menu-contextual-linea');
            if (menu) menu.remove();
        };
        paleta.appendChild(btn);
    });
    document.body.appendChild(paleta);
};

// 6. DUPLICAR LÍNEA
window.duplicarLinea = function(id) {
    const linea = window.trendLines.find(l => l.id === id);
    if (!linea) return;

    const desfasePrecio = linea.p1.price * 0.005;
    const p1 = { time: linea.p1.time, price: linea.p1.price + desfasePrecio };
    const p2 = { time: linea.p2.time, price: linea.p2.price + desfasePrecio };

    const nuevaLinea = window.crearLineaDiv(p1, p2, false, linea.color || '#FFD700');
    window.trendLines.push(nuevaLinea);
    guardarLineaBD(p1, p2, 'trendline', linea.color || '#FFD700');
};


// 7. CREAR LÍNEA NATIVA Y NODOS EN EL DRAWING-LAYER
// 🔧 Normaliza el time al mismo formato que usan las velas según la temporalidad
function normalizarTiempo(time, tf) {
    if (tf === '1d' || tf === '1w') {
        if (typeof time === 'string') return time;
        const d = new Date(time * 1000);
        return d.toISOString().split('T')[0];
    } else {
        if (typeof time === 'string') {
            return Math.floor(new Date(time).getTime() / 1000);
        }
        return time;
    }
}

window.crearLineaDiv = function(p1, p2, esTemporal = false, colorBase = '#FFD700', idExistente = null) {
    const layer = document.getElementById('drawing-layer');
    if (!layer) return null;

    const tf = window.temporalidadActual;

    // 🔧 Normalizamos p1.time y p2.time al formato de las velas
    p1.time = normalizarTiempo(p1.time, tf);
    p2.time = normalizarTiempo(p2.time, tf);

    const id = idExistente || (Date.now() + Math.random());

    const serieLinea = window.chart.addLineSeries({
        color: colorBase,
        lineWidth: 3,
        lineStyle: esTemporal ? 2 : 0,
        lastValueVisible: false,
        priceLineVisible: false
    });

    const datosLinea = { 
        serie: serieLinea, 
        nodo1: null, 
        nodo2: null, 
        p1, 
        p2, 
        id, 
        color: colorBase, 
        eliminada: false 
    };

    if (!esTemporal) {
        datosLinea.nodo1 = document.createElement('div');
        datosLinea.nodo2 = document.createElement('div');

        [datosLinea.nodo1, datosLinea.nodo2].forEach(nodo => {
            Object.assign(nodo.style, {
                width: '12px', height: '12px', backgroundColor: colorBase, borderRadius: '50%',
                position: 'absolute', cursor: 'pointer', zIndex: '101', transform: 'translate(-50%, -50%)',
                border: '1px solid #ffffff', pointerEvents: 'auto'
            });
            layer.appendChild(nodo);
        });

        datosLinea.nodo1.onmousedown = (e) => iniciarArrastre(e, p1, actualizar, id);
        datosLinea.nodo2.onmousedown = (e) => iniciarArrastre(e, p2, actualizar, id);

        [datosLinea.nodo1, datosLinea.nodo2].forEach(el => {
            el.oncontextmenu = (e) => window.mostrarMenuContextualLinea(e, id);
        });
    }

    function actualizar() {
        if (datosLinea.eliminada) return;
        if (!window.candlestickSeries || !window.chart) return;

        const data = [
            { time: p1.time, value: p1.price },
            { time: p2.time, value: p2.price }
        ].sort((a, b) => {
            const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
            const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
            return t1 - t2;
        });
        serieLinea.setData(data);

        if (datosLinea.nodo1) {
            const x1 = window.chart.timeScale().timeToCoordinate(p1.time);
            const y1 = window.candlestickSeries.priceToCoordinate(p1.price);
            const x2 = window.chart.timeScale().timeToCoordinate(p2.time);
            const y2 = window.candlestickSeries.priceToCoordinate(p2.price);

            if (x1 === null || x2 === null || y1 === null || y2 === null) {
                datosLinea.nodo1.style.display = 'none';
                datosLinea.nodo2.style.display = 'none';
                return;
            }

            datosLinea.nodo1.style.display = 'block';
            datosLinea.nodo2.style.display = 'block';

            datosLinea.nodo1.style.left = x1 + 'px';
            datosLinea.nodo1.style.top = y1 + 'px';
            datosLinea.nodo2.style.left = x2 + 'px';
            datosLinea.nodo2.style.top = y2 + 'px';
        }
    }

    function actualizarTemporal(nuevoP2) {
        nuevoP2.time = normalizarTiempo(nuevoP2.time, tf);
        p2 = nuevoP2;
        actualizar();
    }

    datosLinea.actualizar = actualizar;
    datosLinea.actualizarTemporal = actualizarTemporal;

    actualizar();
    return datosLinea;
};

// 8. MANIPULACIÓN (ARRASTRE DE NODOS Y REESCRITURA EN BD AL SOLTAR)
function iniciarArrastre(e, puntoAfectado, callbackActualizar, idLinea) {
    e.preventDefault(); e.stopPropagation();
    window.chart.applyOptions({ handleScroll: false, handleScale: false });

    const onMouseMove = (event) => {
        const rect = document.getElementById('chart').getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const p = window.candlestickSeries.coordinateToPrice(y);
        const t = window.chart.timeScale().coordinateToTime(x);

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

        // 🚀 Al soltar el nodo, buscamos la línea y guardamos/actualizamos sus coordenadas en SQLite
        const lineaActual = window.trendLines.find(l => l.id === idLinea);
       
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}


// 9. LIMPIAR TODAS LAS LÍNEAS DE TENDENCIA
// 9. LIMPIAR TODAS LAS LÍNEAS DE TENDENCIA
window.limpiarLineasTendencia = function() {
    if (window.trendLines && Array.isArray(window.trendLines)) {
        window.trendLines.forEach(linea => {
            if (!linea) return;
            linea.eliminada = true;
            if (linea.serie) {
                try { window.chart.removeSeries(linea.serie); } catch(e) {}
            }
            if (linea.nodo1 && typeof linea.nodo1.remove === 'function') linea.nodo1.remove();
            if (linea.nodo2 && typeof linea.nodo2.remove === 'function') linea.nodo2.remove();
        });
        window.trendLines = []; // Limpiamos el array de forma segura
    }

    const menu = document.getElementById('menu-contextual-linea');
    if (menu) menu.remove();
    const paleta = document.getElementById('paleta-colores-linea');
    if (paleta) paleta.remove();
};

// ==========================================
// 10. COMUNICACIÓN CON SQLITE (BACKEND)
// ==========================================
/*
function guardarLineaBD(p1, p2, tipo = 'trendline', color = '#FFD700', idLinea = null) {
    const datos = {
        id: idLinea, // Enviamos el ID si ya existe para que la BD lo actualice
        simbolo: window.monedaActual,
        temporalidad: window.temporalidadActual,
        tipo: tipo,
        p1: p1,
        p2: p2,
        color: color
    };

    fetch('/api/guardar_linea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    })
    .then(response => response.json())
    .then(result => {
        console.log("✅ Línea guardada/actualizada en SQLite:", result);
    })
    .catch(err => console.error("❌ Error al guardar/actualizar línea:", err));
}

window.cargarLineasBD = function() {
    const simbolo = window.monedaActual;
    const tf = window.temporalidadActual;

    if (typeof window.limpiarLineasTendencia === 'function') {
        window.limpiarLineasTendencia();
    }

    fetch(`/api/obtener_lineas?simbolo=${encodeURIComponent(simbolo)}&temporalidad=${tf}`)
        .then(response => response.json())
        .then(data => {
            if (!Array.isArray(data)) return;

            data.forEach(item => {
                let t1 = item.p1_time;
                let t2 = item.p2_time;
                
                if (tf !== '1d' && tf !== '1w' && !isNaN(t1)) t1 = Number(t1);
                if (tf !== '1d' && tf !== '1w' && !isNaN(t2)) t2 = Number(t2);

                const p1 = { time: t1, price: item.p1_price };
                const p2 = { time: t2, price: item.p2_price };

                const lineaRestaurada = window.crearLineaDiv(p1, p2, false, item.color || '#FFD700');
                window.trendLines.push(lineaRestaurada);
            });

            console.log(`📥 ${data.length} líneas cargadas desde la BD para ${simbolo} (${tf})`);
        })
        .catch(err => console.error("❌ Error al cargar líneas desde la BD:", err));
};*/