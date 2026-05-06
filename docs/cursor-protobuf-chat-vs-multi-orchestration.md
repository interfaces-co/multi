# Cursor bundled chat/composer vs Multi effect-backed orchestration

This note compares **Cursor Desktop’s shipped workbench** (Apple bundle under `/Applications/Cursor.app`) with **Multi’s server-side orchestration** in this repository. It is based on **static inspection** of Cursor’s production bundles plus Multi source files—not runtime packet capture.

**Sources inspected**


| Artifact                 | Path                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Cursor main JS bundle    | `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js` (~51 MB minified) |
| Cursor main CSS bundle   | `/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.css` (~2 MB)          |
| Multi WebSocket RPC      | `packages/server/src/ws.ts`                                                                                    |
| Multi orchestration core | `packages/server/src/orchestration/OrchestrationEngine.ts`, `decider.ts`, `ProviderRuntimeIngestion.ts`        |
| Multi contracts          | `packages/contracts/src/orchestration.ts`, `packages/contracts/src/rpc.ts`                                     |


---

## 1. What Cursor bundles for chat/composer

### 1.1 Feature anchor: `contrib/composer`

Composer-specific logic resolves under VS Code–style contribution paths embedded in the bundle, for example:

- `out-build/vs/workbench/contrib/composer/browser/composerData.js`
- `out-build/vs/workbench/contrib/composer/browser/utils/getComposerSubtitle.js`
- `out-build/vs/workbench/contrib/composer/browser/utils/planFileUtils.js`
- `out-build/vs/workbench/contrib/composer/browser/composerEffectiveAllowlistService.js`
- `out-build/vs/workbench/contrib/composer/browser/services/planStorageService.js`

Cross-cutting services such as `composerDataService` and `composerModesService` appear in other browser layers (for example selected-context utilities). This indicates **Composer is a first-class workbench contribution** with its own **data service**, **mode service**, **plan storage**, and **allowlist** policy—not a thin wrapper over stock VS Code chat.

### 1.2 Conversation model: bubbles and capabilities

The client-side transcript is not modeled as a flat “chat messages” array alone. Strong signals point to a **bubble graph**:

- Each conversation step references a `**bubbleId`**.
- State is retrieved through `**composerDataService.getComposerBubble(handle, bubbleId)**`.
- Bubbles carry a `**capabilityType**` discriminant; one prominent value is `**TOOL_FORMER**`.
- Tool UI state nests under `**toolFormerData**` with fields such as `**tool**`, `**params**`, `**additionalData**`, `**result**`, and async human-in-the-loop fields like `**answerBubbleId**` and `**status: "submitted"**` for ASK_QUESTION-style flows.

**Interpretation.** Cursor separates:

1. **Structural transcript entries** (ordered conversation headers / bubbles).
2. **Capability-specific payloads** (tool-former vs plain text vs other caps).

That separation lets the UI attach **different renderers and lifecycle handlers** per bubble without re-encoding everything into one polymorphic JSON blob at the React boundary.

### 1.3 Roles and submit pipeline

- Messages distinguish `**nu.HUMAN`** vs `**nu.AI**` (minified enum names in-bundle).
- Higher-level wrappers compose submits around `**composerDataHandle**` and `**submitMessage**`; draft agents explicitly reject submit until promoted (“Draft agents do not support submitMessage…”).

This aligns with a **state machine around composer handles** (loaded vs draft; unified modes) rather than a single fire-and-forget HTTP POST.

### 1.4 Tool registry: protobuf-shaped JSON at the UI edge

In the same composer region, tool dispatch normalizes many tools through a registry keyed by symbols such as `**Sn.RUN_TERMINAL_COMMAND_V2`**, `**Sn.EDIT_FILE**`, `**Sn.EDIT_FILE_V2**`, `**Sn.FILE_SEARCH**`, `**Sn.LIST_DIR**`, `**Sn.READ_SEMSEARCH_FILES**`, etc.

For params/results, the bundle shows **protobuf-es style helpers** such as `**.fromJsonString(...)`** on generated types—i.e. **JSON serialization of protobuf message shapes**, not ad-hoc untyped objects, at least for tool payloads surfaced to Composer.

