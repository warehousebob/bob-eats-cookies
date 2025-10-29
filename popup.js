
const CATS = ["Necessary","Functional","Analytics","Advertising","Unknown"];
let aiSession = null;
let currentDomain = "";
let currentPolicy = { blockedCookies: [] };
let currentCookies = [];
let explainedMap = new Map();
let currentFilter = null; // null => all, or one of CATS

// Modal helpers
function showConfirm(message){
  return new Promise((resolve)=>{
    const bd = document.getElementById('confirmBackdrop');
    const tx = document.getElementById('confirmText');
    const ok = document.getElementById('confirmBtn');
    const no = document.getElementById('cancelBtn');
    tx.textContent = message || "Turning off cookies may log you out. Do you want to proceed?";
    const cleanup = ()=>{
      bd.style.display='none';
      ok.onclick = no.onclick = null;
    };
    ok.onclick = ()=>{ cleanup(); resolve(true); };
    no.onclick = ()=>{ cleanup(); resolve(false); };
    bd.style.display='flex';
  });
}

function explainHeuristic(cookie){
  const n = (cookie.name||"").toLowerCase();
  if (n.startsWith('_shopify') || n.includes('shopify') || ['cart','cart_sig','cart_ts','cart_currency','checkout_token'].some(x=>n.includes(x))) {
    return { category: "Functional", reason: "Remembers your cart and checkout so items stay put." };
  }
  if (n.includes('stripe') || n === '__stripe_mid' || n === '__stripe_sid') {
    return { category: "Necessary", reason: "Secure payments and fraud checks during checkout." };
  }
  if (n === '__cf_bm' || n.includes('cf_bm') || n.includes('cloudflare')) {
    return { category: "Necessary", reason: "Bot protection to keep the site available." };
  }
  if (n.includes('optanon') || n.includes('euconsent') || n.includes('consent') || n.startsWith('cookieconsent')) {
    return { category: "Functional", reason: "Saves your cookie consent choices." };
  }
  if (n.startsWith('_ga') || n.startsWith('_gid') || n.startsWith('_gcl') || n.includes('analytics')) {
    return { category: "Analytics", reason: "Measures which pages are visited and for how long." };
  }
  if (n === '_fbp' || n.includes('fbp') || n === '_fbc') {
    return { category: "Advertising", reason: "Helps show ads for this site on Facebook or Instagram." };
  }
  if (n.startsWith('_uet') || n === '_uetsid' || n === '_uetvid') {
    return { category: "Advertising", reason: "Helps show ads for this site on Microsoft/Bing." };
  }
  if (n.includes('_ttp') || n.includes('tt_')) {
    return { category: "Advertising", reason: "Helps show ads for this site on TikTok." };
  }
  if (n.includes('_pin_unauth') || n.includes('_pinterest_sess')) {
    return { category: "Advertising", reason: "Helps show ads for this site on Pinterest." };
  }
  if (n.includes('hotjar') || n.startsWith('_hj') || n.includes('clarity') || n.includes('_clck') || n.includes('datadog') || n.startsWith('__dd') || n.includes('trace')) {
    return { category: "Analytics", reason: "Records clicks or performance to improve the site." };
  }
  if (n.includes('session') || n === 'sid' || n.endsWith('_sid') || n.includes('auth')) {
    return { category: "Necessary", reason: "Keeps you signed in and remembers your session." };
  }
  if (n.includes('pref') || n.includes('lang') || n.includes('locale')) {
    return { category: "Functional", reason: "Remembers language or display preferences." };
  }
  return { category: "Unknown", reason: "Purpose unclear. Likely a site preference or tracker." };
}

function looksLoginRelated(nameOrExpl){
  const s = (nameOrExpl||"").toLowerCase();
  return /session|sid\b|auth|login/.test(s);
}

