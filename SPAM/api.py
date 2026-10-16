import os
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Permite peticiones sin problemas de CORS desde tu web

# Carpeta local donde descargaste las bases de datos en tu PC
DB_DIR = r"C:\Users\roble\Desktop\bolsa\static\db"

# Lista de símbolos BVC disponibles
SIMBOLOS_BVC = [
    "ABC.A",
    "ARC.B",
    "BNC",
    "BPV",
    "BVCC",
    "BVL",
    "CCP.B",
    "CCR",
    "CGQ",
    "CRM.A",
    "DOM",
    "EFE",
    "ENV",
    "FNC",
    "FNV",
    "GMC.B",
    "GZL",
    "ICP.B",
    "IVC.A",
    "IVC.B",
    "MPA",
    "MTC.B",
    "MVZ.A",
    "MVZ.B",
    "PCP.B",
    "PGR",
    "PIV.B",
    "PTN",
    "RST",
    "RST.B",
    "SVS",
    "TDV.D",
    "TPG",
    "VNA.B",
]


def conectar_db(simbolo):
  nombre_archivo = f"{simbolo.replace('.', '_')}.db"
  db_path = os.path.join(DB_DIR, nombre_archivo)
  if not os.path.exists(db_path):
    return None
  return sqlite3.connect(db_path)


@app.route("/api/simbolo/<simbolo>", methods=["GET"])
def obtener_datos_simbolo(simbolo):
  """Devuelve el último estado completo (OHLC, Libro de Órdenes y Operaciones) de un símbolo."""
  simbolo = simbolo.upper()
  conn = conectar_db(simbolo)
  if not conn:
    return (
        jsonify({"error": f"No hay base de datos local para el símbolo {simbolo}"}),
        404,
    )

  cursor = conn.cursor()

  # 1. Último registro de Precios / OHLC / Capitalización
  cursor.execute("SELECT * FROM precios_ohlc ORDER BY id DESC LIMIT 1")
  col_precio = [d[0] for d in cursor.description]
  row_precio = cursor.fetchone()
  precio_data = dict(zip(col_precio, row_precio)) if row_precio else {}

  # 2. Libro de Órdenes actual
  cursor.execute(
      "SELECT * FROM libro_ordenes WHERE timestamp = (SELECT MAX(timestamp) FROM"
      " libro_ordenes)"
  )
  col_lib = [d[0] for d in cursor.description]
  rows_lib = [dict(zip(col_lib, row)) for row in cursor.fetchall()]

  # 3. Operaciones recientes
  cursor.execute(
      "SELECT * FROM operaciones_mercado WHERE timestamp = (SELECT"
      " MAX(timestamp) FROM operaciones_mercado)"
  )
  col_ops = [d[0] for d in cursor.description]
  rows_ops = [dict(zip(col_ops, row)) for row in cursor.fetchall()]

  conn.close()

  return jsonify(
      {
          "simbolo": simbolo,
          "precios_ohlc": precio_data,
          "libro_ordenes": rows_lib,
          "operaciones": rows_ops,
      }
  )


