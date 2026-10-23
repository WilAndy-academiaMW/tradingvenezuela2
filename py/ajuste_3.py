import pandas as pd

def ajustar_bache_historico(ruta_archivo, fecha_limite_corte, factor_ajuste):
    df = pd.read_csv(ruta_archivo)

    if 'Fecha' not in df.columns:
        print("❌ Error: No se encontró la columna 'Fecha'.")
        return

    df['Fecha_dt'] = pd.to_datetime(df['Fecha'], errors='coerce')
    corte = pd.to_datetime(fecha_limite_corte)

    # Aplicar estrictamente a las fechas ANTERIORES o IGUALES a la fecha de corte
    mascara_ajustar = df['Fecha_dt'] <= corte

    # En BPV el ajuste multiplica el precio por 100
    cols_a_modificar = ['Apert.', 'Cierre', 'Max.', 'Min.', 'Abs.']

    for col in cols_a_modificar:
        if col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')
            
            # MULTIPLICAMOS por 100
            df.loc[mascara_ajustar, col] = df.loc[mascara_ajustar, col] * factor_ajuste

    df.drop(columns=['Fecha_dt'], inplace=True)

    for col in cols_a_modificar:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: f"{round(x, 6):.10f}".rstrip('0').rstrip('.') if pd.notnull(x) else x)

    df.to_csv(ruta_archivo, index=False, sep=',', encoding='utf-8-sig')
    print(f"✅ Ajuste aplicado desde {fecha_limite_corte} hacia atrás con factor {factor_ajuste:.4f}")


if __name__ == "__main__":
    archivo_objetivo = r'C:\Users\roble\Desktop\bolsa\static\csv\acciones\BPV.csv'

    # El 16-Oct es el último día de la escala vieja.
    FECHA_CORTE = '2026-10-16'
    
    # Pasó de 99.0 a 9900.0, por lo que el factor es 100.
    FACTOR = 100.0

    ajustar_bache_historico(archivo_objetivo, FECHA_CORTE, FACTOR)