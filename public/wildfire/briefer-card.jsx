/* Deployment Briefer card — the local knowledge an SPS googles on the way in.
   BrieferCard({ d, t, mono, Card }) — d is detail.briefer. */

function BrieferCard({ d, t, mono, Card }) {
  const Sub = ({ children }) => (
    <div style={{ font: "700 10px 'Archivo'", letterSpacing: .8, textTransform: 'uppercase', color: '#d2691e', margin: '16px 0 9px' }}>{children}</div>
  );
  const waterColor = { 'Tender fill': '#5b8def', 'Draft': '#3fb27f', 'Hydrant': '#e8902f' };

  return (
    <Card icon="book" title="Deployment Briefer" accent="#3fb27f"
      right={<span style={{ font: "600 11px 'Public Sans'", color: t.mid }}>{d.community} · pop {d.population.toLocaleString('en-CA')}</span>}>

      <div style={{ font: "500 11px 'Public Sans'", color: t.dim }}>{d.region}</div>

      {/* Water for tender fills */}
      <Sub>Water — tender fills &amp; draft</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.water.map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', background: t.soft, border: `1px solid ${t.line}`, borderRadius: 9 }}>
            <Icon name="water" size={17} style={{ color: waterColor[w.type] || '#5b8def', flex: '0 0 auto', marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ font: "700 13px 'Archivo'", color: t.ink }}>{w.name}</span>
                <span style={{ font: "700 9px 'IBM Plex Mono'", color: waterColor[w.type] || '#5b8def', border: `1px solid ${(waterColor[w.type] || '#5b8def')}55`, borderRadius: 5, padding: '2px 5px' }}>{w.type}</span>
              </div>
              <div style={{ font: "500 11px 'Public Sans'", color: t.mid, marginTop: 3 }}>{w.note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Local First Nations */}
      <Sub>Local First Nations</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {d.firstNations.map((n, i) => (
          <div key={i} style={{ padding: '10px 12px', background: t.soft, border: `1px solid ${t.line}`, borderRadius: 9 }}>
            <div style={{ font: "700 13px 'Archivo'", color: t.ink }}>{n.name}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, font: `600 12px ${mono}`, color: '#3fb27f', background: 'rgba(63,178,127,.1)', border: '1px solid rgba(63,178,127,.3)', borderRadius: 6, padding: '3px 8px' }}>
              <Icon name="chat" size={12} /> say it · {n.say}</div>
            {n.note && <div style={{ font: "500 11px 'Public Sans'", color: t.mid, marginTop: 6 }}>{n.note}</div>}
            <div style={{ font: "600 12px 'Public Sans'", color: t.ink, marginTop: 6 }}>{n.contact}</div>
          </div>
        ))}
        <div style={{ font: "500 11px/1.4 'Public Sans'", color: t.dim }}>Confirm protocol and current contacts with the band office before deploying near reserve land.</div>
      </div>

      {/* Emergency contacts */}
      <Sub>Emergency contacts</Sub>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: t.line, border: `1px solid ${t.line}`, borderRadius: 9, overflow: 'hidden' }}>
        {[['RCMP', d.emergency.rcmp], ['Fire', d.emergency.fire], ['Hospital', d.emergency.hospital], ['EOC', d.emergency.eoc]].map(([l, v]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: t.card }}>
            <span style={{ font: "700 9px 'Archivo'", letterSpacing: .5, textTransform: 'uppercase', color: t.dim, width: 56, flex: '0 0 auto' }}>{l}</span>
            <span style={{ font: "600 12px 'Public Sans'", color: t.ink }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Employers + lodging in a row */}
      <Sub>On the ground</Sub>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 9 }}>
        <Icon name="crew" size={16} style={{ color: t.mid, flex: '0 0 auto', marginTop: 2 }} />
        <div><div style={{ font: "700 11px 'Archivo'", color: t.ink, marginBottom: 3 }}>Largest employers</div>
          <div style={{ font: "500 12px/1.5 'Public Sans'", color: t.mid }}>{d.employers.join(' · ')}</div></div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
        <Icon name="pin" size={16} style={{ color: t.mid, flex: '0 0 auto', marginTop: 2 }} />
        <div><div style={{ font: "700 11px 'Archivo'", color: t.ink, marginBottom: 3 }}>Lodging &amp; staging</div>
          <div style={{ font: "500 12px/1.5 'Public Sans'", color: t.mid }}>{d.lodging}</div></div>
      </div>

      {/* Google Earth pins */}
      <Sub>Google Earth pins</Sub>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {d.pins.map((p, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: "600 11px 'Archivo'", color: t.ink, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 999, padding: '5px 10px' }}>
            <Icon name="pin" size={12} style={{ color: '#e0412f' }} /> {p}</span>
        ))}
      </div>
      <a href="https://earth.google.com/web/" target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 11, font: "700 12px 'Archivo'", color: '#fff', background: t.ink, padding: '8px 13px', borderRadius: 8, textDecoration: 'none' }}>
        <Icon name="layers" size={14} /> Open pins in Google Earth ↗</a>
    </Card>
  );
}

window.BrieferCard = BrieferCard;
