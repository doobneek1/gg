/* In‑app gghost overlay with notes functionality inspired by doobneek-extension/gghost.js
 * Features:
 * - Lists past notes for the location (read-only)
 * - Add note for today (requires setting user name + password once)
 * - Mark pending "reminder" notes as Done
 * - Validation history mini-chart (last 12 months) using /stats
 * - Quick links to YourPeer (open in new tab)
 */

import config from '../config';

const DEFAULT_BASE_URL = 'https://doobneek-fe7b7-default-rtdb.firebaseio.com/';
const DEFAULT_NOTE_API = 'https://locationnote-iygwucy2fa-uc.a.run.app';

function parseUuidFromPath(pathname) {
  // /team/location/:uuid/... or /team/location/:uuid
  const m = pathname.match(/^\/team\/location\/([a-f0-9-]{8}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{4}-[a-f0-9-]{12})(?:\b|\/|$)/i);
  return m ? m[1] : null;
}

function removeOverlay() {
  const el = document.getElementById('gg-note-overlay');
  if (el && el.parentNode) el.parentNode.removeChild(el);
}

async function mountOverlay(uuid) {
  if (document.getElementById('gg-note-overlay')) return;

  const baseURL = (window.gghost && window.gghost.baseURL) || DEFAULT_BASE_URL;
  const NOTE_API = (window.gghost && window.gghost.NOTE_API) || DEFAULT_NOTE_API;
  const notesUrl = `${baseURL}locationNotes/${uuid}.json`;
  const statsUrl = `${baseURL}locationNotes/${uuid}/stats.json`;

  // container
  const overlay = document.createElement('div');
  overlay.id = 'gg-note-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    width: '360px',
    maxHeight: '50vh',
    background: '#fff',
    border: '2px solid #000',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    zIndex: 2147483647,
    pointerEvents: 'auto',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  });

  const header = document.createElement('div');
  Object.assign(header.style, {
    padding: '8px 12px',
    background: '#eee',
    borderBottom: '1px solid #ccc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontWeight: 600,
    pointerEvents: 'auto',
  });
  header.textContent = 'Notes (gghost)';

  const close = document.createElement('button');
  close.textContent = '×';
  Object.assign(close.style, { border: '1px solid #aaa', background: '#fff', width: '22px', height: '22px', borderRadius: '50%', cursor: 'pointer' });
  close.onclick = removeOverlay;
  header.appendChild(close);

  const body = document.createElement('div');
  Object.assign(body.style, { padding: '10px', overflowY: 'auto', maxHeight: 'calc(50vh - 46px)', fontSize: '13px', pointerEvents: 'auto' });
  body.textContent = 'Loading…';

  overlay.appendChild(header);
  overlay.appendChild(body);
  document.body.appendChild(overlay);

  // Nav / toolbar
  const toolbar = document.createElement('div');
  Object.assign(toolbar.style, { padding: '8px 10px', borderTop: '1px solid #eee', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', pointerEvents: 'auto' });
  overlay.appendChild(toolbar);

  const mkBtn = (label, primary=false) => { const b=document.createElement('button'); b.textContent=label; styleButton(b,primary); toolbar.appendChild(b); return b; };
  const settingsBtn = mkBtn('Settings');
  const ypBtn = mkBtn('Open on YourPeer');
  const addBtn = mkBtn('Add Note', true);
  const siteVisitBtn = mkBtn('Site Visit');
  const ypMiniBtn = mkBtn('YP Mini');
  const reminderBtn = mkBtn('Reminder');
  const connectionsBtn = mkBtn('Connections');
  const futureBtn = mkBtn('Future/Online');

  // Credentials store
  const cred = readCreds();
  settingsBtn.onclick = () => openSettings(cred);

  ypBtn.onclick = async () => {
    try {
      const data = await fetchLocation(uuid);
      const slug = data && data.slug;
      if (slug) window.open(`https://yourpeer.nyc/locations/${slug}`, '_blank');
      else alert('Slug not found for this location');
    } catch (e) { alert('Failed to load location'); }
  };

  addBtn.onclick = async () => {
    const { userName, userPassword } = readCreds();
    if (!userName || !userPassword) { openSettings(cred); return; }
    const note = prompt('Enter note (will be posted for today):');
    if (!note || !note.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    try {
      await postNote(NOTE_API, { uuid, userName, userPassword, date: today, note: note.trim() });
      await renderAll();
    } catch (e) { alert('Failed to post note'); }
  };

  siteVisitBtn.onclick = () => openSiteVisit(uuid, readCreds());
  ypMiniBtn.onclick = async () => {
    try { const data = await fetchLocation(uuid); const slug = data && data.slug; if (!slug) { alert('Slug not found'); return; }
      openYPMini(slug);
    } catch (_) { alert('Failed to load location'); }
  };
  reminderBtn.onclick = () => openReminder(uuid, readCreds(), NOTE_API);
  connectionsBtn.onclick = () => openConnections(body, uuid, NOTE_API, baseURL, readCreds());
  futureBtn.onclick = () => openFutureOnline(uuid, NOTE_API, readCreds());

  async function renderAll() {
    body.textContent = 'Loading…';
    try {
      // record validation stat opportunistically (no-op on error)
      recordValidationStat(uuid, baseURL).catch(() => {});

      const [notes, stats] = await Promise.all([
        fetchNotes(notesUrl),
        fetchStats(statsUrl),
      ]);
      renderNotes(body, notes, NOTE_API, uuid);
      renderEditor(body, notes, NOTE_API, uuid);
      renderChart(body, stats);
    } catch (e) {
      body.textContent = 'Failed to load notes';
      // eslint-disable-next-line no-console
      console.warn('[gghostOverlay] Failed to render', e);
    }
  }

  await renderAll();
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initGghostOverlay(history) {
  const tryMount = () => {
    const uuid = parseUuidFromPath(window.location.pathname);
    if (uuid) {
      // Only mount once per page
      if (!document.getElementById('gg-note-overlay')) {
        mountOverlay(uuid);
      }
      ensurePageSwitchButtons();
    } else {
      removeOverlay();
    }
  };

  // Initial
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryMount);
  } else {
    tryMount();
  }

  // React Router updates
  if (history && typeof history.listen === 'function') {
    history.listen(() => {
      setTimeout(tryMount, 0);
    });
  }
}

export default { initGghostOverlay };

// ------------------- helpers ---------------------

function styleButton(btn, primary = false) {
  Object.assign(btn.style, {
    border: '1px solid #000',
    background: primary ? '#e6ffe6' : '#fff',
    borderRadius: '4px',
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: '12px',
    pointerEvents: 'auto',
  });
}

function readCreds() {
  const userName = localStorage.getItem('gghost.userName') || '';
  const userPassword = localStorage.getItem('gghost.userPassword') || '';
  // expose for legacy scripts
  window.gghostUserName = userName;
  window.gghostPassword = userPassword;
  return { userName, userPassword };
}

function openSettings(cur) {
  const userName = prompt('Enter your name (for notes):', cur.userName || '');
  if (userName == null) return; // cancel
  const userPassword = prompt('Enter your passphrase (for NOTE_API):', cur.userPassword || '');
  if (userPassword == null) return;
  localStorage.setItem('gghost.userName', userName.trim());
  localStorage.setItem('gghost.userPassword', userPassword.trim());
  window.gghostUserName = userName.trim();
  window.gghostPassword = userPassword.trim();
}

async function fetchLocation(uuid) {
  const resp = await fetch(`${config.baseApi}/locations/${uuid}`);
  if (!resp.ok) throw new Error('loc fetch');
  return resp.json();
}

async function recordValidationStat(uuid, baseURL) {
  try {
    const data = await fetchLocation(uuid);
    const lastValidated = data && (data.last_validated_at || data.lastValidated);
    if (!lastValidated) return;
    const url = `${baseURL}locationNotes/${uuid}/stats.json`;
    // read before write to avoid duplicates
    const ex = await fetch(url).then(r => r.json()).catch(() => ({})) || {};
    const exists = Object.values(ex).some(v => v && (v.lastValidated === lastValidated));
    if (exists) return;
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lastValidated }) });
  } catch (_) {}
}

