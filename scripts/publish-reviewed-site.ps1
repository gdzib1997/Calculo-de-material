$ErrorActionPreference = 'Stop'
$reportPath = Join-Path $env:RUNNER_TEMP 'defender-review.json'
if (-not (Test-Path $reportPath)) { throw 'No hay informe de Defender. No se publica.' }
$report = Get-Content $reportPath -Raw | ConvertFrom-Json
if ($report.status -ne 'scan-completed-no-detection' -or $report.scannerExitCode -ne 0 -or $report.sourceCommit -ne $env:GITHUB_SHA) {
    throw 'El informe no aprueba esta ejecución. No se publica.'
}

$destination = Join-Path $env:RUNNER_TEMP 'reviewed-site'
New-Item -ItemType Directory -Force $destination | Out-Null
Copy-Item 'dist/*' $destination -Recurse
Copy-Item $reportPath (Join-Path $destination 'defender-review.json')
New-Item -ItemType File (Join-Path $destination '.nojekyll') | Out-Null
# Comprueba que cada archivo web publicado coincide con la muestra analizada.
$webFiles = @($report.files | Where-Object { $_.path -match '^web[\\/]' })
if ($webFiles.Count -lt 2) { throw 'El informe no contiene la compilación web.' }
foreach ($item in $webFiles) {
    $relative = $item.path -replace '^web[\\/]', ''
    $file = Join-Path $destination $relative
    if (-not (Test-Path $file) -or (Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant() -ne $item.sha256) {
        throw 'Un archivo web cambió después del escaneo. Se cancela la publicación.'
    }
}

# Actualiza sólo la rama generada del sitio, conservando archivos ajenos al build y sin forzar referencias.
# gh utiliza GH_TOKEN como autenticación de GitHub Actions sin imprimir su valor.
& gh auth setup-git --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar la autenticación del runner.' }
& git -C $destination init --initial-branch=gh-pages
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inicializar la rama del sitio.' }
& git -C $destination config user.name 'github-actions[bot]'
& git -C $destination config user.email '41898282+github-actions[bot]@users.noreply.github.com'
& git -C $destination remote add origin "https://github.com/$env:GITHUB_REPOSITORY.git"
& git -C $destination ls-remote --exit-code --heads origin refs/heads/gh-pages | Out-Null
$remoteExists = $LASTEXITCODE
if ($remoteExists -eq 0) {
    & git -C $destination fetch --depth 1 origin refs/heads/gh-pages
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo obtener la rama existente. No se sobrescribe.' }
    $env:UNIRACK_SITE_DESTINATION = $destination
    @'
import json, os, subprocess
from pathlib import Path
root=Path(os.environ['UNIRACK_SITE_DESTINATION'])
def git(*args): return subprocess.check_output(['git','-C',str(root),*args])
old=json.loads(git('show','FETCH_HEAD:defender-review.json').decode('utf-8-sig'))
if old.get('status')!='scan-completed-no-detection':
    raise SystemExit('La rama existente no tiene un informe reconocido. Se conserva sin modificar.')
owned={f['path'].replace('\\','/')[4:] for f in old.get('files',[]) if f['path'].replace('\\','/').startswith('web/')}
owned.update({'.nojekyll','defender-review.json'})
for name in git('ls-tree','-r','--name-only','FETCH_HEAD').decode().splitlines():
    if name in owned: continue
    target=(root/name).resolve()
    if not target.is_relative_to(root.resolve()) or target.exists():
        raise SystemExit('Conflicto con archivo ajeno al build: '+name)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(git('show','FETCH_HEAD:'+name))
'@ | python -
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preservar el contenido existente.' }
    & git -C $destination reset --mixed FETCH_HEAD
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar una actualización fast-forward.' }
} elseif ($remoteExists -ne 2) {
    throw 'No se pudo comprobar la existencia de la rama. No se sobrescribe.'
}
& git -C $destination add -A
& git -C $destination commit -m "Publicar compilación web analizada con Defender ($env:GITHUB_SHA)"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar la compilación analizada.' }
& git -C $destination push origin HEAD:refs/heads/gh-pages
if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar la rama. No se sobrescribieron referencias remotas.' }
