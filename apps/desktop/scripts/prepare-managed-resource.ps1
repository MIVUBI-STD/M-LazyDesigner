$ErrorActionPreference = 'Stop'
$desktop = Split-Path -Parent $PSScriptRoot
$repo = Resolve-Path (Join-Path $desktop '..\..')
$mcp = Join-Path $repo 'mcp'
$sourcePackage = Join-Path $mcp 'dist\managed\package'
$resource = Join-Path $desktop 'src-tauri\resources\managed'

Push-Location $mcp
try {
  bun install --frozen-lockfile
  if ($LASTEXITCODE -ne 0) { throw 'Managed resource dependency install failed.' }
  bun run build
  if ($LASTEXITCODE -ne 0) { throw 'Managed Runtime build failed.' }
  bun run ./distribution/package.ts
  if ($LASTEXITCODE -ne 0) { throw 'Managed package build failed.' }
} finally {
  Pop-Location
}

if (!(Test-Path -LiteralPath (Join-Path $sourcePackage 'blockit.exe') -PathType Leaf)) {
  throw 'Managed package did not produce blockit.exe.'
}
$manifestPath = Join-Path $sourcePackage 'blockit-package.json'
if (!(Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw 'Managed package manifest is missing.'
}
$sourceSha = (git -C $repo rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or $sourceSha -notmatch '^[a-f0-9]{40} -LiteralPath $resource -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path (Split-Path -Parent $resource) -Force | Out-Null
Copy-Item -LiteralPath $sourcePackage -Destination $resource -Recurse
Write-Host "Prepared exact-SHA managed bootstrap resource at $resource"
) {
  throw 'Unable to resolve Desktop source SHA.'
}
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.source_sha -ne $sourceSha) {
  throw "Managed bootstrap source SHA $($manifest.source_sha) does not match Desktop source SHA $sourceSha."
}

Remove-Item -LiteralPath $resource -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path (Split-Path -Parent $resource) -Force | Out-Null
Copy-Item -LiteralPath $sourcePackage -Destination $resource -Recurse
Write-Host "Prepared exact-SHA managed bootstrap resource at $resource"