async function fetchNotes(notesUrl) {
  const res = await fetch(notesUrl);
  const json = await res.json();
  const items = [];
  if (json && typeof json === 'object') {
    Object.keys(json).forEach((user) => {
      const byDate = json[user] || {};
      Object.keys(byDate).forEach((date) => {
        const note = String(byDate[date] || '').trim();
        items.push({ user, date, note });
      });
    });
    items.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  return items;
}

async function fetchStats(statsUrl) {
  try {
    const r = await fetch(statsUrl);
    if (!r.ok) return [];
    const data = await r.json() || {};
    const dates = Object.values(data).map(v => new Date(v.lastValidated)).filter(d => !isNaN(d));
    return dates;
  } catch (_) { return []; }
}

async function postNote(NOTE_API, { uuid, userName, userPassword, date, note }) {
  const res = await fetch(NOTE_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, userName, password: userPassword, date, note }),
  });
  if (!res.ok) throw new Error('note post failed');
}

function renderNotes(container, items, NOTE_API, uuid) {
  container.innerHTML = '';
  if (!items.length) {
    container.innerHTML = '<i>(No past notes available)</i>';
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  items.slice(0, 100).forEach(({ user, date, note }) => {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '10px';
    wrap.innerHTML = `<strong>${escapeHtml(user)}</strong> (${date}):<br>${escapeHtml(note)}`;
    const isReminder = user === 'reminder';
    const isDue = date <= today;
    const isDone = /\n?\s*Done by .+$/i.test(note);
    if (isReminder && isDue && !isDone) {
      const btn = document.createElement('button');
      styleButton(btn);
      btn.textContent = 'Done?';
      btn.onclick = async () => {
        const cred = readCreds();
        if (!cred.userName || !cred.userPassword) { openSettings(cred); return; }
        const updated = `${note}\n\nDone by ${cred.userName}`;
        try {
          await postNote(NOTE_API, { uuid, userName: 'reminder', userPassword: cred.userPassword, date, note: updated });
          // refresh
          const parent = container.parentElement;
          if (parent) {
            parent.querySelector('button')?.focus();
          }
          // simple reload of notes
          const notesUrl = ((window.gghost && window.gghost.baseURL) || DEFAULT_BASE_URL) + `locationNotes/${uuid}.json`;
          fetchNotes(notesUrl).then(n => renderNotes(container, n, NOTE_API, uuid));
        } catch (e) { alert('Failed to update reminder'); }
      };
      wrap.appendChild(document.createElement('br'));
      wrap.appendChild(btn);
    }
    container.appendChild(wrap);
  });
}

function renderChart(container, dates) {
  // simple bar chart for last 12 months
  const counts = new Map();
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    counts.set(key, 0);
  }
  dates.forEach(d => {
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
  });
  const wrap = document.createElement('div');
  wrap.style.marginTop = '8px';
  wrap.innerHTML = '<div style="font-weight:600;margin-bottom:4px;">Validations (last 12 months)</div>';
  const barRow = document.createElement('div');
  Object.assign(barRow.style, { display: 'flex', alignItems: 'flex-end', gap: '4px', height: '60px' });
  const max = Math.max(1, ...counts.values());
  counts.forEach((v, k) => {
    const bar = document.createElement('div');
    Object.assign(bar.style, { width: '18px', height: `${Math.round((v/max)*60)}px`, background: '#4A90E2' });
    bar.title = `${k}: ${v}`;
    barRow.appendChild(bar);
  });
  wrap.appendChild(barRow);
  container.appendChild(wrap);
}

