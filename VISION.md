# J.A.R.V.I.S. — Vision & Roadmap

> "The AI that doesn't ask permission." Dangerously powerful by design.

**Goal**: Build the most powerful autonomous AI daemon on the planet. Not a chatbot with tools — an always-on system with a live world model that sees, acts, learns, and evolves. The real-life JARVIS.

**Positioning**: Destroy OpenClaw. Outclass ChatGPT Agent. Make Rabbit R1 and Humane AI Pin look like toys.

---

## Completed Milestones (1-12)

| # | Milestone | Status | Summary |
|---|-----------|--------|---------|
| 1 | LLM Conversations | DONE | Real conversations over WebSocket with personality engine |
| 2 | Tool Execution Loop | DONE | 9 builtin tools, max 25 iterations per turn |
| 3 | Memory Retrieval | DONE | Vault knowledge injected into system prompt per message |
| 4 | Browser Control | DONE | Auto-launch Chromium, CDP on 9222, 5 browser tools, stealth |
| 5 | Proactive Agent | DONE | CommitmentExecutor, Gmail/Calendar observers, D-Bus notifications, research queue |
| 6 | Dashboard UI | DONE | 10 pages + Google integrations settings panel (React 19, Tailwind 4) |
| 7 | Multi-Agent Hierarchy | DONE | `delegate_task` + `manage_agents`, AgentTaskManager, 11 specialist roles |
| 8 | Communication Channels | DONE | Telegram + Discord, pluggable STT (OpenAI/Groq/Local Whisper), voice transcription, unified history |
| 9 | Native App Control | DONE | C# FlaUI sidecar (desktop-bridge.exe), DesktopController, 8 desktop tools, Vision support |
| 10 | Voice Interface | DONE | edge-tts TTS, binary WS protocol, wake word (openwakeword), voice state machine, streaming playback |
| 11 | Authority & Autonomy | DONE | Runtime enforcement, soft-gate approvals, multi-channel delivery, audit trail, emergency controls, learning |
| 12 | Distribution & Onboarding | DONE | `jarvis` CLI, interactive wizard, `install.sh` one-liner, npm packaging, systemd/launchd autostart |
| 13 | Continuous Awareness | DONE | Full desktop capture, hybrid OCR+Vision, proactive suggestions, struggle detection, overlay widget |
| 14 | Workflow Automation | DONE | n8n-style visual builder, 40 nodes, NL chat, triggers (cron/webhook/poll/observer), retry+fallback+self-heal, YAML export |
| 16 | Autonomous Goal Pursuit | DONE | OKR hierarchy (objective→daily_action), 0.0-1.0 scoring, drill sergeant accountability, NL builder, daily rhythm, 3-view dashboard (kanban/timeline/metrics), awareness+workflow+vault integration |

---

## Roadmap: Milestones 13-22

### Milestone 13 — Continuous Awareness & Context Engine [DONE]

**The foundation. JARVIS sees everything.**

JARVIS becomes always-aware of what the user is doing by continuously monitoring the full desktop across all monitors. This isn't on-demand screenshots — it's a live world model that understands context in real time, learns user behavior patterns, and proactively helps.

---

#### 13.1 — Capture Layer

- **Full desktop capture** at 5-10 second intervals — combined single image stitching all monitors
- **Native per-platform capture engine**:
  - WSL/Windows: extend existing C# FlaUI sidecar (already has multi-monitor screenshot support)
  - Linux native: XDG Screenshot Portal / X11grab
  - macOS: `screencapture` CLI
- **Pixel diff change detection**: compare frames pixel-by-pixel, only process if >X% of pixels changed. Configurable threshold to filter out noise (cursor blink, clock tick). If change is below threshold, frame is skipped entirely
- **Tiered image retention**:
  - Last 1 hour: full screenshots on disk (rolling window)
  - Key moments (app switch, error detected, context change): kept for 24 hours
  - Beyond retention: only extracted metadata persists in vault
  - Compressed thumbnails (200px wide) stored alongside metadata for visual timeline
