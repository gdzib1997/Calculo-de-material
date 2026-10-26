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

# Se crea una rama nueva, sin modificar main ni forzar referencias existentes.
# gh utiliza GH_TOKEN como autenticación de GitHub Actions sin imprimir su valor.
& gh auth setup-git --hostname github.com
if ($LASTEXITCODE -ne 0) { throw 'No se pudo configurar la autenticación del runner.' }
& git -C $destination init --initial-branch=gh-pages
if ($LASTEXITCODE -ne 0) { throw 'No se pudo inicializar la rama del sitio.' }
& git -C $destination config user.name 'github-actions[bot]'
& git -C $destination config user.email '41898282+github-actions[bot]@users.noreply.github.com'
& git -C $destination remote add origin "https://github.com/$env:GITHUB_REPOSITORY.git"
& git -C $destination add .
& git -C $destination commit -m "Publicar compilación web analizada con Defender ($env:GITHUB_SHA)"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo guardar la compilación analizada.' }
& git -C $destination push origin HEAD:refs/heads/gh-pages
if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar la rama. No se sobrescribieron referencias remotas.' }
