/**
 * ADX PRO - Panel 20% + Auto-ajuste + Cierre
 * CORREGIDO PARA v4
 */
window.adxActivo = false;
window.adxSeries = null;
window.plusDISeries = null;
window.minusDISeries = null;

window.toggleADX = function(period = 14) {
    if (window.adxActivo) {
        window.desactivarADX();
        return;
    }

    if (!window.seriesData || window.seriesData.length === 0) return;

    // 1. Configurar el panel inferior (20% del espacio)
    window.chart.applyOptions({
        priceScales: {
            'adx-panel': {
                scaleMargins: { top: 0.85, bottom: 0 },
                visible: true,
                position: 'right',
            },
        },
    });

    // 2. Crear las series en el panel 'adx-panel' (v4: addLineSeries)
    window.adxSeries = window.chart.addLineSeries({
        color: '#ffffff', lineWidth: 3, priceScaleId: 'adx-panel', title: 'ADX'
    });
    window.plusDISeries = window.chart.addLineSeries({
        color: '#26a69a', lineWidth: 1.5, priceScaleId: 'adx-panel', title: '+DI'
    });
    window.minusDISeries = window.chart.addLineSeries({
        color: '#ef5350', lineWidth: 1.5, priceScaleId: 'adx-panel', title: '-DI'
    });

    // 3. Ejecutar render inicial
    actualizarADX(period);
    
    // 4. Listener para que se adapte al mover el gráfico
    window.chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
        if (window.adxActivo) actualizarADX(period);
    });

    window.adxActivo = true;
    console.log("✅ ADX PRO activado correctamente.");
};

// Función necesaria para actualizar los datos
function actualizarADX(period) {
    const { resultsADX, resultsPlusDI, resultsMinusDI } = calcularLogicaADX(window.seriesData, period);
    if(window.adxSeries) window.adxSeries.setData(resultsADX);
    if(window.plusDISeries) window.plusDISeries.setData(resultsPlusDI);
    if(window.minusDISeries) window.minusDISeries.setData(resultsMinusDI);
}

// LÓGICA MATEMÁTICA COMPLETA
function calcularLogicaADX(data, period) {
    const validData = data.filter(d => d.high !== undefined && d.low !== undefined && (d.close !== undefined || d.value !== undefined));
    if (validData.length < period * 2) return { resultsADX: [], resultsPlusDI: [], resultsMinusDI: [] };

    let tr = [], plusDM = [], minusDM = [];
    for (let i = 1; i < validData.length; i++) {
        const upMove = validData[i].high - validData[i-1].high;
        const downMove = validData[i-1].low - validData[i].low;
        plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
        minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
        
        const prevClose = validData[i-1].close !== undefined ? validData[i-1].close : validData[i-1].value;
        const tr1 = validData[i].high - validData[i].low;
        const tr2 = Math.abs(validData[i].high - prevClose);
        const tr3 = Math.abs(validData[i].low - prevClose);
        tr.push(Math.max(tr1, tr2, tr3));
    }

    let smoothTR = 0, smoothPlusDM = 0, smoothMinusDM = 0;
    for(let i = 0; i < period; i++){
        smoothTR += tr[i]; smoothPlusDM += plusDM[i]; smoothMinusDM += minusDM[i];
    }

    let resultsADX = [], resultsPlusDI = [], resultsMinusDI = [], dxValues = [];
    for (let i = period; i < tr.length; i++) {
        smoothTR = smoothTR - (smoothTR / period) + tr[i];
        smoothPlusDM = smoothPlusDM - (smoothPlusDM / period) + plusDM[i];
        smoothMinusDM = smoothMinusDM - (smoothMinusDM / period) + minusDM[i];

        const pDI = smoothTR === 0 ? 0 : (smoothPlusDM / smoothTR) * 100;
        const mDI = smoothTR === 0 ? 0 : (smoothMinusDM / smoothTR) * 100;
        const dx = (pDI + mDI) === 0 ? 0 : (Math.abs(pDI - mDI) / (pDI + mDI)) * 100;

        const time = validData[i+1] ? validData[i+1].time : validData[i].time;
        resultsPlusDI.push({ time, value: pDI });
        resultsMinusDI.push({ time, value: mDI });
        dxValues.push(dx);
        
        if (dxValues.length >= period) {
            const adx = dxValues.slice(-period).reduce((a,b)=>a+b)/period;
            resultsADX.push({ time, value: adx });
        }
    }
    return { resultsADX, resultsPlusDI, resultsMinusDI };
}

window.desactivarADX = function() {
    if (window.adxSeries) window.chart.removeSeries(window.adxSeries);
    if (window.plusDISeries) window.chart.removeSeries(window.plusDISeries);
    if (window.minusDISeries) window.chart.removeSeries(window.minusDISeries);
    
    window.adxSeries = null;
    window.plusDISeries = null;
    window.minusDISeries = null;
    window.adxActivo = false;
    console.log("🧹 ADX removido del gráfico.");
};