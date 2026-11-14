---
owner: @Oliver-Rui
backup: @esengine
status: active
reviewed: 2026-11-14
---

# DeepSeek-Reasonix-torch — handoff

A personal fork of [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) on the
`studio` (2.x) line. This document is the state of the fork at its first pushed revision: what
changed, how it was checked, and what is still open.

## 1. What this revision changes

All paths are under `desktop/frontend-next/src` unless noted.

### Sidebar navigation, rebuilt as one list

- The icon rail and the open sidebar draw the **same rows from one table** (`ui/navdest.ts`
  `BAR` / `useBarEntries`). Before this, the two could disagree and one row could be offered
  twice; a duplicate 新建会话 row on the open sidebar is what prompted the change.
- `ui/SidebarDestinations.tsx` (new) renders those rows on the open column;
  `ui/NavMore.tsx` (new) holds the arrangement panel and the bar's own context menu.
- The panel opens **in two steps**: right-click the bar → a one-item menu (自定义导航栏) → the
  panel, which is centred with a scrim. One flat list, one row per entry, each row carrying a
  show switch and a drag handle. 新建会话 is always shown and cannot be switched off.
- Dragging reorders with a FLIP animation: the dragged row follows the pointer, crossed rows
  give way, and the order is persisted **on release only** — writing on every `pointermove` was
  what made it flicker.
- The rail's mode is now two answers, not three (`state/prefs.ts`): `collapsed` (shown while the
  workspace column is shut) and `off`. A stored `"on"` reads back as `collapsed`.
- The bar is separated from the project list by a hairline, matching the one above the settings
  row at the foot. The 项目 view name lost its pill.

### The conversation rail (right edge)

- Ticks are dense and right-aligned; only the left end moves, the way a ruler's ticks do. The
  viewport is one darker tick (`.srail-now`), not a painted band.
- No follow-the-pointer card. Pointing at a single message stretches **that tick** leftwards into
  a dark bar (`22×3px`, right edge fixed) and puts the message's own text in a card to its left
  (`.srail-card`), mirroring a left-edge list. Folded runs keep their own row list instead.
- `railgeom.grow()` and its neighbour magnification are gone: length is spent on the one place
  being read.

### 最近 ordering

- Ordering moved into the session filter menu, directly under 全部, as one row — not a toolbar
  button and not a switch.
- It cycles newest → oldest → unsorted, and the arrow on the right (↑ / ↓ / ⇅) always says
  which.
- A chosen scope is inked and ticked rather than painted as a block, and the menu's rows are
  the height of the conversation rows that opened it.

### Removed

- 社区与贡献者 and 赞助 left 关于: the QQ group, Discord, GitHub issues, the contributor list,
  and the PayPal, WeChat and Alipay QR codes.
- Every dependency went with them: `Community.tsx`, `Sponsor.tsx`, their tests,
  `contributors.json`, the three images, `sponsor.css`, `en_community.ts`, `en_sponsor.ts`,
  eight `community.*` / `sponsor.*` action entries, two settings anchors, and the sidebar's
  社区 entry.
- `communityLinks.ts` keeps only the maintainer, which the author line still shows.
- 抖音 (account id, copy button, QR code) — removed earlier in the same line of work.
- `RecentSessions.tsx` (the 最近 view) and its tests: 最近 is an ordering now, not a page.
- `Account.tsx`: after the sign-in card left the settings page, nothing in the product mounted
  it. It and its test are gone; the port methods stay, since the kernel still serves them.

### Session messages between projects (`internal/`)

- A dispatch may name the **role** of the session it creates (`DispatchToProject(ctx, project,
  text, role)`), so several sessions in one project do not read as one.
- New setting `peers.incoming`: what another of the user's sessions may send without a card —
  `ask`, `dispatch` (a paired session only, the default) or `always`. Only the asking is skipped;
  what the message starts still runs under this session's own approvals and sandbox.
- Sending by hand is gone from the UI: dispatch is the model's job, so the peers panel is the
  switches plus whatever is waiting for an answer.

## 2. How it was checked

Run from `desktop/frontend-next`:

