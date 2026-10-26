param([string]$WebBuild = "")

$ErrorActionPreference = 'Stop'

# Sólo analiza archivos. Nunca abre el HTML ni ejecuta el contenido del ZIP.
$sampleCommit = '6ce0b0a33961c5e12cbb474e964dcf9c91827665'
$sampleRelativePath = 'descargas/Unirack-Studio.zip'
$expectedHash = 'aee820f7fa85dbe99a1f331bc972e890a93a174e0cb52f0edc8b8b514dfb948b'
$sampleDirectory = Join-Path $env:RUNNER_TEMP 'unirack-defender-review'
New-Item -ItemType Directory -Force -Path $sampleDirectory | Out-Null
$sampleZip = Join-Path $sampleDirectory 'Unirack-Studio.zip'

# La redirección binaria se hace desde Python para conservar exactamente el ZIP.
$env:UNIRACK_REVIEW_SAMPLE = $sampleZip
$env:UNIRACK_REVIEW_COMMIT = $sampleCommit
$env:UNIRACK_REVIEW_PATH = $sampleRelativePath
@'
import os, subprocess, hashlib, zipfile
from pathlib import Path
p = Path(os.environ['UNIRACK_REVIEW_SAMPLE'])
data = subprocess.check_output(['git', 'show', os.environ['UNIRACK_REVIEW_COMMIT'] + ':' + os.environ['UNIRACK_REVIEW_PATH']])
expected = 'aee820f7fa85dbe99a1f331bc972e890a93a174e0cb52f0edc8b8b514dfb948b'
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('La muestra no coincide con la huella registrada.')
p.write_bytes(data)
with zipfile.ZipFile(p) as archive:
    if set(archive.namelist()) != {'Unirack-Studio.html', 'LEEME.txt'}:
        raise SystemExit('Contenido inesperado en el ZIP; se cancela la extracción.')
    if sum(item.file_size for item in archive.infolist()) > 10_000_000:
        raise SystemExit('Tamaño inesperado; se cancela la extracción.')
    archive.extractall(p.parent / 'contenido')
print('Muestra preservada y extraída para escaneo estático; no se ejecutó su contenido.')
'@ | python -
if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la muestra de forma verificable.' }

if ((Get-FileHash $sampleZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) {
    throw 'La huella del archivo cambió. No se continúa.'
}

if ($WebBuild) {
    if (-not (Test-Path (Join-Path $WebBuild 'index.html'))) { throw 'Falta la compilación web; no se analiza ni entrega.' }
    Copy-Item $WebBuild (Join-Path $sampleDirectory 'web') -Recurse
}

$evidence = @(Get-ChildItem $sampleDirectory -Recurse -File | Get-FileHash -Algorithm SHA256)
if ($evidence.Count -lt 3 -or ($WebBuild -and $evidence.Count -lt 4)) { throw 'Faltan archivos esperados. No se declara aprobada la muestra.' }

$status = Get-MpComputerStatus
if (-not $status.AMServiceEnabled -or -not $status.AntivirusEnabled) {
    throw 'Microsoft Defender no está disponible o activo en este runner. No hay resultado de antivirus.'
}

$scanner = Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe'
$platformRoot = Join-Path $env:ProgramData 'Microsoft\Windows Defender\Platform'
if (Test-Path $platformRoot) {
    $newest = Get-ChildItem $platformRoot -Directory | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($newest -and (Test-Path (Join-Path $newest.FullName 'MpCmdRun.exe'))) {
        $scanner = Join-Path $newest.FullName 'MpCmdRun.exe'
    }
}
if (-not (Test-Path $scanner)) { throw 'No se encontró MpCmdRun.exe. No hay resultado de antivirus.' }

& $scanner -SignatureUpdate
if ($LASTEXITCODE -ne 0) { throw "No se pudieron actualizar las firmas: código $LASTEXITCODE. No se declara aprobada la muestra." }
$status = Get-MpComputerStatus
Write-Output "SHA-256: $expectedHash"
Write-Output "Motor: $($status.AMEngineVersion)"
Write-Output "Firmas: $($status.AntivirusSignatureVersion)"
Write-Output "Actualización de firmas: $($status.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o'))"

# DisableRemediation permite conservar la evidencia, sin permitir ni ejecutar el
# archivo. Un hallazgo NO se remedia silenciosamente para acabar con código cero.
# Según MpCmdRun, cualquier código distinto de 0 se trata como fallo de entrega.
& $scanner -Scan -ScanType 3 -File $sampleDirectory -DisableRemediation
$scanExit = $LASTEXITCODE
if ($scanExit -ne 0) {
    "## Entrega bloqueada`n`nDefender devolvió código $scanExit. La muestra no se aprueba ni se publica." | Add-Content $env:GITHUB_STEP_SUMMARY
    throw "Defender detectó una amenaza o no completó el análisis (código $scanExit). Revisar el registro."
}

foreach ($item in $evidence) {
    if (-not (Test-Path $item.Path) -or (Get-FileHash $item.Path -Algorithm SHA256).Hash -ne $item.Hash) {
        throw 'Un archivo fue retirado, puesto en cuarentena o modificado durante el análisis. No se declara aprobada la muestra.'
    }
}

$report = [ordered]@{
    status = 'scan-completed-no-detection'
    scannedAtUtc = [DateTime]::UtcNow.ToString('o')
    workflowRun = "https://github.com/$env:GITHUB_REPOSITORY/actions/runs/$env:GITHUB_RUN_ID"
    sourceCommit = $env:GITHUB_SHA
    originalZipSha256 = $expectedHash
    engineVersion = $status.AMEngineVersion
    signatureVersion = $status.AntivirusSignatureVersion
    signatureUpdatedUtc = $status.AntivirusSignatureLastUpdated.ToUniversalTime().ToString('o')
    scannerExitCode = $scanExit
    files = @($evidence | ForEach-Object { [ordered]@{ path = [System.IO.Path]::GetRelativePath($sampleDirectory, $_.Path); sha256 = $_.Hash.ToLowerInvariant() } })
    limitation = 'Resultado limitado a estos archivos, motor y firmas. No garantiza ausencia de malware ni el mismo resultado en otros equipos. La alerta original del usuario no se considera un falso positivo confirmado.'
}
$report | ConvertTo-Json -Depth 5 | Set-Content (Join-Path $env:RUNNER_TEMP 'defender-review.json') -Encoding utf8

@"
## Resultado del análisis

- SHA-256 del ZIP: ``$expectedHash``
- Motor de Defender: $($status.AMEngineVersion)
- Firmas: $($status.AntivirusSignatureVersion)
- Fin del análisis (UTC): $([DateTime]::UtcNow.ToString('o'))
- MpCmdRun: código 0, sin detección no remediada en esta ejecución.

Este resultado se limita a la muestra, motor y firmas indicados. No demuestra ausencia absoluta de malware ni promete el mismo resultado en otros equipos. Este flujo no publica archivos ni despliega la aplicación; el estado de la investigación debe revisarse antes de una entrega.
"@ | Add-Content $env:GITHUB_STEP_SUMMARY
