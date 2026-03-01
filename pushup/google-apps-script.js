/**
 * =====================================================
 * PUSHUP CHALLENGE — Google Apps Script Backend
 * =====================================================
 *
 * HOW THIS WORKS:
 * This script runs inside Google Sheets. When you "Deploy as Web App",
 * Google gives you a URL. The webpage calls that URL to read/write data.
 *
 * Think of it like a mini server that lives inside your spreadsheet.
 * - doGet() handles requests that READ data (like loading the schedule)
 * - doPost() handles requests that WRITE data (like logging pushups)
 *
 * SETUP: See SETUP.md for step-by-step instructions.
 * =====================================================
 */

// ==========================================
// CONFIGURATION — Update these if you rename sheets
// ==========================================
const SCHEDULE_SHEET = 'Schedule';
const PARTICIPANTS_SHEET = 'Participants';
const LOG_SHEET = 'Log';
const ROAST_SHEET = 'Roast';
const PRAISE_SHEET = 'Praise';
const HYPE_SHEET = 'Hype';
const SHAME_SHEET = 'Shame';

// ==========================================
// CHIRP DATA — Embedded for lazy tab creation
// Tabs are created from this data on first chirps request.
// Edit the sheet tabs directly to customise messages.
// ==========================================
const CHIRP_SEED = {
  Roast: [
    "{name} thinks pushups are optional. The floor disagrees.",
    "{name} \u2014 even the station cat has better form than your excuses \ud83d\udc31",
    "{name}'s pushup count is lower than the WiFi signal at Hall 3",
    "Dispatch to {name}: your pushup deficit has been reported \ud83d\udcdf",
    "{name} is treating this challenge like a suggestion",
    "{name} \u2014 the ground misses you. Visit it more often.",
    "{name}'s arms filed a missing persons report",
    "Someone check on {name}. Haven't seen them near the floor in days.",
    "{name} heard 'push up' and pushed up from the couch",
    "{name}'s pushup strategy: thoughts and prayers \ud83d\ude4f",
    "{name} is out here doing zero reps and maximum excuses",
    "{name} \u2014 the probies are outworking you right now",
    "{name} bringing big 'I'll start Monday' energy",
    "{name}'s deficit is bigger than the apparatus bay",
    "{name} \u2014 your SCBA gets more of a workout than your arms",
    "{name} thinks 'banking pushups' means saving them for retirement",
    "{name} is on the express route to the Wall of Shame",
    "Breaking: {name} spotted doing pushups. Just kidding.",
    "{name}'s arms called. They want to know what's going on.",
    "{name} \u2014 even a wet hose has more push than you right now",
    "{name} is proof that showing up is only half the battle",
    "{name} entered the challenge and chose violence\u2026 against their own score",
    "{name}'s daily pushup count fits on a Post-it note",
    "{name} \u2014 the only thing you're pushing is your luck",
    "{name} has more rest days than the schedule allows",
    "{name}'s pushup form: lying face down and hoping for the best",
    "{name} is in a committed relationship with zero reps",
    "{name} \u2014 somewhere a set of pushups is waiting and crying",
    "{name}'s arms are on stress leave",
    "{name} approaches pushups like a structure fire \u2014 avoid at all costs",
    "{name} \u2014 your pushup count and your ambition have something in common: both are low",
    "{name} is speedrunning last place",
    "{name} put the 'rest' in 'fire service'",
    "{name} \u2014 the only rep you're doing is reputation damage",
    "{name} is living proof that peer pressure doesn't always work",
    "{name}'s contribution to the team: moral support from the sidelines",
    "{name} heard 'drop and give me 20' and negotiated it down to 0",
    "{name} \u2014 at this rate the challenge will finish before you do",
    "{name} treats pushup day like it's optional training",
    "{name}'s arms have filed for a transfer to a different department",
    "{name} is giving main character energy \u2014 if the main character never shows up",
    "{name} \u2014 the floor called. It's lonely."
  ],
  Praise: [
    "{name} is absolutely on fire right now \ud83d\udd25",
    "{name} didn't come to play \u2014 they came to WORK \ud83d\udcaa",
    "Someone check on {name}'s crew \u2014 they're carrying the whole hall",
    "{name} is making this look way too easy",
    "{name} woke up and chose pushups. Respect.",
    "{name} is built different. The leaderboard confirms it.",
    "{name} is treating the floor like it owes them money",
    "{name} \u2014 certified machine. No days off.",
    "{name} is the reason the rest of you should be worried",
    "Shoutout to {name} \u2014 setting the standard \ud83c\udfc6",
    "{name} is out here making the schedule look light",
    "{name} doesn't bank pushups \u2014 they invest them",
    "{name} eats big days for breakfast",
    "{name} has more pushups than excuses. Take notes.",
    "{name} \u2014 the floor knows your name and it's scared",
    "{name} showing everyone how it's done. Legend.",
    "{name} is running away with this thing \ud83c\udfc3\u200d\u2642\ufe0f\ud83d\udca8",
    "{name} just keeps stacking. Unreal.",
    "{name} \u2014 if pushups were currency you'd be retired",
    "{name} is what happens when you actually show up every day",
    "{name} is proving that consistency beats everything",
    "{name} \u2014 your crew should be buying you coffee",
    "{name} out here doing pushups like it's their primary job",
    "{name} is the MVP your hall doesn't deserve",
    "{name} \u2014 when they said 'go hard or go home' you chose violence",
    "{name} is proof that firefighters are built different \ud83d\udd25",
    "{name} \u2014 your consistency is motivating the entire crew",
    "{name} just keeps showing up. That's the whole secret.",
    "{name} \u2014 absolute unit. The leaderboard respects you.",
    "{name} making the rest of the crew look like they're on vacation",
    "{name} is what leadership looks like \u2014 from the front",
    "{name} \u2014 the bell doesn't ring itself and neither do those reps",
    "{name} is outworking everyone and making it look casual",
    "{name} \u2014 respect earned one pushup at a time",
    "{name} is the benchmark. Everyone else is playing catch-up."
  ],
  Hype: [
    "{name} just banked {bank} extra. That's how leaders operate.",
    "{name} is +{bank} ahead. Building a fortress of pushups.",
    "{name} has {bank} in the bank. Sleep well tonight.",
    "{name} with a surplus of {bank}. Future-proofing like a pro.",
    "{name} banked {bank} \u2014 big day? What big day?",
    "{name} is +{bank} and building momentum every day",
    "{name} with {bank} banked \u2014 big day won't know what hit it",
    "{name} \u2014 +{bank} means you earned that rest day guilt-free",
    "{name} is sitting on +{bank}. That's called being prepared.",
    "{name} has +{bank} in reserve. The big days don't scare them.",
    "{name} \u2014 +{bank} banked and still grinding. Relentless.",
    "{name} just stacked {bank} extra. That's compound interest on effort.",
    "{name} is +{bank} deep. The schedule can't touch them."
  ],
  Shame: [
    "{name} is {deficit} behind. The clock is ticking \u23f0",
    "{name} owes {deficit} pushups. The floor remembers.",
    "{name} \u2014 your deficit of {deficit} is showing",
    "{name} is down {deficit}. Time to put in some overtime.",
    "{name} needs {deficit} pushups just to break even. Better start now.",
    "{name} is {deficit} in the red. Even the probie is ahead of you.",
    "{name}'s deficit: {deficit}. That's a lot of catching up.",
    "{name} \u2014 {deficit} pushups behind is not a strategy",
    "{name} has a {deficit} pushup debt. Payments are due immediately.",
    "{name}'s bank balance: -{deficit}. The auditor is concerned.",
    "{name} is {deficit} behind. The big day is coming and it does not care.",
    "{name} \u2014 {deficit} deficit. Your future self is not impressed.",
    "{name} needs to find {deficit} pushups somewhere. Check the couch cushions.",
    "{name}'s arms owe the challenge {deficit} pushups. Pay up.",
    "{name} \u2014 at -{deficit} you're not in a hole you're in a basement",
    "Alert: {name} is {deficit} pushups behind. Rescue team en route.",
    "{name} owes {deficit}. Interest is accumulating daily.",
    "{name}'s deficit of {deficit} is now visible from the truck.",
    "{name} is {deficit} in the hole. Someone throw a ladder.",
    "{name} is down {deficit}. That's not a bank balance that's a cry for help."
  ]
};

