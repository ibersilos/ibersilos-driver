// === Block from L16 ===
var firebaseConfig = {
        apiKey: "AIzaSyDbLEYKeJw0667KPnMKLnwdALK_UB71XtM",
        authDomain: "ibersilos-c6053.firebaseapp.com",
        databaseURL: "https://ibersilos-c6053-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "ibersilos-c6053",
        storageBucket: "ibersilos-c6053.firebasestorage.app",
        messagingSenderId: "1073852027153",
        appId: "1:1073852027153:web:11324e69d53dd5523bbcb0",
        measurementId: "G-PG1YGDDLTW"
      };
      firebase.initializeApp(firebaseConfig);
      var _db      = firebase.database();
      var _storage = firebase.storage();
      var _auth;
      try { _auth = firebase.auth(); } catch(e) { _auth = null; }

      // Adatta API compat alla stessa interfaccia usata dal codice principale
      window._fb = {
        db:      _db,
        ref:     function(db, path) { return _db.ref(path); },
        set:     function(ref, val) { return ref.set(val); },
        get:     function(ref)      { return ref.once('value'); },
        update:  function(ref, val) { return ref.update(val); },
        onValue: function(ref, cb, errCb) {
          ref.on('value', function(snap) { cb(snap); }, errCb || function(){});
          return function() { ref.off('value'); };
        },
        push:    function(ref, val) { return ref.push(val); }
      };
      window._fbStorage = {
        storage:        _storage,
        sRef:           function(storage, path) { return _storage.ref(path); },
        uploadBytes:    function(ref, blob) { return ref.put(blob); },
        getDownloadURL: function(ref) { return ref.getDownloadURL(); }
      };
      // Autenticazione anonima — prerequisito per Firebase Rules
      // Usa then(ok,err) invece di finally() per compatibilità Android WebView
      function _fbDispatchReady() {
        window._fbReady = true;
        document.dispatchEvent(new Event('firebase-ready'));
      }
      if (_auth) {
        _auth.signInAnonymously().then(_fbDispatchReady, _fbDispatchReady);
      } else {
        _fbDispatchReady();
      }

// === Block from L1307 ===

// ====== GLOBALS (shared across both script blocks) ======
var missioneCorrente = null;  // dichiarata qui, usata da tsKey() e da initFirebase()

// ====== DRIVERS ======
const demoDrivers = {
    'DRV001': { nome: 'Marco Porcu',        targa: 'HC604HC', password: '1975' },
    'DRV002': { nome: 'Sergiu Rotaru',      targa: 'GS811CG', password: '1968' },
    'DRV003': { nome: 'Wlady Manente',      targa: 'GS812CG', password: '1975' },
    'DRV004': { nome: 'Alessandro Chiarin', targa: 'HD562HG', password: '1974' },
};

let currentDriver = null;

