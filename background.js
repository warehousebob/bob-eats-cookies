
// --- Helpers ---
function siteKeyFromUrl(url){
  try{ const u = new URL(url); return u.hostname || ""; }catch(e){ return ""; }
}
async function listCookiesForUrl(url){
  try{ return await chrome.cookies.getAll({ url }); }catch(e){ return []; }
}
async function getPolicyForDomain(domain){
  const { policies = {} } = await chrome.storage.local.get("policies");
  return policies[domain] || { blockedCookies: [] };
}
async function setPolicyForDomain(domain, policy){
  const store = await chrome.storage.local.get("policies");
  const policies = store.policies || {};
  policies[domain] = policy;
  await chrome.storage.local.set({ policies });
}

// --- Badge (always red with white text) ---
async function updateBadge(tabId, url){
  try{
    if(!url || !/^https?:/i.test(url)){
      await chrome.action.setBadgeText({tabId, text:""}); return;
    }
    const cookiesNow = await listCookiesForUrl(url);
    const text = cookiesNow.length > 99 ? "99+" : String(cookiesNow.length);
    await chrome.action.setBadgeText({tabId, text});
    await chrome.action.setBadgeBackgroundColor({tabId, color:"#ef4444"});
    if (chrome.action.setBadgeTextColor) await chrome.action.setBadgeTextColor({tabId, color:"#ffffff"});
  }catch(e){}
}
chrome.tabs.onActivated.addListener(async info=>{
  try{ const tab = await chrome.tabs.get(info.tabId); await updateBadge(info.tabId, tab.url); }catch(e){}
});
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab)=>{
  if(changeInfo.status==="complete"){ await updateBadge(tabId, tab.url); }
});
chrome.runtime.onInstalled.addListener(async ()=>{
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (tab?.id) await updateBadge(tab.id, tab.url);
});
chrome.runtime.onStartup.addListener(async ()=>{
  const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
  if (tab?.id) await updateBadge(tab.id, tab.url);
});

// --- Core state RPCs for popup ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  if (!msg || !msg.type) return;

  if (msg.type === "GET_STATE" || msg.type === "FORCE_STATE"){
    (async()=>{
      try{
        const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
        const url = tab?.url || "";
        const domain = siteKeyFromUrl(url);
        const policy = await getPolicyForDomain(domain);
        const cookies = await listCookiesForUrl(url);
        sendResponse({ url, domain, policy, cookies });
      }catch(e){
        sendResponse({ url:"", domain:"", policy:{blockedCookies:[]}, cookies:[] });
      }
    })();
    return true;
  }

  if (msg.type === "SET_BLOCK_LIST"){
    (async()=>{
      try{
        const domain = msg.domain;
        const names = msg.names || [];
        const block = !!msg.block;
        const policy = await getPolicyForDomain(domain);
        const set = new Set(policy.blockedCookies || []);
        if (block) names.forEach(n => set.add(n)); else names.forEach(n => set.delete(n));
        policy.blockedCookies = Array.from(set);
        await setPolicyForDomain(domain, policy);

        // Remove current cookies matching names
        const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
        const url = tab?.url || (domain ? `https://${domain}/` : "");
        for (const name of names){
          try{ await chrome.cookies.remove({ url, name }); }catch(e){}
        }
        // Update badge after changes
        if (tab?.id) await updateBadge(tab.id, url);
        sendResponse({ ok:true });
      }catch(e){ sendResponse({ ok:false, error:String(e) }); }
    })();
    return true;
  }

  if (msg.type === "REFRESH_BADGE" || msg.type==="REFRESH_BADGE_COLORS"){
    (async()=>{
      const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
      if (tab?.id) await updateBadge(tab.id, tab.url);
      sendResponse({ ok:true });
    })();
    return true;
  }
});