**Important nuance.** The same file contains full `**@bufbuild/protobuf` binary runtime** machinery (`runtime.bin`, `wireType`, `listUnknownFields`). That proves **binary protobuf codecs exist in-app**, but the **composer tool switch** that was located is predominantly `**fromJsonString`**. Binary framing may still dominate **network transport** for AgentService; UI deserialization paths often prefer JSON-string or JSON object interchange for convenience.

### 1.5 Streaming adapter: tagged unions over RPC payloads

Inbound agent traffic is handled as **tagged unions**:

- Top-level `**message.case`** includes `**toolCallCompleted**` (and related cases).
- Nested discriminant `**toolCall.tool.case**` enumerates tools such as `**shellToolCall**`, `**editToolCall**`, `**deleteToolCall**`, `**grepToolCall**`, `**readToolCall**`, `**awaitToolCall**`, `**taskToolCall**`, `**switchModeToolCall**`, plus `**ComputerUseToolCall**` (exact set inferred from string remnants).

This is structurally the same **algebraic data type** style protobuf `oneof` generates—regardless of whether the bytes on the wire are protobuf-binary or Connect-JSON.

### 1.6 Markdown rendering: Streamdown + Marked as the “smooth scrolling block”

The bundle embeds `**streamdown@2.2.0`** (React), with chunks such as:

- `streamdown/dist/chunk-LPQFK2AO.js`
- `streamdown/dist/code-block-OCS4YCEC.js`
- `streamdown/dist/mermaid-NOHMQCX5.js`

Markers include `**streamdown:incomplete-link**`—behavior consistent with **repairing partially streamed Markdown** (incremental token chunks).

**Marked** (`github.com/markedjs/marked`) also appears (error strings / integration signals).

**DOM contract.** Attributes such as `**data-streamdown`** bridge CSS and React rendering; Composer-adjacent Markdown sometimes nests under `**.markdown-root**`.

### 1.7 CSS layout: separate shells for session, items, and edits

In `workbench.desktop.main.css`, chat-like surfaces use stable layout anchors:

- `**.interactive-session**` — centers the column (`max-width: 850px`).
- `**.interactive-item-container**` — per-message layout; `**.interactive-response.chat-most-recent-response**` pins `**min-height**` to stabilize the viewport during streaming.
- `**.interactive-item-container .value .rendered-markdown**` — assistant/user rich text (tables, blockquotes, code margins, link colors).
- **Composer debugging / plan summaries** scope Markdown via chains like `**.composer-create-plan-summary .markdown-root`**.
- **Inline widgets** embed under rendered markdown (e.g. `**.chat-inline-anchor-widget`**, `**.chat-codeblock-pill-widget**`, `**.chat-confirmation-widget**`).
- `**.chat-editing-session**` — distinct bordered stack for “agent editing” UX vs plain chat bubbles.

**Takeaway.** Cursor’s “smooth” feel is partially **CSS architecture**: fixed chat column width, reserved height for the streaming tail, normalized markdown spacing variants (e.g. `**.markdown-root.markdown-normalized`**), and separate shells for tool confirmations vs narrative markdown.

---

## 2. Cursor’s protobuf / Connect stack (what the bundle proves)

### 2.1 Libraries present

- `**out-build/external/bufbuild/protobuf/...**` — Buf’s **protobuf-es** runtime (same family as npm `**@bufbuild/protobuf`**).
- `**out-build/external/bufbuild/connect/code.js**` — **Connect** status codes (`InvalidArgument`, `DeadlineExceeded`, `Unauthenticated`, etc.).
- Generated module key `**src/proto/agent/v1/agent_service_pb.ts`** — strongly implies a `**.proto**` package `**agent.v1**` with an `**AgentService**`-style API compiled to TypeScript.

No `**protobufjs**` branding appeared in targeted searches.

### 2.2 RPC ergonomics vs Multi

Connect-over-HTTP semantics (unary and streaming) pair naturally with **protobuf message types**. Cursor’s UI maps `**connectCode`** into Composer error surfaces—i.e. **RPC failures are first-class** and unified with gRPC-style status taxonomy.

### 2.3 Correlation and multi-agent hierarchy