async function ensureAiSession(){
  if (!("ai" in self) || !ai.languageModel) return {available:false};
  if (!aiSession) aiSession = await ai.languageModel.create({ temperature:0.2, topK:32 });
  return {available:true};
}
async function aiExplain(cookie){
  try{
    const ok = await ensureAiSession(); if (!ok.available) return null;
    const schema = { type:"object", properties:{ category:{enum:CATS}, reason:{type:"string",maxLength:140}}, required:["category","reason"], additionalProperties:false };
    const prompt = `Return JSON only.
Explain what this cookie does in <=140 chars for a regular shopper. Also give a category from: ${CATS.join(", ")}.
name: ${cookie.name}
domain: ${cookie.domain}
firstParty: ${cookie.firstParty}
secure: ${cookie.secure}
httpOnly: ${cookie.httpOnly}
sameSite: ${cookie.sameSite}
expiresIn: ${cookie.expiry}`;
    const response = await aiSession.prompt(prompt, { responseSchema: schema });
    if (typeof response === "string") { try { return JSON.parse(response); } catch {} }
    else if (response && typeof response === "object") { return response; }
    return null;
  } catch { return null; }
}

function setToggle(el, on){ el.classList.toggle('on', !!on); }

function filterCookies(cookies){
  if (!currentFilter) return cookies;
  return cookies.filter(c => {
    const exp = explainedMap.get(c.name) || explainHeuristic(c);
    return exp.category === currentFilter;
  });
}

function renderList(domain, cookies, policy){
  const order = { Necessary:0, Functional:1, Analytics:2, Advertising:3, Unknown:9 };
  const sorted = [...filterCookies(cookies)].sort((a,b)=>{
    const ea = explainedMap.get(a.name) || explainHeuristic(a);
    const eb = explainedMap.get(b.name) || explainHeuristic(b);
    const cat = (order[ea.category] - order[eb.category]); if (cat) return cat;
    if (a.present !== b.present) return a.present ? -1 : 1;
    const as = a.size||0, bs=b.size||0; if (as!==bs) return bs-as;
    return a.name.localeCompare(b.name);
  });

  const list = document.getElementById("list");
  list.innerHTML = sorted.map((c)=>{
    const exp = explainedMap.get(c.name) || explainHeuristic(c);
    const blocked = (policy.blockedCookies||[]).includes(c.name);
    const id = `tg_${c.name.replace(/[^a-z0-9]/gi,'_')}`;
    const allowed = !blocked;
    return `<div class="row ${blocked?'off':''}">
      <div class="icon">🍪</div>
      <div>
        <div><strong>${c.name}</strong></div>
        <div class="meta">${c.domain || '(remembered)'} • ${c.expiry || ''} • ${c.present ? 'present' : '<span class="pill">absent</span>'} • ${(explainedMap.get(c.name)||explainHeuristic(c)).category}</div>
        <div>${(explainedMap.get(c.name)||explainHeuristic(c)).reason}</div>
      </div>
      <div><div id="${id}" class="toggle ${allowed?'on':''}"><div class="knob"></div></div></div>
    </div>`;
  }).join("");

  sorted.forEach(c=>{
    const id = `tg_${c.name.replace(/[^a-z0-9]/gi,'_')}`;
    const el = document.getElementById(id);
    el.addEventListener('click', async ()=>{
      const nowOn = !el.classList.contains('on');
      // if turning off a likely login cookie, confirm
      if (!nowOn){
        const exp = explainedMap.get(c.name) || explainHeuristic(c);
        const risky = (exp.category === "Necessary") || looksLoginRelated(c.name) || looksLoginRelated(exp.reason);
        if (risky){
          const ok = await showConfirm(`Turn off “${c.name}” on ${currentDomain}?`);
          if (!ok) return; // abort
        }
      }
      setToggle(el, nowOn);
      const block = !nowOn;
      const set = new Set(currentPolicy.blockedCookies||[]);
      if (block) set.add(c.name); else set.delete(c.name);
      currentPolicy.blockedCookies = Array.from(set);
      const row = el.closest('.row'); if (row) row.classList.toggle('off', block);
      await chrome.runtime.sendMessage({ type:"SET_BLOCK_LIST", domain, names:[c.name], block });
    });
  });

  return sorted;
}