// ==========================================
// doGet — Handles all READ requests
// ==========================================
// The browser sends a GET request with an "action" parameter.
// Based on the action, we return different data.
function doGet(e) {
  try {
    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'init':
        // Called when the page first loads.
        // Returns the schedule + participant list + optionally one person's log.
        result = handleInit(e.parameter.participant_id);
        break;

      case 'leaderboard':
        // Returns aggregated stats for the leaderboard display.
        result = handleLeaderboard();
        break;

      case 'chirps':
        // Returns 5-8 personalised chirp messages for the ticker.
        result = handleChirps();
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }

    // Return data as JSON (the universal format for web APIs)
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// doPost — Handles all WRITE requests
// ==========================================
// The browser sends a POST request when submitting data.
function doPost(e) {
  try {
    // Parse the incoming data (sent as JSON from the browser)
    const data = JSON.parse(e.postData.contents);
    let result;

    switch (data.action) {
      case 'register':
        // A new person is signing up
        result = handleRegister(data.name, data.hall);
        break;

      case 'log':
        // Someone is logging their pushups
        result = handleLog(data.participant_id, data.date, data.count, data.mode);
        break;

      case 'update_hall':
        // A returning participant is setting their hall for the first time
        result = handleUpdateHall(data.participant_id, data.hall);
        break;

      default:
        result = { error: 'Unknown action: ' + data.action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// HANDLER FUNCTIONS
// ==========================================

/**
 * handleInit — Returns everything needed to load the page
 *
 * This is called once when someone opens the page. It grabs:
 * 1. The full pushup schedule (so the page knows daily targets)
 * 2. All participants (for the dropdown selector)
 * 3. If a participant_id is provided, their personal log entries
 */
function handleInit(participantId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Get Schedule ---
  // Reads every row from the Schedule sheet and converts to an array of objects
  const scheduleSheet = ss.getSheetByName(SCHEDULE_SHEET);
  const scheduleData = scheduleSheet.getDataRange().getValues();
  const scheduleHeaders = scheduleData[0]; // First row = column headers
  const schedule = [];

  for (let i = 1; i < scheduleData.length; i++) {
    const row = scheduleData[i];
    if (!row[0]) continue; // Skip empty rows

    schedule.push({
      date: formatDate(row[0]),  // Convert date to YYYY-MM-DD string
      target: Number(row[1]),     // Daily pushup target
      label: row[2] || ''         // Optional label like "big day" or "recovery"
    });
  }

  // --- Get Participants ---
  const participantsSheet = ss.getSheetByName(PARTICIPANTS_SHEET);
  const participantsData = participantsSheet.getDataRange().getValues();
  const participants = [];

  for (let i = 1; i < participantsData.length; i++) {
    const row = participantsData[i];
    if (!row[0]) continue;

    participants.push({
      id: String(row[0]),
      name: row[1],
      hall: row[2] || '',
      joined: formatDate(row[3])
    });
  }

  // --- Get this person's log (if they're logged in) ---
  let log = [];
  if (participantId) {
    log = getParticipantLog(participantId);
  }

  return {
    success: true,
    schedule: schedule,
    participants: participants,
    log: log
  };
}

/**
 * handleRegister — Creates a new participant
 *
 * Generates a unique ID (using timestamp + random number),
 * then adds a new row to the Participants sheet.
 */
function handleRegister(name, hall) {
  if (!name) {
    return { error: 'Name is required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PARTICIPANTS_SHEET);

  // Create a unique ID: timestamp + 4 random digits
  // This avoids conflicts even if two people register at the same time
  const id = Date.now() + '-' + Math.floor(Math.random() * 10000);

  const today = formatDate(new Date());

  // Write row using setValues (not appendRow) so the date column
  // respects the '@' plain-text format and isn't auto-converted to a Date object.
  const partLastRow = sheet.getLastRow() + 1;
  sheet.getRange(partLastRow, 4).setNumberFormat('@');
  sheet.getRange(partLastRow, 1, 1, 4).setValues([[id, name.trim(), (hall || '').trim(), today]]);

  return {
    success: true,
    participant: {
      id: id,
      name: name.trim(),
      hall: (hall || '').trim(),
      joined: today
    }
  };
}

/**
 * handleUpdateHall — Updates a participant's fire hall
 *
 * Used when a pre-loaded participant logs in for the first time
 * and needs to select their hall.
 */
function handleUpdateHall(participantId, hall) {
  if (!participantId || !hall) {
    return { error: 'participant_id and hall are required' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PARTICIPANTS_SHEET);
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(participantId)) {
      sheet.getRange(i + 1, 3).setValue(hall.trim()); // Column C = hall
      return {
        success: true,
        participant: {
          id: String(data[i][0]),
          name: data[i][1],
          hall: hall.trim(),
          joined: formatDate(data[i][3])
        }
      };
    }
  }

  return { error: 'Participant not found' };
}

/**
 * handleLog — Records pushups for a specific date
 *
 * mode = 'add' (default): adds count to any existing entry (for logging sets)
 * mode = 'set': replaces count entirely (for correcting mistakes via Edit total)
 */
function handleLog(participantId, date, count, mode) {
  if (!participantId || !date || count === undefined) {
    return { error: 'participant_id, date, and count are required' };
  }

  count = Number(count);
  if (count < 0) {
    return { error: 'Count must be 0 or more' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOG_SHEET);
  const data = sheet.getDataRange().getValues();

  // Check if there's already an entry for this person + date
  // If so, update it instead of creating a duplicate
  let existingRow = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(participantId) && formatDate(data[i][1]) === date) {
      existingRow = i + 1; // +1 because sheets are 1-indexed
      break;
    }
  }

  const now = new Date().toISOString();

  if (existingRow > 0) {
    // mode='set' replaces (Edit total / fix mistakes); default adds (logging sets)
    const existingCount = Number(data[existingRow - 1][2]);
    const newCount = (mode === 'set') ? count : existingCount + count;
    sheet.getRange(existingRow, 3).setValue(newCount); // Column C = count
    sheet.getRange(existingRow, 4).setValue(now);      // Column D = timestamp
  } else {
    // Write row using setValues (not appendRow) — appendRow ignores the '@' format
    // on column B and auto-converts YYYY-MM-DD strings to Date objects, which then
    // shift back 1 day when read in America/Vancouver (UTC-8) via formatDate().
    const logLastRow = sheet.getLastRow() + 1;
    sheet.getRange(logLastRow, 2).setNumberFormat('@');
    sheet.getRange(logLastRow, 1, 1, 4).setValues([[participantId, date, count, now]]);
  }

  // Return updated log for this person so the page can refresh
  const log = getParticipantLog(participantId);

  return {
    success: true,
    log: log
  };
}

/**
 * handleLeaderboard — Calculates rankings for everyone
 *
 * For each person, we figure out:
 * - Total pushups they've done
 * - Total pushups they should have done (based on schedule up to today)
 * - Their "bank" (surplus or deficit)
 *
 * For each hall, we average the bank across all members.
 */
function handleLeaderboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get all the data we need
  const schedule = getScheduleAsMap();    // date → target
  const participants = getAllParticipants();
  const allLogs = getAllLogs();

  const today = formatDate(new Date());

  // Calculate total required through today
  // (Sum of all daily targets from start through today)
  let totalRequiredToday = 0;
  for (const [date, target] of Object.entries(schedule)) {
    if (date <= today) {
      totalRequiredToday += target;
    }
  }

  // --- Individual stats ---
  const individualStats = [];
  // hallStats will group people by fire hall
  const hallGroups = {};

  for (const p of participants) {
    // Sum up this person's logged pushups
    const personLogs = allLogs.filter(l => l.participant_id === p.id);
    const totalDone = personLogs.reduce((sum, l) => sum + l.count, 0);

    // Calculate how many they should have done since they joined
    let requiredSinceJoin = 0;
    for (const [date, target] of Object.entries(schedule)) {
      if (date >= p.joined && date <= today) {
        requiredSinceJoin += target;
      }
    }

    const bank = totalDone - requiredSinceJoin;

    const stat = {
      id: p.id,
      name: p.name,
      hall: p.hall || 'Unassigned',
      totalDone: totalDone,
      totalRequired: requiredSinceJoin,
      bank: bank
    };
    individualStats.push(stat);

    // Group by hall for hall leaderboard
    const hallKey = p.hall || 'Unassigned';
    if (!hallGroups[hallKey]) {
      hallGroups[hallKey] = [];
    }
    hallGroups[hallKey].push(stat);
  }

  // --- Hall stats (averaged) ---
  const hallStats = [];
  for (const [hall, members] of Object.entries(hallGroups)) {
    const totalPushups = members.reduce((sum, m) => sum + m.totalDone, 0);
    const avgBank = members.reduce((sum, m) => sum + m.bank, 0) / members.length;

    hallStats.push({
      hall: hall,
      memberCount: members.length,
      totalPushups: totalPushups,
      avgBank: Math.round(avgBank),  // Round to nearest whole number
      avgPushups: Math.round(totalPushups / members.length)
    });
  }

  // Sort: individuals by bank (highest first), halls by avgBank (highest first)
  individualStats.sort((a, b) => b.bank - a.bank);
  hallStats.sort((a, b) => b.avgBank - a.avgBank);

  return {
    success: true,
    individual: individualStats,
    halls: hallStats,
    totalRequiredToday: totalRequiredToday
  };
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * getParticipantLog — Gets all log entries for one person
 */
function getParticipantLog(participantId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOG_SHEET);
  const data = sheet.getDataRange().getValues();
  const logs = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(participantId)) {
      logs.push({
        date: formatDate(data[i][1]),
        count: Number(data[i][2]),
        logged_at: data[i][3]
      });
    }
  }

  return logs;
}

/**
 * getScheduleAsMap — Returns schedule as { "2026-03-02": 80, ... }
 * Makes it easy to look up the target for any date.
 */
function getScheduleAsMap() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SCHEDULE_SHEET);
  const data = sheet.getDataRange().getValues();
  const map = {};

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    map[formatDate(data[i][0])] = Number(data[i][1]);
  }

  return map;
}