The bundled `**../packages/agent-client/src/common.ts`** references HTTP headers:

- `x-parent-request-id`
- `x-root-parent-request-id`
- `x-parent-agent-tool-call-id`
- `x-direct-meta-parent-child-subagent`

Those headers indicate **tree-structured agent execution** (parent/child tools and subagents) carried **on the RPC metadata plane**, not only inside message bodies.

### 2.4 Ancillary transports

- **NDJSON ingest** appears tied to `**cursor.ndjsonIngest.start`** / `**anysphere.cursor-ndjson-ingest**` — a **local debugging / instrumentation** path, not claimed here as production chat transport.
- `**WebSocket`** literal occurrences are sparse in-bundle; absence is weak negative evidence because transports may be minified behind wrappers.

### 2.5 Supporting packages (virtual paths)

Beyond protobuf, the bundle embeds paths such as:

- `packages/agent-exec/src/index.ts`
- `../packages/agent-transcript/src/context-stripping.ts`
- `packages/agent-transcript/src/browser.ts`

Those suggest **pre-submit transcript shaping** (block tags like `user_rules`, `mcp_file_system`, `git_status`, etc.) is a **separate package concern** from raw Composer state.

---

## 3. Multi: effect-backed orchestration (this repo)

### 3.1 Core pattern

Multi’s orchestration engine (`OrchestrationEngine.ts`) implements:

1. **Command ingress** via an **unbounded `Queue`**, processed **serially** (`Effect.forever`).
2. `**decideOrchestrationCommand`** → optional multi-event emission.
3. **Transactional append** to `**OrchestrationEventStore`** with monotonic `**sequence**`.
4. **Projection** (`projectEvent`, `ProjectionPipeline`, `ThreadProjection`).
5. **Fan-out** of committed events through `**PubSub.unbounded<OrchestrationEvent>`**.
6. **Idempotency** via `**OrchestrationCommandReceiptRepository`** keyed by `**commandId**`.
7. **Failure reconciliation**: replay persisted events from a snapshot cursor back into the read model and **re-publish** to subscribers.

This is **event sourcing + CQRS-flavored read models**, expressed with **Effect** (`Effect.gen`, `Stream`, `Deferred` for acknowledgements, `Metric` hooks).

### 3.2 Wire format: Effect RPC + JSON—not protobuf

The `/ws` route wraps `**RpcServer.toHttpEffectWebsocket(WsRpcGroup, …)`** with `**RpcSerialization.layerJson**`:

```1111:1120:packages/server/src/ws.ts
        const rpcWebSocketHttpEffect = yield* RpcServer.toHttpEffectWebsocket(WsRpcGroup, {
          spanPrefix: "ws.rpc",
          spanAttributes: {
            "rpc.transport": "websocket",
            "rpc.system": "effect-rpc",
          },
        }).pipe(
          Effect.provide(
            makeWsRpcLayer(session.sessionId).pipe(Layer.provideMerge(RpcSerialization.layerJson)),
```

Orchestration exposes `**dispatchCommand**`, `**replayEvents**`, `**subscribeShell**`, `**subscribeThread**`, etc. (`ORCHESTRATION_WS_METHODS` in `packages/contracts/src/orchestration.ts`). **Subscribe** endpoints are `**stream: true`** RPCs in `packages/contracts/src/rpc.ts`.

Client handlers treat streaming replies as tagged `**Chunk` / `Exit**` sequences (`packages/app/src/rpc/protocol.ts` patterns).

### 3.3 Assistant streaming path

Multi **does not** expose raw provider tokens as the primary domain contract. Instead:

1. Provider runtime emits `**content.delta`** (and completion signals) — see `ProviderRuntimeIngestion.ts`.
2. Ingestion dispatches **internal** orchestration commands:
  - `thread.message.assistant.delta`
  - `thread.message.assistant.complete`
   (`packages/contracts/src/orchestration.ts`)
3. The **decider** collapses those into repeated `**thread.message-sent`** events carrying `{ role: "assistant", text: delta-or-empty, streaming: true|false, … }` (`packages/server/src/orchestration/decider.ts`).
4. WebSocket subscribers consume `**streamDomainEvents**` / projections—**normalized orchestration events**, not protobuf `oneof` envelopes from the LLM vendor layer.