- **Adaptive resource throttle**: monitor system CPU/memory load. Scale down capture frequency when system is under heavy load (user compiling, gaming, rendering). Scale up when system is idle. Target: <5% CPU when idle, gracefully degrade under load
- **No privacy filters**: JARVIS captures everything. No blocklist, no redaction. User trusts the system fully. Maximum awareness, zero filtering
- **Capture everything, no focus mode**: suggestions always flow. Max 1/min rate limit prevents overload. No suppression during deep work

#### 13.2 — Intelligence Layer

- **Local OCR via Tesseract.js**: WASM build running in Bun. Extracts text from every processed frame (~200ms per frame). No native dependencies required. Handles all Latin-script languages
- **Hybrid Cloud Vision**: two prompt strategies, used on different triggers:
  - **General understanding** (triggered on significant context changes — new app, new project, unfamiliar UI): "What is the user doing? What app are they in? What task? Any errors or warnings? What could be helpful right now?" — produces proactive tips
  - **Delta-focused** (triggered on routine captures with text changes): "Given previous context [X], what changed? Is the user stuck? Did they switch tasks? What patterns are emerging?" — feeds behavior learning
- Cloud Vision escalation triggers: OCR detects error keywords, same window for >2 minutes with minimal text changes (stuck detection), new application not seen before, OCR text is ambiguous/non-textual content (diagrams, charts)

#### 13.3 — Context Graph (Entity-Linked)

- **Activity nodes linked to vault entities**: each significant activity creates a node linked to project entities, tool entities, and concept entities in the vault
  ```
  Activity ──references──► Entity(jarvis)
    │                         │
    ├─ app: VS Code           ├─ type: project
    ├─ file: orchestrator.ts  ├─ related: TypeScript
    └─ action: editing        └─ owner: user
  ```
- **Schema**: activity records stored in vault with fields: timestamp, app_name, window_title, url, file_path, extracted_text, project_context, action_type, entity_links[], session_id
- **Session inference**: group consecutive activities into sessions by detecting context switches (different project, different task type). Each session gets a topic label inferred by LLM
- **Full bidirectional vault integration**: awareness writes activity data as vault observations AND reads vault to surface relevant knowledge. Activity data enriches the knowledge graph — JARVIS remembers what you were working on, when, and in what context

#### 13.4 — Proactive Suggestion Engine

- **Full spectrum triggers**:
  - Error/stuck detection: repeated errors, same page too long, user undoing actions
  - Automation opportunities: repetitive manual work, copy-pasting between apps
  - Context-relevant vault knowledge: surface related notes, facts, or past solutions
  - Schedule awareness: upcoming meetings, commitment deadlines
  - Break suggestions: extended continuous work detection
- **Delivery channels**:
  - **Dedicated awareness panel**: always-visible widget in dashboard showing live context, recent activity, quick suggestions. Primary channel for low-priority tips
  - **Voice + full chat message**: for detailed suggestions (error help, complex recommendations). JARVIS speaks up via voice (M10) and posts the full explanation in chat
  - **Multi-channel fallback**: if user is away from dashboard, suggestions route to Telegram/Discord (M8)
- **Rate limit**: maximum 1 suggestion per minute. No focus mode — suggestions always flow
- **Auto-research on errors**: when JARVIS detects user is stuck on an error, it immediately and silently researches the error (web search, vault lookup, documentation), then proactively presents the solution. No "want me to look into it?" — just delivers the answer

#### 13.5 — Behavior Analytics & Learning

- **Automatic daily productivity reports**: time per app, productive vs idle time, focus sessions and their duration, context switch frequency, most-used tools, project time allocation
- **Behavior pattern tracking**: stores rolling activity patterns in vault. What apps at what times, workflow sequences, productivity trends over weeks
- **Dashboard Awareness Page**: dedicated page showing:
  - Live context panel (current app, project, session topic)
  - Activity timeline with thumbnails (scrollable history)
  - Behavior insights and trends (daily/weekly/monthly charts)
  - Context takeaways: AI-generated summaries of user behavior patterns for self-improvement ("You spend 40% of mornings in email. Your deepest focus blocks happen after 2pm.")
  - Session history with topic labels and duration
