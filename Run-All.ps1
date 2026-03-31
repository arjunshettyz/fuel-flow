[CmdletBinding()]
param(
  [switch]$SkipFrontend,
  [switch]$SkipInfrastructure,
  [switch]$SkipHealthChecks,
  [int]$StartupDelaySeconds = 8
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSCommandPath
Set-Location $root

$pidFile = Join-Path $root '.fuelmanagement-processes.json'
$logDir = Join-Path $root '.runtime-logs'
New-Item -Path $logDir -ItemType Directory -Force | Out-Null

function Test-LocalPort {
  param([int]$Port)

  try {
    $test = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue
    return [bool]$test.TcpTestSucceeded
  }
  catch {
    return $false
  }
}

function Start-ServiceProcess {
  param(
    [string]$Name,
    [string]$Project,
    [int]$Port
  )

  if (Test-LocalPort -Port $Port) {
    Write-Host "[SKIP] $Name already listening on port $Port."
    return $null
  }

  $outLog = Join-Path $logDir ("{0}-out.log" -f $Name.ToLower())
  $errLog = Join-Path $logDir ("{0}-err.log" -f $Name.ToLower())
  $args = @('run', '--project', $Project, '--urls', ("http://localhost:{0}" -f $Port))

  $proc = Start-Process -FilePath 'dotnet' -ArgumentList $args -WorkingDirectory $root -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru -WindowStyle Hidden
  Write-Host "[STARTED] $Name on http://localhost:$Port (PID $($proc.Id))"

  return [PSCustomObject]@{
    Name = $Name
    Pid = $proc.Id
    Port = $Port
    Project = $Project
  }
}

$services = @(
  @{ Name = 'Gateway'; Project = 'src/Gateway/FuelManagement.Gateway/FuelManagement.Gateway.csproj'; Port = 5000; Health = 'http://localhost:5000/swagger/index.html' },
  @{ Name = 'Identity'; Project = 'src/Services/Identity/FuelManagement.Identity.API/FuelManagement.Identity.API.csproj'; Port = 5001; Health = 'http://localhost:5001/healthz' },
  @{ Name = 'Inventory'; Project = 'src/Services/Inventory/FuelManagement.Inventory.API/FuelManagement.Inventory.API.csproj'; Port = 5002; Health = 'http://localhost:5002/healthz' },
  @{ Name = 'Sales'; Project = 'src/Services/Sales/FuelManagement.Sales.API/FuelManagement.Sales.API.csproj'; Port = 5003; Health = 'http://localhost:5003/healthz' },
  @{ Name = 'Reporting'; Project = 'src/Services/Reporting/FuelManagement.Reporting.API/FuelManagement.Reporting.API.csproj'; Port = 5004; Health = 'http://localhost:5004/healthz' },
  @{ Name = 'Notification'; Project = 'src/Services/Notification/FuelManagement.Notification.API/FuelManagement.Notification.API.csproj'; Port = 5005; Health = 'http://localhost:5005/healthz' },
  @{ Name = 'FraudDetection'; Project = 'src/Services/FraudDetection/FuelManagement.FraudDetection.API/FuelManagement.FraudDetection.API.csproj'; Port = 5006; Health = 'http://localhost:5006/healthz' },
  @{ Name = 'Station'; Project = 'src/Services/Station/FuelManagement.Station.API/FuelManagement.Station.API.csproj'; Port = 5007; Health = 'http://localhost:5007/healthz' },
  @{ Name = 'Audit'; Project = 'src/Services/Audit/FuelManagement.Audit.API/FuelManagement.Audit.API.csproj'; Port = 5008; Health = 'http://localhost:5008/healthz' }
)

if (-not $SkipInfrastructure) {
  Write-Host '[INFRA] Starting Redis and RabbitMQ via docker compose...'
  docker compose up -d | Out-Host
}

$started = New-Object System.Collections.Generic.List[Object]

foreach ($svc in $services) {
  $result = Start-ServiceProcess -Name $svc.Name -Project $svc.Project -Port $svc.Port
  if ($null -ne $result) {
    $started.Add($result)
  }
}

if (-not $SkipFrontend) {
  $frontendPort = 4200
  if (Test-LocalPort -Port $frontendPort) {
    Write-Host '[SKIP] Frontend already listening on port 4200.'
  }
  else {
    $frontendDir = Join-Path $root 'frontend/fuel-management-web'
    $frontOut = Join-Path $logDir 'frontend-out.log'
    $frontErr = Join-Path $logDir 'frontend-err.log'

    $frontendProc = Start-Process -FilePath 'npm.cmd' -ArgumentList @('start') -WorkingDirectory $frontendDir -RedirectStandardOutput $frontOut -RedirectStandardError $frontErr -PassThru -WindowStyle Hidden
    Write-Host "[STARTED] Frontend on http://localhost:4200 (PID $($frontendProc.Id))"

    $started.Add([PSCustomObject]@{
      Name = 'Frontend'
      Pid = $frontendProc.Id
      Port = 4200
      Project = 'frontend/fuel-management-web'
    })
  }
}

$record = [PSCustomObject]@{
  StartedAt = (Get-Date).ToString('o')
  Processes = $started
}
$record | ConvertTo-Json -Depth 5 | Set-Content -Path $pidFile -Encoding UTF8

if (-not $SkipHealthChecks) {
  Write-Host "[WAIT] Waiting $StartupDelaySeconds seconds before health checks..."
  Start-Sleep -Seconds $StartupDelaySeconds

  foreach ($svc in $services) {
    try {
      $resp = Invoke-WebRequest -Uri $svc.Health -UseBasicParsing -TimeoutSec 8
      Write-Host "[HEALTHY] $($svc.Name) -> $($resp.StatusCode)"
    }
    catch {
      $code = $null
      if ($_.Exception.Response) {
        $code = $_.Exception.Response.StatusCode.value__
      }
      if ($code) {
        Write-Host "[CHECK] $($svc.Name) -> $code"
      }
      else {
        Write-Host "[CHECK] $($svc.Name) -> no response yet"
      }
    }
  }

  if (-not $SkipFrontend) {
    try {
      $front = Invoke-WebRequest -Uri 'http://localhost:4200' -UseBasicParsing -TimeoutSec 8
      Write-Host "[HEALTHY] Frontend -> $($front.StatusCode)"
    }
    catch {
      Write-Host '[CHECK] Frontend -> no response yet'
    }
  }
}

Write-Host '[DONE] Full stack run sequence complete.'
