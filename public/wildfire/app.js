/* ============================================================
   BC WILDFIRE TRACKER — app.js
   Handles: data loading, navigation, rendering, refresh timer
   ============================================================ */

// Global state
window.WF = { fires: null, canada: null, world: null };

// Current zone context (for fire detail back button)
let currentZoneId = null;
let refreshTimer = null;
let countdownInterval = null;

/* ============================================================
   DATA LOADING
   ============================================================ */
async function loadData() {
  try {
    const [fires, canada, world] = await Promise.all([
      fetch('./data/fires.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('./data/canada.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch('./data/world.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ]);
    WF.fires = fires;
    WF.canada = canada;
    WF.world = world;
    document.getElementById('load-error').style.display = 'none';
    renderMainView();
    startCountdown(fires.updated_at, fires.next_update);
  } catch (e) {
    document.getElementById('load-error').style.display = 'block';
    document.getElementById('error-last-updated').textContent =
      WF.fires ? formatAge(WF.fires.updated_at) : 'unknown';
  }
}

/* ============================================================
   TIMESTAMP & COUNTDOWN
   ============================================================ */
function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-CA', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Vancouver', timeZoneName: 'short'
  });
}

function formatAge(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

function startCountdown(updatedAt, nextUpdate) {
  document.getElementById('last-updated').textContent = `Updated ${formatAge(updatedAt)}`;
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const msLeft = new Date(nextUpdate) - Date.now();
    if (msLeft <= 0) {
      document.getElementById('next-update').textContent = 'Refreshing…';
      loadData();
    } else {
      const m = Math.floor(msLeft / 60000);
      const s = Math.floor((msLeft % 60000) / 1000);
      document.getElementById('next-update').textContent =
        `Next update in ${m}:${String(s).padStart(2, '0')}`;
    }
  }, 1000);
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function showMainView() {
  document.getElementById('main-view').style.display = '';
  document.getElementById('zone-view').style.display = 'none';
  document.getElementById('fire-view').style.display = 'none';
  window.scrollTo(0, 0);
}

function showZoneView(zoneId) {
  const zone = WF.fires.zones.find(z => z.id === zoneId);
  if (!zone) return;
  currentZoneId = zoneId;
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('fire-view').style.display = 'none';
  const zv = document.getElementById('zone-view');
  zv.style.display = '';
  populateZoneView(zone);
  // Reset to first tab
  setActiveTab('zone-tab-fires', 'zone-tabs');
  window.scrollTo(0, 0);
}

function showFireView(fireNumber) {
  let fire = null;
  for (const zone of WF.fires.zones) {
    fire = zone.fires_of_note_list.find(f => f.fire_number === fireNumber);
    if (fire) break;
  }
  if (!fire) return;
  document.getElementById('main-view').style.display = 'none';
  document.getElementById('zone-view').style.display = 'none';
  const fv = document.getElementById('fire-view');
  fv.style.display = '';
  populateFireView(fire);
  setActiveTab('fire-tab-photos', 'fire-tabs');
  window.scrollTo(0, 0);
}

function backToZone() {
  if (currentZoneId) showZoneView(currentZoneId);
  else showMainView();
}

/* ============================================================
   TAB SWITCHING
   ============================================================ */
function switchTab(btn, groupId) {
  const targetId = btn.getAttribute('data-tab');
  const group = document.getElementById(groupId);
  // Deactivate all buttons in this tab bar
  btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Hide/show panels
  group.querySelectorAll('.tab-panel').forEach(p => {
    p.style.display = p.id === targetId ? '' : 'none';
  });
}

function setActiveTab(tabId, groupId) {
  const group = document.getElementById(groupId);
  group.querySelectorAll('.tab-panel').forEach(p => {
    p.style.display = p.id === tabId ? '' : 'none';
  });
  // Find the tab bar associated — it's the sibling before the group
  const tabBar = group.previousElementSibling;
  if (tabBar && tabBar.classList.contains('tab-bar')) {
    tabBar.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
  }
}

/* ============================================================
   STATUS HELPERS
   ============================================================ */
const STATUS_COLOURS = {
  'Out of Control': '#C0392B',
  'Being Held':     '#E67E22',
  'Under Control':  '#27AE60',
  'Out':            '#95A5A6',
};

function statusColour(status) {
  return STATUS_COLOURS[status] || '#7F8C8D';
}

function statusBgColour(status) {
  const map = {
    'Out of Control': '#2a0a08',
    'Being Held':     '#2a1a08',
    'Under Control':  '#082a14',
    'Out':            '#1e252f',
  };
  return map[status] || '#1e252f';
}

function fmtHa(ha) {
  if (ha >= 10000) return `${(ha / 1000).toFixed(0)}k`;
  if (ha >= 1000) return ha.toLocaleString();
  return ha.toString();
}

/* ============================================================
   MAIN VIEW RENDERING
   ============================================================ */
function renderMainView() {
  const f = WF.fires;
  const t = f.bc_totals;

  // Stats bar
  document.getElementById('stat-active').textContent = t.active.toLocaleString();
  document.getElementById('stat-fon').textContent = t.fires_of_note.toLocaleString();
  document.getElementById('stat-ha').textContent = t.hectares_burned >= 1000
    ? `${(t.hectares_burned / 1000).toFixed(0)}k` : t.hectares_burned.toLocaleString();
  document.getElementById('stat-crews').textContent = (t.crews_deployed || '—').toLocaleString();
  document.getElementById('stat-level').textContent = t.preparedness_level ? `PL ${t.preparedness_level}` : '—';

  // Off-season banner
  document.getElementById('offseason-banner').style.display = t.active === 0 ? '' : 'none';

  // Zone grid
  const grid = document.getElementById('zone-grid');
  grid.innerHTML = f.zones.map(zone => renderZoneCard(zone)).join('');

  // Canada
  document.getElementById('canada-section').innerHTML = renderCanadaSection(WF.canada);

  // World
  document.getElementById('world-section').innerHTML = WF.world.fires.length
    ? WF.world.fires.map(fw => renderWorldFireCard(fw)).join('')
    : '<p class="empty-tab">No notable world fires currently tracked.</p>';
}

function renderZoneCard(zone) {
  const hasEvac = zone.zone_evac_notices && zone.zone_evac_notices.length > 0;
  const hasOrder = hasEvac && zone.zone_evac_notices.some(n => n.type === 'ORDER');
  const quietState = zone.active_fires === 0;

  const isNA = !zone.danger_rating || zone.danger_rating === 'N/A';
  const dangerBg = zone.danger_colour || '#7F8C8D';

  // Hide pill entirely when off-season / no rating
  const pillHtml = isNA
    ? ''
    : `<span class="danger-pill" style="background:${dangerBg}22;color:${dangerBg};border:1px solid ${dangerBg}55">${zone.danger_rating}</span>`;

  const evacBadge = hasOrder
    ? '<div class="zone-card-evac-badge">⚠ Evac Orders Active</div>'
    : hasEvac
    ? '<div class="zone-card-evac-badge" style="color:var(--ember)">⚠ Evac Alerts Active</div>'
    : '';

  const countsHtml = quietState
    ? '<p class="zone-card-quiet">No active fires</p>'
    : `<div class="zone-card-counts">
        <div class="zone-count"><span class="zone-count-val">${zone.active_fires}</span><span class="zone-count-lbl">Active</span></div>
        <div class="zone-count"><span class="zone-count-val fon-val">${zone.fires_of_note}</span><span class="zone-count-lbl">Fires of Note</span></div>
      </div>`;

  const borderColour = hasOrder ? '#C0392B' : hasEvac ? '#E67E22' : isNA ? 'var(--border)' : (zone.danger_colour || '#7F8C8D');

  return `
    <div class="zone-card" style="border-left-color:${borderColour}" onclick="showZoneView('${zone.id}')">
      <div class="zone-card-header">
        <span class="zone-card-name">${zone.name}</span>
        ${pillHtml}
      </div>
      ${countsHtml}
      <div class="zone-card-weather">${zone.weather_summary}</div>
      ${evacBadge}
    </div>`;
}

function renderCanadaSection(canada) {
  const c = canada.ciffc;
  const provHtml = canada.provinces.map(p => {
    const isHigh = p.level >= 4;
    return `<span class="prov-chip ${isHigh ? 'prov-high' : ''}" title="${p.name}: ${p.active} fires">${p.name} ${p.active}</span>`;
  }).join('');

  const newsHtml = canada.news.length
    ? `<ul class="canada-news-list">${canada.news.map(n => renderNewsItem(n)).join('')}</ul>`
    : '<p class="empty-tab">No national wildfire news.</p>';

  return `
    <div class="canada-ciffc">
      <div class="ciffc-stat"><span class="ciffc-val">${c.active_fires.toLocaleString()}</span><span class="ciffc-lbl">Active (Canada)</span></div>
      <div class="ciffc-stat"><span class="ciffc-val">${(c.ha_burned_ytd / 1000000).toFixed(1)}M</span><span class="ciffc-lbl">Hectares YTD</span></div>
      <div class="ciffc-stat"><span class="ciffc-val" style="color:var(--fire-red)">PL ${c.preparedness_level}</span><span class="ciffc-lbl">National Level</span></div>
      ${c.interprovincial_requests ? `<div class="ciffc-stat"><span class="ciffc-val">${c.interprovincial_requests}</span><span class="ciffc-lbl">Inter-prov Requests</span></div>` : ''}
    </div>
    <div class="province-bar">${provHtml}</div>
    ${newsHtml}`;
}

function renderWorldFireCard(fw) {
  const flags = { USA: '🇺🇸', Canada: '🇨🇦', Greece: '🇬🇷', Australia: '🇦🇺', Portugal: '🇵🇹', Spain: '🇪🇸', France: '🇫🇷' };
  const flag = flags[fw.country] || '🌍';
  const containHtml = fw.containment_pct > 0
    ? `<span class="world-stat"><strong>${fw.containment_pct}%</strong> contained</span>` : '';
  return `
    <div class="world-fire-card">
      <span class="world-flag">${flag}</span>
      <div class="world-fire-info">
        <div class="world-fire-name"><a href="${fw.link}" target="_blank" rel="noopener">${fw.name}</a></div>
        <div class="world-fire-loc">${fw.region}, ${fw.country}</div>
        <div class="world-fire-summary">${fw.summary}</div>
        <div class="world-fire-stats">
          <span class="world-stat"><strong>${fw.hectares.toLocaleString()}</strong> ha</span>
          <span class="world-stat"><strong>${fw.status}</strong></span>
          ${containHtml}
        </div>
      </div>
    </div>`;
}

/* ============================================================
   ZONE VIEW RENDERING
   ============================================================ */
function populateZoneView(zone) {
  document.getElementById('zone-breadcrumb').textContent = zone.name;
  document.getElementById('zone-detail-name').textContent = zone.name;
  document.getElementById('zone-detail-weather').textContent = zone.weather_summary;
  const db = document.getElementById('zone-detail-danger');
  db.textContent = zone.danger_rating;
  db.style.background = (zone.danger_colour || '#7F8C8D') + '22';
  db.style.color = zone.danger_colour || '#7F8C8D';
  db.style.border = `1px solid ${zone.danger_colour || '#7F8C8D'}55`;

  // Evac notices
  document.getElementById('zone-evac-notices').innerHTML =
    renderEvacNotices(zone.zone_evac_notices);

  // Fires tab
  const firesPanel = document.getElementById('zone-tab-fires');
  firesPanel.innerHTML = renderZoneFiresTab(zone);

  // News tab
  document.getElementById('zone-tab-news').innerHTML =
    zone.zone_news && zone.zone_news.length
      ? `<ul class="news-list">${zone.zone_news.map(n => renderNewsItem(n)).join('')}</ul>`
      : '<p class="empty-tab">No news stories for this zone.</p>';

  // Roads tab
  document.getElementById('zone-tab-roads').innerHTML =
    zone.zone_road_closures && zone.zone_road_closures.length
      ? zone.zone_road_closures.map(r => renderRoadClosure(r)).join('')
      : '<p class="empty-tab">No road closures reported for this zone.</p>';

  // Stats tab
  document.getElementById('zone-tab-stats').innerHTML = renderZoneStatsTab(zone);
}

function renderZoneFiresTab(zone) {
  const fon = zone.fires_of_note_list || [];
  const hasEvac = zone.zone_evac_notices && zone.zone_evac_notices.some(n => n.type === 'ORDER');
  let html = `
    <div class="fires-zone-header">
      <div class="fzone-count"><span class="fzone-val">${zone.active_fires}</span><span class="fzone-lbl">Active</span></div>
      <div class="fzone-count"><span class="fzone-val fon">${zone.fires_of_note}</span><span class="fzone-lbl">Fires of Note</span></div>
    </div>`;

  if (fon.length === 0) {
    html += '<p class="empty-tab">No fires of note in this zone.</p>';
  } else {
    html += '<div class="fires-section-label">Fires of Note</div>';
    html += fon.map(f => renderFireRow(f)).join('');
  }
  return html;
}

function renderZoneStatsTab(zone) {
  const fon = zone.fires_of_note_list || [];
  const totalHa = fon.reduce((s, f) => s + (f.hectares || 0), 0);
  const totalCrews = fon.reduce((s, f) => s + (f.crews || 0), 0);
  const totalHeli = fon.reduce((s, f) => s + (f.helicopters || 0), 0);
  return `
    <div class="resources-grid">
      <div class="resource-box"><span class="resource-val">${zone.active_fires}</span><span class="resource-lbl">Active Fires</span></div>
      <div class="resource-box"><span class="resource-val">${zone.fires_of_note}</span><span class="resource-lbl">Fires of Note</span></div>
      <div class="resource-box"><span class="resource-val">${totalHa.toLocaleString()}</span><span class="resource-lbl">Ha Burned (FON)</span></div>
      <div class="resource-box"><span class="resource-val">${totalCrews}</span><span class="resource-lbl">Crews (FON)</span></div>
      <div class="resource-box"><span class="resource-val">${totalHeli}</span><span class="resource-lbl">Helicopters (FON)</span></div>
    </div>`;
}

/* ============================================================
   FIRE VIEW RENDERING
   ============================================================ */
function populateFireView(fire) {
  // Header
  document.getElementById('fire-breadcrumb').textContent = fire.name;
  document.getElementById('fire-detail-number').textContent = fire.fire_number;
  document.getElementById('fire-detail-name').textContent = fire.name;

  const zone = WF.fires.zones.find(z => z.fires_of_note_list.some(f => f.fire_number === fire.fire_number));
  document.getElementById('fire-back-label').textContent = zone ? zone.name : 'Zone';

  const stTag = document.getElementById('fire-status-tag');
  stTag.textContent = fire.status;
  stTag.style.background = statusBgColour(fire.status);
  stTag.style.color = statusColour(fire.status);
  stTag.style.border = `1px solid ${statusColour(fire.status)}55`;

  const causeTag = document.getElementById('fire-cause-tag');
  causeTag.textContent = fire.cause || 'Cause unknown';
  causeTag.style.background = 'var(--bg3)';
  causeTag.style.color = 'var(--text-muted)';
  causeTag.style.border = '1px solid var(--border)';

  document.getElementById('fire-discovered').textContent = `Discovered: ${fire.discovered || '—'}`;

  // Stats bar
  document.getElementById('fstat-ha').textContent = fire.hectares.toLocaleString();
  document.getElementById('fstat-crews').textContent = fire.crews;
  document.getElementById('fstat-machines').textContent = fire.machines;
  document.getElementById('fstat-heli').textContent = fire.helicopters;
  document.getElementById('fstat-air').textContent = fire.airtankers;
  const evacProps = (fire.evac_notices || []).filter(n => n.type === 'ORDER').reduce((s, n) => s + (n.properties || 0), 0);
  document.getElementById('fstat-evac').textContent = evacProps > 0 ? evacProps.toLocaleString() : '—';

  // Evac notices
  document.getElementById('fire-evac-notices').innerHTML = renderEvacNotices(fire.evac_notices);

  // Tab: Photos
  document.getElementById('fire-tab-photos').innerHTML = renderPhotosTab(fire);

  // Tab: Map
  document.getElementById('fire-tab-map').innerHTML = renderMapTab(fire);

  // Tab: Response
  document.getElementById('fire-tab-response').innerHTML = renderResponseTab(fire);

  // Tab: Weather
  document.getElementById('fire-tab-weather').innerHTML = renderWeatherTab(fire);

  // Tab: Roads
  document.getElementById('fire-tab-roads').innerHTML = fire.road_closures && fire.road_closures.length
    ? fire.road_closures.map(r => renderRoadClosure(r)).join('')
    : '<p class="empty-tab">No road closures reported for this fire.</p>';

  // Tab: News
  document.getElementById('fire-tab-news').innerHTML = fire.news && fire.news.length
    ? `<ul class="news-list">${fire.news.map(n => renderNewsItem(n)).join('')}</ul>`
    : '<p class="empty-tab">No news stories for this fire.</p>';

  // Tab: Social
  document.getElementById('fire-tab-social').innerHTML = renderSocialTab(fire);
}

function renderPhotosTab(fire) {
  const photos = fire.photos || [];
  const webcams = fire.webcams || [];

  if (!photos.length && !webcams.length) {
    return `<div class="photo-placeholder">
      <p>📷 No photos available yet for this fire.</p>
      <p>Photos are sourced from <a href="https://www.instagram.com/bcgovfireinfo/" target="_blank" rel="noopener">@bcgovfireinfo</a> and updated every 6 hours.</p>
    </div>`;
  }
  let html = '';
  if (photos.length) {
    html += photos.map(p => `
      <div class="photo-placeholder" style="margin-bottom:0.5rem">
        <p>📷 <a href="${p.url}" target="_blank" rel="noopener">${p.caption || 'View on Instagram'}</a></p>
        <p class="news-meta" style="justify-content:center">${p.source} · ${formatAge(p.timestamp)}</p>
      </div>`).join('');
  }
  if (webcams.length) {
    html += '<div class="fires-section-label" style="margin-top:1rem">Nearby Webcams</div>';
    html += webcams.map(w => `
      <div class="road-closure-row" style="cursor:default">
        <span>🎥</span>
        <div><div class="road-name">${w.name}</div><div class="road-reason">${w.distance_km} km from fire · <a href="${w.link}" target="_blank" rel="noopener">View webcam</a></div></div>
      </div>`).join('');
  }
  return html;
}

function renderMapTab(fire) {
  const src = `https://wildfiresituation.nrs.gov.bc.ca/map?longitude=${fire.lng}&latitude=${fire.lat}&zoom=11`;
  return `
    <div class="map-container">
      <iframe
        src="${src}"
        title="BCWS Wildfire Map — ${fire.fire_number}"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      </iframe>
      <div class="map-fallback" style="display:none">
        <p style="margin-bottom:0.8rem;color:var(--text-muted)">Map embed unavailable.</p>
        <a href="${src}" target="_blank" rel="noopener" class="btn-back" style="display:inline-block">
          View on BCWS Map →
        </a>
      </div>
    </div>
    <p style="font-size:0.72rem;color:var(--text-muted);margin-top:0.5rem">
      Map data: <a href="https://www.bcwildfire.ca" target="_blank" rel="noopener">BC Wildfire Service</a>
    </p>`;
}

function renderResponseTab(fire) {
  let html = `
    <div class="resources-grid">
      <div class="resource-box"><span class="resource-val">${fire.crews}</span><span class="resource-lbl">Crews</span></div>
      <div class="resource-box"><span class="resource-val">${fire.machines}</span><span class="resource-lbl">Machines</span></div>
      <div class="resource-box"><span class="resource-val">${fire.helicopters}</span><span class="resource-lbl">Helicopters</span></div>
      <div class="resource-box"><span class="resource-val">${fire.airtankers}</span><span class="resource-lbl">Airtankers</span></div>
    </div>`;

  if (fire.tactics) {
    html += `<div class="fires-section-label">Tactics</div>
      <div class="tactics-block">${fire.tactics}</div>`;
  }

  if (fire.growth_history && fire.growth_history.length) {
    html += '<div class="fires-section-label">Growth History</div>';
    html += '<table class="growth-table"><thead><tr><th>Date</th><th>Size (ha)</th><th>Note</th></tr></thead><tbody>';
    // Newest first
    const sorted = [...fire.growth_history].reverse();
    html += sorted.map((g, i) => `
      <tr${i === 0 ? ' style="font-weight:700"' : ''}>
        <td>${g.date}</td>
        <td class="ha-cell">${g.ha.toLocaleString()}</td>
        <td>${g.note}</td>
      </tr>`).join('');
    html += '</tbody></table>';
  }
  return html;
}

function renderWeatherTab(fire) {
  const wx = fire.weather;
  if (!wx) return '<p class="empty-tab">No weather data available.</p>';
  return `
    <div class="weather-grid">
      <div class="wx-box"><div class="wx-val">${wx.temp_c}°C</div><div class="wx-lbl">Temperature</div></div>
      <div class="wx-box"><div class="wx-val">${wx.rh_pct}%</div><div class="wx-lbl">Rel. Humidity</div></div>
      <div class="wx-box"><div class="wx-val">${wx.wind_dir} ${wx.wind_kmh}</div><div class="wx-lbl">Wind (km/h)</div></div>
      <div class="wx-box"><div class="wx-val">${wx.gust_kmh}</div><div class="wx-lbl">Gust (km/h)</div></div>
    </div>
    <div class="fires-section-label">Fire Weather Indices</div>
    <div class="fwi-grid">
      <div class="fwi-box"><span class="fwi-label">FWI</span><span class="fwi-value">${wx.fwi}</span></div>
      <div class="fwi-box"><span class="fwi-label">BUI</span><span class="fwi-value">${wx.bui}</span></div>
      <div class="fwi-box"><span class="fwi-label">ISI</span><span class="fwi-value">${wx.isi}</span></div>
    </div>
    <div class="fires-section-label">4-Day Forecast</div>
    <table class="forecast-table">
      <thead><tr><th>Date</th><th>High</th><th>Conditions</th><th>Rain %</th></tr></thead>
      <tbody>
        ${wx.forecast.map(d => `
          <tr>
            <td>${d.date}</td>
            <td>${d.high}°C</td>
            <td>${d.desc}</td>
            <td class="precip-cell">${d.precip_pct}%</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderSocialTab(fire) {
  const posts = fire.social_posts || [];
  if (!posts.length) {
    return `<div class="social-post-placeholder">
      <p>No social posts linked to this fire yet.</p>
      <p style="margin-top:0.5rem">Follow <a href="https://twitter.com/BCGovFireInfo" target="_blank" rel="noopener">@BCGovFireInfo</a> for the latest updates.</p>
    </div>`;
  }
  return `<div class="social-feed">${posts.map(p => p.embed_html
    ? `<div class="social-post-placeholder">${p.embed_html}</div>`
    : `<div class="social-post-placeholder">
        <a href="${p.post_url}" target="_blank" rel="noopener">${p.account} — View post</a>
      </div>`
  ).join('')}</div>`;
}

/* ============================================================
   REUSABLE RENDER HELPERS
   ============================================================ */
function renderFireRow(fire) {
  const colour = statusColour(fire.status);
  const hasEvac = fire.evac_notices && fire.evac_notices.some(n => n.type === 'ORDER');
  return `
    <div class="fire-row" onclick="showFireView('${fire.fire_number}')">
      <span class="status-dot" style="background:${colour}"></span>
      <div class="fire-row-info">
        <div class="fire-row-name">
          ${fire.name}
          <span class="fire-row-number">${fire.fire_number}</span>
          ${hasEvac ? '<span style="color:var(--fire-red);font-size:0.75rem">⚠ Evac Order</span>' : ''}
        </div>
        <div class="fire-row-meta">${fire.status} · ${fire.cause || 'Cause unknown'} · Discovered ${fire.discovered || '—'}</div>
      </div>
      <div class="fire-row-stats">
        <div class="fire-row-stat">
          <span class="fire-row-stat-val">${(fire.size_ha ?? fire.hectares ?? 0).toLocaleString()}</span>
          <span class="fire-row-stat-lbl">Ha</span>
        </div>
        <div class="fire-row-stat">
          <span class="fire-row-stat-val">${fire.crews}</span>
          <span class="fire-row-stat-lbl">Crews</span>
        </div>
      </div>
      <span class="fire-row-chevron">›</span>
    </div>`;
}

function renderEvacNotices(notices) {
  if (!notices || !notices.length) return '';
  const sorted = [...notices].sort((a, b) => {
    const order = { ORDER: 0, ALERT: 1 };
    return (order[a.type] ?? 2) - (order[b.type] ?? 2);
  });
  return `<div class="evac-notices-wrapper">${sorted.map(n => {
    const cls = n.type === 'ORDER' ? 'order' : 'alert';
    const issued = n.issued ? `Issued ${formatAge(n.issued)}` : '';
    const props = n.properties ? `${n.properties.toLocaleString()} properties` : '';
    return `
      <div class="evac-notice-block ${cls}">
        <span class="evac-type-label">Evac ${n.type === 'ORDER' ? 'Order' : 'Alert'}</span>
        <div class="evac-details">
          <div class="evac-area">${n.area}</div>
          <div class="evac-meta">
            ${props ? `<span>${props}</span>` : ''}
            ${issued ? `<span>${issued}</span>` : ''}
            ${n.link ? `<a href="${n.link}" target="_blank" rel="noopener">Official notice →</a>` : ''}
          </div>
        </div>
      </div>`;
  }).join('')}</div>`;
}

function renderNewsItem(n) {
  const age = n.age || (n.published ? formatAge(n.published) : '');
  return `<li class="news-item">
    <div class="news-title"><a href="${n.url}" target="_blank" rel="noopener">${n.title}</a></div>
    ${n.summary ? `<div class="news-summary">${n.summary}</div>` : ''}
    <div class="news-meta"><span>${n.source || ''}</span><span>${age}</span></div>
  </li>`;
}

function renderRoadClosure(r) {
  const cls = r.status.toLowerCase() === 'closed' ? 'closed' : 'restricted';
  return `
    <div class="road-closure-row">
      <span class="road-status-tag ${cls}">${r.status}</span>
      <div>
        <div class="road-name">${r.road}</div>
        <div class="road-reason">${r.reason} · ${r.since ? 'Since ' + formatAge(r.since) : ''} · <a href="${r.link}" target="_blank" rel="noopener">DriveBC</a></div>
      </div>
    </div>`;
}

/* ============================================================
   INIT
   ============================================================ */
loadData();
