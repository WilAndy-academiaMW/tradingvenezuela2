/* ============================================
   CONFIGURACIÓN
============================================ */
const API_URL = 'https://www.bolsadecaracas.com/ticker-create/?code=5509cc6b2cc75dfbf0b0c09990d95f87&format=json';
const REFRESH_MS = 30000;

/* ============================================
   NOMBRES AMIGABLES
============================================ */
const NOMBRES = {
  'ABC.A': 'BCO. CARIBE "A"',
  'ARC.B': 'Arcas',
  'BNC':   'Banco Nacional Crédito',
  'BPV':   'Banco Provincial',
  'BVCC':  'Bolsa de Valores Caracas',
  'BVL':   'Banco de Venezuela',
  'CCP.B': 'C.CAPITAL "B"',
  'CCR':   'Cerámica Carabobo',
  'CGQ':   'Grupo Químico',
  'CRM.A': 'Corimon',
  'DOM':   'Domínguez',
  'EFE':   'Helados EFE',
  'ENV':   'Envases Venezolanos',
  'FNC':   'Fábrica Nacional de Cemento',
  'FNV':   'Fondo Nacional del Vidreo',
  'GMC.B': 'GG.MANTRA CLASE B',
  'GZL':   'Grupo Zuliano',
  'ICP.B': 'I.CRECEPYMES -B-',
  'IVC.A': 'INVACA I. C. "A"',
  'IVC.B': 'INVACA I. C. "B"',
  'MPA':   'Manpa',
  'MTC.B': 'Montesco',
  'MVZ.A': 'Mercantil A',
  'MVZ.B': 'Mercantil B',
  'PCP.B': 'Petrolea',
  'PGR':   'Proagro',
  'PIV.B': 'PIVCA CLASE "B"',
  'PTN':   'Protinal',
  'RST':   'Ron Santa Teresa',
  'RST.B': 'Ron Santa Teresa B',
  'SVS':   'Sinvesa',
  'TDV.D': 'CANTV D',
  'TPG':   'Telares Palo Grande',
  'VNA.B': 'VNA',
};

/* ============================================
   LOGOS LOCALES
============================================ */
const LOGOS = {
  'ABC.A': '../static/img/caribe.png',
  'BNC':   '../static/img/BNC.png',
  'BPV':   '../static/img/provincial.png',
  'BVCC':  '../static/img/bdvc.png',
  'BVL':   '../static/img/bdv.png',
  'CCP.B': '../static/img/perCapital.png',
  'CCR':   '../static/img/ceramica.png',
  'CGQ':   '../static/img/grupo quimico.png',
  'CRM.A': '../static/img/corimon.png',
  'DOM':   '../static/img/DOM.png',
  'EFE':   '../static/img/efe.png',
  'ENV':   '../static/img/envases.png',
  'FNC':   '../static/img/cemento.png',
  'FNV':   '../static/img/FNV.png',
  'GMC.B': '../static/img/mantra.png',
  'GZL':   '../static/img/grupo zuleano.png',
  'MPA':   '../static/img/Manpa.png',
  'MVZ.A': '../static/img/mercantil.png',
  'MVZ.B': '../static/img/mercantil.png',
  'PGR':   '../static/img/proagro.jpg',
  'PTN':   '../static/img/protinal.svg',
  'RST':   '../static/img/santaTeresa.png',
  'RST.B': '../static/img/santaTeresa.png',
  'SVS':   '../static/img/sinvesa.png',
  'TDV.D': '../static/img/cantv.png',
  'TPG':   '../static/img/telares.jpg',
};

