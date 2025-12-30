<div align="center">
  <h1>PotPlayer RPC</h1>
  <p>
    <strong>The Missing Link for Media.</strong><br>
    A modern, Electron-based Discord Rich Presence client for PotPlayer with Anime detection.
  </p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a>
  </p>

  ![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)
  ![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat-square&logo=discord&logoColor=white)
  ![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
  ![Jikan](https://img.shields.io/badge/API-Jikan-2E294E?style=flat-square)
  ![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
</div>

<br>

## ⛩️ About The Project

**PotPlayer RPC** bridges the gap between your local media consumption and your social presence. It answers a simple need: *How to display what you are watching on PotPlayer without manual configuration?*

It is a **Background Service** designed for anime enthusiasts and power users who want automatic metadata fetching and a sleek dashboard.

### Key Differentiators
* 🧠 **Anime Intelligence:** Automatically detects if you are watching anime and fetches cover art/info using the **Jikan API (MyAnimeList)**.
* 💎 **Tokyo Night UI:** A modern, aesthetic visual dashboard for real-time playback monitoring.
* 🛡️ **System Tray Control:** Runs silently in the background with full control via the Windows system tray.
* ⚡ **Auto-Start Ready:** Optional integration to launch seamlessly with Windows startup.

## 🏗️ Tech Stack

PotPlayer RPC combines web technologies with native system integration:

* **Runtime:** Electron 39.
* **RPC:** `discord-rpc` for status updates.
* **Data Source:** Jikan API for anime metadata matching.
* **Logging:** Winston for robust production debugging.

## 🚀 Getting Started

### Prerequisites
* **PotPlayer**: Installed and running.
* **Node.js**: v18+.
* **Git**: To clone the repository.

### Installation

```bash
# Clone the repository
git clone [https://github.com/takaokensei/potplayer-rpc.git](https://github.com/takaokensei/potplayer-rpc.git)

# Navigate to the project
cd potplayer-rpc

# Install dependencies
npm install

```

### Development & Build

```bash
# Run in dev mode (Hot Reload)
npm run dev

# Create Distributable (Portable .exe)
npm run build
# Output: dist/PotPlayer RPC-win32-x64/

```

### Usage

1. Open PotPlayer and start watching a video.
2. Run the application (or the `.exe`).
3. Check your Discord status to see the Rich Presence in action.
4. (Optional) Right-click the tray icon to minimize or configure settings.

---

<div align="center">
<samp>Built with 💙 by <a href="https://github.com/takaokensei">@takaokensei</a></samp>
</div>