// ====== FASI VIAGGIO ======
const FASI = [
    { id: 'accetta',      label: 'Accetta Viaggio',  icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',                                                                                          colore: 'verde'  },
    { id: 'arrivo_carico', label: 'Arrivo al Carico', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',               colore: 'giallo' },
    { id: 'inizio_carico', label: 'Inizio Carico',    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',                                                                    colore: 'giallo' },
    { id: 'fine_carico',   label: 'Fine Carico',      icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', colore: 'verde' },
    { id: 'arrivo_scarico', label: 'Arrivo Scarico',  icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',               colore: 'giallo' },
    { id: 'inizio_scarico', label: 'Inizio Scarico',  icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',                                                          colore: 'rosso'  },
    { id: 'fine_scarico',   label: 'Fine Scarico',    icon: 'M5 13l4 4L19 7',                                                                                                                       colore: 'verde'  },
];

// Chiave localStorage per targa
function tsKey(targa) {
    // Usa missioneCorrente.id se disponibile, fallback alla targa
    const mid = (missioneCorrente && missioneCorrente.id) ? '_m_' + missioneCorrente.id.replace(/[^a-zA-Z0-9_-]/g,'_') : '';
    return 'ibs_ts_' + targa + mid;
}

function loadTimestamps(targa) {
    try { return JSON.parse(localStorage.getItem(tsKey(targa))) || {}; } catch(e) { return {}; }
}

function saveTimestamps(targa, data) {
    localStorage.setItem(tsKey(targa), JSON.stringify(data));
}

function formatTs(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' })
        + ' · ' + d.toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
}

function renderTimestamps() {
    if (!currentDriver) return;
    const targa = currentDriver.targa;
    const container = document.getElementById('timestampButtons');
    const fasiWrap  = document.getElementById('fasiViaggioWrap');

    // Mostra fasi solo se c'è una missione assegnata
    if (!missioneCorrente) {
        if (fasiWrap) fasiWrap.style.display = 'none';
        container.innerHTML = '';
        document.getElementById('registroCard').style.display = 'none';
        document.getElementById('docViaggioCard').style.display = 'none';
        document.getElementById('chiudiViaggioWrap').style.display = 'none';
        document.getElementById('viaggioChiusoBanner').style.display = 'none';
        return;
    }
    if (fasiWrap) fasiWrap.style.display = '';

    // Controlla se il viaggio è già stato chiuso
    const docsCheck = loadDocViaggio(targa);
    if (docsCheck && docsCheck._chiuso) {
        const banner = document.getElementById('viaggioChiusoBanner');
        const orario = document.getElementById('chiusoOrario');
        if (banner) banner.style.display = 'block';
        if (orario && docsCheck._chiusoAt) orario.textContent = 'Chiuso il ' + formatTs(docsCheck._chiusoAt);
        document.getElementById('chiudiViaggioWrap').style.display = 'none';
        document.getElementById('docViaggioCard').style.display = 'none';
        renderMissioniTerminate(targa);
        return;
    }
    document.getElementById('viaggioChiusoBanner').style.display = 'none';

    const ts = loadTimestamps(targa);

    // Trova l'indice della prima fase non ancora premuta (la prossima attivabile)
    const nextIndex = FASI.findIndex(f => !ts[f.id]);

    container.innerHTML = FASI.map((fase, i) => {
        const done = !!ts[fase.id];
        const isNext = i === nextIndex;
        const disabled = done || !isNext;

        // Colori base per stato attivo
        const colorMap = {
            verde:  { bg: '#f1f8f1', border: '#a5d6a7', svg: '#2e7d32' },
            giallo: { bg: '#fffde7', border: '#ffe082', svg: '#b8860b' },
            rosso:  { bg: '#ffebee', border: '#ef9a9a', svg: '#E30613' },
        };
        const c = colorMap[fase.colore];

        let cardBg, cardBorder, labelColor, opacity;

        if (done) {
            // Completato: sfondo verde chiaro, spento
            cardBg = '#f0faf0'; cardBorder = '#a5d6a7'; labelColor = '#2e7d32'; opacity = '1';
        } else if (isNext) {
            // Prossimo da premere: colore vivace, pulsante pieno
            cardBg = c.bg; cardBorder = c.border; labelColor = '#1a1a1a'; opacity = '1';
        } else {
            // Futuro: grigio, disabilitato
            cardBg = '#fafafa'; cardBorder = '#e0e0e0'; labelColor = '#bbb'; opacity = '0.6';
        }

        const svgColor = done ? '#2e7d32' : (isNext ? c.svg : '#ccc');

        return `
        <div style="background:${cardBg};border:2px solid ${cardBorder};border-radius:14px;padding:14px 16px;margin-bottom:10px;opacity:${opacity};transition:all 0.2s;${isNext ? 'box-shadow:0 4px 14px rgba(0,0,0,0.08);' : ''}">
            <div style="display:flex;align-items:center;gap:14px;">
                <!-- Numero fase -->
                <div style="width:32px;height:32px;border-radius:50%;background:${done ? '#2e7d32' : (isNext ? 'var(--red)' : '#e0e0e0')};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    ${done
                        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
                        : `<span style="font-size:0.78rem;font-weight:800;color:${isNext ? 'white' : '#999'};">${i+1}</span>`
                    }
                </div>
                <!-- Info -->
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:0.92rem;color:${labelColor};">${fase.label}</div>
                    ${done
                        ? `<div style="font-size:0.72rem;color:#2e7d32;margin-top:2px;font-weight:600;">${formatTs(ts[fase.id])}</div>`
                        : isNext
                            ? `<div style="font-size:0.72rem;color:var(--text-dim);margin-top:2px;">Premi per registrare</div>`
                            : `<div style="font-size:0.72rem;color:#ccc;margin-top:2px;">In attesa</div>`
                    }
                </div>
                <!-- Pulsante / check -->
                ${done
                    ? `<div style="width:44px;height:44px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                       </div>`
                    : isNext
                        ? `<button onclick="confermaFase('${fase.id}','${fase.label}')"
                               style="background:var(--red);color:white;border:none;border-radius:10px;padding:10px 16px;font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;cursor:pointer;white-space:nowrap;box-shadow:0 3px 10px rgba(227,6,19,0.3);">
                               Registra
                           </button>`
                        : `<div style="width:44px;height:44px;border-radius:50%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;">
                               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                           </div>`
                }
            </div>
        </div>`;
    }).join('');

    // Aggiorna registro
    renderRegistro(ts);

    // Aggiorna hero
    updateHero(ts);

    // Se fine_scarico già completata, mostra i documenti
    if (ts['fine_scarico']) {
        renderDocViaggio(currentDriver.targa);
        document.getElementById('docViaggioCard').style.display = 'block';
    } else {
        document.getElementById('docViaggioCard').style.display = 'none';
    }
}

function updateHero(ts) {
    const label = document.getElementById('missioneLabel');
    const nextIndex = FASI.findIndex(f => !ts[f.id]);
    if (nextIndex === -1) {
        label.textContent = '✓ Viaggio completato';
    } else if (nextIndex === 0) {
        label.textContent = 'Viaggio in attesa di accettazione';
    } else {
        label.textContent = `Fase ${nextIndex + 1}/7 — ${FASI[nextIndex].label}`;
    }
    document.getElementById('missioneTargaLabel').textContent = '🚛 ' + currentDriver.targa + ' · ' + currentDriver.nome;
}

function renderRegistro(ts) {
    const logs = FASI.filter(f => ts[f.id]);
    const card = document.getElementById('registroCard');
    const container = document.getElementById('registroLogs');
    if (logs.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    container.innerHTML = logs.map((f, i) => `
        <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--gray);${i===logs.length-1?'border-bottom:none;':''}">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--green);flex-shrink:0;"></div>
            <div style="flex:1;">
                <div style="font-weight:700;font-size:0.85rem;">${f.label}</div>
                <div style="font-size:0.72rem;color:var(--text-dim);margin-top:1px;">${formatTs(ts[f.id])}</div>
            </div>
        </div>`).join('');
}

// Modal conferma fase
let faseDaConfermare = null;

const KM_FASI = {
    arrivo_carico:  'KM a vuoto (partenza → carico)',
    arrivo_scarico: 'KM a carico (carico → scarico)',
};

function confermaFase(faseId, faseLabel) {
    faseDaConfermare = { id: faseId, label: faseLabel };
    document.getElementById('confermaFaseTitle').textContent = faseLabel;
    document.getElementById('confermaFaseBody').textContent = `Stai per registrare "${faseLabel}" con data e ora attuali. Questa operazione non può essere annullata.`;
    const kmWrap = document.getElementById('kmFaseWrap');
    const kmInput = document.getElementById('kmFaseInput');
    if (KM_FASI[faseId]) {
        document.getElementById('kmFaseLabel').textContent = KM_FASI[faseId];
        kmInput.value = '';
        kmWrap.style.display = 'block';
    } else {
        kmWrap.style.display = 'none';
    }
    document.getElementById('modalConfermaFase').classList.add('active');
    if (KM_FASI[faseId]) setTimeout(() => kmInput.focus(), 300);
}

function eseguiFase() {
    if (!faseDaConfermare || !currentDriver) return;
    const targa = currentDriver.targa;
    const ts = loadTimestamps(targa);

    if (KM_FASI[faseDaConfermare.id]) {
        const val = parseInt(document.getElementById('kmFaseInput').value, 10);
        if (!val || val <= 0) {
            showToast('KM richiesti', 'Inserisci i km prima di registrare la fase', 'error');
            return;
        }
        ts[faseDaConfermare.id + '_km'] = val;
    }

    ts[faseDaConfermare.id] = new Date().toISOString();
    saveTimestamps(targa, ts);
    chiudiModal('modalConfermaFase');
    renderTimestamps();
    showToast(faseDaConfermare.label, formatTs(ts[faseDaConfermare.id]), 'success');
    fbPushFase(targa);
    if (faseDaConfermare.id === 'fine_scarico') {
        setTimeout(() => {
            renderDocViaggio(targa);
            document.getElementById('docViaggioCard').style.display = 'block';
            document.getElementById('docViaggioCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
            showToast('Documenti richiesti', 'Carica i documenti del viaggio per completare', 'info');
        }, 600);
    }
    faseDaConfermare = null;
}


// ====== DOCUMENTI VIAGGIO ======
const DOC_SLOTS = [
    { id: 'cmr',      label: 'CMR',                  icon: '📋', obbligatorio: false },
    { id: 'bolla',    label: 'Bolla di consegna',    icon: '📄', obbligatorio: false },
    { id: 'lavaggio', label: 'Certificato Lavaggio', icon: '🧼', obbligatorio: false },
];

function docViaggioKey(targa) { return 'ibs_docviaggio_' + targa; }

function loadDocViaggio(targa) {
    try { return JSON.parse(localStorage.getItem(docViaggioKey(targa))) || {}; } catch(e) { return {}; }
}

function saveDocViaggio(targa, data) {
    localStorage.setItem(docViaggioKey(targa), JSON.stringify(data));
}

function renderDocViaggio(targa) {
    const docs = loadDocViaggio(targa);
    const slotsEl = document.getElementById('docSlots');
    const extraEl = document.getElementById('docExtra');
    const isClosed = docs._chiuso === true;

    // Slot obbligatori
    slotsEl.innerHTML = DOC_SLOTS.map(slot => {
        const doc = docs[slot.id];
        const hasdoc = !!doc;
        const borderCol = hasdoc ? 'var(--green)' : slot.obbligatorio ? 'var(--red)' : 'var(--yellow)';
        const bgCol = hasdoc ? '#f0faf0' : slot.obbligatorio ? '#fff5f5' : 'white';
        return `
        <div style="border:2px solid ${borderCol};border-radius:12px;padding:14px;margin-bottom:10px;background:${bgCol};transition:all 0.2s;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:1.2rem;">${slot.icon}</span>
                        <span style="font-weight:700;font-size:0.9rem;">${slot.label}</span>
                        ${slot.obbligatorio ? '<span style="background:var(--red);color:white;font-size:0.6rem;font-weight:700;padding:1px 5px;border-radius:4px;letter-spacing:0.5px;">OBB.</span>' : ''}
                    </div>
                    ${hasdoc
                        ? `<div style="font-size:0.7rem;color:var(--green);font-weight:700;margin-top:5px;">✓ Caricato · ${doc.nome}</div>`
                        : `<div style="font-size:0.7rem;color:${slot.obbligatorio ? 'var(--red)' : 'var(--text-dim)'};margin-top:5px;">${slot.obbligatorio ? 'Documento obbligatorio' : 'Facoltativo'}</div>`
                    }
                </div>
                ${hasdoc
                    ? `<div style="display:flex;gap:6px;align-items:center;">
                           <img src="${doc.thumb}" style="height:48px;width:40px;object-fit:cover;border-radius:6px;border:1px solid var(--green);cursor:pointer;" onclick="apriDocImg('${slot.id}')" />
                           ${isClosed ? '' : `<button onclick="rimuoviSlot('${slot.id}')" style="background:none;border:none;cursor:pointer;">
                               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                           </button>`}
                       </div>`
                    : isClosed ? `<span style="font-size:0.72rem;color:#bbb;">—</span>`
                    : `<div style="display:flex;gap:6px;">
                           <label for="slotCam_${slot.id}" style="display:flex;align-items:center;gap:4px;padding:9px 12px;border:none;border-radius:8px;cursor:pointer;font-size:0.78rem;font-weight:700;background:var(--red);color:white;" title="Fotocamera diretta">📷 Foto</label>
                           <input type="file" id="slotCam_${slot.id}" accept="image/*" capture="environment" style="display:none;" onchange="caricaSlot('${slot.id}',this)">

                           <label for="slotGal_${slot.id}" style="display:flex;align-items:center;gap:4px;padding:9px 12px;border:1.5px solid var(--red);border-radius:8px;cursor:pointer;font-size:0.78rem;font-weight:700;background:white;color:var(--red);" title="Galleria / CamScanner / PDF">📁 File</label>
                           <input type="file" id="slotGal_${slot.id}" accept="image/*,application/pdf" style="display:none;" onchange="caricaSlot('${slot.id}',this)">
                       </div>`
                }
            </div>
        </div>`;
    }).join('');

    // Extra documenti
    const extras = docs._extra || [];
    extraEl.innerHTML = extras.length === 0 ? '' : extras.map((e, i) => `
        <div style="display:flex;align-items:center;gap:10px;background:#f9f9f9;border-radius:8px;padding:10px;margin-bottom:6px;border-left:3px solid var(--yellow);">
            <img src="${e.thumb}" style="height:40px;width:32px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="apriDocImgExtra(${i})" />
            <div style="flex:1;font-size:0.8rem;font-weight:600;">${e.nome}</div>
            ${isClosed ? '' : `<button onclick="rimuoviExtra(${i})" style="background:none;border:none;cursor:pointer;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            </button>`}
        </div>`).join('');

    // Gestione pulsante Chiudi Viaggio
    const allObblOk = DOC_SLOTS.filter(s => s.obbligatorio).every(s => !!docs[s.id]);
    const chiudiWrap = document.getElementById('chiudiViaggioWrap');
    const chiusoBanner = document.getElementById('viaggioChiusoBanner');
    const addExtra = document.querySelector('#docViaggioCard .card');

    if (isClosed) {
        chiudiWrap.style.display = 'none';
        chiusoBanner.style.display = 'block';
        if (addExtra) addExtra.style.display = 'none';
        document.getElementById('chiusoOrario').textContent = docs._chiusoAt ? new Date(docs._chiusoAt).toLocaleString('it-IT') : '';
    } else {
        chiusoBanner.style.display = 'none';
        chiudiWrap.style.display = allObblOk ? 'block' : 'none';
        if (!allObblOk && chiudiWrap) chiudiWrap.style.display = 'none';
    }
}

function caricaSlot(slotId, input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const targa = currentDriver.targa;
        const docs = loadDocViaggio(targa);
        docs[slotId] = { nome: file.name, thumb: e.target.result };
        saveDocViaggio(targa, docs);
        renderDocViaggio(targa);
        fbPushFase(targa); // push aggiornamento documenti
        showToast('Documento caricato', file.name, 'success');
    };
    reader.readAsDataURL(file);
}

function rimuoviSlot(slotId) {
    if (!confirm('Rimuovere questo documento?')) return;
    const targa = currentDriver.targa;
    const docs = loadDocViaggio(targa);
    delete docs[slotId];
    saveDocViaggio(targa, docs);
    renderDocViaggio(targa);
}


function rimuoviExtra(index) {
    if (!confirm('Rimuovere questo documento?')) return;
    const targa = currentDriver.targa;
    const docs = loadDocViaggio(targa);
    if (docs._extra) { docs._extra.splice(index, 1); saveDocViaggio(targa, docs); renderDocViaggio(targa); }
}

function apriDocImg(slotId) {
    const docs = loadDocViaggio(currentDriver.targa);
    const doc = docs[slotId]; if (!doc) return;
    const src = doc.url || doc.thumb; if (!src) return;
    if (src.startsWith('http')) { window.open(src, '_blank'); return; }
    const w = window.open('','_blank');
    w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="' + src + '" style="max-width:100%;max-height:100vh;"><\/body><\/html>');
    w.document.close();
}

function apriDocImgExtra(index) {
    const docs = loadDocViaggio(currentDriver.targa);
    const e = (docs._extra||[])[index]; if (!e) return;
    const src = e.url || e.thumb; if (!src) return;
    if (src.startsWith('http')) { window.open(src, '_blank'); return; }
    const w = window.open('','_blank');
    w.document.write('<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="' + src + '" style="max-width:100%;max-height:100vh;"><\/body><\/html>');
    w.document.close();
}


// ====== FIREBASE SYNC ======
let fbConnected = false;
let fbUnsubscribers = [];

function fbPath(targa) {
    // Sanitize targa for Firebase path (no dots/slashes)
    return 'viaggi_sv/' + targa.replace(/[.#$[\]]/g, '_');
}

// Missione corrente assegnata dal dispatcher
// missioneCorrente dichiarata nel blocco 1

function initFirebase(targa) {
    if (!window._fbReady || !window._fb) {
        updateSyncStatus(false, 'Firebase non configurato — modalità offline');
        return;
    }
    // Evita doppia inizializzazione
    if (fbUnsubscribers.length > 0) {
        return;
    }
    const { db, ref, onValue } = window._fb;

    // 1. Nodo viaggio proprio (stato fasi live)
    const unsub1 = onValue(ref(db, fbPath(targa)), () => {
        fbConnected = true;
        updateSyncStatus(true, 'Connesso · Live');
    }, () => {
        fbConnected = false;
        updateSyncStatus(false, 'Connessione persa');
    });
    fbUnsubscribers.push(unsub1);

    // 2. Missioni dispatcher — ascolta in real-time
    const unsub2 = onValue(ref(db, 'dispatcher/missions'), (snap) => {
        const data = snap.val();
        if (!data) return;
        const lista = Array.isArray(data) ? data : Object.values(data);

        // Missione corrente (attiva)
        const mia = lista.find(m =>
            (m.targa === targa || m.autistaTarga === targa || m.plate === targa) &&
            m.status !== 'completed' &&
            m.status !== 'cancelled'
        );
        const isNuova = mia && (!missioneCorrente || missioneCorrente.id !== mia.id);
        missioneCorrente = mia || null;

        // Se nuova missione: pulisci residui di viaggio precedente chiuso
        if (isNuova) {
            const docsPrev = loadDocViaggio(targa);
            if (docsPrev && docsPrev._chiuso) {
                saveTimestamps(targa, {});
                saveDocViaggio(targa, {});
            }
        }
        aggiornaHeroMissione(mia || null);
        if (isNuova) {
            showToast('📋 Nuova missione assegnata',
                `${mia.id} · ${estraiCitta(mia.from)} → ${estraiCitta(mia.to)}`,
                'success');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }

        // Missioni terminate — filtrate per targa, ordinate per data
        const terminate = lista.filter(m =>
            (m.targa === targa || m.autistaTarga === targa || m.plate === targa) &&
            m.status === 'completed'
        ).sort((a, b) => (b.completedAt || '') > (a.completedAt || '') ? 1 : -1);
        renderMissioniTerminate(terminate);
    });
    fbUnsubscribers.push(unsub2);

    // Chat listener — inizializzato qui perché Firebase è garantito pronto
    initChatDriver();
}



// ── Storico missioni terminate ────────────────────────────────────────────────

function _archiviaViaggio(targa) {
    try {
        // Pulisci stato viaggio corrente — le missioni terminate vengono lette da Firebase
        saveTimestamps(targa, {});
        saveDocViaggio(targa, {});
    } catch(e) { console.warn('[archiviaViaggio]', e); }
}

function renderMissioniTerminate(lista) {
    const card = document.getElementById('missioniTerminateCard');
    const list = document.getElementById('missioniTerminateList');
    if (!card || !list) return;

    if (!lista || !lista.length) { card.style.display = 'none'; return; }

    card.style.display = 'block';
    list.innerHTML = lista.map(function(m) {
        const id   = m.id || m.numeroOrdine || '—';
        const da   = estraiCitta(m.from || m.origine || '');
        const a    = estraiCitta(m.to   || m.destinazione || '');
        const data = m.completedAt
            ? new Date(m.completedAt).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' })
            : '—';
        const cargo = m.cargo ? ('📦 ' + m.cargo) : '';
        return '<div style="background:white;border-radius:10px;padding:12px 14px;margin-bottom:8px;border-left:3px solid #a5d6a7;">'
            + '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="font-weight:800;font-size:0.88rem;color:var(--black);">' + id + '</div>'
            + '<div style="font-size:0.82rem;font-weight:700;color:#333;margin-top:3px;">' + (da||'—') + ' → ' + (a||'—') + '</div>'
            + (cargo ? '<div style="font-size:0.72rem;color:var(--text-dim);margin-top:2px;">' + cargo + '</div>' : '')
            + '</div>'
            + '<div style="text-align:right;flex-shrink:0;">'
            + '<div style="font-size:0.7rem;color:#2e7d32;font-weight:700;">✅ Completata</div>'
            + '<div style="font-size:0.68rem;color:var(--text-dim);margin-top:2px;">' + data + '</div>'
            + '</div>'
            + '</div>'
            + '</div>';
    }).join('');
}

function toggleMissioniTerminate() {
    const list   = document.getElementById('missioniTerminateList');
    const toggle = document.getElementById('missioniTerminateToggle');
    if (!list) return;
    const open = list.style.display !== 'none';
    list.style.display    = open ? 'none' : 'block';
    toggle.textContent    = open ? '▶' : '▼';
}
// Estrae il nome città da un indirizzo
// Gestisce formati: "Azienda, Via X, 33080 San Quirino PN, Italia" → "San Quirino"
function estraiCitta(indirizzo) {
    if (!indirizzo) return '—';
    const parti = indirizzo.split(',').map(function(p) { return p.trim(); }).filter(Boolean);
    if (parti.length === 1) return parti[0];
    // Cerca parte con CAP (4-5 cifre seguito da nome città)
    for (var i = 0; i < parti.length; i++) {
        var cap = parti[i].match(/^\d{4,5}\s+(.+)/);
        if (cap) {
            // Rimuovi sigla provincia finale (es. "PN", "MI")
            return cap[1].replace(/\s+[A-Z]{2}$/, '').trim();
        }
    }
    // Nessun CAP — salta parti che sembrano vie o numeri
    var via = /^(via|viale|piazza|corso|str\.|c\.|calle|av\.|pol\.|zona|loc\.|fraz\.)/i;
    var num = /^\d+$/;
    for (var j = 0; j < parti.length; j++) {
        if (!via.test(parti[j]) && !num.test(parti[j])) return parti[j];
    }
    return parti[0];
}
function aggiornaHeroMissione(m) {
    const label     = document.getElementById('missioneLabel');
    const rottaWrap = document.getElementById('missioneRottaWrap');
    const elDa      = document.getElementById('missioneDa');
    const elA       = document.getElementById('missioneA');
    const targaLbl  = document.getElementById('missioneTargaLabel');
    if (!m) {
        if (label) label.textContent = 'Nessun viaggio assegnato';
        if (rottaWrap) rottaWrap.style.display = 'none';
        const fl = document.getElementById('missioneFasiLabel');
        if (fl) fl.textContent = '';
        const nd = document.getElementById('navDest');
        if (nd) nd.value = '';
        const eb = document.getElementById('eurowagBtn');
        if (eb) eb.style.display = 'none';
        if (typeof renderTimestamps === 'function') renderTimestamps();
        return;
    }
    if (label) label.textContent = m.id || 'Missione assegnata';
    const eb2 = document.getElementById('eurowagBtn');
    if (eb2) eb2.style.display = 'block';
    if (elDa)  elDa.textContent  = estraiCitta(m.from);
    if (elA)   elA.textContent   = estraiCitta(m.to);
    if (rottaWrap) rottaWrap.style.display = '';
    // Info cargo sotto rotta
    const info = [
        m.cargo  ? `📦 ${m.cargo}`    : '',
        m.weight ? `⚖️ ${m.weight} t` : '',
        m.date   ? `📅 ${m.date}`     : '',
    ].filter(Boolean).join('  ·  ');
    if (targaLbl) targaLbl.textContent = info || (currentDriver ? '🚛 ' + currentDriver.targa : '');

    // Aggiorna label missione nella sezione fasi
    const fasiLbl = document.getElementById('missioneFasiLabel');
    if (fasiLbl) fasiLbl.textContent = m ? ('Missione ' + (m.id || m.numeroOrdine || '')) : '';

    // Auto-fill destinazione navigazione dalla missione
    const navDestEl = document.getElementById('navDest');
    if (navDestEl) navDestEl.value = m ? (m.to || m.destinazione || '') : '';

    // Aggiorna card percorso
    aggiornaPercorsoCard(m);

    // Aggiorna visibilità fasi
    if (typeof renderTimestamps === 'function') renderTimestamps();
}

// ─── Card percorso DSP ────────────────────────────────────────────────────────
function aggiornaPercorsoCard(m) {
    const card        = document.getElementById('missionePercorsoCard');
    const divTappe    = document.getElementById('percorsoTappe');
    const divMet      = document.getElementById('percorsoMetriche');
    const divNote     = document.getElementById('percorsoNote');
    const divPh       = document.getElementById('percorsoPlaceholder');
    if (!card) return;

    if (!m) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    // ── Tappe / fermate ───────────────────────────────────────────────
    // Il DSP salva: m.tappe = [{label, indirizzo, tipo:'carico'|'scarico'|'sosta'}]
    // oppure usa from/to come fallback
    const tappe = m.tappe || m.waypoints || m.fermate || null;
    if (tappe && Array.isArray(tappe) && tappe.length) {
        const colori = { carico: '#2e7d32', scarico: '#E30613', sosta: '#b8860b', default: '#555' };
        divTappe.innerHTML = tappe.map((t, i) => {
            const col   = colori[t.tipo] || colori.default;
            const label = t.label || t.tipo || ('Tappa ' + (i+1));
            const addr  = t.indirizzo || t.address || '';
            const isLast = i === tappe.length - 1;
            return '<div style="display:flex;gap:10px;align-items:flex-start;' + (isLast ? '' : 'margin-bottom:6px;') + '">'
                + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">'
                + '<div style="width:10px;height:10px;border-radius:50%;background:' + col + ';border:2px solid white;box-shadow:0 0 0 2px ' + col + ';margin-top:3px;"></div>'
                + (!isLast ? '<div style="width:2px;flex:1;background:#ddd;margin-top:3px;min-height:18px;"></div>' : '')
                + '</div>'
                + '<div style="flex:1;padding-bottom:' + (isLast ? '0' : '6px') + ';">'
                + '<div style="font-size:0.72rem;font-weight:700;color:' + col + ';text-transform:uppercase;letter-spacing:0.8px;">' + label + '</div>'
                + (addr ? '<div style="font-size:0.8rem;color:#333;margin-top:1px;">' + addr + '</div>' : '')
                + '</div></div>';
        }).join('');
        divTappe.style.display = 'block';
    } else if (m.from || m.to) {
        // Fallback: from → to semplice
        const from = estraiCitta(m.from);
        const to   = estraiCitta(m.to);
        divTappe.innerHTML =
            '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:6px;">'
          + '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;">'
          + '<div style="width:10px;height:10px;border-radius:50%;background:#2e7d32;border:2px solid white;box-shadow:0 0 0 2px #2e7d32;margin-top:3px;"></div>'
          + '<div style="width:2px;flex:1;background:#ddd;margin-top:3px;min-height:18px;"></div>'
          + '</div>'
          + '<div style="flex:1;padding-bottom:6px;">'
          + '<div style="font-size:0.72rem;font-weight:700;color:#2e7d32;text-transform:uppercase;letter-spacing:0.8px;">Carico</div>'
          + '<div style="font-size:0.8rem;color:#333;margin-top:1px;">' + from + '</div>'
          + ((m.date || m.oraCaricoFine) ? '<div style="font-size:0.72rem;color:#2e7d32;font-weight:600;margin-top:2px;">📅 ' + (m.date||'') + (m.oraCaricoFine ? '  ⏰ '+m.oraCaricoFine : '') + '</div>' : '')
          + '</div></div>'
          + '<div style="display:flex;gap:10px;align-items:flex-start;">'
          + '<div style="flex-shrink:0;"><div style="width:10px;height:10px;border-radius:50%;background:#E30613;border:2px solid white;box-shadow:0 0 0 2px #E30613;margin-top:3px;"></div></div>'
          + '<div style="flex:1;">'
          + '<div style="font-size:0.72rem;font-weight:700;color:#E30613;text-transform:uppercase;letter-spacing:0.8px;">Scarico</div>'
          + '<div style="font-size:0.8rem;color:#333;margin-top:1px;">' + to + '</div>'
          + ((m.dateScarico || m.oraScaricoFine) ? '<div style="font-size:0.72rem;color:#E30613;font-weight:600;margin-top:2px;">📅 ' + (m.dateScarico||'') + (m.oraScaricoFine ? '  ⏰ '+m.oraScaricoFine : '') + '</div>' : '')
          + '</div></div>';
        divTappe.style.display = 'block';
    } else {
        divTappe.style.display = 'none';
    }

    // ── Metriche (km, durata, ETA) ────────────────────────────────────
    // Il DSP salva: m.distanzaKm, m.durataMin, m.etaArrivo, m.pedaggi
    const metriche = [];
    // Data e ora carico
    if (m.date || m.oraCaricoFine) {
        const dc = (m.date || '') + (m.oraCaricoFine ? '  ' + m.oraCaricoFine : '');
        metriche.push({ icon: '🟢', label: 'Carico', val: dc.trim() });
    }
    // Data e ora scarico
    if (m.dateScarico || m.oraScaricoFine) {
        const ds = (m.dateScarico || '') + (m.oraScaricoFine ? '  ' + m.oraScaricoFine : '');
        metriche.push({ icon: '🔴', label: 'Scarico', val: ds.trim() });
    }
    if (m.distanzaKm || m.distanza) {
        metriche.push({ icon: '📏', label: 'Distanza', val: (m.distanzaKm || m.distanza) + ' km' });
    }
    if (m.durataMin || m.durata) {
        const min = parseInt(m.durataMin || m.durata);
        const hhh = min >= 60 ? Math.floor(min/60) + 'h ' + (min%60) + 'min' : min + ' min';
        metriche.push({ icon: '⏱️', label: 'Percorso', val: hhh });
    }
    if (m.etaArrivo || m.eta) {
        metriche.push({ icon: '🕐', label: 'ETA', val: m.etaArrivo || m.eta });
    }
    if (m.pedaggi !== undefined) {
        metriche.push({ icon: '💶', label: 'Pedaggi', val: (m.pedaggi || '0') + ' €' });
    }
    // m.date già gestito sopra come "Data Carico"
    if (m.cargo) {
        metriche.push({ icon: '📦', label: 'Carico', val: m.cargo });
    }
    if (m.weight) {
        metriche.push({ icon: '⚖️', label: 'Peso', val: m.weight + ' t' });
    }

    if (metriche.length) {
        divMet.innerHTML = metriche.map(x =>
            '<div style="background:#f5f5f5;border-radius:8px;padding:8px 10px;min-width:80px;">'
          + '<div style="font-size:0.9rem;">' + x.icon + '</div>'
          + '<div style="font-size:0.8rem;font-weight:800;color:var(--black);margin-top:2px;">' + x.val + '</div>'
          + '<div style="font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.8px;">' + x.label + '</div>'
          + '</div>'
        ).join('');
        divMet.style.display = 'flex';
    } else {
        divMet.style.display = 'none';
    }

    // ── Note dispatcher ───────────────────────────────────────────────
    // Il DSP salva: m.note, m.istruzioni, m.annotazioni
    const note = m.note || m.istruzioni || m.annotazioni || '';
    if (note) {
        divNote.textContent = note;
        divNote.style.display = 'block';
    } else {
        divNote.style.display = 'none';
    }

    // Placeholder solo se non c'è NULLA
    const hasContent = (tappe && tappe.length) || (m.from || m.to) || metriche.length || note;
    if (divPh) divPh.style.display = hasContent ? 'none' : 'block';
}

function updateSyncStatus(connected, msg) {
    const dot = document.getElementById('fbDot');
    const label = document.getElementById('fbSyncLabel');
    if (!dot || !label) return;
    dot.style.background = connected ? '#2e7d32' : '#E30613';
    dot.style.animation = connected ? 'pulse 2s infinite' : 'none';
    label.textContent = msg;
    const box = document.getElementById('fbSyncStatus');
    if (box) {
        box.style.background = connected ? '#e8f5e9' : '#ffebee';
        box.style.color = connected ? '#2e7d32' : '#E30613';
    }
}

async function pushToFirebase(targa) {
    if (!window._fbReady || !window._fb) return false;
    const { db, ref, set } = window._fb;

    const ts = loadTimestamps(targa);
    const docs = loadDocViaggio(targa);
    const driver = currentDriver;

    // Build payload — NO immagini base64 (troppo pesanti per Realtime DB)
    // Immagini: solo metadati (nome file, presenza/assenza)
    const docsMetadata = {};
    DOC_SLOTS.forEach(slot => {
        docsMetadata[slot.id] = docs[slot.id] ? { nome: docs[slot.id].nome, presente: true } : { presente: false };
    });
    docsMetadata._extra = (docs._extra || []).map(e => ({ nome: e.nome, presente: true }));

    const payload = {
        targa,
        autista: driver.nome,
        code: driver.code,
        aggiornato: new Date().toISOString(),
        chiuso: docs._chiuso || false,
        chiusoAt: docs._chiusoAt || null,
        timestamps: ts,
        documenti: docsMetadata,
        // GPS: usa ultima posizione nota se disponibile
        lat: gpsLastLat || null,
        lng: gpsLastLng || null,
        gpsAcc: gpsLastLat ? Math.round(gpsLastAcc||0) : null,
        gpsTs: (gpsLastLat && gpsLastUpdate) ? gpsLastUpdate.getTime() : null,
    };

    try {
        await set(ref(db, fbPath(targa)), payload);
        return true;
    } catch(e) {
        console.error('Firebase push error:', e);
        return false;
    }
}

async function chiudiViaggio() {
    const targa = currentDriver.targa;
    const docs = loadDocViaggio(targa);

    // Verifica obbligatori
    const allObblOk = DOC_SLOTS.filter(s => s.obbligatorio).every(s => !!docs[s.id]);
    if (!allObblOk) {
        showToast('Documenti mancanti', 'Carica tutti i documenti obbligatori prima di chiudere', 'error');
        return;
    }

    if (!confirm('Chiudere il viaggio? Questa operazione è irreversibile. I dati verranno inviati alla centrale.')) return;

    // Spinner sul bottone
    const btn = document.getElementById('btnChiudiViaggio');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<div style="width:22px;height:22px;border:3px solid rgba(255,255,255,0.3);border-top:3px solid white;border-radius:50%;animation:spin 0.8s linear infinite;"></div> Invio in corso...';
    btn.disabled = true;

    // Cattura snapshot missione PRIMA di qualsiasi azzeramento
    const missioneSnap = missioneCorrente ? Object.assign({}, missioneCorrente) : null;

    // Marca come chiuso in localStorage
    docs._chiuso = true;
    docs._chiusoAt = new Date().toISOString();
    saveDocViaggio(targa, docs);

    // Push stato viaggio al Realtime DB
    const sent = await pushToFirebase(targa);

    // ── Archiviazione Firebase Storage (best-effort, non bloccante) ──
    if (window._fbStorage && missioneCorrente) {
        const _storageUpload = async () => {
            const { storage, sRef, uploadBytes } = window._fbStorage;
            const ts_data   = loadTimestamps(targa);
            const docs_data = loadDocViaggio(targa);
            const missionId = (missioneCorrente.id || missioneCorrente.numeroOrdine || Date.now()).toString().replace(/[^a-zA-Z0-9_-]/g,'_');
            const payload   = { missionId, targa, autista: currentDriver.nome, chiusoAt: new Date().toISOString(), missione: missioneCorrente, timestamps: ts_data, documenti: docs_data };
            const blob      = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const path      = 'archivio/' + targa + '/' + missionId + '/viaggio.json';
            await uploadBytes(sRef(storage, path), blob);
        };
        // Fire-and-forget: non blocca la chiusura
        _storageUpload().catch(e => console.warn('[Archivio] Storage non disponibile (file://):', e.message));
    }

    // ── Aggiorna status missione nel dispatcher ──────────────────────
    if (missioneCorrente && window._fb) {
        try {
            const { db, ref, get, update } = window._fb;
            const snap = await get(ref(db, 'dispatcher/missions'));
            if (snap.exists()) {
                const lista = snap.val();
                // lista può essere array o object
                const entries = Array.isArray(lista)
                    ? lista.map((m, i) => [String(i), m])
                    : Object.entries(lista);
                for (const [key, m] of entries) {
                    if (m && (m.id === missioneCorrente.id || m.numeroOrdine === missioneCorrente.id)) {
                        await update(ref(db, 'dispatcher/missions/' + key), {
                            status:      'completed',
                            completedAt: new Date().toISOString(),
                            completedBy: targa,
                        });
                        break;
                    }
                }
            }
            missioneCorrente = null;
            aggiornaHeroMissione(null);
        } catch(e) { console.warn('[chiudiViaggio] FB update error:', e); }
    }

    // ── Archivia missione locale ──────────────────────────────────────
    // missioneSnap è stata catturata prima dell'azzeramento
    _archiviaViaggio(targa, missioneSnap);

    if (sent) {
        updateSyncStatus(true, 'Viaggio chiuso · Dati inviati ✓');
        showToast('Viaggio chiuso!', 'Dati archiviati e inviati alla centrale', 'success');
    } else {
        showToast('Viaggio chiuso (offline)', 'Sincronizzazione in sospeso', 'warning');
        updateSyncStatus(false, 'Offline — sincronizzazione in sospeso');
    }

    // Re-abilita il bottone in ogni caso
    const btnReset = document.getElementById('btnChiudiViaggio');
    if (btnReset) {
        btnReset.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9c2.21 0 4.22.8 5.78 2.12"/></svg> CHIUDI VIAGGIO';
        btnReset.disabled = false;
    }
    renderDocViaggio(targa);
    renderTimestamps();
}

// Push automatico ad ogni cambio di fase (live tracking)
async function fbPushFase(targa) {
    if (!fbConnected) return;
    await pushToFirebase(targa);
}

// ====== DOCUMENTI CONDUCENTE ======
function docsKey(targa) { return 'ibs_docs_' + targa; }

// Alias: scanner module usa saveDocs/loadDocs

// Firebase Storage upload per documenti viaggio
async function uploadDocFirebase(file, docId, tipo) {
    if (!window._fbStorage || !currentDriver) return null;
    try {
        const { storage, sRef, uploadBytes, getDownloadURL } = window._fbStorage;
        const targa  = currentDriver.targa;
        const mId    = (missioneCorrente && missioneCorrente.id) ? missioneCorrente.id.replace(/[^a-zA-Z0-9_-]/g,'_') : 'misc';
        const ext    = (file.name || 'file').split('.').pop() || 'bin';
        const path   = 'docs/' + targa + '/' + mId + '/' + tipo + '_' + docId + '_' + Date.now() + '.' + ext;
        const snap   = await uploadBytes(sRef(storage, path), file);
        return await getDownloadURL(snap.ref);
    } catch(e) {
        console.warn('[uploadDocFirebase]', e);
        return null;
    }
}

// ID stabile per il viaggio corrente (basato su targa + data accettazione)


function loadDocs(targa) {
    try { return JSON.parse(localStorage.getItem(docsKey(targa))); } catch(e) { return null; }
}

function giorniAllaScadenza(dataStr) {
    if (!dataStr) return null;
    const oggi = new Date(); oggi.setHours(0,0,0,0);
    const scad = new Date(dataStr);
    return Math.ceil((scad - oggi) / 86400000);
}

function renderDocumenti(targa) {
    const docs = loadDocs(targa) || {};
    const DOCS = [
        { key: 'patente', nome: 'Patente' },
        { key: 'cqc',     nome: 'CQC'     },
        { key: 'tacho',   nome: 'Tacho'   },
    ];
    const header = document.getElementById('documentiHeader');
    header.innerHTML = DOCS.map(d => {
        const gg = giorniAllaScadenza(docs[d.key]);
        let cls, color, label;
        if (gg === null)          { cls=''; color='#bbb'; label='N/D'; }
        else if (gg < 0)          { cls='scaduto'; color='var(--red)'; label='SCADUTA'; }
        else if (gg <= 30)        { cls='in-scadenza'; color='#b8860b'; label=gg+' gg'; }
        else                      { cls='valido'; color='#2e7d32'; label=gg+' gg'; }
        return `
        <div class="doc-item ${cls}" onclick="apriModalDoc('${d.key}','${d.nome}')" style="cursor:pointer;">
            <div class="doc-nome">${d.nome}</div>
            <div class="doc-giorni" style="color:${color};font-size:0.7rem;font-weight:800;">${label}</div>
        </div>`;
    }).join('');
}

function apriModalDoc(key, nome) {
    const docs = loadDocs(currentDriver.targa) || {};
    document.getElementById('editDocTitolo').textContent = 'Scadenza ' + nome;
    document.getElementById('editDocKey').value = key;
    document.getElementById('editDocData').value = docs[key] || '';
    document.getElementById('modalEditDoc').classList.add('active');
}

function salvaEditDoc() {
    const key = document.getElementById('editDocKey').value;
    const data = document.getElementById('editDocData').value;
    if (!data) { showToast('Seleziona una data', '', 'warning'); return; }
    const targa = currentDriver.targa;
    const docs = loadDocs(targa) || {};
    docs[key] = data;
    localStorage.setItem(docsKey(targa), JSON.stringify(docs));
    chiudiModal('modalEditDoc');
    renderDocumenti(targa);
    const gg = giorniAllaScadenza(data);
    const msg = gg < 0 ? 'SCADUTA' : gg === 0 ? 'Scade oggi!' : 'Scade tra ' + gg + ' giorni';
    showToast('Documento aggiornato', msg, gg < 0 ? 'error' : gg <= 30 ? 'warning' : 'success');
}

function salvaSetupDocumenti() {
    const patente = document.getElementById('setupPatente').value;
    const cqc = document.getElementById('setupCqc').value;
    const tacho = document.getElementById('setupTacho').value;
    if (!patente || !cqc || !tacho) {
        showToast('Inserisci tutte le scadenze', '', 'warning');
        return;
    }
    const targa = currentDriver.targa;
    localStorage.setItem(docsKey(targa), JSON.stringify({ patente, cqc, tacho }));
    document.getElementById('setupPage').style.display = 'none';
    avviaAppFull(currentDriver);
}

// ====== LOGIN ======
function doLogin() {
    try {
        const code = document.getElementById('loginCode').value.trim().toUpperCase();
        const pass = document.getElementById('loginPassword').value;
        const driver = demoDrivers[code];
        if (!driver || driver.password !== pass) {
            const inputs = document.querySelectorAll('.login-input');
            inputs.forEach(i => { i.style.borderColor = 'var(--red)'; setTimeout(()=>i.style.borderColor='', 1500); });
            showToast('Credenziali non valide', 'Controlla codice e password', 'error');
            return;
        }
        currentDriver = Object.assign({}, driver, { code: code });
        localStorage.setItem('ibsDriver', JSON.stringify(currentDriver));
        // Primo accesso? Chiedi documenti
        if (!loadDocs(driver.targa)) {
            document.getElementById('loginPage').style.display = 'none';
            document.getElementById('setupPage').style.display = '';
        } else {
            avviaApp(currentDriver);
        }
    } catch(e) { showToast('Errore login', e.message, 'error'); }
}

function avviaApp(driver) {
    currentDriver = driver;
    const docs = loadDocs(driver.targa);
    if (!docs) {
        // Sessione ripristinata ma docs mai inseriti
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('setupPage').style.display = '';
        return;
    }
    avviaAppFull(driver);
}

function avviaAppFull(driver) {
    currentDriver = driver;
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('setupPage').style.display = 'none';
    document.getElementById('appContent').classList.add('active');
    document.getElementById('autistaNome').textContent = driver.nome;
    document.getElementById('targaDisplay').textContent = driver.targa;
    document.getElementById('footerNome').textContent = driver.nome;
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('it-IT', { weekday:'short', day:'2-digit', month:'short' });
    // Calcola giorni di presenza reali dal mese corrente
    (function() {
        const targa = driver.targa;
        const meseCurr = new Date().toISOString().slice(0, 7); // YYYY-MM
        let giorniPresenti = 0;
        // Conta dai rapportini chiusi (storico)
        try {
            const storico = JSON.parse(localStorage.getItem('ibs_rap_storico_' + targa) || '[]');
            const setGiorni = new Set();
            storico.forEach(r => { if (r.data && r.data.startsWith(meseCurr) && r.chiuso) setGiorni.add(r.data); });
            giorniPresenti = setGiorni.size;
        } catch(e) {}
        // Aggiungi oggi se c'è un rapportino aperto
        try {
            const rap = JSON.parse(localStorage.getItem('ibs_rap_' + targa));
            if (rap && rap.data && rap.data.startsWith(meseCurr)) giorniPresenti = Math.max(giorniPresenti, 1);
        } catch(e) {}
        document.getElementById('giorniPresenza').textContent = giorniPresenti || 0;
    })();
    document.getElementById('chatDot').style.display = 'block';
    renderDocumenti(driver.targa);
    renderTimestamps();
    renderMissioniTerminate([]); // verrà aggiornato dal listener Firebase
    initRapportino();
    // Init Firebase listener per questa targa
    // (initChatDriver viene chiamata dentro initFirebase, dopo che _fbReady è confermato)
    if (window._fbReady) {
        initFirebase(driver.targa);
    } else {
        document.addEventListener('firebase-ready', () => {
            initFirebase(driver.targa);
        }, { once: true });
    }
    // Avvia GPS tracking automaticamente al login
    avviaGPSTracking();
}

function doLogout() {
    fermaGPSTracking(); // ferma GPS tracking prima del logout
    currentDriver = null;
    localStorage.removeItem('ibsDriver');
    document.getElementById('appContent').classList.remove('active');
    document.getElementById('setupPage').style.display = 'none';
    document.getElementById('loginPage').style.display = '';
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
    try {
        const s = localStorage.getItem('ibsDriver');
        if (s) avviaApp(JSON.parse(s));
    } catch(e) { localStorage.removeItem('ibsDriver'); }
    // Pre-fill oggi come min date per i date inputs
    const oggi = new Date().toISOString().slice(0,10);
    ['setupPatente','setupCqc','setupTacho'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.min = oggi;
    });
});

// ====== RAPPORTINO GIORNALIERO ======
function rapKey(targa) { return 'ibs_rap_' + targa; }
function rapStoricoKey(targa) { return 'ibs_rap_storico_' + targa; }

function getToday() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function loadRapportino(targa) {
    try {
        const data = JSON.parse(localStorage.getItem(rapKey(targa)));
        if (data && data.data === getToday()) return data;
    } catch(e) {}
    // Crea nuovo rapportino per oggi
    const nuovo = { data: getToday(), targa, kmGiorno: 0, oreGuida: 0, rifornimenti: [], note: '', chiuso: false, sostaNotturna: null };
    localStorage.setItem(rapKey(targa), JSON.stringify(nuovo));
    return nuovo;
}

function saveRapportino(rap) {
    localStorage.setItem(rapKey(rap.targa), JSON.stringify(rap));
}

function initRapportino() {
    if (!currentDriver) return;
    const targa = currentDriver.targa;
    const rap = loadRapportino(targa);

    // Header
    const dateStr = new Date().toLocaleDateString('it-IT', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    document.getElementById('rapDataOggi').textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    document.getElementById('rapTargaHeader').textContent = targa + ' · ' + currentDriver.nome;

    renderRapportino(rap);
    renderStoricoRapportini(targa);
}

function aggiornaKmDisplay() {
    const val = parseInt(document.getElementById('rapKmInput').value, 10) || 0;
    document.getElementById('rapKmTotali').textContent = val;
}

function renderRapportino(rap) {
    const badge = document.getElementById('rapStatoBadge');
    const chiuso = rap.chiuso;
    if (chiuso) {
        badge.textContent = 'Chiuso';
        badge.style.cssText = 'font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:5px 12px;border-radius:20px;background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;';
        document.getElementById('btnChiudiRapportino').style.display = 'none';
        document.getElementById('btnSoloTrasferta').style.display = 'none';
        document.getElementById('rapNote').disabled = true;
        document.getElementById('rapNote').style.background = '#f5f5f5';
        document.getElementById('rapKmInput').disabled = true;
        document.getElementById('rapKmInput').style.background = '#f5f5f5';
        document.getElementById('rapOreGuida').disabled = true;
        document.getElementById('rapOreGuida').style.background = '#f5f5f5';
    } else {
        badge.textContent = 'Aperto';
        badge.style.cssText = 'font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:5px 12px;border-radius:20px;background:#fff8e1;color:#b8860b;border:1px solid var(--yellow);';
        document.getElementById('btnChiudiRapportino').style.display = '';
        document.getElementById('btnSoloTrasferta').style.display = 'flex';
        document.getElementById('rapNote').disabled = false;
        document.getElementById('rapKmInput').disabled = false;
        document.getElementById('rapOreGuida').disabled = false;
    }

    document.getElementById('rapKmTotali').textContent = rap.kmGiorno || 0;
    document.getElementById('rapKmInput').value = rap.kmGiorno || '';
    document.getElementById('rapOreGuida').value = rap.oreGuida || '';
    document.getElementById('rapNote').value = rap.note || '';

    // Rifornimenti
    const rifEl = document.getElementById('listaRifornimenti');
    const rifList = rap.rifornimenti || [];
    document.getElementById('rapCountRif').textContent = rifList.length;
    if (!rap.chiuso) {
        document.getElementById('btnAggiungiRif').style.display = '';
    } else {
        document.getElementById('btnAggiungiRif').style.display = 'none';
    }
    if (rifList.length === 0) {
        rifEl.innerHTML = `<div style="text-align:center;padding:18px;color:#bbb;font-size:0.85rem;">Nessun rifornimento registrato</div>`;
    } else {
        rifEl.innerHTML = rifList.map((r, i) => {
            const isGasolio = r.tipo === 'GASOLIO';
            const borderCol = isGasolio ? 'var(--red)' : '#1565c0';
            const badgeBg = isGasolio ? 'var(--red)' : '#1565c0';
            const emoji = isGasolio ? '🛢️' : '💧';
            return `
            <div style="background:var(--gray);border-radius:10px;padding:12px 14px;margin-bottom:8px;border-left:4px solid ${borderCol};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                    <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                            <span style="background:${badgeBg};color:white;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:5px;letter-spacing:0.5px;">${emoji} ${r.tipo}</span>
                            <span style="font-size:0.72rem;color:var(--text-dim);">${r.ora || ''}</span>
                        </div>
                        <div style="display:flex;gap:14px;align-items:baseline;flex-wrap:wrap;">
                            <span style="font-size:1rem;font-weight:800;color:var(--red);">€ ${r.totale}</span>
                            <span style="font-size:0.78rem;color:var(--text-dim);">${r.litri} L × € ${r.prezzo}/L</span>
                        </div>

                        ${r.scontrinoThumb ? `
                        <div style="margin-top:8px;">
                            <img src="${r.scontrinoThumb}" style="height:60px;border-radius:6px;border:2px solid var(--green);object-fit:cover;cursor:pointer;" onclick="apriScontrino('${i}')" />
                            <div style="font-size:0.68rem;color:var(--green);font-weight:700;margin-top:3px;">✓ Scontrino allegato</div>
                        </div>` : ''}
                    </div>
                    ${!rap.chiuso ? `<button onclick="eliminaRifornimento(${i})" style="background:none;border:none;cursor:pointer;padding:4px;flex-shrink:0;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>` : ''}
                </div>
            </div>`;
        }).join('');
    }

    // Sosta notturna (se chiuso)
    if (rap.chiuso && rap.sostaNotturna) {
        document.getElementById('sostaBox').style.display = 'block';
        document.getElementById('sostaFlag').textContent = rap.sostaNotturna.flag;
        document.getElementById('sostaPaese').textContent = rap.sostaNotturna.paese;
        const ccEl = document.getElementById('sostaCittaCap');
        if (ccEl) {
            const cap = rap.sostaNotturna.cap || '';
            const citta = rap.sostaNotturna.citta || '';
            ccEl.textContent = [cap, citta].filter(Boolean).join(' – ');
        }
        const isEstero = rap.sostaNotturna.codice !== 'IT';
        const tb = document.getElementById('trasfertaBadge');
        if (isEstero) {
            tb.textContent = '🌍 Trasferta Estero';
            tb.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:25px;font-weight:700;font-size:0.9rem;background:var(--red);color:white;';
        } else {
            tb.textContent = '🇮🇹 Lavoro Italia';
            tb.style.cssText = 'display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:25px;font-weight:700;font-size:0.9rem;background:#009246;color:white;';
        }
    } else {
        document.getElementById('sostaBox').style.display = 'none';
    }
}

function apriModalTratta() {
    document.getElementById('trattaDa').value = '';
    document.getElementById('trattaA').value = '';
    document.getElementById('trattaKm').value = '';
    document.getElementById('trattaNote').value = '';
    document.getElementById('trattaCarico').value = '';
    document.getElementById('trattaTarga').value = '';
    if (document.getElementById('containerRimorchio')) document.getElementById('containerRimorchio').value = '';
    if (document.getElementById('containerISO')) document.getElementById('containerISO').value = '';
    // Reset buttons
    document.querySelectorAll('.carico-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.targa-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('blockCisterna').style.display = 'none';
    document.getElementById('blockContainer').style.display = 'none';
    document.getElementById('modalTratta').classList.add('active');
    setTimeout(() => document.getElementById('trattaDa').focus(), 300);
}

function selezionaCarico(tipo) {
    document.getElementById('trattaCarico').value = tipo;
    document.querySelectorAll('.carico-btn').forEach(b => b.classList.remove('selected'));
    const btnMap = { 'CISTERNA CARICA': 'btn-cisterna-carica', 'CISTERNA VUOTA': 'btn-cisterna-vuota', 'CONTAINER': 'btn-container' };
    document.getElementById(btnMap[tipo]).classList.add('selected');
    // Mostra/nascondi blocchi
    if (tipo === 'CONTAINER') {
        document.getElementById('blockCisterna').style.display = 'none';
        document.getElementById('blockContainer').style.display = 'block';
        document.getElementById('trattaTarga').value = '';
        document.querySelectorAll('.targa-btn').forEach(b => b.classList.remove('selected'));
    } else {
        document.getElementById('blockCisterna').style.display = 'block';
        document.getElementById('blockContainer').style.display = 'none';
    }
}

function selezionaTarga(targa) {
    document.getElementById('trattaTarga').value = targa;
    document.querySelectorAll('.targa-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('targa-' + targa).classList.add('selected');
}

function salvaTratta() {
    const da = document.getElementById('trattaDa').value.trim();
    const a = document.getElementById('trattaA').value.trim();
    const km = parseInt(document.getElementById('trattaKm').value);
    const carico = document.getElementById('trattaCarico').value;
    const note = document.getElementById('trattaNote').value.trim();

    if (!da || !a) { showToast('Campi obbligatori', 'Inserisci partenza e arrivo', 'warning'); return; }
    if (!km || km <= 0) { showToast('KM non validi', 'Inserisci i chilometri percorsi', 'warning'); return; }
    if (!carico) { showToast('Seleziona il tipo carico', '', 'warning'); return; }

    let extra = {};

    if (carico === 'CISTERNA CARICA' || carico === 'CISTERNA VUOTA') {
        const targa = document.getElementById('trattaTarga').value;
        if (!targa) { showToast('Seleziona la targa cisterna', '', 'warning'); return; }
        extra.targaCisterna = targa;
    }

    if (carico === 'CONTAINER') {
        const rimorchio = document.getElementById('containerRimorchio').value.trim().toUpperCase();
        const iso = document.getElementById('containerISO').value.trim().toUpperCase();
        if (!rimorchio) { showToast('Inserisci la targa rimorchio', '', 'warning'); return; }
        if (!iso) { showToast('Inserisci il numero ISO container', '', 'warning'); return; }
        extra.targaRimorchio = rimorchio;
        extra.isoContainer = iso;
    }

    const rap = loadRapportino(currentDriver.targa);
    var _tratta = Object.assign({ da: da, a: a, km: km, carico: carico, note: note }, extra || {});
    _tratta.ora = new Date().toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'});
    rap.tratte.push(_tratta);
    rap.kmTotali = rap.tratte.reduce((s, t) => s + t.km, 0);
    saveRapportino(rap);
    chiudiModal('modalTratta');
    renderRapportino(rap);
    showToast('Tratta aggiunta', `${da} → ${a} · ${km} km`, 'success');
}

function eliminaTratta(index) {
    if (!confirm('Eliminare questa tratta?')) return;
    const rap = loadRapportino(currentDriver.targa);
    rap.tratte.splice(index, 1);
    rap.kmTotali = rap.tratte.reduce((s, t) => s + t.km, 0);
    saveRapportino(rap);
    renderRapportino(rap);
}

// ====== RIFORNIMENTI ======
let scontrinoDataUrl = null;

function apriModalRif() {
    document.getElementById('rifTipo').value = '';
    document.getElementById('rifLitri').value = '';
    document.getElementById('rifPrezzo').value = '';
    document.querySelectorAll('#btn-gasolio, #btn-adblue').forEach(b => b.classList.remove('selected'));
    document.getElementById('rifTotaleBox').style.display = 'none';
    document.getElementById('rifTotaleVal').textContent = '€ 0.00';
    scontrinoDataUrl = null;
    document.getElementById('rifScontrinoPreview').style.display = 'none';
    document.getElementById('rifScontrinoZoneWrap').style.display = '';
    document.getElementById('inputScan').value = '';
    document.getElementById('inputGallery').value = '';
    document.getElementById('modalRif').classList.add('active');
}

function selezionaCarburante(tipo) {
    document.getElementById('rifTipo').value = tipo;
    document.getElementById('btn-gasolio').classList.toggle('selected', tipo === 'GASOLIO');
    document.getElementById('btn-adblue').classList.toggle('selected', tipo === 'ADBLUE');
    // Adblue ha solitamente un prezzo diverso - hint nel placeholder
    if (tipo === 'ADBLUE') {
        document.getElementById('rifPrezzo').placeholder = '0.000 (AdBlue)';
    } else {
        document.getElementById('rifPrezzo').placeholder = '0.000';
    }
    calcolaImporto();
}

function calcolaImporto() {
    const litri = parseFloat(document.getElementById('rifLitri').value) || 0;
    const prezzo = parseFloat(document.getElementById('rifPrezzo').value) || 0;
    if (litri > 0 && prezzo > 0) {
        const totale = (litri * prezzo).toFixed(2);
        document.getElementById('rifTotaleVal').textContent = '€ ' + totale;
        document.getElementById('rifTotaleBox').style.display = 'block';
    } else {
        document.getElementById('rifTotaleBox').style.display = 'none';
    }
}

function gestisciScontrino(input) {
    const file = input.files[0];
    if (!file) return;
    const isPdf = file.type === 'application/pdf';
    const reader = new FileReader();
    reader.onload = (e) => {
        scontrinoDataUrl = e.target.result;
        // Per PDF mostra icona placeholder, per immagini mostra preview
        if (isPdf) {
            document.getElementById('rifScontrinoImg').src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="140" viewBox="0 0 200 140"><rect width="200" height="140" fill="%23f5f5f5" rx="8"/><text x="100" y="55" text-anchor="middle" font-size="40">📄</text><text x="100" y="90" text-anchor="middle" font-family="sans-serif" font-size="13" fill="%23555" font-weight="bold">PDF allegato</text><text x="100" y="110" text-anchor="middle" font-family="sans-serif" font-size="11" fill="%23999">' + file.name + '</text></svg>';
        } else {
            document.getElementById('rifScontrinoImg').src = scontrinoDataUrl;
        }
        document.getElementById('rifScontrinoPreview').style.display = 'block';
        document.getElementById('rifScontrinoZoneWrap').style.display = 'none';
        document.getElementById('rifScontrinoLabel').textContent = file.name;
    };
    reader.readAsDataURL(file);
}

function rimuoviScontrino() {
    scontrinoDataUrl = null;
    document.getElementById('rifScontrinoPreview').style.display = 'none';
    document.getElementById('rifScontrinoZoneWrap').style.display = '';
    document.getElementById('inputScan').value = '';
    document.getElementById('inputGallery').value = '';
}

function apriScontrino(index) {
    const rap = loadRapportino(currentDriver.targa);
    const r = (rap.rifornimenti || [])[index];
    if (!r || !r.scontrinoThumb) return;
    const w = window.open('', '_blank');
    w.document.write('<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="' + (r.scontrinoThumb||'') + '" style="max-width:100%;max-height:100vh;"><\/body><\/html>');
    w.document.close();
}

function salvaRifornimento() {
    const tipo = document.getElementById('rifTipo').value;
    const litri = parseFloat(document.getElementById('rifLitri').value);
    const prezzo = parseFloat(document.getElementById('rifPrezzo').value);

    if (!tipo) { showToast('Seleziona il tipo di carburante', '', 'warning'); return; }
    if (!litri || litri <= 0) { showToast('Inserisci i litri', '', 'warning'); return; }
    if (!prezzo || prezzo <= 0) { showToast('Inserisci il prezzo per litro', '', 'warning'); return; }
    if (!scontrinoDataUrl) {
        showToast('Scan obbligatorio', 'Scansiona lo scontrino prima di salvare', 'error');
        // Shake animation
        const wrap = document.getElementById('rifScontrinoZoneWrap');
        wrap.style.outline = '2px solid var(--red)';
        wrap.style.borderRadius = '14px';
        setTimeout(() => { wrap.style.outline = ''; }, 2200);
        return;
    }

    const totale = (litri * prezzo).toFixed(2);
    const rap = loadRapportino(currentDriver.targa);
    if (!rap.rifornimenti) rap.rifornimenti = [];
    rap.rifornimenti.push({
        tipo, litri: litri.toFixed(1), prezzo: prezzo.toFixed(3), totale,
        scontrinoThumb: scontrinoDataUrl,
        ora: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
    });
    saveRapportino(rap);
    scontrinoDataUrl = null;
    chiudiModal('modalRif');
    renderRapportino(rap);
    showToast('Rifornimento salvato', `${tipo} · ${litri.toFixed(1)} L · € ${totale}`, 'success');
}

function eliminaRifornimento(index) {
    if (!confirm('Eliminare questo rifornimento?')) return;
    const rap = loadRapportino(currentDriver.targa);
    if (rap.rifornimenti) {
        rap.rifornimenti.splice(index, 1);
        saveRapportino(rap);
        renderRapportino(rap);
    }
}

function salvaNoteDraft() {
    if (!currentDriver) return;
    const rap = loadRapportino(currentDriver.targa);
    rap.note = document.getElementById('rapNote').value;
    saveRapportino(rap);
}

// Mappa paesi per reverse geocoding
const PAESI_INFO = {
    'IT': { nome: 'Italia', flag: '🇮🇹' },
    'FR': { nome: 'Francia', flag: '🇫🇷' },
    'ES': { nome: 'Spagna', flag: '🇪🇸' },
    'DE': { nome: 'Germania', flag: '🇩🇪' },
    'AT': { nome: 'Austria', flag: '🇦🇹' },
    'CH': { nome: 'Svizzera', flag: '🇨🇭' },
    'SI': { nome: 'Slovenia', flag: '🇸🇮' },
    'HR': { nome: 'Croazia', flag: '🇭🇷' },
    'PT': { nome: 'Portogallo', flag: '🇵🇹' },
    'BE': { nome: 'Belgio', flag: '🇧🇪' },
    'NL': { nome: 'Paesi Bassi', flag: '🇳🇱' },
    'PL': { nome: 'Polonia', flag: '🇵🇱' },
    'CZ': { nome: 'Repubblica Ceca', flag: '🇨🇿' },
    'SK': { nome: 'Slovacchia', flag: '🇸🇰' },
    'HU': { nome: 'Ungheria', flag: '🇭🇺' },
    'RO': { nome: 'Romania', flag: '🇷🇴' },
    'BG': { nome: 'Bulgaria', flag: '🇧🇬' },
    'GR': { nome: 'Grecia', flag: '🇬🇷' },
    'LU': { nome: 'Lussemburgo', flag: '🇱🇺' },
};

function chiudiSoloTrasferta() {
    const ore = parseFloat(document.getElementById('rapOreGuida').value);
    if (!ore || ore < 1) {
        showToast('Ore di guida richieste', 'Seleziona le ore di guida (min 1) prima di chiudere', 'error');
        return;
    }
    if (!confirm('Chiudere il rapportino come giornata di sola trasferta?')) return;

    const rap = loadRapportino(currentDriver.targa);
    rap.note = document.getElementById('rapNote').value;
    rap.kmGiorno = parseInt(document.getElementById('rapKmInput').value, 10) || 0;
    rap.oreGuida = ore;
    rap.soloTrasferta = true;

    const btn = document.getElementById('btnSoloTrasferta');
    btn.innerHTML = '<div style="width:16px;height:16px;border:2px solid rgba(0,0,0,0.2);border-top:2px solid var(--black);border-radius:50%;animation:spin 0.9s linear infinite;"></div> Rilevamento GPS...';
    btn.disabled = true;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => finalizzaRapportino(rap, pos.coords.latitude, pos.coords.longitude),
            ()  => finalizzaRapportino(rap, null, null),
            { timeout: 8000, enableHighAccuracy: true }
        );
    } else {
        finalizzaRapportino(rap, null, null);
    }
}

function chiudiRapportino() {
    const km = parseInt(document.getElementById('rapKmInput').value, 10) || 0;
    const ore = parseFloat(document.getElementById('rapOreGuida').value);
    if (!ore || ore < 1) {
        showToast('Ore di guida richieste', 'Seleziona le ore di guida (min 1) prima di chiudere', 'error');
        return;
    }
    const docs = loadDocViaggio(currentDriver.targa);
    if (!confirm('Chiudere il rapportino di oggi? Il GPS rileverà la tua posizione per la sosta notturna.')) return;

    // Mostra spinner nel bottone
    const btn = document.getElementById('btnChiudiRapportino');
    btn.innerHTML = '<div style="width:18px;height:18px;border:3px solid rgba(0,0,0,0.2);border-top:3px solid var(--black);border-radius:50%;animation:spin 0.9s linear infinite;"></div> Rilevamento GPS...';
    btn.disabled = true;

    rap.note = document.getElementById('rapNote').value;
    rap.kmGiorno = km;
    rap.oreGuida = ore;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            pos => finalizzaRapportino(rap, pos.coords.latitude, pos.coords.longitude),
            () => finalizzaRapportino(rap, null, null),
            { timeout: 8000, enableHighAccuracy: true }
        );
    } else {
        finalizzaRapportino(rap, null, null);
    }
}

async function finalizzaRapportino(rap, lat, lng) {
    let sostaNotturna = { paese: 'Sconosciuta', codice: '??', flag: '🏳️', cap: '', citta: '' };

    if (lat !== null && lng !== null) {
        try {
            // Nominatim OpenStreetMap - free, no API key
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`);
            const data = await res.json();
            const addr = data.address || {};
            const codice = (addr.country_code ? addr.country_code.toUpperCase() : '??');
            const info = PAESI_INFO[codice] || { nome: addr.country || 'Sconosciuto', flag: '🏳️' };
            const cap = addr.postcode || '';
            const citta = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
            sostaNotturna = { paese: info.nome, codice, flag: info.flag, cap, citta, lat, lng };
        } catch(e) {
            sostaNotturna = { paese: 'Errore rilevamento', codice: '??', flag: '🏳️', cap: '', citta: '' };
        }
    }

    rap.chiuso = true;
    rap.sostaNotturna = sostaNotturna;
    rap.oraChiusura = new Date().toISOString();
    saveRapportino(rap);

    // Archivia in storico
    const storicoKey = rapStoricoKey(currentDriver.targa);
    const storico = JSON.parse(localStorage.getItem(storicoKey) || '[]');
    storico.unshift(rap);
    localStorage.setItem(storicoKey, JSON.stringify(storico.slice(0, 90)));

    renderRapportino(rap);
    renderStoricoRapportini(currentDriver.targa);

    const isEstero = sostaNotturna.codice !== 'IT' && sostaNotturna.codice !== '??';
    showToast('Rapportino chiuso!', `${sostaNotturna.flag} ${sostaNotturna.paese} · ${isEstero ? 'Trasferta Estero' : 'Lavoro Italia'}`, 'success');
}

function renderStoricoRapportini(targa) {
    const storicoKey = rapStoricoKey(targa);
    const storico = JSON.parse(localStorage.getItem(storicoKey) || '[]');
    const el = document.getElementById('storicoRapportini');
    if (storico.length === 0) {
        el.innerHTML = `<div style="text-align:center;padding:24px;color:#bbb;font-size:0.85rem;">Nessun rapportino precedente</div>`;
        return;
    }
    el.innerHTML = storico.map((r, i) => {
        const data = new Date(r.data).toLocaleDateString('it-IT', { weekday:'short', day:'2-digit', month:'short', year:'numeric' });
        const isEstero = r.sostaNotturna && r.sostaNotturna.codice !== 'IT' && r.sostaNotturna.codice !== '??';
        const borderColor = isEstero ? 'var(--yellow)' : 'var(--red)';
        const flag = r.sostaNotturna ? r.sostaNotturna.flag : '—';
        return `
        <div onclick="apriDettaglioRap(${i})" style="background:white;border-radius:10px;padding:14px;margin-bottom:8px;border-left:4px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.06);cursor:pointer;transition:transform 0.15s;" onmouseover="this.style.transform='translateX(3px)'" onmouseout="this.style.transform=''">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:700;font-size:0.88rem;">${data}</div>
                    <div style="font-size:0.75rem;color:var(--text-dim);margin-top:3px;">
                        <strong style="color:var(--red)">${r.kmGiorno || r.kmTotali || 0} km</strong> · ${r.oreGuida || 0} ore guida${r.soloTrasferta ? ' · <em>trasferta</em>' : ''}
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:1.6rem;">${flag}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            </div>
        </div>`;
    }).join('');
}

function apriDettaglioRap(index) {
    const storicoKey = rapStoricoKey(currentDriver.targa);
    const storico = JSON.parse(localStorage.getItem(storicoKey) || '[]');
    const r = storico[index];
    if (!r) return;

    const data = new Date(r.data).toLocaleDateString('it-IT', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    const isEstero = r.sostaNotturna && r.sostaNotturna.codice !== 'IT';

    document.getElementById('dettaglioRapTitolo').textContent = data;
    document.getElementById('dettaglioRapContent').innerHTML = `
        <div style="background:linear-gradient(135deg,var(--red),var(--dark-red));border:3px solid var(--yellow);border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
            <div style="font-size:2.4rem;font-weight:800;color:white;line-height:1;">${r.kmGiorno || r.kmTotali || 0}</div>
            <div style="font-size:0.75rem;color:rgba(255,255,255,0.85);font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-top:4px;">KM Totali · ${r.oreGuida || 0} ore guida</div>
        </div>
        ${r.sostaNotturna ? `
        <div style="background:white;border:2px solid var(--yellow);border-radius:10px;padding:14px;text-align:center;margin-bottom:14px;">
            <div style="font-size:2.5rem;">${r.sostaNotturna.flag}</div>
            <div style="font-weight:800;font-size:1rem;margin-top:4px;">${r.sostaNotturna.paese}</div>
            ${(r.sostaNotturna.cap || r.sostaNotturna.citta) ? `<div style="font-size:0.88rem;color:var(--text-dim);margin-top:3px;">${[r.sostaNotturna.cap, r.sostaNotturna.citta].filter(Boolean).join(' – ')}</div>` : ''}
            <div style="margin-top:8px;">
                <span style="display:inline-flex;padding:5px 14px;border-radius:20px;font-weight:700;font-size:0.82rem;${isEstero ? 'background:var(--red);color:white;' : 'background:#009246;color:white;'}">
                    ${isEstero ? '🌍 Trasferta Estero' : '🇮🇹 Lavoro Italia'}
                </span>
            </div>
        </div>` : ''}
        ${r.soloTrasferta ? `<div style="background:#e8f5e9;border:2px solid #4caf50;border-radius:10px;padding:12px 14px;margin-bottom:12px;text-align:center;font-weight:700;color:#2e7d32;">🏨 Giornata in trasferta senza guida</div>` : ''}
        ${r.note ? `<div style="background:#fffde7;border:1px solid var(--yellow);border-radius:8px;padding:12px;margin-top:10px;font-size:0.85rem;color:#555;font-style:italic;">${r.note}</div>` : ''}
        ${(r.rifornimenti && r.rifornimenti.length > 0) ? `
        <div style="margin-top:14px;">
            <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-dim);margin-bottom:8px;">Rifornimenti</div>
            ${r.rifornimenti.map(rf => `
                <div style="background:var(--gray);border-radius:8px;padding:10px 12px;margin-bottom:6px;border-left:3px solid ${rf.tipo === 'GASOLIO' ? 'var(--red)' : '#1565c0'};">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <span style="font-size:0.72rem;font-weight:700;color:${rf.tipo === 'GASOLIO' ? 'var(--red)' : '#1565c0'};">${rf.tipo === 'GASOLIO' ? '🛢️' : '💧'} ${rf.tipo}</span>
                            <div style="font-weight:800;font-size:0.9rem;color:var(--red);margin-top:2px;">€ ${rf.totale}</div>
                            <div style="font-size:0.72rem;color:var(--text-dim);">${rf.litri} L × € ${rf.prezzo}/L</div>
                        </div>
                        ${rf.scontrinoThumb ? `<img src="${rf.scontrinoThumb}" style="height:50px;width:40px;object-fit:cover;border-radius:5px;border:1px solid var(--green);margin-left:8px;flex-shrink:0;" />` : '<span style="font-size:0.68rem;color:#f44;margin-left:8px;">No scontrino</span>'}
                    </div>
                </div>`).join('')}
            <div style="background:linear-gradient(135deg,var(--red),var(--dark-red));border-radius:8px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:0.75rem;color:rgba(255,255,255,0.85);font-weight:700;text-transform:uppercase;letter-spacing:1px;">Totale rifornimenti</span>
                <span style="font-size:1.1rem;font-weight:800;color:white;">€ ${r.rifornimenti.reduce((s,rf)=>s+parseFloat(rf.totale||0),0).toFixed(2)}</span>
            </div>
        </div>` : ''}
    `;
    document.getElementById('modalDettaglioRap').classList.add('active');
}

// ====== NAVIGATION ======
function showSection(id, btn) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');
    if (id === 'sezChat') { document.getElementById('chatDot').style.display = 'none'; scrollChat(); }
    if (id === 'sezRapportino') { initRapportino(); }
    // sezMappa rimossa
}

// ====== CHAT (Firebase Realtime) ======
// Struttura: chat/{driverCode}/{pushId} = { from, text, time, mine, ts }
let chatMsgCount = 0; // per tracciare non letti

// ── Audio ding ────────────────────────────────────────────────────
function playDing() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch(e) {}
}

// ── Notifiche Push browser ────────────────────────────────────────
function richiediPermessoNotifiche() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
}

