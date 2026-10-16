

import os
import glob
import pandas as pd

# ============ CONFIG ============
ARCHIVO_EURO = r"C:\Users\roble\Desktop\bolsa\static\csv\EUR_VES.csv"

CARPETAS_ENTRADA = [
    (r"C:\Users\roble\Desktop\bolsa\static\csv\acciones",    r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro"),
    (r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_1w", r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro_W"),
    (r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_M",  r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro_M"),
]
DECIMALES = 4
# ================================


def _a_float(valor):
    """Convierte '980,9172' -> 980.9172 ; '503.397,6563' -> 503397.6563"""
    if valor is None:
        return None
    s = str(valor).strip().replace('"', '').replace('%', '')
    if s == '' or s.lower() == 'nan':
        return None
    if ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.')
    else:
        s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return None


def _parsear_fecha(valor):
    """Acepta '09.10.2026' o '2026-10-09'"""
    s = str(valor).strip().replace('"', '')
    for fmt in ('%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y'):
        try:
            return pd.to_datetime(s, format=fmt)
        except Exception:
            pass
    return pd.to_datetime(s, errors='coerce')


def cargar_euro(ruta):
    """
    Devuelve un DataFrame del euro ordenado por fecha, con columnas:
        fecha_dt | precio
    """
    df = pd.read_csv(ruta, dtype=str, encoding='utf-8-sig')
    df.columns = [c.strip().replace('"', '') for c in df.columns]

    col_precio = None
    for c in ['Último', 'Ultimo', 'Ultima', 'Última', 'Precio', 'Close']:
        if c in df.columns:
            col_precio = c
            break
    if col_precio is None:
        raise ValueError(f"No encontré columna de precio en {ruta}. Columnas: {list(df.columns)}")

    df['fecha_dt'] = df['Fecha'].apply(_parsear_fecha)
    df['precio']   = df[col_precio].apply(_a_float)
    df = df.dropna(subset=['fecha_dt', 'precio'])[['fecha_dt', 'precio']]
    df = df.sort_values('fecha_dt').reset_index(drop=True)
    return df


def eurolizar_csv(ruta_csv, df_euro):
    """Euroliza un CSV usando merge_asof (último euro conocido hacia atrás)."""
    df = pd.read_csv(ruta_csv, dtype=str, encoding='utf-8-sig')
    df.columns = [c.strip().replace('"', '') for c in df.columns]

    if 'Fecha' not in df.columns:
        print(f"  [SKIP] sin columna Fecha: {ruta_csv}")
        return None

    # Parsear fecha
    df['_fecha_dt'] = df['Fecha'].apply(_parsear_fecha)
    df = df.dropna(subset=['_fecha_dt']).reset_index(drop=True)

    # Orden ASCENDENTE por fecha para merge_asof
    df = df.sort_values('_fecha_dt', ascending=True).reset_index(drop=True)

    # Traer el euro más cercano hacia atrás
    df = pd.merge_asof(
        df,
        df_euro,
        left_on='_fecha_dt',
        right_on='fecha_dt',
        direction='backward',
        suffixes=('', '_euro')
    )

    # Si alguna fecha es anterior al primer euro del archivo, usar el primero (bfill)
    faltantes = df['precio'].isna().sum()
    if faltantes:
        print(f"  [INFO] {faltantes} filas sin euro previo -> se rellena con el primero disponible")
        df['precio'] = df['precio'].bfill()

    # Si aún quedan NaN (archivo euro vacío), abortar
    if df['precio'].isna().all():
        print(f"  [SKIP] No hay precios de euro válidos para cruzar")
        return None

    df['euro_bs'] = df['precio']

    # Convertir columnas numéricas a float
    for col in ['Apert.', 'Cierre', 'Max.', 'Min.', 'Efectivo']:
        if col in df.columns:
            df[col] = df[col].apply(_a_float)

    # División por el euro del día
    for col in ['Apert.', 'Cierre', 'Max.', 'Min.', 'Efectivo']:
        if col in df.columns:
            df[col] = (df[col] / df['euro_bs']).round(DECIMALES)

    # Recalcular Abs. y Rel.(%)
    if 'Apert.' in df.columns and 'Cierre' in df.columns:
        df['Abs.']    = (df['Cierre'] - df['Apert.']).round(DECIMALES)
        df['Rel.(%)'] = ((df['Abs.'] / df['Apert.']) * 100).round(2)

    # Formato final de fecha
    df['Fecha'] = df['_fecha_dt'].dt.strftime('%Y-%m-%d')

    # Reordenar columnas
    salida_cols = ["Fecha", "Apert.", "Cierre", "Abs.", "Rel.(%)",
                   "Max.", "Min.", "Operaciones", "VOLUMEN", "Efectivo"]
    salida_cols = [c for c in salida_cols if c in df.columns]
    df = df[salida_cols]

    # Orden final DESCENDENTE (más reciente arriba)
    df = df.sort_values('Fecha', ascending=False).reset_index(drop=True)
    return df


def main():
    print(f"Cargando precios del euro desde: {ARCHIVO_EURO}")
    df_euro = cargar_euro(ARCHIVO_EURO)
    print(f"  -> {len(df_euro)} fechas con precio del euro")
    print(f"  -> rango: {df_euro['fecha_dt'].min().date()} a {df_euro['fecha_dt'].max().date()}\n")

    for carpeta_in, carpeta_out in CARPETAS_ENTRADA:
        print("=" * 60)
        print(f"ENTRADA : {carpeta_in}")
        print(f"SALIDA  : {carpeta_out}")
        print("=" * 60)

        if not os.path.isdir(carpeta_in):
            print(f"  [SKIP] La carpeta no existe: {carpeta_in}\n")
            continue

        os.makedirs(carpeta_out, exist_ok=True)

        archivos = glob.glob(os.path.join(carpeta_in, "*.csv"))
        print(f"Encontrados {len(archivos)} CSV\n")

        ok, err = 0, 0
        for ruta in archivos:
            nombre = os.path.basename(ruta)
            try:
                df_eur = eurolizar_csv(ruta, df_euro)
            except Exception as e:
                print(f"  [ERROR] {nombre}: {e}")
                err += 1
                continue

            if df_eur is None or df_eur.empty:
                print(f"  [SKIP] {nombre}: sin datos válidos")
                err += 1
                continue

            salida = os.path.join(carpeta_out, nombre)
            df_eur.to_csv(salida, index=False)
            print(f"  OK  {nombre}  -> {len(df_eur)} filas")
            ok += 1

        print(f"\n  RESUMEN carpeta: OK={ok} | Errores={err}\n")

    print("LISTO.")


if __name__ == "__main__":
    main()