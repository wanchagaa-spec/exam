/* ═══════════════════════════════════════════════════════════════
   ตั้งค่ากลางของเว็บไซต์ทั้งหมด — แก้ตรงนี้ที่เดียวพอ
   ═══════════════════════════════════════════════════════════════ */
window.APP = {
  orgName:  "ข้อสอบ",
  tagline:  "รวบรวมข้อสอบหลายวิชา ทดลองทำข้อสอบได้ทุกที่",

  /* โหมดตัวอย่าง — true = ทุกอย่าง (สมัคร/ล็อกอิน/ส่งข้อสอบ/ฟอร์มติดต่อ) จำลองในเครื่อง
     ไม่มีข้อมูลส่งออกไปไหนจริง ให้ลูกค้าทดลองเว็บได้ก่อนเชื่อมหลังบ้านจริง
     ⚠ ก่อนใช้งานจริง ให้เปลี่ยนเป็น false และตั้ง endpoint + token ให้ตรงกับ gas/Code.gs */
  demoMode: false,
  endpoint: "https://script.google.com/macros/s/AKfycbxbj6d8-W-szs9J7TF7U0PgS21wfdzCX9tti9DcsgQu2Xl0ov6VVykY_Q_LdEspi2qG/exec",                            // URL ของ Apps Script Web app (ดู gas/Code.gs)
  token:    "ai75jg8f3d9g7k3",      // ต้องตรงกับ TOKEN ใน gas/Code.gs

  facebook: "https://www.facebook.com/",   // ★ ใส่ลิงก์ Facebook Page จริง
  contactEmail: "wanchagaa.fe@gmail.com",     // ★ อีเมลปลายทางฟอร์มติดต่อ (ตั้งใน Code.gs)
  contactName:  "วันชัย วรรณวงค์",
  contactPhone: "",                        // ★ ใส่เบอร์โทรจริงถ้าต้องการแสดง (เว้นว่างได้ ไม่แสดงลิงก์โทร)

  /* รหัสผ่านแอดมิน ใช้เฉพาะตอน demoMode = true เพื่อทดลองหน้า admin.html ในเครื่อง
     ตอนใช้งานจริง หน้าเว็บจะส่งรหัสที่พิมพ์ไปให้ ADMIN_PASSWORD ใน gas/Code.gs ตรวจแทน ไม่เกี่ยวกับค่านี้ */
  demoAdminPassword: "admin123"
};

/* รายการเมนูสำหรับฟุตเตอร์เท่านั้น (header ใช้แถบไอคอนแทนแล้ว) */
const NAV = [
  { href:"index.html",     label:"หน้าแรก" },
  { href:"subjects.html",  label:"รายวิชา / ทำข้อสอบ" },
  { href:"news.html",      label:"บอร์ดความคิดเห็น" },
  { href:"downloads.html", label:"ดาวน์โหลดเอกสาร" },
  { href:"contact.html",   label:"ติดต่อเรา" }
];

function escHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

const NOTIF_LABEL = { like: "กดถูกใจโพสต์ของคุณ", comment: "แสดงความคิดเห็นในโพสต์ของคุณ" };
function avatarHtml(user, size){
  size = size || 34;
  if (user && user.avatar) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${user.avatar}" alt="">`;
  const initial = user && user.name ? user.name.trim().charAt(0) : "?";
  return `<span class="avatar initial" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.45)}px">${escHtml(initial)}</span>`;
}

