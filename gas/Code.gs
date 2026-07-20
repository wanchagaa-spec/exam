/**
 * หลังบ้านเว็บไซต์ "ข้อสอบ" — Google Apps Script
 *
 * รองรับ: สมัคร/ล็อกอินสมาชิก, สุ่มข้อสอบจากคลังใหญ่ + จับเวลา + ตรวจให้คะแนน,
 *          ฟอร์มติดต่อ (ส่งอีเมล), พื้นที่แสดงความเห็น
 *
 * ⚠ ไฟล์นี้คือที่เก็บเฉลยข้อสอบ ห้ามคัดลอกคอลัมน์ "answer" ไปไว้ในหน้าเว็บเด็ดขาด
 *   หน้าเว็บขอชุดคำถามจากที่นี่ (ไม่มีเฉลยติดไปด้วย) แล้วส่งคำตอบกลับมาให้เซิร์ฟเวอร์ตรวจ
 *
 * วิธีตั้งค่า (ดูรายละเอียดเต็มใน README.md):
 *   1. สร้าง Google Sheet ใหม่ ตั้งชื่อ Sheet ตามหัวข้อ "โครงสร้างชีตที่ต้องมี" ด้านล่าง
 *   2. เปิด Extensions → Apps Script วางไฟล์นี้ทับ
 *   3. แก้ TOKEN ให้ตรงกับ APP.token ใน assets/site.js
 *   4. แก้ CONTACT_EMAIL เป็นอีเมลที่จะรับข้อความจากฟอร์มติดต่อ
 *   5. Deploy → New deployment → Web app → Execute as: Me / Who has access: Anyone
 *   6. เอา URL ที่ได้ไปใส่ใน APP.endpoint (assets/site.js) แล้วตั้ง APP.demoMode = false
 *
 * โครงสร้างชีตที่ต้องมี (สร้างเองใน Google Sheet เดียวกัน):
 *   Users     : timestamp | username | name | passHash
 *   Contact   : timestamp | name | email | message
 *   Feedback  : timestamp | name | text
 *   Results   : timestamp | subject | username | name | score | total | percent | passed | usedSeconds | auto
 *   Q_<slug>  : id | type | text | options | answer | score | note
 *               ── หนึ่งชีตต่อหนึ่งวิชา ชื่อชีตต้องขึ้นต้นด้วย Q_ แล้วตามด้วย slug ของวิชา
 *                  เช่น Q_thai-m3, Q_math-m3 (slug ต้องตรงกับใน assets/demo-data.js)
 *               type    : "mc" (ปรนัย) หรือ "tf" (ถูก/ผิด)
 *               options : ตัวเลือกคั่นด้วย | เช่น  60–80 ครั้ง/นาที|80–100 ครั้ง/นาที|100–120 ครั้ง/นาที
 *                         ถ้า type เป็น tf ปล่อยว่างได้ ระบบจะใช้ ถูก|ผิด ให้อัตโนมัติ
 *               answer  : ข้อความคำตอบที่ถูก ต้องตรงกับหนึ่งใน options เป๊ะ ๆ
 *               score   : คะแนนของข้อนั้น (ปล่อยว่าง = 1 คะแนน)
 *               note    : คำอธิบายเฉลย (ไม่บังคับ)
 */

const TOKEN         = 'exam-bank-a217053bc9a2';  // ★ ต้องตรงกับ APP.token ใน assets/site.js
const SHEET_ID       = '';                        // ★ เว้นว่างได้ถ้าผูกกับชีตอยู่แล้ว
const CONTACT_EMAIL  = 'contact@example.com';     // ★ อีเมลที่จะรับข้อความจากฟอร์มติดต่อ
const CACHE_SECONDS  = 7200;                       // อายุเซสชันข้อสอบ (วินาที) สูงสุด 21600

function ss_() {
  return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#26123f').setFontColor('#FFFFFF');
  }
  return sh;
}

/* ══════════════════════════ doGet ══════════════════════════ */
function doGet(e) {
  const p = (e && e.parameter) || {};

  if (p.action === 'exam') {
    if (p.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });
    return json(serveExam(p.subject, parseInt(p.count, 10) || 10));
  }

  return json({ ok: true, msg: 'exam site endpoint' });
}

/* ══════════════════════════ doPost ══════════════════════════ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json({ ok: false, error: 'unauthorized' });

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      switch (body.action) {
        case 'register':    return json(register(body));
        case 'login':       return json(login(body));
        case 'contact':     return json(contact(body));
        case 'feedback':    return json(feedback(body));
        case 'submitExam':  return json(submitExam(body));
        default:            return json({ ok: false, error: 'unknown action' });
      }
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ══════════════════════════ สมาชิก ══════════════════════════ */
function hashPass_(username, password) {
  const raw = String(username).toLowerCase() + ':' + password + ':' + TOKEN;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return digest.map(b => (b + 256).toString(16).slice(-2)).join('');
}