| Check | Command | Result |
| --- | --- | --- |
| Types | `tsc --noEmit` | passes |
| Build | `vite build` | passes |
| UI census gate | `node tools/ui-census/main.mjs` | exit 0 — no orphaned action, no unregistered one |
| Census fixtures | `node tools/ui-census/verify.mjs` | `fixture reports identical across 10 outputs` |
| Focused tests | `vitest run src/actions.test.ts src/i18n/msg/msg.test.ts src/i18n/i18n.test.ts src/ui/AccountSettings.test.tsx src/ui/panel-dead-ends.interaction.test.tsx src/ui/Rail.test.tsx src/ui/railgeom.test.ts src/styles/railhit.test.ts src/ui/workspaces.test.ts src/ui/workspace-order.interaction.test.tsx src/ui/session-batch.interaction.test.tsx src/ui/nav-entries.interaction.test.tsx src/ui/nav-parity.interaction.test.tsx src/ui/navrail.interaction.test.tsx` | 14 files, 146 tests green |

Browser checks (Playwright + local Edge, `npm run dev` on :5273): the rail card sat 33px left of
its stretched tick with all tick right edges on one x; the filter menu measured 30px per row; the
fold-all button reported `lucide-chevrons-down-up` at 14px.

### Not verified

- **The full `vitest` suite** was not run here: it takes over ten minutes on this machine and the
  harness times a single file at 0.4s but a cold full run much longer. CI runs it
  (`.github/workflows/studio.yml`).
- **Go-side tests** were not run — no Go toolchain on this machine. CI's `ci.yml` covers the
  kernel: `gofmt`, lint, race, test.
- Dark theme was not screenshotted.

## 3. Publishing

CI is already in the repository; this fork did not add it.

| Workflow | Trigger | Covers |
| --- | --- | --- |
| `ci.yml` | push / PR to `studio` or `main-v2` | kernel: lint, race, test |
| `studio.yml` | push / PR to `studio` | `pnpm typecheck`, `pnpm test`, `pnpm census`, `pnpm census:verify`, `pnpm build` |
| `release-studio.yml` | push a `studio-v*` tag, or `workflow_dispatch` with an existing tag | packages, signs, publishes the GitHub release |
| `e2e-bot.yml` | comment `/e2e` on a pull request | end-to-end suite against the real provider |

**The branch matters.** `ci.yml` and `studio.yml` only run on `studio` (and `main-v2`), so work
on any other branch is unchecked until it lands there.

`release-studio.yml` expects credentials a fork does not inherit.

| Credential | Needed for | Without it |
| --- | --- | --- |
| `studio-release` environment | The publish job's approval gate | The release cannot publish |
| `APPLE_*` (five secrets) | Signing and notarizing macOS | macOS jobs cannot sign |
| minisign key | Signing every artifact | The publish job stops |
| R2 credentials | Mirroring and the Studio catalog | The release publishes, the catalog is not updated |
| Certum | Windows Authenticode, only when `vars.STUDIO_SIGNING_ENABLED` is `true` | Windows ships unsigned |

A candidate release can be published as a prerelease by using a pre-release version, which
also keeps it off the GitHub latest slot.

Note the version baseline: `release-notes/studio/` now carries `2.62.0.md`, while the highest
`studio-v*` tag on the remote is `studio-v2.50.0`. The first tag this fork pushes should
therefore be `studio-v2.62.0`.

## 4. Open items

- `Account`'s port methods (`accountLogin`, `accountPoll`, …) are still declared and still
  served by the kernel; only the UI is gone. If the sign-in card returns, restore
  `ui/Account.tsx` from git history rather than rewriting it.
- `SidebarTools.tsx` is reduced to the settings row; the hover card it used to draw was folded
  into `SidebarDestinations.tsx`.
- Nothing in the 任务 group idea from earlier discussions was implemented: the tree has no
  session that belongs to no workspace, so "非项目会话" has no data to stand on.

## 5. Revision 2.62.0

The first release of this line is **2.62.0**, and the notes now carry that name. Everything on
this page above describes the first revision; these six commits are what it took to make the
branch buildable and releasable as 2.62.0.

