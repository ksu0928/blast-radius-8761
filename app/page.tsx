'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Severity = 'critical' | 'high' | 'medium' | 'low'

type GraphNode = {
  id: string
  label: string
  kind: 'package' | 'service' | 'source'
  severity: Severity
  x: number
  y: number
  detail: string
}

type TraceResult = {
  packageName: string
  version: string
  packagesAffected: number
  servicesExposed: number
  multiplier: string
  maintainerRisk: number
  updated: string
  path: string[]
  nodes: GraphNode[]
  edges: [string, string][]
}

type FlaggedItem = {
  packageName: string
  reason: string
  severity: Severity
  timestamp: string
}

const eventStream: TraceResult = {
  packageName: 'event-stream',
  version: '3.3.6',
  packagesAffected: 21,
  servicesExposed: 7,
  multiplier: '2.73x',
  maintainerRisk: 85,
  updated: 'just now',
  path: ['event-stream', 'flatmap-stream', 'ledger-core', 'payments-api'],
  nodes: [
    { id: 'event-stream', label: 'event-stream', kind: 'source', severity: 'critical', x: 16, y: 48, detail: '3.3.6 · direct dependency' },
    { id: 'flatmap-stream', label: 'flatmap-stream', kind: 'package', severity: 'critical', x: 36, y: 28, detail: '0.1.1 · malicious payload' },
    { id: 'lodash', label: 'lodash', kind: 'package', severity: 'low', x: 36, y: 72, detail: '4.17.21 · transitive' },
    { id: 'ledger-core', label: 'ledger-core', kind: 'package', severity: 'high', x: 56, y: 28, detail: '2.4.0 · payment surface' },
    { id: 'ui-kit', label: 'ui-kit', kind: 'package', severity: 'medium', x: 56, y: 74, detail: '8.12.2 · shared package' },
    { id: 'payments-api', label: 'payments-api', kind: 'service', severity: 'critical', x: 78, y: 26, detail: 'production · exposed' },
    { id: 'checkout-web', label: 'checkout-web', kind: 'service', severity: 'high', x: 78, y: 52, detail: 'production · exposed' },
    { id: 'internal-tools', label: 'internal-tools', kind: 'service', severity: 'low', x: 78, y: 78, detail: 'staging · monitored' },
  ],
  edges: [
    ['event-stream', 'flatmap-stream'], ['event-stream', 'lodash'], ['flatmap-stream', 'ledger-core'], ['lodash', 'ui-kit'],
    ['ledger-core', 'payments-api'], ['ledger-core', 'checkout-web'], ['ui-kit', 'checkout-web'], ['ui-kit', 'internal-tools'],
  ],
}

const fallback = (packageName: string): TraceResult => ({
  ...eventStream,
  packageName: packageName.split('@')[0] || 'unknown-package',
  version: packageName.includes('@') ? packageName.split('@').pop() || 'latest' : 'latest',
  packagesAffected: 0,
  servicesExposed: 0,
  multiplier: '0.00x',
  maintainerRisk: 12,
  updated: 'no trace found',
  path: [packageName.split('@')[0] || 'unknown-package', 'no known dependents'],
  nodes: [{ id: 'unknown', label: packageName.split('@')[0] || 'unknown-package', kind: 'source', severity: 'low', x: 50, y: 50, detail: 'No downstream data available' }],
  edges: [],
})

const severityColor: Record<Severity, string> = {
  critical: '#ff4d5f',
  high: '#ff9d42',
  medium: '#f6cf59',
  low: '#58d6b4',
}

