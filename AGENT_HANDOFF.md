# Agent Handoff Log

Purpose: keep parallel agent work mergeable by documenting intent, scope, and verification for every change.

## How To Use (Required)
1. Add a new entry at the top of `## Active Entries` before you start editing code.
2. Update that same entry when done (status, files changed, tests, risks).
3. If your scope changes, update the `Scope` and `Merge Notes` fields immediately.
4. Do not delete old entries. Move finished items to `## Completed Entries`.

## Entry Template
Copy this block into `## Active Entries`:

```md
### [ENTRY_ID] Short Title
- Agent: your-name-or-agent-id
- Branch: branch-name
- Status: active | blocked | ready-for-merge | merged
- Start Time (UTC): YYYY-MM-DD HH:MM
- Last Updated (UTC): YYYY-MM-DD HH:MM
- Scope: one clear sentence describing what this change is for
- Why: business/product reason for this change
- Files Touched:
  - path/to/file1
  - path/to/file2
- Non-Obvious Decisions:
  - decision + rationale
- Test Plan:
  - [ ] what you ran
  - [ ] what you manually verified
- Merge Notes:
  - likely conflict areas
  - migration/env changes
  - rollback plan
- PR / Commit Links:
  - PR: 
  - Commit(s): 
```

## Active Entries

### [AC-000] Initialize Handoff Log
- Agent: codex-gpt5
- Branch: main
- Status: ready-for-merge
- Start Time (UTC): 2026-02-21 01:59
- Last Updated (UTC): 2026-02-21 01:59
- Scope: create a shared handoff document for multi-agent parallel development
- Why: reduce merge friction by making intent and change boundaries explicit
- Files Touched:
  - AGENT_HANDOFF.md
- Non-Obvious Decisions:
  - put a strict template in-repo so all agents follow one format
- Test Plan:
  - [x] confirmed file exists at repo root
  - [x] confirmed markdown structure is readable
- Merge Notes:
  - none (documentation only)
  - no env/migration impact
  - rollback: revert this single file
- PR / Commit Links:
  - PR:
  - Commit(s):

## Completed Entries
Move finished entries here (keep newest first).
