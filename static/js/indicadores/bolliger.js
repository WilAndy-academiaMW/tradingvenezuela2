/**
 * INDICADOR: BANDAS DE BOLLINGER (BB) - CORREGIDO PARA v4
 */

let bbUpperSeries = null;
let bbMiddleSeries = null;
let bbLowerSeries = null;

window.toggleBB = function() {
    // 1. Toggle OFF: Si ya existen, las quitamos
    if (bbUpperSeries) {
        window.desactivarBB();
        return;
    }

    // 2. Validar datos globales
    const data = window.seriesData;
    if (!data || data.length < 20) {
        console.error("⚠️ No hay suficientes datos (mínimo 20 necesarios para Bollinger).");
        return;
    }

    // 3. Opciones comunes para las líneas del indicador
    const lineOptions = {
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
    };

    // 4. Crear las series en el gráfico principal (v4: addLineSeries)
    bbUpperSeries = window.chart.addLineSeries({ 
        ...lineOptions, color: '#2196f3', lineWidth: 1 
    });
    bbMiddleSeries = window.chart.addLineSeries({ 
        ...lineOptions, color: '#ff9800', lineWidth: 1, lineStyle: 2 
    });
    bbLowerSeries = window.chart.addLineSeries({ 
        ...lineOptions, color: '#2196f3', lineWidth: 1 
    });

    // 5. Cálculo matemático de las Bandas
    const period = 20;
    const stdDevMultiplier = 2;
    const upperData = [];
    const middleData = [];
    const lowerData = [];

    for (let i = period - 1; i < data.length; i++) {
        const slice = data.slice(i - period + 1, i + 1);
        const closes = slice.map(d => d.close);
        const sma = closes.reduce((a, b) => a + b, 0) / period;
        const variance = closes.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
        const stdDev = Math.sqrt(variance);

        const time = data[i].time;
        upperData.push({ time, value: sma + (stdDevMultiplier * stdDev) });
        middleData.push({ time, value: sma });
        lowerData.push({ time, value: sma - (stdDevMultiplier * stdDev) });
    }

    // 6. Cargar datos en las series
    bbUpperSeries.setData(upperData);
    bbMiddleSeries.setData(middleData);
    bbLowerSeries.setData(lowerData);
    
    actualizarBotonBB(true);
    console.log("✅ Bandas de Bollinger activadas.");
};

// Función global para limpiar o desactivar las Bandas
window.desactivarBB = function() {
    if (bbUpperSeries) {
        window.chart.removeSeries(bbUpperSeries);
        bbUpperSeries = null;
    }
    if (bbMiddleSeries) {
        window.chart.removeSeries(bbMiddleSeries);
        bbMiddleSeries = null;
    }
    if (bbLowerSeries) {
        window.chart.removeSeries(bbLowerSeries);
        bbLowerSeries = null;
    }
    actualizarBotonBB(false);
    console.log("🧹 Bandas de Bollinger removidas del gráfico.");
};

function actualizarBotonBB(activo) {
    const btn = document.getElementById('btnBB');
    if (!btn) return;
    btn.classList.toggle('bg-blue-600', activo);
    btn.classList.toggle('bg-gray-800', !activo);
}

// Exponer funciones globales por seguridad
window.toggleBB = window.toggleBB;
window.desactivarBB = window.desactivarBB;