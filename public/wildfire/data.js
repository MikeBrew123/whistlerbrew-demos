/* Wildfire Tracker — realistic BC placeholder data (June 2, 2026 scenario)
   Plain JS, attaches to window.WF. No JSX. */
(function () {
  // Status keys map to BC Wildfire Service conventions.
  // ooc = Out of Control, bh = Being Held, uc = Under Control, out = Out
  const STATUS = {
    ooc: { label: 'Out of Control', short: 'OOC', color: '#e0412f' },
    bh:  { label: 'Being Held',     short: 'BH',  color: '#e8902f' },
    uc:  { label: 'Under Control',  short: 'UC',  color: '#d8b53e' },
    out: { label: 'Out',            short: 'OUT', color: '#8a8178' },
  };

  // Six BC Fire Centres. prefix = fire-number letter used by BCWS.
  const CENTRES = [
    { id: 'coastal',   name: 'Coastal',       prefix: 'V', hub: 'Parksville',     newStarts: 2 },
    { id: 'cariboo',   name: 'Cariboo',       prefix: 'C', hub: 'Williams Lake',  newStarts: 3 },
    { id: 'kamloops',  name: 'Kamloops',      prefix: 'K', hub: 'Kamloops',       newStarts: 4 },
    { id: 'southeast', name: 'Southeast',     prefix: 'N', hub: 'Castlegar',      newStarts: 1 },
    { id: 'pgeorge',   name: 'Prince George', prefix: 'G', hub: 'Prince George',  newStarts: 2 },
    { id: 'northwest', name: 'Northwest',     prefix: 'R', hub: 'Smithers',       newStarts: 2 },
  ];

  // Fires. ha = hectares, disc = discovered ISO, fon = Fire of Note.
  // x/y = abstract map coords (0..100) over a stylized BC outline.
  const FIRES = [
    // ── Fires of Note (life/property at risk → SPS gets called) ──
    { id: 'K71042', name: 'Wasp Lake', centre: 'kamloops', status: 'ooc', cause: 'Lightning',
      ha: 1840, disc: '2026-05-30', fon: true, x: 54, y: 62, crews: 86, machines: 11, helis: 4, tankers: 2,
      near: 'Merritt', evac: { order: 120, alert: 340 }, drive: '2h 40m from Kamloops',
      communities: ['Merritt', 'Lower Nicola', 'Shackan IB'] },
    { id: 'C20148', name: 'Churn Creek', centre: 'cariboo', status: 'bh', cause: 'Human',
      ha: 4230, disc: '2026-05-26', fon: true, x: 47, y: 50, crews: 64, machines: 9, helis: 3, tankers: 1,
      near: 'Clinton', evac: { order: 38, alert: 210 }, drive: '1h 15m from Williams Lake',
      communities: ['Clinton', 'Canoe Creek', "Stswecem'c Xgat'tem FN"] },
    { id: 'R11904', name: 'Damdochax', centre: 'northwest', status: 'ooc', cause: 'Lightning',
      ha: 2650, disc: '2026-05-28', fon: true, x: 33, y: 28, crews: 52, machines: 6, helis: 3, tankers: 0,
      near: 'Kispiox', evac: { order: 0, alert: 95 }, drive: '1h 50m from Smithers',
      communities: ['Kispiox', 'Gitanyow', 'Hazelton'] },

    // ── Other active fires by centre ──
    { id: 'K71033', name: 'Shovelnose', centre: 'kamloops', status: 'ooc', cause: 'Lightning', ha: 210, disc: '2026-06-01', fon: false, x: 50, y: 60, new: true },
    { id: 'K71028', name: 'Glimpse Lake', centre: 'kamloops', status: 'bh', cause: 'Lightning', ha: 56, disc: '2026-05-31', fon: false, x: 57, y: 58 },
    { id: 'K71050', name: 'Tahla Creek', centre: 'kamloops', status: 'ooc', cause: 'Under Inv.', ha: 18, disc: '2026-06-02', fon: false, x: 52, y: 65, new: true },

    { id: 'C20144', name: 'Gang Ranch', centre: 'cariboo', status: 'bh', cause: 'Human', ha: 340, disc: '2026-05-29', fon: false, x: 44, y: 52 },
    { id: 'C20150', name: 'Meadow Lake', centre: 'cariboo', status: 'ooc', cause: 'Lightning', ha: 88, disc: '2026-06-01', fon: false, x: 49, y: 47, new: true },
    { id: 'C20153', name: 'Dog Creek', centre: 'cariboo', status: 'uc', cause: 'Human', ha: 12, disc: '2026-06-02', fon: false, x: 46, y: 49, new: true },

    { id: 'R11876', name: 'Nass Forest', centre: 'northwest', status: 'ooc', cause: 'Lightning', ha: 410, disc: '2026-05-30', fon: false, x: 30, y: 26 },
    { id: 'R11910', name: 'Bell-Irving', centre: 'northwest', status: 'bh', cause: 'Lightning', ha: 64, disc: '2026-06-01', fon: false, x: 31, y: 20, new: true },

    { id: 'G50221', name: 'Tetachuck', centre: 'pgeorge', status: 'bh', cause: 'Lightning', ha: 1120, disc: '2026-05-27', fon: false, x: 41, y: 33 },
    { id: 'G50230', name: 'Nechako', centre: 'pgeorge', status: 'ooc', cause: 'Lightning', ha: 75, disc: '2026-06-01', fon: false, x: 43, y: 31, new: true },

    { id: 'N51120', name: 'Akokli Creek', centre: 'southeast', status: 'uc', cause: 'Human', ha: 140, disc: '2026-05-29', fon: false, x: 64, y: 67 },
    { id: 'N51133', name: 'Bugaboo', centre: 'southeast', status: 'bh', cause: 'Lightning', ha: 290, disc: '2026-06-01', fon: false, x: 60, y: 60, new: true },

    { id: 'V40231', name: 'Pemberton Ck', centre: 'coastal', status: 'uc', cause: 'Human', ha: 22, disc: '2026-05-31', fon: false, x: 46, y: 66 },
    { id: 'V40240', name: 'Sproat Lake', centre: 'coastal', status: 'out', cause: 'Human', ha: 4, disc: '2026-06-01', fon: false, x: 40, y: 70, new: true },
  ];

  // Province summary (rolls up the above).
  const PROVINCE = {
    newStarts24h: 14,
    active: 38,
    fireOfNote: 3,
    hectares: 12423,
    outOfControl: 9,
    crews: 612,
    prepLevel: 3,        // BC preparedness level 1–5
    updated: '2026-06-02T14:20:00',
  };

  // Local BC news / ground-truth feed. type drives the source icon.
  // type: news | x | facebook | youtube | reddit | cam | instagram
  const FEED = [
    { type: 'news', src: 'CBC Kamloops', fire: 'K71042', mins: 18,
      title: 'Merritt placed on evacuation alert as Wasp Lake fire grows overnight to 1,840 hectares' },
    { type: 'cam', src: 'DriveBC · Hwy 5A', fire: 'K71042', mins: 4,
      title: 'Highway 5A camera — heavy smoke reducing visibility near Lower Nicola' },
    { type: 'facebook', src: 'Nicola Valley Community Group', fire: 'K71042', mins: 31,
      title: '"Several of us staying to run sprinklers on the ranch — RCMP came through but no one\u2019s forcing us out yet."' },
    { type: 'x', src: '@BCGovFireInfo', fire: 'K71042', mins: 52,
      title: 'Structure protection specialists deployed to Wasp Lake (K71042). Sprinkler kits being set on 60+ properties.' },
    { type: 'youtube', src: 'Interior Live · 2.1k watching', fire: 'C20148', mins: 9,
      title: 'LIVE: Churn Creek wildfire — view from Clinton lookout' },
    { type: 'reddit', src: 'r/britishcolumbia', fire: 'C20148', mins: 74,
      title: 'Anyone near Clinton? Churn Creek fire — what\u2019s the air quality like right now? (148 comments)' },
    { type: 'news', src: 'Castanet', fire: 'C20148', mins: 96,
      title: 'Highway 97 reduced to single-lane alternating traffic near Big Bar Road junction' },
    { type: 'instagram', src: '@hazelton.bc', fire: 'R11904', mins: 120,
      title: 'Smoke column from the Damdochax fire visible from Kispiox Valley Road this evening' },
  ];

  // Source presentation (label + accent for chips/icons).
  const SOURCE = {
    news:      { label: 'Local News', color: '#5b8def' },
    x:         { label: 'X',          color: '#9aa0a6' },
    facebook:  { label: 'Facebook',   color: '#4f7fe0' },
    youtube:   { label: 'YouTube',    color: '#e0412f' },
    reddit:    { label: 'Reddit',     color: '#e8902f' },
    cam:       { label: 'Live Cam',   color: '#3fb27f' },
    instagram: { label: 'Instagram',  color: '#c062a8' },
  };

  // Deployment Briefer — local knowledge for a single fire (Wasp Lake demo).
  const BRIEFER = {
    fire: 'K71042',
    community: 'Merritt',
    population: 7100,
    waterSources: [
      { name: 'Nicola River — Voght St. draft', type: 'Draft', note: 'Year-round, good access' },
      { name: 'Merritt municipal hydrant grid', type: 'Hydrant', note: 'Coordinate w/ Public Works' },
      { name: 'Nicola Lake boat launch', type: 'Tender fill', note: '12 min from townsite' },
    ],
    firstNations: [
      { name: 'Shackan Indian Band', say: 'SHACK-an', contact: 'Emergency Coord. · 250-555-0140' },
      { name: 'Lower Nicola Indian Band', say: 'nih-KOH-lah', contact: 'Band Office · 250-555-0177' },
    ],
    emergency: { rcmp: '250-555-0123', fireHall: '250-555-0188', hospital: 'Nicola Valley Hospital · 250-555-0199' },
    employers: ['Tolko Industries (mill)', 'City of Merritt', 'Nicola Valley Institute'],
    lodging: 'Kamloops — 90 min (nearest >available rooms). Base camp staged at Merritt Civic Centre.',
  };

  // Zone ID mapping: live fires.json uses hyphenated IDs, design uses short IDs
  const ZONE_MAP = {
    'kamloops': 'kamloops', 'prince-george': 'pgeorge', 'cariboo': 'cariboo',
    'northwest': 'northwest', 'southeast': 'southeast', 'coastal': 'coastal',
  };

  // Convert a pubDate string to minutes-ago
  function minsAgo(dateStr) {
    if (!dateStr) return 999;
    const d = new Date(dateStr);
    if (isNaN(d)) return 999;
    return Math.max(0, Math.floor((Date.now() - d) / 60000));
  }

  // BCWS ArcGIS public APIs
  const BCWS_API = 'https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/BCWS_ActiveFires_PublicView/FeatureServer/0/query';
  const EVAC_API = 'https://services6.arcgis.com/ubm4tcTYICKBpist/ArcGIS/rest/services/Evacuation_Orders_and_Alerts/FeatureServer/0/query';
  // FIRE_CENTRE code → design centre ID
  const FC_CODE = { 2: 'coastal', 3: 'kamloops', 4: 'pgeorge', 5: 'northwest', 6: 'southeast', 7: 'cariboo' };
  // BCWS status → design status key
  const STATUS_MAP = { 'Out of Control': 'ooc', 'Being Held': 'bh', 'Under Control': 'uc', 'Out': 'out' };

  // Fetch live data from N8N-fed fires.json + BCWS individual fires + news
  async function loadLiveData() {
    try {
      const [firesRes, newsRes, bcwsRes, evacRes] = await Promise.all([
        fetch('./data/fires.json'),
        fetch('./data/firesmart-news.json').catch(() => null),
        fetch(BCWS_API + "?where=FIRE_STATUS<>'Out'&outFields=FIRE_NUMBER,FIRE_OF_NOTE_IND,FIRE_STATUS,FIRE_CAUSE,CURRENT_SIZE,FIRE_CENTRE,GEOGRAPHIC_DESCRIPTION,LATITUDE,LONGITUDE,IGNITION_DATE,INCIDENT_NAME,FIRE_URL&f=json&resultRecordCount=200").catch(() => null),
        fetch(EVAC_API + "?where=EVENT_TYPE=%27Fire%27&outFields=ORDER_ALERT_STATUS,EVENT_NAME,EVENT_NUMBER,ISSUING_AGENCY,DATE_MODIFIED,ORDER_ALERT_NAME,MULTI_SOURCED_HOMES,MULTI_SOURCED_POPULATION&f=json&resultRecordCount=50").catch(() => null),
      ]);
      if (!firesRes.ok) return;
      const live = await firesRes.json();
      const fsNews = newsRes && newsRes.ok ? await newsRes.json() : { zones: {} };

      // Build evacuation lookup by fire number
      var evacByFire = {};
      if (evacRes && evacRes.ok) {
        var evacData = await evacRes.json();
        (evacData.features || []).forEach(function(feat) {
          var a = feat.attributes;
          var fn = a.EVENT_NUMBER;
          if (!fn) return;
          if (!evacByFire[fn]) evacByFire[fn] = [];
          evacByFire[fn].push({
            level: (a.ORDER_ALERT_STATUS || '').toLowerCase(),
            area: a.ORDER_ALERT_NAME || a.EVENT_NAME || '',
            by: a.ISSUING_AGENCY || '',
            homes: a.MULTI_SOURCED_HOMES || 0,
            population: a.MULTI_SOURCED_POPULATION || 0,
            issued: a.DATE_MODIFIED ? new Date(a.DATE_MODIFIED).toISOString() : '',
          });
        });
      }

      // Build real FIRES array from BCWS individual fire data
      if (bcwsRes && bcwsRes.ok) {
        const bcws = await bcwsRes.json();
        const now = Date.now();
        const day = 86400000;
        const realFires = (bcws.features || []).map(function(feat) {
          const a = feat.attributes;
          const centreId = FC_CODE[a.FIRE_CENTRE] || 'coastal';
          const disc = a.IGNITION_DATE ? new Date(a.IGNITION_DATE).toISOString().slice(0, 10) : '';
          const isNew = a.IGNITION_DATE && (now - a.IGNITION_DATE) < day;
          var evacs = evacByFire[a.FIRE_NUMBER] || [];
          return {
            id: a.FIRE_NUMBER,
            name: a.INCIDENT_NAME || a.GEOGRAPHIC_DESCRIPTION || a.FIRE_NUMBER,
            location: a.GEOGRAPHIC_DESCRIPTION || '',
            centre: centreId,
            status: STATUS_MAP[a.FIRE_STATUS] || 'uc',
            cause: a.FIRE_CAUSE || 'Under Inv.',
            ha: a.CURRENT_SIZE || 0,
            disc: disc,
            fon: a.FIRE_OF_NOTE_IND === 'Y',
            lat: a.LATITUDE,
            lng: a.LONGITUDE,
            fireUrl: a.FIRE_URL || '',
            new: isNew,
            alerts: evacs,
            evac: evacs.length > 0 ? {
              order: evacs.filter(function(e) { return e.level === 'order'; }).reduce(function(s, e) { return s + (e.homes || 0); }, 0),
              alert: evacs.filter(function(e) { return e.level === 'alert'; }).reduce(function(s, e) { return s + (e.homes || 0); }, 0),
            } : null,
          };
        });
        // Sort: FoN first, then by size descending
        realFires.sort(function(a, b) {
          if (a.fon !== b.fon) return b.fon ? 1 : -1;
          return b.ha - a.ha;
        });
        if (realFires.length > 0) {
          FIRES.length = 0;
          realFires.forEach(function(f) { FIRES.push(f); });
          window.WF._liveFires = true;

          // Update newStarts count
          PROVINCE.newStarts24h = realFires.filter(function(f) { return f.new; }).length;
        }
      }

      // Update province stats
      PROVINCE.active = live.bc_totals.active || 0;
      PROVINCE.fireOfNote = live.bc_totals.fires_of_note || 0;
      PROVINCE.hectares = live.bc_totals.hectares_burned || 0;
      PROVINCE.crews = live.bc_totals.crews_deployed || 0;
      PROVINCE.prepLevel = live.bc_totals.preparedness_level || 1;
      PROVINCE.updated = live.updated_at;

      // Update zone active-fire counts
      for (const z of (live.zones || [])) {
        const designId = ZONE_MAP[z.id];
        if (!designId) continue;
        const centre = CENTRES.find(c => c.id === designId);
        if (centre) {
          centre.liveActive = z.active_fires || 0;
          centre.liveFoN = z.fires_of_note || 0;
        }
      }

      // Build live feed from zone_news + firesmart-news
      const liveFeed = [];

      // Zone news from fires.json (populated during active fire season)
      for (const z of (live.zones || [])) {
        for (const n of (z.zone_news || [])) {
          liveFeed.push({
            type: 'news', src: n.source || 'BC News',
            mins: minsAgo(n.published), title: n.title || n.headline,
            link: n.link || n.url,
          });
        }
      }

      // FireSmart / Wildfire Today news
      const zones = fsNews.zones || {};
      for (const [zoneId, items] of Object.entries(zones)) {
        for (const it of (items || [])) {
          // Skip irrelevant articles (no wildfire/fire keyword)
          const txt = ((it.title || '') + ' ' + (it.description || '')).toLowerCase();
          const isRelevant = txt.includes('fire') || txt.includes('wildfire')
            || txt.includes('burn') || txt.includes('smoke') || txt.includes('evacu')
            || txt.includes('bcws') || txt.includes('ember') || txt.includes('blaze');
          if (!isRelevant) continue;

          liveFeed.push({
            type: 'news', src: it.source || 'Wildfire Today',
            mins: minsAgo(it.pubDate), title: it.title,
            link: it.link, image: it.image,
          });
        }
      }

      // Sort by recency and replace placeholder feed if we got real articles
      if (liveFeed.length > 0) {
        liveFeed.sort((a, b) => a.mins - b.mins);
        FEED.length = 0;
        liveFeed.forEach(item => FEED.push(item));
        window.WF._liveFeed = true;
      }

      // Signal that live data is available
      window.WF._liveLoaded = true;
      window.WF._liveUpdatedAt = live.updated_at;

      // Re-render if React root exists
      if (window._wfRerender) window._wfRerender();
    } catch (e) { /* fail silently — placeholder data remains */ }
  }

  window.WF = { STATUS, CENTRES, FIRES, PROVINCE, FEED, SOURCE, BRIEFER,
    centre: (id) => CENTRES.find((c) => c.id === id),
    finder: (id) => FIRES.find((f) => f.id === id),
    byCentre: (cid) => FIRES.filter((f) => f.centre === cid),
    loadLiveData,
  };
})();