- **Awareness status indicator**: visible icon in system tray (Windows) or dashboard header showing awareness is active. Always visible for transparency

#### 13.6 — Architecture

- **Runs as Background Agent**: extends the existing Background Agent service (M5) which already has its own BrowserController and independent lifecycle. Awareness loop runs in the background agent's context, crash-isolated from the main daemon
- **Escalation to Primary Agent**: when awareness detects something requiring action (error help, complex suggestion), it escalates to the Primary Agent for LLM reasoning and user communication. Background agent handles capture + OCR, PA handles intelligence + delivery
- **Event bus integration**: awareness emits events (context_changed, error_detected, stuck_detected, session_started, session_ended) on the daemon event bus. These events feed into M14 workflow triggers

**Depends on:** M9 (desktop screenshots via sidecar), M5 (background agent infrastructure), M3 (vault for entity-linked storage), M10 (voice delivery), M8 (multi-channel fallback)
**Enables:** M14 (screen-based workflow triggers), M17 (context-aware environment control), M20 (behavior data feeds self-improvement)

---

### Milestone 14 — Workflow Automation Engine [DONE]

**"When X happens, do Y" in plain English. Kills Zapier and IFTTT.**

A full event-driven automation engine where users define workflows in natural language. JARVIS decomposes them into trigger → condition → action chains and executes them autonomously.

**Scope:**

- **Natural language workflow creation**: "When I get an email from my boss, summarize it and ping me on Telegram." JARVIS parses intent, creates the workflow, confirms with user
- **Visual workflow builder**: drag-and-drop editor in the dashboard for creating, editing, and monitoring workflows. Node-based graph UI showing triggers → conditions → actions
- **Comprehensive trigger types**: time/cron schedules, email received/sent, file system changes, webhook endpoints, screen context changes (from M13), calendar events, git events (push, PR), system events (process start/stop, clipboard change), chat messages, manual triggers
- **Full agent delegation**: workflow steps can spawn sub-agents from M7 for complex reasoning steps, not just direct tool calls. Each step can be a tool call OR an agent delegation — user chooses per step
- **Conditional logic**: if/else branching, loops, variable passing between steps, template expressions
- **Error handling**: auto-retry up to 3x with exponential backoff, then halt and notify user. Retry is per-step, not per-workflow
- **Workflow persistence**: workflows stored as structured data in vault, exportable as YAML for power users
- **Execution dashboard**: real-time view of running workflows, execution history, success/failure rates, logs per step

**Key technical decisions:**
- NL + visual builder — both creation paths for different user preferences
- All trigger types from day one — no artificial limitations
- Full agent delegation makes workflows as smart as JARVIS itself
- Auto-retry (3x) balances reliability with not wasting resources on fundamentally broken steps

**Depends on:** M7 (agent delegation), M8 (channel notifications), M13 (screen context triggers)
**Enables:** M15 (plugins can register new triggers/actions), M17 (IoT as workflow triggers/actions)

---

### Milestone 15 — Plugin & Extension Ecosystem

**Infinite extensibility. The community moat.**

A TypeScript plugin SDK that lets anyone extend JARVIS with new tools, triggers, integrations, and capabilities. Plugins install from GitHub repos and hot-reload without daemon restart.

**Scope:**