| Commit | Change |
| --- | --- |
| `e5591df` | Goldens refreshed to the dispatch schema in the tree (`role`, "one of the user's projects"). Before this the branch tip failed `internal/assembly/boot` on a difference the tree had already decided. |
| `3ff9d07` | `peers.incoming` decides what arrives without a card: `ask` holds, `dispatch` takes a paired session, `always` takes any. `SetPeersIncoming` refuses anything else, and the setting is writable from the settings sheet. |
| `08d63b8` | Cloud-backup row and the account/market search intents removed; 备份 lands on the local file backup. |
| `d788646` | A scope row's picker opens from the row's left edge instead of hanging off the right. |
| `1e1734d` | Six perf scripts reach 文件 through `openFiles`, as the ones fixed in `466dbfd` do. |
| `54b53eb` | Release notes renamed to `2.62.0.md`, upstream handover line, `peers.incoming` upgrade note. |

### Windows build on this machine

Installed 2026-11-13 at `%LOCALAPPDATA%\Programs\Reasonix Studio`; `logs/shell.log` records
`version=2.62.0 packaged=true platform=win32/x64` and a kernel handshake. The installer is
unsigned (`no code signing certificate configured`), so SmartScreen will warn on first run.

| Step | Command |
| --- | --- |
| SPA | `cd desktop/frontend-next && pnpm install --frozen-lockfile && pnpm build` |
| kernel | `PATH=<go>/bin:$PATH CGO_ENABLED=0 go build -ldflags "-s -w -X main.version=v2.62.0" -o desktop/electron/bin/ ./cmd/reasonix-studio-host` |
| bundle | `pnpm exec electron-builder --dir -c.extraMetadata.version=2.62.0 -c.electronDist=<local electron-v45.2.3-win32-x64.zip>` |
| installer | `pnpm exec electron-builder --prepackaged ../../dist/win-unpacked --win nsis -c.extraMetadata.version=2.62.0` |

Three environment facts the CI recipe does not meet here:

- **No Go on PATH.** A portable go1.26.11 lives at `D:\Tools\gotool\go\bin`.
- **`build:host` cannot fetch the CUA driver.** Its GitHub fetch carries a 120s timeout and the
  line runs at ~40 KB/s. Fetch the lock file's artifact by hand, verify its sha256, and put
  `cua-driver.exe` in `desktop/electron/bin`.
- **electron-builder re-downloads Electron even when it is cached, and can hang for ten
  minutes.** Pass `-c.electronDist` pointing at a local zip.
- **Toolset downloads hit GitHub too.** Set
  `ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`,
  or pre-seed `<LOCALAPPDATA>/electron-builder/Cache/<release>/<archive>`.

Artifact: `dist/ReasonixStudio-windows-amd64-installer.exe`, sha256
`d4e12da2e193fc916ed81ff792d11c90b71f5544c6a2740e8fba52dbc02256a9`, 135 MB. It installs per user
(HKCU uninstall entry `Reasonix Studio 2.62.0`), and every PE file is amd64 except the
installer's own 32-bit `resources/elevate.exe`.

### Checks run for this revision

| Check | Result |
| --- | --- |
| `gofmt -l` on the changed Go files | clean |
| `go vet` on the affected packages | clean |
| `go run ./tools/repolint -changed` (what `make check` runs; `make` is not installed here) | clean, after shortening a six-line comment and a 362-column paragraph |
| `go test ./internal/contract/... ./internal/session/control/ ./internal/frontend/serve/` | pass |
| `vitest run` on the four touched test files | 47 pass |
| `pnpm typecheck` | clean |
| `go test ./internal/assembly/boot/` | the goldens pass; two tests fail on this machine (`TestEffectBundledSkillReferenceReachesProviderAfterCopyInstall`, `TestEffectChangedFileEditAfterTheReadIsKept`, the latter panicking on an empty request list). Both fail the same way on `HEAD` without these commits, so they are not this revision's. |

### Open items for this revision