// ---------- Advanced panels ----------
function renderEditor(container, items, NOTE_API, uuid) {
  const creds = readCreds();
  const user = creds.userName || '';
  const today = new Date().toISOString().slice(0, 10);

  // Find today's note by this user if present
  let todaysNote = '';
  for (const it of items) {
    if (it.user === user && it.date === today) { todaysNote = it.note || ''; break; }
  }

  const wrap = document.createElement('div');
  Object.assign(wrap.style, { marginTop:'8px', padding:'8px', borderTop:'1px solid #ddd' });
  const lab = document.createElement('div'); lab.style.fontWeight='600'; lab.textContent = `Your note for ${today}`;
  const ta = document.createElement('textarea'); Object.assign(ta.style,{ width:'100%', height:'90px', padding:'6px', marginTop:'6px' }); ta.value = todaysNote; ta.placeholder = user ? 'Type your note…' : 'Set your name/password in Settings first';
  const row = document.createElement('div'); Object.assign(row.style,{ display:'flex', gap:'8px', marginTop:'6px' });
  const ok = document.createElement('button'); ok.textContent='OK'; styleButton(ok,true);
  const cancel = document.createElement('button'); cancel.textContent='Cancel'; styleButton(cancel);
  ok.onclick = async () => {
    const { userName, userPassword } = readCreds();
    if (!userName || !userPassword) { openSettings(creds); return; }
    const note = ta.value.trim();
    try { await postNote(NOTE_API, { uuid, userName, userPassword, date: today, note }); alert('Saved'); }
    catch(_) { alert('Failed to save'); }
  };
  cancel.onclick = () => { ta.value = todaysNote; };
  row.appendChild(ok); row.appendChild(cancel);
  wrap.appendChild(lab); wrap.appendChild(ta); wrap.appendChild(row);

  // Replace existing editor if present
  const existing = container.querySelector('[data-editor-panel]'); if (existing) existing.remove();
  wrap.setAttribute('data-editor-panel','true');
  container.appendChild(wrap);
}

