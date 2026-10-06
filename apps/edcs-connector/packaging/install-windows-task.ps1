# CE-S6 (ADR-101): install the vFirm EDCS connector as a Windows scheduled task.
#
# Run from an ELEVATED PowerShell (Run as administrator) in the folder that holds this package:
#
#   .\packaging\install-windows-task.ps1 -ConfigPath "C:\ProgramData\vFirmConnector\connector.config.json"
#
# Topology A (BizKick on the PC that runs the connector): leave -RunAs out; the task runs as SYSTEM.
# Topology C (BizKick on a shared folder, reached by a UNC path like \\server\BizKick): SYSTEM cannot reach
# a network share, so give the task a service account that has READ-ONLY access to that share:
#
#   .\packaging\install-windows-task.ps1 -ConfigPath "..." -RunAs "DOMAIN\svc-vfirm" -Password (Read-Host -AsSecureString)
#
# The connector only reads BizKick, so the account needs "Read" on the share (and the NTFS folders) and
# nothing more. Give it Modify rights ONLY on its own state folder (state_dir), never on BizKick.

param(
  [Parameter(Mandatory = $true)][string]$ConfigPath,
  [string]$TaskName = "vFirm EDCS Connector",
  [string]$RunAs = "",
  [SecureString]$Password = $null
)

$ErrorActionPreference = "Stop"
$package = Split-Path -Parent $PSScriptRoot
$script = Join-Path $package "bin\edcs-connector.mjs"
if (-not (Test-Path $script)) { throw "Cannot find $script. Run this from the unpacked connector folder." }
if (-not (Test-Path $ConfigPath)) { throw "Cannot find the configuration file $ConfigPath." }
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "Node.js 20 or newer is required. Install it from https://nodejs.org, then run this again." }

$action = New-ScheduledTaskAction -Execute $node -Argument "`"$script`" run --config `"$ConfigPath`"" -WorkingDirectory $package
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

if ($RunAs) {
  if (-not $Password) { throw "A service account needs its password: add -Password (Read-Host -AsSecureString)." }
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -User $RunAs -Password $plain -RunLevel Limited -Force | Out-Null
} else {
  $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
}

Start-ScheduledTask -TaskName $TaskName
Write-Host "Installed and started the scheduled task '$TaskName'."
Write-Host "Check it in the vFirm console (BizKick > Connector): it should show 'Healthy' within a minute or two."
Write-Host "Local status:  node `"$script`" status --config `"$ConfigPath`""
Write-Host "To remove it:  Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
