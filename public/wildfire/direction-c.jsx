/* Direction C — "Briefing Cards"
   Warm, light, editorial. Fires of Note as rich cards (live cam + ground-
   truth snippet + briefer teaser). Lower: Fire Centres grid + a prominent
   Local Feed rail (news / social / cams) — the mood-on-the-ground view. */

function DirC({ onOpen } = {}) {
  const W = window.WF;
  const open = (id) => onOpen && onOpen(id);
  const mapUrl = (id) => (window.WFD ? window.WFD.bcwsMapUrl(id) : '#');
  const t = { ink: '#2a241e', mid: '#6f655a', dim: '#9a9084', line: '#e6ddd0',
    bg: '#f3eee5', card: '#fffdf9', soft: '#faf6ee' };
  const mono = "'IBM Plex Mono', monospace";

  const feedFor = (id) => W.FEED.find((x) => x.fire === id);

  return (
    <div style={{ width: '100%', minHeight: '100%', background: t.bg, color: t.ink,
      fontFamily: "'Public Sans', sans-serif" }}>

      {/* top bar */}
      <header style={{ height: 60, display: 'flex', alignItems: 'center', gap: 18, padding: '0 26px',
        background: t.card, borderBottom: `1px solid ${t.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlameMark size={26} />
          <div style={{ lineHeight: 1 }}>
            <div style={{ font: "800 16px/1 'Archivo'", letterSpacing: -0.3, color: t.ink }}>BC Wildfire</div>
            <div style={{ font: "600 9px/1 'IBM Plex Mono'", color: t.dim, letterSpacing: 2, marginTop: 3 }}>DEPLOYMENT BRIEF</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12, background: t.bg, borderRadius: 9, padding: 3, border: `1px solid ${t.line}` }}>
          <span style={{ font: "700 12px 'Archivo'", color: '#fff', background: '#ef5a32', padding: '6px 14px', borderRadius: 6 }}>British Columbia</span>
          <span style={{ font: "600 12px 'Archivo'", color: t.mid, padding: '6px 12px' }}>Canada</span>
          <span style={{ font: "600 12px 'Archivo'", color: t.mid, padding: '6px 12px' }}>Global</span>
        </div>
        <div style={{ flex: 1 }} />
        {/* inline province stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          {[['+' + W.PROVINCE.newStarts24h, 'new · 24h', '#d2691e'], [W.PROVINCE.active, 'active', t.ink], [W.PROVINCE.fireOfNote, 'of note', '#ef5a32'], [fmt(W.PROVINCE.hectares), 'hectares', t.ink]].map(([v, l, c]) => (
            <div key={l} style={{ textAlign: 'right' }}>
              <div style={{ font: `600 18px/1 ${mono}`, color: c }}>{v}</div>
              <div style={{ font: "600 9px 'Archivo'", letterSpacing: 0.5, textTransform: 'uppercase', color: t.dim, marginTop: 4 }}>{l}</div>
            </div>
          ))}
          <div style={{ width: 1, height: 30, background: t.line }} />
          <div style={{ font: "700 11px 'Archivo'", color: '#d2691e', textAlign: 'right' }}>PREP {W.PROVINCE.prepLevel}<div style={{ font: `500 9px ${mono}`, color: t.dim, marginTop: 4, fontWeight: 400 }}>14:20</div></div>
        </div>
      </header>

      <div style={{ padding: '22px 26px 30px' }}>
        {/* section title */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
          <h2 style={{ font: "800 22px/1 'Archivo'", letterSpacing: -0.4, margin: 0 }}>Fires of Note</h2>
          <span style={{ font: "500 13px 'Public Sans'", color: t.mid }}>Life or property at risk — what's actually happening on the ground.</span>
        </div>

        {/* FoN rich cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
          {W.FIRES.filter((f) => f.fon).map((f) => {
            const fd = feedFor(f.id);
            return (
              <div key={f.id} onClick={() => open(f.id)} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 2px rgba(40,30,20,.04),0 8px 24px rgba(40,30,20,.05)', cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 4px rgba(40,30,20,.06),0 14px 38px rgba(40,30,20,.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(40,30,20,.04),0 8px 24px rgba(40,30,20,.05)'; e.currentTarget.style.transform = 'none'; }}>
                <div style={{ padding: 10, position: 'relative' }}>
                  <Placeholder kind="cam" label={`${f.near} \u00b7 live`} h={132} />
                  <a href={mapUrl(f.id)} target="_blank" rel="noopener" onClick={(e) => e.stopPropagation()}
                    style={{ position: 'absolute', top: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(12,10,8,.72)', color: '#fff', font: "700 10px 'Archivo'", padding: '5px 9px', borderRadius: 7, textDecoration: 'none', backdropFilter: 'blur(4px)' }}>
                    <Icon name="pin" size={12} /> BCWS map ↗</a>
                </div>
                <div style={{ padding: '4px 16px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ font: "800 19px/1 'Archivo'", color: t.ink }}>{f.name}</div>
                      <div style={{ font: `500 11px ${mono}`, color: t.dim, marginTop: 5 }}>{f.id} · {W.centre(f.centre).name} Fire Centre</div>
                    </div>
                    <StatusPill k={f.status} dark={false} />
                  </div>
                  {/* key facts */}
                  <div style={{ display: 'flex', gap: 16, padding: '11px 0', borderTop: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, margin: '4px 0 0' }}>
                    {[[fmt(f.ha), 'hectares', t.ink], [f.evac.order, 'on order', f.evac.order ? '#e0412f' : t.ink], [f.evac.alert, 'on alert', '#d2691e']].map(([v, l, c]) => (
                      <div key={l}><div style={{ font: `600 17px/1 ${mono}`, color: c }}>{v}</div><div style={{ font: "600 9px 'Archivo'", letterSpacing: 0.4, textTransform: 'uppercase', color: t.dim, marginTop: 5 }}>{l}</div></div>
                    ))}
                  </div>
                  {/* access */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, font: "600 12px 'Public Sans'", color: t.ink }}>
                    <Icon name="road" size={15} style={{ color: '#d2691e' }} /> {f.drive}
                  </div>
                  {/* ground-truth snippet */}
                  {fd && (
                    <div style={{ display: 'flex', gap: 9, marginTop: 11, padding: 10, background: t.soft, borderRadius: 9, border: `1px solid ${t.line}` }}>
                      <SourceIcon type={fd.type} size={26} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: "700 10px 'Archivo'", color: t.mid }}>{W.SOURCE[fd.type].label} · {fd.src} <span style={{ color: t.dim, fontWeight: 500 }}>· {ago(fd.mins)}</span></div>
                        <div style={{ font: "500 12px/1.4 'Public Sans'", color: t.ink, marginTop: 4, textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{fd.title}</div>
                      </div>
                    </div>
                  )}
                  {/* communities + briefer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
                    {f.communities.map((c) => (
                      <span key={c} style={{ font: "600 11px 'Archivo'", color: t.mid, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 999, padding: '4px 10px' }}>{c}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* lower split: centres + local feed */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 18, marginTop: 26 }}>
          {/* fire centres */}
          <div>
            <h3 style={{ font: "800 17px/1 'Archivo'", letterSpacing: -0.2, margin: '0 0 13px' }}>Across the Fire Centres</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
              {W.CENTRES.map((c) => {
                const fires = W.byCentre(c.id);
                return (
                  <div key={c.id} style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px', background: t.soft, borderBottom: `1px solid ${t.line}` }}>
                      <span style={{ font: `700 11px ${mono}`, color: '#d2691e', background: 'rgba(210,105,30,.1)', borderRadius: 5, padding: '3px 6px' }}>{c.prefix}</span>
                      <span style={{ font: "700 14px 'Archivo'", color: t.ink }}>{c.name}</span>
                      {c.newStarts > 0 && <span style={{ font: "700 10px 'Archivo'", color: '#d2691e', background: 'rgba(210,105,30,.12)', borderRadius: 999, padding: '2px 8px' }}>+{c.newStarts} new</span>}
                      <span style={{ flex: 1 }} />
                      <span style={{ font: "500 11px 'Public Sans'", color: t.dim }}>{fires.length} active</span>
                    </div>
                    <div>
                      {fires.slice(0, 3).map((f) => (
                        <div key={f.id} onClick={() => open(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderTop: `1px solid ${t.line}`, cursor: 'pointer' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = t.soft)} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                          <StatusDot k={f.status} size={9} />
                          <span style={{ font: "600 13px 'Archivo'", color: t.ink }}>{f.name}</span>
                          {f.fon && <Icon name="flame" size={13} style={{ color: '#ef5a32' }} />}
                          {f.new && <NewBadge />}
                          <span style={{ flex: 1 }} />
                          <span style={{ font: `600 12px ${mono}`, color: t.mid }}>{fmt(f.ha)} ha</span>
                        </div>
                      ))}
                      {fires.length > 3 && <div style={{ padding: '7px 14px', borderTop: `1px solid ${t.line}`, font: "600 11px 'Archivo'", color: t.dim }}>+{fires.length - 3} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* local feed rail */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
              <h3 style={{ font: "800 17px/1 'Archivo'", letterSpacing: -0.2, margin: 0 }}>Local Feed</h3>
              <span style={{ font: "700 9px 'IBM Plex Mono'", color: '#3fb27f', background: 'rgba(63,178,127,.12)', borderRadius: 999, padding: '3px 8px', letterSpacing: 0.5 }}>LIVE</span>
            </div>
            <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, overflow: 'hidden' }}>
              {W.FEED.slice(0, 7).map((x, i) => (
                <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 14px', borderTop: i ? `1px solid ${t.line}` : 'none', cursor: 'pointer' }}>
                  <SourceIcon type={x.type} size={30} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: "700 10px 'Archivo'", color: t.mid }}>
                      {W.SOURCE[x.type].label}<span style={{ color: t.dim, fontWeight: 500 }}>· {x.src} · {ago(x.mins)}</span>
                    </div>
                    <div style={{ font: "500 12px/1.4 'Public Sans'", color: t.ink, marginTop: 3, textWrap: 'pretty' }}>{x.title}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '10px 14px', borderTop: `1px solid ${t.line}`, font: "700 12px 'Archivo'", color: '#d2691e', textAlign: 'center', cursor: 'pointer' }}>
                Open full feed · filter by fire
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.DirC = DirC;