/* ============================================
   PARSEO DE NÚMEROS VENEZOLANOS
   "2.900" → 2900 | "124,99" → 124.99 | "6.491.673" → 6491673
============================================ */
function parseNumeroVE(str) {
  if (str === null || str === undefined) return 0;
  if (typeof str === 'number') return str;
  let s = String(str).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return 0;
  s = s.replace(/[^\d.,-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes('.')) {
    const partes = s.split('.');
    if (partes.length > 2 || (partes[1] && partes[1].length === 3 && partes[0].length <= 3)) {
      s = s.replace(/\./g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* ============================================
   FORMATEO
============================================ */
function fmtBs(n, decimales = 2) {
  return Number(n).toLocaleString('es-VE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  });
}
function fmtEntero(n) {
  return Number(n).toLocaleString('es-VE', { maximumFractionDigits: 0 });
}
function fmtCompacto(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + ' MM';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + ' M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + ' K';
  return fmtBs(n, 0);
}

/* ============================================
   ESTADO
============================================ */
let cacheAcciones = [];
let cacheIndices  = [];

/* ============================================
   CARGA DE DATOS
============================================ */
async function cargarDatos() {
  const loader = document.getElementById('estado-loader');
  try {
    loader.classList.add('activo');
    const res = await fetch(API_URL + '&_=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();

    const todos = json.items || [];

    // Separar índices de acciones
    const indicesRaw = todos.filter(it => {
      const s = (it.COD_SIMB || '').trim();
      return s === 'IBC' || s === ' IBC' || s.startsWith('I.');
    });
    const accionesRaw = todos.filter(it => !indicesRaw.includes(it));

    // Procesar índices
    cacheIndices = indicesRaw.map(it => {
      const simbolo = (it.COD_SIMB || it.CODE || '').trim();
      return {
        simbolo: simbolo === ' IBC' ? 'IBC' : simbolo,
        nombre: it.CODE === 'IBC' ? 'Índice Bursátil Caracas'
              : it.CODE === 'IFINANCIE' ? 'Sector Financiero'
              : it.CODE === 'IINDUSTR' ? 'Sector Industrial'
              : it.CODE,
        precio: parseNumeroVE(it.DATA?.PRECIO || it.PRECIO),
        varRel: parseNumeroVE(it.DATA?.VAR_REL ?? it.VARIACION),
        color: it.COLOR || '#4c62ff',
        icono: it.ICONO || ''
      };
    });

    // Procesar acciones
    cacheAcciones = accionesRaw.map(it => {
      const precio = parseNumeroVE(it.DATA?.PRECIO || it.PRECIO);
      const varRel = parseNumeroVE(it.DATA?.VAR_REL ?? it.VARIACION);
      const varAbs = parseNumeroVE(it.DATA?.VAR_ABS);
      const volumen = parseNumeroVE(it.DATA?.VOLUMEN || it.VOLUMEN);
      const monto = parseNumeroVE(it.DATA?.MONTO_EFECTIVO);
      const color = it.COLOR || (varRel > 0 ? '#00AF40' : varRel < 0 ? '#fe0201' : '#4c62ff');
      const simbolo = (it.COD_SIMB || it.CODE || '').trim();

      return {
        simbolo,
        nombre: NOMBRES[simbolo] || simbolo,
        logo: LOGOS[simbolo] || null,
        precio, varRel, varAbs, volumen, monto,
        color,
        icono: it.ICONO || '',
        hora: it.DATA?.HORA || '--:--:--'
      };
    }).filter(a => a.simbolo && a.precio > 0);

    renderIndices();
    renderStats();
    renderTabla();
    renderHeatmap();

    document.getElementById('ultima-actualizacion').textContent =
      new Date().toLocaleTimeString('es-VE');
  } catch (e) {
    console.error('Error cargando datos BVC:', e);
  } finally {
    loader.classList.remove('activo');
  }
}

/* ============================================
   ÍNDICES (3 div arriba de la tabla)
============================================ */
function renderIndices() {
  const cont = document.getElementById('panel-indices');
  if (!cont) return;

  if (cacheIndices.length === 0) {
    cont.innerHTML = '';
    return;
  }

  cont.innerHTML = cacheIndices.map(i => {
    const signo = i.varRel > 0 ? '+' : '';
    return `
      <div class="indice-card" style="border-left: 3px solid ${i.color};">
        <div class="indice-top">
          <div>
            <div class="indice-simbolo">${i.simbolo}</div>
            <div class="indice-nombre">${i.nombre}</div>
          </div>
          ${i.icono ? `<img src="${i.icono}" class="indice-icon" alt="">` : ''}
        </div>
        <div class="indice-precio">${fmtBs(i.precio)}</div>
        <div class="indice-var" style="color: ${i.color};">
          ${signo}${i.varRel.toFixed(2)}%
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================
   STATS
============================================ */
function renderStats() {
  const total = cacheAcciones.length;
  const up    = cacheAcciones.filter(a => a.varRel > 0).length;
  const down  = cacheAcciones.filter(a => a.varRel < 0).length;
  const equal = cacheAcciones.filter(a => a.varRel === 0).length;
  const montoTotal = cacheAcciones.reduce((s, a) => s + (a.monto || 0), 0);

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-up').textContent    = up;
  document.getElementById('stat-down').textContent  = down;
  document.getElementById('stat-equal').textContent = equal;
  document.getElementById('stat-monto').textContent = fmtCompacto(montoTotal) + ' Bs';
}

/* ============================================
   LOGO
============================================ */
function renderLogo(a) {
  if (a.logo) {
    return `<img src="${a.logo}" class="row-logo" alt=""
              onerror="this.outerHTML='<div class=\\'row-logo-fallback\\' style=\\'background:${a.color}\\'>${a.simbolo.substring(0,2)}</div>'">`;
  }
  return `<div class="row-logo-fallback" style="background: ${a.color};">${a.simbolo.substring(0,2)}</div>`;
}

/* ============================================
   TABLA
============================================ */
function renderTabla() {
  const cont = document.getElementById('tabla-acciones');
  const orden = [...cacheAcciones].sort((a, b) => (b.monto || 0) - (a.monto || 0));

  cont.innerHTML = orden.map(a => {
    const signo = a.varRel > 0 ? '+' : '';
    return `
      <div class="table-row">
        <div>${renderLogo(a)}</div>
        <span class="simbolo">${a.simbolo}</span>
        <span class="nombre">${a.nombre}</span>
        <span class="precio right">${fmtBs(a.precio)}</span>
        <span class="var right" style="color: ${a.color};">
          ${a.icono ? `<img src="${a.icono}" style="width:11px;height:11px;" alt="">` : ''}
          ${signo}${a.varRel.toFixed(2)}%
        </span>
        <span class="volumen right">${fmtEntero(a.volumen)}</span>
        <span class="monto right">${fmtCompacto(a.monto)}</span>
      </div>
    `;
  }).join('');
}

/* ============================================
   MAPA DE CALOR
============================================ */
function renderHeatmap() {
  const cont = document.getElementById('heatmap');
  const maxMonto = Math.max(...cacheAcciones.map(a => a.monto || 0), 1);
  const maxAbsVar = Math.max(...cacheAcciones.map(a => Math.abs(a.varRel)), 1);

  const orden = [...cacheAcciones].sort((a, b) => (b.monto || 0) - (a.monto || 0));

  cont.innerHTML = orden.map(a => {
    const intensidad = Math.min(Math.abs(a.varRel) / maxAbsVar, 1);
    const alpha = 0.15 + intensidad * 0.75;
    const baseRgb = a.varRel > 0 ? '0, 175, 64'
                  : a.varRel < 0 ? '254, 2, 1'
                  :                '76, 98, 255';
    const bg = `rgba(${baseRgb}, ${alpha})`;

    const ratio = (a.monto || 0) / maxMonto;
    const span = 1 + Math.floor(ratio * 2);

    const signo = a.varRel > 0 ? '+' : '';

    return `
      <div class="heat-cell" style="background: ${bg}; border: 1px solid ${a.color}40; grid-column: span ${span};">
        <div class="simbolo">${a.simbolo}</div>
        <div class="precio">Bs ${fmtBs(a.precio)}</div>
        <div class="var" style="color: ${a.color};">
          ${a.icono ? `<img src="${a.icono}" class="heat-icon" alt="">` : ''}
          ${signo}${a.varRel.toFixed(2)}%
        </div>
      </div>
    `;
  }).join('');
}

/* ============================================
   CAMBIO DE VISTA
============================================ */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const vista = btn.dataset.vista;
    document.getElementById('vista-tabla').classList.toggle('hidden', vista !== 'tabla');
    document.getElementById('vista-heatmap').classList.toggle('hidden', vista !== 'heatmap');

    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.vista === vista);
    });
  });
});

/* ============================================
   INICIO
============================================ */
cargarDatos();
setInterval(cargarDatos, REFRESH_MS);