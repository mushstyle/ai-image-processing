# Agent Guidelines (Project-wide)

This repository uses `AGENTS.md` to define project-wide guidance for coding assistants.

## Scope
- This file applies to the entire repository.

## Skills
- Check repository-provided skills or assistant instructions when present.

## Quality and Testing
- Keep tests stable; do not disable failing tests as a workaround.
- When behavior changes, update or scope tests/selectors appropriately instead of removing coverage.

## Change Management
- Keep changes minimal and aligned with existing code style.
- Update documentation when behavior, workflows, or interfaces change.
- Stop any processes started for testing or diagnostics when finished.
- Before final handoff, verify no repo-local dev/test processes you started are still running.

## Deployment
- This app deploys to SSH host `mush-etl`.
- The production domain for this app is `banana1.mush.style`.
- The remote app path is `/root/pkg/nano-banana`.
- The app should listen on port `3001` behind Caddy.
- Caddy should route `banana1.mush.style` to `localhost:3001`.
- The server uses NVM-managed Node from `/root/.nvm`, not a system `node` on PATH by default.
- The required Node version for deploy/start work is `>= 22.10.0`; `.nvmrc` pins `22.14.0`.
- The process model is a simple long-running Express server started by shell script, with pid/log files under `.run/` and `logs/`.
- Prompt persistence lives in `data/prompts.json` and should not be overwritten on deploy.
- Clerk stays enabled; deploy/update work must keep `banana1.mush.style` configured in the Clerk app's allowed origins/redirects.
- Prefer using the repo's deploy and server scripts for updates instead of ad hoc commands.

## Planning Workflow
- When a task benefits from a plan, write or update a short plan file on disk so it survives context loss.