function register(body) {
  const username = clean(String(body.username || '').trim().toLowerCase());
  const name     = clean(String(body.name || '').trim());
  const password = String(body.password || '');
  if (!username || !name || password.length < 6) return { ok: false, error: 'ข้อมูลไม่ครบ หรือรหัสผ่านสั้นเกินไป' };

  const sh = sheet_('Users', ['timestamp', 'username', 'name', 'passHash']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === username) return { ok: false, error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' };
  }
  sh.appendRow([new Date(), username, name, hashPass_(username, password)]);
  return { ok: true, username, name };
}

function login(body) {
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const sh = sheet_('Users', ['timestamp', 'username', 'name', 'passHash']);
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).toLowerCase() === username) {
      if (rows[i][3] === hashPass_(username, password)) {
        return { ok: true, username, name: rows[i][2] };
      }
      return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
    }
  }
  return { ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
}

/* ══════════════════════════ ติดต่อ / ความเห็น ══════════════════════════ */
function contact(body) {
  const name = clean(body.name), email = clean(body.email), text = clean(body.text);
  if (!name || !email || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };

  sheet_('Contact', ['timestamp', 'name', 'email', 'message']).appendRow([new Date(), name, email, text]);

  try {
    MailApp.sendEmail(CONTACT_EMAIL, 'ข้อความติดต่อใหม่จากเว็บไซต์ข้อสอบ',
      'จาก: ' + name + ' <' + email + '>\n\n' + text);
  } catch (err) { /* ส่งอีเมลไม่สำเร็จก็ยังบันทึกลงชีตไว้แล้ว ไม่ทำให้ทั้งคำขอ error */ }

  return { ok: true };
}

function feedback(body) {
  const name = clean(body.name), text = clean(body.text);
  if (!name || !text) return { ok: false, error: 'กรอกข้อมูลไม่ครบ' };
  sheet_('Feedback', ['timestamp', 'name', 'text']).appendRow([new Date(), name, text]);
  return { ok: true };
}

/* ══════════════════════════ ข้อสอบ: สุ่มจากคลัง ══════════════════════════ */
function readBank_(subject) {
  const sh = ss_().getSheetByName('Q_' + subject);
  if (!sh) return [];
  const rows = sh.getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    const type = String(r[1] || 'mc').trim();
    out.push({
      id: String(r[0]),
      type: type,
      text: String(r[2] || ''),
      options: type === 'tf' ? ['ถูก', 'ผิด'] : String(r[3] || '').split('|').map(s => s.trim()).filter(Boolean),
      answer: String(r[4] || '').trim(),
      score: Number(r[5]) || 1,
      note: String(r[6] || '')
    });
  }
  return out;
}

function serveExam(subject, count) {
  subject = String(subject || '').slice(0, 50);
  const bank = readBank_(subject);
  if (!bank.length) return { ok: false, error: 'ยังไม่มีคลังข้อสอบวิชานี้ (สร้างชีต Q_' + subject + ' ก่อน)' };

  shuffle_(bank);
  const picked = bank.slice(0, Math.min(count, bank.length));

  const sessionId = Utilities.getUuid();
  const key = {};
  picked.forEach(q => { key[q.id] = { type: q.type, answer: q.answer, score: q.score, note: q.note }; });
  CacheService.getScriptCache().put(sessionId, JSON.stringify({ subject, key }), CACHE_SECONDS);

  const questions = picked.map(q => ({ id: q.id, type: q.type, text: q.text, options: q.options }));
  shuffle_(questions);

  return { ok: true, sessionId, questions };
}

function submitExam(body) {
  const cached = CacheService.getScriptCache().get(body.sessionId || '');
  if (!cached) return { ok: false, error: 'หมดเวลาเซสชัน กรุณาเริ่มทำแบบทดสอบใหม่' };

  const session = JSON.parse(cached);
  if (session.subject !== body.subject) return { ok: false, error: 'ข้อมูลวิชาไม่ตรงกัน' };

  const key = session.key;
  const ansIn = body.answers || {};
  const id = body.identity || {};
  const meta = body.meta || {};

  let score = 0, total = 0;
  const detail = {};
  Object.keys(key).forEach(qid => {
    const k = key[qid];
    const pt = k.score || 1;
    total += pt;
    const right = norm_(ansIn[qid]) === norm_(k.answer);
    if (right) score += pt;
    detail[qid] = { correct: right, answer: k.answer, note: k.note || '' };
  });

  const percent = total ? Math.round(score / total * 100) : 0;
  const passed = percent >= 60;

  sheet_('Results', ['timestamp', 'subject', 'username', 'name', 'score', 'total', 'percent', 'passed', 'usedSeconds', 'auto'])
    .appendRow([new Date(), body.subject, clean(id.username), clean(id.name), score, total, percent,
                passed ? 'ผ่าน' : 'ไม่ผ่าน', meta.used || '', meta.auto ? 'ใช่' : '']);

  CacheService.getScriptCache().remove(body.sessionId);

  return { ok: true, score, total, percent, passed, detail };
}

/* ══════════════════════════ ยูทิลิตี ══════════════════════════ */
function shuffle_(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } }
function norm_(v) { return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' '); }

/** กัน formula injection ในชีต */
function clean(v) {
  if (v === undefined || v === null) return '';
  let s = String(v).slice(0, 1000);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