- **TypeScript Plugin SDK**: clean interface for registering tools, event handlers, triggers (for M14), and UI components. Fully typed, well-documented
- **Tiered permissions model**: plugins declare required permissions (tools, vault read/write, agent spawning, network access) in a manifest. User approves permissions on install — like mobile app permissions
- **GitHub-based distribution**: install via `jarvis plugin add <github-url>`. No custom registry infrastructure. Community uses GitHub stars/READMEs for discovery
- **Hot-reload**: plugins load/unload without daemon restart. File watcher on plugin directory triggers reload
- **Plugin lifecycle**: `onLoad()`, `onUnload()`, `onConfigChange()` hooks. Plugins can expose their own settings in the dashboard Settings page
- **Official plugin starter set**: ship 10-15 official plugins as reference implementations:
  - GitHub (issues, PRs, notifications)
  - Slack (messages, channels, threads)
  - Notion (pages, databases, search)
  - Spotify (playback, playlists, queue)
  - Twitter/X (post, read timeline, DMs)
  - Linear (issues, projects, cycles)
  - Jira (issues, boards, sprints)
  - AWS (EC2, S3, CloudWatch basics)
  - Docker (containers, images, logs)
  - Hacker News (front page, search, bookmarks)
  - Reddit (browse, post, notifications)
  - YouTube (search, transcribe, download)
  - WhatsApp (via WhatsApp Business API)
  - Signal (via signal-cli bridge)
  - Home Assistant (bridge to M17)
- **Onboarding integration**: during setup wizard (M12), present available plugins and let user choose which to install. No bloat — user picks what they need
- **Plugin template**: `jarvis plugin create <name>` scaffolds a new plugin project with TypeScript config, manifest, and example tool

**Key technical decisions:**
- TypeScript only — consistent with codebase, easy to validate, hot-reload via Bun
- GitHub repos — no infrastructure overhead, leverages existing ecosystem
- Tiered permissions — plugins are powerful but user stays in control
- Onboarding-driven selection — users install only what they want, never bloated

**Depends on:** M2 (tool registry), M14 (workflow triggers/actions)
**Enables:** M17 (Home Assistant plugin), M18 (Plaid plugin), all future integrations

---

### Milestone 16 — Autonomous Goal Pursuit & Long-Term Planning [DONE]

**Multi-week goals. JARVIS as your accountability partner.**

JARVIS goes beyond single tasks to pursue long-running goals. It decomposes big objectives into milestones, schedules work, tracks progress, nags when you're behind, and adapts the plan when things change.

**Scope:**

- **Goal definition**: natural language goal setting ("Help me learn Spanish", "Ship my product by April", "Lose 10 pounds"). JARVIS extracts: objective, success criteria, deadline, constraints
- **Adaptive planning**: autonomy level tied to authority engine (M11). Low-authority goals (research, learning) — JARVIS plans and executes autonomously. High-authority goals (spending money, contacting people) — JARVIS proposes plan, user approves, JARVIS executes with check-ins at milestones
- **Goal decomposition**: breaks goals into milestones → tasks → subtasks. Each with estimated effort, dependencies, and deadlines. Uses LLM reasoning + learned patterns (M20)
- **Hard deadlines with accountability**: JARVIS escalates urgency as deadlines approach. Daily progress summaries. Nags when behind schedule. Proposes schedule adjustments if falling behind. No gentle nudges — hard accountability
- **Authority-gated actions**: JARVIS can take external actions to pursue goals (buy a course, book an appointment, send an email) — gated by M11 authority levels. Auto-approve low-cost actions, require approval for expensive/external ones
- **Replanning**: when a milestone fails or circumstances change, JARVIS autonomously replans remaining work. Notifies user of plan changes
- **Visualization**: full dashboard page with:
  - Kanban board for tasks (planned → in progress → done)
  - Timeline/Gantt view for milestones with dependencies and deadlines
  - Progress metrics and charts (completion %, velocity, time remaining)
  - Goal health indicator (on track / at risk / behind)
- **Goal memory**: completed goals and their execution patterns stored in vault for improving future goal planning

**Key technical decisions:**
- Adaptive autonomy — respects the authority engine, not a separate permission system
- Hard deadlines — JARVIS is an accountability partner, not a suggestion box
- Authority-gated external actions — JARVIS can spend money and contact people, within limits
- Full visual suite (kanban + timeline + metrics) — because goals need visibility from every angle

**Depends on:** M5 (commitments), M11 (authority engine), M14 (scheduled workflow triggers)
**Enables:** M18 (financial goals), M20 (learning from goal execution patterns)

---

### Milestone 17 — Smart Environment Control (IoT / Smart Home)

**JARVIS controls the house. The Iron Man fantasy.**