/**
 * getAllParticipants — Returns array of all participants
 */
function getAllParticipants() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(PARTICIPANTS_SHEET);
  const data = sheet.getDataRange().getValues();
  const participants = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    participants.push({
      id: String(data[i][0]),
      name: data[i][1],
      hall: data[i][2] || '',
      joined: formatDate(data[i][3])
    });
  }

  return participants;
}

/**
 * getAllLogs — Returns every log entry for everyone
 */
function getAllLogs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(LOG_SHEET);
  const data = sheet.getDataRange().getValues();
  const logs = [];

  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    logs.push({
      participant_id: String(data[i][0]),
      date: formatDate(data[i][1]),
      count: Number(data[i][2])
    });
  }

  return logs;
}

/**
 * formatDate — Converts any date to "YYYY-MM-DD" string
 *
 * Google Sheets stores dates as Date objects internally.
 * We need a consistent string format so comparisons work.
 * Using the spreadsheet's timezone ensures dates don't shift.
 */
function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') {
    // If it already looks like YYYY-MM-DD, return it
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0, 10);
    d = new Date(d);
  }
  // Use Utilities.formatDate with the spreadsheet timezone
  // This prevents timezone offset issues
  return Utilities.formatDate(new Date(d), SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
}

// ==========================================
// CHIRP HANDLERS
// ==========================================