/* ── หัวเว็บ + นำทาง (ปุ่มโพสต์ / ค้นหา / หน้าแรก / ข่าวสาร / แจ้งเตือน / โปรไฟล์) ── */
function renderHeader(active){
  const page = (location.pathname.split("/").pop() || "index.html");
  const cur = active || page;
  const user = getSession();
  const on = href => cur === href ? "on" : "";
  const params = new URLSearchParams(location.search);

  const leftHtml = user ? `<button class="navicon" id="composeBtn" type="button" title="โพสต์" aria-label="โพสต์">+</button>` : "";

  const rightHtml = user ? `
      <a class="navicon ${on("index.html")}" href="index.html" title="หน้าแรก" aria-label="หน้าแรก">🏠</a>
      <a class="navicon ${on("news.html")}" href="news.html" title="บอร์ดความคิดเห็น" aria-label="บอร์ดความคิดเห็น">📰</a>
      <button class="navicon" id="bellBtn" type="button" title="แจ้งเตือน" aria-label="แจ้งเตือน">
        🔔<span class="badge hidden" id="notifBadge">0</span>
      </button>
      <div class="usermenu">
        <button class="userbtn" id="userBtn" type="button">
          <span class="uname">${escHtml(user.name)}</span>
          ${avatarHtml(user)}
        </button>
        <div class="dropdown hidden" id="userDropdown">
          <a href="account.html">ข้อมูลส่วนตัว</a>
          <a href="subjects.html">รายวิชา/ทำข้อสอบ</a>
          <a href="downloads.html">ดาวน์โหลดเอกสาร</a>
          <a href="contact.html">ติดต่อเรา</a>
          <a href="#" id="logoutLink">ออกจากระบบ</a>
        </div>
      </div>
      <div class="notifpanel hidden" id="notifPanel"><p class="muted" style="padding:14px;font-size:14px">กำลังโหลด…</p></div>
    ` : `
      <a class="navicon ${on("index.html")}" href="index.html" title="หน้าแรก" aria-label="หน้าแรก">🏠</a>
      <a class="navicon ${on("news.html")}" href="news.html" title="บอร์ดความคิดเห็น" aria-label="บอร์ดความคิดเห็น">📰</a>
      <a href="login.html" style="display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;background:#fff;color:var(--accent-ink);font-weight:700;font-size:14.5px">เข้าสู่ระบบ</a>
    `;

  document.body.insertAdjacentHTML("afterbegin", `
    ${APP.demoMode ? '<div class="demo-banner">โหมดตัวอย่าง · ข้อมูลทั้งหมดในเว็บนี้เป็นข้อมูลจำลอง ยังไม่เชื่อมระบบจริง</div>' : ""}
    <header class="site">
      <div class="nav">
        ${leftHtml}
        <form class="searchbar" id="headerSearchForm">
          <input type="search" id="headerSearchInput" placeholder="ค้นหาวิชาหรือโพสต์…" value="${escHtml(params.get("q") || "")}" aria-label="ค้นหา">
        </form>
        <div class="navicons">${rightHtml}</div>
      </div>
    </header>
    ${user ? `
    <div class="pmask hidden" id="composeMask">
      <div class="pmodal">
        <div class="pmodal-head">
          <h3>โพสต์ใหม่</h3>
          <button type="button" id="composeClose" aria-label="ปิด">✕</button>
        </div>
        <form id="composeForm">
          <div class="field">
            <label for="composeSubject">หมวดหมู่ (วิชา)</label>
            <select id="composeSubject" required></select>
          </div>
          <div class="field">
            <label for="composeText">ข้อความ <span class="req">*</span></label>
            <textarea id="composeText" placeholder="เขียนอะไรบางอย่าง…" required maxlength="1000"></textarea>
          </div>
          <div id="composeMsg"></div>
          <button class="btn p block" type="submit">โพสต์</button>
        </form>
      </div>
    </div>` : ""}
  `);

  document.getElementById("headerSearchForm").onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById("headerSearchInput").value.trim();
    if (q) location.href = "search.html?q=" + encodeURIComponent(q);
  };

  if (!user) return;

  const lo = document.getElementById("logoutLink");
  lo.onclick = (e) => { e.preventDefault(); clearSession(); location.href = "index.html"; };

  const userBtn = document.getElementById("userBtn");
  const userDropdown = document.getElementById("userDropdown");
  const bellBtn = document.getElementById("bellBtn");
  const notifPanel = document.getElementById("notifPanel");
  const notifBadge = document.getElementById("notifBadge");

  function closePanels(){ userDropdown.classList.add("hidden"); notifPanel.classList.add("hidden"); }

  userBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = userDropdown.classList.contains("hidden");
    closePanels();
    if (willOpen) userDropdown.classList.remove("hidden");
  };

  async function loadNotifPanel(){
    const res = await apiCall("listNotifications", { email: user.email });
    if (!res.ok){ notifPanel.innerHTML = `<div class="msg bad" style="margin:10px">${escHtml(res.error || "โหลดไม่สำเร็จ")}</div>`; return; }
    const list = res.notifications || [];
    notifPanel.innerHTML = list.length
      ? list.map(n => `<div class="notif-item ${n.read ? "" : "unread"}">
          <b>${escHtml(n.actorName)}</b> ${escHtml(NOTIF_LABEL[n.type] || n.type)}
          <div class="muted" style="font-size:12px;margin-top:2px">${new Date(n.timestamp).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})}</div>
        </div>`).join("")
      : '<p class="muted" style="padding:14px;font-size:14px">ยังไม่มีการแจ้งเตือน</p>';
  }

  bellBtn.onclick = (e) => {
    e.stopPropagation();
    const willOpen = notifPanel.classList.contains("hidden");
    closePanels();
    if (willOpen){
      notifPanel.classList.remove("hidden");
      loadNotifPanel();
      apiCall("markNotificationsRead", { email: user.email }).then(() => {
        notifBadge.classList.add("hidden");
        notifBadge.textContent = "0";
      });
    }
  };

  document.addEventListener("click", closePanels);

  (async function refreshBadge(){
    const res = await apiCall("listNotifications", { email: user.email });
    if (res.ok && res.unreadCount){
      notifBadge.textContent = res.unreadCount > 9 ? "9+" : String(res.unreadCount);
      notifBadge.classList.remove("hidden");
    }
  })();

  /* ── ปุ่ม + เปิดหน้าต่างโพสต์ทันที (ใช้ได้ทุกหน้า ไม่ต้องเปลี่ยนหน้าไปที่บอร์ดความคิดเห็นก่อน) ── */
  const composeBtn = document.getElementById("composeBtn");
  const composeMask = document.getElementById("composeMask");
  const composeSubject = document.getElementById("composeSubject");
  const composeText = document.getElementById("composeText");
  const composeMsg = document.getElementById("composeMsg");

  if (typeof SUBJECTS !== "undefined") {
    composeSubject.innerHTML = SUBJECTS.map(s => `<option value="${s.slug}">${s.icon} ${escHtml(s.name)}</option>`).join("");
  }

  function openCompose(){
    composeMsg.innerHTML = "";
    composeText.value = "";
    composeMask.classList.remove("hidden");
    composeText.focus();
  }
  function closeCompose(){ composeMask.classList.add("hidden"); }

  composeBtn.onclick = openCompose;
  document.getElementById("composeClose").onclick = closeCompose;
  composeMask.onclick = (e) => { if (e.target === composeMask) closeCompose(); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCompose(); });

  document.getElementById("composeForm").onsubmit = async (e) => {
    e.preventDefault();
    const subject = composeSubject.value;
    const text = composeText.value.trim();
    if (!subject || !text) return;

    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "กำลังโพสต์…";

    const res = await apiCall("createPost", { email: user.email, name: user.name, subject, text });

    btn.disabled = false; btn.textContent = "โพสต์";
    if (res.ok){
      composeMsg.innerHTML = '<div class="msg ok">โพสต์เรียบร้อยแล้ว</div>';
      composeText.value = "";
      document.dispatchEvent(new CustomEvent("examSitePostCreated", { detail: res.post }));
      setTimeout(closeCompose, 900);
    } else {
      composeMsg.innerHTML = `<div class="msg bad">${escHtml(res.error || "โพสต์ไม่สำเร็จ")}</div>`;
    }
  };
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
          ${APP.contactPhone ? `<a href="tel:${APP.contactPhone.replace(/-/g,"")}">${escHtml(APP.contactPhone)}</a>` : ""}
        </div>
      </div>
      <div class="foot-bottom">
        <span>&copy; ${new Date().getFullYear()} ${escHtml(APP.orgName)}</span>
        <span>เว็บไซต์ตัวอย่าง อยู่ระหว่างจัดทำเนื้อหา · <a href="admin.html" style="color:inherit">สำหรับผู้ดูแลระบบ</a></span>
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

