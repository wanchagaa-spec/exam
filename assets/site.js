/* ═══════════════════════════════════════════════════════════════
   ตั้งค่ากลางของเว็บไซต์ทั้งหมด — แก้ตรงนี้ที่เดียวพอ
   ═══════════════════════════════════════════════════════════════ */
window.APP = {
  orgName:  "ข้อสอบ",
  tagline:  "รวบรวมข้อสอบหลายวิชา ทดลองทำข้อสอบได้ทุกที่",

  /* โหมดตัวอย่าง — true = ทุกอย่าง (สมัคร/ล็อกอิน/ส่งข้อสอบ/ฟอร์มติดต่อ) จำลองในเครื่อง
     ไม่มีข้อมูลส่งออกไปไหนจริง ให้ลูกค้าทดลองเว็บได้ก่อนเชื่อมหลังบ้านจริง
     ⚠ ก่อนใช้งานจริง ให้เปลี่ยนเป็น false และตั้ง endpoint + token ให้ตรงกับ gas/Code.gs */
  demoMode: true,
  endpoint: "",                            // URL ของ Apps Script Web app (ดู gas/Code.gs)
  token:    "exam-bank-a217053bc9a2",      // ต้องตรงกับ TOKEN ใน gas/Code.gs

  facebook: "https://www.facebook.com/",   // ★ ใส่ลิงก์ Facebook Page จริง
  contactEmail: "contact@example.com",     // ★ อีเมลปลายทางฟอร์มติดต่อ (ตั้งใน Code.gs)
  contactName:  "วันชัย",
  contactPhone: "066-000-0000"
};

const NAV = [
  { href:"index.html",     label:"หน้าแรก" },
  { href:"subjects.html",  label:"รายวิชา / ทำข้อสอบ" },
  { href:"news.html",      label:"ข่าวสาร / กิจกรรม" },
  { href:"downloads.html", label:"ดาวน์โหลดเอกสาร" },
  { href:"feedback.html",  label:"พื้นที่แสดงความเห็น" },
  { href:"contact.html",   label:"ติดต่อเรา" }
];

function escHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

/* ── หัวเว็บ + นำทาง ─────────────────────────────────────────── */
function renderHeader(active){
  const page = (location.pathname.split("/").pop() || "index.html");
  const user = getSession();

  const links = NAV.map(n =>
    `<a href="${n.href}" class="${(active || page) === n.href ? "on" : ""}">${n.label}</a>`
  ).join("");

  const authLink = user
    ? `<a href="account.html">${escHtml(user.name)}</a><a href="#" id="logoutLink">ออกจากระบบ</a>`
    : `<a href="login.html">เข้าสู่ระบบ</a>`;

  document.body.insertAdjacentHTML("afterbegin", `
    ${APP.demoMode ? '<div class="demo-banner">โหมดตัวอย่าง · ข้อมูลทั้งหมดในเว็บนี้เป็นข้อมูลจำลอง ยังไม่เชื่อมระบบจริง</div>' : ""}
    <header class="site">
      <div class="nav">
        <a class="brand" href="index.html"><span class="dot"></span>${escHtml(APP.orgName)}</a>
        <button class="navburger" id="burger" aria-label="เมนู">&#9776;</button>
        <nav class="navlinks" id="navlinks">${links}${authLink}</nav>
      </div>
    </header>
  `);

  document.getElementById("burger").onclick = () =>
    document.getElementById("navlinks").classList.toggle("open");

  const lo = document.getElementById("logoutLink");
  if (lo) lo.onclick = (e) => { e.preventDefault(); clearSession(); location.href = "index.html"; };
}

/* ── ฟุตเตอร์ ─────────────────────────────────────────────────── */
function renderFooter(){
  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site">
      <div class="foot-grid">
        <div>
          <h4>${escHtml(APP.orgName)}</h4>
          <p class="muted" style="max-width:260px;font-size:14.5px">${escHtml(APP.tagline)}</p>
        </div>
        <div>
          <h4>เมนู</h4>
          ${NAV.map(n => `<a href="${n.href}">${n.label}</a>`).join("")}
        </div>
        <div>
          <h4>ติดต่อ</h4>
          <a href="contact.html">ฟอร์มติดต่อเรา</a>
          <a href="${APP.facebook}" target="_blank" rel="noopener">Facebook Page</a>
          <a href="tel:${APP.contactPhone.replace(/-/g,"")}">${escHtml(APP.contactPhone)}</a>
        </div>
      </div>
      <div class="foot-bottom">
        <span>&copy; ${new Date().getFullYear()} ${escHtml(APP.orgName)}</span>
        <span>เว็บไซต์ตัวอย่าง อยู่ระหว่างจัดทำเนื้อหา</span>
      </div>
    </footer>
  `);
}

/* ── เซสชันผู้ใช้ (เดโม: เก็บใน localStorage) ───────────────────── */
const SESSION_KEY = "examSiteSession";
const USERS_KEY    = "examSiteDemoUsers";

function getSession(){
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch(e){ return null; }
}
function setSession(u){ localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function requireLogin(){
  if (!getSession()){
    const back = location.pathname.split("/").pop() + location.search;
    location.href = "login.html?next=" + encodeURIComponent(back);
    return false;
  }
  return true;
}

/* โหมดตัวอย่าง: จำลองบัญชีผู้ใช้ในเครื่อง (ไม่ใช่ระบบสมาชิกจริง) */
function demoUsers(){
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "[]"); } catch(e){ return []; }
}
function demoSaveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

async function sha256(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

async function apiCall(action, payload){
  if (APP.demoMode){
    return demoApi(action, payload);
  }
  const r = await fetch(APP.endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({ token: APP.token, action }, payload))
  });
  return r.json();
}

/* ── หลังบ้านจำลองสำหรับโหมดตัวอย่างเท่านั้น ─────────────────── */
async function demoApi(action, payload){
  await new Promise(r => setTimeout(r, 350));
  const users = demoUsers();

  if (action === "register"){
    if (users.some(u => u.username === payload.username))
      return { ok:false, error:"มีชื่อผู้ใช้นี้อยู่แล้ว" };
    users.push({ username: payload.username, name: payload.name, passHash: await sha256(payload.password) });
    demoSaveUsers(users);
    return { ok:true };
  }

  if (action === "login"){
    const u = users.find(x => x.username === payload.username);
    if (!u || u.passHash !== await sha256(payload.password))
      return { ok:false, error:"ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    return { ok:true, name: u.name, username: u.username };
  }

  if (action === "contact") return { ok:true };

  if (action === "feedback") return { ok:true };

  return { ok:false, error:"โหมดตัวอย่างไม่รองรับคำสั่งนี้" };
}