function inviaNotificaPush(testo) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
        const n = new Notification('📨 Centrale', {
            body: testo,
            icon: '/logo.jpeg',
            tag: 'chat-centrale',
            renotify: true,
            silent: true
        });
        setTimeout(() => n.close(), 6000);
    } catch(e) {}
}

function initChatDriver() {
    if (!window._fbReady || !window._fb || !currentDriver) return;
    richiediPermessoNotifiche();
    const { db, ref, onValue } = window._fb;
    const chatPath = 'chat/' + currentDriver.code;
    onValue(ref(db, chatPath), (snap) => {
        const raw = snap.val();
        const data = raw || {};
        const msgs = Array.isArray(data)
            ? data.filter(Boolean)
            : Object.values(data).filter(Boolean);
        msgs.sort((a,b) => (a.ts||0)-(b.ts||0));
        renderChatMessages(msgs);
        // Messaggi dalla Centrale (non dal driver stesso)
        const fromCentrale = msgs.filter(m => !currentDriver ||
            (m.from !== currentDriver.nome && m.from !== currentDriver.code));
        if (fromCentrale.length > chatMsgCount) {
            const dot = document.getElementById('chatDot');
            if (dot) dot.style.display = 'block';
            // Ding + notifica push per ogni nuovo messaggio
            const nuovi = fromCentrale.slice(chatMsgCount);
            nuovi.forEach(m => {
                playDing();
                if (document.hidden) inviaNotificaPush(m.text);
            });
        }
        chatMsgCount = fromCentrale.length;
    });
}

