/* Wildfire Tracker — shared visual system + atoms (Babel/JSX).
   Exports helper components + tokens to window. */

const WF = window.WF;

// ── tiny inline icon set (stroke, currentColor) ──────────────────────────
function Icon({ name, size = 16, sw = 1.6, style }) {
  const P = {
    flame: <path d="M12 2c1 3 4 4 4 8a4 4 0 1 1-8 0c0-1.5.5-2.5 1-3 .2 1 .8 1.6 1.5 1.8C10 7 11 4.5 12 2z" />,
    pin: <><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.4" /></>,
    road: <><path d="M5 21l3-16h8l3 16" /><path d="M12 7v2M12 12v2M12 17v2" /></>,
    water: <path d="M12 3s6 6.5 6 10.5A6 6 0 1 1 6 13.5C6 9.5 12 3 12 3z" />,
    play: <path d="M8 5l11 7-11 7V5z" />,
    cam: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></>,
    news: <><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
    chat: <path d="M4 5h16v10H9l-4 4V5z" />,
    alert: <><path d="M12 3l9 16H3l9-16z" /><path d="M12 10v4M12 17v.5" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    chevron: <path d="M9 6l6 6-6 6" />,
    layers: <path d="M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4" />,
    crew: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 6.5a3 3 0 0 1 0 5.5M21 20c0-2.5-1.4-4.6-3.5-5.5" /></>,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    search: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4-4" /></>,
    bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
    wind: <path d="M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h9a2.5 2.5 0 1 1-2.5 2.5" />,
    book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z" /><path d="M19 17H6a2 2 0 0 0-2 2" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {P[name] || P.flame}
    </svg>
  );
}

// ── flame logo mark ──────────────────────────────────────────────────────
function FlameMark({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M13 2c.5 3.5 3.8 4.8 3.8 8.6 0 1.3-.4 2.4-1.1 3.2.3-.8.3-1.9-.4-2.8-.7 2-2.6 2.6-2.6 4.6 0 .5.1 1 .4 1.4-1.8-.4-3.1-2-3.1-4C10 9.4 12.4 7.6 11.2 4 12 4.6 13 6 13 8c.9-1.2 1-3.4 0-6z"
        fill="#ef5a32" />
      <path d="M11.7 13.4c.7.9.7 2 .4 2.8-.6.7-1.5 1.1-2.5 1.1.3.4.7.6 1.2.7-1.8-.4-3.1-2-3.1-4 0-1.4.6-2.4 1.3-3.2-.1 1.1.4 2 1.4 2.6.5.3 1 .1 1.3-.0z"
        fill="#ffb24a" opacity="0.9" />
    </svg>
  );
}

// ── status helpers ───────────────────────────────────────────────────────
const statusColor = (k) => (WF.STATUS[k] || WF.STATUS.out).color;

function StatusDot({ k, size = 9, glow = false }) {
  const c = statusColor(k);
  return <span style={{ display: 'inline-block', width: size, height: size, borderRadius: size,
    background: c, flex: '0 0 auto', boxShadow: glow ? `0 0 0 3px ${c}22` : 'none' }} />;
}

function StatusPill({ k, mono = true, dark = true }) {
  const s = WF.STATUS[k] || WF.STATUS.out;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 7px',
      borderRadius: 5, background: dark ? s.color + '22' : s.color + '1e',
      border: `1px solid ${s.color}55`, color: s.color,
      font: `600 11px/1 ${mono ? "'IBM Plex Mono', monospace" : "'Archivo', sans-serif"}`,
      letterSpacing: 0.2, whiteSpace: 'nowrap' }}>
      <StatusDot k={k} size={7} />{s.label}
    </span>
  );
}

// "Fire of Note" signal chip
function FoNChip({ small = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 7px' : '3px 9px', borderRadius: 999,
      background: 'linear-gradient(180deg,#ef5a32,#d23d1f)', color: '#fff',
      font: `700 ${small ? 10 : 11}px/1 'Archivo', sans-serif`, letterSpacing: 0.3,
      textTransform: 'uppercase', whiteSpace: 'nowrap', flex: '0 0 auto',
      boxShadow: '0 1px 6px rgba(224,65,47,.45)' }}>
      <Icon name="flame" size={small ? 11 : 12} sw={2} /> Fire of Note
    </span>
  );
}

// source chip/icon for feed items
function SourceIcon({ type, size = 26 }) {
  const meta = WF.SOURCE[type] || WF.SOURCE.news;
  const ic = { news: 'news', x: 'chat', facebook: 'chat', youtube: 'play', reddit: 'chat', cam: 'cam', instagram: 'cam' }[type] || 'news';
  const glyph = { x: 'X', facebook: 'f', instagram: '\u25C9', reddit: 'r/' };
  return (
    <span style={{ width: size, height: size, borderRadius: 7, flex: '0 0 auto',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: meta.color + '24', color: meta.color,
      font: `700 ${size * 0.42}px 'Archivo', sans-serif` }}>
      {glyph[type] || <Icon name={ic} size={size * 0.56} sw={1.8} />}
    </span>
  );
}

// new-start badge
function NewBadge() {
  return <span style={{ font: "700 9px/1 'IBM Plex Mono', monospace", letterSpacing: 0.5,
    color: '#ffb24a', border: '1px solid #ffb24a66', borderRadius: 4, padding: '2px 4px',
    textTransform: 'uppercase' }}>New</span>;
}

const fmt = (n) => n.toLocaleString('en-CA');
const ago = (m) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`);

// faux map/cam placeholder tile (no external assets)
function Placeholder({ kind = 'cam', label, h = 120, dark = true }) {
  const grad = kind === 'cam'
    ? 'linear-gradient(160deg,#2a2622 0%,#3a2a1e 45%,#5a3320 100%)'
    : 'linear-gradient(160deg,#26221d,#322b22)';
  return (
    <div style={{ position: 'relative', height: h, borderRadius: 8, overflow: 'hidden',
      background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid rgba(255,255,255,.06)' }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5,
        backgroundImage: 'repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 28px)' }} />
      <div style={{ color: 'rgba(255,200,150,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Icon name={kind === 'cam' ? 'cam' : 'pin'} size={22} />
        <span style={{ font: "600 10px/1 'IBM Plex Mono', monospace", letterSpacing: 0.6, textTransform: 'uppercase', opacity: 0.9 }}>{label}</span>
      </div>
      {kind === 'cam' && <span style={{ position: 'absolute', top: 8, left: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
        font: "700 9px/1 'IBM Plex Mono', monospace", color: '#fff', background: '#e0412f', padding: '3px 6px', borderRadius: 4, letterSpacing: 0.5 }}>
        <span style={{ width: 5, height: 5, borderRadius: 5, background: '#fff' }} />LIVE</span>}
    </div>
  );
}

Object.assign(window, { Icon, FlameMark, StatusDot, StatusPill, FoNChip, SourceIcon, NewBadge, Placeholder, statusColor, fmt, ago });
