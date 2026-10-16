// ============================================================================
// libro_ordenes.js - Libro de órdenes compacto (Top 10 más pesadas)
// ============================================================================

// ============================================================================
// libro_ordenes.js - Libro de órdenes compacto (Top 10 más pesadas)
// ============================================================================

async function actualizarLibroOrdenes(symbol) {
    console.log(`📊 [LIBRO ORDENES] Actualizando tabla para: ${symbol}`);

    try {
        let limpio = symbol.toUpperCase().replace('/', '').split(':')[0];
        
        if (limpio.endsWith('USDT') && !limpio.includes('_USDT')) {
            limpio = limpio.replace('USDT', '_USDT');
        }
        
        const res = await fetch(`/api/libro-pesado/${encodeURIComponent(limpio)}?_=${Date.now()}`);
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(`Error HTTP ${res.status}: ${errData.error || 'No encontrado'}`);
        }
        
        const data = await res.json();

        const contenedorAsks = document.getElementById('tabla-asks');
        const contenedorBids = document.getElementById('tabla-bids');
        
        if (!contenedorAsks || !contenedorBids) {
            console.warn("⚠️ No se encontraron los contenedores HTML 'tabla-asks' o 'tabla-bids'.");
            return;
        }

        contenedorAsks.innerHTML = '';
        contenedorBids.innerHTML = '';

        const precioActualRef = Number(data.precio_actual || 0);
        const ordenes = data.top_ordenes_pesadas || data;
        let listaAsks = [...(ordenes.asks_ventas || data.asks_ventas || [])];
        let listaBids = [...(ordenes.bids_compras || data.bids_compras || [])];

        // FILTRADO ESTRICTO DE SEGURIDAD EN EL CLIENTE
        if (precioActualRef > 0) {
            listaBids = listaBids.filter(item => {
                const precio = Number(item.price || item.precio || 0);
                return precio < precioActualRef;
            });

            listaAsks = listaAsks.filter(item => {
                const precio = Number(item.price || item.precio || 0);
                return precio >= precioActualRef;
            });
        }

        // 1. Obtener las 10 más pesadas por volumen en ASKS
        listaAsks.sort((a, b) => {
            const cantA = Number(a.cantidad || a.amount || a.volumen_ventas || 0);
            const cantB = Number(b.cantidad || b.amount || b.volumen_ventas || 0);
            return cantB - cantA; 
        });
        listaAsks = listaAsks.slice(0, 10);

        // 🔄 INVERSIÓN SOLICITADA: Ordenar esas 10 por precio de mayor a menor 
        // para que el precio menor quede abajo (al final del contenedor)
        listaAsks.sort((a, b) => {
            const precioA = Number(a.price || a.precio || 0);
            const precioB = Number(b.price || b.precio || 0);
            return precioB - precioA; // Mayor precio arriba, menor precio abajo
        });

        // 2. Obtener las 10 más pesadas por volumen en BIDS
        listaBids.sort((a, b) => {
            const cantA = Number(a.cantidad || a.amount || a.volumen_compras || 0);
            const cantB = Number(b.cantidad || b.amount || b.volumen_compras || 0);
            return cantB - cantA; 
        });
        listaBids = listaBids.slice(0, 10);

        const todasLasOrdenes = [...listaAsks, ...listaBids];
        const maxCantidad = Math.max(...todasLasOrdenes.map(i => Number(i.cantidad || i.amount || i.volumen_compras || i.volumen_ventas || 0)), 1);

        // ==========================================
        // RENDERIZAR ASKS (Ventas - Arriba - Rojo)
        // ==========================================
        if (listaAsks.length > 0) {
            listaAsks.forEach(item => {
                const cantidad = Number(item.cantidad || item.amount || item.volumen_ventas || 0);
                const precio = Number(item.price || item.precio || 0);
                
                const porcentaje = Math.min(Math.max((cantidad / maxCantidad) * 100, 5), 100);
                const opacidad = Math.min(Math.max(cantidad / maxCantidad, 0.15), 0.45);

                const row = document.createElement('div');
                row.style.cssText = `
                    position: relative;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    padding: 5px 10px;
                    align-items: center;
                    font-size: 12px;
                    border-radius: 3px;
                    margin-bottom: 2px;
                    background: rgba(239, 68, 68, 0.03);
                `;
                
                const barra = document.createElement('div');
                barra.style.cssText = `
                    position: absolute;
                    top: 0; right: 0; bottom: 0;
                    width: ${porcentaje}%;
                    background: rgba(239, 68, 68, ${opacidad});
                    border-radius: 3px;
                    z-index: 0;
                    pointer-events: none;
                `;
                row.appendChild(barra);

                const spanCant = document.createElement('span');
                spanCant.style.cssText = "color: #9ca3af; text-align: left; z-index: 1;";
                spanCant.textContent = cantidad.toLocaleString('es-VE');

                const spanPrec = document.createElement('span');
                spanPrec.style.cssText = "color: #ef4444; font-weight: bold; text-align: right; z-index: 1;";
                spanPrec.textContent = precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                row.appendChild(spanCant);
                row.appendChild(spanPrec);
                contenedorAsks.appendChild(row);
            });
        } else {
            contenedorAsks.innerHTML = `<div style="text-align: center; color: #555; font-size: 11px; padding: 10px;">Sin órdenes de venta válidas</div>`;
        }

        // ==========================================
        // RENDERIZAR BIDS (Compras - Abajo - Verde)
        // ==========================================
        if (listaBids.length > 0) {
            listaBids.forEach(item => {
                const cantidad = Number(item.cantidad || item.amount || item.volumen_compras || 0);
                const precio = Number(item.price || item.precio || 0);
                
                const porcentaje = Math.min(Math.max((cantidad / maxCantidad) * 100, 5), 100);
                const opacidad = Math.min(Math.max(cantidad / maxCantidad, 0.15), 0.45);

                const row = document.createElement('div');
                row.style.cssText = `
                    position: relative;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    padding: 5px 10px;
                    align-items: center;
                    font-size: 12px;
                    border-radius: 3px;
                    margin-bottom: 2px;
                    background: rgba(52, 211, 153, 0.03);
                `;

                const barra = document.createElement('div');
                barra.style.cssText = `
                    position: absolute;
                    top: 0; right: 0; bottom: 0;
                    width: ${porcentaje}%;
                    background: rgba(52, 211, 153, ${opacidad});
                    border-radius: 3px;
                    z-index: 0;
                    pointer-events: none;
                `;
                row.appendChild(barra);

                const spanCant = document.createElement('span');
                spanCant.style.cssText = "color: #9ca3af; text-align: left; z-index: 1;";
                spanCant.textContent = cantidad.toLocaleString('es-VE');

                const spanPrec = document.createElement('span');
                spanPrec.style.cssText = "color: #34d399; font-weight: bold; text-align: right; z-index: 1;";
                spanPrec.textContent = precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                row.appendChild(spanCant);
                row.appendChild(spanPrec);
                contenedorBids.appendChild(row);
            });
        } else {
            contenedorBids.innerHTML = `<div style="text-align: center; color: #555; font-size: 11px; padding: 10px;">Sin órdenes de compra válidas</div>`;
        }

    } catch (error) {
        console.error('❌ Error en actualizarLibroOrdenes:', error);
    }
}

