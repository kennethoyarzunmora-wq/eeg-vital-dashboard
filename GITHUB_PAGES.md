# Publicacion en GitHub Pages

Este dashboard puede publicarse como frontend estatico en GitHub Pages. La carga de archivos `.json` funciona directamente en GitHub Pages. La carga directa de `.vital` requiere un servidor Python externo, porque GitHub Pages no ejecuta Python ni puede decodificar `.vital` desde el navegador.

## Opcion recomendada

1. Crea un repositorio nuevo en GitHub, por ejemplo `eeg-vital-dashboard`.
2. Sube el contenido de esta carpeta como raiz del repositorio.
3. En GitHub, entra a `Settings > Pages`.
4. En `Build and deployment`, selecciona `GitHub Actions`.
5. Haz push a la rama `main`.
6. El workflow `.github/workflows/pages.yml` publicara el dashboard.

## Uso con archivos .vital desde GitHub Pages y Python publico

1. Publica el backend Python del repositorio en Render, Railway, Fly.io u otro servicio compatible con Python.
2. Si usas Render, puedes usar `render.yaml` incluido en el repositorio.
3. Configuracion manual equivalente:

```bash
pip install -r requirements.txt
gunicorn server:app --timeout 300 --workers 1
```

4. Abre la pagina publica de GitHub Pages.
5. En `Servidor Python`, pega la URL HTTPS del backend, por ejemplo:

```text
https://eeg-vital-dashboard-api.onrender.com
```

6. Presiona `Guardar servidor`.
7. Carga el `.vital`. La pagina enviada por GitHub Pages mandara el archivo a Python y cargara el JSON convertido automaticamente.

## Uso local con archivos .vital

1. En el PC del operador instala dependencias:

```bash
pip install -r requirements.txt
```

2. Inicia el servidor local:

```bash
python server.py
```

3. Abre la URL de GitHub Pages.
4. En `Servidor Python`, usa `http://127.0.0.1:8765`.
5. Carga el `.vital`.

## Uso sin backend

Para usarlo sin servidor local, convierte antes el `.vital` a JSON:

```bash
python vital_to_json.py registro.vital -o registro-dashboard.json --fs 128
```

Luego sube el JSON desde la pagina publicada.
