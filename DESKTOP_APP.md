# EEG Local Analyzer Desktop

MVP de escritorio para Windows. Conserva el dashboard actual, ejecuta Python localmente, abre una ventana propia con `pywebview` y guarda casos en SQLite.

## Arquitectura elegida

Opcion final: Python + Flask + pywebview + SQLite + PyInstaller.

Motivos:

- reutiliza la app HTML/CSS/JS existente;
- mantiene la decodificacion `.vital` con Python/VitalDB;
- funciona local y offline;
- evita mantener Electron/Tauri/Rust/Node como segunda pila;
- permite crear `.exe` con PyInstaller y un instalador con Inno Setup.

## Estructura nueva

- `desktop_app.py`: abre la app como programa de escritorio.
- `local_store.py`: base SQLite local y almacenamiento de archivos importados.
- `requirements-desktop.txt`: dependencias de escritorio/build.
- `run_desktop_dev.bat`: instala dependencias y abre la app en modo desarrollo.
- `build_windows_exe.bat`: genera el `.exe` con PyInstaller.
- `installer_inno.iss`: script opcional para crear instalador Windows.
- `vendor/plotly-2.35.2.min.js`: Plotly local para uso offline.

## Base de datos

La base se guarda en:

```text
%LOCALAPPDATA%\EEG Local Analyzer\eeg_cases.sqlite3
```

Tambien se guardan copias locales:

```text
%LOCALAPPDATA%\EEG Local Analyzer\imports
%LOCALAPPDATA%\EEG Local Analyzer\analyses
```

Tabla principal `cases`:

- `id`
- `patient_code`
- `procedure_date`
- `surgery_type`
- `hospital`
- `anesthesia_type`
- `source_file_name`
- `source_file_path`
- `analysis_json_path`
- `comments`
- `created_at`
- `updated_at`

## Probar en desarrollo

Ejecuta:

```bat
run_desktop_dev.bat
```

La app abre una ventana propia. En esta version MVP:

1. Ingresa datos basicos del caso.
2. Presiona `Cargar archivo`.
3. Selecciona `.vital`, `.json` o `.csv`.
4. El archivo se procesa localmente.
5. El caso queda guardado en SQLite.
6. Puedes reabrirlo desde `Casos guardados`.
7. Puedes guardar comentarios clinicos.

## Crear el .exe portable

Ejecuta:

```bat
build_windows_exe.bat
```

Salida:

```text
dist\EEG Local Analyzer\EEG Local Analyzer.exe
```

## Crear instalador Windows

1. Instala Inno Setup.
2. Ejecuta primero `build_windows_exe.bat`.
3. Abre `installer_inno.iss` con Inno Setup.
4. Presiona `Compile`.

Salida esperada:

```text
installer\EEG_Local_Analyzer_Setup.exe
```

## Plan de migracion

1. MVP actual: ventana local + importacion + SQLite + historial.
2. Agregar exportacion PDF con captura de graficos.
3. Agregar borrado seguro de casos desde la interfaz.
4. Mejorar importacion CSV/EDF.
5. Agregar instalador firmado y versionado.
