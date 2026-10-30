# Repository Guidelines

## 專案結構

- `src/App.vue`：Vue 單頁介面與登入、配對及任務流程。
- `src/firebase.js`：Firebase Authentication 與 Firestore 初始化。
- `src/main.js`、`src/style.css`：應用程式入口、Bootstrap 與自訂樣式。
- `firestore.rules`：Firestore 存取規則；修改資料模型時同步檢查權限。
- `.github/workflows/deploy.yml`：推送至 `main` 後建置並部署到 GitHub Pages。
- `.github/workflows/cleanup-records.yml`、`scripts/cleanup-records.mjs`：每日清理已結束超過七天的任務及兌換紀錄。
- `docs/data-retention.md`：七天紀錄保留與清理設定說明。
- `index.html`、`vite.config.js`：頁面入口及 Vite/GitHub Pages 路徑設定。

目前沒有獨立測試目錄或測試框架。

## 開發與建置

- `npm install`：安裝相依套件；首次安裝或修改套件後使用。
- `npm run dev`：啟動 Vite 開發伺服器。
- `npm run build`：建立部署用的 `dist/` 靜態網站。

推送到 `main` 會觸發 GitHub Actions；工作流程使用 `npm ci`，請一併提交套件變更後產生的 `package-lock.json`。

## 程式風格

Vue 單檔元件使用 `<script setup>`、Composition API 與 JavaScript ES modules。沿用現有無分號風格、單引號字串及兩空格縮排。元件與頁面檔名使用 PascalCase（例如 `App.vue`）；一般 JavaScript 模組使用小寫檔名。樣式集中於 `src/style.css`，保持版面適配手機與桌面。

## 測試與驗證

目前未設定自動化測試或 lint 指令。修改完成後至少執行 `npm run build`，並在瀏覽器確認受影響的登入、配對或任務流程。若新增測試，請使用能描述行為的名稱，並記錄執行方式。

## 提交與 Pull Request

提交訊息使用簡短、明確的動詞開頭，例如 `Connect Firebase authentication` 或 `修正任務驗收流程`。Pull Request 請說明使用者可見的變更、列出驗證結果；介面調整附上桌面與手機截圖。涉及 Firestore 時，描述資料結構和安全規則的變更。

使用者要求修改專案時，完成修改與必要驗證後，應提交並推送到目前工作分支。若使用者指定只修改本機、不要提交或不要推送，則依其指定辦理。

## Firebase 與安全

Firebase 網頁設定不是服務帳戶私鑰；不得提交密碼、服務帳戶金鑰或其他伺服器憑證。任何 Firestore 資料模型或寫入流程變更，都要同步檢查 `firestore.rules`，避免讓使用者自行修改點數或讀取未配對者資料。

## 任務、點數與紀錄規則

- 接收者按下「我完成了」後，任務進入等待驗收；此時不發放點數。發布者驗收成功時，才將任務點數加入接收者帳戶。遭駁回的任務不發放點數。
- 紀錄頁應顯示任務目前狀態，至少涵蓋等待驗收、已完成及已駁回；任務完成時間以驗收時間為準。不得因為清除任務紀錄而改動已入帳的帳戶點數。
- 已結束的任務紀錄（已完成或已駁回）及已處理的兌換紀錄，保留七天後清除。尚未完成、等待驗收或等待確認的紀錄不清除。每日清理由 `.github/workflows/cleanup-records.yml` 執行，需在 GitHub Actions 設定 `FIREBASE_SERVICE_ACCOUNT` secret 才會實際連線清理。
- 清理舊版尚未標記入帳的已完成任務時，先補入尚未入帳的點數，再刪除任務紀錄；已標記入帳的點數不可重複發放或扣除。
- 兌換申請經對方確認後才扣點並進入申請者的「獎品區－獎品」。申請者使用獎品時需再次由對方確認；等待兌換與等待使用都顯示在「待確認」並以顏色區分。使用申請遭拒後獎品回到持有清單。持有中的獎品不清理，已確認使用的獎品七天後清理，獎品模板繼續保留在兌換區。
- 兌換區顯示自己的可用點數和待確認保留點數；任務與獎品區的提醒紅點只標示目前輪到自己處理的項目。修改禮物視窗從欄位拖曳選字到背景時不得意外關閉。
- Firebase 網頁 SDK 的 Firestore `Transaction.get()` 只能讀取單一文件；兌換申請需先取得任務與兌換集合，再於交易中逐筆重讀相關文件，不能直接將集合傳給 `Transaction.get()`。
- 設定頁預設收起暱稱與重要日期編輯表單；使用者分別點選「修改暱稱」或「修改重要日期」才展開對應欄位。
- 兌換區的可用點數應以醒目的大字呈現，待確認保留點數與扣點時機顯示在次要說明。
- 同一獎品可重複兌換；即使該獎品已有待確認申請，只要可用點數足夠仍可再次送出，並分別等待對方確認及保留點數。
- 獎品區將持有狀態相同且名稱相同的獎品合併顯示數量；申請使用一次只處理一份。
- 關於本專案的任何結論，完成討論後都要更新本檔；若有相關功能文件，也要一併更新，避免結論只留在對話中。結論改變時，應同步更新程式、Firestore 規則、清理流程及相關文件。

