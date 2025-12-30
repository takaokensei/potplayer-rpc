[System.Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$proc = Get-CimInstance Win32_Process -Filter "Name = 'PotPlayerMini64.exe' OR Name = 'PotPlayer64.exe'" | Select-Object -ExpandProperty CommandLine -ErrorAction SilentlyContinue

if ($proc) {
    Write-Host "Raw Process Found:"
    # Write-Host $proc
    
    $Bytes = [System.Text.Encoding]::UTF8.GetBytes($proc)
    $Base64 = [Convert]::ToBase64String($Bytes)
    
    Write-Host "Base64 Output:"
    Write-Host $Base64
} else {
    Write-Host "No PotPlayer process found via Get-CimInstance"
}