function Graph({ result, onFlag }: { result: TraceResult; onFlag: () => void }) {
  const byId = useMemo(() => Object.fromEntries(result.nodes.map((node) => [node.id, node])), [result.nodes])
  return (
    <div className="graph-wrap">
      <div className="graph-head"><div><span className="eyebrow">DEPENDENCY TOPOLOGY</span><h2>Impact surface</h2></div><button className="ghost-button" onClick={onFlag}>Flag selected package</button></div>
      <svg className="dependency-graph" viewBox="0 0 100 100" role="img" aria-label={`Dependency graph for ${result.packageName}`} preserveAspectRatio="none">
        <defs><filter id="node-glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        {result.edges.map(([from, to]) => { const a = byId[from]; const b = byId[to]; return a && b ? <line key={`${from}-${to}`} x1={`${a.x}%`} y1={`${a.y}%`} x2={`${b.x}%`} y2={`${b.y}%`} className="graph-edge" /> : null })}
        {result.nodes.map((node) => <g key={node.id} className="graph-node" tabIndex={0}><circle cx={`${node.x}%`} cy={`${node.y}%`} r={node.kind === 'source' ? 3.2 : 2.3} fill={severityColor[node.severity]} filter="url(#node-glow)"/><circle cx={`${node.x}%`} cy={`${node.y}%`} r={node.kind === 'source' ? 5.4 : 4.2} fill="none" stroke={severityColor[node.severity]} strokeOpacity=".28" strokeDasharray="1 2"/><text x={`${node.x}%`} y={`${node.y + 8}%`} textAnchor="middle" className="node-label">{node.label}</text><text x={`${node.x}%`} y={`${node.y + 12}%`} textAnchor="middle" className="node-detail">{node.detail}</text></g>)}
      </svg>
      <div className="legend">{(['critical', 'high', 'medium', 'low'] as Severity[]).map((item) => <span key={item}><i style={{ backgroundColor: severityColor[item] }} />{item}</span>)}</div>
    </div>
  )
}

