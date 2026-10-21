import pandas as pd

def estandarizar_fechas_y_convertir(ruta_excel, ruta_csv):
    # 1. Leer el archivo (si es .csv usa read_csv, si es .xlsx usa read_excel)
    if ruta_excel.endswith('.csv'):
        df = pd.read_csv(ruta_excel)
    else:
        df = pd.read_excel(ruta_excel)
    
    if 'Fecha' not in df.columns:
        print("Error: No se encontró la columna 'Fecha' en el archivo.")
        return

    # 2. Función robusta para convertir cualquier formato de fecha a 'YYYY-MM-DD'
    def limpiar_fecha(valor):
        if pd.isna(valor):
            return valor
        
        # Convertir a string y limpiar espacios
        val_str = str(valor).strip()
        
        # Si ya viene con hora (ej. '2026-09-03 00:00:00'), cortamos la hora
        if ' ' in val_str:
            val_str = val_str.split(' ')[0]
            
        # Intentar parseo automático de pandas
        try:
            dt = pd.to_datetime(val_str, errors='coerce', dayfirst=False)
            if pd.notnull(dt):
                return dt.strftime('%Y-%m-%d')
        except:
            pass
            
        # Mapeo de meses en español o inglés comunes
        meses = {
            'ene': '01', 'feb': '02', 'mar': '03', 'abr': '04', 'may': '05', 'jun': '06',
            'jul': '07', 'ago': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dic': '12',
            'jan': '01', 'apr': '04', 'aug': '08', 'oct': '10', 'dec': '12'
        }
        
        for k, v in meses.items():
            if k in val_str.lower():
                val_str_lower = val_str.lower().replace(k, v)
                dt2 = pd.to_datetime(val_str_lower, errors='coerce')
                if pd.notnull(dt2):
                    return dt2.strftime('%Y-%m-%d')
                    
        return val_str

    # 3. Aplicar la limpieza a toda la columna Fecha
    df['Fecha'] = df['Fecha'].apply(limpiar_fecha)

    # 4. Guardar el resultado en formato CSV limpio
    df.to_csv(ruta_csv, index=False, sep=',', encoding='utf-8-sig')
    
    print(f"¡Fechas estandarizadas y archivo convertido con éxito!")
    print(f"Guardado en: {ruta_csv}")
    print("\nPrimeras filas del resultado:")
    print(df.head(5))

if __name__ == "__main__":
    # --- CONFIGURACIÓN DE RUTAS ---
    # Usamos la 'r' antes de la comilla para que Windows lea bien las barras invertidas (\)
    archivo_entrada = r'C:\Users\roble\Desktop\bolsa\FNC.csv'  
    archivo_salida = r'C:/Users/roble/Desktop/bolsa/static/csv/acciones/FNC.csv'
    
    estandarizar_fechas_y_convertir(archivo_entrada, archivo_salida)