var volumenChart = echarts.init(document.getElementById('volumen'));

async function cargarVolumen() {
  const response = await fetch("static/csv/accionesusd/IBC.csv");
  const text = await response.text();

  const rows = text.trim().split("\n");
  const data = rows.slice(1).map(row => {
    const cols = row.split(";");
    const fecha = cols[0] || "";

    const absRaw = cols[3] || "0";
    const abs = parseFloat(absRaw.replace(",", "."));

    const efectivoRaw = cols[10] || "0";
    const efectivo = parseFloat(efectivoRaw.replace(",", "."));

    return {
      fecha,
      efectivo,
      color: abs >= 0 ? '#00b050' : '#c00000'
    };
  });

  const fechas = data.map(d => d.fecha);
  const valores = data.map(d => d.efectivo);
  const colores = data.map(d => d.color);

  const option = {
    backgroundColor: '#fff',
    title: { text: 'Volumen negociado (efectivo)', left: 'center' },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: fechas, axisLabel: { rotate: 45 } },
    yAxis: { type: 'value', name: 'Efectivo' },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0 },
      { type: 'slider', xAxisIndex: 0 }
    ],
    series: [{
      type: 'bar',
      data: valores.map((v, i) => ({
        value: v,
        itemStyle: { color: colores[i] }
      })),
      name: 'Volumen'
    }]
  };

  volumenChart.setOption(option);
}

cargarVolumen();