Integration with Home Assistant to discover, monitor, and control smart home devices. Scene automation, voice-activated control, and optional context-aware triggers via the workflow engine.

**Scope:**

- **Home Assistant integration**: REST API + WebSocket connection to HA instance. Auto-discover HA on local network (mDNS), connect, enumerate all devices and entities
- **Device abstraction**: lights, switches, thermostats, locks, cameras, media players, sensors, covers (blinds/garage). Normalized interface regardless of underlying protocol (Zigbee, Z-Wave, WiFi, Matter)
- **Natural language control**: "Turn off the living room lights", "Set thermostat to 72", "Lock the front door", "Play jazz in the kitchen". Mapped to HA service calls
- **Pre-built scene templates**: ship with defaults (Focus Mode, Movie Night, Goodnight, Wake Up, Away, Party). Users customize via NL or dashboard
- **Dynamic scene creation**: JARVIS creates new scenes from natural language ("Create a scene called 'Reading' that dims the bedroom to 30% and turns on the desk lamp")
- **Workflow integration (M14)**: IoT events as triggers ("when motion detected in garage, send me a notification") and IoT actions in workflows ("at sunset, run Goodnight scene"). Available as trigger/action types in the visual workflow builder
- **Optional M13 awareness link**: context-aware automation available as workflow triggers (e.g., "when JARVIS sees me watching a video, dim lights to 20%"). Not on by default — user opts in via workflow creation
- **Dashboard panel**: device grid showing status of all devices, scene quick-launch buttons, device history graphs (temperature, energy usage, etc.)
- **Voice control**: all IoT commands work via voice (M10). "Hey JARVIS, turn on the lights" just works

**Key technical decisions:**
- Home Assistant as the hub — massive device ecosystem, open source, well-documented API
- Auto-discover — zero config for users who already have HA running
- Both pre-built and dynamic scenes — batteries included but fully customizable
- M13 awareness link as opt-in workflow, not automatic — user controls what triggers what

**Depends on:** M10 (voice commands), M14 (workflow triggers/actions), M15 (HA can also ship as a plugin)
**Enables:** M16 (environment as part of goal pursuit — focus mode for study goals)

---

### Milestone 18 — Financial Intelligence

**JARVIS manages your money. High-value, deeply personal.**

Bank account monitoring, expense tracking, investment portfolio management, and transaction execution — all gated by the authority engine. Financial data stored in a separate encrypted database.

**Scope:**

- **Plaid API integration**: connect to 12,000+ banks and financial institutions. Link accounts through Plaid Link flow embedded in dashboard. Read transactions, balances, investment holdings
- **Expense tracking & categorization**: auto-categorize transactions (food, transport, subscriptions, entertainment, etc.) using LLM. Monthly/weekly spending summaries. Budget alerts when approaching limits
- **Bill management**: detect recurring bills, predict upcoming charges, send reminders before due dates. Track subscriptions and flag unused ones
- **Tiered transaction execution**: JARVIS can initiate payments and transfers, gated by amount:
  - Auto-approve: transactions under configurable threshold (default $50)
  - Require approval: transactions above threshold
  - Always blocked: transactions above hard cap (default $500) require manual execution
  - All thresholds configurable per user
- **Investment portfolio tracking**: connect brokerage accounts (Alpaca, Coinbase, Interactive Brokers). Real-time prices, P&L, portfolio allocation. Alerts on significant movements
- **Trading execution**: execute trades via broker APIs (Alpaca for stocks, Coinbase for crypto). Authority-gated — all trades require explicit approval unless user configures auto-approve rules for specific strategies
- **Financial dashboard**: account balances, spending charts, budget vs actual, portfolio performance, upcoming bills, transaction history with search/filter
- **Separate encrypted database**: all financial data stored in a dedicated encrypted SQLite file (`~/.jarvis/finance.db`), separate from the vault. Encrypted at rest with a user-provided passphrase. Never mixed with general knowledge

