/* Fire Briefing — full deployment screen (light, matches Direction C).
   FireBriefing({ fireId, onBack }). Lead: Map & Roads → Images/Cams →
   News & Social → Alerts → Deployment Briefer → Response. */

// ── Leaflet map component ──
function FireMap({ d, f, statusColor }) {
  const ref = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    if (!ref.current || !d || !d.lat || mapRef.current) return;
    const L = window.L;
    if (!L) return;

    const map = L.map(ref.current, {
      center: [d.lat, d.lng],
      zoom: 10, zoomControl: false, attributionControl: false,
      scrollWheelZoom: false,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Fire marker with glow
    const sc = statusColor;
    const fireIcon = L.divIcon({
      className: '', iconSize: [28, 28], iconAnchor: [14, 14],
      html: '<div style="width:28px;height:28px;border-radius:50%;background:' + sc + ';border:3px solid #fff;box-shadow:0 0 20px ' + sc + ',0 0 40px ' + sc + '44;"></div>',
    });
    L.marker([d.lat, d.lng], { icon: fireIcon }).addTo(map)
      .bindTooltip(f.name, { permanent: true, direction: 'bottom', offset: [0, 10],
        className: 'fire-tooltip' });

    // Base marker
    if (d.base) {
      const baseIcon = L.divIcon({
        className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#5b8def;border:2px solid #fff;box-shadow:0 0 8px #5b8def88;"></div>',
      });
      L.marker([d.base.lat, d.base.lng], { icon: baseIcon }).addTo(map)
        .bindTooltip(d.base.name, { permanent: true, direction: 'bottom', offset: [0, 6],
          className: 'base-tooltip' });

      // Dashed route line
      L.polyline([[d.base.lat, d.base.lng], [d.lat, d.lng]], {
        color: '#ffb24a', weight: 2.5, dashArray: '8 6', opacity: 0.8,
      }).addTo(map);
    }

    // Community markers
    if (d.communities) {
      d.communities.forEach(function(c) {
        const cIcon = L.divIcon({
          className: '', iconSize: [10, 10], iconAnchor: [5, 5],
          html: '<div style="width:10px;height:10px;border-radius:50%;background:#e8902f;border:2px solid #fff;box-shadow:0 0 6px #e8902f66;"></div>',
        });
        L.marker([c.lat, c.lng], { icon: cIcon }).addTo(map)
          .bindTooltip(c.name, { direction: 'top', offset: [0, -6], className: 'comm-tooltip' });
      });
    }

    // Fit bounds to show everything
    const pts = [[d.lat, d.lng]];
    if (d.base) pts.push([d.base.lat, d.base.lng]);
    if (d.communities) d.communities.forEach(function(c) { pts.push([c.lat, c.lng]); });
    if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 11 });

    mapRef.current = map;
    return function() { try { map.remove(); } catch(e) {} mapRef.current = null; };
  }, [d, f]);

  return React.createElement('div', {
    ref: ref,
    style: { height: 360, borderRadius: '14px 14px 0 0', overflow: 'hidden' },
  });
}

