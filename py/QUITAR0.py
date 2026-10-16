import pandas as pd

RUTA = r'C:\Users\roble\Desktop\bolsa\static\csv\acciones_euro_M\BPV.csv'

df = pd.read_csv(RUTA)

for col in ['Apert.', 'Cierre', 'Max.', 'Min.', 'Abs.']:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

# Donde Min sea 0, poner el Cierre del mismo día
mask = df['Min.'] == 0
df.loc[mask, 'Min.'] = df.loc[mask, 'Cierre']

# Donde Max sea 0, poner el Cierre del mismo día
mask2 = df['Max.'] == 0
df.loc[mask2, 'Max.'] = df.loc[mask2, 'Cierre']

df.to_csv(RUTA, index=False, encoding='utf-8-sig')
print(f"✅ Min en 0 corregidos: {mask.sum()}")
print(f"✅ Max en 0 corregidos: {mask2.sum()}")