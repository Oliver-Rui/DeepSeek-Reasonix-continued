<p align="center">
  <img src="docs/logo-ghost-wave-effect.svg" alt="Reasonix" width="360"/>
</p>

> [!NOTE]
> **DeepSeek-Reasonix-torch** — a personal fork of [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) on the `studio` (2.x) line.
>
> QQ group: **1821170167**
>
> Upstream stopped at v2.61.0; this fork continues from there: a navigation shell rebuilt as
> one table, sessions that hand each other work, and fixes that keep landing.

<p align="center">
  <strong>English</strong>
  &nbsp;·&nbsp;
  <a href="./README.zh-CN.md">简体中文</a>
  &nbsp;·&nbsp;
  <a href="./docs/GUIDE.md">Guide</a>
  &nbsp;·&nbsp;
  <a href="./docs/ACP.md">ACP</a>
  &nbsp;·&nbsp;
  <a href="./docs/EXTENSIONS.md">Extensions</a>
  &nbsp;·&nbsp;
  <a href="./docs/SPEC.md">Spec</a>
</p>

<br/>

## What this fork changes

This fork is **DeepSeek-Reasonix-torch**. The engine is kept as upstream left it; the work lands in Reasonix Studio:

### A navigation shell rebuilt as one table

- The sidebar and the icon rail draw the rows of one list, so the two can neither disagree nor offer the same entry twice.
- 右键图标栏 opens 自定义导航栏: one panel orders the rows and hides them, dragging reorders, and the order is written on release.
- The conversation rail is a ruler: dense right-aligned ticks, the viewport one darker tick, and pointing at a message stretches that tick into its text card.
- The session tree reads as two named groups — 项目 over the remembered projects, 任务 over the window's own folder.
- 最近 is an ordering in the session filter menu, not a page.

### Sessions that hand each other work

- A dispatch may name the session it opens, and `peers.incoming` (ask / dispatch / always) decides what another of your sessions may send without a card.
- 新建会话 opens 选择项目 first: search, local and remote projects, 创建项目, and 不在项目中工作 — which opens the session in the kernel's own non-project folder. The 新建 on a project row bypasses the picker.

### Fixes that keep landing

- The settings windowbar's 最小化 / 最大化 / 关闭 stay clickable while 设置 is open.
- The scope pill and its dropdown rows hold their layout at any zoom.
- The files panel opens from whichever entry the layout has on a 1400px window.

## Versions

This fork continues from upstream's **v2.61.0** — the point where upstream declared maintenance stopped. Releases move along the `studio` line: **2.62.0** is the first fork release.

Releases are published from this repository's own [releases page](https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued/releases). v2.61.0 remains the last upstream release.

## Install

Reasonix Studio is the desktop app; the CLI, Studio and the editor integrations all run the same local Reasonix engine.

Build it from source:

```sh
git clone https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued.git
cd DeepSeek-Reasonix-continued
git switch studio
```

### CLI

The CLI build requires **Go 1.26+**. The module pins a `toolchain` directive;
keep `GOTOOLCHAIN=auto` so Go downloads the pinned toolchain, or install it.

```sh
make build      # -> bin/reasonix(.exe)
make cross      # -> dist/ (darwin|linux|windows × amd64|arm64)
```

### Studio

Studio additionally requires **Node 24+ and pnpm 10**
(`npm install -g pnpm@10`) for the frontend.

```sh
make studio
```

See the [Studio build guide](desktop/README.md#prerequisites) for platform
webview dependencies and Linux build tags.

## Quick start

### Reasonix Studio

Install and launch Studio, then connect a provider and model in the app. No CLI
setup is needed.

### CLI / TUI

```sh
reasonix setup                      # configure a provider and model
reasonix                            # start an interactive session
reasonix run "implement the TODOs in main.go"
```

In an interactive session, run `/init` when you want Reasonix to create project
instructions.

For advanced CLI usage and configuration, see the **[CLI reference](./docs/CLI.md)**,
**[Guide](./docs/GUIDE.md)**, and
**[configuration paths](./docs/CONFIG_PATHS.md)**.

## Documentation

- **Getting started:** [Guide](./docs/GUIDE.md) · [CLI reference](./docs/CLI.md) ·
  [Configuration paths](./docs/CONFIG_PATHS.md) · [ACP editor integration](./docs/ACP.md)
- **Features & troubleshooting:** [Subagent profiles](./docs/SUBAGENT_PROFILES.md) ·
  [Context Engine v2](./docs/SESSION_MEMORY_RETRIEVAL.md) ·
  [Capability diagnostics](./docs/CAPABILITY_DIAGNOSTICS.md) ·
  [Recovery and updates](./docs/RECOVERY.md) ·
  [Checkpoints & rewind](./docs/CHECKPOINTS.md)
- **Agent presets:** [Session Agent compositions](./docs/AGENT_COMPOSITIONS.md)
- **Engineering:** [Spec](./docs/SPEC.md) ·
  [Task contracts & pause policy](./docs/TASK_CONTRACT.md) ·
  [Tool contract](./docs/TOOL_CONTRACT.md)
- **Extension development:** [Skills](./docs/SKILLS.md) · [Extensions](./docs/EXTENSIONS.md) ·
  [Plugin packages and Manifest v1](./docs/PLUGIN_PACKAGES.md) ·
  [Extension Protocol](./docs/EXTENSION_PROTOCOL.md) ·
  [Go SDK and starter](./sdk/go/README.md)

## Credits

Engine, desktop app and most of this documentation come from
[esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix), under the MIT license.

<p align="center">
  <sub>MIT — see <a href="./LICENSE">LICENSE</a></sub>
</p>