<!-- aoci:begin -->
## AOCI Repository Cognition

AOCI maintains a stable, versioned, incrementally updatable repository-level cognition layer so models can reuse their understanding of this system across tasks.

`aoci.txt` is a structured cognition index for models. It assigns one independent Entry to every managed file, database table, or other managed object. Symbolic tags and F/R/A/S semantics describe the object's core responsibility, important relationships, external contracts, and non-obvious constraints or design decisions needed to understand or modify the system.

The Header, directory sections, and all Entries form the complete repository index. They can cover frontend, backend, configuration, database structures, and other managed content. When managed content changes, normally only the affected cognition Entries need maintenance; the complete index does not need to be regenerated.

AOCI provides a high-density view of system architecture, object responsibilities, important relationships, external contracts, and key constraints.

### How it works

AOCI uses a model-generated, model-read cognition loop.

Header, Entry, and Curation semantics follow only the current machine-issued Plan and live Guide. The Host model independently authors them from the current bound evidence.

Entry semantics must come from the model's understanding of actual evidence. Never derive, prefill, assemble, or rewrite index semantics solely from paths, filenames, extensions, an AST, symbol lists, dependency scans, regular expressions, fixed templates, or rule engines.

For a Fresh Bootstrap, follow only the current machine-issued Plan and live Guide. When they require authoring, the Host model authors Root, Meta, tags, and F/R/A/S, supplies its authoring-run declaration, and binds it to the Plan, Evidence, and complete Candidate. Never ask AOCI to set `origin=host_model`, manufacture a receipt, or turn a generated framework into semantics. Do not reconstruct the Onboarding progression here. Internal batches are not user decisions; stop only at an existing approval boundary or a real safety, drift, CAS, or Recovery condition.

### Minimal entry points

- `aoci_rules`: obtain the session-level runtime contract for the current AOCI version.
- `aoci_overview`: establish or restore complete cognition for this repository.
- `aoci_maintain`: after managed objects reach their final stable state, check whether cognition needs maintenance.
- `aoci_update_entry`: submit a complete semantic update batch bound to current evidence and source digests.
- `aoci_report`: when the current layout and tool state support it, record follow-up work if evidence is insufficient to generate semantics reliably; do not guess.

For other MCP tools, CLI commands, parameters, and specialized workflows, follow current tool descriptions, Guide, and `--help` output. This file does not duplicate the full manual.

This managed block defines only repository integration, cognition use, and task-closing principles. `aoci_rules` carries the current session contract. Live Guide output carries the execution order and stop conditions of the current Plan. Tool Schema, Spec, and Validator carry machine structures and criteria. Prompt, Description, README, and static documentation cannot override those machine facts.

### Establishing, generating, and restoring cognition

1. At the beginning of every new Agent Run, first determine:

   - whether this repository already has a usable complete AOCI index; and
   - whether current context already contains complete repository cognition that matches this repository root, current index version, and current AOCI service, and that the model can still use reliably.