**Key technical decisions:**
- Plaid API — industry standard, broadest bank coverage
- Tiered transaction execution — powerful but safe, leverages existing authority engine
- Full portfolio + trading — maximum power for users who want it
- Separate encrypted DB — financial data is too sensitive for the general vault

**Depends on:** M11 (authority gates for transactions), M15 (Plaid can ship as a plugin)
**Enables:** M16 (financial goals — "save $5000 by June"), M19 (mobile finance alerts)

---

### Milestone 19 — Mobile Companion (React Native)

**JARVIS everywhere. Not just your desk.**

A native mobile app (React Native) with full dashboard parity, push notifications, background location, and seamless connection to the JARVIS daemon whether on LAN or away from home.

**Scope:**

- **React Native app**: native iOS and Android app. Full dashboard feature parity — all 10+ pages responsive on mobile. Same design language as web dashboard
- **Push notifications**: approval requests (M11), workflow alerts (M14), goal reminders (M16), financial alerts (M18), IoT events (M17), daily briefings. Uses Firebase Cloud Messaging (FCM) for Android, APNs for iOS
- **Background location**: always-on location tracking. Geofencing zones as triggers for M14 workflows ("when I arrive at office, run Morning Routine"). Respects OS battery optimization
- **Camera integration**: snap a photo → JARVIS analyzes it (receipt scanning for M18, document capture for M21, visual questions). Quick action from notification shade
- **Voice on mobile**: full voice interface (M10) works on mobile. Push-to-talk button, wake word detection
- **Auto-detect networking**:
  - On LAN: direct WebSocket to daemon (fastest, no relay)
  - Away from home: automatic fallback to relay server (optional self-hosted relay or Tailscale/WireGuard VPN)
  - Seamless transition — user never notices the switch
- **Offline mode**: queue commands when offline, execute when reconnected. Cache recent vault data, conversation history, and dashboard state for offline viewing
- **Biometric auth**: Face ID / fingerprint to unlock the app. Mandatory for financial features (M18)

**Key technical decisions:**
- React Native over PWA — true native experience, full device access (background location, camera, push notifications, biometrics)
- Full dashboard parity — mobile is not a lite version, it's the full JARVIS
- Background location always-on — maximum context for automation triggers
- Auto-detect networking — seamless regardless of where you are

**Depends on:** M6 (dashboard to port), M14 (location-based workflow triggers), all previous milestones for feature parity
**Enables:** M16 (goal nudges on mobile), M18 (financial alerts on the go)

---

### Milestone 20 — Self-Improvement & Learning Engine

**The agent that rewrites itself to get better. Compound growth.**

JARVIS tracks the outcome of every action, learns what works, and autonomously evolves its own system prompts, strategies, and approach. Quality-first optimization — always aiming for the best output.

**Scope:**

- **Outcome tracking**: every tool execution logged with result (success/failure/partial), execution time, token cost, and context. Builds a statistical model of what approaches work for which task types
- **Triple signal learning**:
  - Explicit feedback: user thumbs up/down after significant actions
  - Implicit signals: did the user redo the task? Edit the output? Abandon the conversation? Ask for a different approach?
  - Outcome scoring: automated success detection (command exit code, file saved successfully, email sent, etc.)
- **Autonomous prompt evolution**: JARVIS rewrites its own system prompts and role definitions when it discovers better approaches. No user approval required — JARVIS owns its own improvement. Changes logged in audit trail for transparency
- **Strategy playbook**: maintains a knowledge base of proven strategies per task type. "For code debugging, approach A works 85% of the time. For email drafting, user prefers tone B." Referenced during planning
- **Quality-first optimization**: always aims for best output regardless of token cost or time. Does not optimize for speed or cost — optimizes for excellence
- **Performance analytics dashboard**: success rates over time, most improved areas, prompt evolution history, strategy effectiveness charts, comparison of current vs historical performance
- **Regression detection**: if a prompt change makes things worse, JARVIS detects the regression and rolls back automatically
- **Playbook is private**: each JARVIS instance learns independently. No sharing between instances. Personal optimization for personal preferences

