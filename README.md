# GTCB
Grand Trail Costa Blanca training guide

## GTCB Dashboard

A static HTML/JS/Canvas dashboard tracking a 23-week ultra build to Gran Trail Costa Blanca 102K / 6,280m (Fri 2026-11-13), refreshed by an orchestrated Claude Code subagent pipeline. Weekly on-foot vertical gain vs. plan is the primary metric, alongside session completion, time on feet, and training flags (missed sessions, calf-rehab notes). Each refresh runs a sequential chain of scoped subagents — data-agent fetches raw Strava activity for the Mon–Sun window, analyst-agent computes the weekly summary against `data/plan.json`, builder-agent regenerates the static site, and reviewer-agent audits the result — with a deterministic gate between every handoff so no agent has to check its own work. See `CLAUDE.md` for the full invariants and data shapes.

```
data-agent → Gate A → analyst-agent → Gate B → builder-agent → Gate C → reviewer-agent → Gate D → publish
```