/* ย่อรูปที่อัปโหลด (avatar) เหลือรูปสี่เหลี่ยมจัตุรัสเล็ก ๆ แล้วแปลงเป็น data URL (JPEG)
   เก็บตรง ๆ ในเซลล์ Google Sheet ได้เลย เว็บนี้ไม่มีระบบเก็บไฟล์แยกต่างหาก */
function resizeImageToDataUrl(file, maxSize){
  maxSize = maxSize || 160;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => { img.onerror = () => reject(new Error("เปิดรูปไม่สำเร็จ")); img.src = reader.result; };
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = maxSize; canvas.height = maxSize;
      canvas.getContext("2d").drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    reader.readAsDataURL(file);
  });
}

/* ย่อรูปประกอบโจทย์ก่อนอัปโหลดขึ้น Drive (คงสัดส่วนเดิม ไม่ครอปเป็นสี่เหลี่ยมจัตุรัสแบบ avatar) */
function resizeImageToDataUrlFit(file, maxDim, quality){
  maxDim = maxDim || 1000;
  quality = quality || 0.82;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => { img.onerror = () => reject(new Error("เปิดรูปไม่สำเร็จ")); img.src = reader.result; };
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    reader.readAsDataURL(file);
  });
}

async function sha256(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

function shuffleArr(a){
  for (let i = a.length - 1; i > 0; i--){ const j = (Math.random()*(i+1))|0; [a[i],a[j]] = [a[j],a[i]]; }
  return a;
}
function normStr(v){ return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g," "); }

/* type "fill" เก็บคำตอบที่ยอมรับได้หลายแบบ คั่นด้วย | (เหมือน options) — ตอบถูกถ้าตรงแบบใดแบบหนึ่ง */
function answerMatches(type, given, answerStored){
  if (type === "fill"){
    const variants = String(answerStored || "").split("|").map(normStr).filter(Boolean);
    return variants.indexOf(normStr(given)) !== -1;
  }
  return normStr(given) === normStr(answerStored);
}