- **`README.md` and `README.zh-CN.md` still describe a 2.6.x line** ("2.6.1, 2.6.2, 2.6.3 … no jump
  to 2.7"). The release is 2.62.0. One of the two has to move before a tag is pushed.
- `internal/contract/tool/peer.go` and `internal/session/control/peer_dispatch.go` still say
  "another of the user's projects" while the tool now accepts this session's own project when a
  role is given. The model-facing description is right; these two comments are not.
- The two failing boot tests above need a clean-machine run (CI on Linux) before a tag; they are
  the only red in the packages this revision touched.
- Only Windows was built here. `.deb`, `.rpm`, `.AppImage` and the macOS bundle still rely on
  `release-studio.yml` and its credentials.

## 6. Revision 2.63.0, folded into the 2.62.0 release

The work of this revision plus everything below shipped as the fork's **first** release,
`studio-v2.62.0` — an earlier `studio-v2.63.0` release was published, deleted the same day, and
its content folded forward; the version number was not reused.

Four commits first, all frontend (`desktop/frontend-next`), pushed to `studio` on
`Oliver-Rui/DeepSeek-Reasonix-continued` — the remote was retargeted this revision; the
`Reasonix-Studio-Tweaks` URL in older notes never existed on GitHub.

| Commit | Change |
| --- | --- |
| `1e4451d` | The session tree carries two explicit groups — 项目 over the remembered projects, 任务 over the non-remembered folder(s). The partition is a pure helper (`workspaceGroups.ts`); a list, not a scalar, because `roots()` can list several unremembered folders. |
| `75b11b9` | 新建会话 opens a 选择项目 card (search, local + remote projects, 创建项目, 不在项目中工作). The escape row sends **no root**, and `Hub.resolveRoot` falls back to the kernel's auto workspace (`<state>/workspaces/auto`) — the state-home path is never computed in the frontend. Per-project 新建 bypasses. |
| `d5436da` | Three layout fixes, each live-measured first: the settings windowbar's buttons opt out of the drag region (最小化/最大化/关闭 were dead while 设置 was open); the scope pill's chevron opts back to `inline-block` against the deliberate global `.studio-icon { display: block }`; scope dropdown rows declare their grid positions so an exception chip cannot auto-place into column one. |
| `17154c7` | `data.cloud_backup` — a key nothing had referenced since the feature left in 2.62.0's work. |

The README open item from §5 is closed: both READMEs now tell the 2.61.0 handover, the
`studio` line's first release 2.62.0, and point at this repository's releases page.

The four commits above were followed by five more before the release was cut:

| Commit | Change |
| --- | --- |
| `c6a50b4` | 会话互聊 kernel: `peers.cross_project` (always / paired / never, default always) gates dispatches into another project, and a dispatch with a role writes the role as the target's explicit title. `PeerThread` carries the role (book join by peer key). |
| `90fe800` | Settings gains a top-level 会话互聊 section — the folded `peers` section promoted, the three groups gathered, the two dispatch ceilings exposed, a 跨项目派发 seg, and the （实验） qualifier dropped. |
| `40335ab` | The dispatching pane grows a 会话互聊 bar — one row per outbound thread, live states, open affordance; the folded dispatch row shows 派发任务 · project · role. |
| `92d7453` | The sidebar's group heads become controls — 项目 ⌄ / 任务 ⌄ fold their own group, the folder/tasks icons and the toolbar's separate fold-all retire, project rows lose the folder icon. |
| `72886a4` | The READMEs' intro says what the branch changes now (three sections, removals stay in the release notes); `.gitignore` keeps ZCode's session plans out of repolint's full run. |

### Checks run for this revision

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `vitest run` (full) | 6788/6788 across 914 files; two files fail to load under the session sandbox (`?worker&url` transform denials on `pdfjs-dist`/`maplibre-gl`), unrelated to the diff |
| `npm run census` + `census:verify` | sealed; fixture reports identical |
| `repolint -changed` | clean |
| `vite build` | clean |
| The running app at 100% and 115% zoom | the picker, both groups, the pill, the dropdown rows and the windowbar verified; the windowbar's buttons also by computed `webkitAppRegion` with the platform attribute stubbed (the plain browser does not render them) |

### Released as studio-v2.62.0

- Release: [studio-v2.62.0](https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued/releases/tag/studio-v2.62.0),
  merged to `studio` through PR #1 (merge commit `07441dd0`)
- An earlier [studio-v2.63.0](https://github.com/Oliver-Rui/DeepSeek-Reasonix-continued/releases/tag/studio-v2.63.0)
  was published from that head, deleted the same day, and the whole line republished as
  studio-v2.62.0 with the README intro and the 会话互聊 work — the version number was not reused
  for different content.
- Installer: `ReasonixStudio-windows-amd64-installer.exe`, unsigned — SmartScreen warns on first run
- Published by hand through the REST API: `release-studio.yml` cannot publish
  from a fork (minisign secrets, the `studio-release` environment and a prior
  tag are all absent)
- `git push` was unreachable from this machine; every commit, the merge and
  the release were built server-side through the Git Data API, and the
  API-rebuilt history is byte-exact — every tree and commit sha equals the
  local one

Two CI facts this revision leaves behind:

- The macOS legs of both workflows are pinned to `macos-15` after
  `macos-latest`'s arm64 pool refused to seat jobs for four runs in a row
  ("not acquired by Runner of type hosted")
- The five upstream `deploy-*` workflows are disabled on the fork — they
  deploy upstream's website and workers with upstream's credentials and can
  only fail here


## 7. Revision in progress — the session lands, then picks its project

This revision inverts the new-session flow to the reference design and finishes the sidebar's
two groups. Nothing below is pushed yet: the local commits sit on `feat/same-project-subagent`
waiting for the word to push, rerun CI and republish.

### Kernel (`internal/frontend/serve`, `internal/frontend/cli`)

- `Hub.resolveRoot` — a brand-new conversation (no root, no session path) no longer joins the
  first live runtime's folder: it opens in the app's own workspace (`ensureAutoWorkspace`).
  Restores and dispatches keep their explicit roots.
- `POST /workspace` accepts `{auto: true}` — the pill's 不使用项目 answer; the pane joins the
  same auto workspace. Deliberately unchanged: the switch carries no conversation continuity.
- `GET /tree` marks the auto workspace `auto: true` and keeps it listed with no pane on it
  (`roots()` stats the folder), so the 任务 group is a standing section, not a pane byproduct.
- `POST /tree/workspaces` accepts `name` — a blank project is an empty, chosen folder created
  inside the folder the picker returned, then remembered. Two new refusal codes
  (`workspace.name_taken`, `workspace.bad_name`) with frontend wording.
- `reasonix serve --workspace-switch` grants `POST /workspace` to a plain serve; the desktop
  window grants itself the same thing, so the browser UI can switch projects too.

### Frontend (`desktop/frontend-next`)

- The composer's project pill (`WorkspacePill.tsx`) — the ZCode-shaped palette: 搜索项目 search,
  project rows with the current marker, 添加新项目 submenu, 不使用项目.
- 新建空白项目 is a dialog (项目名称 + 源文件夹); 使用现有文件夹 keeps the picker.
- The pill sits above the composer card on its left edge: a task pane shows 进入项目工作, a
  project pane the project's name, and after 不使用项目 is confirmed the pill goes away until
  the pane works in a project again.
- Blank-project creation falls back to a typed path when no picker answers (`addws.ts` gained
  `pickFolder` and `addNamed`).
- The sidebar splits by the kernel's mark now: `workspaceGroups` puts `auto` workspaces in
  任务 and everything else in 项目; the auto node renders no folder row — its conversations
  hang directly under the 任务 head. Unremembered folders a pane drives show under 项目.
- The 先打开一个项目 hero is gone: which project a conversation belongs to is the pill's
  question, so the empty pane just introduces itself (`Hero.tsx`), and `needsProject`,
  `onKeepHere` and the `claimed` flag left the codebase.
- 新建会话 opens the pane directly (no picker modal); the picker's row data lives on as
  `pickerProjects` for the pill's palette.

### Checks run for this revision

| Check | Result |
| --- | --- |
| `tsc --noEmit` | clean |
| `vitest run src/ui src/i18n src/port` | pass, 809 files |
| `go test ./internal/frontend/serve/ -timeout 30m` | one machine-only failure (`TestSkillCatalogProjectsAuthorInvocationFlags/other_project`, the known repo-key-collision family, green on CI); the refusal-parity test passes after the two new codes were worded |
| `npm run census` + `census:verify` | clean; fixture reports identical |
| `repolint -changed` | clean after trimming the touched CSS/Go lines back under their budgets |
| The running app in the browser | the full flow: 新建会话 → 任务 group, the pill 进入项目工作 → palette (search, Reasonix Studio 当前, 添加新项目 submenu, 不使用项目), switching into a project and back, 不使用项目 hiding the pill, and a real task conversation run |

### The review round that followed the first commit set

The browser walkthrough surfaced a second pass, committed locally as well:

- The pill became strictly the fresh conversation's guide — it shows only on an
  empty transcript, and goes away the moment the pane is placed (a project
  picked, 不使用项目 confirmed) or a turn has been written.
- The confirm gate for content-bearing panes retired with the guide: a switch
  now only happens from a conversation that has nothing to lose.
- The palette opens quiet — no focused search box — and the search box matches
  the option rows' width.
- The sidebar's two hairlines agree: the 项目 header's line lost its private
  10px inset and now matches the 设置 footer's 4px.
- Task conversations file themselves by date — `…/2026/11/14/<name>.jsonl`
  under the auto workspace's own folder, the way the reference reads back as a
  calendar. `NewDatedSessionPath` is the task area's only; project sessions
  stay flat.
- The listing, the branch list, auto-archive and the empty-session GC all walk
  the dated subfolders (`eachSessionDir`), so nothing that scans a session
  folder loses a row.
- The window bar names a task conversation by its title alone — no `auto`
  folder crumb on a conversation that belongs to no project.
- The 任务列表 header lost its redundant + (new sessions start from 新建会话;
  projects are added from the pill and the empty state), and the scope menu
  now opens at the click, expanding toward the bottom-right, sized to its
  longest row.
- `reasonix serve --workspace-switch` and the two new refusal codes above are
  part of the same round.

### The FuchaZ round — thirteen commits transplanted by hand

The fork FuchaZ/DeepSeek-Reasonix:studio carries twenty-two commits of its own on
top of upstream and our cherry-picks. Thirteen were transplanted and adapted to this
tree — cherry-pick would have fought the pill, the task groups and the settings
rework, so each diff was applied and its conflicts resolved by hand:

- The right console's launcher and the memory body drop their width caps; the dock
  and nav slides ease gently; a live thought uses the whole window and the thought
  text carries its own weight token (`--w-think`); the narrow rail's deck chip
  yields; Patina's overlay gained its own step.
- The 扩展范围 pill portals its project list to the body — the settings scroll box
  clipped it; the scope menu opens at the click toward the bottom-right, sized to
  its longest row, its arrow riding the 最近 label (the count column is numbers
  only); the write-lease search result moved to the session page that hosts it.
- Kernel: the first turn asks the title model while it runs and the sidebar reads a
  real name (`titleauto.go`, gated on `agent.title_model` — the review round set it
  to the chat model); the meter rail's 对话轮次 counts authored turns, re-derived
  from the transcript; a loopback listener carries the provider grant.
- Skipped on purpose: the settings placement refactor (`be9120fb`, fights the
  会话互聊 rework — its own pass later), the notes-draft scripts, and the cherry-
  picked entries that were already ours.

### Open for the next session

- These commits are local only — push through the Git Data API pipeline
  (`C:\Users\Oliver\AppData\Local\Temp\reasonix-api-push\`), rerun CI, then delete and
  republish studio-v2.62.0 on the new head with the installer rebuilt.
- The token that once appeared in chat should be rotated; it is stored in the Windows
  credential manager and `~/.zcode/cli/config.json` only.

## 8. The rename fold, and 2.62.0 / 2.63.0 as two releases

The repo is renamed Oliver-Rui/DeepSeek-Reasonix-torch and the history around the rename
is folded: the four rename commits and the two intro drafts no longer stand as commits —
their net diff rides the final intro commit (`docs(readme): the fork is
DeepSeek-Reasonix-torch…`), and the chain replays from the anchor `55bd05f` through the
Git Data API so the pushed SHAs stay identical to the local ones.

The release notes follow the two-release shape again: `release-notes/studio/2.62.0.md` is
back with its commit refs remapped to the rewritten SHAs, and `2.63.0.md` now tells only
its own release — the session-lands-first flow, the dated task archive, first-turn
naming, the loopback provider grant, the FuchaZ trims, the QQ group line and the rename.

Releases, in order: restore `studio-v2.62.0` on the rewritten chain (tag on the commit
that completes the 2.62.0 feature set, release body from its notes, the original
`dist/ReasonixStudio-windows-amd64-installer.exe` re-attached), then tag `studio-v2.63.0`
on the notes commit, let the Studio CI build that installer, and publish with the
artifact attached.