export default function Page() {
  const [dashboard, setDashboard] = useState(false)
  const [query, setQuery] = useState('event-stream@3.3.6')
  const [result, setResult] = useState(eventStream)
  const [flags, setFlags] = useState<FlaggedItem[]>([])

  useEffect(() => {
    const modelContext = (document as Document & { modelContext?: { registerTool?: (tool: unknown) => unknown } }).modelContext
    if (modelContext?.registerTool) {
      try {
        const register = (tool: unknown) => { try { return Promise.resolve(modelContext.registerTool?.(tool)).catch(() => undefined) } catch { return Promise.resolve(undefined) } }
        void register({ name: 'trace_blast_radius', description: 'Trace npm dependency blast radius', inputSchema: { type: 'object', properties: { packageName: { type: 'string' } }, required: ['packageName'] }, execute: ({ packageName }: { packageName: string }) => { const next = packageName.toLowerCase().includes('event-stream') ? eventStream : fallback(packageName); window.dispatchEvent(new CustomEvent('blastradius:render', { detail: next })); return `Trace complete: ${next.packagesAffected} packages affected and ${next.servicesExposed} services exposed.` } })
        void register({ name: 'flag_dependency_for_review', description: 'Flag a dependency for review', inputSchema: { type: 'object', properties: { packageName: { type: 'string' }, reason: { type: 'string' }, severity: { type: 'string' } }, required: ['packageName', 'reason', 'severity'] }, execute: (payload: { packageName: string; reason: string; severity: string }) => { window.dispatchEvent(new CustomEvent('blastradius:flag', { detail: payload })); return `Flagged ${payload.packageName} for review.` } })
      } catch { /* Unsupported or policy-blocked WebMCP is non-fatal. */ }
    }
    const handleRender = (event: Event) => { const detail = (event as CustomEvent<TraceResult>).detail; setResult(detail); setQuery(`${detail.packageName}@${detail.version}`); setDashboard(true) }
    const handleFlag = (event: Event) => { const detail = (event as CustomEvent<{ packageName: string; reason: string; severity: string }>).detail; setFlags((current) => [{ packageName: detail.packageName, reason: detail.reason, severity: (detail.severity.toLowerCase() as Severity) || 'medium', timestamp: 'just now' }, ...current]) }
    window.addEventListener('blastradius:render', handleRender); window.addEventListener('blastradius:flag', handleFlag)
    return () => { window.removeEventListener('blastradius:render', handleRender); window.removeEventListener('blastradius:flag', handleFlag) }
  }, [])

  const trace = (event: FormEvent) => { event.preventDefault(); const next = query.toLowerCase().includes('event-stream') ? eventStream : fallback(query); setResult(next); setDashboard(true) }
  const flagCurrent = () => window.dispatchEvent(new CustomEvent('blastradius:flag', { detail: { packageName: result.packageName, reason: 'Manual analyst review requested', severity: 'high' } }))

  if (!dashboard) return <main className="shell landing"><div className="scanline" /><header className="topbar"><div className="brand"><span className="brand-mark">/</span> BLAST<span>RADIUS</span></div><span className="status"><i /> SYSTEM ONLINE</span></header><section className="hero"><div className="hero-kicker">NPM SUPPLY-CHAIN INTELLIGENCE <span>v1.0.4</span></div><h1>See the full<br /><em>blast radius.</em></h1><p>Trace how a single compromised dependency can move through your packages, services, and production surface.</p><form className="launch-form" onSubmit={trace}><div className="input-shell"><span>›_</span><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Package name" /><button type="submit">Launch Dashboard <b>→</b></button></div></form><div className="hero-note"><span>●</span> Built for the moments between <strong>npm install</strong> and incident response.</div></section><footer className="landing-footer"><span>BLASTRADIUS / DEPENDENCY RISK ENGINE</span><span>WEBMCP READY <i /></span></footer></main>

  return <main className="shell dashboard"><div className="scanline" /><header className="topbar"><button className="brand brand-button" onClick={() => setDashboard(false)}><span className="brand-mark">/</span> BLAST<span>RADIUS</span></button><div className="dash-meta"><span className="live-dot" /> TRACE SESSION <strong>BR-0842</strong><button className="icon-button" aria-label="Return to landing" onClick={() => setDashboard(false)}>×</button></div></header><section className="dash-content"><div className="dash-intro"><div><span className="eyebrow">TRACE / DEPENDENCY GRAPH</span><h1>{result.packageName}<small>@{result.version}</small></h1></div><form className="search-form" onSubmit={trace}><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search package" /><button type="submit">TRACE <b>↗</b></button></form></div><div className="stats">{[['PACKAGES AFFECTED', result.packagesAffected, 'downstream dependencies'], ['SERVICES EXPOSED', result.servicesExposed, 'production surfaces'], ['PERSISTENCE MULTIPLIER', result.multiplier, 'propagation coefficient'], ['MAINTAINER RISK', `${result.maintainerRisk}/100`, 'trust signal']].map(([label, value, note]) => <div className="stat" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="crumb-row"><span className="eyebrow">ATTACK CHAIN</span><div className="crumbs">{result.path.map((item, index) => <span key={`${item}-${index}`} className={index === 0 ? 'hot' : ''}>{item}{index < result.path.length - 1 && <b>→</b>}</span>)}</div><span className="updated">● {result.updated}</span></div><Graph result={result} onFlag={flagCurrent} /></section><aside className="review-panel"><div className="panel-title"><span><i /> FLAGGED FOR REVIEW</span><b>{flags.length.toString().padStart(2, '0')}</b></div>{flags.length === 0 ? <div className="empty-state">No dependencies flagged.<br /><span>WebMCP review events will appear here.</span></div> : <div className="flag-list">{flags.map((flag, index) => <div className="flag-card" key={`${flag.packageName}-${index}`}><div><strong>{flag.packageName}</strong><span className={`severity ${flag.severity}`}>{flag.severity}</span></div><p>{flag.reason}</p><small>{flag.timestamp} · analyst queue</small></div>)}</div>}</aside><footer className="dash-footer"><span>TRACE COMPLETE / {result.nodes.length} NODES RESOLVED</span><span>MODEL CONTEXT <i /></span></footer></main>
}
