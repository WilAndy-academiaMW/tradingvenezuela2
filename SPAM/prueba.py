import pandas as pd

ruta = r"C:\Users\roble\Desktop\bolsa\PCP_B.csv"

# Leer con , y saltar líneas mal formadas (las que tienen doble ,,)
df = pd.read_csv(ruta, sep=",", skipinitialspace=True)

# Eliminar columnas completamente vacías que hayan quedado por las dobles comas
df = df.dropna(axis=1, how="all")

# Eliminar filas vacías
df = df.dropna(how="all")

# Guardar limpio
df.to_csv(ruta, sep=",", index=False)

print("Listo. Archivo limpio.")
print(df)