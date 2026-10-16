/**
 * MACD - Estilo ADX (panel nativo con priceScaleId)
 * Corregido para Lightweight Charts v4
 */

window.macdActivo = false;
window.macdSeries = null;
window.macdSignalSeries = null;
window.macdHistSeries = null;

window.toggleMCDE = function(fast = 12, slow = 26, signal = 9) {
    if (window.macdActivo) {
        window.desactivarMACD();
        return;
    }

    if (!window.seriesData || window.seriesData.length === 0) {
        console.warn('⚠️ No hay datos para calcular el MACD');
        return;
    }

    // 1. Configurar el panel inferior (mismo patrón que el ADX)
    window.chart.applyOptions({
        priceScales: {
            'macd-panel': {
                scaleMargins: { top: 0.75, bottom: 0 }, // 75% velas, 25% MACD
                visible: true,
                position: 'right',
            },
        },
    });

    // 2. Crear las series en el panel 'macd-panel' (v4)
    window.macdHistSeries = window.chart.addHistogramSeries({
        color: '#26a69a',
        priceScaleId: 'macd-panel',
        title: 'Hist',
        priceLineVisible: false,
        lastValueVisible: false,
    });

    window.macdSeries = window.chart.addLineSeries({
        color: '#2196F3',
        lineWidth: 2,
        priceScaleId: 'macd-panel',
        title: 'MACD',
        priceLineVisible: false,
        lastValueVisible: false,
    });

    window.macdSignalSeries = window.chart.addLineSeries({
        color: '#FF5252',
        lineWidth: 2,
        priceScaleId: 'macd-panel',
        title: 'Signal',
        priceLineVisible: false,
        lastValueVisible: false,
    });

    // 3. Calcular y cargar datos
    const { macdData, signalData, histData } = calcularLogicaMCDE(window.seriesData, fast, slow, signal);

    if (macdData.length === 0) {
        console.warn('⚠️ Error en el cálculo del MACD');
        window.desactivarMACD();
        return;
    }

    window.macdSeries.setData(macdData);
    window.macdSignalSeries.setData(signalData);
    window.macdHistSeries.setData(histData);

    window.macdActivo = true;
    console.log("✅ MACD activado (panel nativo).");
};

// Lógica matemática
function calcularLogicaMCDE(data, fast, slow, signal) {
    const validData = data.filter(d => d.close !== undefined && d.close !== null);
    if (validData.length < slow) return { macdData: [], signalData: [], histData: [] };

    const prices = validData.map(d => d.close);

    const calcEMA = (arr, period) => {
        const k = 2 / (period + 1);
        const out = [arr[0]];
        for (let i = 1; i < arr.length; i++) {
            out.push(arr[i] * k + out[i - 1] * (1 - k));
        }
        return out;
    };

    const emaFast = calcEMA(prices, fast);
    const emaSlow = calcEMA(prices, slow);
    const macdLine = emaFast.map((f, i) => f - emaSlow[i]);
    const signalLine = calcEMA(macdLine, signal);

    const macdData = [];
    const signalData = [];
    const histData = [];

    for (let i = 0; i < validData.length; i++) {
        const time = validData[i].time;
        const macd = macdLine[i];
        const sig = signalLine[i];
        const hist = macd - sig;
        const prevHist = i > 0 ? (macdLine[i - 1] - signalLine[i - 1]) : 0;

        let color = hist > 0
            ? (hist >= prevHist ? '#26a69a' : '#b2dfdb')
            : (hist <= prevHist ? '#ef5350' : '#ffcdd2');

        macdData.push({ time, value: macd });
        signalData.push({ time, value: sig });
        histData.push({ time, value: hist, color: color });
    }

    return { macdData, signalData, histData };
}

window.desactivarMACD = function() {
    if (window.macdSeries) { window.chart.removeSeries(window.macdSeries); window.macdSeries = null; }
    if (window.macdSignalSeries) { window.chart.removeSeries(window.macdSignalSeries); window.macdSignalSeries = null; }
    if (window.macdHistSeries) { window.chart.removeSeries(window.macdHistSeries); window.macdHistSeries = null; }

    window.macdActivo = false;
    console.log("🧹 MACD removido del gráfico.");
};