/* ── สมการคณิตศาสตร์ (KaTeX) ───────────────────────────────────
   โหลดจาก CDN ในหน้าที่ต้องใช้ (admin.html, exam.html) ไฟล์นี้แค่เก็บ config กลาง
   ปล่อยผ่านเงียบ ๆ ถ้า KaTeX ยังโหลดไม่เสร็จหรือโหลดไม่สำเร็จ (เช่นเน็ตบล็อก CDN) — ข้อความดิบยังอ่านได้อยู่ */
const KATEX_DELIMITERS = [
  { left: "$$", right: "$$", display: true },
  { left: "\\[", right: "\\]", display: true },
  { left: "$", right: "$", display: false },
  { left: "\\(", right: "\\)", display: false }
];
function renderMath(el){
  if (!el || typeof window.renderMathInElement !== "function") return;
  try { window.renderMathInElement(el, { delimiters: KATEX_DELIMITERS, throwOnError: false }); }
  catch(e){ /* แสดงข้อความดิบแทนถ้า render พลาด ไม่ทำให้หน้าเว็บพัง */ }
}

/* แปลงรูปแบบ ![alt](url) ในข้อความเป็น <img> จริง ใช้กับโจทย์/ตัวเลือกที่แนบรูปประกอบ */
const IMAGE_MD_RE = /!\[([^\]]*)\]\(((?:https?:|data:image\/)[^\s)]+)\)/g;
function renderImages(el){
  if (!el) return;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let node;
  while ((node = walker.nextNode())){
    if (node.nodeValue && IMAGE_MD_RE.test(node.nodeValue)) targets.push(node);
    IMAGE_MD_RE.lastIndex = 0;
  }
  targets.forEach(textNode => {
    const text = textNode.nodeValue;
    IMAGE_MD_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0, m;
    while ((m = IMAGE_MD_RE.exec(text))){
      if (m.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
      const img = document.createElement("img");
      img.src = m[2];
      img.alt = m[1] || "";
      img.className = "q-image";
      img.loading = "lazy";
      frag.appendChild(img);
      lastIndex = m.index + m[0].length;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    textNode.parentNode.replaceChild(frag, textNode);
  });
}

/* โหมดตัวอย่าง: คลังข้อสอบที่แอดมินเพิ่มผ่าน admin.html เก็บไว้ต่อวิชาใน localStorage
   ทำให้ทดลองทั้งขั้นตอน "แอดมินเพิ่มข้อสอบ → นักเรียนทำข้อสอบ → ตรวจจริง" ได้ก่อนต่อหลังบ้านจริง */
function demoBankKey(subject){ return "examSiteDemoBank_" + subject; }
function demoBankLoad(subject){
  try { return JSON.parse(localStorage.getItem(demoBankKey(subject)) || "[]"); } catch(e){ return []; }
}
function demoBankSave(subject, list){ localStorage.setItem(demoBankKey(subject), JSON.stringify(list)); }

/* โหมดตัวอย่าง: โครงสร้างชุดข้อสอบต่อวิชา เก็บเป็นลิสต์ของ "หลายชุด" ใน localStorage
   แต่ละชุด { name, active, sections:[{strand,count}] } — มีได้หลายชุดต่อวิชา แต่ active ได้ทีละชุด */
function demoBlueprintKey(subject){ return "examSiteDemoBlueprint_" + subject; }
function demoBlueprintConfigsLoad(subject){
  try { return JSON.parse(localStorage.getItem(demoBlueprintKey(subject)) || "[]"); } catch(e){ return []; }
}
function demoBlueprintConfigsSave(subject, configs){ localStorage.setItem(demoBlueprintKey(subject), JSON.stringify(configs)); }
/* ส่วนของชุดที่ active อยู่ของวิชานี้ (ใช้ตอนจำลองการสุ่มข้อสอบจริง) */
function demoBlueprintLoad(subject){
  const active = demoBlueprintConfigsLoad(subject).find(c => c.active);
  return (active && active.sections) || [];
}

/* โหมดตัวอย่าง: บอร์ดความคิดเห็น (โพส/ถูกใจ/คอมเมนต์) เก็บรวมทุกวิชาใน localStorage */
const DEMO_POSTS_KEY = "examSiteDemoPosts";
const DEMO_LIKES_KEY = "examSiteDemoLikes";
const DEMO_COMMENTS_KEY = "examSiteDemoComments";
function demoPostsLoad(){ try { return JSON.parse(localStorage.getItem(DEMO_POSTS_KEY) || "[]"); } catch(e){ return []; } }
function demoPostsSave(list){ localStorage.setItem(DEMO_POSTS_KEY, JSON.stringify(list)); }
function demoLikesLoad(){ try { return JSON.parse(localStorage.getItem(DEMO_LIKES_KEY) || "[]"); } catch(e){ return []; } }
function demoLikesSave(list){ localStorage.setItem(DEMO_LIKES_KEY, JSON.stringify(list)); }
function demoCommentsLoad(){ try { return JSON.parse(localStorage.getItem(DEMO_COMMENTS_KEY) || "[]"); } catch(e){ return []; } }
function demoCommentsSave(list){ localStorage.setItem(DEMO_COMMENTS_KEY, JSON.stringify(list)); }

/* โหมดตัวอย่าง: แจ้งเตือนถูกใจ/คอมเมนต์บนโพสต์ของตัวเอง */
const DEMO_NOTIF_KEY = "examSiteDemoNotifications";
function demoNotificationsLoad(){ try { return JSON.parse(localStorage.getItem(DEMO_NOTIF_KEY) || "[]"); } catch(e){ return []; } }
function demoNotificationsSave(list){ localStorage.setItem(DEMO_NOTIF_KEY, JSON.stringify(list)); }
function demoNotify(recipientEmail, type, postId, actorName){
  const list = demoNotificationsLoad();
  list.push({ id: "n_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
              recipientEmail, type, postId, actorName, timestamp: new Date().toISOString(), read:false });
  demoNotificationsSave(list);
}

/* สรุปโครงสร้างชุดข้อสอบของวิชาหนึ่ง ใช้แสดงบนการ์ดรายวิชา/หน้าเริ่มทำข้อสอบ (public, ไม่ต้องล็อกอิน/รหัสแอดมิน) */
async function blueprintSummary(subject){
  const res = await apiCall("blueprint", { subject });
  const sections = (res.ok && res.sections) || [];
  return { sections, total: sections.reduce((s,x) => s + (x.count||0), 0) };
}

/* ── การ์ดโพสต์บอร์ดความคิดเห็น (ใช้ร่วมกัน 3 หน้า: news.html, account.html, search.html)
   ต้องมี CSS .post/.comment/.actbtn/.comments/.commentForm ใน assets/style.css แล้ว ── */
function postSubjectMeta(slug){
  return (typeof SUBJECTS !== "undefined" ? SUBJECTS : []).find(s => s.slug === slug);
}
function postFmtTime(iso){
  try { return new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }); }
  catch(e){ return ""; }
}
function postCardHtml(p, viewerEmail){
  const meta = postSubjectMeta(p.subject);
  const mine = p.email === viewerEmail;
  return `
  <div class="post" data-id="${escHtml(p.id)}">
    <div class="head">
      <div>
        <div class="who">${escHtml(p.name)}</div>
        ${meta ? `<span class="tag" style="margin-top:6px">${meta.icon} ${escHtml(meta.name)}</span>` : ""}
      </div>
      <span class="when">${postFmtTime(p.timestamp)}</span>
    </div>
    <div class="body">${escHtml(p.text)}</div>
    <div class="actions">
      <button class="actbtn likeBtn ${p.likedByMe ? "liked" : ""}" type="button">${p.likedByMe ? "❤️" : "🤍"} ถูกใจ (${p.likeCount})</button>
      <button class="actbtn cmtToggle" type="button">💬 ความคิดเห็น (${p.commentCount})</button>
      ${mine ? '<button class="actbtn delbtn delPostBtn" type="button">ลบโพสต์</button>' : ""}
    </div>
    <div class="comments hidden">
      <div class="commentList"></div>
      <form class="commentForm">
        <input type="text" placeholder="เขียนความคิดเห็น…" maxlength="500" required>
        <button class="btn s" type="submit">ส่ง</button>
      </form>
    </div>
  </div>`;
}

