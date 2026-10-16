// ============================================================================
// app.js - Orquestador principal para la app de BVC
// Símbolos activos: BNC, BPV, ABC.A
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {

    // Estado global
    let simboloActivo = "BNC";

    // ============================================
    // 1. RESUMEN / CABECERA DEL SÍMBOLO ACTIVO
    // ============================================
    async function cargarResumenSimbolo(symbol) {
        console.log(`📊 Cargando resumen para: ${symbol}`);
        try {
            const url = `http://185.217.125.181:5000/api/resumen?_=${Date.now()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            const mercado = json.mercado || [];

            const item = mercado.find(m => m.simbolo === symbol);
            if (!item) {
                console.warn(`⚠️ No hay datos de resumen para ${symbol}`);
                return;
            }

            // Título
            const titleEl = document.getElementById('chart-title');
            if (titleEl) titleEl.textContent = `📈 ${item.simbolo}`;

            // Subtítulo
            const subtitleEl = document.getElementById('chart-subtitle');
            if (subtitleEl) {
                subtitleEl.textContent = `Actualizado: ${item.timestamp || '--'}`;
            }

            // Tarjetas superiores
            const infoSimbolo = document.getElementById('info-simbolo');
            if (infoSimbolo) infoSimbolo.textContent = item.simbolo || '--';

            const infoPrecio = document.getElementById('info-precio');
            if (infoPrecio) {
                infoPrecio.textContent = `$${Number(item.precio_ult).toFixed(2)}`;
            }

            const varRel = Number(item.var_rel) || 0;
            const flecha = varRel > 0 ? '▲' : varRel < 0 ? '▼' : '▬';
            const colorVar = varRel > 0 ? '#00ff88' : varRel < 0 ? '#ff6b6b' : '#9ca3af';

            const infoVar = document.getElementById('info-var');
            if (infoVar) {
                infoVar.textContent = `${flecha} ${varRel >= 0 ? '+' : ''}${varRel.toFixed(2)}%`;
                infoVar.style.color = colorVar;
            }

            const infoCap = document.getElementById('info-capitali');
            if (infoCap) {
                infoCap.innerHTML = `
                    <div style="color:#93c5fd;">Bs ${formatCompact(item.capitali_bs)}</div>
                    <div style="color:#60a5fa; font-size:11px;">$${formatCompact(item.capitali_us)}</div>
                `;
            }

        } catch (e) {
            console.error('❌ Error cargando resumen:', e);
        }
    }

    // Helper para formatear números grandes
    function formatCompact(v) {
        const num = Number(v) || 0;
        const abs = Math.abs(num);
        if (abs >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
        if (abs >= 1e9)  return `${(num / 1e9).toFixed(2)}B`;
        if (abs >= 1e6)  return `${(num / 1e6).toFixed(2)}M`;
        if (abs >= 1e3)  return `${(num / 1e3).toFixed(2)}K`;
        return num.toFixed(2);
    }

    // ============================================
    // 2. BOTONES DE ACTIVOS (BNC, BPV, ABC.A)
    // ============================================
    document.querySelectorAll('.asset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.asset-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const symbol = this.dataset.symbol;
            if (!symbol) return;

            simboloActivo = symbol;
            console.log(`🔘 Cambiando a: ${symbol}`);

            // Actualizar resumen del símbolo
            cargarResumenSimbolo(symbol);

            // Llamar a TODAS las funciones globales disponibles (si existen)
            const funciones = [
                'actualizarVelaDelta',           // vela.js
                'actualizarDeltaOperaciones',    // delta_operaciones.js
                'actualizarVelasInteligentes',   // order_flow_candles.js
                'actualizarDeltaBook',           // delta_book (si lo usas)
                'actualizarLibroProfundidad',
                'actualizarMapaOrdenes',
                'actualizarResumenTarjetas',
                'actualizarLibroOrdenes',    
                
            ];

            funciones.forEach(fn => {
                if (typeof window[fn] === "function") {
                    try {
                        window[fn](symbol);
                    } catch (e) {
                        console.error(`❌ Error en ${fn}(${symbol}):`, e);
                    }
                }
            });
        });
    });

    // ============================================
    // 3. CARGA INICIAL
    // ============================================
    const botonActivoInicial = document.querySelector('.asset-btn.active') || document.querySelector('.asset-btn');
    const symbolInicial = botonActivoInicial ? botonActivoInicial.dataset.symbol : 'BNC';

    if (botonActivoInicial) botonActivoInicial.classList.add('active');

    console.log(`🚀 Iniciando con símbolo: ${symbolInicial}`);

    // Cargar resumen del símbolo inicial
    cargarResumenSimbolo(symbolInicial);

    // Llamar a las funciones globales para el símbolo inicial
    const funciones = [
        'actualizarVelaDelta',
        'actualizarDeltaOperaciones',
        'actualizarVelasInteligentes',
        'actualizarDeltaBook',
        'actualizarLibroProfundidad',
        'actualizarMapaOrdenes',
        'actualizarMapaCalor',
        'actualizarDelta',
        'actualizarRadar',
        'actualizarTerminal',
        'actualizarHistogramas',
        'actualizarLibroOrdenes'
    ];

    funciones.forEach(fn => {
        if (typeof window[fn] === "function") {
            try {
                window[fn](symbolInicial);
            } catch (e) {
                console.error(`❌ Error en ${fn}(${symbolInicial}):`, e);
            }
        }
    });
});