import requests
import json

# La URL exacta que intenta cargar tu navegador
url = "https://api.tradingvenezuela.com/api/acciones/1month/ves/ABC_A?limit=500&offset=0"

try:
    # Hacemos la petición como si fuéramos un navegador
    response = requests.get(url, timeout=10)
    
    print(f"Código de estado: {response.status_code}")
    print(f"Cabeceras de CORS: {response.headers.get('Access-Control-Allow-Origin', 'NO PRESENTE')}")
    print("-" * 50)
    
    if response.status_code == 200:
        print("✅ ¡La API responde correctamente desde tu PC!")
        data = response.json()
        print(f"Datos recibidos: {len(data.get('datos', []))} registros.")
        print("Primer registro:", json.dumps(data['datos'][0], indent=2))
    else:
        print(f"❌ Error del servidor: {response.status_code}")
        print(response.text[:500])

except requests.exceptions.RequestException as e:
    print(f"❌ Error de conexión: {e}")
    print("Esto significa que tu PC no puede llegar al servidor (Nginx o Cloudflare están bloqueando).")