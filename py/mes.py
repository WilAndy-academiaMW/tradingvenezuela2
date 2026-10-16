# -*- coding: utf-8 -*-
"""
Convierte CSVs diarios de la BVC en CSVs mensuales.
Agrupa por año-mes (YYYY-MM). No importan fines de semana ni feriados.

Entrada:  C:\\Users\\roble\\Desktop\\bolsa\\static\\csv\\acciones
Salida:   C:\\Users\\roble\\Desktop\\bolsa\\static\\csv\\acciones_M
"""

import os
import glob
import pandas as pd

CARPETA_ENTRADA = r"C:\Users\roble\Desktop\bolsa\static\csv\acciones"
CARPETA_SALIDA  = r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_M"

COLUMNAS = ["Fecha", "Apert.", "Cierre", "Abs.", "Rel.(%)",
            "Max.", "Min.", "Operaciones", "VOLUMEN", "Efectivo"]


def agregar_mes(df_mes):
    """Colapsa las filas diarias de un mes en una sola fila mensual."""
    df_asc = df_mes.sort_values("Fecha", ascending=True).reset_index(drop=True)

    apertura = df_asc.iloc[0]["Apert."]
    cierre   = df_asc.iloc[-1]["Cierre"]
    abs_val  = round(cierre - apertura, 2)
    rel_val  = round((abs_val / apertura) * 100, 2) if apertura else 0.0

    return {
        "Fecha":       df_asc.iloc[-1]["Fecha"].strftime("%Y-%m-%d"),  # último día hábil del mes
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


def procesar_csv(ruta_csv):
    try:
        df = pd.read_csv(ruta_csv)
    except Exception as e:
        print(f"  [ERROR] No se pudo leer {ruta_csv}: {e}")
        return None

    if df.empty:
        return None

    for col in COLUMNAS:
        if col not in df.columns:
            print(f"  [SKIP] {os.path.basename(ruta_csv)} no tiene columna '{col}'")
            return None

    df["Fecha"] = pd.to_datetime(df["Fecha"], errors="coerce")
    df = df.dropna(subset=["Fecha"])

    # Agrupar por año-mes
    df["anio_mes"] = df["Fecha"].dt.to_period("M")

    filas = []
    for _, grupo in df.groupby("anio_mes"):
        filas.append(agregar_mes(grupo))

    df_mensual = pd.DataFrame(filas, columns=COLUMNAS)
    df_mensual = df_mensual.sort_values("Fecha", ascending=False).reset_index(drop=True)
    return df_mensual


def main():
    os.makedirs(CARPETA_SALIDA, exist_ok=True)

    archivos = glob.glob(os.path.join(CARPETA_ENTRADA, "*.csv"))
    print(f"Encontrados {len(archivos)} archivos CSV en {CARPETA_ENTRADA}\n")

    ok, err = 0, 0
    for ruta in archivos:
        nombre = os.path.basename(ruta)
        print(f"Procesando: {nombre}")

        df_mes = procesar_csv(ruta)
        if df_mes is None or df_mes.empty:
            print("  -> sin datos válidos, se omite\n")
            err += 1
            continue

        salida = os.path.join(CARPETA_SALIDA, nombre)
        df_mes.to_csv(salida, index=False)
        print(f"  -> {len(df_mes)} meses guardados en {salida}\n")
        ok += 1

    print(f"LISTO. OK: {ok}  |  Errores/omitidos: {err}")


if __name__ == "__main__":
    main()