@app.route("/api/delta-cvd/<simbolo>", methods=["GET"])
def obtener_delta_cvd(simbolo):
  """Calcula el Delta y CVD ignorando lecturas estáticas repetidas

  y calculando el incremento real del volumen acumulado barra a barra.
  """
  simbolo = simbolo.upper()
  conn = conectar_db(simbolo)
  if not conn:
    return (
        jsonify({"error": f"No hay base de datos local para el símbolo {simbolo}"}),
        404,
    )

  cursor = conn.cursor()

  # Consultar operaciones del mercado ordenadas cronológicamente
  cursor.execute(
      "SELECT * FROM operaciones_mercado ORDER BY timestamp ASC, id ASC"
  )
  col_ops = [d[0] for d in cursor.description]
  filas_ops = cursor.fetchall()

  # Consultar precios OHLC para asociar el precio_ult por timestamp
  cursor.execute("SELECT timestamp, precio_ult FROM precios_ohlc")
  precios_map = {row[0]: row[1] for row in cursor.fetchall()}

  conn.close()

  if not filas_ops:
    return jsonify({"simbolo": simbolo, "delta_cvd": []})

  ops_historial = [dict(zip(col_ops, row)) for row in filas_ops]

  resultado_delta = []
  cvd_acumulado = 0.0
  volumen_previo_registrado = None
  precio_anterior = None
  fecha_actual = None

  for op in ops_historial:
    # Solo operaciones Regulares ('O')
    tipo_mercado = str(op.get("tipo_mercado", "")).strip()
    if tipo_mercado.upper() != "O":
      continue

    timestamp = str(op.get("timestamp", ""))

    if " " in timestamp:
      fecha_str, hora_str = timestamp.split(" ")
    else:
      continue

    # Filtro estricto de horario bursátil (09:00:00 a 13:10:00)
    if not ("09:00:00" <= hora_str <= "13:10:00"):
      continue

    # Reinicio diario
    if fecha_str != fecha_actual:
      fecha_actual = fecha_str
      volumen_previo_registrado = None
      precio_anterior = None

    vol_total_actual = float(op.get("tot_acc_negoc", 0) or 0)
    monto_total_actual = float(op.get("tot_monto_negoc", 0) or 0)

    precio_actual = precios_map.get(timestamp, 0.0)
    if precio_actual == 0.0 and vol_total_actual > 0:
      precio_actual = monto_total_actual / vol_total_actual

    # Si el volumen actual es igual al que ya teníamos registrado, no hubo operación nueva; lo saltamos para no generar ceros basura
    if (
        volumen_previo_registrado is not None
        and vol_total_actual == volumen_previo_registrado
    ):
      continue

    if volumen_previo_registrado is not None and precio_anterior is not None:
      volumen_delta_barra = vol_total_actual - volumen_previo_registrado

      if volumen_delta_barra < 0:
        volumen_delta_barra = 0.0

      # Dirección del Delta según la variación del precio
      if precio_actual >= precio_anterior:
        delta_signado = volumen_delta_barra
      else:
        delta_signado = -volumen_delta_barra

      cvd_acumulado += delta_signado
    else:
      # Primera barra con volumen del día
      volumen_delta_barra = vol_total_actual
      delta_signado = volumen_delta_barra
      cvd_acumulado += delta_signado

    if precio_actual == 0.0 and precio_anterior is not None:
      precio_actual = precio_anterior

    # Solo agregamos si el volumen de la barra es mayor a 0
    if volumen_delta_barra > 0:
      resultado_delta.append({
          "timestamp": timestamp,
          "precio": precio_actual,
          "volumen_barra": volumen_delta_barra,
          "delta": delta_signado,
          "cvd": cvd_acumulado,
      })

    volumen_previo_registrado = vol_total_actual
    if precio_actual > 0:
      precio_actual = precio_anterior

  return jsonify({"simbolo": simbolo, "delta_cvd": resultado_delta})

@app.route("/api/resumen", methods=["GET"])
def obtener_resumen_general():
  resumen = []
  for simbolo in SIMBOLOS_BVC:
    conn = conectar_db(simbolo)
    if conn:
      cursor = conn.cursor()
      cursor.execute(
          "SELECT simbolo, precio_ult, var_rel, capitali_bs, capitali_us,"
          " timestamp FROM precios_ohlc ORDER BY id DESC LIMIT 1"
      )
      row = cursor.fetchone()
      if row:
        resumen.append({
            "simbolo": row[0],
            "precio_ult": row[1],
            "var_rel": row[2],
            "capitali_bs": row[3],
            "capitali_us": row[4],
            "timestamp": row[5],
        })
      conn.close()
  return jsonify({"total_simbolos": len(resumen), "mercado": resumen})

