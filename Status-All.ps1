[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$ports = @(4200, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008)
$healthUrls = @(
  'http://localhost:4200',
  'http://localhost:5000/swagger/index.html',
  'http://localhost:5001/healthz',
  'http://localhost:5002/healthz',
  'http://localhost:5003/healthz',
  'http://localhost:5004/healthz',
  'http://localhost:5005/healthz',
  'http://localhost:5006/healthz',
  'http://localhost:5007/healthz',
  'http://localhost:5008/healthz'
)

Write-Host '=== Port Status ==='
foreach ($port in $ports) {
  $ok = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
  if ($ok.TcpTestSucceeded) {
    Write-Host "PORT $port -> OPEN"
  }
  else {
    Write-Host "PORT $port -> CLOSED"
  }
}

Write-Host ''
Write-Host '=== HTTP Status ==='
foreach ($url in $healthUrls) {
  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 8
    Write-Host "$url -> $($resp.StatusCode)"
  }
  catch {
    $code = $null
    if ($_.Exception.Response) {
      $code = $_.Exception.Response.StatusCode.value__
    }
    if ($code) {
      Write-Host "$url -> $code"
    }
    else {
      Write-Host "$url -> ERROR"
    }
  }
}
