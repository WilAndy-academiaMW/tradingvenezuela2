/**
 * INDICADOR: MEDIAS MÓVILES EXPONENCIALES (EMA 50 / 200) + SMA 20
 */

let ema50Series = null;
let ema200Series = null;
let sma20Series = null;

window.toggleEMA = function() {
    // 1. Toggle OFF: Si ya existen, las quitamos
    if (ema50Series) {
        window.desactivarEMA();
        return;
    }

    // 2. Validar datos globales
    const data = window.seriesData;
    if (!data || data.length < 200) {
        console.error("⚠️ Se necesitan al menos 200 velas para calcular la EMA 200.");
        return;
    }

    // 3. Crear las series (sobre el precio principal)
    ema50Series = window.chart.addLineSeries({
        color: '#00fbff', // Cyan
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'EMA 50',
    });

    ema200Series = window.chart.addLineSeries({
        color: '#ffeb3b', // Amarillo
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'EMA 200',
    });

    // ⚪ NUEVA: SMA 20 en blanco
    sma20Series = window.chart.addLineSeries({
        color: '#ffffff', // Blanco
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        title: 'SMA 20',
    });

    // 4. Función de cálculo EMA
    const calcularEMA = (periodo, datos) => {
        const k = 2 / (periodo + 1);
        let emaArray = [];
        let emaAyer = datos[0].close; // Semilla inicial

        datos.forEach((vela) => {
            const precioHoy = vela.close;
            const emaHoy = (precioHoy * k) + (emaAyer * (1 - k));
            emaArray.push({ time: vela.time, value: emaHoy });
            emaAyer = emaHoy;
        });
        return emaArray;
    };

    // 5. Función de cálculo SMA
    const calcularSMA = (periodo, datos) => {
        const out = [];
        for (let i = 0; i < datos.length; i++) {
            if (i < periodo - 1) continue;
            let suma = 0;
            for (let j = 0; j < periodo; j++) suma += datos[i - j].close;
            out.push({ time: datos[i].time, value: suma / periodo });
        }
        return out;
    };

    // 6. Cargar datos en las series
    ema50Series.setData(calcularEMA(50, data));
    ema200Series.setData(calcularEMA(200, data));
    sma20Series.setData(calcularSMA(20, data));

    actualizarBotonEMA(true);
    console.log("✅ Medias Móviles (EMA 50, EMA 200 y SMA 20) activadas.");
};

// Función global para limpiar o desactivar las medias
window.desactivarEMA = function() {
    if (ema50Series) {
        window.chart.removeSeries(ema50Series);
        ema50Series = null;
    }
    if (ema200Series) {
        window.chart.removeSeries(ema200Series);
        ema200Series = null;
    }
    if (sma20Series) {
        window.chart.removeSeries(sma20Series);
        sma20Series = null;
    }
    actualizarBotonEMA(false);
    console.log("🧹 Medias Móviles removidas del gráfico.");
};

function actualizarBotonEMA(activo) {
    const btn = document.getElementById('btnEMA');
    if (!btn) return;
    btn.classList.toggle('bg-cyan-600', activo);
    btn.classList.toggle('bg-gray-800', !activo);
}

// Exponer funciones globales por seguridad
window.toggleEMA = window.toggleEMA;
window.desactivarEMA = window.desactivarEMA;