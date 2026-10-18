let reglaToolActive = false;
let reglaPrimerPunto = null;
let reglaTemporal = null;
let isReglaDrawingFrame = false;
let esperandoBorrarRegla = false; 

if (!window.reglasGuardadas) window.reglasGuardadas = [];

// --- ACTIVAR / DESACTIVAR ---
function toggleReglaTool() {
    reglaToolActive = !reglaToolActive;
    const btn = document.getElementById('btnRegla');

    if (reglaToolActive) {
        if (btn) btn.classList.replace('bg-gray-800', 'bg-purple-600');
        window.chart.applyOptions({ handleScroll: false, handleScale: false });
        esperandoBorrarRegla = false;
        console.log("📏 Regla Activa. Haz clic para empezar.");
    } else {
        desactivarReglaTool();
    }
}

function desactivarReglaTool() {
    reglaToolActive = false;
    reglaPrimerPunto = null;
    esperandoBorrarRegla = false;
    if (reglaTemporal) {
        window.chart.removeSeries(reglaTemporal);
        reglaTemporal = null;
    }
    const btn = document.getElementById('btnRegla');
    if (btn) btn.classList.replace('bg-purple-600', 'bg-gray-800');
    window.chart.applyOptions({ handleScroll: true, handleScale: true });
    console.log("🛑 Herramienta Regla desactivada.");
}

// --- DIBUJO EN TIEMPO REAL ---
window.chart.subscribeCrosshairMove(param => {
    if (esperandoBorrarRegla || !reglaToolActive || !reglaPrimerPunto || !reglaTemporal || !param.point || isReglaDrawingFrame) return;

    isReglaDrawingFrame = true;
    requestAnimationFrame(() => {
        if (!reglaPrimerPunto || !reglaTemporal) {
            isReglaDrawingFrame = false;
            return;
        }

        const precioActual = window.candlestickSeries.coordinateToPrice(param.point.y);
        const tiempoActual = param.time || obtenerTiempoReal(param);

        if (precioActual !== null && tiempoActual) {
            const precioInicio = reglaPrimerPunto.price;
            const diffPrecio = precioActual - precioInicio;
            const porcentaje = ((diffPrecio / precioInicio) * 100).toFixed(2);

            const logicaInicio = window.chart.timeScale().coordinateToLogical(window.chart.timeScale().timeToCoordinate(reglaPrimerPunto.time));
            const logicaActual = window.chart.timeScale().coordinateToLogical(param.point.x);
            const velas = Math.abs(Math.round(logicaActual - logicaInicio));

            const colorRelleno = diffPrecio >= 0 ? 'rgba(38, 166, 154, 0.3)' : 'rgba(239, 83, 80, 0.3)';
            const colorLinea = diffPrecio >= 0 ? 'rgba(38, 166, 154, 1)' : 'rgba(239, 83, 80, 1)';

            reglaTemporal.applyOptions({
                topFillColor1: colorRelleno,
                topFillColor2: colorRelleno,
                bottomFillColor1: colorRelleno,
                bottomFillColor2: colorRelleno,
                topLineColor: colorLinea,
                bottomLineColor: colorLinea,
                title: `%:${porcentaje} | Abs:${diffPrecio.toFixed(2)} | Tiempo:${velas} velas`
            });

            const data = [
                { time: reglaPrimerPunto.time, value: precioActual },
                { time: tiempoActual, value: precioActual }
            ].sort((a, b) => {
                const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time;
                const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time;
                return t1 - t2;
            });

            reglaTemporal.setData(data);
        }
        isReglaDrawingFrame = false;
    });
});

// --- LÓGICA DE CLICS ---
window.chart.subscribeClick(param => {
    if (!param.point) return;
    if (!reglaToolActive) return;

    if (esperandoBorrarRegla) {
        if (window.reglasGuardadas.length > 0) {
            const ultima = window.reglasGuardadas.pop();
            try { window.chart.removeSeries(ultima); } catch (e) {}
            console.log("🗑️ Regla borrada con un clic.");
        }
        
        // 👇 AQUÍ ESTÁ LA MAGIA: Al borrar, apagamos la herramienta y liberamos el scroll 👇
        desactivarReglaTool(); 
        return; 
    }

    const precioClick = window.candlestickSeries.coordinateToPrice(param.point.y);
    const tiempoClick = param.time || obtenerTiempoReal(param);

    if (precioClick === null || !tiempoClick) return;

    if (!reglaPrimerPunto) {
        reglaPrimerPunto = { time: tiempoClick, price: precioClick };

        reglaTemporal = window.chart.addBaselineSeries({
            baseValue: { type: 'price', price: reglaPrimerPunto.price },
            lineWidth: 2,
            lineStyle: 0,
            lastValueVisible: false,
            priceLineVisible: false,
            crosshairMarkerVisible: false,
        });
        console.log("📍 Iniciando regla...");
    } else {
        window.reglasGuardadas.push(reglaTemporal);
        reglaTemporal = null;
        reglaPrimerPunto = null;
        
        esperandoBorrarRegla = true; 
        console.log("✅ Regla fijada. Haz OTRO clic para borrarla (se apagará la herramienta).");
    }
});

// --- LIMPIAR TODO (Botón de la escoba) ---
function limpiarRegla() {
    console.log("🧹 Limpiando reglas...");

    if (window.reglasGuardadas && window.reglasGuardadas.length > 0) {
        window.reglasGuardadas.forEach(serie => {
            try { window.chart.removeSeries(serie); } catch (e) {}
        });
        window.reglasGuardadas = [];
    }

    if (reglaTemporal) {
        try { window.chart.removeSeries(reglaTemporal); } catch (e) {}
        reglaTemporal = null;
    }

    reglaPrimerPunto = null;
    esperandoBorrarRegla = false;
    desactivarReglaTool();

    console.log("✅ Todo limpio.");
}

window.limpiarRegla = limpiarRegla;