# PotPlayer RPC

> Discord Rich Presence integration for PotPlayer with modern UI and system tray control

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)
![Electron](https://img.shields.io/badge/electron-39.x-blue.svg)

## ✨ Features

- **Discord Integration**: Shows what you're watching in Discord status
- **Anime Recognition**: Auto-detects anime using Jikan API (MyAnimeList)
- **Visual Dashboard**: Modern Tokyo Night themed overlay window
- **System Tray**: Control from Windows system tray
- **Auto-Start**: Optional Windows startup integration
- **Production Logging**: Winston-based logging for debugging

## 🚀 Quick Start

### Download & Run (Portable)
1. Download the latest release from [Releases](../../releases)
2. Extract `PotPlayer RPC-win32-x64` folder
3. Run `PotPlayer RPC.exe`
4. Right-click tray icon for options

### Build from Source
```bash
git clone https://github.com/YOUR_USERNAME/potplayer-rpc.git
cd potplayer-rpc
npm install
npm start
```

### Create Distributable
```bash
npm run build
# Output: dist/PotPlayer RPC-win32-x64/
```

## 📸 Screenshots

**System Tray Menu**
- Monitoring status indicator
- Quick access to dashboard
- Auto-start toggle

**Visual Dashboard**
- Real-time playback info
- Anime cover art
- Progress bar

## 🛠️ Tech Stack

- **Runtime**: Electron 39
- **RPC**: discord-rpc
- **API**: Jikan (MyAnimeList)
- **Logging**: Winston
- **Build**: electron-packager

## ⚙️ Configuration

Settings can be accessed via the system tray menu (coming soon).

## 📝 Development

```bash
# Run in dev mode
npm run dev

# Build
npm run build

# View logs
# Windows: %APPDATA%/potplayer-rpc/combined.log
```

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT © Cauã Vitor

## 🙏 Acknowledgments

- PotPlayer team
- Discord RPC library maintainers
- Jikan API (MyAnimeList)