@app.route("/api/vela-delta/<simbolo>", methods=["GET"])
def obtener_velas_delta(simbolo):
  """Devuelve las velas de la sesión (09:00 a 13:15) integrando

  los 4 precios OHLC reales de la tabla precios_ohlc, volumen, delta e intensidad.
  """
  simbolo = simbolo.upper()
  conn = conectar_db(simbolo)
  if not conn:
    return (
        jsonify({"error": f"No hay base de datos local para el símbolo {simbolo}"}),
        404,
    )

  cursor = conn.cursor()

  # 1. Operaciones regulares ('O') ordenadas por tiempo
  cursor.execute(
      "SELECT * FROM operaciones_mercado ORDER BY timestamp ASC, id ASC"
  )
  col_ops = [d[0] for d in cursor.description]
  filas_ops = cursor.fetchall()

  # 2. Extraer todos los campos OHLC de la tabla precios_ohlc mapeados por timestamp
  # Asumimos columnas comunes: timestamp, precio_ apertura/open, max, min, cierre/ult
  cursor.execute("SELECT * FROM precios_ohlc")
  col_ohlc = [d[0] for d in cursor.description]
  filas_ohlc = cursor.fetchall()
  conn.close()

  if not filas_ops:
    return jsonify({"simbolo": simbolo, "velas_delta": []})

  # Crear un mapa de OHLC por timestamp
  ohlc_map = {}
  for row in filas_ohlc:
    datos_ohlc = dict(zip(col_ohlc, row))
    ts = str(datos_ohlc.get("timestamp", ""))
    # Buscamos los nombres estándar de columnas OHLC en tu BD
    p_open = float(
        datos_ohlc.get("precio_ apertura", 0)
        or datos_ohlc.get("open", 0)
        or datos_ohlc.get("precio_ult", 0)
    )
    p_high = float(
        datos_ohlc.get("precio_max", 0)
        or datos_ohlc.get("high", 0)
        or datos_ohlc.get("precio_ult", 0)
    )
    p_low = float(
        datos_ohlc.get("precio_min", 0)
        or datos_ohlc.get("low", 0)
        or datos_ohlc.get("precio_ult", 0)
    )
    p_close = float(
        datos_ohlc.get("precio_ult", 0)
        or datos_ohlc.get("close", 0)
        or p_open
    )

    ohlc_map[ts] = {
        "open": p_open if p_open > 0 else p_close,
        "high": p_high if p_high > 0 else p_close,
        "low": p_low if p_low > 0 else p_close,
        "close": p_close,
    }

  ops_historial = [dict(zip(col_ops, row)) for row in filas_ops]

  velas_brutas = []
  volumen_previo = None
  precio_anterior = None
  fecha_actual = None

  for op in ops_historial:
    if str(op.get("tipo_mercado", "")).strip().upper() != "O":
      continue

    timestamp = str(op.get("timestamp", ""))
    if " " in timestamp:
      fecha_str, hora_str = timestamp.split(" ")
    else:
      continue

    if not ("09:00:00" <= hora_str <= "13:15:00"):
      continue

    if fecha_str != fecha_actual:
      fecha_actual = fecha_str
      volumen_previo = None
      precio_anterior = None

    vol_total_actual = float(op.get("tot_acc_negoc", 0) or 0)
    monto_total_actual = float(op.get("tot_monto_negoc", 0) or 0)

    # Obtener OHLC de ese timestamp exacto si existe, sino estimarlo
    datos_bar = ohlc_map.get(timestamp, {})
    p_close = datos_bar.get("close", 0.0)
    if p_close == 0.0 and vol_total_actual > 0:
      p_close = monto_total_actual / vol_total_actual

    p_open = datos_bar.get("open", p_close)
    p_high = datos_bar.get("high", max(p_open, p_close))
    p_low = datos_bar.get("low", min(p_open, p_close))

    # Cálculo del delta de volumen en la barra
    if volumen_previo is not None:
      volumen_delta_barra = vol_total_actual - volumen_previo
      if volumen_delta_barra < 0:
        volumen_delta_barra = 0.0
    else:
      volumen_delta_barra = vol_total_actual

    if volumen_previo is not None and vol_total_actual == volumen_previo:
      volumen_delta_barra = 0.0
      delta_signado = 0.0
    else:
      if precio_anterior is not None and p_close >= precio_anterior:
        delta_signado = volumen_delta_barra
      else:
        delta_signado = -volumen_delta_barra

    velas_brutas.append({
        "timestamp": timestamp,
        "open": p_open,
        "high": p_high,
        "low": p_low,
        "close": p_close,
        "volumen": volumen_delta_barra,
        "delta": delta_signado,
    })

    volumen_previo = vol_total_actual
    if p_close > 0:
      precio_anterior = p_close

  # Normalizar intensidad de 0 a 10 excluyendo ceros
  volumenes_con_movimiento = [
      abs(v["volumen"]) for v in velas_brutas if v["volumen"] > 0
  ]
  max_vol = max(volumenes_con_movimiento) if volumenes_con_movimiento else 1.0

  velas_finales = []
  for v in velas_brutas:
    vol = v["volumen"]
    if vol <= 0:
      intensidad = 0
    else:
      calc = round((vol / max_vol) * 10, 1)
      intensidad = int(round(calc))
      if intensidad < 1 and vol > 0:
        intensidad = 1
      if intensidad > 10:
        intensidad = 10

    velas_finales.append({
        "timestamp": v["timestamp"],
        "open": v["open"],
        "high": v["high"],
        "low": v["low"],
        "close": v["close"],
        "volumen": vol,
        "delta": v["delta"],
        "tipo": (
            "COMPRA"
            if v["delta"] >= 0
            else ("VENTA" if v["delta"] < 0 else "NEUTRAL")
        ),
        "intensidad_color": intensidad,
    })

  return jsonify({"simbolo": simbolo, "velas_delta": velas_finales})