function updateTotalAndFilterCounts(cookies){
  const total = cookies.length;
  const counts = {};
  for (const c of cookies){
    const exp = explainedMap.get(c.name) || explainHeuristic(c);
    counts[exp.category] = (counts[exp.category] || 0) + 1;
  }
  document.getElementById('totalChip').textContent = `Total cookies: ${total} ▾`;
  const fc = document.getElementById('filterChips');
  fc.innerHTML = [
    `<div class="chip ${!currentFilter?'active':''}" data-cat="__all">Show all (${total})</div>`,
    ...CATS.map(cat => `<div class="chip ${currentFilter===cat?'active':''}" data-cat="${cat}">${cat}: ${counts[cat]||0}</div>`)
  ].join('');
  fc.querySelectorAll('.chip').forEach(ch => {
    ch.onclick = () => {
      const cat = ch.getAttribute('data-cat');
      currentFilter = (cat === '__all') ? null : cat;
      document.getElementById('filterDropdown').classList.remove('open');
      renderList(currentDomain, currentCookies, currentPolicy);
      updateTotalAndFilterCounts(currentCookies);
      document.getElementById('listTitle').textContent = currentFilter ? `${currentFilter} cookies` : 'Cookies on this site';
    };
  });
}

async function safeGetState(){
  try{
    const s = await chrome.runtime.sendMessage({ type: "GET_STATE" });
    if (!s || !s.cookies || s.cookies.length===0){
      // force a fresh scan as a fallback
      return await chrome.runtime.sendMessage({ type: "FORCE_STATE" });
    }
    return s;
  }catch(e){
    return await chrome.runtime.sendMessage({ type: "FORCE_STATE" });
  }
}

async function main(){
  const state = await safeGetState();
  currentDomain = state.domain;
  currentPolicy = state.policy || { blockedCookies: [] };
  currentCookies = state.cookies || [];

  explainedMap = new Map();
  for (const c of currentCookies){ const aiRes = await aiExplain(c); explainedMap.set(c.name, aiRes || explainHeuristic(c)); }

  const totalChip = document.getElementById('totalChip');
  const dd = document.getElementById('filterDropdown');
  totalChip.onclick = () => dd.classList.toggle('open');

  updateTotalAndFilterCounts(currentCookies);
  const ordered = renderList(currentDomain, currentCookies, currentPolicy);

  // Master toggle applies to visible set; confirm if any look like login/session
  const master = document.getElementById('masterToggle');
  let visible = filterCookies(currentCookies);
  const allAllowedVisible = visible.every(c => !(currentPolicy.blockedCookies||[]).includes(c.name));
  setToggle(master, allAllowedVisible);
  master.onclick = async ()=>{
    visible = filterCookies(currentCookies);
    const currentlyOn = master.classList.contains('on');
    const shouldAllow = !currentlyOn;
    const names = visible.map(c=>c.name);

    if (!shouldAllow){
      // Turning Off visible set – check for risky cookies
      const riskyCount = visible.filter(c => {
        const exp = explainedMap.get(c.name) || explainHeuristic(c);
        return exp.category === "Necessary" || looksLoginRelated(c.name) || looksLoginRelated(exp.reason);
      }).length;
      if (riskyCount>0){
        const ok = await showConfirm(`Turn off ${riskyCount} sign-in/session cookies on ${currentDomain}?`);
        if (!ok) return; // abort
      }
    }

    setToggle(master, shouldAllow);
    currentPolicy.blockedCookies = shouldAllow
      ? (currentPolicy.blockedCookies||[]).filter(n => !names.includes(n))
      : Array.from(new Set([...(currentPolicy.blockedCookies||[]), ...names]));
    renderList(currentDomain, currentCookies, currentPolicy);
    await chrome.runtime.sendMessage({ type:"SET_BLOCK_LIST", domain: currentDomain, names, block: !shouldAllow });
  };
}
main();

// ping badge update after UI opens
chrome.runtime.sendMessage({ type: "REFRESH_BADGE" });

window.addEventListener('load', ()=> chrome.runtime.sendMessage({type:'REFRESH_BADGE'}));

chrome.runtime.sendMessage({type:'REFRESH_BADGE_COLORS'});
