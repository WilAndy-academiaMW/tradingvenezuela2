import requests
import json

url = "https://www.bolsadecaracas.com/wp-admin/admin-ajax.php"
payload = {
    "action": "getSimbolosDetalle",
    "simbolo": "BPV",
    "tipo": "rv"
}
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.bolsadecaracas.com/resumen-mercado/"
}

response = requests.post(url, data=payload, headers=headers)
if response.status_code == 200:
    res = response.json().get('response', {})
    
    print("--- CONTENIDO DE cur_det_vol_dia_rv ---")
    print(json.dumps(res.get('cur_det_vol_dia_rv', []), indent=4))
    
    print("\n--- MUESTRA DE cur_grf_sesion_rv (Primeros 3 elementos) ---")
    print(json.dumps(res.get('cur_grf_sesion_rv', [])[:3], indent=4))