function openSiteVisit(uuid, { userName, userPassword }) {
  const overlay = document.createElement('div');
  Object.assign(overlay.style, { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100001, display: 'flex', alignItems: 'center', justifyContent: 'center' });
  const modal = document.createElement('div');
  Object.assign(modal.style, { width: '880px', height: '70vh', background: '#fff', border: '2px solid #000', borderRadius: '8px', display: 'flex', flexDirection: 'column' });
  const bar = document.createElement('div');
  Object.assign(bar.style, { padding: '8px 12px', background: '#eee', borderBottom: '1px solid #ccc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600 });
  bar.textContent = 'Site Visit';
  const close = document.createElement('button'); close.textContent='Close'; styleButton(close); close.onclick=()=>overlay.remove(); bar.appendChild(close);
  const nonce = String(Date.now()); const src = `http://localhost:8888/embed?uuid=${encodeURIComponent(uuid)}&mode=siteVisit&nonce=${encodeURIComponent(nonce)}`;
  const iframe = document.createElement('iframe'); Object.assign(iframe, { src, allow: 'clipboard-read; clipboard-write' }); Object.assign(iframe.style, { border: 0, width: '100%', height: '100%' });
  overlay.appendChild(modal); modal.appendChild(bar); modal.appendChild(iframe); document.body.appendChild(overlay);
  const ORIGIN = new URL(src).origin;
  const onMsg = (e) => { if (e.source!==iframe.contentWindow || e.origin!==ORIGIN) return; const { type, payload } = e.data || {}; if (type==='REQUEST_CREDS') {
      iframe.contentWindow.postMessage({ type:'CREDS', payload:{ userName, userPassword, nonce } }, ORIGIN);
    } else if (type==='CLOSE_EMBED') { overlay.remove(); window.removeEventListener('message', onMsg); } };
  window.addEventListener('message', onMsg);
}

function openYPMini(slug) {
  const overlay = document.createElement('div'); Object.assign(overlay.style, { position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100001, display:'flex', alignItems:'center', justifyContent:'center' });
  const wrap = document.createElement('div'); Object.assign(wrap.style, { width:'900px', height:'80vh', background:'#fff', border:'2px solid #000', borderRadius:'8px', overflow:'hidden', display:'flex', flexDirection:'column' });
  const bar = document.createElement('div'); Object.assign(bar.style, { padding:'8px 12px', background:'#eee', borderBottom:'1px solid #ccc', display:'flex', justifyContent:'space-between', alignItems:'center', fontWeight:600 }); bar.textContent='YourPeer';
  const close = document.createElement('button'); close.textContent='Close'; styleButton(close); close.onclick=()=>overlay.remove(); bar.appendChild(close);
  const iframe = document.createElement('iframe'); iframe.src = `https://yourpeer.nyc/locations/${slug}`; Object.assign(iframe.style, { border:0,width:'100%',height:'100%' });
  wrap.appendChild(bar); wrap.appendChild(iframe); overlay.appendChild(wrap); document.body.appendChild(overlay);
}

function openReminder(uuid, { userName, userPassword }, NOTE_API) {
  if (!userName || !userPassword) { openSettings({ userName, userPassword }); return; }
  const overlay = document.createElement('div'); Object.assign(overlay.style,{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100003,display:'flex',alignItems:'center',justifyContent:'center'});
  const modal = document.createElement('div'); Object.assign(modal.style,{width:'460px',background:'#fff',border:'2px solid #000',borderRadius:'8px',padding:'12px'});
  const title=document.createElement('h4'); title.textContent='Add Reminder'; modal.appendChild(title);
  const dateIn=document.createElement('input'); dateIn.type='date'; dateIn.style.padding='6px'; dateIn.style.width='100%'; dateIn.style.margin='6px 0'; modal.appendChild(dateIn);
  const note=document.createElement('textarea'); Object.assign(note.style,{width:'100%',height:'100px',padding:'6px'}); note.placeholder='Optional note'; modal.appendChild(note);
  const row=document.createElement('div'); Object.assign(row.style,{display:'flex',gap:'8px',marginTop:'8px',alignItems:'center'});
  const mic=document.createElement('button'); mic.textContent='🎤'; styleButton(mic);
  const save=document.createElement('button'); save.textContent='Save'; styleButton(save,true);
  const cancel=document.createElement('button'); cancel.textContent='Cancel'; styleButton(cancel);
  row.appendChild(mic); row.appendChild(save); row.appendChild(cancel); modal.appendChild(row);
  overlay.appendChild(modal); document.body.appendChild(overlay);

  let recognition = null, recognizing = false;
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (SR) { recognition = new SR(); recognition.lang='en-US'; recognition.interimResults=false; }
  } catch(_) {}
  mic.onclick = () => {
    if (!recognition) { alert('Speech recognition not supported'); return; }
    if (recognizing) { recognition.stop(); recognizing=false; mic.textContent='🎤'; return; }
    recognition.onresult=(e)=>{ let t=''; for(let i=e.resultIndex;i<e.results.length;i++){ if(e.results[i].isFinal) t+=e.results[i][0].transcript; } note.value += (note.value?' ':'')+t; };
    recognition.onstart=()=>{ recognizing=true; mic.textContent='🛑'; };
    recognition.onend=()=>{ recognizing=false; mic.textContent='🎤'; };
    try { recognition.start(); } catch(_) {}
  };
  cancel.onclick = ()=> overlay.remove();
  save.onclick = ()=>{
    const d=dateIn.value; if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ alert('Choose a date'); return; }
    postNote(NOTE_API,{ uuid, userName:'reminder', userPassword, date:d, note:note.value||'' })
      .then(()=>{ overlay.remove(); alert('Reminder saved'); })
      .catch(()=>alert('Failed to save reminder'));
  };
}

