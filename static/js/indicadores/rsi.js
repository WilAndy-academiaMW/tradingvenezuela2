/**
 * RSI - Estilo ADX/MACD (panel nativo con priceScaleId)
 * Corregido para Lightweight Charts v4
 */

window.rsiActivo = false;
window.rsiSeries = null;
window.rsiMaSeries = null;

window.toggleRSI = function(periodo = 14, periodoMA = 14) {
    if (window.rsiActivo) {
        window.desactivarRSI();
        return;
    }

    if (!window.seriesData || window.seriesData.length === 0) {
        console.warn('⚠️ No hay datos para calcular el RSI');
        return;
    }

    // 1. Configurar el panel inferior
    window.chart.applyOptions({
        priceScales: {
            'rsi-panel': {
                scaleMargins: { top: 0.8, bottom: 0 }, // 80% velas, 20% RSI
                visible: true,
                position: 'right',
            },
        },
    });

    // 2. Crear las series (v4)
    window.rsiSeries = window.chart.addLineSeries({
        color: '#a855f7',
        lineWidth: 2,
        priceScaleId: 'rsi-panel',
        title: 'RSI',
        priceLineVisible: false,
        lastValueVisible: false,
    });

    window.rsiMaSeries = window.chart.addLineSeries({
        color: '#ffd700',
        lineWidth: 1,
        priceScaleId: 'rsi-panel',
        title: 'MA',
        priceLineVisible: false,
        lastValueVisible: false,
    });

    // 3. Calcular y cargar
    const { rsi, ma } = calcularRSI(window.seriesData, periodo, periodoMA);

    if (rsi.length === 0) {
        console.warn('⚠️ No hay suficientes datos para el RSI');
        window.desactivarRSI();
        return;
    }

    window.rsiSeries.setData(rsi);
    window.rsiMaSeries.setData(ma);

    // 4. 🎯 Fijar el rango 0-100 para que 30/50/70 siempre caigan donde deben
    window.rsiSeries.applyOptions({
        autoscaleInfoProvider: () => ({
            priceRange: { minValue: 0, maxValue: 100 },
        }),
    });

    // 5. 🎯 Líneas horizontales de referencia (70, 50, 30)
    window.rsiSeries.createPriceLine({
        price: 70,
        color: '#f80d09',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '70',
    });

    window.rsiSeries.createPriceLine({
        price: 50,
        color: 'rgba(255,255,255,0.3)',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: false,
        title: '50',
    });

    window.rsiSeries.createPriceLine({
        price: 30,
        color: '#15ff00',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '30',
    });

    window.rsiActivo = true;
    console.log("✅ RSI activado (panel nativo con niveles 30/50/70).");
};

// Lógica matemática del RSI
function calcularRSI(data, periodo, periodoMA = 14) {
    let results = [];
    let gains = 0, losses = 0;
    const validData = data.filter(d => d.close !== undefined && d.close !== null);

    if (validData.length <= periodo) return { rsi: [], ma: [] };

    for (let i = 1; i < validData.length; i++) {
        let diff = validData[i].close - validData[i-1].close;
        let g = diff > 0 ? diff : 0;
        let l = diff < 0 ? -diff : 0;

        if (i <= periodo) {
            gains += g / periodo;
            losses += l / periodo;
            if (i === periodo) {
                let rs = losses === 0 ? 100 : gains / losses;
                results.push({ time: validData[i].time, value: 100 - (100 / (1 + rs)) });
            }
        } else {
            gains = (gains * (periodo - 1) + g) / periodo;
            losses = (losses * (periodo - 1) + l) / periodo;
            let rs = losses === 0 ? 100 : gains / losses;
            results.push({ time: validData[i].time, value: 100 - (100 / (1 + rs)) });
        }
    }

    let maData = [];
    for (let i = periodoMA - 1; i < results.length; i++) {
        let suma = 0;
        for (let j = 0; j < periodoMA; j++) {
            suma += results[i - j].value;
        }
        maData.push({ time: results[i].time, value: suma / periodoMA });
    }

    return { rsi: results, ma: maData };
}

window.desactivarRSI = function() {
    if (window.rsiSeries) { window.chart.removeSeries(window.rsiSeries); window.rsiSeries = null; }
    if (window.rsiMaSeries) { window.chart.removeSeries(window.rsiMaSeries); window.rsiMaSeries = null; }

    window.rsiActivo = false;
    console.log("🧹 RSI removido del gráfico.");
};