/**
 * สร้างตัวจัดการฟีดโพสต์ (แสดง + ถูกใจ + คอมเมนต์ + ลบ) ใช้ร่วมกันได้ทุกหน้าที่มีฟีดโพสต์
 * options: { listEl, user, emptyMessage, onChange }
 *   listEl        องค์ประกอบ <div> ที่จะใส่การ์ดโพสต์
 *   user          ผู้ใช้ที่ล็อกอินอยู่ { email, name }
 *   emptyMessage  ข้อความตอนไม่มีโพสต์เลย
 *   onChange      เรียกหลังลบโพสต์สำเร็จ (ไว้โหลดฟีดใหม่ตามเงื่อนไขของแต่ละหน้า)
 * คืนค่า { render(posts) } ให้แต่ละหน้าเรียกหลังโหลดข้อมูลจาก apiCall("listPosts", ...) เอง
 */
function createPostBoard(options){
  const { listEl, user, emptyMessage, onChange } = options;
  const expanded = new Set();
  const commentsCache = {};

  function render(posts){
    if (!posts.length){
      listEl.innerHTML = `<p class="muted">${emptyMessage}</p>`;
      return;
    }
    listEl.innerHTML = posts.map(p => postCardHtml(p, user.email)).join("");
    listEl.querySelectorAll(".post").forEach(card => {
      const id = card.dataset.id;
      card.querySelector(".likeBtn").onclick = () => onToggleLike(id, card);
      card.querySelector(".cmtToggle").onclick = () => onToggleComments(id, card);
      const delBtn = card.querySelector(".delPostBtn");
      if (delBtn) delBtn.onclick = () => onDeletePost(id);
      card.querySelector(".commentForm").onsubmit = (e) => onAddComment(e, id, card);
      if (expanded.has(id)) renderComments(id, card);
    });
  }

  async function onToggleLike(id, card){
    const btn = card.querySelector(".likeBtn");
    btn.disabled = true;
    const res = await apiCall("toggleLike", { postId: id, email: user.email, name: user.name });
    btn.disabled = false;
    if (!res.ok) return;
    btn.classList.toggle("liked", res.liked);
    btn.textContent = `${res.liked ? "❤️" : "🤍"} ถูกใจ (${res.likeCount})`;
  }

  function onToggleComments(id, card){
    const box = card.querySelector(".comments");
    const nowOpen = box.classList.contains("hidden");
    box.classList.toggle("hidden");
    if (nowOpen){ expanded.add(id); renderComments(id, card); }
    else expanded.delete(id);
  }

  function updateCmtToggle(card){
    card.querySelector(".cmtToggle").textContent = `💬 ความคิดเห็น (${(commentsCache[card.dataset.id] || []).length})`;
  }

  async function renderComments(id, card){
    const box = card.querySelector(".commentList");
    box.innerHTML = '<p class="muted" style="font-size:13.5px">กำลังโหลด…</p>';
    const res = await apiCall("listComments", { postId: id });
    commentsCache[id] = (res.ok && res.comments) || [];
    const comments = commentsCache[id];
    box.innerHTML = comments.length
      ? comments.map(c => `
        <div class="comment" data-id="${escHtml(c.id)}">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <span class="who">${escHtml(c.name)}</span>
            <span class="when">${postFmtTime(c.timestamp)}</span>
          </div>
          <div class="txt">${escHtml(c.text)}</div>
          ${c.email === user.email ? '<button class="delc" type="button">ลบความคิดเห็น</button>' : ""}
        </div>`).join("")
      : '<p class="muted" style="font-size:13.5px">ยังไม่มีความคิดเห็น</p>';

    box.querySelectorAll(".delc").forEach(btn => {
      btn.onclick = async () => {
        const commentId = btn.closest(".comment").dataset.id;
        const res2 = await apiCall("deleteComment", { commentId, email: user.email });
        if (res2.ok){ await renderComments(id, card); updateCmtToggle(card); }
      };
    });
  }

  async function onAddComment(e, id, card){
    e.preventDefault();
    const input = card.querySelector(".commentForm input");
    const text = input.value.trim();
    if (!text) return;
    const btn = card.querySelector(".commentForm button");
    btn.disabled = true;
    const res = await apiCall("addComment", { postId: id, email: user.email, name: user.name, text });
    btn.disabled = false;
    if (!res.ok) return;
    input.value = "";
    await renderComments(id, card);
    updateCmtToggle(card);
  }

  async function onDeletePost(id){
    if (!confirm("ลบโพสต์นี้ทิ้ง?")) return;
    const res = await apiCall("deletePost", { postId: id, email: user.email });
    if (res.ok && onChange) onChange();
  }

  return { render };
}

