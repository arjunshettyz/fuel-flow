[CmdletBinding()]
param(
  [switch]$StopInfrastructure
)

$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $PSCommandPath
Set-Location $root

$pidFile = Join-Path $root '.fuelmanagement-processes.json'
$ports = @(4200, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5008)

$pids = New-Object System.Collections.Generic.List[int]

foreach ($port in $ports) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    if ($listener.OwningProcess -and $listener.OwningProcess -gt 0) {
      $pids.Add([int]$listener.OwningProcess)
    }
  }
}

if (Test-Path $pidFile) {
  try {
    $json = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
    foreach ($proc in @($json.Processes)) {
      if ($proc.Pid -and [int]$proc.Pid -gt 0) {
        $pids.Add([int]$proc.Pid)
      }
    }
  }
  catch {
    Write-Host '[WARN] Could not parse PID file. Continuing with port-based cleanup.'
  }
}

$uniquePids = $pids | Sort-Object -Unique

if (-not $uniquePids -or $uniquePids.Count -eq 0) {
  Write-Host '[INFO] No matching runtime processes found.'
}
else {
  foreach ($pid in $uniquePids) {
    try {
      $proc = Get-Process -Id $pid -ErrorAction Stop
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Host "[STOPPED] PID $pid ($($proc.ProcessName))"
    }
    catch {
      Write-Host "[SKIP] PID $pid could not be stopped (already exited or access denied)."
    }
  }
}

if (Test-Path $pidFile) {
  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
}

if ($StopInfrastructure) {
  Write-Host '[INFRA] Stopping docker compose dependencies...'
  docker compose down | Out-Host
}

Write-Host '[DONE] Stop sequence complete.'
