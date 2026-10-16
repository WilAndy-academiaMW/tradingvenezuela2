import pandas as pd

def corregir_precision_flotante(ruta_archivo):
    # 1. Leer el archivo CSV
    if ruta_archivo.endswith('.csv'):
        df = pd.read_csv(ruta_archivo)
    else:
        df = pd.read_excel(ruta_archivo)
    
    columnas_a_limpiar = [col for col in df.columns if col != 'Fecha']
    
    def limpiar_flotante(val):
        if pd.isna(val):
            return "0"
        
        val_str = str(val).strip()
        
        try:
            num = float(val_str.replace(',', '.'))
        except ValueError:
            return val_str  # Si es texto, lo deja igual
        
        if num == 0:
            return "0"
        
        # Redondeamos a 6 decimales para eliminar el error de hardware de Python
        # (esto convierte el 0.11499999000000001 de vuelta a 0.115)
        num_redondeado = round(num, 6)
        
        # Convertir a string eliminando ceros sobrantes de la derecha y evitando notación científica
        res = f"{num_redondeado:.10f}".rstrip('0')
        
        if res.endswith('.'):
            res = res[:-1]
            
        return res

    # 2. Aplicar la limpieza a las columnas numéricas
    for col in columnas_a_limpiar:
        df[col] = df[col].apply(limpiar_flotante)

    # 3. Sobrescribir el archivo limpio
    df.to_csv(ruta_archivo, index=False, sep=',', encoding='utf-8-sig')
    
    print(f"¡Precisión flotante corregida con éxito!")
    print(f"Archivo actualizado en: {ruta_archivo}")
    print("\nPrimeras filas del resultado:")
    print(df.head(5))

if __name__ == "__main__":
    # --- CONFIGURACIÓN DE RUTA ---
    archivo_objetivo = r'C:\Users\roble\Desktop\bolsa\static\csv\acciones\BPV.csv'  
    
    corregir_precision_flotante(archivo_objetivo)