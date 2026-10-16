let reglaToolActive = false;
let reglaPrimerPunto = null;
let reglaTemporal = null;
let isReglaDrawingFrame = false;
let ultimoClickRegla = 0;
const DOBLE_CLICK_MS = 350;

if (!window.reglasGuardadas) window.reglasGuardadas = [];

// --- ACTIVAR / DESACTIVAR ---
function toggleReglaTool() {
    reglaToolActive = !reglaToolActive;
    const btn = document.getElementById('btnRegla');

    if (reglaToolActive) {
        if (btn) btn.classList.replace('bg-gray-800', 'bg-purple-600');
        window.chart.applyOptions({ handleScroll: false, handleScale: false });
        console.log("📏 Regla Avanzada Activa");
    } else {
        desactivarReglaTool();
    }
}

function desactivarReglaTool() {
    reglaToolActive = false;
    reglaPrimerPunto = null;
    if (reglaTemporal) {
        window.chart.removeSeries(reglaTemporal);
        reglaTemporal = null;
    }
    const btn = document.getElementById('btnRegla');
    if (btn) btn.classList.replace('bg-purple-600', 'bg-gray-800');
    window.chart.applyOptions({ handleScroll: true, handleScale: true });
}

// --- DIBUJO EN TIEMPO REAL ---
window.chart.subscribeCrosshairMove(param => {
    if (!reglaToolActive || !reglaPrimerPunto || !reglaTemporal || !param.point || isReglaDrawingFrame) return;

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

// --- FIJAR MEDICIÓN CON CLICK + DOBLE CLICK PARA BORRAR ---
window.chart.subscribeClick(param => {
    if (!param.point) return;

    const ahora = Date.now();
    const esDobleClick = (ahora - ultimoClickRegla) < DOBLE_CLICK_MS;
    ultimoClickRegla = ahora;

    // Doble clic: borrar la última regla (o la que se está dibujando)
    if (esDobleClick) {
        if (reglaTemporal) {
            // Está dibujando: cancelar la actual
            try { window.chart.removeSeries(reglaTemporal); } catch (e) {}
            reglaTemporal = null;
            reglaPrimerPunto = null;
            console.log("🗑️ Regla en dibujo eliminada (doble clic)");
        } else if (window.reglasGuardadas && window.reglasGuardadas.length > 0) {
            // Borrar la última regla guardada
            const ultima = window.reglasGuardadas.pop();
            try { window.chart.removeSeries(ultima); } catch (e) {}
            console.log("🗑️ Última regla eliminada (doble clic)");
        }
        return;
    }

    // Un solo clic: comportamiento normal de la herramienta
    if (!reglaToolActive) return;

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
    } else {
        window.reglasGuardadas.push(reglaTemporal);
        reglaTemporal = null;
        reglaPrimerPunto = null;
        desactivarReglaTool();
    }
});

// --- LIMPIAR TODO (botón) ---
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

    if (reglaToolActive) desactivarReglaTool();

    console.log("✅ Reglas eliminadas");
}

window.limpiarRegla = limpiarRegla;