function renderChatMessages(msgs) {
    const c = document.getElementById('chatMessages');
    if (!c) return;
    if (msgs.length === 0) {
        c.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#bbb;font-size:0.85rem;">Nessun messaggio dalla centrale</div>';
    } else {
        c.innerHTML = msgs.map(m => {
            // Usa SOLO 'from' — il campo 'mine' è inaffidabile (il DSP lo salva sempre true)
            const isDriver = currentDriver && (
                m.from === currentDriver.nome ||
                m.from === currentDriver.code
            );
            const side   = isDriver ? 'mine' : 'theirs';
            const sender = isDriver ? 'Tu' : (m.from || 'Centrale');
            return '<div class="msg ' + side + '">'
                + '<div class="msg-sender">' + sender + '</div>'
                + '<div class="msg-bubble">' + (m.text || '') + '</div>'
                + '<div class="msg-time">' + (m.time || '') + '</div>'
                + '</div>';
        }).join('');
    }
    scrollChat();
}

async function inviaMsg() {
    const input = document.getElementById('chatInput'), testo = input.value.trim();
    if (!testo || !currentDriver) return;
    input.value = '';
    const now  = new Date();
    const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const msg  = { from: currentDriver.nome, code: currentDriver.code, text: testo, time, mine: true, ts: Date.now() };
    // mine:true dal punto di vista del driver (allineato a destra)
    if (window._fbReady && window._fb) {
        const { db, ref, push } = window._fb;
        try {
            await push(ref(db, 'chat/' + currentDriver.code), msg);
        } catch(e) {
            // fallback visivo
            renderChatMessages([...(JSON.parse(document.getElementById('chatMessages').dataset.msgs||'[]')), msg]);
        }
    }
}