async function apiCall(action, payload){
  if (APP.demoMode){
    return demoApi(action, payload);
  }
  try {
    const r = await fetch(APP.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: APP.token, action }, payload))
    });
    return await r.json();
  } catch (err) {
    return { ok:false, error:"เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสัญญาณอินเทอร์เน็ตหรือ endpoint แล้วลองใหม่" };
  }
}

/* ── หลังบ้านจำลองสำหรับโหมดตัวอย่างเท่านั้น ─────────────────── */
async function demoApi(action, payload){
  await new Promise(r => setTimeout(r, 350));
  const users = demoUsers();

  if (action === "register"){
    const email = String(payload.email || "").trim().toLowerCase();
    if (users.some(u => u.email === email))
      return { ok:false, error:"มีอีเมลนี้สมัครไว้แล้ว" };
    users.push({ email, name: payload.name, age: payload.age, school: payload.school, passHash: await sha256(payload.password), avatar: "" });
    demoSaveUsers(users);
    return { ok:true, email, name: payload.name, age: payload.age, school: payload.school, avatar: "" };
  }

  if (action === "login"){
    const email = String(payload.email || "").trim().toLowerCase();
    const u = users.find(x => x.email === email);
    if (!u || u.passHash !== await sha256(payload.password))
      return { ok:false, error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    return { ok:true, email: u.email, name: u.name, age: u.age, school: u.school, avatar: u.avatar || "" };
  }

  if (action === "updateAvatar"){
    const email = String(payload.email || "").trim().toLowerCase();
    const idx = users.findIndex(u => u.email === email);
    if (idx < 0) return { ok:false, error:"ไม่พบบัญชีนี้" };
    users[idx].avatar = payload.avatar || "";
    demoSaveUsers(users);
    return { ok:true, avatar: users[idx].avatar };
  }

  if (action === "contact") return { ok:true };

  if (action === "adminLogin"){
    return payload.adminPassword === APP.demoAdminPassword
      ? { ok:true }
      : { ok:false, error:"รหัสผ่านผู้ดูแลไม่ถูกต้อง (โหมดตัวอย่าง ลองใช้ " + APP.demoAdminPassword + ")" };
  }

  if (action === "adminListQuestions"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    return { ok:true, questions: demoBankLoad(payload.subject) };
  }

  if (action === "adminAddQuestion"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoBankLoad(payload.subject);
    const id = payload.id || ("q_" + Date.now().toString(36));
    const q = { id, type: payload.type, text: payload.text, options: payload.options,
                answer: payload.answer, score: payload.score, note: payload.note, strand: payload.strand || "" };
    const idx = list.findIndex(x => x.id === id);
    if (idx >= 0) list[idx] = q; else list.push(q);
    demoBankSave(payload.subject, list);
    return { ok:true, id };
  }

  if (action === "adminDeleteQuestion"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    demoBankSave(payload.subject, demoBankLoad(payload.subject).filter(q => q.id !== payload.id));
    return { ok:true };
  }

  if (action === "blueprint"){
    return { ok:true, sections: demoBlueprintLoad(payload.subject) };
  }

  if (action === "uploadQuestionImage"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    return { ok:true, url: payload.dataUrl };
  }

  if (action === "adminListBlueprintConfigs"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    return { ok:true, configs: demoBlueprintConfigsLoad(payload.subject) };
  }

  if (action === "adminSaveBlueprintConfig"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const sections = payload.sections || [];
    if (!sections.length) return { ok:false, error:"ยังไม่ได้กำหนดส่วนใด ๆ ในโครงสร้าง" };
    const name = (payload.configName || "").trim() || "ค่าเริ่มต้น";
    const configs = demoBlueprintConfigsLoad(payload.subject);
    const idx = configs.findIndex(c => c.name === name);
    const active = idx >= 0 ? configs[idx].active : configs.length === 0;
    const cfg = { name, active, sections };
    if (idx >= 0) configs[idx] = cfg; else configs.push(cfg);
    demoBlueprintConfigsSave(payload.subject, configs);
    return { ok:true, active };
  }

  if (action === "adminDeleteBlueprintConfig"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    let configs = demoBlueprintConfigsLoad(payload.subject);
    const wasActive = configs.some(c => c.name === payload.configName && c.active);
    configs = configs.filter(c => c.name !== payload.configName);
    if (wasActive && configs.length) configs[0].active = true;
    demoBlueprintConfigsSave(payload.subject, configs);
    return { ok:true };
  }

  if (action === "adminSetActiveBlueprintConfig"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const configs = demoBlueprintConfigsLoad(payload.subject);
    let found = false;
    configs.forEach(c => { c.active = (c.name === payload.configName); if (c.active) found = true; });
    if (!found) return { ok:false, error:"ไม่พบโครงสร้างชุดนี้" };
    demoBlueprintConfigsSave(payload.subject, configs);
    return { ok:true };
  }

  if (action === "createPost"){
    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || "").trim();
    const subject = String(payload.subject || "").trim();
    const text = String(payload.text || "").trim();
    if (!email || !name || !subject || !text) return { ok:false, error:"กรอกข้อมูลไม่ครบ" };
    const posts = demoPostsLoad();
    const post = { id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                    timestamp: new Date().toISOString(), email, name, subject, text, likeCount: 0 };
    posts.push(post);
    demoPostsSave(posts);
    return { ok:true, post: Object.assign({}, post, { commentCount:0, likedByMe:false }) };
  }

  if (action === "listPosts"){
    const subject = String(payload.subject || "").trim();
    const authorEmail = String(payload.authorEmail || "").trim().toLowerCase();
    const sort = payload.sort === "likes" ? "likes" : "new";
    const viewerEmail = String(payload.viewerEmail || "").trim().toLowerCase();
    const likes = demoLikesLoad();
    const comments = demoCommentsLoad();
    let posts = demoPostsLoad();
    if (subject) posts = posts.filter(p => p.subject === subject);
    if (authorEmail) posts = posts.filter(p => p.email === authorEmail);
    posts = posts.map(p => Object.assign({}, p, {
      commentCount: comments.filter(c => c.postId === p.id).length,
      likedByMe: viewerEmail ? likes.some(l => l.postId === p.id && l.email === viewerEmail) : false
    }));
    posts.sort((a,b) => sort === "likes"
      ? (b.likeCount - a.likeCount) || (new Date(b.timestamp) - new Date(a.timestamp))
      : (new Date(b.timestamp) - new Date(a.timestamp)));
    return { ok:true, posts };
  }

  if (action === "deletePost"){
    const postId = payload.postId, email = String(payload.email || "").trim().toLowerCase();
    const posts = demoPostsLoad();
    const post = posts.find(p => p.id === postId);
    if (!post) return { ok:false, error:"ไม่พบโพสต์นี้" };
    if (post.email !== email) return { ok:false, error:"ลบได้เฉพาะโพสต์ของตัวเอง" };
    demoPostsSave(posts.filter(p => p.id !== postId));
    demoCommentsSave(demoCommentsLoad().filter(c => c.postId !== postId));
    demoLikesSave(demoLikesLoad().filter(l => l.postId !== postId));
    return { ok:true };
  }

  if (action === "toggleLike"){
    const postId = payload.postId, email = String(payload.email || "").trim().toLowerCase();
    if (!postId || !email) return { ok:false, error:"ข้อมูลไม่ครบ" };
    const posts = demoPostsLoad();
    const post = posts.find(p => p.id === postId);
    if (!post) return { ok:false, error:"ไม่พบโพสต์นี้" };
    let likes = demoLikesLoad();
    const idx = likes.findIndex(l => l.postId === postId && l.email === email);
    let liked;
    if (idx >= 0){ likes.splice(idx,1); liked = false; post.likeCount = Math.max(0,(post.likeCount||0)-1); }
    else {
      likes.push({ postId, email }); liked = true; post.likeCount = (post.likeCount||0)+1;
      if (post.email && post.email !== email) demoNotify(post.email, "like", postId, payload.name || email);
    }
    demoLikesSave(likes);
    demoPostsSave(posts);
    return { ok:true, liked, likeCount: post.likeCount };
  }

  if (action === "addComment"){
    const postId = payload.postId;
    const email = String(payload.email || "").trim().toLowerCase();
    const name = String(payload.name || "").trim();
    const text = String(payload.text || "").trim();
    if (!postId || !email || !name || !text) return { ok:false, error:"กรอกข้อมูลไม่ครบ" };
    const comments = demoCommentsLoad();
    const comment = { id: "c_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                       postId, timestamp: new Date().toISOString(), email, name, text };
    comments.push(comment);
    demoCommentsSave(comments);
    const post = demoPostsLoad().find(p => p.id === postId);
    if (post && post.email && post.email !== email) demoNotify(post.email, "comment", postId, name);
    return { ok:true, comment };
  }

  if (action === "listComments"){
    const postId = payload.postId;
    const comments = demoCommentsLoad().filter(c => c.postId === postId)
      .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { ok:true, comments };
  }

  if (action === "deleteComment"){
    const commentId = payload.commentId, email = String(payload.email || "").trim().toLowerCase();
    const comments = demoCommentsLoad();
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { ok:false, error:"ไม่พบความคิดเห็นนี้" };
    if (comment.email !== email) return { ok:false, error:"ลบได้เฉพาะความคิดเห็นของตัวเอง" };
    demoCommentsSave(comments.filter(c => c.id !== commentId));
    return { ok:true };
  }

  if (action === "listNotifications"){
    const email = String(payload.email || "").trim().toLowerCase();
    const list = demoNotificationsLoad().filter(n => n.recipientEmail === email)
      .sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    const unreadCount = list.filter(n => !n.read).length;
    return { ok:true, notifications: list.slice(0,30), unreadCount };
  }

  if (action === "markNotificationsRead"){
    const email = String(payload.email || "").trim().toLowerCase();
    const list = demoNotificationsLoad();
    list.forEach(n => { if (n.recipientEmail === email) n.read = true; });
    demoNotificationsSave(list);
    return { ok:true };
  }

  return { ok:false, error:"โหมดตัวอย่างไม่รองรับคำสั่งนี้" };
}
