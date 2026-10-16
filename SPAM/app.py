from flask import Flask, render_template, jsonify, request
import pandas as pd
import os
import requests
from datetime import datetime
import sqlite3
import json
from py.smc.fvg import fvg_bp
from py.smc.liquidez import liquidez_bp
from py.smc.zonas_sn import zonas_sn_bp
from py.smc.estructura import estructura_bp
from py.pivote.pivotes_densidad import pivotes_densidad_bp
from py.ordenes.book_bd import book_bp
from py.ordenes.delta_bd import delta_bp
from py.ordenes.precios import csv_bp
from py.ordenes.delta_book import niveles_ordenes_bp
from py.basededatos.lineas_bd import lineas_bp
from py.ordenes.profundidad import libro_profundidad_bp  # (dependiendo de la ruta donde guardes el archivo .py)

# Y en el registro de blueprints:


# Y lo registras junto al resto

app = Flask(__name__)
RUTA_BASE = "static/precios"

#grafica de linea
app.register_blueprint(csv_bp)
#smc======================================
app.register_blueprint(fvg_bp)
app.register_blueprint(liquidez_bp)
app.register_blueprint(zonas_sn_bp)
app.register_blueprint(estructura_bp)
#ordenflouw=========================================
app.register_blueprint(book_bp)
app.register_blueprint(delta_bp)
app.register_blueprint(niveles_ordenes_bp)
app.register_blueprint(libro_profundidad_bp)
#pivote=================================
app.register_blueprint(pivotes_densidad_bp)
#guardar dibujos en base de datos====================00
#app.register_blueprint(lineas_bp)


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/acciones')
def index2():
    return render_template('index2.html')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=7500, debug=True)