/**
 * handleChirps — Builds 5-8 personalised chirp messages for the ticker.
 * Rules:
 *   Roast  → bottom 3 active participants (lowest bank)
 *   Praise → top 3 active participants (highest bank)
 *   Hype   → anyone with positive bank, fills {bank}
 *   Shame  → anyone with negative bank, fills {deficit}
 * Only participants with >0 total pushups are eligible.
 */
function handleChirps() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureChirpTabs(ss);

  // Get active participants with stats
  const participants = getAllParticipants();
  const allLogs = getAllLogs();
  const schedule = getScheduleAsMap();
  const today = formatDate(new Date());

  const stats = participants.map(function(p) {
    const personLogs = allLogs.filter(function(l) { return l.participant_id === p.id; });
    const totalDone = personLogs.reduce(function(sum, l) { return sum + l.count; }, 0);
    var requiredSinceJoin = 0;
    for (var date in schedule) {
      if (date >= p.joined && date <= today) requiredSinceJoin += schedule[date];
    }
    return { name: p.name, totalDone: totalDone, bank: totalDone - requiredSinceJoin };
  }).filter(function(p) { return p.totalDone > 0; });

  if (stats.length === 0) return { success: true, chirps: [] };

  stats.sort(function(a, b) { return b.bank - a.bank; });

  var roastMsgs  = readChirpTab(ss, ROAST_SHEET);
  var praiseMsgs = readChirpTab(ss, PRAISE_SHEET);
  var hypeMsgs   = readChirpTab(ss, HYPE_SHEET);
  var shameMsgs  = readChirpTab(ss, SHAME_SHEET);

  var top3     = stats.slice(0, Math.min(3, stats.length));
  var bottom3  = stats.slice(Math.max(0, stats.length - 3)).reverse();
  var positive = stats.filter(function(p) { return p.bank > 0; });
  var negative = stats.filter(function(p) { return p.bank < 0; });

  var chirps = [];

  // Always include at least one praise and one roast if possible
  if (praiseMsgs.length > 0 && top3.length > 0) {
    chirps.push({ text: fillChirp(pickRandom(praiseMsgs), pickRandom(top3)), type: 'praise' });
  }
  if (roastMsgs.length > 0 && bottom3.length > 0) {
    chirps.push({ text: fillChirp(pickRandom(roastMsgs), pickRandom(bottom3)), type: 'roast' });
  }
  // Add hype and shame for those with non-zero bank
  if (hypeMsgs.length > 0 && positive.length > 0) {
    chirps.push({ text: fillChirp(pickRandom(hypeMsgs), pickRandom(positive)), type: 'hype' });
  }
  if (shameMsgs.length > 0 && negative.length > 0) {
    chirps.push({ text: fillChirp(pickRandom(shameMsgs), pickRandom(negative)), type: 'shame' });
  }
  // Pad to 5-8 total with mix of praise/roast on different people
  var attempts = 0;
  while (chirps.length < 6 && attempts < 20) {
    attempts++;
    var roll = Math.random();
    if (roll < 0.35 && praiseMsgs.length > 0 && top3.length > 0) {
      var candidate = { text: fillChirp(pickRandom(praiseMsgs), pickRandom(top3)), type: 'praise' };
      if (!chirps.some(function(c) { return c.text === candidate.text; })) chirps.push(candidate);
    } else if (roll < 0.65 && roastMsgs.length > 0 && bottom3.length > 0) {
      var candidate = { text: fillChirp(pickRandom(roastMsgs), pickRandom(bottom3)), type: 'roast' };
      if (!chirps.some(function(c) { return c.text === candidate.text; })) chirps.push(candidate);
    } else if (roll < 0.82 && hypeMsgs.length > 0 && positive.length > 0) {
      var candidate = { text: fillChirp(pickRandom(hypeMsgs), pickRandom(positive)), type: 'hype' };
      if (!chirps.some(function(c) { return c.text === candidate.text; })) chirps.push(candidate);
    } else if (shameMsgs.length > 0 && negative.length > 0) {
      var candidate = { text: fillChirp(pickRandom(shameMsgs), pickRandom(negative)), type: 'shame' };
      if (!chirps.some(function(c) { return c.text === candidate.text; })) chirps.push(candidate);
    }
  }

  return { success: true, chirps: shuffleArray(chirps) };
}

