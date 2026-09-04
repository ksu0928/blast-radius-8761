# BlastRadius — Supply-Chain Blast Radius, Live with Your Agent

See the full blast radius — and let your AI agent see it with you, live.

BlastRadius is a supply-chain security dashboard that visualizes how far a 
compromised npm package's impact spreads — affected packages, exposed 
services, and the exact dependency chain an attack would travel. Built for 
The WebMCP Challenge, it exposes this functionality directly to AI agents 
via WebMCP, so an agent's investigation renders live on the same screen a 
human is watching — not as silent JSON, but as a visible, shared workspace.

## What makes this WebMCP-native

Two tools are registered via `document.modelContext.registerTool()` at the 
app's entry point:

### `trace_blast_radius`
- **Input:** `{ packageName: string }`
- Looks up the package's blast radius and dispatches a `blastradius:render` 
  `CustomEvent` carrying the result
- The dashboard listens for this event and updates the stats row, the 
  dependency graph, and the attack-path breadcrumb **live, on screen** — 
  the human doesn't need to do anything for the update to appear
- Returns a short human-readable summary plus the full result object

### `flag_dependency_for_review`
- **Input:** `{ packageName: string, reason: string, severity: string }`
- Dispatches a `blastradius:flag` `CustomEvent`
- A "Flagged for Review" panel, docked bottom-right on the dashboard, 
  listens for this event and appends a card showing the package, the 
  agent's reason, and a color-coded severity badge
- This is the collaborative artifact: the agent flags, the human reviews 
  and decides

The core idea: an agent calling a WebMCP tool should be *visible*, not just 
functional. Both tools change what's on the human's screen, in real time, 
so a security review can genuinely happen as a joint session rather than 
an agent working in isolation and reporting back afterward.

## Testing the WebMCP tools

1. Enable WebMCP in Chrome: go to `chrome://flags/#enable-webmcp-testing`, 
   set to **Enabled**, and relaunch
2. Open the deployed app (or `localhost:3000` locally) and navigate to the 
   dashboard
3. Open DevTools Console and confirm tool registration:
```javascript
   document.modelContext.getRegisteredTools()
```
4. Trigger a live graph update:
```javascript
   await document.modelContext.invokeTool({
     name: "trace_blast_radius",
     input: { packageName: "event-stream@3.3.6" }
   })
```
   Watch the graph, stats, and breadcrumb update on screen.
5. Trigger a flag:
```javascript
   await document.modelContext.invokeTool({
     name: "flag_dependency_for_review",
     input: {
       packageName: "flatmap-stream@0.1.1",
       reason: "Suspicious maintainer, anonymous email",
       severity: "critical"
     }
   })
```
   Watch the "Flagged for Review" panel appear with the flagged item.

## Getting Started (local development)

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to 
see the result. Navigate to `/dashboard` and follow the WebMCP testing 
steps above.

You can start editing the page by modifying `app/page.tsx`. The page 
auto-updates as you edit the file.

## Tech Stack

- **Next.js** — React framework
- **document.modelContext** (WebMCP) — agent tool exposure
- Dark, terminal-aesthetic UI for the dashboard, graph, and stats

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can 
continue developing by visiting the link below — start new chats to make 
changes, and v0 will push commits directly to this repo. Every merge to 
`main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_tQO8FSciyOPiDiAC5bqIUHczkaKI)

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js 
  features and API
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js 
  tutorial
- [v0 Documentation](https://v0.app/docs) — learn about v0 and how to use it

## License

MIT
