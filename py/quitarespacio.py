# -*- coding: utf-8 -*-
"""
Encadena la apertura de cada fila con el cierre de la fila anterior.

Regla:
    Apert.[i] = Cierre[i-1]   (para i >= 1, en orden cronológico ascendente)

Recalcula:
    Abs.    = Cierre - Apert.
    Rel.(%) = (Abs. / Apert.) * 100

NO toca:
    Fecha, Cierre, Max., Min., Operaciones, VOLUMEN, Efectivo

Se aplica a las 3 carpetas eurolizadas.
"""

import os
import glob
import pandas as pd

# ============ CONFIG ============
CARPETAS = [
    r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro",
    r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro_W",
    r"C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro_M",
]
# Si quieres sobreescribir los mismos archivos, deja SALIDA = None.
# Si quieres guardar en otra carpeta, pon la ruta correspondiente por cada entrada.
# Ejemplo:
# CARPETAS = [
#     (r"...\acciones_euro",   r"...\acciones_euro_enc"),
#     (r"...\acciones_euro_W", r"...\acciones_euro_W_enc"),
#     (r"...\acciones_euro_M", r"...\acciones_euro_M_enc"),
# ]
# ================================


def encadenar(df):
    """
    Recibe un DataFrame con columnas ['Fecha', 'Apert.', 'Cierre', ...]
    Devuelve el mismo DataFrame con Apert. encadenada al Cierre anterior.
    """
    # Ordenar cronológicamente ASCENDENTE para encadenar
    df = df.sort_values('Fecha', ascending=True).reset_index(drop=True)

    # Asegurar tipos numéricos
    df['Apert.'] = pd.to_numeric(df['Apert.'], errors='coerce')
    df['Cierre'] = pd.to_numeric(df['Cierre'], errors='coerce')

    # Encadenar: Apert.[i] = Cierre[i-1]
    # La primera fila conserva su apertura original
    df['Apert.'] = df['Apert.'].where(df.index == 0,
                                      df['Cierre'].shift(1))

    # Recalcular Abs. y Rel.(%)
    df['Abs.'] = (df['Cierre'] - df['Apert.']).round(4)
    df['Rel.(%)'] = ((df['Abs.'] / df['Apert.']) * 100).round(2)

    # Devolver en orden DESCENDENTE (más reciente arriba) como el original
    df = df.sort_values('Fecha', ascending=False).reset_index(drop=True)
    return df


def main():
    for carpeta in CARPETAS:
        print("=" * 60)
        print(f"CARPETA: {carpeta}")

        if not os.path.isdir(carpeta):
            print("  [SKIP] no existe\n")
            continue

        archivos = glob.glob(os.path.join(carpeta, "*.csv"))
        print(f"  Encontrados {len(archivos)} CSV\n")

        ok, err = 0, 0
        for ruta in archivos:
            nombre = os.path.basename(ruta)
            try:
                df = pd.read_csv(ruta, dtype=str, encoding='utf-8-sig')
                df.columns = [c.strip().replace('"', '') for c in df.columns]

                if 'Fecha' not in df.columns or 'Apert.' not in df.columns or 'Cierre' not in df.columns:
                    print(f"  [SKIP] {nombre}: faltan columnas Fecha/Apert./Cierre")
                    err += 1
                    continue

                df_enc = encadenar(df)
                df_enc.to_csv(ruta, index=False)   # Sobreescribe
                print(f"  OK  {nombre}  -> {len(df_enc)} filas encadenadas")
                ok += 1

            except Exception as e:
                print(f"  [ERROR] {nombre}: {e}")
                err += 1

        print(f"\n  RESUMEN: OK={ok} | Errores={err}\n")

    print("LISTO.")


if __name__ == "__main__":
    main()