param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Path
)

$ErrorActionPreference = 'Stop'

if (!(Test-Path -LiteralPath $Path -PathType Leaf)) {
  throw "Signing target does not exist: $Path"
}
if ($Path -match '[\r\n]') {
  throw 'Signing target contains unsupported control characters.'
}
if (!$env:LAZYDESIGNER_WINDOWS_CERT_THUMBPRINT -or $env:LAZYDESIGNER_WINDOWS_CERT_THUMBPRINT -notmatch '^[A-Fa-f0-9]{40}$') {
  throw 'Trusted release certificate thumbprint is unavailable or invalid.'
}
if (!$env:LAZYDESIGNER_TIMESTAMP_URL) {
  throw 'Trusted release requires LAZYDESIGNER_TIMESTAMP_URL.'
}
$timestamp = [Uri]$env:LAZYDESIGNER_TIMESTAMP_URL
if ($timestamp.Scheme -ne 'https') {
  throw 'Timestamp URL must use HTTPS.'
}

$roots = @(
  (Join-Path ${env:ProgramFiles(x86)} 'Windows Kits\10\bin'),
  (Join-Path $env:ProgramFiles 'Windows Kits\10\bin')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Container) }

$signtool = $null
foreach ($root in $roots) {
  $candidate = Get-ChildItem -LiteralPath $root -Filter 'signtool.exe' -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
    Sort-Object FullName -Descending |
    Select-Object -First 1
  if ($candidate) { $signtool = $candidate.FullName; break }
}
if (!$signtool) {
  throw 'Windows SDK signtool.exe was not found.'
}

& $signtool sign /sha1 $env:LAZYDESIGNER_WINDOWS_CERT_THUMBPRINT /fd SHA256 /tr $timestamp.AbsoluteUri /td SHA256 $Path
if ($LASTEXITCODE -ne 0) {
  throw "signtool failed with exit code $LASTEXITCODE."
}

$signature = Get-AuthenticodeSignature -LiteralPath $Path
if ($signature.Status -ne [System.Management.Automation.SignatureStatus]::Valid) {
  throw "Authenticode verification failed after signing: $($signature.Status) $($signature.StatusMessage)"
}