/**
 * ensureChirpTabs — Creates Roast/Praise/Hype/Shame tabs if they don't exist yet.
 * Populated from the CHIRP_SEED data embedded in the script.
 * After creation the tabs can be edited freely in the sheet.
 */
function ensureChirpTabs(ss) {
  var tabs = [ROAST_SHEET, PRAISE_SHEET, HYPE_SHEET, SHAME_SHEET];
  tabs.forEach(function(tabName) {
    if (!ss.getSheetByName(tabName)) {
      var sheet = ss.insertSheet(tabName);
      var msgs = CHIRP_SEED[tabName];
      var rows = [['message']].concat(msgs.map(function(m) { return [m]; }));
      sheet.getRange(1, 1, rows.length, 1).setValues(rows);
    }
  });
}

/**
 * readChirpTab — Reads all message rows from a chirp tab.
 * Falls back to CHIRP_SEED if the tab is empty or missing.
 */
function readChirpTab(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return CHIRP_SEED[tabName] || [];
  var data = sheet.getDataRange().getValues();
  var msgs = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) msgs.push(String(data[i][0]));
  }
  return msgs.length > 0 ? msgs : (CHIRP_SEED[tabName] || []);
}

/** fillChirp — Replaces {name}, {bank}, {deficit} placeholders */
function fillChirp(template, person) {
  var deficit = person.bank < 0 ? Math.abs(person.bank) : 0;
  var bank    = person.bank > 0 ? person.bank : 0;
  return template
    .replace(/\{name\}/g,    person.name)
    .replace(/\{bank\}/g,    bank)
    .replace(/\{deficit\}/g, deficit);
}

