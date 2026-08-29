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
  { href:"trophy.html",    label:"🏆 มหาเทพพยายาม" },
  { href:"downloads.html", label:"ดาวน์โหลดเอกสาร" },
  { href:"contact.html",   label:"ติดต่อเรา" }
];

function escHtml(s){
  return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

/** วิชาที่เปิดให้นักเรียนเห็น/เลือกได้ (visible !== false ใน assets/demo-data.js) — ใช้แสดงลิสต์วิชาทุกจุด
    ส่วนแอดมิน (admin.html/admin-add.html/admin-import.html) ยังใช้ SUBJECTS เต็มทุกวิชาตามเดิม จัดการคลังข้อสอบวิชาที่ซ่อนอยู่ได้ */
function visibleSubjects(){
  return (typeof SUBJECTS !== "undefined" ? SUBJECTS : []).filter(s => s.visible !== false);
}

/** แถบเลือกวิชาสำหรับหน้าเนื้อหาการเรียนรู้ (learn.html/lesson.html) — จอกว้างแสดงเป็น sidebar ซ้าย
    จอแคบแสดงเป็นแถบเลื่อนแนวนอนแทน (ดู .subjectnav ใน style.css) ใช้ร่วมกัน 2 หน้าเพื่อให้แก้ที่เดียวพอ */
function subjectNavHtml(activeSlug, subjects){
  return (subjects || visibleSubjects()).map(s => `
    <a class="subjectnav-item ${s.slug === activeSlug ? "on" : ""}" href="learn.html?subject=${encodeURIComponent(s.slug)}">
      <span class="ic">${s.icon}</span><span class="nm">${escHtml(s.name)}</span>
    </a>`).join("");
}

/** รายชื่อวิชาที่มีข้อสอบในคลังแล้ว — โหลดครั้งเดียวต่อการเปิดหน้า แล้วแคชไว้ให้ทุกจุดใช้ซ้ำ
    (แถบข้างและแถบเลือกวิชาเรียกพร้อมกันได้โดยไม่ยิงคำขอซ้ำ)

    ⚠ ถ้าโหลดไม่สำเร็จ หรือยังไม่มีวิชาไหนมีข้อสอบเลย จะคืนวิชาทั้งหมดแทน (fail open)
    เพราะเมนูว่างเปล่าแย่กว่าเมนูที่มีวิชาเกินมา — เช่นตอนที่หลังบ้านยังไม่ได้อัปเดตเป็นเวอร์ชันที่ส่ง questionCount */
let __subjectReadyPromise = null;
function subjectReadyMap(){
  if (!__subjectReadyPromise){
    __subjectReadyPromise = blueprintSummaryMap(visibleSubjects().map(s => s.slug)).catch(() => new Map());
  }
  return __subjectReadyPromise;
}
async function readySubjects(){
  const map = await subjectReadyMap();
  const ready = visibleSubjects().filter(s => subjectIsReady(map.get(s.slug)));
  return ready.length ? ready : visibleSubjects();
}

/** เติมแถบเลือกวิชาลงในองค์ประกอบที่ระบุ (เฉพาะวิชาที่มีข้อสอบแล้ว) */
async function renderSubjectNav(el, activeSlug){
  if (!el) return;
  el.innerHTML = subjectNavHtml(activeSlug || "", await readySubjects());
}

/** เมนูวิชาปักหมุดขอบซ้ายจอ (เห็นเฉพาะจอกว้างมาก ดู .sitesidebar ใน style.css) — เรียกท้ายสคริปต์ของทุกหน้าเนื้อหาหลัก
    (index/news/learn/lesson/account/trophy/search/downloads/contact) ยกเว้น exam.html และหน้าแอดมิน/login/register */
function renderSidebar(activeSlug){
  const existing = document.getElementById("siteSidebar");
  if (existing){ renderSubjectNav(existing, activeSlug); return; }
  // สร้างกล่องเปล่าไว้ก่อนแล้วค่อยเติมรายชื่อวิชาเมื่อรู้ว่าวิชาไหนมีข้อสอบแล้ว (ต้องถามเซิร์ฟเวอร์ก่อน)
  document.body.insertAdjacentHTML("beforeend", `<aside class="sitesidebar" id="siteSidebar"></aside>`);
  renderSubjectNav(document.getElementById("siteSidebar"), activeSlug);
  // ตำแหน่งบน (top) วัดจากความสูงจริงของ header แทนค่าคงที่ เพราะโหมดตัวอย่างมีแบนเนอร์แถบบนเพิ่มเข้ามาให้ header สูงกว่าปกติ
  const positionSidebar = () => {
    const el = document.getElementById("siteSidebar");
    const header = document.querySelector("header.site");
    if (el && header) el.style.top = (header.getBoundingClientRect().bottom + 14) + "px";
  };
  positionSidebar();
  window.addEventListener("resize", positionSidebar);
  window.addEventListener("scroll", positionSidebar, { passive: true });
}

const NOTIF_LABEL = { like: "กดถูกใจโพสต์ของคุณ", comment: "แสดงความคิดเห็นในโพสต์ของคุณ" };
function avatarHtml(user, size){
  size = size || 34;
  // escHtml ค่า avatar ด้วยเสมอ ถึงจะเป็น data URL ที่ระบบสร้างเองก็ตาม — กันค่าแปลกปลอมที่หลุดเข้าชีตมาแหกออกจาก src="..."
  if (user && user.avatar) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${escHtml(user.avatar)}" alt="">`;
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
      <a class="navicon dupnav ${on("index.html")}" href="index.html" title="หน้าแรก" aria-label="หน้าแรก">🏠</a>
      <a class="navicon dupnav ${on("news.html")}" href="news.html" title="บอร์ดความคิดเห็น" aria-label="บอร์ดความคิดเห็น">📰</a>
      <a class="navicon ${on("learn.html")}" href="learn.html" title="เนื้อหาการเรียนรู้" aria-label="เนื้อหาการเรียนรู้">📖</a>
      <a class="navicon dupnav ${on("trophy.html")}" href="trophy.html" title="มหาเทพพยายาม" aria-label="มหาเทพพยายาม">🏆</a>
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
      <a class="navicon dupnav ${on("index.html")}" href="index.html" title="หน้าแรก" aria-label="หน้าแรก">🏠</a>
      <a class="navicon dupnav ${on("news.html")}" href="news.html" title="บอร์ดความคิดเห็น" aria-label="บอร์ดความคิดเห็น">📰</a>
      <a class="navicon ${on("learn.html")}" href="learn.html" title="เนื้อหาการเรียนรู้" aria-label="เนื้อหาการเรียนรู้">📖</a>
      <a class="navicon dupnav ${on("trophy.html")}" href="trophy.html" title="มหาเทพพยายาม" aria-label="มหาเทพพยายาม">🏆</a>
      <a href="login.html" style="display:inline-flex;align-items:center;min-height:40px;padding:0 18px;border-radius:999px;background:#fff;color:var(--accent-ink);font-weight:700;font-size:14.5px">เข้าสู่ระบบ</a>
    `;

  /* แถบเมนูล่างแบบ IG — แสดงเฉพาะจอมือถือ (ดู CSS @media max-width:600px)
     ไอคอนชุดเดียวกับ dupnav ด้านบนแต่ซ้ำไว้เป็นแถบล่าง เพื่อไม่ให้ไอคอนชนกันบน header แคบๆ */
  const bottomNavHtml = `
    <nav class="bottomnav">
      <a class="bnitem ${on("index.html")}" href="index.html" aria-label="หน้าแรก"><span class="bnicon">🏠</span><span class="bnlabel">หน้าแรก</span></a>
      <a class="bnitem ${on("news.html")}" href="news.html" aria-label="ข่าว"><span class="bnicon">📰</span><span class="bnlabel">ข่าว</span></a>
      <a class="bnitem ${on("trophy.html")}" href="trophy.html" aria-label="ถ้วยรางวัล"><span class="bnicon">🏆</span><span class="bnlabel">ถ้วยรางวัล</span></a>
      ${user
        ? `<a class="bnitem ${on("account.html")}" href="account.html" aria-label="โปรไฟล์"><span class="bnicon">👤</span><span class="bnlabel">โปรไฟล์</span></a>`
        : `<a class="bnitem ${on("login.html")}" href="login.html" aria-label="เข้าสู่ระบบ"><span class="bnicon">👤</span><span class="bnlabel">เข้าสู่ระบบ</span></a>`}
    </nav>`;

  document.body.insertAdjacentHTML("afterbegin", `
    ${APP.demoMode ? '<div class="demo-banner">โหมดตัวอย่าง · ข้อมูลทั้งหมดในเว็บนี้เป็นข้อมูลจำลอง ยังไม่เชื่อมระบบจริง</div>' : ""}
    <header class="site">
      <div class="nav">
        ${leftHtml}
        <form class="searchbar" id="headerSearchForm">
          <input type="search" id="headerSearchInput" placeholder="ค้นหาวิชาหรือโพสต์…" value="${escHtml(params.get("q") || "")}" aria-label="ค้นหา">
          <button type="submit" class="searchbtn" aria-label="ค้นหา">🔍</button>
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
          <div class="field">
            <input type="file" id="composeImageInput" accept="image/*" class="hidden">
            <div id="composeImagePreviewWrap" class="compose-img-preview hidden">
              <img id="composeImagePreview" alt="">
              <button type="button" id="composeImageRemove" aria-label="ลบรูป">✕</button>
            </div>
            <button class="btn s" id="composeImageBtn" type="button">📷 แนบรูป</button>
          </div>
          <div id="composeMsg"></div>
          <button class="btn p block" type="submit">โพสต์</button>
        </form>
      </div>
    </div>` : ""}
    ${bottomNavHtml}
  `);

  document.getElementById("headerSearchForm").onsubmit = (e) => {
    e.preventDefault();
    const q = document.getElementById("headerSearchInput").value.trim();
    if (q) location.href = "search.html?q=" + encodeURIComponent(q);
  };

  if (!user) return;

  const lo = document.getElementById("logoutLink");
  lo.onclick = async (e) => { e.preventDefault(); await clearSession(); location.href = "index.html"; };

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
  const composeImageInput = document.getElementById("composeImageInput");
  const composeImageBtn = document.getElementById("composeImageBtn");
  const composeImagePreviewWrap = document.getElementById("composeImagePreviewWrap");
  const composeImagePreview = document.getElementById("composeImagePreview");
  const composeImageRemove = document.getElementById("composeImageRemove");
  let composeImageFile = null;

  if (typeof SUBJECTS !== "undefined") {
    composeSubject.innerHTML = visibleSubjects().map(s => `<option value="${s.slug}">${s.icon} ${escHtml(s.name)}</option>`).join("");
  }

  function clearComposeImage(){
    composeImageFile = null;
    composeImageInput.value = "";
    composeImagePreviewWrap.classList.add("hidden");
    composeImageBtn.classList.remove("hidden");
  }

  composeImageBtn.onclick = () => composeImageInput.click();
  composeImageInput.onchange = () => {
    const file = composeImageInput.files[0];
    if (!file) return;
    composeImageFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      composeImagePreview.src = reader.result;
      composeImagePreviewWrap.classList.remove("hidden");
      composeImageBtn.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  };
  composeImageRemove.onclick = clearComposeImage;

  function openCompose(){
    composeMsg.innerHTML = "";
    composeText.value = "";
    clearComposeImage();
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

    let image = "";
    if (composeImageFile){
      btn.textContent = "กำลังอัปโหลดรูป…";
      try {
        const dataUrl = await resizeImageToDataUrlFit(composeImageFile, 1280);
        const upRes = await apiCall("uploadPostImage", { email: user.email, dataUrl, filename: composeImageFile.name });
        if (!upRes.ok){
          btn.disabled = false; btn.textContent = "โพสต์";
          composeMsg.innerHTML = `<div class="msg bad">${escHtml(upRes.error || "อัปโหลดรูปไม่สำเร็จ")}</div>`;
          return;
        }
        image = upRes.url;
      } catch (err) {
        btn.disabled = false; btn.textContent = "โพสต์";
        composeMsg.innerHTML = '<div class="msg bad">อ่านไฟล์รูปไม่สำเร็จ ลองใช้รูปอื่น</div>';
        return;
      }
      btn.textContent = "กำลังโพสต์…";
    }

    const res = await apiCall("createPost", { email: user.email, name: user.name, subject, text, image });

    btn.disabled = false; btn.textContent = "โพสต์";
    if (res.ok){
      composeMsg.innerHTML = '<div class="msg ok">โพสต์เรียบร้อยแล้ว</div>';
      composeText.value = "";
      clearComposeImage();
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

/** ล้างเฉพาะฝั่งเครื่องนี้ (ใช้ตอนเซสชันหมดอายุแล้ว ไม่มีอะไรให้เพิกถอนที่เซิร์ฟเวอร์อีก) */
function clearSessionLocal(){ localStorage.removeItem(SESSION_KEY); }

/** ออกจากระบบ — บอกเซิร์ฟเวอร์ให้ลบเซสชันทิ้งด้วย ไม่งั้น token เดิมยังใช้ได้จนกว่าจะหมดอายุเอง
    ไม่รอผลลัพธ์นานเกินจำเป็น: ถึงเน็ตล่มก็ต้องออกจากระบบฝั่งเครื่องนี้ให้ได้อยู่ดี */
async function clearSession(){
  const session = getSession();
  if (session && session.token){
    try { await apiCall("logout", {}); } catch(e){ /* ออกจากระบบฝั่งเครื่องต่อได้เลย */ }
  }
  clearSessionLocal();
}

function requireLogin(){
  if (!getSession()){
    const back = location.pathname.split("/").pop() + location.search;
    location.href = "login.html?next=" + encodeURIComponent(back);
    return false;
  }
  return true;
}

/* ── หน้าแอดมิน: รหัสผ่านเก็บใน sessionStorage ของแท็บนี้ ใช้ร่วมกันได้ทุกหน้าแอดมิน ── */
const ADMIN_PASS_KEY = "examSiteAdminPass";
function adminPass(){ return sessionStorage.getItem(ADMIN_PASS_KEY) || ""; }
function setAdminPass(p){ sessionStorage.setItem(ADMIN_PASS_KEY, p); }
function clearAdminPass(){ sessionStorage.removeItem(ADMIN_PASS_KEY); }

/** ใช้ในหน้าแอดมินย่อยที่ไม่มีฟอร์มกรอกรหัสผ่านเอง (admin-add.html, admin-import.html)
    ตรวจรหัสผ่านที่ค้างไว้กับเซิร์ฟเวอร์ก่อน ผ่านแล้วเรียก onReady() — ไม่ผ่าน/ไม่มีรหัสผ่านค้างไว้เลย ให้เด้งกลับไปกรอกที่ admin.html */
async function requireAdminSession(onReady){
  const pw = adminPass();
  if (!pw){ location.href = "admin.html"; return; }
  const res = await apiCall("adminLogin", { adminPassword: pw });
  if (!res.ok){ clearAdminPass(); location.href = "admin.html"; return; }
  onReady();
}

/** แถบลิงก์สลับไปมาระหว่าง 3 หน้าแอดมิน (คลังข้อสอบ/โครงสร้าง, เพิ่มทีละข้อ, นำเข้าหลายข้อ) */
function adminNavHtml(active){
  const items = [
    { href: "admin.html", label: "📚 คลังข้อสอบ / โครงสร้าง", key: "admin" },
    { href: "admin-add.html", label: "➕ เพิ่มทีละข้อ", key: "add" },
    { href: "admin-import.html", label: "📥 นำเข้าหลายข้อ (JSON)", key: "import" },
    { href: "admin-lessons.html", label: "📖 เนื้อหาบทเรียน", key: "lessons" }
  ];
  return `<div class="adminnav">` + items.map(it =>
    `<a class="btn ${it.key === active ? "p" : "s"}" href="${it.href}" data-adminnav="${it.key}">${it.label}</a>`
  ).join("") + `</div>`;
}
/** อัปเดต href ของแถบลิงก์แอดมินให้พกวิชาที่เลือกอยู่ไปด้วย เวลาสลับหน้า */
function adminNavSyncSubject(subjectSlug){
  document.querySelectorAll("[data-adminnav]").forEach(a => {
    const base = a.getAttribute("href").split("?")[0];
    a.href = base + "?subject=" + encodeURIComponent(subjectSlug);
  });
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

/* อ่านไฟล์ทั่วไป (เช่น PDF) เป็น data URL ตรง ๆ ไม่มีการย่อ/แปลงรูปเหมือน resizeImageToDataUrl* */
function readFileAsDataUrl(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onload = () => resolve(reader.result);
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

/* แปลงรูปแบบ ![alt](url) ในข้อความเป็น <img> จริง ใช้กับโจทย์/ตัวเลือกที่แนบรูปประกอบ
   รองรับทั้งลิงก์ Drive/https ที่ได้จากการอัปโหลด, data URL, และพาธไฟล์ในเว็บเอง เช่น assets/graphs/xxx.svg
   (สำหรับรูปกราฟ/แผนภาพที่ฝังไว้ในโปรเจกต์ ไม่ต้องอัปโหลดผ่านแอดมิน) — เนื้อหานี้แก้ได้เฉพาะแอดมินเท่านั้น จึงเปิดกว้างพาธได้โดยไม่เสี่ยง */
const IMAGE_MD_RE = /!\[([^\]]*)\]\((?!javascript:)([^\s)]+)\)/g;
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

/* โหมดตัวอย่าง: ประวัติการทำข้อสอบ (หน้าโปรไฟล์) — ของจริงเก็บในชีต Results ผ่าน submitExam อยู่แล้ว
   โหมดตัวอย่างตรวจคะแนนในเบราว์เซอร์ล้วน ๆ ไม่เคยส่งไปเซิร์ฟเวอร์ จึงต้องเก็บเองที่นี่เพื่อให้ทดสอบฟีเจอร์นี้ได้ */
const DEMO_RESULTS_KEY = "examSiteDemoResults";
function demoResultsLoad(){ try { return JSON.parse(localStorage.getItem(DEMO_RESULTS_KEY) || "[]"); } catch(e){ return []; } }
function demoResultsSave(list){ localStorage.setItem(DEMO_RESULTS_KEY, JSON.stringify(list)); }
function demoResultsAdd(entry){
  const list = demoResultsLoad();
  list.push(entry);
  demoResultsSave(list);
}

/* ══ เกณฑ์ "รอบที่นับเข้าถ้วยมหาเทพพยายาม" — ใช้ร่วมกันทั้งโหมดตัวอย่างและป้ายสรุปในหน้าโปรไฟล์ ══
   ต้องตรงกับ TROPHY_MIN_PERCENT / TROPHY_MIN_SECONDS ใน gas/Code.gs ซึ่งเป็นฝ่ายตัดสินจริงตอนจัดอันดับ */
const TROPHY_RULE = { minPercent: 50, minSeconds: 3600 };
function isValidTrophyRound(r){
  return (Number(r.percent) || 0) > TROPHY_RULE.minPercent
      && (Number(r.usedSeconds) || 0) >= TROPHY_RULE.minSeconds
      && !r.auto;
}

/* ตัดเดือนจากเวลาท้องถิ่นของเครื่อง (ไม่ใช่ตัดสตริง ISO ซึ่งเป็น UTC) ให้ตรงกับ monthKey_() ฝั่งเซิร์ฟเวอร์
   ใช้ทั้งในโหมดตัวอย่างและในหน้าโปรไฟล์จริง */
function monthKeyLocal(iso){
  const d = new Date(iso);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function demoNameForEmail(email){
  const u = demoUsers().find(x => x.email === email);
  return u ? u.name : email;
}
function demoRankTrophyRows(rows, limit){
  const byEmail = {};
  rows.forEach(r => {
    const email = r.email;
    if (!byEmail[email]) byEmail[email] = { email, count: 0, percentSum: 0 };
    byEmail[email].count += 1;
    byEmail[email].percentSum += Number(r.percent) || 0;
  });
  const list = Object.keys(byEmail).map(email => {
    const e = byEmail[email];
    return { email, name: demoNameForEmail(email), count: e.count, avgPercent: Math.round((e.percentSum / e.count) * 10) / 10 };
  });
  list.sort((a, b) => (b.count - a.count) || (b.avgPercent - a.avgPercent));

  let rank = 0, shown = 0, prevKey = null;
  const out = [];
  for (let i = 0; i < list.length; i++){
    const entry = list[i];
    const key = entry.count + "|" + entry.avgPercent;
    if (key !== prevKey){ rank = shown + 1; prevKey = key; }
    if (rank > limit) break;
    entry.rank = rank;
    out.push(entry);
    shown++;
  }
  return out;
}
function demoTrophyAction(action, payload){
  const validRows = demoResultsLoad().filter(isValidTrophyRound);

  if (action === "trophyLeaderboard"){
    const targetMonth = String(payload.month || "").trim() || monthKeyLocal(new Date().toISOString());
    const rows = validRows.filter(r => monthKeyLocal(r.timestamp) === targetMonth);
    return { ok:true, month: targetMonth, entries: demoRankTrophyRows(rows, 10) };
  }
  if (action === "trophyAllTime"){
    return { ok:true, entries: demoRankTrophyRows(validRows, 10) };
  }
  // trophyHallOfFame
  const currentMonth = monthKeyLocal(new Date().toISOString());
  const byMonth = {};
  validRows.forEach(r => {
    const month = monthKeyLocal(r.timestamp);
    if (month === currentMonth) return;
    (byMonth[month] = byMonth[month] || []).push(r);
  });
  const months = Object.keys(byMonth).sort().reverse().map(month => {
    const ranked = demoRankTrophyRows(byMonth[month], 10);
    return { month, champions: ranked.filter(e => e.rank === 1) };
  });
  return { ok:true, months };
}

/* โหมดตัวอย่าง: เนื้อหาบทเรียน — เก็บบทเรียนต่อวิชา, แบบทดสอบท้ายบทต่อ lessonId, และประวัติอ่านผ่านแล้วรวมทุกวิชา
   ตรรกะเดียวกับฝั่งเซิร์ฟเวอร์ใน gas/Code.gs (listLessons/getLesson/submitLessonQuiz) */
function demoLessonsKey(subject){ return "examSiteDemoLessons_" + subject; }
function demoLessonsLoad(subject){
  try { return JSON.parse(localStorage.getItem(demoLessonsKey(subject)) || "[]"); } catch(e){ return []; }
}
function demoLessonsSave(subject, list){ localStorage.setItem(demoLessonsKey(subject), JSON.stringify(list)); }

const DEMO_LESSON_QUIZ_KEY = "examSiteDemoLessonQuiz";
function demoLessonQuizAllLoad(){
  try { return JSON.parse(localStorage.getItem(DEMO_LESSON_QUIZ_KEY) || "[]"); } catch(e){ return []; }
}
function demoLessonQuizAllSave(list){ localStorage.setItem(DEMO_LESSON_QUIZ_KEY, JSON.stringify(list)); }

const DEMO_LESSON_PROGRESS_KEY = "examSiteDemoLessonProgress";
function demoLessonProgressLoad(){
  try { return JSON.parse(localStorage.getItem(DEMO_LESSON_PROGRESS_KEY) || "[]"); } catch(e){ return []; }
}
function demoLessonProgressSave(list){ localStorage.setItem(DEMO_LESSON_PROGRESS_KEY, JSON.stringify(list)); }
function demoCompletedLessonIds(email){
  if (!email) return new Set();
  return new Set(demoLessonProgressLoad().filter(r => r.email === email).map(r => r.lessonId));
}

/* สรุปโครงสร้างชุดข้อสอบของวิชาหนึ่ง ใช้แสดงบนการ์ดรายวิชา/หน้าเริ่มทำข้อสอบ (public, ไม่ต้องล็อกอิน/รหัสแอดมิน) */
async function blueprintSummary(subject){
  const res = await apiCall("blueprint", { subject });
  const sections = (res.ok && res.sections) || [];
  return { sections, total: sections.reduce((s,x) => s + (x.count||0), 0) };
}

/** สรุปโครงสร้างของหลายวิชาพร้อมกันด้วยคำขอเดียว — ใช้ที่หน้าแรกและหน้ารายวิชาที่ต้องแสดงหลายการ์ดพร้อมกัน
    (เดิมยิงทีละวิชา หน้ารายวิชา 9 วิชา = 9 คำขอ ทุกครั้งที่เปิดหน้า)
    คืน Map<slug, {sections, total}> — วิชาที่ยังไม่ได้ตั้งโครงสร้างจะได้ total = 0 */
async function blueprintSummaryMap(slugs){
  const map = new Map();
  if (!slugs.length) return map;
  const res = await apiCall("blueprintSummaries", { subjects: slugs });
  const summaries = (res.ok && res.summaries) || {};
  slugs.forEach(slug => {
    const entry = summaries[slug] || { sections: [], total: 0, questionCount: 0 };
    map.set(slug, { sections: entry.sections || [], total: entry.total || 0, questionCount: entry.questionCount || 0 });
  });
  return map;
}

/** วิชานี้ "พร้อมให้ทำ" หรือยัง — ตัดสินจากจำนวนข้อในคลังจริง (questionCount)
    ไม่ใช่จากโครงสร้างชุดข้อสอบ เพราะวิชาที่มีข้อในคลังแต่ยังไม่ได้ตั้งโครงสร้าง ระบบก็สุ่มให้ทำได้อยู่แล้ว
    (ดู serveExam ใน gas/Code.gs ที่ fallback เป็นสุ่มจากคลังทั้งหมดสูงสุด 10 ข้อ) */
function subjectIsReady(summary){
  return !!(summary && summary.questionCount > 0);
}

/** ข้อความสรุปบนป้ายของการ์ดรายวิชา */
function subjectStatText(summary){
  if (!subjectIsReady(summary)) return "ยังไม่มีข้อสอบ";
  if (summary.total) return summary.sections.length + " ส่วน • " + summary.total + " ข้อ";
  return "สุ่มจากคลัง " + summary.questionCount + " ข้อ";
}

/** การ์ดรายวิชา 1 ใบ — ready = กดเข้าไปทำข้อสอบได้, ไม่ ready = การ์ดจาง ๆ ไม่มีปุ่ม
    ใช้ร่วมกันที่ index.html และ subjects.html เพื่อให้หน้าตาและเกณฑ์ตรงกันเสมอ */
function subjectCardHtml(s, summary){
  const ready = subjectIsReady(summary);
  return `
    <div class="card${ready ? "" : " soon"}">
      <span class="tag">${s.icon} ${escHtml(subjectStatText(summary))}</span>
      <h3>${escHtml(s.name)}</h3>
      <p>${escHtml(s.desc)}</p>
      <div class="meta"><span>⏱ ${s.minutes} นาที</span></div>
      ${ready
        ? `<a class="btn p block" href="exam.html?subject=${encodeURIComponent(s.slug)}" style="margin-top:16px">📝 ทำข้อสอบ</a>`
        : `<span class="btn p block disabled" aria-disabled="true" style="margin-top:16px">กำลังเตรียมข้อสอบ</span>`}
    </div>`;
}

/** แยกรายวิชาเป็น 2 กลุ่มตามความพร้อม ด้วยคำขอเดียว — คืน { ready:[], pending:[], map } */
async function splitSubjectsByReadiness(subjects){
  const map = await blueprintSummaryMap(subjects.map(s => s.slug));
  const ready = [], pending = [];
  subjects.forEach(s => (subjectIsReady(map.get(s.slug)) ? ready : pending).push(s));
  return { ready, pending, map };
}

/* ══════════════════════════ ตราสัญลักษณ์ "มหาเทพพยายาม" (ถ้วยความพยายาม) ══════════════════════════
   วาดเป็น SVG ล้วน ไม่มีไฟล์รูปแยก — พารามิเตอร์เดียวกันสร้างได้ทุกอันดับ/ทุกขนาด
   อันดับ 1 = ทอง, อันดับ 2 = เงิน, อันดับ 3-10 = ทองแดง (ดีไซน์จากไฟล์อ้างอิงที่ลูกค้าส่งมา) */
const BADGE_THEMES = {
  gold:   { name:'ทอง',    light:'#fff8d6', mid:'#f0cf6a', deep:'#c9992a', dark:'#7d5a08', edge:'#3d2c03' },
  silver: { name:'เงิน',    light:'#ffffff', mid:'#dbe3ea', deep:'#98a4ae', dark:'#5a646e', edge:'#2b323a' },
  copper: { name:'ทองแดง', light:'#ffdcc2', mid:'#dd9059', deep:'#a85f2f', dark:'#6a3a1a', edge:'#33190a' }
};
const badgeThemeFor = n => n === 1 ? 'gold' : n === 2 ? 'silver' : 'copper';

const BADGE_VBW = 520, BADGE_VBH = 430, BADGE_CX = 260, BADGE_CY = 205, BADGE_VB = `0 0 ${BADGE_VBW} ${BADGE_VBH}`;
const BADGE_D2R = Math.PI / 180;
function badgePt(r, a){ return [(BADGE_CX + r * Math.cos(a * BADGE_D2R)).toFixed(2), (BADGE_CY + r * Math.sin(a * BADGE_D2R)).toFixed(2)]; }

function badgeGearPath(rTip, rRoot, teeth){
  const step = 360 / teeth, tipH = step * 0.22, rootH = step * 0.34;
  let d = '';
  for (let i = 0; i < teeth; i++){
    const a = i * step;
    const p1 = badgePt(rRoot, a - rootH), p2 = badgePt(rTip, a - tipH),
          p3 = badgePt(rTip, a + tipH),   p4 = badgePt(rRoot, a + rootH),
          p5 = badgePt(rRoot, a + step - rootH);
    d += (i === 0 ? `M${p1}` : `L${p1}`);
    d += `L${p2}A${rTip},${rTip} 0 0 1 ${p3}L${p4}A${rRoot},${rRoot} 0 0 1 ${p5}`;
  }
  return d + 'Z';
}
function badgeArcPath(r, a0, a1){
  const p0 = badgePt(r, a0), p1 = badgePt(r, a1);
  const large = ((a1 - a0 + 360) % 360) > 180 ? 1 : 0;
  return `M${p0}A${r},${r} 0 ${large} 1 ${p1}`;
}
function badgeCurvedText(str, r){
  const chars = [...String(str)];
  if (!chars.length) return '';
  const fs = chars.length > 9 ? 24 : 30;
  const step = chars.length > 9 ? 9.5 : 11.5;
  const start = 90 + (chars.length - 1) * step / 2;
  return chars.map((c, i) => {
    const a = start - i * step;
    const p = badgePt(r, a);
    return `<text x="0" y="0" font-size="${fs}" text-anchor="middle" dominant-baseline="central"
      transform="translate(${p[0]},${p[1]}) rotate(${(a - 90).toFixed(2)})">${escHtml(c)}</text>`;
  }).join('');
}
function badgeStar(x, y, s){
  return `<path d="M${x} ${y-s}Q${x+s*0.22} ${y-s*0.22} ${x+s} ${y}Q${x+s*0.22} ${y+s*0.22} ${x} ${y+s}Q${x-s*0.22} ${y+s*0.22} ${x-s} ${y}Q${x-s*0.22} ${y-s*0.22} ${x} ${y-s}Z"/>`;
}

let __badgeUidCounter = 0;
/** สร้างเหรียญตราสัญลักษณ์อันดับเป็น <svg> ทั้งชิ้น — rank: 1-10 ขึ้นไป (>=3 ใช้ธีมทองแดงเดียวกันหมด), size: ความกว้างที่จะแสดงผล (px) */
function rankBadgeSvg(rank, size){
  const num = Number(rank) || 0;
  const t = BADGE_THEMES[badgeThemeFor(num)];
  const uid = 'b' + (++__badgeUidCounter);
  const g = s => `${uid}${s}`;
  const digits = String(num);
  const fs = digits.length > 1 ? 118 : 158;

  const feathers = [
    { a:-12, l:166 }, { a:-26, l:148 }, { a:-40, l:126 }, { a:-54, l:102 }
  ].map(f =>
    `<g transform="rotate(${f.a})"><path d="M0 -8Q${f.l*0.45} -${f.l*0.11} ${f.l} -${f.l*0.24}Q${f.l*0.5} ${f.l*0.055} 0 10Z"/></g>`
  ).join('');
  const wing = `<g transform="translate(342,148)">${feathers}</g>`;

  const circuit = `
    <path d="M-119 -48l-14 14v22h-14" />
    <path d="M-124 -70h-18l-12 12v16" />
    <path d="M-115 14h-20l-12 -14" />
    <circle cx="-147" cy="-12" r="3.4"/><circle cx="-147" cy="0" r="3.4"/>
    <circle cx="-154" cy="-42" r="3.4"/>`;

  const rivets = [160, 200, 250, 290, 340, 20].map(a => {
    const p = badgePt(152, a);
    return `<circle cx="${p[0]}" cy="${p[1]}" r="7" fill="url(#${g('riv')})" stroke="${t.edge}" stroke-width="1.5"/>
            <circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${t.edge}" opacity=".55"/>`;
  }).join('');

  const w = size || BADGE_VBW, h = Math.round(w * BADGE_VBH / BADGE_VBW);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BADGE_VB}" width="${w}" height="${h}" role="img" aria-label="อันดับ ${num} มหาเทพพยายาม">
<defs>
  <linearGradient id="${g('metal')}" x1="0" y1="0" x2="0.35" y2="1">
    <stop offset="0" stop-color="${t.light}"/><stop offset=".16" stop-color="${t.mid}"/>
    <stop offset=".33" stop-color="${t.light}"/><stop offset=".5" stop-color="${t.deep}"/>
    <stop offset=".68" stop-color="${t.mid}"/><stop offset=".85" stop-color="${t.dark}"/>
    <stop offset="1" stop-color="${t.deep}"/>
  </linearGradient>
  <linearGradient id="${g('metal2')}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${t.light}"/><stop offset=".45" stop-color="${t.mid}"/>
    <stop offset=".7" stop-color="${t.deep}"/><stop offset="1" stop-color="${t.dark}"/>
  </linearGradient>
  <linearGradient id="${g('steel')}" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0" stop-color="#7c8896"/><stop offset=".3" stop-color="#cfd8e0"/>
    <stop offset=".55" stop-color="#5d6874"/><stop offset=".8" stop-color="#9aa6b3"/>
    <stop offset="1" stop-color="#39424c"/>
  </linearGradient>
  <linearGradient id="${g('band')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3b444f"/><stop offset=".5" stop-color="#232a33"/><stop offset="1" stop-color="#161b22"/>
  </linearGradient>
  <linearGradient id="${g('riv')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${t.light}"/><stop offset="1" stop-color="${t.dark}"/>
  </linearGradient>
  <radialGradient id="${g('disc')}" cx=".38" cy=".3" r=".85">
    <stop offset="0" stop-color="#4f7fc4"/><stop offset=".55" stop-color="#2c5697"/><stop offset="1" stop-color="#122b52"/>
  </radialGradient>
  <linearGradient id="${g('sheen')}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".38"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <filter id="${g('sh')}" x="-25%" y="-25%" width="150%" height="150%">
    <feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity=".55"/>
  </filter>
</defs>
<g filter="url(#${g('sh')})">
  <g fill="url(#${g('steel')})" stroke="#39424c" stroke-width="2" stroke-linejoin="round">
    ${wing}
    <g transform="translate(${BADGE_VBW},0) scale(-1,1)">${wing}</g>
  </g>
  <path d="M${BADGE_CX-46} ${BADGE_CY+150}h92l-14 46-32 26-32-26z" fill="url(#${g('metal2')})" stroke="${t.edge}" stroke-width="2.5"/>
  <path d="${badgeGearPath(178,158,24)}" fill="url(#${g('metal')})" stroke="${t.edge}" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="160" fill="none" stroke="${t.edge}" stroke-width="2" opacity=".7"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="157" fill="url(#${g('band')})"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="157" fill="url(#${g('sheen')})"/>
  <g transform="translate(${BADGE_CX},${BADGE_CY})" fill="none">
    <g stroke="#7b8795" stroke-width="2.2" fill="#7b8795" opacity=".85">${circuit}</g>
    <g transform="scale(-1,1)" stroke="#7b8795" stroke-width="2.2" fill="#7b8795" opacity=".85">${circuit}</g>
  </g>
  <g fill="none" stroke-linecap="butt">
    <path d="${badgeArcPath(134,150,200)}" stroke="url(#${g('metal2')})" stroke-width="15"/>
    <path d="${badgeArcPath(134,340,30)}" stroke="url(#${g('metal2')})" stroke-width="15"/>
    <path d="${badgeArcPath(134,205,245)}" stroke="url(#${g('steel')})" stroke-width="13"/>
    <path d="${badgeArcPath(134,295,335)}" stroke="url(#${g('steel')})" stroke-width="13"/>
  </g>
  <g fill="url(#${g('metal2')})" stroke="${t.edge}" stroke-width="1.2">
    ${badgeStar(BADGE_CX-40, BADGE_CY-124, 13)}${badgeStar(BADGE_CX, BADGE_CY-132, 19)}${badgeStar(BADGE_CX+40, BADGE_CY-124, 13)}
  </g>
  ${rivets}
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="115" fill="none" stroke="${t.edge}" stroke-width="3" opacity=".8"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="112" fill="url(#${g('metal')})" stroke="${t.edge}" stroke-width="2.5"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="100" fill="url(#${g('disc')})" stroke="${t.edge}" stroke-width="3"/>
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="93" fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".16"/>
  <text x="${BADGE_CX}" y="${BADGE_CY}" text-anchor="middle" dominant-baseline="central"
        font-family="'Arial Black',Impact,'Segoe UI',sans-serif" font-weight="900"
        font-size="${fs}" letter-spacing="${digits.length>1?-6:0}"
        fill="url(#${g('metal')})" stroke="${t.edge}" stroke-width="3" paint-order="stroke">${digits}</text>
  <g font-family="'Arial Black',Impact,'Segoe UI',sans-serif" font-weight="900"
     fill="url(#${g('metal2')})" stroke="${t.edge}" stroke-width="2.2" paint-order="stroke">
    ${badgeCurvedText('มหาเทพพยายาม', 134)}
  </g>
</g>
</svg>`;
}

/** โหลดอันดับถ้วยความพยายามเดือนปัจจุบันครั้งเดียวต่อการโหลดหน้า แล้วแคชเป็น Map<email, rank> ให้จุดอื่นเรียกใช้ซ้ำได้ทันที */
let __trophyRankPromise = null;
function trophyRankMap(){
  if (!__trophyRankPromise){
    __trophyRankPromise = apiCall("trophyLeaderboard", {}).then(res => {
      const map = new Map();
      if (res.ok) (res.entries || []).forEach(e => map.set(String(e.email).toLowerCase(), e.rank));
      return map;
    }).catch(() => new Map());
  }
  return __trophyRankPromise;
}
/** คืน HTML ตราสัญลักษณ์ถ้าอีเมลนี้ติดอันดับเดือนนี้ ไม่ติดคืนสตริงว่าง — ต้อง await trophyRankMap() ให้เสร็จก่อนเรียก */
function trophyBadgeHtml(email, rankMap, size){
  const rank = rankMap && rankMap.get(String(email || "").toLowerCase());
  if (!rank) return "";
  return `<span class="rank-badge" title="อันดับ ${rank} มหาเทพพยายามประจำเดือนนี้">${rankBadgeSvg(rank, size)}</span>`;
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
function postCardHtml(p, viewerEmail, rankMap){
  const meta = postSubjectMeta(p.subject);
  const mine = p.email === viewerEmail;
  return `
  <div class="post" data-id="${escHtml(p.id)}">
    <div class="head">
      <div>
        <div class="who">${escHtml(p.name)}${trophyBadgeHtml(p.email, rankMap, 18)}</div>
        ${meta ? `<span class="tag" style="margin-top:6px">${meta.icon} ${escHtml(meta.name)}</span>` : ""}
      </div>
      <span class="when">${postFmtTime(p.timestamp)}</span>
    </div>
    <div class="body">${escHtml(p.text)}</div>
    ${p.image ? `<img class="post-image" src="${escHtml(p.image)}" alt="" loading="lazy">` : ""}
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

  async function render(posts){
    if (!posts.length){
      listEl.innerHTML = `<p class="muted">${emptyMessage}</p>`;
      return;
    }
    const rankMap = await trophyRankMap();
    listEl.innerHTML = posts.map(p => postCardHtml(p, user.email, rankMap)).join("");
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
    const [res, rankMap] = await Promise.all([apiCall("listComments", { postId: id }), trophyRankMap()]);
    commentsCache[id] = (res.ok && res.comments) || [];
    const comments = commentsCache[id];
    box.innerHTML = comments.length
      ? comments.map(c => `
        <div class="comment" data-id="${escHtml(c.id)}">
          <div style="display:flex;justify-content:space-between;gap:8px">
            <span class="who">${escHtml(c.name)}${trophyBadgeHtml(c.email, rankMap, 15)}</span>
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

/* เซสชันหมดอายุ/ถูกเพิกถอน — ล้างของเก่าทิ้งแล้วพากลับไปล็อกอิน พร้อมจำหน้าที่ค้างไว้
   รวมไว้ที่เดียวใน apiCall ทุกหน้าจึงได้พฤติกรรมเดียวกันโดยไม่ต้องเขียนซ้ำ */
let __sessionExpiredHandled = false;
function handleSessionExpired(){
  if (__sessionExpiredHandled) return;   // หลายคำขอพร้อมกันอาจตอบกลับมาพร้อมกัน เด้งครั้งเดียวพอ
  __sessionExpiredHandled = true;
  clearSessionLocal();
  const back = location.pathname.split("/").pop() + location.search;
  alert("เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบอีกครั้ง");
  location.href = "login.html?next=" + encodeURIComponent(back);
}

async function apiCall(action, payload){
  if (APP.demoMode){
    return demoApi(action, payload);
  }
  // แนบ sessionToken ให้อัตโนมัติ — เซิร์ฟเวอร์ใช้ค่านี้ตัดสินว่าใครเป็นคนขอ ไม่ใช่อีเมลใน payload
  const session = getSession();
  const auth = session && session.token ? { sessionToken: session.token } : {};
  try {
    const r = await fetch(APP.endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(Object.assign({ token: APP.token, action }, auth, payload))
    });
    const res = await r.json();
    if (res && res.sessionExpired) handleSessionExpired();
    return res;
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
    return { ok:true, email, name: payload.name, age: payload.age, school: payload.school, avatar: "", sessionToken: "demo-session" };
  }

  if (action === "login"){
    const email = String(payload.email || "").trim().toLowerCase();
    const u = users.find(x => x.email === email);
    if (!u || u.passHash !== await sha256(payload.password))
      return { ok:false, error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    return { ok:true, email: u.email, name: u.name, age: u.age, school: u.school, avatar: u.avatar || "", sessionToken: "demo-session" };
  }

  if (action === "updateAvatar"){
    const email = String(payload.email || "").trim().toLowerCase();
    const idx = users.findIndex(u => u.email === email);
    if (idx < 0) return { ok:false, error:"ไม่พบบัญชีนี้" };
    users[idx].avatar = payload.avatar || "";
    demoSaveUsers(users);
    return { ok:true, avatar: users[idx].avatar };
  }

  if (action === "logout") return { ok:true };

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

  /* นำเข้าทีละมาก ๆ — เขียนลง localStorage ทีเดียวเหมือนที่ฝั่งเซิร์ฟเวอร์เขียนชีตทีเดียว */
  if (action === "adminAddQuestionsBulk"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoBankLoad(payload.subject);
    let added = 0, updated = 0;
    (payload.items || []).forEach((item, i) => {
      const id = item.id || ("q_" + Date.now().toString(36) + i.toString(36));
      const q = { id, type: item.type, text: item.text, options: item.options || [], answer: item.answer,
                  score: item.score || 1, note: item.note || "", strand: item.strand || "" };
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0){ list[idx] = q; updated++; } else { list.push(q); added++; }
    });
    demoBankSave(payload.subject, list);
    return { ok:true, added, updated, failures: [] };
  }

  if (action === "adminSaveLessonQuizItemsBulk"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoLessonQuizAllLoad();
    let added = 0, updated = 0;
    (payload.items || []).forEach((item, i) => {
      const id = item.id || ("lq_" + Date.now().toString(36) + i.toString(36));
      const q = { id, lessonId: payload.lessonId, type: item.type, text: item.text,
                  options: item.options || [], answer: item.answer, note: item.note || "" };
      const idx = list.findIndex(x => x.id === id);
      if (idx >= 0){ list[idx] = q; updated++; } else { list.push(q); added++; }
    });
    demoLessonQuizAllSave(list);
    return { ok:true, added, updated, failures: [] };
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

  if (action === "blueprintSummaries"){
    const summaries = {};
    (payload.subjects || []).forEach(slug => {
      const sections = demoBlueprintLoad(slug);
      summaries[slug] = { sections, total: sections.reduce((s, x) => s + (x.count || 0), 0),
                          questionCount: demoBankLoad(slug).length };
    });
    return { ok:true, summaries };
  }

  if (action === "listMyResults"){
    const email = String(payload.email || "").trim().toLowerCase();
    const results = demoResultsLoad()
      .filter(r => r.email === email)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { ok:true, results };
  }

  if (action === "trophyLeaderboard" || action === "trophyAllTime" || action === "trophyHallOfFame"){
    return demoTrophyAction(action, payload);
  }

  if (action === "listLessons"){
    const email = String(payload.email || "").trim().toLowerCase();
    const done = demoCompletedLessonIds(email);
    const lessons = demoLessonsLoad(payload.subject).filter(l => l.visible !== false)
      .sort((a, b) => a.order - b.order)
      .map(l => ({ id: l.id, strand: l.strand, order: l.order, title: l.title, completed: done.has(l.id) }));
    return { ok:true, lessons };
  }

  if (action === "getLesson"){
    const email = String(payload.email || "").trim().toLowerCase();
    let found = null, subjectOfLesson = null;
    for (const s of SUBJECTS){
      const l = demoLessonsLoad(s.slug).find(x => x.id === payload.id);
      if (l){ found = l; subjectOfLesson = s.slug; break; }
    }
    if (!found) return { ok:false, error:"ไม่พบเนื้อหานี้" };
    if (found.visible === false) return { ok:false, error:"เนื้อหานี้ยังไม่เปิดให้เข้าดู" };
    const quiz = demoLessonQuizAllLoad().filter(q => q.lessonId === payload.id)
      .map(q => ({ id:q.id, type:q.type, text:q.text, options:q.options || [] }));
    return {
      ok:true,
      // โหมดตัวอย่างเก็บไฟล์ PDF เป็น data URL ตรง ๆ ใน pdfUrl อยู่แล้ว (ไม่มี Drive) — ขอเนื้อไฟล์ทาง getLessonPdf เหมือนของจริง
      lesson: { id: found.id, subject: subjectOfLesson, strand: found.strand, title: found.title,
                pdfUrl: found.pdfUrl, hasPdf: !!found.pdfUrl },
      quiz,
      completed: demoCompletedLessonIds(email).has(found.id)
    };
  }

  if (action === "getLessonPdf"){
    for (const s of SUBJECTS){
      const l = demoLessonsLoad(s.slug).find(x => x.id === payload.id);
      if (l) return l.pdfUrl ? { ok:true, pdfDataUrl: l.pdfUrl } : { ok:false, error:"บทนี้ยังไม่มีไฟล์เนื้อหา" };
    }
    return { ok:false, error:"ไม่พบเนื้อหานี้" };
  }

  if (action === "submitLessonQuiz"){
    const email = String(payload.email || "").trim().toLowerCase();
    if (!email) return { ok:false, error:"กรุณาเข้าสู่ระบบก่อน" };
    const quizItems = demoLessonQuizAllLoad().filter(q => q.lessonId === payload.lessonId);
    if (!quizItems.length) return { ok:false, error:"บทนี้ยังไม่มีแบบทดสอบท้ายบท" };
    const ansIn = payload.answers || {};
    let allCorrect = true;
    const detail = {};
    quizItems.forEach(q => {
      const correct = answerMatches(q.type, ansIn[q.id], q.answer);
      if (!correct) allCorrect = false;
      detail[q.id] = { correct, answer: q.answer, note: q.note || "" };
    });
    if (allCorrect){
      const list = demoLessonProgressLoad();
      if (!list.some(r => r.email === email && r.lessonId === payload.lessonId)){
        list.push({ email, lessonId: payload.lessonId, completedAt: new Date().toISOString() });
        demoLessonProgressSave(list);
      }
    }
    return { ok:true, allCorrect, detail };
  }

  if (action === "adminListLessons"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const quizItems = demoLessonQuizAllLoad();
    const lessons = demoLessonsLoad(payload.subject).slice().sort((a, b) => a.order - b.order)
      .map(l => Object.assign({ quizCount: quizItems.filter(q => q.lessonId === l.id).length }, l));
    return { ok:true, lessons };
  }

  if (action === "adminSaveLesson"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoLessonsLoad(payload.subject);
    const id = payload.id || ("lsn_" + Date.now().toString(36));
    const idx = list.findIndex(x => x.id === id);
    // ใช้ order สูงสุด+1 ของสาระนั้น (ไม่ใช่จำนวนบทที่เหลือ) กัน order ชนกันหลังลบบทกลางๆ ออกไปแล้วเพิ่มใหม่
    let order = idx >= 0 ? list[idx].order
      : list.filter(x => x.strand === payload.strand).reduce((m, x) => Math.max(m, x.order || 0), -1) + 1;
    const lesson = { id, strand: payload.strand, order, title: payload.title, pdfUrl: payload.pdfUrl,
                      visible: payload.visible !== false };
    if (idx >= 0) list[idx] = lesson; else list.push(lesson);
    demoLessonsSave(payload.subject, list);
    return { ok:true, id };
  }

  if (action === "adminDeleteLesson"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    for (const s of SUBJECTS){
      const list = demoLessonsLoad(s.slug);
      if (list.some(x => x.id === payload.id)){
        demoLessonsSave(s.slug, list.filter(x => x.id !== payload.id));
        break;
      }
    }
    demoLessonQuizAllSave(demoLessonQuizAllLoad().filter(q => q.lessonId !== payload.id));
    demoLessonProgressSave(demoLessonProgressLoad().filter(r => r.lessonId !== payload.id));
    return { ok:true };
  }

  if (action === "adminReorderLessons"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoLessonsLoad(payload.subject);
    (payload.orderedIds || []).forEach((id, i) => {
      const l = list.find(x => x.id === id);
      if (l) l.order = i;
    });
    demoLessonsSave(payload.subject, list);
    return { ok:true };
  }

  if (action === "adminListLessonQuiz"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    return { ok:true, quiz: demoLessonQuizAllLoad().filter(q => q.lessonId === payload.lessonId) };
  }

  if (action === "adminSaveLessonQuizItem"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    const list = demoLessonQuizAllLoad();
    const id = payload.id || ("lq_" + Date.now().toString(36));
    const idx = list.findIndex(x => x.id === id);
    const item = { id, lessonId: payload.lessonId, type: payload.type, text: payload.text,
                    options: payload.options || [], answer: payload.answer, note: payload.note || "" };
    if (idx >= 0) list[idx] = item; else list.push(item);
    demoLessonQuizAllSave(list);
    return { ok:true, id };
  }

  if (action === "adminDeleteLessonQuizItem"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    demoLessonQuizAllSave(demoLessonQuizAllLoad().filter(q => q.id !== payload.id));
    return { ok:true };
  }

  if (action === "uploadQuestionImage"){
    if (payload.adminPassword !== APP.demoAdminPassword) return { ok:false, error:"unauthorized" };
    return { ok:true, url: payload.dataUrl };
  }

  if (action === "uploadLessonPdf"){
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
    // เลือกชุดแรกตามชื่อ (เรียงแบบเดียวกับ adminListBlueprintConfigs) แทนตัวแรกในอาเรย์แบบสุ่มลำดับ
    if (wasActive && configs.length){
      let promoted = configs[0];
      configs.forEach(c => { if (c.name.localeCompare(promoted.name, "th") < 0) promoted = c; });
      promoted.active = true;
    }
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
    const image = String(payload.image || "").trim();
    if (!email || !name || !subject || !text) return { ok:false, error:"กรอกข้อมูลไม่ครบ" };
    const posts = demoPostsLoad();
    const post = { id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2,6),
                    timestamp: new Date().toISOString(), email, name, subject, text, image, likeCount: 0 };
    posts.push(post);
    demoPostsSave(posts);
    return { ok:true, post: Object.assign({}, post, { commentCount:0, likedByMe:false }) };
  }

  if (action === "uploadPostImage"){
    if (!String(payload.email || "").trim()) return { ok:false, error:"unauthorized" };
    return { ok:true, url: payload.dataUrl };
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
