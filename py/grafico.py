import requests

url = "https://www.bolsadecaracas.com/wp-admin/admin-ajax.php"
payload = {"action": "getSimbolosDetalle", "simbolo": "BNC", "tipo": "rv"}
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.bolsadecaracas.com/resumen-mercado/",
}

response = requests.post(url, data=payload, headers=headers)

if response.status_code == 200:
  res = response.json().get("response", {})
  hist_precios = res.get("cur_grf_anual_pre_rv", [])

  print("--- HISTORIAL DE CIERRES (Meses Anteriores y Actual) ---")
  print(f"{'FECHA':<12} | {'PRECIO DE APERTURA':<15}")
  print("-" * 35)

  # Filtramos o mostramos los registros, por ejemplo, los últimos 30 días para ver septiembre/octubre
  for item in hist_precios[-30:]:
    print(f"{item.get('FEC'):<12} | {item.get('PRECIO_CIE'):<15} Bs")
else:
  print("Error al conectar con la API")