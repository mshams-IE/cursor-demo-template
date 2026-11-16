---
name: update-from-template
description: Pull the latest kit, skills, rules, scripts, tests and CI from cursor-demo-template into an existing demo repository without touching its pack. Use when someone asks to update, upgrade or sync a demo with the template, or when the gates warn that the kit version differs.
---

# Update from template

A demo repository is a copy of `mshams-IE/cursor-demo-template`. Updating replaces everything **except `pack/`, `public/brand/` and `samples/` the demo added**.

## Steps

1. Make sure the working tree is clean, then create a branch: `git checkout -b update-template`.
2. Fetch the template:

   ```bash
   git remote add template https://github.com/mshams-IE/cursor-demo-template.git 2>/dev/null || true
   git fetch template main
   ```

3. Show what changed in the kit: `git diff HEAD template/main --stat -- kit .cursor scripts e2e .github`. Summarise `kit/CHANGELOG.md` entries newer than the demo's `kitVersion` in one line each.
4. Take the template's version of the shared parts:

   ```bash
   git checkout template/main -- kit .cursor scripts e2e .github playwright.config.ts vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json
   ```

   Then merge the `package.json` dependencies by hand, keeping the demo's `name`.
5. Run `npm install`, then set `kitVersion` in `pack/demo-spec.json` to the version in `kit/src/version.ts`.
6. Run `npm run check` and `npx playwright test`. If the new kit adds a gate the pack fails, fix the pack. Never weaken a gate.
7. Commit ("Update from template, kit X.Y.Z") and offer a pull request with the changelog summary.

## Never

- Overwrite `pack/` or the demo's brand assets.
- Edit files under `kit/` to make the demo pass.
