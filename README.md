# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge webcam plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-webcam.svg)](https://www.npmjs.com/package/matterbridge-webcam)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-webcam.svg)](https://www.npmjs.com/package/matterbridge-webcam)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/Luligu/b21088ab9c9f2b119b42c33f0fef218d/raw/docker.json)](https://hub.docker.com/r/luligu/matterbridge)
![Node.js CI](https://github.com/Luligu/matterbridge-webcam/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/matterbridge-webcam/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/matterbridge-webcam/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/matterbridge-webcam)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/styled_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![matterbridge.io](https://img.shields.io/badge/matterbridge.io-online-brightgreen)](https://matterbridge.io)

[![powered by](https://img.shields.io/badge/powered%20by-matterbridge-blue)](https://www.npmjs.com/package/matterbridge)
[![powered by](https://img.shields.io/badge/powered%20by-matter--history-blue)](https://www.npmjs.com/package/matter-history)
[![powered by](https://img.shields.io/badge/powered%20by-node--ansi--logger-blue)](https://www.npmjs.com/package/node-ansi-logger)
[![powered by](https://img.shields.io/badge/powered%20by-node--persist--manager-blue)](https://www.npmjs.com/package/node-persist-manager)

---

This plugin is for local cameras connected to the Matterbridge host, such as USB webcams and built-in cameras. For network cameras that provide an RTSP stream, use [matterbridge-camera](https://github.com/Luligu/matterbridge-camera).

It discovers the webcams of the host with [`ffmpeg`](https://ffmpeg.org/) and lets you configure and preview them from the Matterbridge frontend.

Features:

- The webcams of the host are discovered with ffmpeg on Linux (v4l2), macOS (avfoundation) and Windows (dshow) with a single button in the frontend.
- A notification is shown in the frontend for each new webcam discovered.
- The webcams are saved in the plugin config and can be edited: each webcam has a name, a video source and an audio source.
- Each webcam can be previewed in an ffplay window with the Play button in the frontend (not available in docker).
- In docker, ffmpeg can be installed automatically at start if it is not found.

## Quick start

1. Install the plugin: in the Matterbridge frontend, type `matterbridge-webcam` in the **Install plugins** box, press **Install** and restart Matterbridge when asked.
2. Open the plugin configuration and press **Discover**: the webcams found are added to the list.
3. Press **Play** to check a webcam (on a host with a desktop), then save and restart the plugin.
4. The webcams appear in your Matter controller.

## Prerequisites

### Matterbridge

Requires Matterbridge `3.11.0` or later. See the complete guidelines on [Matterbridge](https://matterbridge.io/README.html) for more information.

### Matter controller

A Matter controller that supports cameras (Matter 1.5 or newer). At the moment these are SmartThings and the [Open Home Foundation Matter Server](https://github.com/matter-js/matterjs-server) dashboard (Home Assistant does not show Matter cameras yet). Apple Home, Google Home and Alexa have announced camera support but not released it. A controller without camera support does not show the webcam.

### ffmpeg

Requires the full [`ffmpeg`](https://ffmpeg.org/) build (it includes `ffplay`) to be installed on the host. The plugin looks for it in the system `PATH` and in the common installation directories on Linux, macOS and Windows.

In Docker, enable the `autoInstallFfmpeg` option (enabled by default) and the plugin installs ffmpeg at start with `apk` or `apt-get` if it is not found. If you use more than one ffmpeg plugin (camera, webcam), enable it on only one of them: concurrent installs fail on the package manager lock.

The **Install ffmpeg (Linux only)** button installs ffmpeg on demand, including outside Docker. Matterbridge must run as root on Linux with `apk` (Alpine) or `apt-get` (Debian/Ubuntu). The frontend reports the result; if ffmpeg is already installed, no installation is performed. On macOS and Windows, install ffmpeg manually.

#### Linux (Debian/Ubuntu)

```bash
sudo apt update && sudo apt install -y ffmpeg
```

#### macOS

```bash
brew install ffmpeg
```

#### Windows

```powershell
winget install --id Gyan.FFmpeg -e
```

## How to add a webcam

In the frontend open the plugin config and press Discover in the webcams section: the webcams found are added to the list. You can also add a webcam manually: enter the webcam name in the first field (replace newKey with the name you want to give to the webcam) and the video source and the audio source in the right panel.

The sources depend on the platform:

| Platform | Video source                             | Audio source        |
| -------- | ---------------------------------------- | ------------------- |
| Linux    | the device path, i.e. /dev/video0        | not used            |
| macOS    | the device name, i.e. FaceTime HD Camera | the microphone name |
| Windows  | the device name, i.e. Integrated Camera  | the microphone name |

Leave the audio source empty for no audio. Press Play to check the webcam in an ffplay window.

Each webcam also supports `videoResolution` (`auto`, `640x480`, `1280x720`, or `1920x1080`) and `videoBitrate` (positive encoder bitrate in kbps). Missing values and newly discovered webcams default to `auto` and `1000`; existing configured values are preserved. `auto` follows the controller's requested resolution. These options apply to Matter streaming, not the local Play preview. Save and restart the plugin to apply changes.

## Webcam access

### Linux

The user that runs Matterbridge needs access to the webcam device. If Discover finds nothing, add the user to the `video` group and log in again:

```bash
sudo usermod -aG video $USER
```

### macOS

macOS asks for Camera and Microphone access the first time the webcam is used. Allow it for the app that runs Matterbridge (Terminal, iTerm or node). If you denied it, enable it in **System Settings > Privacy & Security > Camera** (and **Microphone**).

### Docker

The container sees only the devices you pass to it. On a Linux host, pass the webcam with `--device`:

```bash
docker run --device /dev/video0 ...
```

In Docker Compose:

```yaml
devices:
  - /dev/video0:/dev/video0
```

Docker Desktop on macOS and Windows cannot pass a webcam to the container: run Matterbridge directly on the host instead.

## WebRTC streaming in Docker

If the picture is black and Matterbridge runs in Docker, use host networking as in the [Docker guide](https://matterbridge.io/README-DOCKER.html) (`--network host`, or `network_mode: host` in Compose). If you can't use it (bridge network, Docker Desktop, dev container), read the details below.

When Matterbridge runs in a container (Docker, Docker Desktop, a dev container) and the stream is viewed in a browser (Home Assistant, the OHF Matter Server dashboard), the video can stay black because the browser cannot reach the camera over UDP. See [Matterbridge WebRTC (werift) networking](https://matterbridge.io/Camera.html) for the cause and the `MATTERBRIDGE_ICE_PORT_RANGE` and `MATTERBRIDGE_ICE_HOST_ADDRESSES` overrides.

## Troubleshooting

- **Discover finds no webcam**: check the [Webcam access](#webcam-access) section, and that ffmpeg is installed.
- **The webcam does not appear in the controller**: check that the controller supports Matter cameras, then restart the plugin after saving the configuration.
- **Black picture in the controller**: check the [WebRTC streaming in Docker](#webrtc-streaming-in-docker) section, and that ffmpeg is installed (the log shows `missing dependency ffmpeg`).
- **High CPU usage**: use a lower resolution or a lower bitrate.

If the problem persists, set the Matterbridge log level to debug, reproduce the problem and open an [issue](https://github.com/Luligu/matterbridge-webcam/issues) with the log.

## Development guide

Refer to the Matterbridge [Development guide](https://matterbridge.io/README-DEV.html) for other guidelines.

## Repository toolchain

See [TOOLCHAIN.md](./TOOLCHAIN.md) for compilers, linting, formatting, testing, and editor support.

## Shared agent instructions

See [SHARED-AGENTS.md](./SHARED-AGENTS.md) for shared guidance, rules, skills, and configuration for coding agents.

See [.agents/README.md](./.agents/README.md) for the shared instructions layout and versioning.

## Shared dev container support

See [.devcontainer/README.md](./.devcontainer/README.md) for the shared development container setup and usage.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Style guide

See [STYLEGUIDE.md](./STYLEGUIDE.md) for code style, naming, documentation, and testing conventions.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and notable changes.

## Issues and feature requests

Report bugs and suggest improvements on [GitHub Issues](https://github.com/Luligu/matterbridge-webcam/issues).

## License

Licensed under the [Apache License 2.0](./LICENSE).

## Support the project

If you find this project useful, please consider giving it a star on [GitHub](https://github.com/Luligu/matterbridge-webcam) and sponsoring it. Your support helps maintain and improve the project.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/luligugithub)