window.actualizarLibroOrdenes = actualizarLibroOrdenes;

document.addEventListener("DOMContentLoaded", () => {
    console.log('✅ libro_ordenes.js cargado y listo');
    if (typeof window.actualizarLibroOrdenes === "function") {
        window.actualizarLibroOrdenes('AAPLB_USDT');
    }
});

window.actualizarLibroOrdenes = actualizarLibroOrdenes;

document.addEventListener("DOMContentLoaded", () => {
    console.log('✅ libro_ordenes.js cargado y listo');
    if (typeof window.actualizarLibroOrdenes === "function") {
        window.actualizarLibroOrdenes('AAPLB_USDT');
    }
});

function cargarGrafica() {
    const tf = window.temporalidadActual;

    // Nombre del archivo según el símbolo (ej: ABC.A -> ABC_A)
    const simboloArchivo = window.monedaActual.replace('/', '_').replace('.', '_');

    // 🔑 Elegir carpeta según TEMPORALIDAD + MONEDA VISUAL
    let carpeta;
    if (window.monedaVisual === 'EUR') {
        // Carpetas eurolizadas
        if (tf === '1w')       carpeta = 'acciones_euro_W';
        else if (tf === '1M')  carpeta = 'acciones_euro_M';
        else                   carpeta = 'acciones_euro';     // 1d
    } else {
        // Carpetas originales (Bs)
        if (tf === '1w')       carpeta = 'acciones_1w';
        else if (tf === '1M')  carpeta = 'acciones_M';
        else                   carpeta = 'acciones';          // 1d
    }

    const url = `../static/csv/${carpeta}/${simboloArchivo}.csv`;
    console.log(`Intentando cargar CSV [tf=${tf}, moneda=${window.monedaVisual}] desde:`, url);

    Papa.parse(url, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: function(h) { return h.trim(); },
        complete: function(results) {
            console.log(`📊 Datos leídos para ${window.monedaActual} [${tf} - ${window.monedaVisual}]:`, results.data.length);

            if (!results.data || results.data.length === 0) {
                console.error("❌ El archivo CSV está vacío o no se encontró en:", url);
                return;
            }

            const validRows = results.data.filter(row => row.Fecha && (row['Max.'] !== undefined || row['Min.'] !== undefined));

            let formattedData = validRows.map(row => {
                const ts = row.Fecha;
                const dateObj = new Date(ts);
                if (isNaN(dateObj.getTime())) return null;

                // 1d, 1w y 1M usan fecha YYYY-MM-DD (string)
                let finalTime = (tf === '1d' || tf === '1w' || tf === '1M')
                    ? dateObj.toISOString().split('T')[0]
                    : Math.floor(dateObj.getTime() / 1000);

                return {
                    time: finalTime,
                    open: parseFloat(row['Apert.'] || 0),
                    high: parseFloat(row['Max.'] || 0),
                    low: parseFloat(row['Min.'] || 0),
                    close: parseFloat(row['Cierre'] || 0),
                    volume: parseFloat(row['VOLUMEN'] || 0),
                };
            }).filter(item => item !== null);

            formattedData.sort((a, b) => {
                const t1 = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time * 1000;
                const t2 = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time * 1000;
                return t1 - t2;
            });

            const totalVelasReales = formattedData.length;
            if (totalVelasReales > 0) {
                const ultimoDato = formattedData[totalVelasReales - 1];
                const precioDisplay = document.getElementById('price-display');
                if (precioDisplay) {
                    const simboloPrecio = (window.monedaVisual === 'EUR') ? '€' : 'Bs';
                    precioDisplay.innerText = `${simboloPrecio} ${ultimoDato.close.toFixed(3)}`;
                    precioDisplay.className = `text-xl font-mono font-bold ${ultimoDato.close >= ultimoDato.open ? 'text-green-400' : 'text-red-400'}`;
                }
            }

            window.seriesData = formattedData;
            window.candlestickSeries.setData(formattedData);
            window.chart.priceScale('right').applyOptions({ autoScale: true });

            setTimeout(() => {
                window.chart.timeScale().fitContent();
            }, 50);

            console.log(`✅ Gráfico actualizado [${tf} - ${window.monedaVisual}] para ${window.monedaActual}`);
        },
        error: function(err) {
            console.error(`❌ Error al buscar el CSV [${tf} - ${window.monedaVisual}] para:`, window.monedaActual, url, err);
        }
    });
}