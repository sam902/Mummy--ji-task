/**
 * Mummy Ji & Pandit Beta Ji — Parivaar Tasks : SYNC BACKEND
 * -------------------------------------------------------------
 * Stores the shared task data as one JSON file in YOUR Google Drive
 * (auto-created, named "mummyji_data.json"). Every phone that points
 * at this web app reads and writes the same file, so they stay in sync.
 *
 * DEPLOY (one time):
 *   1. Go to script.new  (or script.google.com → New project)
 *   2. Delete everything, paste this whole file, Save.
 *   3. Deploy → New deployment → gear icon → Web app
 *        Description:      Mummy Ji Sync
 *        Execute as:       Me
 *        Who has access:   Anyone
 *      → Deploy → Authorize (Advanced → Go to project → Allow)
 *   4. Copy the Web app URL (ends in /exec).
 *   5. Open the app on each phone → tap ⚙ (top right) → paste that URL.
 *
 * When you change THIS code later: Deploy → Manage deployments →
 * pencil → Version: New version → Deploy (keeps the same URL).
 */

var FILE_NAME = 'mummyji_data.json';

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'load';
  if (action === 'rev') return json_({ rev: loadData_().rev });
  return json_(loadData_());
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
  if (body.action === 'save') return json_(saveData_(body));
  return json_(loadData_());
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFile_() {
  var it = DriveApp.getFilesByName(FILE_NAME);
  if (it.hasNext()) return it.next();
  return DriveApp.createFile(FILE_NAME, JSON.stringify({ rev: 0, tasks: [] }), 'application/json');
}

function loadData_() {
  try {
    var data = JSON.parse(getFile_().getBlob().getDataAsString() || '{"rev":0,"tasks":[]}');
    if (typeof data.rev !== 'number') data.rev = 0;
    if (!Array.isArray(data.tasks)) data.tasks = [];
    return data;
  } catch (err) {
    return { rev: 0, tasks: [] };
  }
}

function writeData_(data) {
  getFile_().setContent(JSON.stringify(data));
}

/**
 * Saves only if the sender's rev matches what's on the server.
 * If it doesn't match, another phone saved first — we return the
 * current data so the app can merge and retry (no data is lost).
 */
function saveData_(body) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, busy: true }; }
  try {
    var cur = loadData_();
    if (typeof body.rev === 'number' && body.rev !== cur.rev) {
      return { ok: false, conflict: true, rev: cur.rev, tasks: cur.tasks };
    }
    var next = { rev: (cur.rev || 0) + 1, tasks: Array.isArray(body.tasks) ? body.tasks : [] };
    writeData_(next);
    return { ok: true, rev: next.rev, tasks: next.tasks };
  } finally {
    lock.releaseLock();
  }
}
