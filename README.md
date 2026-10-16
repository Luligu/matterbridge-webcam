# <img src="https://matterbridge.io/assets/matterbridge.svg" alt="Matterbridge Logo" width="64px" height="64px">&nbsp;&nbsp;&nbsp;Matterbridge webcam plugin

[![npm version](https://img.shields.io/npm/v/matterbridge-webcam.svg)](https://www.npmjs.com/package/matterbridge-webcam)
[![npm downloads](https://img.shields.io/npm/dt/matterbridge-webcam.svg)](https://www.npmjs.com/package/matterbridge-webcam)
[![Docker Version](https://img.shields.io/docker/v/luligu/matterbridge/latest?label=docker%20version)](https://hub.docker.com/r/luligu/matterbridge)
[![Docker Pulls](https://img.shields.io/docker/pulls/luligu/matterbridge?label=docker%20pulls)](https://hub.docker.com/r/luligu/matterbridge)
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

Requires Matterbridge `3.10.14` or later. See the complete guidelines on [Matterbridge](https://matterbridge.io/README.html) for more information.

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

## Style guide

See also the [Style Guide](./STYLEGUIDE.md) for JSDoc, naming, and logging conventions used in this repository.

## Repository toolchain

> **Note:** This repository uses a new toolchain. It replaces the traditional TypeScript / ESLint / Prettier / Jest stack with a faster and lighter setup.

- **No `typescript 6.x` package** — replaced by [TypeScript Native 7.x](https://github.com/microsoft/typescript-go).
- **No ESLint, no Prettier** — replaced by the [oxc](https://oxc.rs) stack: [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for formatting.
- **No Jest** — replaced by [Vitest](https://vitest.dev), which is much faster and natively supports ESM without extra configuration.
- **Far fewer development dependencies** — the number of installed packages drops from **~600** to **~75**. A clean install is much faster.
- **Much faster linting and formatting** — oxlint and oxfmt run in a fraction of the time required by the ESLint / Prettier pipeline.
- **Much faster builds** — tsgo compiles the project in a fraction of the time required by the standard `tsc` build.
- **Editor support** — use the VS Code extensions for tsgo and oxc to get the same experience in the editor.

## Shared agent instructions

All coding agents read the same guidance. [AGENTS.md](./AGENTS.md) and [.agents/](./.agents/) are the **single source of truth**; everything under `.github/`, `.claude/`, `.codex/` and `.antigravity/` are pointers and mirrors. Edit `.agents/` (or `AGENTS.md`), never the copies. See [.agents/README.md](./.agents/README.md) for the full layout.

| File                                            | Notes                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `AGENTS.md`                                     | Main project instructions — shared by every agent                                                            |
| `.agents/README.md`                             | Layout and versioning of the shared instructions                                                             |
| `.agents/rules/testing.instructions.md`         | Testing standards for unit tests                                                                             |
| `.agents/rules/matterbridge.instructions.md`    | Creating endpoints and using the single-class devices                                                        |
| `.agents/rules/plugin-frontend.instructions.md` | Serving a plugin's own frontend SPA and REST API                                                             |
| `.agents/rules/chip-tests.instructions.md`      | The CHIP conformance test harness                                                                            |
| `.agents/skills/verify-agent-context/SKILL.md`  | Verify the agent loaded this context — `$verify-agent-context` (Codex), `/verify-agent-context` (all others) |

Content lives only in `.agents/`. The per-agent folders exist because each tool discovers rules and skills from its own hardcoded location, so they hold stubs that point back here — except where the tool reads `.agents/` natively.

| Tool                               | Instructions                                    | Rules                                                 | Skills                                              |
| ---------------------------------- | ----------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Codex                              | `AGENTS.md` — read natively                     | `.agents/rules/` — linked from `AGENTS.md`, on demand | `.agents/skills/` — native, `$verify-agent-context` |
| Copilot (VS Code and coding agent) | `.github/copilot-instructions.md` → `AGENTS.md` | stubs in `.github/instructions/` — `applyTo` globs    | stub in `.github/skills/` — `/verify-agent-context` |
| Claude Code                        | `CLAUDE.md` imports `AGENTS.md`                 | stubs in `.claude/rules/` — `paths` globs             | stub in `.claude/skills/` — `/verify-agent-context` |
| Gemini / Antigravity               | `GEMINI.md` imports `AGENTS.md`                 | `.agents/rules/` — on demand                          | `.agents/skills/` — native, `/verify-agent-context` |

### Copilot instructions

| File                                                                   | Notes                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `.github/copilot-instructions.md`                                      | Pointer to AGENTS.md — always loaded                                               |
| `.github/instructions/chip-tests/chip-tests.instructions.md`           | CHIP conformance test harness — scoped to CHIP test files                          |
| `.github/instructions/matterbridge/matterbridge.instructions.md`       | Matterbridge endpoint guide — dedicated Copilot instruction file                   |
| `.github/instructions/plugin-frontend/plugin-frontend.instructions.md` | Plugin frontend SPA and custom REST API guide — scoped to frontend and plugin code |
| `.github/instructions/testing/testing.instructions.md`                 | Testing standards — scoped to `**/*.test.ts`                                       |
| `.github/skills/verify-agent-context/SKILL.md`                         | Skill invocable as `/verify-agent-context`                                         |

### Claude instructions

| File                                                            | Notes                                                                              |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `CLAUDE.md`                                                     | Pointer to AGENTS.md — always loaded                                               |
| `.claude/settings.json`                                         | Claude permissions: allow, ask and deny rules                                      |
| `.claude/rules/chip-tests/chip-tests.instructions.md`           | CHIP conformance test harness — scoped to CHIP test files                          |
| `.claude/rules/matterbridge/matterbridge.instructions.md`       | Matterbridge endpoint guide — loaded for all contexts                              |
| `.claude/rules/plugin-frontend/plugin-frontend.instructions.md` | Plugin frontend SPA and custom REST API guide — scoped to frontend and plugin code |
| `.claude/rules/testing/testing.instructions.md`                 | Testing standards — scoped to `**/*.test.ts`                                       |
| `.claude/skills/verify-agent-context/SKILL.md`                  | Skill invocable as `/verify-agent-context`                                         |

### Codex instructions

| File                         | Notes                                                             |
| ---------------------------- | ----------------------------------------------------------------- |
| `AGENTS.md`                  | Main project instructions — read directly, no pointer file needed |
| `.codex/config.toml`         | Codex project permissions, approvals, and profile                 |
| `.codex/rules/default.rules` | Codex command allow, prompt, and deny rules                       |

Codex reads the shared rules and skills from `.agents/` directly; the skill is invoked as `$verify-agent-context`.

### Gemini / Antigravity instructions

| File                         | Notes                                                 |
| ---------------------------- | ----------------------------------------------------- |
| `GEMINI.md`                  | Pointer to AGENTS.md — always loaded                  |
| `.antigravity/settings.json` | Sandboxing and permissions: allow, ask and deny rules |

The shared rules under `.agents/rules/` apply on demand for the relevant tasks, and `.agents/skills/` is discovered automatically as `/verify-agent-context`.

## Development guide

Refer to the Matterbridge [Development guide](https://matterbridge.io/README-DEV.html) for other guidelines.

---
