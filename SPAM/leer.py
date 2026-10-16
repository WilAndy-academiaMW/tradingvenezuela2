import requests
import time

BASE = "http://185.217.125.181:5000"

# Símbolos de prueba: los que tenías + uno con punto + uno raro
SIMBOLOS = ["BNC", "BPV", "ABC.A", "BVCC", "TDV.D"]


def probar_resumen():
    print("=" * 70)
    print("1️⃣  /api/resumen")
    print("=" * 70)
    try:
        t0 = time.time()
        r = requests.get(f"{BASE}/api/resumen", timeout=10)
        dt = (time.time() - t0) * 1000
        print(f"   Status: {r.status_code}  ({dt:.0f} ms)")
        if r.status_code == 200:
            data = r.json()
            print(f"   Total símbolos: {data.get('total_simbolos')}")
            for m in data.get("mercado", [])[:3]:
                print(f"   - {m['simbolo']:8s}  ${m['precio_ult']}")
    except Exception as e:
        print(f"   💥 {type(e).__name__}: {e}")


def probar_vela_delta(simbolo):
    print("-" * 70)
    print(f"2️⃣  /api/vela-delta/{simbolo}")
    print("-" * 70)
    try:
        t0 = time.time()
        r = requests.get(f"{BASE}/api/vela-delta/{simbolo}", timeout=15)
        dt = (time.time() - t0) * 1000
        print(f"   Status: {r.status_code}  ({dt:.0f} ms)")

        if r.status_code == 200:
            data = r.json()
            velas = data.get("velas_delta", [])
            print(f"   ✅ {len(velas)} velas recibidas")
            if velas:
                print(f"   Primera vela:")
                for k, v in velas[0].items():
                    print(f"      {k:18s} = {v}")
                print(f"   Última vela:")
                for k, v in velas[-1].items():
                    print(f"      {k:18s} = {v}")
        else:
            print(f"   ❌ Body: {r.text[:300]}")

    except requests.exceptions.Timeout:
        print(f"   ⏱️ Timeout — el servidor no respondió en 15s")
    except Exception as e:
        print(f"   💥 {type(e).__name__}: {e}")


if __name__ == "__main__":
    print()
    probar_resumen()
    print()
    for sym in SIMBOLOS:
        probar_vela_delta(sym)
    print("=" * 70)
    print("✅ Pruebas terminadas")