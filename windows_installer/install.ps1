$ErrorActionPreference = "Stop"

$appName = "EEG Local Analyzer"
$installRoot = Join-Path $env:LOCALAPPDATA "Programs"
$installDir = Join-Path $installRoot $appName
$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "$appName.lnk"
$startMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) $appName
$startMenuShortcut = Join-Path $startMenuDir "$appName.lnk"
$packagePath = Join-Path $PSScriptRoot "app.zip"

New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
New-Item -ItemType Directory -Force -Path $startMenuDir | Out-Null

if (Test-Path $installDir) {
  Remove-Item -LiteralPath $installDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $installDir | Out-Null
Expand-Archive -LiteralPath $packagePath -DestinationPath $installDir -Force

$exePath = Join-Path $installDir "EEG Local Analyzer.exe"
if (!(Test-Path $exePath)) {
  throw "No se encontro el ejecutable instalado: $exePath"
}

$shell = New-Object -ComObject WScript.Shell

$desktop = $shell.CreateShortcut($desktopShortcut)
$desktop.TargetPath = $exePath
$desktop.WorkingDirectory = $installDir
$desktop.Description = "EEG Local Analyzer"
$desktop.Save()

$startMenu = $shell.CreateShortcut($startMenuShortcut)
$startMenu.TargetPath = $exePath
$startMenu.WorkingDirectory = $installDir
$startMenu.Description = "EEG Local Analyzer"
$startMenu.Save()

Start-Process -FilePath $exePath