/** pickRandom — Returns a random element from an array */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** shuffleArray — Fisher-Yates shuffle */
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

// ==========================================
// SETUP HELPER — Run this once to create sheets
// ==========================================
/**
 * Run this function ONCE from the Apps Script editor.
 * It creates the three sheets with the correct headers
 * and populates March 2026 schedule + pre-loaded participants.
 *
 * To run: Click the function dropdown → select "setupSheets" → click Run
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Create Schedule sheet ---
  let schedSheet = ss.getSheetByName(SCHEDULE_SHEET);
  if (!schedSheet) {
    schedSheet = ss.insertSheet(SCHEDULE_SHEET);
  }
  schedSheet.clear();

  // Set column A to plain text BEFORE inserting, so Sheets never auto-converts
  // date strings to Date objects (which would shift by -8h in Pacific time).
  schedSheet.getRange('A:A').setNumberFormat('@');

  const march = [
    ['2026-03-02', 80, ''],
    ['2026-03-03', 65, ''],
    ['2026-03-04', 45, 'recovery'],
    ['2026-03-05', 145, ''],
    ['2026-03-06', 115, ''],
    ['2026-03-07', 200, 'big day'],
    ['2026-03-08', 0, 'REST'],
    ['2026-03-09', 100, ''],
    ['2026-03-10', 85, ''],
    ['2026-03-11', 70, 'recovery'],
    ['2026-03-12', 155, ''],
    ['2026-03-13', 125, ''],
    ['2026-03-14', 110, ''],
    ['2026-03-15', 0, 'REST'],
    ['2026-03-16', 95, ''],
    ['2026-03-17', 80, ''],
    ['2026-03-18', 220, 'big day'],
    ['2026-03-19', 170, ''],
    ['2026-03-20', 235, 'big day'],
    ['2026-03-21', 135, ''],
    ['2026-03-22', 0, 'REST'],
    ['2026-03-23', 120, ''],
    ['2026-03-24', 100, ''],
    ['2026-03-25', 85, 'recovery'],
    ['2026-03-26', 180, ''],
    ['2026-03-27', 145, ''],
    ['2026-03-28', 250, 'big day'],
    ['2026-03-29', 0, 'REST'],
    ['2026-03-30', 125, ''],
    ['2026-03-31', 110, ''],
  ];

  // Write header + data in one batch (prevents type auto-detection on append)
  const schedData = [['date', 'target', 'label'], ...march];
  schedSheet.getRange(1, 1, schedData.length, 3).setValues(schedData);

  // --- Create Participants sheet ---
  let partSheet = ss.getSheetByName(PARTICIPANTS_SHEET);
  if (!partSheet) {
    partSheet = ss.insertSheet(PARTICIPANTS_SHEET);
  }
  partSheet.clear();

  // Set column D (joined) to plain text
  partSheet.getRange('D:D').setNumberFormat('@');

  const partData = [
    ['id', 'name', 'hall', 'joined'],
    ['pre-1',  'Will Brookes',       '', '2026-03-01'],
    ['pre-2',  'Andy Lawrence',      '', '2026-03-01'],
    ['pre-3',  'Joe Knight',         '', '2026-03-01'],
    ['pre-4',  'Ken Roberts',        '', '2026-03-01'],
    ['pre-5',  'Owen Guthrie',       '', '2026-03-01'],
    ['pre-6',  'Andrew Tress',       '', '2026-03-01'],
    ['pre-7',  'Paul Van Den Berg',  '', '2026-03-01'],
    ['pre-8',  'JD McLean',          '', '2026-03-01'],
    ['pre-9',  'Gavin Reed',         '', '2026-03-01'],
    ['pre-10', 'Lana Charlebois',    '', '2026-03-01'],
    ['pre-11', 'Emily Wood',         '', '2026-03-01'],
    ['pre-12', 'Keren Wareham',      '', '2026-03-01'],
    ['pre-13', 'Ryan Donohue',       '', '2026-03-01'],
    ['pre-14', "Cormac O'Brien",     '', '2026-03-01'],
    ['pre-15', 'Brew',               '', '2026-03-01'],
  ];
  partSheet.getRange(1, 1, partData.length, 4).setValues(partData);

  // --- Create Log sheet ---
  let logSheet = ss.getSheetByName(LOG_SHEET);
  if (!logSheet) {
    logSheet = ss.insertSheet(LOG_SHEET);
  }
  logSheet.clear();

  // Keep Log date column as plain text too
  logSheet.getRange('B:B').setNumberFormat('@');
  logSheet.getRange(1, 1, 1, 4).setValues([['participant_id', 'date', 'count', 'logged_at']]);

  // Clean up default Sheet1 if empty
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && sheet1.getDataRange().getValues().length <= 1) {
    ss.deleteSheet(sheet1);
  }

  Logger.log('Setup complete!');
}
