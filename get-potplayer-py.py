import ctypes
from ctypes import wintypes
import json

# Win32 API
WM_USER = 0x0400
IPC_GETOUTPUTTIME = 105
IPC_GETLENGTH = 126

user32 = ctypes.windll.user32

# Find PotPlayerMini64
hwnd = user32.FindWindowW("PotPlayer64", None)

if hwnd == 0:
    # Try other class names
    hwnd = user32.FindWindowW("PotPlayer", None)

if hwnd == 0:
    print("null")
else:
    # Get current position (ms)
    current_ms = user32.SendMessageW(hwnd, WM_USER, 0, IPC_GETOUTPUTTIME)
    
    # Get duration (seconds)
    total_sec = user32.SendMessageW(hwnd, WM_USER, 1, IPC_GETLENGTH)
    
    result = {
        "currentMs": current_ms,
        "totalMs": total_sec * 1000,
        "totalSec": total_sec,
        "status": 1 if current_ms > 0 else 0
    }
    
    print(json.dumps(result))
