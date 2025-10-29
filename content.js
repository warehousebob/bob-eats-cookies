
(async () => {
  try {
    const ls = !!window.localStorage && Object.keys(localStorage).length > 0;
    let idb = false;
    if (indexedDB && indexedDB.databases) {
      try { idb = (await indexedDB.databases()).length > 0; } catch {}
    }
    chrome.runtime.sendMessage({
      type: "STORAGE_SIGNAL",
      domain: location.hostname.replace(/^www\./,""),
      flags: { ls, idb }
    });
  } catch {}
})();