function scrollChat() { const c = document.getElementById('chatMessages'); if(c) c.scrollTop = c.scrollHeight; }


// ════════════════════════════════════════════════════
// GPS TRACKING CONTINUO — Background safe
// ════════════════════════════════════════════════════
let gpsWatchId     = null;   // navigator.geolocation.watchPosition handle
let gpsLastLat     = null;
let gpsLastLng     = null;
let gpsLastAcc     = null;
let gpsLastUpdate  = null;
let gpsKeepAliveId = null;   // setInterval per keepalive background

const GPS_INTERVAL_MS  = 20000;  // invia ogni 20s
const GPS_MAX_AGE_MS   = 15000;  // accetta posizione vecchia max 15s
const GPS_TIMEOUT_MS   = 18000;

async function inviaGPSFirebase(lat, lng, acc) {
    if (!window._fbReady || !window._fb || !currentDriver) return;
    const { db, ref, set } = window._fb;
    const payload = {
        lat,
        lng,
        acc: Math.round(acc || 0),
        ts: Date.now(),
        autista: currentDriver.nome,
        nome:    currentDriver.nome,
        targa:   currentDriver.targa,
        code:    currentDriver.code,
    };
    try {
        await set(ref(db, 'gps_sv/' + currentDriver.targa), payload);
        gpsLastLat    = lat;
        gpsLastLng    = lng;
        gpsLastAcc    = acc;
        gpsLastUpdate = new Date();
        aggiornaUIGPS('ok');
    } catch(e) {
        aggiornaUIGPS('error');
    }
}