function FireBriefing({ fireId, onBack }) {
  const W = window.WF, WFD = window.WFD;
  const f = W.finder(fireId);
  const dRaw = WFD.detailFor(fireId);
  // Build a minimal detail object from BCWS data when no hand-curated detail exists
  const d = dRaw || (f && f.lat ? {
    lat: f.lat, lng: f.lng, summary: null, lastUpdate: W._liveUpdatedAt,
    ic: null, roads: [], drive: null, cams: [], gallery: [], alerts: [], feed: [],
    response: null, briefer: null,
  } : null);
  const t = { ink: '#2a241e', mid: '#6f655a', dim: '#9a9084', line: '#e6ddd0',
    bg: '#f3eee5', card: '#fffdf9', soft: '#faf6ee', warm: '#fff7ef', warmLine: '#f0d9c4' };
  const mono = "'IBM Plex Mono', monospace";
  const roadColor = { closed: '#e0412f', alternating: '#e8902f', open: '#3fb27f' };
  const roadLabel = { closed: 'CLOSED', alternating: 'ALT.', open: 'OPEN' };

  if (!f) return null;

  // ── small building blocks ──
  const Card = ({ icon, title, accent, right, children, pad = 18 }) => (
    <section style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderBottom: `1px solid ${t.line}`, background: t.soft }}>
        <Icon name={icon} size={16} style={{ color: accent || '#d2691e' }} />
        <h3 style={{ font: "800 14px/1 'Archivo'", letterSpacing: 0.2, color: t.ink, margin: 0, textTransform: 'uppercase' }}>{title}</h3>
        <span style={{ flex: 1 }} />
        {right}
      </header>
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );

  const Stat = ({ v, l, c }) => (
    <div><div style={{ font: `600 24px/1 ${mono}`, color: c || t.ink }}>{v}</div>
      <div style={{ font: "600 9px 'Archivo'", letterSpacing: 0.5, textTransform: 'uppercase', color: t.dim, marginTop: 6 }}>{l}</div></div>
  );

  const mapUrl = WFD.bcwsMapUrl(f.id);
  const MapBtn = ({ small }) => (
    <a href={mapUrl} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      background: small ? 'rgba(12,10,8,.72)' : t.ink, color: '#fff', font: `700 ${small ? 10 : 12}px 'Archivo'`,
      padding: small ? '5px 9px' : '8px 13px', borderRadius: 8, textDecoration: 'none' }}>
      <Icon name="pin" size={small ? 12 : 14} /> BC Wildfire map <span style={{ opacity: .7 }}>↗</span></a>
  );

  return (
    <div style={{ minHeight: '100%', background: t.bg, color: t.ink, fontFamily: "'Public Sans', sans-serif" }}>

      {/* sticky top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, height: 58, display: 'flex', alignItems: 'center', gap: 14,
        padding: '0 24px', background: 'rgba(255,253,249,.92)', backdropFilter: 'blur(8px)', borderBottom: `1px solid ${t.line}` }}>
        <button onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${t.line}`,
          background: t.card, color: t.ink, font: "700 12px 'Archivo'", padding: '8px 13px', borderRadius: 9, cursor: 'pointer' }}>
          <Icon name="arrow" size={15} style={{ transform: 'rotate(180deg)' }} /> BC Overview</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <FlameMark size={22} />
          <span style={{ font: "800 15px/1 'Archivo'", color: t.ink }}>{f.name}</span>
          <span style={{ font: `500 11px ${mono}`, color: t.dim }}>{f.id}</span>
          {f.fon && <FoNChip small />}
        </div>
        <span style={{ flex: 1 }} />
        <span style={{ font: `500 11px ${mono}`, color: t.dim }}>Updated {d ? new Date(d.lastUpdate).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' }) : '14:20'}</span>
        <MapBtn />
      </header>

      {/* hero */}
      <div style={{ padding: '22px 24px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={{ font: "800 32px/1 'Archivo'", letterSpacing: -0.8, margin: 0 }}>{f.name}</h1>
              <StatusPill k={f.status} dark={false} />
            </div>
            <div style={{ font: "500 13px 'Public Sans'", color: t.mid, marginTop: 8 }}>
              {f.id}{f.near ? ` · near ${f.near}` : ''} · {W.centre(f.centre) ? W.centre(f.centre).name : ''} Fire Centre · {f.cause}{f.disc ? ` · discovered ${new Date(f.disc).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}` : ''}
            </div>
            {d && d.summary && <p style={{ font: "500 14px/1.55 'Public Sans'", color: t.ink, marginTop: 12, maxWidth: 620, textWrap: 'pretty' }}>{d.summary}</p>}
            {d && d.ic && <div style={{ font: "600 12px 'Archivo'", color: t.mid, marginTop: 8 }}>{d.ic}</div>}
          </div>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 26, padding: '14px 22px', background: t.card, border: `1px solid ${t.line}`, borderRadius: 14 }}>
            <Stat v={fmt(f.ha)} l="Hectares" />
            {f.evac && <Stat v={f.evac.order} l="On Order" c={f.evac.order ? '#e0412f' : t.ink} />}
            {f.evac && <Stat v={f.evac.alert} l="On Alert" c="#d2691e" />}
            {d && d.response && <Stat v={d.response.personnel} l="Personnel" />}
            {!f.evac && <Stat v={f.cause || '—'} l="Cause" />}
          </div>
        </div>
      </div>

      {/* two-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 408px', gap: 18, padding: '14px 24px 30px', alignItems: 'start' }}>

        {/* ── MAIN COLUMN ── */}
        <div>
          {/* Map & Roads */}
          <Card icon="road" title="Map & Roads" right={<MapBtn small />} pad={0}>
            <div style={{ position: 'relative' }}>
              <FireMap d={d} f={f} statusColor={statusColor(f.status)} />
              {/* drive chip overlay */}
              {d && d.drive && <div style={{ position: 'absolute', left: 14, top: 14, zIndex: 800, background: 'rgba(255,253,249,.92)', border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, padding: '10px 13px', backdropFilter: 'blur(6px)', boxShadow: '0 2px 8px rgba(0,0,0,.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: "700 13px 'Archivo'", color: '#2a241e' }}><Icon name="road" size={15} style={{ color: '#d2691e' }} /> {d.drive.time} from {d.drive.from}</div>
                <div style={{ font: `500 11px ${mono}`, color: '#6f655a', marginTop: 5 }}>via {d.drive.via}</div>
              </div>}
            </div>
            {/* roads list */}
            <div style={{ padding: 6 }}>
              {(d ? d.roads : []).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderTop: i ? `1px solid ${t.line}` : 'none' }}>
                  <span style={{ font: "700 10px 'Archivo'", color: roadColor[r.status], background: roadColor[r.status] + '1e', border: `1px solid ${roadColor[r.status]}55`, borderRadius: 6, padding: '4px 8px', minWidth: 64, textAlign: 'center' }}>{roadLabel[r.status]}</span>
                  <span style={{ font: "700 13px 'Archivo'", color: t.ink, minWidth: 200 }}>{r.road}</span>
                  <span style={{ font: "500 12px 'Public Sans'", color: t.mid }}>{r.note}</span>
                </div>
              ))}
              {d && d.drive && d.drive.note && <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', margin: 4, borderRadius: 9, background: t.warm, border: `1px solid ${t.warmLine}`, font: "600 12px 'Public Sans'", color: '#8a5a2a' }}>
                <Icon name="alert" size={14} /> {d.drive.note}</div>}
            </div>
          </Card>

          {/* Images & Cams */}
          <Card icon="cam" title="Images & Live Cams" accent="#3fb27f">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
              {d && d.cams.map((c, i) => <Placeholder key={'c' + i} kind="cam" label={c.label} h={130} />)}
              {d && d.gallery.map((g, i) => (
                <div key={'g' + i} style={{ position: 'relative' }}>
                  <Placeholder kind="photo" label={g.label} h={130} />
                  <span style={{ position: 'absolute', left: 8, bottom: 8, font: "600 9px 'IBM Plex Mono'", color: 'rgba(255,255,255,.75)', background: 'rgba(0,0,0,.4)', padding: '2px 6px', borderRadius: 5 }}>{g.credit}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* News & Social */}
          <Card icon="chat" title="Live News & Social" accent="#5b8def"
            right={<span style={{ font: "700 9px 'IBM Plex Mono'", color: '#3fb27f', background: 'rgba(63,178,127,.12)', borderRadius: 999, padding: '3px 8px', letterSpacing: .5 }}>LIVE · {f.near}</span>} pad={0}>
            {/* source filter chips */}
            <div style={{ display: 'flex', gap: 7, padding: '12px 16px', flexWrap: 'wrap', borderBottom: `1px solid ${t.line}` }}>
              {['All', 'Local News', 'Facebook', 'X', 'YouTube', 'Live Cam', 'Reddit', 'Instagram'].map((s, i) => (
                <span key={s} style={{ font: "600 11px 'Archivo'", padding: '5px 11px', borderRadius: 999, cursor: 'pointer',
                  color: i === 0 ? '#fff' : t.mid, background: i === 0 ? t.ink : t.bg, border: `1px solid ${i === 0 ? t.ink : t.line}` }}>{s}</span>
              ))}
            </div>
            <div>
              {(d ? d.feed : []).map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '13px 16px', borderTop: i ? `1px solid ${t.line}` : 'none', cursor: 'pointer' }}>
                  <SourceIcon type={x.type} size={32} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "700 10px 'Archivo'", color: t.mid }}>{W.SOURCE[x.type].label} · {x.src} <span style={{ color: t.dim, fontWeight: 500 }}>· {ago(x.mins)} ago</span></div>
                    <div style={{ font: "500 13px/1.45 'Public Sans'", color: t.ink, marginTop: 4, textWrap: 'pretty' }}>{x.title}</div>
                  </div>
                  {x.type === 'youtube' && <Icon name="play" size={18} style={{ color: '#e0412f', alignSelf: 'center', flex: '0 0 auto' }} />}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ── SIDEBAR ── */}
        <div>
          {/* Alerts */}
          <Card icon="alert" title="Alerts & Evacuation" accent="#e0412f">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(f.alerts && f.alerts.length > 0 ? f.alerts : d ? d.alerts : []).map((a, i) => {
                const c = a.level === 'order' ? '#e0412f' : a.level === 'alert' ? '#e8902f' : '#6f655a';
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${c}`, background: c + '12', borderRadius: '4px 9px 9px 4px', padding: '10px 12px' }}>
                    <div style={{ font: "800 11px 'Archivo'", letterSpacing: .6, textTransform: 'uppercase', color: c }}>
                      {a.level === 'order' ? 'Evacuation Order' : a.level === 'alert' ? 'Evacuation Alert' : 'Notice'}</div>
                    <div style={{ font: "600 13px 'Public Sans'", color: t.ink, marginTop: 4 }}>{a.area}{a.homes ? ` (${a.homes} properties)` : ''}</div>
                    <div style={{ font: `500 10px ${mono}`, color: t.dim, marginTop: 5 }}>{a.issued ? new Date(a.issued).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}{a.by ? ` · ${a.by}` : ''}</div>
                  </div>
                );
              })}
            </div>
            <a href="https://www.emergencyinfobc.gov.bc.ca" target="_blank" rel="noopener" style={{ display: 'block', textAlign: 'center', marginTop: 12, font: "700 12px 'Archivo'", color: '#d2691e', textDecoration: 'none' }}>Confirm at EmergencyInfoBC ↗</a>
          </Card>

          {/* Deployment Briefer */}
          {d && d.briefer && <BrieferCard d={d.briefer} t={t} mono={mono} Card={Card} />}

          {/* Response */}
          {d && d.response && <Card icon="crew" title="Response" accent="#6f655a">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, textAlign: 'center' }}>
              {[[d.response.crews, 'Crews'], [d.response.machines, 'Machines'], [d.response.helis, 'Helis'], [d.response.tankers, 'Tankers']].map(([v, l]) => (
                <div key={l} style={{ background: t.soft, border: `1px solid ${t.line}`, borderRadius: 9, padding: '11px 4px' }}>
                  <div style={{ font: `600 19px/1 ${mono}`, color: t.ink }}>{v}</div>
                  <div style={{ font: "600 9px 'Archivo'", letterSpacing: .4, textTransform: 'uppercase', color: t.dim, marginTop: 5 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginTop: 12, padding: '11px 12px', background: t.warm, border: `1px solid ${t.warmLine}`, borderRadius: 9 }}>
              <Icon name="flame" size={15} style={{ color: '#ef5a32', flex: '0 0 auto', marginTop: 1 }} />
              <span style={{ font: "600 12px/1.4 'Public Sans'", color: '#8a5a2a' }}>{d.response.struct}</span>
            </div>
          </Card>}
        </div>
      </div>

      <div style={{ font: "500 11px 'Public Sans'", color: t.dim, textAlign: 'center', padding: '0 24px 26px' }}>
        Pointer, not a source of record · Placeholder data · For evacuation orders confirm with EmergencyInfoBC
      </div>
    </div>
  );
}

window.FireBriefing = FireBriefing;