@app.route("/api/resumen-captura/<simbolo>", methods=["GET"])
def obtener_resumen_captura(simbolo):
  """Devuelve un arreglo únicamente con las capturas donde hubo volumen real

  negociado (> 0), mapeando: precio, volumen, ask y bid.
  """
  simbolo = simbolo.upper()
  conn = conectar_db(simbolo)
  if not conn:
    return (
        jsonify({"error": f"No hay base de datos local para el símbolo {simbolo}"}),
        404,
    )

  cursor = conn.cursor()

  # 1. Obtener operaciones regulares ('O') ordenadas cronológicamente
  cursor.execute(
      "SELECT * FROM operaciones_mercado ORDER BY timestamp ASC, id ASC"
  )
  col_ops = [d[0] for d in cursor.description]
  filas_ops = cursor.fetchall()

  # 2. Obtener precios OHLC por timestamp
  cursor.execute("SELECT timestamp, precio_ult FROM precios_ohlc")
  precios_map = {row[0]: row[1] for row in cursor.fetchall()}

  # 3. Obtener el libro de órdenes agrupado por timestamp y tipo_punta
  cursor.execute(
      "SELECT timestamp, tipo_punta, SUM(volumen) FROM libro_ordenes GROUP BY"
      " timestamp, tipo_punta"
  )
  libro_filas = cursor.fetchall()

  conn.close()

  if not filas_ops:
    return jsonify({"simbolo": simbolo, "resumen_capturas": []})

  # Mapear volúmenes del libro: libro_map[timestamp] = {'COMPRA': bid, 'VENTA': ask}
  libro_map = {}
  for ts, tipo_punta, suma_vol in libro_filas:
    if ts not in libro_map:
      libro_map[ts] = {"COMPRA": 0.0, "VENTA": 0.0}
    tipo_limpio = str(tipo_punta).strip().upper()
    if "COMPRA" in tipo_limpio or "BID" in tipo_limpio:
      libro_map[ts]["COMPRA"] = float(suma_vol or 0)
    elif "VENTA" in tipo_limpio or "ASK" in tipo_limpio:
      libro_map[ts]["VENTA"] = float(suma_vol or 0)

  ops_historial = [dict(zip(col_ops, row)) for row in filas_ops]

  capturas_resultado = []
  volumen_previo = None
  precio_anterior = None
  fecha_actual = None

  for op in ops_historial:
    tipo_mercado = str(op.get("tipo_mercado", "")).strip()
    if tipo_mercado.upper() != "O":
      continue

    timestamp = str(op.get("timestamp", ""))
    if " " in timestamp:
      fecha_str, hora_str = timestamp.split(" ")
    else:
      continue

    # Filtro estricto de rueda: 09:00:00 a 13:15:00
    if not ("09:00:00" <= hora_str <= "13:15:00"):
      continue

    if fecha_str != fecha_actual:
      fecha_actual = fecha_str
      volumen_previo = None
      precio_anterior = None

    vol_total_actual = float(op.get("tot_acc_negoc", 0) or 0)
    monto_total_actual = float(op.get("tot_monto_negoc", 0) or 0)

    precio_actual = precios_map.get(timestamp, 0.0)
    if precio_actual == 0.0 and vol_total_actual > 0:
      precio_actual = monto_total_actual / vol_total_actual

    # Cálculo del volumen de la barra (delta)
    if volumen_previo is not None:
      volumen_delta_barra = vol_total_actual - volumen_previo
      if volumen_delta_barra < 0:
        volumen_delta_barra = 0.0
    else:
      volumen_delta_barra = vol_total_actual

    # REGLA ESTRICTA: Si no hubo incremento de volumen en esta captura, la ignoramos por completo
    if volumen_previo is not None and volumen_delta_barra <= 0:
      volumen_previo = vol_total_actual
      continue

    if precio_actual == 0.0 and precio_anterior is not None:
      precio_actual = precio_anterior

    # Buscar totales del libro de órdenes para este timestamp
    datos_libro = libro_map.get(timestamp, {"COMPRA": 0.0, "VENTA": 0.0})

    capturas_resultado.append({
        "timestamp": timestamp,
        "precio": precio_actual,
        "volumen": volumen_delta_barra,
        "ask": datos_libro["VENTA"],
        "bid": datos_libro["COMPRA"],
    })

    volumen_previo = vol_total_actual
    if precio_actual > 0:
      precio_anterior = precio_actual

  return jsonify({"simbolo": simbolo, "resumen_capturas": capturas_resultado})

if __name__ == "__main__":
  # Corre localmente en el puerto 5000
  app.run(host="127.0.0.1", port=5000, debug=True)