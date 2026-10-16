// ============================================================================
// libro_ordenes.js - Libro de órdenes adaptado a la API BVC (SQLite)
// ============================================================================

async function actualizarLibroOrdenes(symbol) {
    console.log(`📊 [LIBRO ORDENES] Actualizando tabla para: ${symbol}`);

    try {
        let simboloLimpio = symbol.toUpperCase().replace('_', '.');
        if (simboloLimpio === 'ABC_A') simboloLimpio = 'ABC.A';

        const res = await fetch(`http://185.217.125.181:5000/api/simbolo/${encodeURIComponent(simboloLimpio)}?_=${Date.now()}`);
        
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

        const libroOrdenes = data.libro_ordenes || [];

        // Separar
        let listaAsks = libroOrdenes.filter(item => item.tipo_punta === 'VENTA');
        let listaBids = libroOrdenes.filter(item => item.tipo_punta === 'COMPRA');

        // 🔥 ORDENAMIENTO CORREGIDO:
        // Ventas (Asks): de MENOR a MAYOR precio (el más barato primero)
        // Ventas (Asks): de MAYOR a MENOR precio (el más caro primero)
       listaAsks.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));

// Compras (Bids): de MAYOR a MENOR precio (el que más paga primero)

        
        // Compras (Bids): de MAYOR a MENOR precio (el que más paga primero)
        listaBids.sort((a, b) => Number(b.precio || 0) - Number(a.precio || 0));

        // --- LÓGICA DE DOMINANCIA ---
        const totalVentas = listaAsks.reduce((acc, item) => acc + Number(item.volumen || 0), 0);
        const totalCompras = listaBids.reduce((acc, item) => acc + Number(item.volumen || 0), 0);
        const totalGeneral = totalVentas + totalCompras;

        const porcVentas = totalGeneral > 0 ? (totalVentas / totalGeneral) * 100 : 50;
        const porcCompras = totalGeneral > 0 ? (totalCompras / totalGeneral) * 100 : 50;

        const barraVentas = document.getElementById('barra-ventas');
        const barraCompras = document.getElementById('barra-compras');
        const labelDominancia = document.getElementById('dominancia-label');
        const labelPorcentaje = document.getElementById('dominancia-porcentaje');

        if (barraVentas && barraCompras && labelDominancia && labelPorcentaje) {
            barraVentas.style.width = `${porcVentas}%`;
            barraCompras.style.width = `${porcCompras}%`;
            
            if (porcVentas > porcCompras) {
                labelDominancia.style.color = '#ef4444';
                labelPorcentaje.style.color = '#ef4444';
                labelPorcentaje.textContent = `${porcVentas.toFixed(0)}% VENTAS`;
            } else if (porcCompras > porcVentas) {
                labelDominancia.style.color = '#34d399';
                labelPorcentaje.style.color = '#34d399';
                labelPorcentaje.textContent = `${porcCompras.toFixed(0)}% COMPRAS`;
            } else {
                labelDominancia.style.color = '#6b7280';
                labelPorcentaje.style.color = '#6b7280';
                labelPorcentaje.textContent = `50% / 50%`;
            }
        }

        // --- RENDERIZADO DE FILAS (MÁX 6) ---
        const maxCantidad = Math.max(...libroOrdenes.map(i => Number(i.volumen || 0)), 1);

        function crearFila(cantidad, precio, esVenta, esVacia = false) {
            const row = document.createElement('div');
            row.style.cssText = `
                position: relative;
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                padding: 6px 10px;
                align-items: center;
                font-size: 14px;
                font-weight: 900;
                border-radius: 4px;
                background: ${esVacia ? 'transparent' : (esVenta ? 'rgba(239, 68, 68, 0.05)' : 'rgba(52, 211, 153, 0.05)')};
                color: ${esVacia ? '#333' : '#fff'};
                height: 26px;
            `;
            
            if (!esVacia) {
                const porcentaje = Math.min(Math.max((cantidad / maxCantidad) * 100, 5), 100);
                const opacidad = Math.min(Math.max(cantidad / maxCantidad, 0.15), 0.45);
                
                const barra = document.createElement('div');
                barra.style.cssText = `
                    position: absolute;
                    top: 0; right: 0; bottom: 0;
                    width: ${porcentaje}%;
                    background: ${esVenta ? `rgba(239, 68, 68, ${opacidad})` : `rgba(52, 211, 153, ${opacidad})`};
                    border-radius: 4px;
                    z-index: 0;
                    pointer-events: none;
                `;
                row.appendChild(barra);
            }

            // Columna 1: Cantidad
            const spanCant = document.createElement('span');
            spanCant.style.cssText = `text-align: left; z-index: 1; color: ${esVacia ? '#333' : '#ffffff'}; font-weight: 900; font-size: 14px; text-shadow: 1px 1px 3px #000;`;
            spanCant.textContent = esVacia ? '-' : cantidad.toLocaleString('es-VE');

            // Columna 2: Valor en Bs. (con el "Bs." al lado)
            const spanValor = document.createElement('span');
            spanValor.style.cssText = `text-align: center; z-index: 1; color: ${esVacia ? '#333' : '#e5e7eb'}; font-size: 13px; font-weight: 900; text-shadow: 1px 1px 3px #000;`;
            if (!esVacia) {
                const valorBs = cantidad * precio;
                spanValor.textContent = `${valorBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.`;
            } else {
                spanValor.textContent = '-';
            }

            // Columna 3: Precio
            const spanPrec = document.createElement('span');
            spanPrec.style.cssText = `font-weight: 900; text-align: right; z-index: 1; font-size: 14px; color: ${esVacia ? '#333' : (esVenta ? '#ff4d4d' : '#00ff88')}; text-shadow: 1px 1px 3px #000;`;
            spanPrec.textContent = esVacia ? '-' : precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            row.appendChild(spanCant);
            row.appendChild(spanValor);
            row.appendChild(spanPrec);
            return row;
        }

        // Renderizar ASKS (Ventas)
        for (let i = 0; i < 6; i++) {
            if (i < listaAsks.length) {
                const item = listaAsks[i];
                contenedorAsks.appendChild(crearFila(Number(item.volumen), Number(item.precio), true));
            } else {
                contenedorAsks.appendChild(crearFila(0, 0, true, true));
            }
        }

        // Renderizar BIDS (Compras)
        for (let i = 0; i < 6; i++) {
            if (i < listaBids.length) {
                const item = listaBids[i];
                contenedorBids.appendChild(crearFila(Number(item.volumen), Number(item.precio), false));
            } else {
                contenedorBids.appendChild(crearFila(0, 0, false, true));
            }
        }

    } catch (error) {
        console.error('❌ Error en actualizarLibroOrdenes:', error);
    }
}

window.actualizarLibroOrdenes = actualizarLibroOrdenes;

document.addEventListener("DOMContentLoaded", () => {
    console.log('✅ libro_ordenes.js cargado y listo para BVC');
    if (typeof window.actualizarLibroOrdenes === "function") {
        window.actualizarLibroOrdenes('ABC.A');
    }
});