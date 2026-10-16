import pandas as pd

def ajustar_bache_historico(ruta_archivo, fecha_limite_corte, factor_ajuste):
    df = pd.read_csv(ruta_archivo)

    if 'Fecha' not in df.columns:
        print("❌ Error: No se encontró la columna 'Fecha'.")
        return

    df['Fecha_dt'] = pd.to_datetime(df['Fecha'], errors='coerce')
    corte = pd.to_datetime(fecha_limite_corte)

    mascara_ajustar = df['Fecha_dt'] <= corte

    cols_a_modificar = ['Apert.', 'Cierre', 'Max.', 'Min.', 'Abs.']

    for col in cols_a_modificar:
        if col in df.columns:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False)
            df[col] = pd.to_numeric(df[col], errors='coerce')
            df.loc[mascara_ajustar, col] = df.loc[mascara_ajustar, col] / factor_ajuste

    df.drop(columns=['Fecha_dt'], inplace=True)

    for col in cols_a_modificar:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: f"{round(x, 6):.10f}".rstrip('0').rstrip('.') if pd.notnull(x) else x)

    df.to_csv(ruta_archivo, index=False, sep=',', encoding='utf-8-sig')
    print(f"✅ Ajuste aplicado desde {fecha_limite_corte} hacia atrás con factor {factor_ajuste:.4f}")


if __name__ == "__main__":
    archivo_objetivo = r'C:\Users\roble\Desktop\bolsa\static\csv\acciones\BVCC.csv'

    # Ajuste entre el 2021-05-11 (último día viejo) y el 2021-05-17 (primer día nuevo)
    FECHA_CORTE = '2021-05-11'
    FACTOR = 0.684021 / 0.415013   # ≈ 1.6482

    ajustar_bache_historico(archivo_objetivo, FECHA_CORTE, FACTOR)