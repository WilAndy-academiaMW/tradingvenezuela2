# -*- coding: utf-8 -*-
"""
Convierte CSVs diarios de la Bolsa de Caracas (BVC) en CSVs semanales.

Regla de semana:
    - Se recorre el CSV ordenado de más reciente a más antiguo.
    - Se agrupa mientras la diferencia entre fechas consecutivas sea <= 2 días.
    - Cuando la diferencia es >= 3 días (fin de semana o feriados largos),
      se corta y comienza una nueva semana.

Entrada:  C:\\Users\\roble\\Desktop\\bolsa\\static\\csv\\acciones
Salida:   C:\\Users\\roble\\Desktop\\bolsa\\static\\csv\\acciones_1w
"""

import os
import glob
from datetime import datetime
import pandas as pd

# ---------- CONFIGURACIÓN ----------
CARPETA_ENTRADA = r"C:\Users\roble\Desktop\bolsa\static\csv\acciones"
CARPETA_SALIDA  = r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_1w"

COLUMNAS = ["Fecha", "Apert.", "Cierre", "Abs.", "Rel.(%)",
            "Max.", "Min.", "Operaciones", "VOLUMEN", "Efectivo"]

DIAS_CORTE = 3  # si la diferencia entre fechas consecutivas es >= 3 días, nueva semana
# -----------------------------------


def agrupar_en_semanas(df):
    """
    Recibe un DataFrame diario ordenado DESCENDENTE por fecha (más reciente arriba).
    Devuelve una lista de DataFrames, cada uno representando una semana.
    """
    fechas = df["Fecha"].tolist()
    semanas = []
    semana_actual = [df.iloc[0]]

    for i in range(1, len(df)):
        dif = (fechas[i - 1] - fechas[i]).days
        if dif >= DIAS_CORTE:
            # corta: cierra la semana actual y comienza una nueva
            semanas.append(pd.DataFrame(semana_actual))
            semana_actual = [df.iloc[i]]
        else:
            semana_actual.append(df.iloc[i])

    semanas.append(pd.DataFrame(semana_actual))
    return semanas


def agregar_semana(df_semana):
    """
    Convierte las filas diarias de una semana en una sola fila semanal.
    df_semana viene ordenado DESCENDENTE (más reciente primero).
    """
    df_asc = df_semana.sort_values("Fecha", ascending=True).reset_index(drop=True)

    apertura = df_asc.iloc[0]["Apert."]
    cierre   = df_asc.iloc[-1]["Cierre"]
    abs_val  = round(cierre - apertura, 2)
    rel_val  = round((abs_val / apertura) * 100, 2) if apertura else 0.0

    fila = {
        "Fecha":       df_asc.iloc[-1]["Fecha"].strftime("%Y-%m-%d"),  # última fecha de la semana (la más reciente)
        "Apert.":      apertura,
        "Cierre":      cierre,
        "Abs.":        abs_val,
        "Rel.(%)":     rel_val,
        "Max.":        round(df_asc["Max."].max(), 2),
        "Min.":        round(df_asc["Min."].min(), 2),
        "Operaciones": int(df_asc["Operaciones"].sum()),
        "VOLUMEN":     int(df_asc["VOLUMEN"].sum()),
        "Efectivo":    round(df_asc["Efectivo"].sum(), 2),
    }
    return fila


def procesar_csv(ruta_csv):
    try:
        df = pd.read_csv(ruta_csv)
    except Exception as e:
        print(f"  [ERROR] No se pudo leer {ruta_csv}: {e}")
        return None

    if df.empty:
        return None

    # Verificar columnas mínimas
    for col in COLUMNAS:
        if col not in df.columns:
            print(f"  [SKIP] {os.path.basename(ruta_csv)} no tiene columna '{col}'")
            return None

    # Convertir Fecha a datetime
    df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce")
    df = df.dropna(subset=["Fecha"])

    # Ordenar DESCENDENTE (más reciente primero)
    df = df.sort_values("Fecha", ascending=False).reset_index(drop=True)

    # Agrupar en semanas
    semanas = agrupar_en_semanas(df)

    # Agregar cada semana
    filas = [agregar_semana(s) for s in semanas]

    df_semanal = pd.DataFrame(filas, columns=COLUMNAS)
    # Orden final: más reciente arriba (como el original)
    df_semanal = df_semanal.sort_values("Fecha", ascending=False).reset_index(drop=True)

    return df_semanal


def main():
    os.makedirs(CARPETA_SALIDA, exist_ok=True)

    archivos = glob.glob(os.path.join(CARPETA_ENTRADA, "*.csv"))
    print(f"Encontrados {len(archivos)} archivos CSV en {CARPETA_ENTRADA}\n")

    ok, err = 0, 0
    for ruta in archivos:
        nombre = os.path.basename(ruta)
        print(f"Procesando: {nombre}")

        df_sem = procesar_csv(ruta)
        if df_sem is None or df_sem.empty:
            print("  -> sin datos válidos, se omite\n")
            err += 1
            continue

        salida = os.path.join(CARPETA_SALIDA, nombre)
        df_sem.to_csv(salida, index=False)
        print(f"  -> {len(df_sem)} semanas guardadas en {salida}\n")
        ok += 1

    print(f"LISTO. OK: {ok}  |  Errores/omitidos: {err}")


if __name__ == "__main__":
    main()