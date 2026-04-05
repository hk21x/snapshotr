<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h1>Snapshotr</h1>
  <p align="center">
    A self-hosted, multi-camera snapshot tool for RTSP cameras.
    <br />
    Capture high-quality JPEG snapshots from RTSPS streams on a schedule, create timelines from them and get notified when things go wrong.
    <br />
    ![description](https://files.catbox.moe/tc76eq.png)
    <br />
    <a href="https://github.com/hk21x/snapshotr/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/hk21x/snapshotr/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#key-features">Key Features</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#docker-recommended">Docker (Recommended)</a></li>
        <li><a href="#manual-installation">Manual Installation</a></li>
      </ul>
    </li>
    <li>
      <a href="#configuration">Configuration</a>
      <ul>
        <li><a href="#environment-variables">Environment Variables</a></li>
        <li><a href="#authentication">Authentication</a></li>
        <li><a href="#multi-camera">Multi-Camera</a></li>
        <li><a href="#notifications">Notifications</a></li>
        <li><a href="#retention">Retention</a></li>
        <li><a href="#scheduling">Scheduling</a></li>
      </ul>
    </li>
    <li><a href="#api-reference">API Reference</a></li>
    <li><a href="#testing">Testing</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

Snapshotr captures JPEG snapshots from RTSPS camera streams at configurable intervals using ffmpeg. The purpose behind this application was to allow creation of timelapses from standard IP cameras without mass storage requirements or swapping out an SD card every few days. Instead, you can utilise cameras you already have.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Key Features

- **Multi-Camera Support** - Manage multiple cameras from a single dashboard, each with its own interval, quality, and schedule
- **Snapshot Gallery** - Browse snapshots grouped by date with full-size lightbox, original-size viewer, keyboard navigation (arrow keys), download, and delete
- **Configurable Capture** - Set interval (1-60 min) and JPEG quality (1-31) per camera
- **Scheduling** - Restrict captures to specific days and time windows, including overnight ranges (e.g. 22:00-06:00)
- **Notifications** - Failure alerts via Discord, Slack, or Telegram with built-in test buttons
- **Retention Policy** - Auto-delete old snapshots by age or total disk usage
- **Bulk Export** - Download all snapshots (or a single day) as a ZIP file
- **API Key Auth** - Optional authentication for public-facing deployments
- **Light / Dark Theme** - Toggle between light and dark mode
- **Live Logs** - Color-coded, collapsible log panel updated every 2 seconds
- **Storage Indicator** - See total snapshot count and disk usage at a glance
- **Error Handling** - Disk space checks, automatic retry, and consecutive failure alerts
- **Mobile Responsive** - Collapsible sidebar for phone and tablet access
- **Docker Ready** - One-command deployment with Docker Compose and health checks

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

* [![Next][Next.js]][Next-url]
* [![React][React.js]][React-url]
* [![TailwindCSS][TailwindCSS]][TailwindCSS-url]
* [![Docker][Docker]][Docker-url]
* [![TypeScript][TypeScript]][TypeScript-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

### Docker (Recommended)

1. Clone the repo
   ```sh
   git clone https://github.com/hk21x/snapshotr.git
   cd snapshotr
   ```
2. Start the container
   ```sh
   docker compose up -d
   ```
3. Open http://localhost:3000

#### Docker Compose Example

```yaml
services:
  snapshotr:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - snapshotr-data:/data/images
      - ./config.json:/app/config.json
    environment:
      - NODE_ENV=production
      - CONFIG_DIR=/app
      - IMAGE_DIR=/data/images
      - RTSP_URL=rtsps://192.168.1.1:7441/your-stream-id
      - API_KEY=your-secret-key
    restart: unless-stopped

volumes:
  snapshotr-data:
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Manual Installation

#### Prerequisites

- **Node.js** 25+
- **ffmpeg** installed (auto-detected at `/usr/bin/ffmpeg`, `/usr/local/bin/ffmpeg`, or `/opt/homebrew/bin/ffmpeg`)
- A camera with an **RTSPS** stream URL

#### Steps

1. Clone the repo
   ```sh
   git clone https://github.com/hk21x/snapshotr.git
   cd snapshotr
   ```
2. Install dependencies
   ```sh
   npm install
   ```
3. Start the development server
   ```sh
   npm run dev -- --port 3001
   ```
4. Or build and run for production
   ```sh
   npm run build
   npm run start -- --port 3001
   ```
5. Open http://localhost:3001

#### Run as a systemd service (Linux)

Create `/etc/systemd/system/snapshotr.service`:

```ini
[Unit]
Description=Snapshotr Camera Tool
After=network.target

[Service]
Type=simple
WorkingDirectory=/var/www/snapshotr
ExecStart=/usr/bin/npm run start -- --port 3000
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```sh
cd /path/to/snapshotr && npm run build
sudo systemctl daemon-reload
sudo systemctl enable snapshotr
sudo systemctl start snapshotr
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONFIGURATION -->
## Configuration

All settings are managed from the web UI and saved to `config.json`. Environment variables override `config.json` values.

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `RTSP_URL` | Default camera RTSPS stream URL | - |
| `INTERVAL_MINUTES` | Minutes between captures (1-1440) | `5` |
| `JPEG_QUALITY` | ffmpeg `-q:v` value (1 = best, 31 = smallest) | `2` |
| `IMAGE_DIR` | Absolute path for saved snapshots | `./images` |
| `CONFIG_DIR` | Directory containing `config.json` | Working directory |
| `API_KEY` | API key for authentication (unset = auth disabled) | - |
| `DISCORD_ENABLED` | Enable Discord alerts | `false` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | - |
| `SLACK_ENABLED` | Enable Slack alerts | `false` |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | - |
| `TELEGRAM_ENABLED` | Enable Telegram alerts | `false` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | - |
| `RETENTION_ENABLED` | Enable retention policy | `false` |
| `RETENTION_MAX_AGE_DAYS` | Delete snapshots older than N days | `30` |
| `RETENTION_MAX_TOTAL_MB` | Max total snapshot size in MB (0 = unlimited) | `0` |

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Authentication

Set the `API_KEY` environment variable to enable authentication:

- All API routes require an `Authorization: Bearer <key>` header
- The web dashboard redirects to a login page
- `/api/health` remains public for Docker health checks

When `API_KEY` is not set, authentication is disabled (suitable for trusted LAN environments).

### Multi-Camera

Add cameras from the **Cameras** section in the sidebar config panel. Each camera has its own:

- Name and RTSPS URL
- Capture interval and JPEG quality
- Schedule (per-camera, independent of the default)

Snapshots are stored in subdirectories under the image directory (`<imageDir>/<camera-id>/`). Use the camera selector pills in the sidebar to switch between cameras.

The default camera (top-level `rtspUrl`) is always available and stores snapshots in the image directory root.

### Notifications

Configure one or more channels to receive alerts when captures fail:

| Channel | Setup |
|---|---|
| **Discord** | Paste a webhook URL from Server Settings > Integrations > Webhooks |
| **Slack** | Use an Incoming Webhook URL from your Slack app |
| **Telegram** | Provide a Bot Token and Chat ID from @BotFather |

Each channel has a **Test Alert** button in the config panel. All enabled channels fire concurrently on failure.

### Retention

When enabled, old snapshots are automatically cleaned up after each successful capture:

- **Max Age** - Delete snapshots older than N days
- **Max Total Size** - Delete oldest snapshots when total exceeds N MB (0 = unlimited)

### Scheduling

When enabled, captures only run during the configured time window on selected days. Overnight ranges are supported (e.g. start 22:00, end 06:00). Captures outside the window are skipped; the timer keeps running so captures resume automatically.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- API REFERENCE -->
## API Reference

All routes accept an optional `?cameraId=<id>` query parameter for multi-camera support.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check (public, no auth) |
| `GET` | `/api/config` | Get current configuration |
| `PUT` | `/api/config` | Update configuration |
| `POST` | `/api/capture/start` | Start interval capture |
| `POST` | `/api/capture/stop` | Stop interval capture |
| `POST` | `/api/snapshot-now` | Trigger an immediate capture |
| `GET` | `/api/status` | Get capture status, per-camera statuses, and logs |
| `GET` | `/api/storage` | Get total snapshot count and disk usage |
| `GET` | `/api/snapshots` | List snapshot metadata (paginated) |
| `GET` | `/api/snapshots/:filename` | Serve a snapshot image |
| `DELETE` | `/api/snapshots/:filename` | Delete a snapshot |
| `GET` | `/api/snapshots/export` | Download snapshots as ZIP |
| `POST` | `/api/discord-test` | Send a test Discord alert |
| `POST` | `/api/slack-test` | Send a test Slack alert |
| `POST` | `/api/telegram-test` | Send a test Telegram alert |
| `POST` | `/api/auth/verify` | Verify API key |

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- TESTING -->
## Testing

```sh
npm test            # run once
npm run test:watch  # watch mode
```

Tests cover configuration loading, environment variable overrides, retention cleanup logic, and notification dispatch across all channels.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- PROJECT STRUCTURE -->
## Project Structure

```
src/
├── app/
│   ├── page.tsx                 # Dashboard (sidebar + gallery layout)
│   ├── layout.tsx               # Root layout with theme provider
│   ├── login/page.tsx           # Login page (when API_KEY set)
│   ├── error.tsx                # Error boundary
│   ├── not-found.tsx            # 404 page
│   ├── icon.svg                 # Favicon
│   └── api/                     # API routes (16 endpoints)
├── components/
│   ├── capture-controls.tsx     # Status, camera selector, start/stop
│   ├── config-panel.tsx         # Settings, cameras, notifications, retention
│   ├── snapshot-gallery.tsx     # Image grid, lightbox, download, delete
│   ├── log-panel.tsx            # Collapsible live log viewer
│   ├── clock.tsx                # Live clock
│   ├── theme-toggle.tsx         # Light/dark mode toggle
│   └── ui/                      # shadcn/ui components
├── hooks/
│   ├── use-status.ts            # Polls /api/status every 2s
│   └── use-snapshots.ts         # Polls /api/snapshots every 10s
├── lib/
│   ├── capture-manager.ts       # Multi-camera capture engine with retry + disk checks
│   ├── config.ts                # Config I/O with env var overrides
│   ├── notifications.ts         # Discord, Slack, Telegram alerts
│   ├── retention.ts             # Snapshot retention cleanup
│   ├── log-store.ts             # In-memory log ring buffer (200 entries)
│   ├── types.ts                 # TypeScript interfaces
│   └── __tests__/               # Unit tests
└── middleware.ts                # API key auth
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] Multi-camera support
- [x] Discord, Slack, and Telegram notifications
- [x] Snapshot retention policies
- [x] Bulk export as ZIP
- [x] API key authentication
- [x] Docker support with health checks
- [x] Light / dark theme
- [x] Mobile responsive sidebar

See the [open issues](https://github.com/hk21x/snapshotr/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Project Link: [https://github.com/hk21x/snapshotr](https://github.com/hk21x/snapshotr)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Next.js](https://nextjs.org/)
* [shadcn/ui](https://ui.shadcn.com/)
* [Tailwind CSS](https://tailwindcss.com/)
* [ffmpeg](https://ffmpeg.org/)
* [Lucide Icons](https://lucide.dev/)
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/hk21x/snapshotr.svg?style=for-the-badge
[contributors-url]: https://github.com/hk21x/snapshotr/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/hk21x/snapshotr.svg?style=for-the-badge
[forks-url]: https://github.com/hk21x/snapshotr/network/members
[stars-shield]: https://img.shields.io/github/stars/hk21x/snapshotr.svg?style=for-the-badge
[stars-url]: https://github.com/hk21x/snapshotr/stargazers
[issues-shield]: https://img.shields.io/github/issues/hk21x/snapshotr.svg?style=for-the-badge
[issues-url]: https://github.com/hk21x/snapshotr/issues
[license-shield]: https://img.shields.io/github/license/hk21x/snapshotr.svg?style=for-the-badge
[license-url]: https://github.com/hk21x/snapshotr/blob/main/LICENSE
[Next.js]: https://img.shields.io/badge/next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white
[Next-url]: https://nextjs.org/
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://reactjs.org/
[TailwindCSS]: https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[Docker]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
