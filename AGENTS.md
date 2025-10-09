# AGENTS.md

Guidance for autonomous coding agents collaborating on the CC Bridge repository.

## Project Snapshot
- **Stack**: Electron (main process) + React 18 + TypeScript + Vite.
- **Entry Points**: `electron/main.ts` (main), `electron/preload.ts`, `src/main.tsx` + `src/App.tsx`.
- **Core Services**:  
  - `electron/services/configManager.ts`: dual-mode (Claude & Codex) store, AES token encryption, language preference.  
  - `electron/services/settingsWriter.ts`: writes Claude `~/.claude/settings.json` and Codex `~/.codex/config.toml` + `auth.json`, with backups and process checks.  
  - `electron/services/encryption.ts`: device-specific AES-256-CBC utility.  
  - `electron/services/simpleStore.ts`: JSON persistence under `app.getPath('userData')/config.json`.
- **Shared Types**: dual-mode definitions in `electron/types/config.ts` mirrored by `src/types/config.ts`.
- **UI Contexts**: `src/contexts/ThemeContext.tsx`, `src/contexts/LanguageContext.tsx`.
- **Reference docs**: `CLAUDE.md` (architecture), `README_EN.md` / `README.md` (user-facing, kept in sync with latest release).

## Agent Roles & Coordination
1. **Navigator Agent**
   - Clarify tasks, gather context (docs, code, configs) before proposing changes.
   - Define actionable subtasks, update project plan, and highlight risks or unknowns.
   - Review diffs from the Builder for scope creep, regressions, or missing coverage.

2. **Builder Agent**
   - Implement code or documentation updates exactly matching the Navigator’s plan.
   - Prefer incremental commits via `apply_patch` or focused scripts; avoid destructive git commands.
   - Run relevant checks (`npm run lint`, `npm run build`, targeted scripts) when feasible and report results.

3. **Both Agents**
   - Reference files with direct paths and line numbers when discussing changes.
   - Keep communication terse and technical; surface blockers immediately.
   - Maintain English comments unless the surrounding code uses another language.

## Workflow Checklist
1. **Spin-Up**
   - Inspect `package.json` for scripts, versions, and entry files.
   - Review `CLAUDE.md` for architectural expectations.
   - Note sandbox status (workspace-write, no network) and adjust commands accordingly.

2. **Planning**
   - Split complex tasks into ≥2 concrete steps; document the plan via the plan tool.
   - Confirm which files will change and whether docs/tests need updates.

3. **Implementation**
   - Renderer ↔ main communication uses `window.electronAPI`; ensure preload-safe additions.
   - Most IPC now requires an explicit `mode` argument or dual-mode awareness: update main + preload + type declarations together.
   - Preserve encryption/storage contracts when touching `configManager`/`encryptionService`; keep station CRUD dual-mode safe.
   - Maintain TypeScript typings in both `electron/types` and `src/types`, including defaults for Claude & Codex.

4. **Validation**
   - Minimal verification: `npm run lint` for linting, `npm run build` for type-check + bundle.
   - For Electron-specific logic that cannot run in CI, outline manual validation steps.
   - If commands cannot run (sandbox or time), state the limitation and provide guidance.

5. **Handoff**
   - Summarize modifications and affected files.  
   - Suggest natural next actions (e.g., run build, package, manual test) if not performed.
   - Confirm no unrelated files were touched.

## Coding Conventions
- Use functional React components and hooks; keep components in `src/components`.
- Scope styles per component (existing `.css` pattern).
- Keep sensitive values masked in UI previews (`BaseConfigDialog`, `StationDialog`).
- Follow existing notification and tray patterns when extending `electron/main.ts`.
- For new IPC channels, define handler in main, expose via preload, consume through `window.electronAPI`.

## Common Task Recipes
- **Add Station Field**: update `TransferStation`/`CodexTransferStation`/`ClaudeTransferStation` in shared types, adjust `configManager`, dialogs, and storage for both modes.
- **Extend Base Config**: modify `ClaudeBaseConfig` / `CodexBaseConfig`, ensure `BaseConfigDialog` sanitises mode-specific fields, propagate to `settingsWriter`.
- **New UI Flow**: components under `src/components`, translations via `LanguageContext` (both en/zh), icons in `components/Icons.tsx` if needed.
- **Documentation**: user docs in `README_EN.md` + `README.md` (dual-mode focus); contributor guidance in `CLAUDE.md`; agent guidance here.
- **Codex Quick Import**: Claude JSON importer auto-normalises smart quotes/commas/newlines; Codex fields remain manual—document behaviour if changed.

## Cautions
- `settingsWriter` touches user home directories (`~/.claude`, `~/.codex`); avoid accidental writes during testing, provide manual validation steps.
- Never log decrypted tokens or leave plaintext secrets in state; rely on encryption service helpers.
- Tray/menu, headers, and layouts are tuned to avoid jumping between languages—retain `line-clamp` and layout constraints.
- Encryption or config migrations must consider both modes; review `needsReEncryption` and migration helpers before changes.

## Useful Commands
```
npm run dev      # Vite + Electron development (manual use)
npm run build    # Type-check and bundle renderer
npm run lint     # ESLint across TS/TSX
npm run package  # electron-builder packaging
```

## Reference Matrix
- `electron/main.ts`: window lifecycle, tray, notifications, IPC glue.
- `electron/services/*.ts`: backend logic for configs, encryption, file I/O.
- `src/App.tsx`: renderer orchestration, dialog toggles, active station detection.
- `src/components/*.tsx`: UI building blocks; review CSS siblings for styling.
- `build/`, `screenshots/`: assets used in docs/app (usually no edits needed).

Keep this file updated when workflows, scripts, or architecture evolve so future agents can onboard quickly.
