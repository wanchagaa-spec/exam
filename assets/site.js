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
  endpoint: "https://script.google.com/macros/s/AKfycbwUQZOOj_YEw3zyUBXRpdzh_p4LufRZyPxRDt_Oi0xEscA2MOtdjos6BgITfFBGl4TW/exec",                            // URL ของ Apps Script Web app (ดู gas/Code.gs)
  token:    "ai75jg8f3d9g7k3",      // ต้องตรงกับ TOKEN ใน gas/Code.gs

  facebook: "https://www.facebook.com/",   // ★ ใส่ลิงก์ Facebook Page จริง
  contactEmail: "wanchagaa.fe@gmail.com",     // ★ อีเมลปลายทางฟอร์มติดต่อ (ตั้งใน Code.gs)
  contactName:  "วันชัย วรรณวงค์",
  contactPhone: "",                        // ★ ใส่เบอร์โทรจริงถ้าต้องการแสดง (เว้นว่างได้ ไม่แสดงลิงก์โทร)

  /* รหัสผ่านแอดมิน ใช้เฉพาะตอน demoMode = true เพื่อทดลองหน้า admin.html ในเครื่อง
     ตอนใช้งานจริง หน้าเว็บจะส่งรหัสที่พิมพ์ไปให้ ADMIN_PASSWORD ใน gas/Code.gs ตรวจแทน ไม่เกี่ยวกับค่านี้ */
  demoAdminPassword: "admin123"
};

const NAV = [
  { href:"index.html",     label:"หน้าแรก" },
  { href:"subjects.html",  label:"รายวิชา / ทำข้อสอบ" },
  { href:"news.html",      label:"ข่าวสาร / กิจกรรม" },
  { href:"downloads.html", label:"ดาวน์โหลดเอกสาร" },
  { href:"feedback.html",  label:"บอร์ดความคิดเห็น" },
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

/* สรุปโครงสร้างชุดข้อสอบของวิชาหนึ่ง ใช้แสดงบนการ์ดรายวิชา/หน้าเริ่มทำข้อสอบ (public, ไม่ต้องล็อกอิน/รหัสแอดมิน) */
async function blueprintSummary(subject){
  const res = await apiCall("blueprint", { subject });
  const sections = (res.ok && res.sections) || [];
  return { sections, total: sections.reduce((s,x) => s + (x.count||0), 0) };
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
    users.push({ email, name: payload.name, age: payload.age, school: payload.school, passHash: await sha256(payload.password) });
    demoSaveUsers(users);
    return { ok:true, email, name: payload.name, age: payload.age, school: payload.school };
  }

  if (action === "login"){
    const email = String(payload.email || "").trim().toLowerCase();
    const u = users.find(x => x.email === email);
    if (!u || u.passHash !== await sha256(payload.password))
      return { ok:false, error:"อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
    return { ok:true, email: u.email, name: u.name, age: u.age, school: u.school };
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
    const sort = payload.sort === "likes" ? "likes" : "new";
    const viewerEmail = String(payload.viewerEmail || "").trim().toLowerCase();
    const likes = demoLikesLoad();
    const comments = demoCommentsLoad();
    let posts = demoPostsLoad();
    if (subject) posts = posts.filter(p => p.subject === subject);
    posts = posts.map(p => Object.assign({}, p, {
      commentCount: comments.filter(c => c.postId === p.id).length,
      likedByMe: viewerEmail ? likes.some(l => l.postId === p.id && l.email === viewerEmail) : false
    }));
    posts.sort((a,b) => sort === "likes"
      ? (b.likeCount - a.likeCount) || (new Date(b.timestamp) - new Date(a.timestamp))
      : (new Date(b.timestamp) - new Date(a.timestamp)));
    return { ok:true, posts };
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
    else { likes.push({ postId, email }); liked = true; post.likeCount = (post.likeCount||0)+1; }
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
    return { ok:true, comment };
  }

  if (action === "listComments"){
    const postId = payload.postId;
    const comments = demoCommentsLoad().filter(c => c.postId === postId)
      .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { ok:true, comments };
  }

  return { ok:false, error:"โหมดตัวอย่างไม่รองรับคำสั่งนี้" };
}
