document.addEventListener('DOMContentLoaded', () => {
    console.log('🌊 [Profundidad] Script inicializado correctamente.');

    let simboloActualProfundidad = 'AAPLBUSDT'; 
    let intervaloProfundidad = null;

    // Función principal para obtener y pintar los datos del endpoint
    window.actualizarLibroProfundidad = async function(symbol) {
        console.log(`🔄 [Profundidad] Solicitando datos para el símbolo: ${symbol}`);
        simboloActualProfundidad = symbol;
        
        // Actualizar etiqueta superior del panel
        const labelSymbol = document.getElementById('profundidad-symbol-label');
        if (labelSymbol) {
            labelSymbol.innerText = `ACTIVO: ${symbol}`;
        } else {
            console.warn('⚠ [Profundidad] No se encontró el elemento HTML #profundidad-symbol-label');
        }

        try {
            const urlEndpoint = `/api/libro-profundidad?simbolo=${encodeURIComponent(symbol)}`;
            console.log(`🌐 [Profundidad] Fetching a: ${urlEndpoint}`);
            
            const response = await fetch(urlEndpoint);
            console.log(`📥 [Profundidad] Respuesta recibida con status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} al obtener el libro de profundidad`);
            }
            
            const data = await response.json();
            console.log(`📦 [Profundidad] Datos JSON parseados exitosamente para ${symbol}:`, data);
            
            // Extraer las claves exactas que manda el backend
            const bids = data.panel_verde_bids || [];
            const asks = data.panel_rojo_asks || [];
            
            console.log(`🟢 [Profundidad] Bids encontrados: ${bids.length} filas`);
            console.log(`🔴 [Profundidad] Asks encontrados: ${asks.length} filas`);

            renderizarPanelBids(bids);
            renderizarPanelAsks(asks);

        } catch (error) {
            console.error('❌ [Profundidad] Error crítico en la petición:', error);
        }
    };

    function renderizarPanelBids(bids) {
        const contenedor = document.getElementById('panel-bids');
        if (!contenedor) {
            console.error('❌ [Profundidad] No se encontró el contenedor #panel-bids en el DOM');
            return;
        }
        
        contenedor.innerHTML = '';
        if (bids.length === 0) {
            console.warn('⚠ [Profundidad] El array de bids está vacío.');
            contenedor.innerHTML = '<div style="color: #6b7280; font-size: 9px; text-align: center; padding: 10px;">Sin datos de compra</div>';
            return;
        }

        // Ordenar de mayor a menor según el volumen
        const bidsOrdenados = [...bids].sort((a, b) => {
            const volA = parseFloat(a.volumen_compras ?? a.volumen ?? a.cantidad ?? 0);
            const volB = parseFloat(b.volumen_compras ?? b.volumen ?? b.cantidad ?? 0);
            return volB - volA; // Mayor a menor
        });

        // Encontrar el volumen máximo para escalar las barras de poder visualmente
        const maxVol = bidsOrdenados.length > 0 ? Math.max(...bidsOrdenados.map(item => {
            return parseFloat(item.volumen_compras ?? item.volumen ?? item.cantidad ?? 0);
        })) : 1;

        bidsOrdenados.forEach(item => {
            const rawPrecio = typeof item === 'object' && item !== null ? item.precio : item[0];
            const rawCantidad = typeof item === 'object' && item !== null ? (item.volumen_compras ?? item.volumen ?? item.cantidad) : item[1];

            const precio = parseFloat(rawPrecio || 0).toFixed(2);
            const cantidadNum = parseFloat(rawCantidad || 0);
            const cantidad = cantidadNum.toFixed(4);

            // Calcular intensidad (0 a 1) respecto al volumen máximo del panel
            const intensidad = maxVol > 0 ? Math.min(Math.abs(cantidadNum) / maxVol, 1) : 0;

            const fila = document.createElement('div');
            fila.style.cssText = "display: grid; grid-template-columns: 85px 85px 1fr; gap: 8px; font-family: 'Courier New', monospace; font-size: 10px; padding: 4px 6px; border-radius: 3px; background: rgba(0, 255, 136, 0.03); align-items: center;";
            fila.innerHTML = `
                <span style="color: #00ff88; font-weight: bold; text-align: left;">$${precio}</span>
                <span style="color: #e5e7eb; text-align: right;">${cantidad}</span>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${intensidad * 100}%; height: 100%; background: linear-gradient(90deg, #00ff88, #00cc66); border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
            `;
            contenedor.appendChild(fila);
        });
        console.log('✅ [Profundidad] Panel Bids ordenado por volumen y renderizado correctamente.');
    }

    function renderizarPanelAsks(asks) {
        const contenedor = document.getElementById('panel-asks');
        if (!contenedor) {
            console.error('❌ [Profundidad] No se encontró el contenedor #panel-asks en el DOM');
            return;
        }
        
        contenedor.innerHTML = '';
        if (asks.length === 0) {
            console.warn('⚠️ [Profundidad] El array de asks está vacío.');
            contenedor.innerHTML = '<div style="color: #6b7280; font-size: 9px; text-align: center; padding: 10px;">Sin datos de venta</div>';
            return;
        }

        // Ordenar de mayor a menor según el volumen
        const asksOrdenados = [...asks].sort((a, b) => {
            const volA = parseFloat(a.volumen_ventas ?? a.volumen ?? a.cantidad ?? 0);
            const volB = parseFloat(b.volumen_ventas ?? b.volumen ?? b.cantidad ?? 0);
            return volB - volA; // Mayor a menor
        });

        // Encontrar el volumen máximo para escalar las barras de poder visualmente
        const maxVol = asksOrdenados.length > 0 ? Math.max(...asksOrdenados.map(item => {
            return parseFloat(item.volumen_ventas ?? item.volumen ?? item.cantidad ?? 0);
        })) : 1;

        asksOrdenados.forEach(item => {
            const rawPrecio = typeof item === 'object' && item !== null ? item.precio : item[0];
            const rawCantidad = typeof item === 'object' && item !== null ? (item.volumen_ventas ?? item.volumen ?? item.cantidad) : item[1];

            const precio = parseFloat(rawPrecio || 0).toFixed(2);
            const cantidadNum = parseFloat(rawCantidad || 0);
            const cantidad = cantidadNum.toFixed(4);

            // Calcular intensidad (0 a 1) respecto al volumen máximo del panel
            const intensidad = maxVol > 0 ? Math.min(Math.abs(cantidadNum) / maxVol, 1) : 0;

            const fila = document.createElement('div');
            fila.style.cssText = "display: grid; grid-template-columns: 85px 85px 1fr; gap: 8px; font-family: 'Courier New', monospace; font-size: 10px; padding: 4px 6px; border-radius: 3px; background: rgba(239, 68, 68, 0.03); align-items: center;";
            fila.innerHTML = `
                <span style="color: #ff6b6b; font-weight: bold; text-align: left;">$${precio}</span>
                <span style="color: #e5e7eb; text-align: right;">${cantidad}</span>
                <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                    <div style="width: ${intensidad * 100}%; height: 100%; background: linear-gradient(90deg, #ff6b6b, #ff0000); border-radius: 3px; transition: width 0.3s ease;"></div>
                </div>
            `;
            contenedor.appendChild(fila);
        });
        console.log('✅ [Profundidad] Panel Asks ordenado por volumen y renderizado correctamente.');
    }

    // Integración automática con tus botones de activos existentes
    const botonesActivos = document.querySelectorAll('.asset-btn');
    console.log(`🔘 [Profundidad] Botones de activos detectados: ${botonesActivos.length}`);

    botonesActivos.forEach(boton => {
        boton.addEventListener('click', () => {
            const symbol = boton.getAttribute('data-symbol');
            console.log(`🖱️ [Profundidad] Clic en botón detectado. Símbolo: ${symbol}`);
            if (symbol) {
                window.actualizarLibroProfundidad(symbol);
            }
        });
    });

    // Carga inicial con el primer activo por defecto
    const botonActivoInicial = document.querySelector('.asset-btn.active');
    const symbolInicial = botonActivoInicial ? botonActivoInicial.getAttribute('data-symbol') : 'AAPLBUSDT';
    console.log(`🚀 [Profundidad] Ejecutando carga inicial para el símbolo: ${symbolInicial}`);
    window.actualizarLibroProfundidad(symbolInicial);

    // Refresco en tiempo real cada 3 segundos del símbolo seleccionado
    if (intervaloProfundidad) clearInterval(intervaloProfundidad);
    intervaloProfundidad = setInterval(() => {
        console.log(`⏱️ [Profundidad] Refrescando datos automáticos (intervalo 3s) para: ${simboloActualProfundidad}`);
        window.actualizarLibroProfundidad(simboloActualProfundidad);
    }, 3000);
});