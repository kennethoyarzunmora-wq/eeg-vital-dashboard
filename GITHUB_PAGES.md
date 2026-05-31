# Publicacion en GitHub Pages

Este dashboard puede publicarse como frontend estatico en GitHub Pages. La carga de archivos `.json` funciona directamente en GitHub Pages. La carga directa de `.vital` requiere ejecutar `python server.py` en el computador del operador, porque GitHub Pages no ejecuta Python ni puede decodificar `.vital` desde el navegador.

## Opcion recomendada

1. Crea un repositorio nuevo en GitHub, por ejemplo `eeg-vital-dashboard`.
2. Sube el contenido de esta carpeta como raiz del repositorio.
3. En GitHub, entra a `Settings > Pages`.
4. En `Build and deployment`, selecciona `GitHub Actions`.
5. Haz push a la rama `main`.
6. El workflow `.github/workflows/pages.yml` publicara el dashboard.

## Uso con archivos .vital desde GitHub Pages

1. En el PC del operador instala dependencias:

```bash
pip install -r requirements.txt
```

2. Inicia el servidor local:

```bash
python server.py
```

3. Abre la URL de GitHub Pages.
4. Carga el `.vital`. La pagina publicada intentara enviar el archivo a `http://127.0.0.1:8765` para convertirlo localmente.

## Uso 100% web

Para usarlo sin servidor local, convierte antes el `.vital` a JSON:

```bash
python vital_to_json.py registro.vital -o registro-dashboard.json --fs 128
```

Luego sube el JSON desde la pagina publicada.