function aggiornaUIGPS(stato) {
    var led = document.getElementById('gpsLed');
    if (!led) return;
    if (stato === 'ok' && gpsLastLat) {
        led.style.background = '#28a745';
        led.style.boxShadow  = '0 0 0 4px rgba(40,167,69,0.3)';
        led.title = 'GPS attivo';
    } else if (stato === 'searching') {
        led.style.background = '#FFD100';
        led.style.boxShadow  = '0 0 0 4px rgba(255,209,0,0.3)';
        led.title = 'Ricerca GPS...';
    } else if (stato === 'error') {
        led.style.background = '#E30613';
        led.style.boxShadow  = '0 0 0 4px rgba(227,6,19,0.2)';
        led.title = 'GPS non disponibile';
    } else if (stato === 'bg') {
        led.style.background = '#28a745';
        led.style.boxShadow  = '0 0 0 4px rgba(40,167,69,0.15)';
        led.title = 'GPS background';
    } else {
        led.style.background = '#ccc';
        led.style.boxShadow  = '0 0 0 3px rgba(204,204,204,0.2)';
        led.title = 'GPS non attivo';
    }
}

async function avviaGPSTracking() {
    if (!currentDriver) return;
    fermaGPSTracking();
    aggiornaUIGPS('searching');

    // ── MODALITÀ 1: Plugin nativo Capacitor (APK) ──
    // Il Foreground Service Android mantiene il GPS attivo anche
    // con schermo spento — nessuna sospensione possibile
    const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IbsLocation;
    if (cap) {
        try {
            await cap.startTracking();
            // Il plugin nativo emette eventi 'locationUpdate' ogni 20s
            await cap.addListener('locationUpdate', async (data) => {
                const { lat, lng, acc, speed } = data;
                currentLat = lat;
                currentLng = lng;
                await inviaGPSFirebase(lat, lng, acc);
                aggiornaUIGPS('ok');
                // Aggiorna velocità se disponibile
                if (speed > 0) {
                    const elSpd = document.getElementById('gpsSpeed');
                    if (elSpd) elSpd.textContent = Math.round(speed) + ' km/h';
                }
            });
            aggiornaUIGPS('ok');
            showToast('GPS Foreground Service attivo', 'Posizione garantita in background', 'success');
            return; // usa solo il plugin nativo, non serve watchPosition
        } catch(e) {
            console.warn('Plugin IbsLocation non disponibile, fallback su watchPosition:', e);
        }
    }

    // ── MODALITÀ 2: Browser / WebView senza plugin (fallback) ──
    // watchPosition funziona mentre l'app è visibile.
    // Su Android WebView viene sospeso dallo schermo spento —
    // il keepAlive lo rileva e ritrasmette l'ultima posizione nota.
    if (!navigator.geolocation) {
        showToast('GPS non disponibile', 'Attiva la localizzazione nelle impostazioni', 'error');
        aggiornaUIGPS('error');
        return;
    }

    gpsWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
            const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
            const now = Date.now();
            const distanzaOk = !gpsLastLat || haversineM(lat, lng, gpsLastLat, gpsLastLng) > 50;
            const tempoOk    = !gpsLastUpdate || (now - gpsLastUpdate.getTime()) >= GPS_INTERVAL_MS;
            if (distanzaOk || tempoOk) await inviaGPSFirebase(lat, lng, acc);
            currentLat = lat;
            currentLng = lng;
        },
        (err) => {
            if (err.code === 1) {
                aggiornaUIGPS('error');
                showToast('GPS negato', 'Abilita la posizione nelle impostazioni', 'error');
                fermaGPSTracking();
            }
        },
        { enableHighAccuracy: true, timeout: GPS_TIMEOUT_MS, maximumAge: GPS_MAX_AGE_MS }
    );

    // keepAlive: rileva se watchPosition è stato sospeso (gap >25s)
    // e ritrasmette l'ultima posizione nota per mantenere il segnale
    gpsKeepAliveId = setInterval(async () => {
        if (gpsLastLat && gpsLastLng) {
            const secsOld = gpsLastUpdate ? (Date.now() - gpsLastUpdate.getTime()) / 1000 : 999;
            if (secsOld > 25) {
                await inviaGPSFirebase(gpsLastLat, gpsLastLng, gpsLastAcc);
                aggiornaUIGPS('bg');
            }
        } else {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await inviaGPSFirebase(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
                    currentLat = pos.coords.latitude; currentLng = pos.coords.longitude;
                },
                () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
            );
        }
    }, 25000);

    // Page Visibility: riattiva watchPosition se il browser lo aveva sospeso
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentDriver && gpsWatchId === null) {
            avviaGPSTracking();
        }
        if (document.visibilityState === 'visible') aggiornaUIGPS('ok');
    });
}

