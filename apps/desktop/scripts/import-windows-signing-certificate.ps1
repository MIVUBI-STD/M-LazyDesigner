$ErrorActionPreference = 'Stop'

if (!$env:LAZYDESIGNER_WINDOWS_PFX_BASE64) {
  throw 'Trusted Desktop release requires LAZYDESIGNER_WINDOWS_PFX_BASE64.'
}
if ($null -eq $env:LAZYDESIGNER_WINDOWS_PFX_PASSWORD) {
  throw 'Trusted Desktop release requires LAZYDESIGNER_WINDOWS_PFX_PASSWORD.'
}
if (!$env:GITHUB_ENV) {
  throw 'GITHUB_ENV is unavailable; certificate identity cannot be transferred safely.'
}

$bytes = [Convert]::FromBase64String($env:LAZYDESIGNER_WINDOWS_PFX_BASE64)
$temp = Join-Path $env:RUNNER_TEMP 'lazydesigner-signing.pfx'
try {
  [IO.File]::WriteAllBytes($temp, $bytes)
  $password = ConvertTo-SecureString $env:LAZYDESIGNER_WINDOWS_PFX_PASSWORD -AsPlainText -Force
  $certificate = Import-PfxCertificate -FilePath $temp -CertStoreLocation 'Cert:\CurrentUser\My' -Password $password -Exportable:$false
  if (!$certificate -or !$certificate.HasPrivateKey) {
    throw 'Imported Windows signing certificate has no private key.'
  }
  $codeSigning = @($certificate.EnhancedKeyUsageList | Where-Object { $_.ObjectId.Value -eq '1.3.6.1.5.5.7.3.3' })
  if ($codeSigning.Count -eq 0) {
    Remove-Item -LiteralPath "Cert:\CurrentUser\My\$($certificate.Thumbprint)" -Force -ErrorAction SilentlyContinue
    throw 'Imported certificate is not valid for code signing.'
  }
  "LAZYDESIGNER_WINDOWS_CERT_THUMBPRINT=$($certificate.Thumbprint)" >> $env:GITHUB_ENV
} finally {
  Remove-Item -LiteralPath $temp -Force -ErrorAction SilentlyContinue
  [Array]::Clear($bytes, 0, $bytes.Length)
}
