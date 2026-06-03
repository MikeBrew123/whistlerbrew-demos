/* Wildfire Tracker — per-fire briefing detail. Plain JS → window.WFD.
   Richest for Churn Creek (C20148). Keyed by fire id with a generic fallback. */
(function () {
  const DETAIL = {
    // ── Churn Creek · near Clinton (the demo click) ──
    C20148: {
      summary: 'Wind-driven growth on the east flank overnight pushed the fire toward the Big Bar Road corridor. Structure protection group established on 38 properties; guard held on the south flank.',
      lastUpdate: '2026-06-02T13:50:00',
      ic: 'IC — T. Whitford · Coastal Unit Crew',
      roads: [
        { road: 'Hwy 97 — Big Bar Rd jct', status: 'alternating', note: 'Single-lane alternating, pilot car 6am–8pm' },
        { road: 'Big Bar Lake Rd', status: 'closed', note: 'Closed at km 4 — active fire, no public access' },
        { road: 'Meadow Lake Rd', status: 'open', note: 'Open — primary access for crews & tenders' },
      ],
      drive: { from: 'Williams Lake', time: '1h 15m', via: 'Hwy 97 S → Meadow Lake Rd', note: 'Hwy 97 alternating near Big Bar — add ~20 min' },
      cams: [
        { label: 'Clinton lookout · live', live: true },
        { label: 'DriveBC · Hwy 97 Big Bar', live: true },
      ],
      gallery: [
        { label: 'East flank · 06:40', credit: 'BCWS air attack' },
        { label: 'Sprinkler line · Big Bar Rd', credit: 'SPP crew' },
        { label: 'Smoke column from Clinton', credit: '@hazelton.bc' },
      ],
      alerts: [
        { level: 'order', area: '38 properties — Big Bar Rd / Jesmond', issued: '2026-06-01T20:15:00', by: 'CRD' },
        { level: 'alert', area: 'Clinton & Kelly Lake — 210 properties', issued: '2026-05-31T17:00:00', by: 'TNRD' },
        { level: 'info', area: 'Area Restriction in effect — Churn Creek FSR network', issued: '2026-05-30T09:00:00', by: 'BCWS' },
      ],
      response: { crews: 64, machines: 9, helis: 3, tankers: 1, struct: 'SPP group — 38 structures with sprinkler protection', personnel: 112 },
      briefer: {
        community: 'Village of Clinton', population: 640, region: 'Thompson-Nicola / Cariboo',
        water: [
          { name: 'Kelly Lake — boat launch', type: 'Tender fill', note: '18 min · good turnaround, gravel ramp' },
          { name: 'Clinton municipal hydrants', type: 'Hydrant', note: 'Coordinate w/ Village Public Works first' },
          { name: 'Bonaparte River — Hwy 97 pull-out', type: 'Draft', note: 'Seasonal flow, check level before committing' },
        ],
        firstNations: [
          { name: "Stswecem'c Xgat'tem First Nation", say: 'stuh-SWEM-suh / ə-GAT-əm', contact: 'Emergency Coordinator · 250-555-0231', note: 'Canoe Creek / Dog Creek communities' },
          { name: 'High Bar First Nation', say: 'HY-bar', contact: 'Band Office · 250-555-0244' },
        ],
        emergency: { rcmp: 'Clinton RCMP · 250-555-0117', fire: 'Clinton Fire Rescue · 250-555-0150', hospital: 'Cariboo Memorial, Williams Lake · 1h 15m · 250-555-0190', eoc: 'TNRD EOC · 250-555-0100' },
        employers: ['Village of Clinton', 'Area ranches (cattle — livestock evac consideration)', 'Gold Trail School District'],
        lodging: 'Cache Creek / Ashcroft — 45 min (nearest rooms). Base camp staged at Clinton Memorial Hall; helibase at Kelly Lake.',
        pins: ['ICP — Clinton Memorial Hall', 'Staging — Meadow Lake Rd km 2', 'Helibase — Kelly Lake', 'Water draft — Bonaparte pull-out'],
      },
      feed: [
        { type: 'youtube', src: 'Interior Live · 2.1k watching', mins: 9, title: 'LIVE: Churn Creek wildfire — view from Clinton lookout' },
        { type: 'reddit', src: 'r/britishcolumbia', mins: 74, title: 'Anyone near Clinton? Churn Creek — what\u2019s the air quality like right now? (148 comments)' },
        { type: 'facebook', src: 'Clinton & District Community', mins: 38, title: '"Ranchers moving cattle off the Big Bar bench tonight — couple of guys staying with sprinklers. RCMP did a pass."' },
        { type: 'news', src: 'Castanet', mins: 96, title: 'Highway 97 reduced to single-lane alternating near Big Bar Road junction as Churn Creek fire grows' },
        { type: 'x', src: '@BCGovFireInfo', mins: 130, title: 'Churn Creek (C20148) now Being Held at 4,230 ha. Structure protection personnel remain on Big Bar Rd properties.' },
        { type: 'instagram', src: '@cariboo.skies', mins: 165, title: 'Pyrocumulus building over the Marble Range this afternoon — visible from Hwy 97' },
        { type: 'news', src: 'CBC Kamloops', mins: 240, title: 'Clinton-area residents on evacuation alert urged to prepare grab-and-go bags' },
      ],
    },

    // ── Wasp Lake · near Merritt ──
    K71042: {
      summary: 'Aggressive overnight runs on the north flank toward Lower Nicola. Sprinkler kits being set on 60+ interface properties; Hwy 5A closed for fire activity and smoke.',
      lastUpdate: '2026-06-02T14:05:00', ic: 'IC — M. Okafor · Kamloops Unit',
      roads: [
        { road: 'Hwy 5A — Merritt to Princeton', status: 'closed', note: 'CLOSED both directions — fire activity, no detour through' },
        { road: 'Hwy 97C (Coquihalla Connector)', status: 'open', note: 'Open — primary detour & crew access' },
        { road: 'Lower Nicola Rd', status: 'alternating', note: 'Local traffic + crews only, pilot car' },
      ],
      drive: { from: 'Kamloops', time: '2h 40m', via: 'Hwy 5 → Hwy 97C', note: 'Do NOT route via Hwy 5A — closed. Use 97C.' },
      cams: [{ label: 'DriveBC · Hwy 5A', live: true }, { label: 'Merritt townsite cam', live: true }],
      gallery: [{ label: 'North flank · 05:50', credit: 'BCWS' }, { label: 'Sprinklers · Lower Nicola', credit: 'SPP crew' }, { label: 'Smoke over Merritt', credit: 'Nicola Valley FB' }],
      alerts: [
        { level: 'order', area: '120 properties — Lower Nicola / Shackan', issued: '2026-06-02T06:30:00', by: 'TNRD' },
        { level: 'alert', area: 'City of Merritt — 340 properties', issued: '2026-06-01T22:00:00', by: 'City of Merritt' },
      ],
      response: { crews: 86, machines: 11, helis: 4, tankers: 2, struct: 'SPP group — 60+ structures, sprinkler kits deploying', personnel: 168 },
      briefer: {
        community: 'City of Merritt', population: 7100, region: 'Thompson-Nicola',
        water: [
          { name: 'Nicola River — Voght St draft', type: 'Draft', note: 'Year-round, good access' },
          { name: 'Merritt hydrant grid', type: 'Hydrant', note: 'Coordinate w/ Public Works' },
          { name: 'Nicola Lake boat launch', type: 'Tender fill', note: '12 min from townsite' },
        ],
        firstNations: [
          { name: 'Shackan Indian Band', say: 'SHACK-an', contact: 'Emergency Coord. · 250-555-0140' },
          { name: 'Lower Nicola Indian Band', say: 'nih-KOH-lah', contact: 'Band Office · 250-555-0177' },
        ],
        emergency: { rcmp: 'Merritt RCMP · 250-555-0123', fire: 'Merritt Fire · 250-555-0188', hospital: 'Nicola Valley Hospital · 250-555-0199', eoc: 'TNRD EOC · 250-555-0100' },
        employers: ['Tolko Industries (mill)', 'City of Merritt', 'Nicola Valley Institute of Technology'],
        lodging: 'Kamloops — 90 min (nearest available rooms). Base camp staged at Merritt Civic Centre.',
        pins: ['ICP — Merritt Civic Centre', 'Staging — Lower Nicola Rd', 'Water draft — Voght St', 'Helibase — Merritt airport'],
      },
      feed: [
        { type: 'cam', src: 'DriveBC · Hwy 5A', mins: 4, title: 'Highway 5A camera — heavy smoke reducing visibility near Lower Nicola' },
        { type: 'news', src: 'CBC Kamloops', mins: 18, title: 'Merritt placed on evacuation alert as Wasp Lake fire grows overnight to 1,840 hectares' },
        { type: 'facebook', src: 'Nicola Valley Community Group', mins: 31, title: '"Several of us staying to run sprinklers on the ranch — RCMP came through but no one\u2019s forcing us out yet."' },
        { type: 'x', src: '@BCGovFireInfo', mins: 52, title: 'Structure protection specialists deployed to Wasp Lake (K71042). Sprinkler kits being set on 60+ properties.' },
      ],
    },

    // ── Damdochax · near Kispiox ──
    R11904: {
      summary: 'Lightning-caused fire in steep timber NE of Kispiox. No structures on order yet; crews building guard on the south flank to keep it off the Kispiox Valley Rd.',
      lastUpdate: '2026-06-02T12:30:00', ic: 'IC — S. Derrick · Northwest Unit',
      roads: [
        { road: 'Kispiox Valley Rd', status: 'open', note: 'Open — monitor; primary community access' },
        { road: 'Nash FSR', status: 'closed', note: 'Closed — fire ops only' },
      ],
      drive: { from: 'Smithers', time: '1h 50m', via: 'Hwy 16 → Kispiox Valley Rd', note: 'Last fuel at Hazelton' },
      cams: [{ label: 'Kispiox Valley Rd', live: true }],
      gallery: [{ label: 'Smoke column · evening', credit: '@hazelton.bc' }, { label: 'Guard line · south flank', credit: 'BCWS' }],
      alerts: [{ level: 'alert', area: 'Kispiox Valley — 95 properties', issued: '2026-06-01T19:00:00', by: 'RDKS' }],
      response: { crews: 52, machines: 6, helis: 3, tankers: 0, struct: 'Assessing — no SPP deployed yet', personnel: 78 },
      briefer: {
        community: 'Kispiox', population: 720, region: 'Bulkley-Nechako / Skeena',
        water: [{ name: 'Kispiox River — bridge draft', type: 'Draft', note: 'Strong flow, good access' }, { name: 'Hazelton hydrant grid', type: 'Hydrant', note: '25 min south' }],
        firstNations: [{ name: 'Gitxsan (Kispiox / Anspayaxw)', say: 'GIT-san · an-spy-AKW', contact: 'Band Office · 250-555-0260', note: 'Confirm protocol w/ hereditary leadership' }, { name: 'Gitanyow', say: 'git-an-YOW', contact: 'Emergency · 250-555-0271' }],
        emergency: { rcmp: 'Hazelton RCMP · 250-555-0210', fire: 'Hazelton Fire · 250-555-0222', hospital: 'Wrinch Memorial, Hazelton · 25 min · 250-555-0233', eoc: 'RDKS EOC · 250-555-0200' },
        employers: ['Forestry / silviculture contractors', 'Gitxsan Health Society', 'School District 82'],
        lodging: 'Hazelton / New Hazelton — 25 min. Base camp at Kispiox community hall.',
        pins: ['ICP — Kispiox hall', 'Staging — Kispiox Valley Rd km 8', 'Water draft — Kispiox bridge'],
      },
      feed: [
        { type: 'instagram', src: '@hazelton.bc', mins: 120, title: 'Smoke column from the Damdochax fire visible from Kispiox Valley Road this evening' },
        { type: 'news', src: 'CFNR Network', mins: 200, title: 'Kispiox Valley residents on evacuation alert as Damdochax fire holds at 2,650 hectares' },
        { type: 'facebook', src: 'Hazelton & District', mins: 95, title: '"Air quality rough in the valley today — elders being checked on. No one ordered out yet."' },
      ],
    },
  };

  // BCWS public map deep-link (by fire number).
  const bcwsMapUrl = (id) => 'https://wildfiresituation.nrs.gov.bc.ca/map?fireNumber=' + encodeURIComponent(id);

  const detailFor = (id) => DETAIL[id] || null;

  window.WFD = { DETAIL, detailFor, bcwsMapUrl };
})();
