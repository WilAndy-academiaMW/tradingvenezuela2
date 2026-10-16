import yfinance as yf
import pandas as pd

# El ticker para USD/VES en Yahoo Finance
TICKER = "USDVES=X"

def descargar_historico_usd_ves(ruta_salida, periodo="max", intervalo="1d"):
    """
    Descarga el histórico de USD/VES desde Yahoo Finance.
    """
    print(f"Descargando {TICKER}...")
    data = yf.download(TICKER, period=periodo, interval=intervalo, progress=False)

    if data.empty:
        print("❌ No se obtuvieron datos. Revisa el ticker o tu conexión.")
        return

    # Aplanar columnas si vienen en multi-index
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    # Resetear índice para que la fecha sea una columna
    data = data.reset_index()

    # Formatear fecha a YYYY-MM-DD
    data['Date'] = pd.to_datetime(data['Date']).dt.strftime('%Y-%m-%d')

    # Seleccionar y renombrar columnas al formato de tu CSV
    data = data[['Date', 'Open', 'High', 'Low', 'Close', 'Volume']]
    data.columns = ['Fecha', 'Apert.', 'Max.', 'Min.', 'Cierre', 'VOLUMEN']

    # Guardar
    data.to_csv(ruta_salida, index=False, encoding='utf-8-sig')
    print(f"✅ Guardado en: {ruta_salida}")
    print(f"   Filas: {len(data)}")
    print(f"   Rango: {data['Fecha'].iloc[0]} → {data['Fecha'].iloc[-1]}")


if __name__ == "__main__":
    ruta = r'C:\Users\roble\Desktop\bolsa\static\csv\divisas\USD_VES.csv'
    descargar_historico_usd_ves(ruta, periodo="max", intervalo="1d")