async function openConnections(container, uuid, NOTE_API, baseURL, { userName, userPassword }) {
  if (!userPassword) { openSettings({ userName, userPassword }); return; }
  const url = `${baseURL}locationNotes/connections.json`;
  let all; try { all = await fetch(url).then(r=>r.json()); } catch(_) { all = {}; }
  const entryPairs = Object.entries(all || {});
  const relevant = entryPairs.filter(([_, obj]) => obj && (obj[uuid]===true || obj[uuid]==='true'));

  const panel = document.createElement('div'); Object.assign(panel.style, { marginTop:'10px', padding:'10px', borderTop:'1px solid #ddd' });
  const h = document.createElement('div'); h.textContent = 'Connections'; h.style.fontWeight='600'; h.style.marginBottom='6px'; panel.appendChild(h);

  // add group / add other location
  const row = document.createElement('div'); Object.assign(row.style,{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'});
  const nameInp = document.createElement('input'); nameInp.placeholder='Group name'; nameInp.style.flex='1'; nameInp.style.padding='6px';
  const linkInp = document.createElement('input'); linkInp.placeholder='Other GG link (optional)'; linkInp.style.flex='2'; linkInp.style.padding='6px';
  const add = document.createElement('button'); add.textContent='+ Group/Link'; styleButton(add,true);
  add.onclick = async () => {
    const groupName = (nameInp.value||'').trim(); const link = (linkInp.value||'').trim(); if (!groupName) { alert('Enter group name'); return; }
    // Post group creation/link using NOTE_API semantics
    const urls = [`https://gogetta.nyc/team/location/${uuid}`];
    const m = link.match(/\/(?:team|find)\/location\/([a-f0-9-]{12,})/i);
    if (m) urls.push(`https://gogetta.nyc/team/location/${m[1]}`);
    try {
      await Promise.all(urls.map(u => fetch(NOTE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ uuid:'connections', userName:groupName, password:userPassword, date:u, note:true })})));
      alert('Saved');
      openConnections(container, uuid, NOTE_API, baseURL, { userName, userPassword });
    } catch(_) { alert('Failed to save'); }
  };
  row.appendChild(nameInp); row.appendChild(linkInp); row.appendChild(add); panel.appendChild(row);

  // list existing
  if (!relevant.length) {
    const i = document.createElement('div'); i.innerHTML = '<i>No connections yet.</i>'; panel.appendChild(i);
  } else {
    relevant.forEach(([groupName, obj]) => {
      const line = document.createElement('div'); Object.assign(line.style,{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'});
      const left = document.createElement('div'); left.textContent = groupName; left.style.fontWeight='500';
      const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='6px';
      const disconnect = document.createElement('button'); disconnect.textContent='Disconnect'; styleButton(disconnect);
      disconnect.onclick = async ()=>{
        try { await fetch(NOTE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ uuid:'connections', userName:groupName, password:userPassword, date:`https://gogetta.nyc/team/location/${uuid}`, note:false })});
          alert('Disconnected'); openConnections(container, uuid, NOTE_API, baseURL, { userName, userPassword });
        } catch(_) { alert('Failed'); }
      };
      actions.appendChild(disconnect); line.appendChild(left); line.appendChild(actions); panel.appendChild(line);
    });
  }

  // replace content below notes with connections panel
  const existing = container.querySelector('[data-connections-panel]'); if (existing) existing.remove();
  panel.setAttribute('data-connections-panel','true');
  container.appendChild(panel);
}