**Boundary summary**


| Layer                     | Multi                                                   |
| ------------------------- | ------------------------------------------------------- |
| Provider streaming schema | Provider-runtime typed events (vendor/channel specific) |
| Domain persistence        | `OrchestrationCommand` → `OrchestrationEvent` log       |
| Client-visible sync       | JSON Effect RPC + event replay / subscribe streams      |


---

## 4. Head-to-head comparison


| Dimension               | Cursor (bundled signals)                                                                           | Multi (this repo)                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **IDL**                 | Protobuf (`agent.v1` / `AgentService` codegen paths)                                               | Effect `**Schema`** structs/unions in TypeScript                                                  |
| **RPC system**          | Connect-style codes + protobuf runtime (**HTTP-oriented** stack in Buf ecosystem)                  | **Effect RPC** over **WebSocket**                                                                 |
| **Serialization**       | Protobuf binary runtime present; **tool JSON** interchange via `**fromJsonString`** at UI boundary | **JSON** RPC envelopes (`RpcSerialization.layerJson`)                                             |
| **Streaming primitive** | Tagged `**message.case`** / `**tool.case**` progression + client stall / heartbeat diagnostics     | `**stream: true**` RPCs + `Stream.fromPubSub` / provider ingestion bridge                         |
| **Transcript model**    | `**bubbleId` + `capabilityType` + `toolFormerData`** graph                                         | **Thread projection + orchestration events** (`thread.message-sent`)                              |
| **Tool UX state**       | Embedded in composer bubbles (`answerBubbleId`, submitted questionnaires, tool results)            | Driven by orchestration + UI state machines (separate modules); tools obey domain commands/events |
| **Markdown UX**         | **Streamdown + Marked**, `.rendered-markdown` / `.markdown-root` shells                            | Implementation-specific per app UI (not protobuf-driven)                                          |
| **Multi-agent tracing** | Explicit **HTTP headers** for parent/child/tool-call hierarchy                                     | Domain `**commandId`**, `**correlationId**`, `**causationEventId**` on orchestration events       |
| **Debugging extras**    | **NDJSON ingest** command surface                                                                  | Not covered here                                                                                  |


---

## 5. Why Cursor’s composition feels different

Cursor optimizes three axes simultaneously:

1. **Algebraic streaming** — protobuf `oneof`-style discriminants (`toolCallCompleted`, per-tool `tool.case`) let the client apply **small, pure reducers** per incoming chunk without re-parsing entire transcripts.
2. **Bubble capabilities** — treating `**TOOL_FORMER`** as a capability on a bubble means tool cards, human answers, and async subprocess UI **dock onto the graph node** that owns them; scrolling and partial rerenders stay localized.
3. **Incremental Markdown as a product feature** — Streamdown’s incomplete-link repair and parallel chunks (code blocks, Mermaid) convert raw token drift into **stable visual blocks** early—the “smooth” illusion is both **protocol** and **rendering**.

Multi’s **effect orchestration** optimizes different goals: **deterministic command handling**, **append-only history**, **idempotent dispatch**, and **typed domain errors**—with assistant streaming **normalized into orchestration events** rather than driven purely by protobuf envelopes end-to-end.

Those approaches are **orthogonal**. Multi could adopt protobuf/Connect for a provider edge without changing the event store model; Cursor still needs composer graph state even if RPC were swapped.

---

## 6. Limits of this analysis

- **Minification** erases many explicit identifiers (`ConnectTransport`, `serverStreaming`, etc.); absence is not proof of absence.
- **Network reality** (exact content-types, HTTP/2 vs WS, envelope framing) requires TLS interception or Cursor-side logging—not attempted here.
- **Multi UI** details for markdown/tool cards live in `packages/app` and were only touched where RPC/orchestration intersects.

---

## 7. Related docs in this repo

- `docs/chat-agent-window-cursor-parity.md` — product/UI parity notes vs Cursor patterns.

---

*Generated from bundled Cursor artifacts at `/Applications/Cursor.app` and Multi sources under `packages/`.*