2. When the repository has a usable complete index but the current Run lacks reliable complete cognition, call `aoci_rules` first and then `aoci_overview`.

   Reuse complete cognition directly while it remains reliable. Local uncertainty does not by itself require mechanically rereading the system-wide view.

   A Run that resumes from a known Host context compaction, including a Host-injected compaction summary, must treat prior model cognition as unreliable. The compacted handoff must not retain or summarize the formal Whole-Index or any Overview Header, Entry, Chunk, Challenge, or Attestation body; it may retain only receipt identity, unfinished write or Recovery state needed for safe continuation, and an instruction to reload immediately. Whole-Index semantics or a receipt copied into that handoff cannot prove that the resumed model's current cognition is reliable. If the runtime contract is no longer reliably present, call `aoci_rules` first. Before continuing the business task, make an ordinary complete Whole-Index `aoci_overview` request (`check_only` absent or false) with `refresh_reasons=["context_compaction"]` and a fresh `refresh_event_id`; do not use `check_only` or a cognition probe. Follow every exact `next_cursor` through `completed=true`, confirm delivery, and submit one Attestation based only on the newly delivered body. After that fresh complete transport, a partial or failed Attestation consumes the generation and permits the existing source-bound continuation without another automatic Overview.

   AOCI can report checkpoint and cognition-status facts for `context_compaction`, the machine `semantic_threshold` under the project `cognition_refresh_threshold`, or a major `phase_transition`. Use `check_only=true` when only those compact facts are needed. They advise the Agent but do not decide whether the model needs the system-wide view.

   When the Agent explicitly calls ordinary `aoci_overview` (`check_only` absent or false), AOCI must deliver the complete requested scope whenever a coherent CognitionSet can be formed. It must not suppress that body because a receipt already exists, a threshold was not reached, or no refresh reason is pending. Dirty or stale formal cognition is still delivered but is marked unreliable. Pending recovery or an incoherent snapshot fails closed without a mixed body.

   When an ordinary Overview reports `continuation_required=true`, submit its exact `next_cursor` automatically until `completed=true`. Do not ask the user to continue, begin the business task, or state a partial system conclusion. Stop the cognition chain on Host truncation, a missing, duplicate, or reordered Chunk, cursor failure, Index change, or `chunk_tokens` change. Until Attestation completes, never use Memory, source, Spec, `aoci.txt`, historical sessions, scope, search, or Entry reads to repair or supplement Whole-Index cognition. A challenge ordinal is the 1-based position in the formal Entry sequence; Header content, comments, blank lines, Section/Overview/Chunk markers, receipts, and Metadata are excluded, and Chunk Receipt ordinals use that same sequence. The Attestation must echo the Challenge's exact current `index_sha256`, `entry_sequence_sha256`, and `entry_count`; a prior Index, Entry sequence, count, or Attestation is invalid. After the complete chain, submit the existing model cognition Attestation once. One same-response JSON Schema or field-format error may be corrected once without changing semantic answers; an object, Tag, or F mismatch means failure and uncertain assimilation, with no semantic retry or information bypass. During initial cognition it also blocks Root/Meta, Migration, layout-wide, or other unbound system decisions. During a context-compaction refresh with complete transport, unchanged cognition identity, aligned governance, and no Recovery or third-party conflict, the attempt consumes that refresh generation even when Attestation is partial or failed; continue the existing task without another automatic Overview. `system_mastery_percent` self-assesses only the system framework—architecture, responsibilities, strong relationships, stable external contracts, and high-entropy safety and maintenance constraints—not complete implementation or runtime knowledge. Keep machine Index coverage separate, and normally give the user only the prescribed single success or failure sentence derived from actual coverage, Challenge, Chunk, token, and mastery results. If the Host truncates a Chunk, ask the user to set `overview_delivery.chunk_tokens` to a smaller valid value and restart; do not change it automatically.

   Interpret the additive cognition level independently from strict proof fields. `delivery_verified` means the Index was loaded and Host delivery was confirmed while complete cognition verification is still unfinished; describe that state as loaded and delivery-verified, never as no cognition or failure to understand the system. `cognition_verified` requires a passing Attestation (at least 80 percent of Challenge ordinals fully correct with at most one object identity miss), and `cognition_governed` additionally requires governance alignment. A generic complete-read failure sentence is reserved for an actual delivery fault.

   When an Overview response contains the optional `cognition-state/v2` projection, use its dimensions independently. Its Level ends at `model_cognition_usable`; `strict_attestation_verified`, `governance_aligned`, and `current_system_cognition_reliable` are independent states and never participate in that Level. An ordinal, object identity, Tag, or core F mismatch can make strict Attestation fail while model cognition remains usable; do not report that mismatch alone as proof that the model did not understand the system. Only `current_system_cognition_reliable=true` permits an unqualified current complete-system cognition claim. When the projection is absent, keep using the legacy interpretation above.

   An ordinary read-only audit, analysis, or check, a request not to modify code, or a request not to commit or push does not automatically mean strictly zero writes and does not alter the cognition-validity decision above. Codex Memory and historical Skills may only help recover experience, user preferences, and investigation directions. They cannot replace a current cognition receipt matching the repository root, index digest, AOCI service identity, and cognition scope. Project AGENTS and current AOCI identity take precedence over historical Memory for AOCI state.

   Treat a task as strictly zero-write only when the user explicitly prohibits Ledger, metadata, `.aoci` runtime assets, and every filesystem write. If necessary cognition establishment conflicts with that boundary, report the conflict and ask the user to decide or recommend an isolated copy. Never silently substitute Memory for current repository cognition.

