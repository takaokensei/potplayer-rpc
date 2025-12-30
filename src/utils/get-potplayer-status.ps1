Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class PotPlayerWinampAPI {
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
    
    [DllImport("user32.dll")]
    public static extern bool IsWindow(IntPtr hWnd);
    
    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);
    
    // Winamp IPC API Constants
    public const uint WM_USER = 0x0400;
    public const int IPC_GETOUTPUTTIME = 105;  // Get position in MS (wParam=0) or length in sec (wParam=1)
    public const int IPC_GETLENGTH = 126;      // Get duration in seconds
    
    public static IntPtr FindPotPlayer() {
        IntPtr foundHwnd = IntPtr.Zero;
        
        // Try common class names first
        foundHwnd = FindWindow("PotPlayer64", null);
        if (foundHwnd != IntPtr.Zero && IsWindow(foundHwnd)) return foundHwnd;
        
        foundHwnd = FindWindow("PotPlayer", null);
        if (foundHwnd != IntPtr.Zero && IsWindow(foundHwnd)) return foundHwnd;
        
        // Enumerate all windows
        EnumWindows(delegate(IntPtr hWnd, IntPtr lParam) {
            StringBuilder title = new StringBuilder(256);
            GetWindowText(hWnd, title, 256);
            string titleStr = title.ToString();
            
            if (titleStr.Contains("PotPlayer") || 
                titleStr.Contains(".mp4") || 
                titleStr.Contains(".mkv") || 
                titleStr.Contains(".avi")) {
                
                StringBuilder className = new StringBuilder(256);
                GetClassName(hWnd, className, 256);
                string classStr = className.ToString();
                
                if (classStr.Contains("PotPlayer")) {
                    foundHwnd = hWnd;
                    return false;
                }
            }
            return true;
        }, IntPtr.Zero);
        
        return foundHwnd;
    }
    
    public static int GetCurrentPositionMs(IntPtr hwnd) {
        // wParam=0 returns position in milliseconds
        return (int)SendMessage(hwnd, WM_USER, IntPtr.Zero, (IntPtr)IPC_GETOUTPUTTIME);
    }
    
    public static int GetDurationSeconds(IntPtr hwnd) {
        // wParam=1 returns duration in seconds  
        return (int)SendMessage(hwnd, WM_USER, (IntPtr)1, (IntPtr)IPC_GETLENGTH);
    }
    
    public static int GetPlayStatus(IntPtr hwnd) {
        // wParam=0 returns: 0=stopped, 1=playing, 3=paused
        return (int)SendMessage(hwnd, WM_USER, IntPtr.Zero, (IntPtr)104);
    }
}
"@

$hwnd = [PotPlayerWinampAPI]::FindPotPlayer()

if ($hwnd -eq [IntPtr]::Zero) {
    Write-Output "null"
    exit
}

$currentMs = [PotPlayerWinampAPI]::GetCurrentPositionMs($hwnd)
$durationSec = [PotPlayerWinampAPI]::GetDurationSeconds($hwnd)
$status = [PotPlayerWinampAPI]::GetPlayStatus($hwnd)

$result = @{
    currentMs = $currentMs
    totalMs = $durationSec * 1000
    totalSec = $durationSec
    status = $status
} | ConvertTo-Json -Compress

Write-Output $result