async function fermaGPSTracking() {
    // Ferma plugin nativo se attivo
    const cap = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IbsLocation;
    if (cap) {
        try { await cap.stopTracking(); } catch(e) {}
        try { cap.removeAllListeners(); } catch(e) {}
    }
    // Ferma watchPosition browser
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
    if (gpsKeepAliveId !== null) {
        clearInterval(gpsKeepAliveId);
        gpsKeepAliveId = null;
    }
}

// Haversine: distanza in metri tra due coordinate
function haversineM(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ====== NAVIGAZIONE CAMION ======
let currentLat = null, currentLng = null;


// Parametri fissi mezzo pesante 40t
const MEZZO = {
    weight: 40000,      // kg
    weightPerAxle: 11500, // kg
    height: 380,        // cm (3.8m)
    length: 1650,       // cm (16.50m)
    width: 255,         // cm (2.55m)
};

function avviaNavi() {
    // Costruisce il deep link Eurowag con il percorso pre-calcolato dal DSP
    // Se la missione ha tappe, le passa come waypoint sequenziali
    // in modo che Eurowag segua esattamente il percorso pianificato

    var dest = (document.getElementById('navDest') || {}).value || '';

    // Raccoglie waypoint dal percorso DSP (tappe della missione)
    var waypoints = [];
    if (missioneCorrente) {
        var tappe = missioneCorrente.tappe || missioneCorrente.waypoints || missioneCorrente.fermate;
        if (tappe && Array.isArray(tappe) && tappe.length) {
            // Usa indirizzi delle tappe come waypoint sequenziali
            tappe.forEach(function(t) {
                var addr = t.indirizzo || t.address || t.label || '';
                if (addr) waypoints.push(addr);
            });
        }
    }

    // Se non ci sono tappe, usa from → to della missione come waypoint
    if (!waypoints.length && missioneCorrente) {
        if (missioneCorrente.from) waypoints.push(missioneCorrente.from);
        if (missioneCorrente.to)   waypoints.push(missioneCorrente.to);
    }

    // Fallback: usa il campo destinazione manuale
    if (!waypoints.length && dest) {
        waypoints.push(dest);
    }

    if (!waypoints.length) {
        // Apri Eurowag senza destinazione
        tentaDeepLink('eurowagnavi://', 'https://www.eurowag.com/it/navigazione', 'Eurowag Navi');
        return;
    }

    // Deep link Eurowag con waypoint multipli
    // Formato: eurowagnavi://navigate?destination=...&waypoint[0]=...&waypoint[1]=...
    var url = 'eurowagnavi://navigate?destination=' + encodeURIComponent(waypoints[waypoints.length - 1])
        + '&vehicleType=truck'
        + '&weight='  + MEZZO.weight
        + '&height='  + MEZZO.height
        + '&length='  + MEZZO.length
        + '&width='   + MEZZO.width;

    // Aggiungi waypoint intermedi (tutto tranne ultimo che è la destinazione)
    for (var i = 0; i < waypoints.length - 1; i++) {
        url += '&waypoint[' + i + ']=' + encodeURIComponent(waypoints[i]);
    }

    // Aggiungi posizione corrente come punto di partenza se disponibile
    if (currentLat && currentLng) {
        url += '&from=' + currentLat + ',' + currentLng;
    }

    tentaDeepLink(url, 'https://www.eurowag.com/it/navigazione', 'Eurowag Navi');
}

function tentaDeepLink(deepUrl, fallbackUrl, appName) {
    // Tenta deep link nativo; dopo 2s se l'app non risponde apre il fallback
    try {
        window.location.href = deepUrl;
        setTimeout(function() { window.open(fallbackUrl, '_blank'); }, 2500);
    } catch(e) {
        window.open(fallbackUrl, '_blank');
    }
}

// ====== UPLOAD ====== (rimosso - documenti ora integrati nel viaggio)

// ====== MODAL ======
function chiudiModal(id) { document.getElementById(id).classList.remove('active'); }
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); }));
});

// ====== TOAST ======
function showToast(title, msg, type = '') {
    const icons = {
        success: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
        error:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info:    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `${icons[type]||icons.info}<div class="toast-body"><div class="toast-title">${title}</div>${msg?`<div class="toast-msg">${msg}</div>`:''}</div>`;
    document.getElementById('toastContainer').appendChild(t);
    setTimeout(() => t.remove(), 3500);
}
