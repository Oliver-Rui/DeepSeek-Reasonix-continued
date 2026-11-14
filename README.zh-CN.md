<p align="center">
  <img src="docs/logo-ghost-wave-effect.svg" alt="Reasonix" width="360"/>
</p>

> [!NOTE]
> **DeepSeek-Reasonix-torch** —— [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) `studio`（2.x）分支的个人 fork。上游停在 v2.61.0；本仓库从这里继续：重建的导航外壳、会话互相派活，以及修个不停的细节。
>
> QQ 交流群：**1821170167**

<p align="center">
  <a href="./README.md">English</a>
  &nbsp;·&nbsp;
  <strong>简体中文</strong>
  &nbsp;·&nbsp;
  <a href="./docs/GUIDE.zh-CN.md">指南</a>
  &nbsp;·&nbsp;
  <a href="./docs/ACP.md">ACP</a>
  &nbsp;·&nbsp;
  <a href="./docs/EXTENSIONS.md">扩展开发</a>
  &nbsp;·&nbsp;
  <a href="./docs/SPEC.md">规格</a>
</p>

<br/>

## 这个分支改了什么

本 fork 名为 **DeepSeek-Reasonix-torch**。引擎部分保持上游原样，改动落在 Reasonix Studio 上：

### 导航外壳重做成一张表

- 侧栏和图标栏画同一张表里的行，两处不会各说各的，也不会把同一个入口画两次。
- 右键点图标栏打开「自定义导航栏」：一个面板管顺序与显隐，拖动排序，松手落盘。
- 右缘的对话轨是一把尺子：刻度密集、右端对齐，指到某条消息时那一条拉长，文字卡片贴在它左边。
- 会话树分成两组：「项目」是记住的项目，「任务」是窗口自己打开的文件夹。
- 「最近」是会话筛选菜单里的一种排序，不再是一个页面。

### 会话互相派活

- 派活时可以给目标会话起名字；`peers.incoming`（ask / dispatch / always）决定别的会话发来的消息要不要弹授权卡。
- 「新建会话」先弹「选择项目」：搜索、本地与远程项目、创建项目，以及「不在项目中工作」——会话开在内核自己的非项目文件夹里。项目行上的「新建」不走弹窗。

### 修个不停的细节

- 打开设置后，右上角的最小化、最大化、关闭照常能按。
- 项目药丸的下拉箭头和下拉列表在任意缩放下都守得住排版。
- 1400px 宽的窗口里，文件面板从布局真正有的那个入口打开。

## 版本

本 fork 从上游的 **v2.61.0** 接手——上游在这一点声明停止维护。发布沿 `studio` 线往上走：**2.62.0** 是本 fork 的第一个发布。

版本发布在本仓库自己的[发布页](https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued/releases)。上游最后一个版本仍是 v2.61.0。

## 安装

`Reasonix Studio` 是桌面端；CLI、Studio 和编辑器集成运行的是同一套本地 Reasonix 引擎。

从源码构建：

```sh
git clone https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued.git
cd DeepSeek-Reasonix-continued
git switch studio
```

### CLI

CLI 构建需要 **Go 1.26+**。模块固定了 `toolchain`，保持 `GOTOOLCHAIN=auto`
即可让 Go 自动下载对应工具链，也可以手动安装。

```sh
make build      # -> bin/reasonix(.exe)
make cross      # -> dist/（darwin|linux|windows × amd64|arm64）
```

### Studio

Studio 的前端还需要 **Node 24+ 与 pnpm 10**（`npm install -g pnpm@10`）。

```sh
make studio
```

各平台的 webview 依赖和 Linux 构建标签见 [Studio 构建指南](desktop/README.md#prerequisites)。

## 快速开始

### Reasonix Studio

安装并启动 Studio，然后在应用内连接 provider 和模型即可使用，无需配置 CLI。

### CLI / TUI

```sh
reasonix setup                      # 配置 provider 和模型
reasonix                            # 启动交互式会话
reasonix run "把 main.go 里的 TODO 实现掉"
```

需要项目指令时，可在交互式会话中运行 `/init`。

CLI 进阶用法和详细配置见 **[CLI 命令参考](./docs/CLI.zh-CN.md)**、
**[指南](./docs/GUIDE.zh-CN.md)** 和
**[配置路径](./docs/CONFIG_PATHS.md)**。

## 文档

- **开始使用：** [指南](./docs/GUIDE.zh-CN.md) ·
  [CLI 命令参考](./docs/CLI.zh-CN.md) · [配置路径](./docs/CONFIG_PATHS.md) ·
  [ACP 编辑器接入](./docs/ACP.md)
- **功能与排障：** [子智能体 Profile](./docs/SUBAGENT_PROFILES.md) ·
  [Context Engine v2](./docs/SESSION_MEMORY_RETRIEVAL.md) ·
  [能力诊断](./docs/CAPABILITY_DIAGNOSTICS.md) ·
  [恢复与安全模式](./docs/RECOVERY.md) ·
  [Checkpoints 与 rewind](./docs/CHECKPOINTS.md)
- **Agent 预设：** [会话级组合](./docs/AGENT_COMPOSITIONS.zh.md)
- **工程：** [规格](./docs/SPEC.md) ·
  [任务合约与暂停策略](./docs/TASK_CONTRACT.md) ·
  [工具合约](./docs/TOOL_CONTRACT.md)
- **扩展开发：** [扩展概览](./docs/EXTENSIONS.md) ·
  [插件包与 Manifest v1](./docs/PLUGIN_PACKAGES.md) ·
  [Extension Protocol](./docs/EXTENSION_PROTOCOL.md) ·
  [Go SDK 与 starter](./sdk/go/README.md)

## 致谢

引擎、桌面端和本仓库大部分文档来自
[esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix)，MIT 协议。

<p align="center">
  <sub>MIT —— 见 <a href="./LICENSE">LICENSE</a></sub>
</p>
