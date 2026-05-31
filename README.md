# EEG Vital Dashboard

Dashboard local en HTML, CSS, JavaScript y Python para explorar registros intraoperatorios desde archivos `.vital`. Esta herramienta no envia datos a servidores externos; el archivo se procesa en tu computador mediante un servidor local.

## Archivos

- `index.html`: interfaz principal.
- `styles.css`: tema oscuro responsive.
- `app.js`: carga de datos, graficos Plotly, marcadores y analisis automatico.
- `server.py`: servidor local para subir `.vital` y convertirlo automaticamente.
- `vital_to_json.py`: conversor reutilizable desde `.vital` a JSON compatible.
- `requirements.txt`: dependencias Python.

## Uso directo con .vital

Instala dependencias una vez:

```bash
pip install -r requirements.txt
```

Inicia el servidor local:

```bash
python server.py
```

Abre el dashboard:

<http://127.0.0.1:8765>

Luego presiona `Cargar archivo` y selecciona el `.vital`. El navegador enviara el archivo al servidor local, Python lo convertira y el dashboard mostrara DSA, bandas EEG e indices clinicos automaticamente.

En Windows tambien puedes usar doble clic en `start_dashboard.bat`; instala dependencias, abre el navegador y deja el servidor corriendo en esa ventana.

## Pantallas de PC y GitHub

La interfaz usa un layout responsive para notebook, escritorio, monitores anchos y pantallas con menor altura. Los graficos ajustan su altura con el viewport y los paneles pasan a una columna cuando el ancho no alcanza.

Puedes publicar el dashboard en GitHub Pages. Revisa `GITHUB_PAGES.md`. En GitHub Pages la carga de JSON funciona directo; para cargar `.vital` necesitas mantener corriendo `python server.py` en el PC del operador, porque la conversion usa Python/VitalDB local.

## DSA y paleta Conox

El servidor intenta usar pistas espectrales nativas del `.vital` cuando existen. Si el archivo no trae DSA nativo, reconstruye el DSA desde el EEG crudo usando `scipy.signal.spectrogram` con EEG re-muestreado a `1 / fs` segundos, no a 1 segundo. Esto evita perder contenido de frecuencia.

La potencia se normaliza por percentiles robustos para mantener contraste visual y se muestra con una paleta tipo Conox/Quantium: negro/azul oscuro para baja potencia, azul/celeste/verde para potencia intermedia, amarillo/naranjo/rojo para alta potencia y magenta/blanco para saturacion muy alta.

El operador puede ajustar en pantalla la paleta DSA, el minimo y maximo de potencia normalizada y activar `DSA limpio`. Al guardar datos del paciente, el dashboard activa `DSA limpio` automaticamente para dejar el mapa espectral sin marcadores ni sombreado encima.

## Datos clinicos manuales

El panel lateral permite registrar edad, genero, talla, peso y modelo PK-PD usado. Estos datos quedan en memoria durante la sesion y no se escriben dentro del archivo original `.vital`.

## Uso alternativo con JSON

Tambien puedes abrir `index.html` directamente y cargar un `.json` ya convertido. Si abres el HTML como archivo local y seleccionas `.vital`, la app intentara contactar `http://127.0.0.1:8765`; por eso el servidor debe estar iniciado para carga directa.

## Conversion manual opcional

```bash
python vital_to_json.py registro.vital -o registro-dashboard.json --fs 128
```

Luego carga `registro-dashboard.json` desde el boton `Cargar archivo`.

## Formato JSON esperado

```json
{
  "metadata": {
    "patient_id": "anonimized",
    "surgery_date": "",
    "start_time": "",
    "end_time": "",
    "sampling_rate": 128,
    "device": "Conox"
  },
  "time": [],
  "eeg": [],
  "dsa": {
    "frequencies": [],
    "times": [],
    "power": []
  },
  "indices": {
    "time": [],
    "qCON": [],
    "qNOX": [],
    "BSR": [],
    "EMG": [],
    "SQI": []
  },
  "events": []
}
```

`dsa.power` debe ser una matriz frecuencia x tiempo. Si viene tiempo x frecuencia, el dashboard intenta transponerla automaticamente.

## Tracks VitalDB

El conversor busca alias frecuentes:

- EEG: `Conox/EEG`, `BIS/EEG`, `EEG`, `EEG1`, `SedLine/EEG`
- qCON: `Conox/qCON`, `qCON`, `QCON`
- qNOX: `Conox/qNOX`, `qNOX`, `QNOX`
- BSR: `Conox/BSR`, `BIS/BSR`, `BSR`
- EMG: `Conox/EMG`, `BIS/EMG`, `EMG`
- SQI: `Conox/SQI`, `BIS/SQI`, `SQI`

Si tu archivo usa nombres distintos, edita `TRACK_ALIASES` en `vital_to_json.py`.

## Analisis automatico

El dashboard marca:

- predominio Delta y Alpha a partir de la potencia promedio por banda;
- posible burst suppression con `BSR >= 5`;
- riesgo de supresion con `qCON < 40`;
- riesgo de despertar con `qCON > 60`;
- aumentos de qNOX con `qNOX > 65`;
- artefactos por `EMG > 45`;
- baja calidad de senal con `SQI < 70`.

Estos umbrales son configurables en `app.js` y deben interpretarse como ayuda visual, no como diagnostico clinico.

## Privacidad

No cargues datos identificables del paciente. El conversor escribe `patient_id: "anonimized"` por defecto. Revisa cualquier metadata antes de compartir el JSON.