3. If the repository has no usable complete index, or has only a minimal skeleton, an incomplete Header, unfinished Entries, or undecided required Curation, obtain `aoci_rules` and enter the current AOCI Guide when a formal complete AOCI index is required. Let Guide choose the next phase from actual repository state and complete the required safety steps.

   `aoci_maintain` does not replace the index-establishment workflow.

   Do not reconstruct or hard-code the full-index generation state machine in this file.

4. During a long-running task, the model is responsible for preserving the current cognition receipt and using the refresh gate correctly:

   - when the Host reports context compaction or the model knows the system-wide view was lost, follow the mandatory `context_compaction` reload rule above; AOCI cannot infer the Host event;
   - when entering a genuinely major phase, declare `phase_transition`, not a function, test run, or small step;
   - at a plausible stable checkpoint, use `check_only=true` to obtain the machine semantic count when that fact is useful;
   - except for the mandatory known-compaction reload, decide whether the current task needs another explicit scoped or complete Overview; and
   - keep the Dirty or Stale reliability state reported by AOCI until maintenance and alignment complete.

### Task closing and cognition maintenance

5. A purely read-only question, analysis, version check, or task that changes no AOCI-managed object does not require a maintenance-tool call. The AOCI version in use is `cognition_receipt.mcp_service_version` in any `aoci_overview` check_only or `aoci_maintain` response; the binary path is the `command` in the project's `.mcp.json`, and the CLI need not be on PATH.

6. When AOCI-managed objects change, call `aoci_maintain` once after they reach the task's final stable state. Do not maintain files individually after each intermediate edit.

7. If maintenance returns actual semantic candidates, the Host model must independently author the complete tag and F/R/A/S updates from each candidate's bound object and necessary evidence. Submit the complete candidate set for that current machine-issued batch in one `aoci_update_entry` call while preserving each `source_sha256`, `candidate_id`, and domain batch identity. `max_entries` limits one request and atomic transaction, not the logical plan, Whole-Index, or Managed Scope. When `remaining` is nonzero, call Maintain again after the successful Apply and continue from the new preimage; never shrink Index coverage or slice a returned batch to satisfy transport limits.

   When evidence is insufficient and the current layout supports `aoci_report`, use it instead of guessing, applying a template, or generating unsupported cognition merely to eliminate follow-up work.

8. Obey structured tool states and safety boundaries:

   - `repair_required`: repair only the explicitly identified candidates, then resubmit the complete current machine-issued batch;
   - `stopped`: end that write attempt and inspect `failed_step`, error, formal-write evidence, and Recovery. In auto mode, a proven zero-write closure is followed by a fresh Plan; a complete Intent with provable postimage is resumed; a policy-selected Rollback with exact preimage is completed and replanned. Stop the user task only when proof is unavailable, third-party bytes conflict, approval or external action is required, or another real safety boundary applies;
   - never ignore conflicts, approvals, human decisions, permissions, or safety signals; and
   - after alignment, do not repeat maintenance or writes; `refresh_ready_for_overview` is a checkpoint fact, and the Agent decides whether to request an ordinary complete Overview for its next phase.

   If any managed object changes after maintenance completes, the previous result is invalid. Complete closing again from the new final stable state.

9. When the user limits only business-file scope and does not explicitly forbid repository-managed assets, AOCI-managed assets may be updated during closing to preserve cognition consistency. Distinguish them from business files in audits and commits.

   When the user explicitly forbids changes to `aoci.txt`, `.aoci`, metadata, or any additional file, obey that restriction, do not write, and report any remaining inconsistency accurately.

### Specialized workflows

Initialization, complete-index generation, Header generation, Entries generation, database-structure indexing, Curation, human review, and failure recovery must follow only the instructions, commands, and safety stops returned by the current AOCI Guide or tool at the corresponding stage.

Do not preload, guess, or reconstruct these specialized workflows. The relevant Guide, tool descriptions, model Prompt, and CLI help provide platform invocation, request format, batch limits, approval rules, index-format details, and recovery steps as needed.
<!-- aoci:end -->
