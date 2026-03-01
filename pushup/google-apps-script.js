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
        result = handleLog(data.participant_id, data.date, data.count);
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

  // Append a new row to the Participants sheet
  sheet.appendRow([id, name.trim(), (hall || '').trim(), today]);

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
 * Important design choice: We REPLACE any existing entry for this
 * person + date combination. This way if someone logs 20, then
 * realizes they did 25, they can just submit again.
 */
function handleLog(participantId, date, count) {
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
    // Update existing row (overwrite count and timestamp)
    sheet.getRange(existingRow, 3).setValue(count);  // Column C = count
    sheet.getRange(existingRow, 4).setValue(now);     // Column D = timestamp
  } else {
    // Add new row
    sheet.appendRow([participantId, date, count, now]);
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
