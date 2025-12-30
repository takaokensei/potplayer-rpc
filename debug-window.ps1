Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;

public class WindowDebugger {
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    public const uint WM_USER = 0x0400;
}
"@

Write-Host "Procurando janelas do PotPlayer..." -ForegroundColor Cyan

[WindowDebugger]::EnumWindows({
    param($hwnd, $lParam)
    
    $title = New-Object System.Text.StringBuilder 256
    [WindowDebugger]::GetWindowText($hwnd, $title, 256) | Out-Null
    
    $className = New-Object System.Text.StringBuilder 256
    [WindowDebugger]::GetClassName($hwnd, $className, 256) | Out-Null
    
    $processId = 0
    [WindowDebugger]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
    
    $titleStr = $title.ToString()
    $classStr = $className.ToString()
    
    if ($titleStr -like "*Ragna*" -or $titleStr -like "*PotPlayer*") {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        
        Write-Host "`n========== JANELA ENCONTRADA ==========" -ForegroundColor Green
        Write-Host "Handle: $hwnd"
        Write-Host "Título: $titleStr"
        Write-Host "Classe: $classStr"
        Write-Host "Processo: $($process.ProcessName)"
        Write-Host "PID: $processId"
        
        # Testa comandos Winamp IPC
        Write-Host "`n--- Testando Comandos Winamp IPC ---" -ForegroundColor Yellow
        
        $currentMs = [WindowDebugger]::SendMessage($hwnd, 0x400, [IntPtr]::Zero, [IntPtr]105)
        Write-Host "Comando 105 (current_ms): $currentMs"
        
        $durationSec = [WindowDebugger]::SendMessage($hwnd, 0x400, [IntPtr]1, [IntPtr]126)
        Write-Host "Comando 126 (duration_sec): $durationSec"
        
        $status = [WindowDebugger]::SendMessage($hwnd, 0x400, [IntPtr]::Zero, [IntPtr]104)
        Write-Host "Comando 104 (status): $status"
        
        Write-Host "======================================`n" -ForegroundColor Green
    }
    
    return $true
}, [IntPtr]::Zero) | Out-Null