**Key technical decisions:**
- Autonomous self-editing — JARVIS doesn't ask permission to improve itself. True self-evolution
- Triple signal tracking — richest learning signal possible (explicit + implicit + automated)
- Quality-first — this is for power users who want the best, not the cheapest
- Private playbooks — your JARVIS is uniquely optimized for you

**Depends on:** M3 (vault for storing playbook), M11 (audit trail for prompt changes)
**Enables:** M16 (better goal planning from learned patterns), M22 (more capable instances in swarm)

---

### Milestone 21 — Multi-Modal Intelligence

**JARVIS understands everything. Text, images, video, documents, audio.**

Full multi-modal processing: generate and edit images, process any document type, understand and summarize video, analyze audio. JARVIS becomes fluent in every media type.

**Scope:**

- **Image generation**: DALL-E 3 (OpenAI) as primary provider. Generate images from natural language descriptions. Support for variations, style specification, aspect ratios
- **Image editing**: full manipulation capabilities — crop, resize, remove backgrounds, inpainting (fill/replace regions), style transfer, annotation. Uses combination of DALL-E for generative edits and Sharp/Canvas for direct manipulation
- **Document processing**: deep understanding of every common format:
  - PDF: parse, extract text/tables/images, summarize, answer questions about content
  - Office: Word (.docx), Excel (.xlsx), PowerPoint (.pptx) — read, extract, summarize, generate
  - Data: CSV, JSON, XML, SQL query results — analyze, chart, transform
  - Text: Markdown, plain text, code files in any language
  - Ebooks: EPUB parsing and summarization
  - Archives: ZIP/TAR extraction and content analysis
- **Video processing (full)**:
  - Download from URL (YouTube, Vimeo, direct links) via yt-dlp
  - Extract audio track → transcribe with STT (M10)
  - Extract key frames at intervals → analyze with Vision
  - Generate comprehensive summaries combining transcript + visual analysis
  - Timestamp-indexed insights ("at 3:42, the speaker shows a diagram of...")
  - Clip extraction (save specific segments)
- **Audio processing**: transcription (already via M10 STT), music identification, audio summarization for podcasts/meetings, speaker diarization (who said what)
- **Real-time screen feed analysis**: enhance M13 with deeper multi-modal understanding. Not just OCR — understand charts, diagrams, code on screen, video being watched
- **Multi-modal in chat**: users can drop images, documents, audio, video into the chat and JARVIS processes them inline. Drag-and-drop in dashboard, file attachment on mobile

**Key technical decisions:**
- DALL-E 3 for generation — best quality, simple API
- Full image editing — crop/resize are table stakes, inpainting and style transfer are differentiators
- Every document type — no "unsupported format" messages. JARVIS handles everything
- Full video processing — audio-first for speed, visual analysis for depth. Both always available

**Depends on:** M10 (STT for audio), M13 (screen analysis enhancement), M9 (Vision infrastructure)
**Enables:** M13 (richer screen understanding), M14 (document-based workflow triggers)

---

### Milestone 22 — Swarm Intelligence (Multi-Instance Mesh)

**The endgame. One JARVIS is powerful. A network is unstoppable.**

Multiple JARVIS instances across your devices (desktop, laptop, server) communicate, share knowledge, and distribute work. Leader election ensures coordination. Personal multi-device sync — your JARVIS everywhere, working in parallel.

**Scope:**

- **Manual pairing**: instances connect via explicit URL + shared secret token. User adds peers in dashboard settings ("Add instance: wss://laptop.local:3142"). No auto-discovery — explicit trust required
- **Leader election**: one instance elected as leader (coordinator). Assigns tasks, resolves conflicts, maintains canonical state. If leader goes down, automatic failover to next instance. Uses Raft-inspired consensus for leader election
- **Shared knowledge**: vault data synchronized between paired instances. Entities, facts, relationships replicated. Conflict resolution: last-write-wins with vector clocks for ordering
- **Distributed task execution**: leader can assign tasks to specific instances based on capabilities (e.g., desktop with GPU handles image generation, always-on server handles scheduled workflows). Task queue with work-stealing for load balancing
- **Instance profiles**: each instance declares its capabilities (has GPU, has browser, has desktop bridge, has HA connection, available hours). Leader uses profiles for smart task routing
- **Sync protocol**: delta-based sync over encrypted WebSocket. Only changed records transmitted. Bandwidth-efficient for metered connections
- **Unified conversation history**: conversations from any instance visible on all instances. Start a chat on desktop, continue on laptop seamlessly
- **Dashboard**: "Swarm" page showing all connected instances, their status, capabilities, current tasks, sync health. Leader badge visible
- **Personal multi-device focus**: designed for one user across multiple machines. Not team collaboration (yet). Shared identity, shared memory, distributed compute