function openFutureOnline(uuid, NOTE_API, { userName, userPassword }) {
  if (!userPassword) { openSettings({ userName, userPassword }); return; }
  const overlay = document.createElement('div'); Object.assign(overlay.style,{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:100002,display:'flex',alignItems:'center',justifyContent:'center'});
  const modal = document.createElement('div'); Object.assign(modal.style,{width:'760px',maxHeight:'80%',background:'#fff',border:'2px solid #000',borderRadius:'8px',overflow:'auto',padding:'12px'});
  const title = document.createElement('h3'); title.textContent='Add future/online org'; modal.appendChild(title);
  const n = (l)=>{const w=document.createElement('div'); w.style.marginBottom='8px'; const lab=document.createElement('label'); lab.style.fontWeight='600'; lab.textContent=l; const inp=document.createElement('input'); inp.style.width='100%'; inp.style.padding='6px'; w.appendChild(lab); w.appendChild(inp); modal.appendChild(w); return inp; };
  const org = n('Organization name'); const phone = n('Phone'); const web = n('Website'); const email = n('Email');
  const noteWrap=document.createElement('div'); const noteLab=document.createElement('label'); noteLab.style.fontWeight='600'; noteLab.textContent='Note'; const note=document.createElement('textarea'); Object.assign(note.style,{width:'100%',height:'120px',padding:'6px'}); noteWrap.appendChild(noteLab); noteWrap.appendChild(note); modal.appendChild(noteWrap);
  const addresses=[]; const addrWrap=document.createElement('div'); addrWrap.style.marginTop='6px'; const addrIn=document.createElement('input'); addrIn.placeholder='Address (enter, then +)'; addrIn.style.width='80%'; addrIn.style.padding='6px'; const addrBtn=document.createElement('button'); addrBtn.textContent='+'; styleButton(addrBtn); addrBtn.onclick=()=>{ if(addrIn.value.trim()){ addresses.push(addrIn.value.trim()); addrIn.value=''; list(); } }; const listDiv=document.createElement('div'); listDiv.style.display='flex'; listDiv.style.flexWrap='wrap'; listDiv.style.gap='6px'; function list(){ listDiv.innerHTML=''; addresses.forEach(a=>{ const chip=document.createElement('span'); Object.assign(chip.style,{border:'1px solid #ddd',borderRadius:'12px',padding:'4px 8px',fontSize:'12px'}); chip.textContent=a; listDiv.appendChild(chip);}); }
  addrWrap.appendChild(addrIn); addrWrap.appendChild(addrBtn); addrWrap.appendChild(listDiv); modal.appendChild(addrWrap);
  const actions=document.createElement('div'); actions.style.display='flex'; actions.style.gap='8px'; actions.style.marginTop='10px'; const save=document.createElement('button'); save.textContent='Save'; styleButton(save,true); const cancel=document.createElement('button'); cancel.textContent='Cancel'; styleButton(cancel); actions.appendChild(save); actions.appendChild(cancel); modal.appendChild(actions);
  cancel.onclick=()=>overlay.remove();
  save.onclick=async()=>{
    const orgName=(org.value||'').trim(); const phoneDigits=(phone.value||'').replace(/\D+/g,'').slice(-10); const website=(web.value||'').trim(); const mail=(email.value||'').trim(); const noteText=(note.value||'').trim(); if(!orgName){alert('Org name required');return;} if(!phoneDigits && !website && !mail){alert('Provide phone/website/email');return;}
    const uuidNote = `${cryptoRandom()}_${addresses.join(' | ')}-futureNote`;
    const userForRecord = buildCompositeUuid(website, mail, phoneDigits);
    const dateField = `https://gogetta.nyc/team/location/${encodeURIComponent(orgName)}`;
    try{ await fetch(NOTE_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ uuid:uuidNote, userName:userForRecord, date:dateField, password:userPassword, note: noteText || '(no note)' })}); alert('Saved'); overlay.remove(); }catch(_){ alert('Failed to save'); }
  };
  overlay.appendChild(modal); document.body.appendChild(overlay);
}

