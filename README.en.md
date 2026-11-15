<div align="center">

# ProkBot Plus

**Move the Grok Bot server side onto your own server, and connect your own models.**

Windows, macOS and iOS patches | [Independently developed Android app (unofficial)](#android-client) | **Linux Host for x86_64 and ARM64** | OpenAI Chat / OpenAI Responses / Anthropic Messages

<p>
<!-- client-badges:start -->
  <a href="#client-versions"><img alt="Windows official 1.1.0 x64" src="https://img.shields.io/badge/Windows%20official-1.1.0%20x64-0078D4?logo=windows&logoColor=white"></a>
  <a href="#client-versions"><img alt="Windows patch accepts only 1.1.0 x64" src="https://img.shields.io/badge/Windows%20patch%20accepts%20only-1.1.0%20x64-237E55?logo=windows&logoColor=white"></a>
  <a href="#client-versions"><img alt="macOS official 1.1.0 ARM64" src="https://img.shields.io/badge/macOS%20official-1.1.0%20ARM64-111111?logo=apple&logoColor=white"></a>
  <a href="#client-versions"><img alt="iOS official 1.25.0" src="https://img.shields.io/badge/iOS%20official-1.25.0-111111?logo=apple&logoColor=white"></a>
  <a href="#client-versions"><img alt="Android shell 1.1.0" src="https://img.shields.io/badge/Unofficial%20Android-1.1.0-237E55?logo=android&logoColor=white"></a>
<!-- client-badges:end -->
  <img alt="Host d0a4baa" src="https://img.shields.io/badge/Host-d0a4baa-2496ED?logo=docker&logoColor=white">
  <img alt="Noncommercial License" src="https://img.shields.io/badge/License-Noncommercial-6B7280">
  <a href="https://linux.do"><img alt="LINUX DO" src="https://img.shields.io/badge/Community-LINUX%20DO-F5A623"></a>
</p>

[简体中文](README.md) · **English**

</div>

<a id="client-versions"></a>
<!-- client-versions:start -->
**Which version should I install?** Official channels checked on 2026-11-14. Use the input in the right column. A newer vendor release is not a Plus compatibility claim.

| Platform | Latest official release | Input accepted by Plus / shell version |
| --- | --- | --- |
| Windows x64 | [1.1.0](https://api2.cursor.sh/updates/api/download/stable/win32-x64-user/sand) | 1.1.0 |
| macOS ARM64 | [1.1.0](https://api2.cursor.sh/updates/api/download/stable/darwin-arm64/sand) | 0.71.2; no Mac hardware test |
| iOS | [1.25.0](https://apps.apple.com/us/app/grok-bot/id6794501026) | 1.16.0 (23152); no iPhone or iPad hardware test |
| Android 9+ (unofficial) | Does not use the official Android APK | Shell **1.1.0** (build 10100), renderer from Windows **0.71.2** |
| Linux Host / execution desktop | No published mapping to the latest desktop release | Host `d0a4baa`; execution desktop `9d2ac1b` (amd64) |

[Latest ProkBot Plus release](https://github.com/ferretgeek/prokbot-plus/releases/latest) uses the project’s own version number. The upstream ProkBot baseline is `3e9fe8c`.
<!-- client-versions:end -->

<p align="center">
  <img src="docs/images/windows-chat.png" alt="Windows client: the Bot looks up when to see the red autumn leaves at Fragrant Hills, cites its sources, and also paints a 16:9 watercolor" width="880">
</p>
<p align="center"><sub>The Windows client. One message gets the Bot to look something up, cite its sources, and draw a picture on the side. The model, web access and image generation all go through your own APIs.</sub></p>
<p align="center"><sub>The screenshots show the Chinese UI; the apps also support English.</sub></p>

ProkBot Plus is a modified version of the open-source project [ProkBot](https://gitee.com/ahaduoduoduo/ProkBot). The idea behind ProkBot: the original Grok Bot apps and Agent work well, but they can only connect to the official cloud. ProkBot runs the server side (the Host and the Linux desktop used for execution) in Docker on your own machine, then patches the original apps so they connect to your server.

Plus adds on top of that: **Windows and Android clients**; **two more model APIs, Anthropic Messages and OpenAI Responses** (upstream supports only OpenAI Chat); and a set of fixes that make web search, image generation and local commands work smoothly in real use.

> This is an unofficial project. It has no connection to xAI or the official Grok Bot. Noncommercial use only. See [License and notices](#license-and-notices).

## What it does

- **Use the original Grok Bot.** The interface, Agent, tool calls, memory, scheduled tasks and action approvals are all the original ones. Only the server side is now in your hands.
- **Connect any model that supports tool calls.** Claude, GPT, DeepSeek, Grok, or any aggregator gateway. Pick any of the three API formats, and set thinking effort anywhere from `none` to `max`. You can also let the Jev classifier pick the model by task difficulty.
- **Let the Bot work on its own computer.** The server comes with a Linux desktop. The Bot runs commands, opens a browser and handles files on it.
- **Let the Bot operate your computer.** On Mac it can run commands and control the graphical interface. On Windows it can run local commands, and it asks you in a pop-up before each one.
- **Web access and image generation.** Search and read web pages with the model's built-in web tools. Generate images with an OpenAI-compatible image API, with support for set aspect ratios and editing from a reference image.
- **Your data stays on your machine.** Chats, files, memory and Bot data are all stored on your server. Telemetry and automatic updates are turned off.
- **Use it on your phone.** iOS and Android clients: get notified when a Bot replies, watch the Bot's computer live and take over.
- **Use it when you're out.** Direct LAN connection, built-in Tailcat networking (no public IP needed), or your own HTTPS domain.

## Supported systems

| Part | Supported | Notes |
| --- | --- | --- |
| Server | Linux x86_64 or ARM64 | Earlier x86_64 testing used Ubuntu 24.04 and Docker 29. Historical A1 tests covered chat and VNC between a native ARM64 Host and a separate amd64 desktop, not an A1 build, upgrade or capacity test in this round. Single-machine ARM emulation remains experimental. [Choose a deployment](docs/AI-INSTALL.en.md#choose-a-deployment) |
| Windows client | Windows 10 / 11, x64, Grok Bot 1.1.0 | Portable version and installer, no administrator rights needed. Pairing, a two-turn chat, attachments, search, local commands and a restart were verified with the patched client on Windows. |
| Mac client | Apple Silicon, Grok Bot 0.71.2 | No Mac was available for this round. The desktop code shared with Windows was tested, but installation, launch, pairing and chat were not verified on macOS. |
| iOS client | Grok Bot 1.16.0 (23152) | No iPhone or iPad was available for this round. The patch tool was tested, but signing, installation, pairing and chat were not verified on a device. Installation still requires your own decrypted IPA and signing certificate. |
| Android client | Android 9 or later | Independently developed, unofficial shell. Build from the pinned Windows 0.71.2 input and keep your original signing key. |
| Linux desktop client | No patch from this project | [The official app is available on Linux](https://docs.x.ai/grok-bot/deployment). It is not the amd64 execution desktop image used by the server. |

## What's new in this version

### Windows client

<table>
  <tr>
    <td width="36%"><img src="docs/images/windows-connect.png" alt="First connection in the Windows client: enter the Host address and pairing code"></td>
    <td><img src="docs/images/windows-approve.png" alt="Before the Bot runs a command on the Windows PC, a confirmation card offers Allow once, Always allow and Never"></td>
  </tr>
  <tr>
    <td><sub>On first launch, enter the Host address and the 6-character pairing code.</sub></td>
    <td><sub>When the Bot wants to run a command on your computer, it asks you first.</sub></td>
  </tr>
</table>

Upstream has only Mac and iOS. The Windows version is built by patching the latest official Windows installer, 1.1.0, and its interface matches the official Windows version:

- Stays in the system tray, system notifications, attachments, message search, Tailcat;
- Local command execution (PowerShell, Chinese output is not garbled);
- Hands complex coding work to Codex on your computer;
- Voice input and real-time voice calls are served by the Host;
- Builds both a portable version and an installer.

Every change in the patch is anchored to a unique location in the original file. A generator in the repository rebuilds the patch from the official installer and checks it byte for byte.

### Android client

**ProkBot Plus develops this Android app independently. It is neither the official xAI Android app nor a patch to the official Android APK.**

<p align="center">
  <img src="docs/images/android-chat-en.png" alt="A real Android conversation: Pantry suggests cooking the egg first for fried rice, then answers a follow-up about breaking up clumped rice." width="380">
</p>
<p align="center"><sub>Captured on an Android 15 emulator. Both questions were sent in the app; the model connected to the self-hosted Host generated both replies.</sub></p>

The official Android app carries tamper protection and cannot be modified. Plus takes another route: it puts the official **desktop** interface (the same one as the Windows and Mac clients, taken from your own download of the official Windows installer) into an Android shell written for this project, and builds an APK:

- Conversations, Bot management, skills, the library, routines and settings are the original interface, rearranged after the official phone app: the Bot list and a conversation are separate screens with the same round floating buttons, message bubbles, colors and typeface, details, settings and search open full screen, and menus and dialogs slide up from the bottom; with the back gesture and dark mode;
- Watch the Bot's computer live on the phone, and operate it with touch and the on-screen keyboard after "Take control";
- Upload files from the phone, and save files the Bot sends to the phone;
- Background notifications without Google's push service; tapping one opens that Bot;
- The device credential is encrypted with the Android Keystore and never reaches the web page.

The APK is signed with your own key. Tailcat is not supported; for access from outside, use a VPN, a tunnel or an HTTPS domain. See [client installation](docs/AI-INSTALL.en.md#client-packages) for the build and signing-key backup instructions.

### Three model APIs

<p align="center"><img src="docs/images/admin-model.png" alt="Chat model settings in the admin page: API format, Base URL, API key, default model and thinking effort" width="760"></p>

Upstream supports only OpenAI Chat Completions. Plus adds **Anthropic Messages** and **OpenAI Responses**. All three formats are fully supported: images, files, tool calls, thinking effort, and reasoning carried across turns.

- Switching models or formats in the middle of a conversation doesn't cause errors.
- When a provider doesn't support an optional parameter, it is removed and the request is retried automatically.
- Automatic safety review also works with all three formats.

### Web access and image generation

<table>
  <tr>
    <td><img src="docs/images/admin-web.png" alt="Web tools settings: search and fetch web pages with the native web tools of Claude Opus 5.5"></td>
    <td><img src="docs/images/admin-media.png" alt="Images & video settings: default image model GPT Image 2.6 Sunburst"></td>
  </tr>
</table>

Upstream already connected the original web and image tools, but they had quite a few problems with newer models. Plus fixes these:

- Newer Claude models don't accept forced tool calls, so web access failed outright → it now switches to a regular tool call automatically;
- In a parallel search, if one search went over its usage limit, the whole search was marked as failed → now the result is used as long as one search succeeds;
- When the Bot asked to "draw a 16:9 image", the OpenAI image API returned an error → the ratio is now converted to the matching size automatically;
- Editing with a reference image returned an error → it now goes through the image edit endpoint.

### Other fixes

- **Message order.** The original Bot splits a reply into several short messages. In the upstream implementation, these messages could arrive out of order, with the short ones first. Now they are delivered strictly in the order the model wrote them.
- **Automatic review.** When the model sometimes answered in the wrong format, the action used to be rejected right away, with nothing in the log. Now it retries once, and failures are logged.
- **Linux deployment.** Docker 29 uses the containerd image store by default, which broke the upstream build script. This is now supported.
- **Command-line management.** New `host/tools/host-admin.mjs` lets you set up the Host, configure models and create pairing codes without opening the web page. This makes things easier for scripts and AI.
- **Docs.** A new [AI deployment guide](docs/AI-INSTALL.en.md) that even an average model can follow.

See the [CHANGELOG](CHANGELOG.md) and the [technical documentation](docs/ARCHITECTURE.en.md) for all changes.

## Compared with the official Grok Bot

**Benefits**

- Use the models and providers you choose. Costs are billed through your own API, and you can also use relays or aggregator gateways.
- Chats, files and memory are all on your own server, with no telemetry.
- Works where the official service isn't available. You can also use it only on your LAN.
- Some things the official version doesn't have:
  - Edit the system prompt, and restore the original at any time;
  - Set the context length per model;
  - Usage statistics;
  - Tasks triggered by webhooks;
  - Write your own apps (plugins);
  - Bot collaboration across several Hosts;
  - Back up the project's managed Docker data volumes and restore them into a new project. Images, the instance `.env` and the host OS are not included. See [backup and recovery](docs/AI-INSTALL.en.md#volume-recovery).

**Trade-offs**

- You need Linux and are responsible for upgrades and backups. The evidence for each deployment mode is listed below.
- Versions are pinned: Windows client 1.1.0, Mac client and Android interface 0.71.2, iOS 1.16.0, Host `d0a4baa`. When the official apps update, you have to wait for the patches to catch up before upgrading, and there are no automatic updates.
- Results depend on the model you choose. The official service is tuned for its own models. With other models, the experience may not be as good.
- Some official features are turned off or replaced:
  - Turned off: virtual cards, external message drafts, product feedback, passkey forwarding;
  - Replaced: voice, push notifications, image and video generation and others, which need providers you set up yourself;
  - Real-time calls are experimental for now.
- The clients are not code-signed: Windows shows a SmartScreen warning on first launch; on iOS you sign and install the app yourself; on Android you allow installing apps from unknown sources.
- The Windows version can't yet let the Bot control the mouse and keyboard. The original component for this only exists for macOS.
- The Android version does not support Tailcat. Background notifications rely on a connection that stays open; some phones need the app allowed to run in the background in the system settings.
- Modifying the official client may break the official terms of use. Use at your own risk.

## What you need to deploy

Check the [client versions](#client-versions) before installing. The patch tools require the pinned originals. The [official changelog](https://x.ai/changelog/bot) does not establish self-hosted client compatibility.

| Deployment | Tested minimum | Tested recommendation | Disk | Workload and observed limits |
| --- | --- | --- | --- | --- |
| x86_64 Host and desktop together | Not established | Not established | 50 GiB test guest, not a minimum | The older baseline completed a two-turn chat on 2 vCPU / 2 GiB without swap; a background model disconnect also restarted its core. Both timed 2C2G candidate diagnostics failed. The 2C4G and 4C8G VMs have separate functional observations, not capacity ratings. |
| ARM64 Host and separate amd64 desktop | Neither machine rated | Neither machine rated | Budget images, data and backups separately for each machine | Historical A1 chat and desktop tests did not measure capacity on both machines in this upgrade. |
| ARM64 Host and emulated amd64 desktop | Not established | Not established | Allow for images of both architectures | Experimental. An amd64 preflight does not establish desktop stability. |
| Host only, no remote execution node configured | Not applicable | Not a standalone chat deployment | Host image, data and backups; amd64 builds still use the desktop base | `--host-only` selects split deployment. The chat core starts only after a model is configured and a remote execution node enabled. The console and its setup health check can work before then. |

**Timed 2C2G diagnostics** (vCPU / GiB): Both runs tested the candidate. Two of three requests met the first run's deadline. No matching reply was recorded within 55 seconds for the third, and there is no receipt establishing later delivery. One upstream model call during that period took 81.68 seconds; this is not Host processing time. In the second run, four replies arrived in 8.524, 10.272, 17.608 and 24.200 seconds. The fifth missed its deadline. Neither run reached one hour or establishes a hardware tier.

**2C4G and 4C8G functional observations:** Each configuration ran in its own VM. Both completed device pairing, a 52-byte attachment, two real-model turns and cancellation. After an explicit Host restart, the originally paired device read back the same IDs, message bodies, attachment SHA-256 and model configuration. On 2C4G, the fresh-install build took 519.14 seconds and the first/follow-up replies took 100.24/2.08 seconds. On 4C8G, the build took 589.05 seconds and the replies took 106.02/2.16 seconds. These are single functional observations for each VM, not capacity tests, matched before/after comparisons or hardware recommendations.

Inference ran on another machine and is outside those VM allocations. Budget disk separately for build caches, live data and backups. Run [capacity tests](docs/ARCHITECTURE.en.md#capacity-evidence) only on dedicated, authorized non-production VMs. Do not use production instances, volumes or credentials for this upgrade rehearsal or load test.

| Required | Requirements |
| --- | --- |
| Server | 64-bit Linux, Docker Compose supporting both `--wait` and `--wait-timeout` on `up`, and Python 3.10+. ARM desktop emulation also needs QEMU/binfmt. The previous guide's 8 GB of RAM and 30 GB of free disk are planning allowances, not tested minimums or recommendations. |
| Model API | Any one of: Anthropic Messages, OpenAI Responses, OpenAI Chat Completions. It must support tool calls. For the Bot to operate a computer, it also needs image input |
| Computer to build the clients | Build the Windows client on Windows 10/11 x64 and the Mac client on an Apple Silicon Mac; the Android client builds on Windows, Mac or Linux. All need Node.js 22.12+. iOS needs a decrypted IPA and a signing certificate |

| Optional | Used for |
| --- | --- |
| A model with native web access | The Bot searches and reads web pages (for example Claude's `web_search`) |
| An OpenAI-compatible image API | The Bot generates and edits images |
| Bark or an Apple push certificate | Push notifications on iPhone (not needed for Android) |
| Speech recognition and synthesis services | Voice input, real-time calls |
| A domain and HTTPS | Access from outside without Tailcat |

## Install

The easiest way is to hand it to an AI that can run commands (Claude Code, Codex, Cursor and similar tools all work). Send it this:

```text
Please deploy ProkBot Plus for me: https://github.com/ferretgeek/prokbot-plus
First read docs/AI-INSTALL.en.md in the repository in full, then follow its steps exactly.
Ask about my machines, any existing instance, model and access method. Run doctor first. Never remove volumes, disclose keys or treat container startup as acceptance. Verify a two-turn client chat and a desktop action at the end.
```

The AI first lists what you need to prepare. Then it deploys the server, configures the model, builds the clients step by step, and checks the result at the end.

If you'd rather do it yourself, follow the [AI deployment guide](docs/AI-INSTALL.en.md). It is written for AI, but every step lists the commands and how to check them, so a person can follow it just as well.

The [latest release](https://github.com/ferretgeek/prokbot-plus/releases/latest) provides Host, Windows, Mac, iOS and Android tools plus `SHA256SUMS.txt`. Choose your platform ZIP. No vendor binaries, IPAs or finished clients are distributed.

## Documentation

| Document | Contents |
| --- | --- |
| [AI deployment guide](docs/AI-INSTALL.en.md) | Full steps for deploying from scratch. Every step says what you should see and what to do if it fails |
| [Technical documentation](docs/ARCHITECTURE.en.md) | How it works, how each feature is implemented, what Plus changed, the layout, tests, extension points and known limitations |
| [Maintainer handoff](docs/HANDOFF.en.md) | Released code, edit points, test inputs, recovery and release |
| [Client installation and platform guides](docs/AI-INSTALL.en.md#client-packages) | Pinned inputs and where to find the instructions inside each platform package |
| [Split deployment](docs/AI-INSTALL.en.md#split-host), [volume recovery](docs/AI-INSTALL.en.md#volume-recovery), [app development](docs/ARCHITECTURE.en.md#app-development) | Advanced usage; these sections are included in every package |

## Friends

- [LINUX DO](https://linux.do): a Chinese tech community where ProkBot Plus is discussed and released. Questions and ideas are welcome there.

## License and notices

- This project is derived from [ProkBot](https://gitee.com/ahaduoduoduo/ProkBot) (based on its 2026-11-05 version, commit `3e9fe8c`) and keeps its [ProkBot Noncommercial License 1.0](LICENSE).
  - You may use, study, modify and distribute it for personal and noncommercial purposes;
  - You may not use it for any commercial purpose, including paid deployments, paid services and internal use in a company.
  - See [NOTICE](NOTICE) for the source and the list of changes.
- The repository contains no official Grok Bot programs or finished client APKs or IPAs. `android/dist/` contains only the independently developed empty shell. The desktop interface comes from your own verified Windows installer.
- Grok, Grok Bot and related trademarks belong to their respective owners. This project is not affiliated with or endorsed by them.
- Most of the code in this project was written with AI assistance and is maintained by 6.2Astra and Opus5.5 together. It is provided as is, without any warranty.
- To report a security issue, see [SECURITY.md](SECURITY.md). To contribute, see [CONTRIBUTING.md](CONTRIBUTING.md).
