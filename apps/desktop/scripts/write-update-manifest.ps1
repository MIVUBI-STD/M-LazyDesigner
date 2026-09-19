param(
  [Parameter(Mandatory = $true)] [string]$Version,
  [Parameter(Mandatory = $true)] [string]$InstallerName,
  [Parameter(Mandatory = $true)] [string]$SignaturePath,
  [Parameter(Mandatory = $true)] [string]$OutputPath
)

$ErrorActionPreference = 'Stop'

if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Update manifest version must be MAJOR.MINOR.PATCH.' }
if ([IO.Path]::GetFileName($InstallerName) -ne $InstallerName -or $InstallerName -notmatch '\.exe$') { throw 'Update installer name must be one Windows executable basename.' }
if (!(Test-Path -LiteralPath $SignaturePath -PathType Leaf)) { throw 'Tauri updater signature sidecar is missing.' }

$policyPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'release-channel.json'
$policy = Get-Content -LiteralPath $policyPath -Raw | ConvertFrom-Json
if ($policy.schema -ne 1 -or $policy.channel -ne 'stable' -or $policy.platform -ne 'windows-x86_64') { throw 'Desktop release-channel policy is invalid.' }
if ($policy.repository -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' -or $policy.releaseTagPrefix -ne 'desktop-v' -or $policy.manifestAsset -ne 'latest.json') { throw 'Desktop release-channel identity is invalid.' }
if ($policy.selfUpdateRuntimeEnabled -ne $false) { throw 'Runtime self-update activation requires a separate reviewed change.' }

$signature = (Get-Content -LiteralPath $SignaturePath -Raw).Trim()
if (!$signature -or $signature.Length -gt 16384 -or $signature.Contains([char]0)) { throw 'Tauri updater signature content is invalid.' }

$tag = "$($policy.releaseTagPrefix)$Version"
$escapedInstaller = [Uri]::EscapeDataString($InstallerName)
$assetUrl = "https://github.com/$($policy.repository)/releases/download/$tag/$escapedInstaller"

$platform = [ordered]@{
  signature = $signature
  url = $assetUrl
}
$manifest = [ordered]@{
  version = $Version
  platforms = [ordered]@{
    $policy.platform = $platform
  }
}

$parent = Split-Path -Parent $OutputPath
if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $OutputPath -Encoding utf8