function ensurePageSwitchButtons() {
  // Inject a fixed bottom-left toggle between /team and /find on location pages
  if (document.getElementById('gg-switch-mode-btn')) return;
  const mTeam = window.location.pathname.match(/^\/team\/location\/([a-f0-9-]+)/);
  const mFind = window.location.pathname.match(/^\/find\/location\/([a-f0-9-]+)/);
  if (!mTeam && !mFind) return;
  const uuid = (mTeam||mFind)[1];
  const btn = document.createElement('button');
  btn.id = 'gg-switch-mode-btn';
  btn.textContent = mTeam ? 'Switch to Frontend Mode' : 'Switch to Edit Mode';
  Object.assign(btn.style,{position:'fixed',left:'16px',bottom:'20px',zIndex:2147483647,padding:'10px 16px',background:'#fff',border:'2px solid #000',borderRadius:'4px',boxShadow:'0 2px 6px rgba(0,0,0,0.15)',cursor:'pointer'});
  btn.onclick = ()=>{
    if (mTeam) {
      sessionStorage.setItem('arrivedViaFrontendRedirect','true');
      window.location.href = `/find/location/${uuid}`;
    } else {
      if (sessionStorage.getItem('arrivedViaFrontendRedirect')==='true') {
        sessionStorage.removeItem('arrivedViaFrontendRedirect'); history.back();
      } else {
        window.location.href = `/team/location/${uuid}`;
      }
    }
  };
  document.body.appendChild(btn);
}

function buildCompositeUuid(website, email, phone) {
  const w = toFirebaseKey(normalizeWebsiteHostLoose(website) || 'x');
  const e = toFirebaseKey((email||'').toLowerCase() || 'x');
  const p = toFirebaseKey((phone||'').replace(/\D+/g,'').slice(-10) || 'x');
  return `${w}-${e}-${p}`;
}

function toFirebaseKey(str){ if(typeof str!== 'string') return 'x'; return str.trim().toLowerCase().replace(/[.#$/\[\]]/g,'_'); }
function normalizeWebsiteHostLoose(input){ const s=String(input||'').trim(); if(!s) return ''; try{ const u=new URL(/^https?:\/\//i.test(s)?s:`https://${s}`); return (u.hostname||'').toLowerCase(); } catch{ const m=s.match(/([a-z0-9.-]+\.[a-z]{2,})/i); return m?m[1].toLowerCase():''; } }
function cryptoRandom(){ try{ return Array.from(crypto.getRandomValues(new Uint32Array(2))).map(n=>n.toString(36)).join(''); }catch{return String(Date.now());} }
