$ErrorActionPreference = 'Stop'
$chrome = @(
  (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
  (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
  $env:CHROMIUM_PATH = $chrome
} else {
  & npx playwright install chromium
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el navegador de pruebas.' }
  Remove-Item Env:CHROMIUM_PATH -ErrorAction SilentlyContinue
}
$env:PLAYWRIGHT_JSON_OUTPUT_NAME = Join-Path $env:RUNNER_TEMP 'unirack-desktop-tests.json'
& npx playwright test --config playwright.desktop.config.ts --reporter=line,json
$testExit = $LASTEXITCODE
if ($testExit -ne 0) {
@'
import json, os
from pathlib import Path
p=Path(os.environ['PLAYWRIGHT_JSON_OUTPUT_NAME'])
if p.exists():
    report=json.loads(p.read_text(encoding='utf-8-sig'))
    def walk(node):
        if isinstance(node,dict):
            for item in node.get('errors',[]):
                if isinstance(item,dict):
                    message=item.get('message') or item.get('value') or str(item)
                    message=message.replace('%','%25').replace('\r','%0D').replace('\n','%0A')
                    print('::error title=Prueba PC::'+message[:8000])
            for key,value in node.items():
                if key!='errors': walk(value)
        elif isinstance(node,list):
            for item in node: walk(item)
    walk(report)
'@ | python -
  throw "Falló la prueba PC (código $testExit). Se conserva el sitio anterior."
}
