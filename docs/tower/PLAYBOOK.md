# From the Tower: weekly issue playbook

Weekly wildfire intelligence newsletter at https://whistlerbrew.com/tower/ (BETA).
Owner: Mike "Brew" Brew. Readers: wildfire and structure protection crews, FireSmart staff, coordinators, interested public. Smart, tired audience.

## Schedule and window
- Runs Monday morning, Pacific time.
- Covers the 7 days ending the day before the run (Monday to Sunday). Issue slug = the run date, `YYYY-MM-DD`.
- Only items published inside that window. Videos only if uploaded inside that window.

## Sources
- Source list (editable by Brew, the source of truth): Claude Sheets artifact https://claude.ai/artifact/Bom3V3peEr9zevrVThQAUR, sheet "Sources". Columns: Tier, Source, Use for, Type, Link, Feed (RSS), Good for, Checked.
- Read it with the Claude Docs connector (guide topic.sheets, readSheets, readCells). If it cannot be read, use the core list below and say so in the run summary.
- Core list if the Sheet is unreachable: BCWS blog (blog.gov.bc.ca/bcwildfire), BC Gov News Forests and EMCR feeds (news.gov.bc.ca/ministries/forests/feed, .../emergency-management-and-climate-readiness/feed), EmergencyInfoBC, FireSmart BC, UBCM funding updates (ubcm.ca), FNESS, Forest Practices Board, CFJC Today wildfires, Pique, Castanet, The Narwhal, The Tyee; CWFIS national summary (cwfis.cfs.nrcan.gc.ca/en/summary), CIFFC, Canada.ca news, provincial agencies, Cabin Radio; NIFC (incl. the monthly North American outlook PDF), US Wildland Fire Service (doi.gov/wildlandfireservice), Wildland Fire Lessons Learned Center, IBHS, NIST WUI, Wildfire Today; AFAC, EFFIS/GWIS, Carbon Brief, Mongabay fires.
- Also run open web searches for the window: BC wildfire, FireSmart, Canada wildfire, wildfire study, wildfire report/review.
- Priority: BC first, Canada second, US third, Global last.

## What goes in
Three kinds of item, tagged on the page:
- **News**: what happened.
- **Decision**: funding, policy, legislation, agency changes, deadlines.
- **Learning**: research, after-action reviews, investigations, lessons learned.
- **Outlook**: seasonal/fire-weather outlooks (use sparingly).
Prioritise threats to people, structures, communities and infrastructure; then decisions with deadlines; then learning.

## Accuracy rules (non-negotiable)
- Never invent facts, numbers, dates, quotes, URLs or image URLs. Every item links to the page it came from.
- Open (fetch) every page you take a number or date from. Search snippets are leads, not sources. If an item rests only on a snippet, either open it or drop it.
- Fire counts matter to readers. Give the as-of date and the source. Explain what "active" means (full response vs modified vs monitored) when the count could alarm. If a provincial breakdown is not available, say so. Off season: keep counts general rather than precise-and-unexplained.
- Flag anything not verified in the text ("not confirmed").
- Tragedies (fatalities, injuries) are written straight: no humour, no wordplay. Name the fallen only if the official source names them.
- Never use a photo showing a body, a casualty or grief close-up.

## Voice
Confident, direct, calm, dry. Respectful humour; no fluff, no sensationalism. A motivated firefighter after two coffees. Carry it through every section, not just the summary. Short sentences. No em dashes. Avoid AI-slop words (delve, robust, leverage, utilize, comprehensive, crucial).
Headlines can have a dry edge ("Pear Lake is out. The hillsides are just getting started."). Body text stays factual.

## Layout
Copy `docs/tower/template.html` (the Nov 17, 2026 issue) and keep its structure, CSS and palette exactly. Sections in order:
1. Masthead (logo `/tower/logo.png`, brand line, date range), yellow BETA + "Written by AI" strip.
2. The short version: 5 numbered one-to-two sentence lines, most important first.
3. British Columbia: a lead item with a full-width photo, then 2 to 4 items (thumbnail beside text where a photo exists).
4. Canada: stat blocks (3 numbers) when there are good numbers, then items.
5. United States.
6. Global.
7. New learning (dark block): 2 to 5 research/review items.
8. On the screen: videos uploaded in the window, 2 across, thumbnail `https://i.ytimg.com/vi/<id>/mqdefault.jpg`, channel, length, date, tier tag.
9. Footer.
- Empty section: one dry line saying nothing new, or drop it. Never pad.
- Palette: charcoal #1E1E1E, red #B3261E, light grey #E4E4E4, off-white #FAFAF9, yellow #F8C329 (sparingly). Fonts: Neuzeit, then Arial.
- Every story and video gets the "Useful | Report" links exactly as in the template (they are placeholders until the vote endpoint exists).

## Images
- Use the article's lead image (og:image) as a remote `<img src>`, with a caption and credit. Prefer agency photos (BCWS, governments, research bodies).
- Never invent an image URL. If none is found, use a stat block, table, or text-only item.

## Videos
- Search YouTube with the upload-date filter set to "this week" (YouTube results URL with `sp=EgQIAxAB`), queries such as: wildfire OR wildland fire OR FireSmart; BC wildfire service OR FireSmart BC; wildland firefighter OR prescribed fire OR structure protection.
- Keep only videos clearly about wildfire practice, policy, research or communities. Drop music, games, clickbait, AI slop, unrelated "wildfire" titles.
- Up to 6 videos. Prefer channels on the keep list in `docs/tower/channels.md`; drop channels on its cut list.
- Append every channel used to `docs/tower/channels.md` under "Seen" with the issue date.

## Review mode (on until Brew turns it off)
Brew reviews each issue before it goes live. So the run:
1. Builds the issue files and commits them locally, but does not push.
2. Sends Brew the issue HTML as a file in the session, plus the run summary, and a push notification that the draft is ready.
3. Stops and waits. Publish (steps below) only after Brew replies "publish" in the session. Apply any fixes he asks for first.
To turn review mode off, Brew says so and this section is deleted.

## Publishing
1. Write `public/tower/YYYY-MM-DD/index.html` and copy it to `public/tower/index.html`.
2. In `public/tower/archive/index.html`, insert a new `<li>` directly after `<!-- ISSUES -->` (newest first) with the date range and a one-line teaser.
3. Do not touch other folders. Do not edit `next.config.ts` (the dated-issue redirect already covers new dates).
4. Commit with message `From the Tower: issue YYYY-MM-DD` and push to `main`. Cloudflare Pages deploys in a few minutes.
5. Verify `https://whistlerbrew.com/tower/?v=<random>` shows the new date range (WebFetch). Report the result.

## Run summary (end of every run)
- Link to the live issue.
- Number of items per section, and anything left out and why.
- Every claim marked not confirmed.
- Any source in the Sheet that failed to load (so Brew can prune it).