**Key technical decisions:**
- Manual pairing — security first. No mDNS/broadcast. You explicitly trust each instance
- Leader election — clean coordination model, automatic failover for reliability
- Tasks + knowledge shared — instances are smarter together, not just parallel workers
- Personal multi-device — solve the "I have 3 machines" problem before tackling team collaboration

**Depends on:** M3 (vault sync), M14 (distributed workflow execution), M20 (shared playbook potential in future)
**Enables:** Future team collaboration milestone, enterprise deployment

---

## Strategic Dependency Graph

```
M13 (Awareness) ──────► M14 (Workflows) ──────► M15 (Plugins)
  │                         │                       │
  │                         ▼                       ▼
  │                     M16 (Goals) ◄──── M17 (Smart Home)
  │                         │                       │
  │                         ▼                       │
  └──────────────────► M18 (Finance) ◄──────────────┘
                            │
                            ▼
                       M19 (Mobile) ──────► M20 (Self-Improve)
                                                │
                                                ▼
                                           M21 (Multi-Modal)
                                                │
                                                ▼
                                           M22 (Swarm)
```

**Critical path**: M13 → M14 → M15 → M16 (awareness feeds automation, automation needs plugins, goals need all three)

**Parallel tracks possible**:
- M17 (Smart Home) can start alongside M16 once M14/M15 are done
- M18 (Finance) can start alongside M17
- M21 (Multi-Modal) has minimal dependencies, can be pulled earlier if prioritized

---

## Competitive Advantage Summary

| Capability | JARVIS | OpenClaw | ChatGPT Agent |
|---|---|---|---|
| Continuous screen awareness | M13 | No | No |
| Natural language workflows | M14 | Basic skills | No |
| Plugin ecosystem | M15 | 100+ skills | Walled garden |
| Long-term goal pursuit | M16 | No | No |
| Smart home control | M17 | Basic | No |
| Financial operations | M18 | No | No |
| Native mobile app | M19 | No (messaging only) | iOS app (limited) |
| Self-improving agent | M20 | No | No |
| Full multi-modal | M21 | Basic | Partial |
| Multi-instance mesh | M22 | No | No |
| Desktop automation | DONE (M9) | No | No |
| Authority engine | DONE (M11) | No | No |
| Voice + wake word | DONE (M10) | No | Voice only |
| Local-first + private | Yes | Yes | No (cloud) |
| Open source | Yes | Yes | No |

**JARVIS wins on**: depth of autonomy, continuous awareness, financial operations, self-improvement, desktop control, multi-instance mesh, and authority-gated trust.

---

## Tech Stack

- **Runtime**: Bun (not Node.js)
- **Language**: TypeScript (ESM, strict)
- **Database**: SQLite via `bun:sqlite` (vault) + encrypted SQLite (finance)
- **Frontend**: React 19 + Tailwind CSS 4
- **Mobile**: React Native (iOS + Android)
- **Desktop Control**: C# FlaUI sidecar (.NET 10)
- **Smart Home**: Home Assistant REST API + WebSocket
- **Banking**: Plaid API
- **Trading**: Alpaca (stocks), Coinbase (crypto)
- **Image Gen**: DALL-E 3 (OpenAI)
- **TTS**: edge-tts-universal
- **STT**: OpenAI Whisper / Groq / Local Whisper
- **Video**: yt-dlp + ffmpeg

---

*Last updated: March 1, 2026*
