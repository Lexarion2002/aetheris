// --- ETAT DU SYSTEME ---
const SAVE_KEY = 'aetheris_save';
const BACKUP_KEYS = ['aetheris_save_backup1', 'aetheris_save_backup2', 'aetheris_save_backup3'];
let toastTimeout = null;

const baseState = () => ({
    xp: 0,
    level: 1,
    gold: 0,
    streak: 0,
    avatar: null,
    stats: {},
    habits: [],
    objectives: [],
    activeQuests: [],
    rewards: [],
    inventory: [],
    completedLog: [],
    lastSavedAt: null
});

let gameState = Object.assign(baseState(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}"));

// --- SUPABASE ---
const SUPABASE_URL = 'https://fcrgbvimgiesbpwcvtst.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GzMRB95ihAyQ8j_23h3Y-Q_1ol8BQ13';
const supabaseClient = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;
let currentUser = null;
let cloudLastUpdated = null;
let pendingCloudSave = false;

// --- TOAST ---
function showToast(message){
    const toast = document.getElementById('toast');
    if(!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 1600);
}

// --- SAUVEGARDE ---
window.save = function(options){
    const opts = options || {};
    const silent = !!opts.silent;
    const skipBackup = !!opts.skipBackup;
    const skipCloud = !!opts.skipCloud;
    const triggerCloud = opts.triggerCloud !== false;

    if(!skipBackup){
        const existing = localStorage.getItem(SAVE_KEY);
        if(existing){
            for(let i = BACKUP_KEYS.length - 1; i > 0; i--){
                const prev = localStorage.getItem(BACKUP_KEYS[i-1]);
                if(prev !== null) localStorage.setItem(BACKUP_KEYS[i], prev);
            }
            localStorage.setItem(BACKUP_KEYS[0], existing);
        }
    }

    gameState.lastSavedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    // Sauvegarde auto dans un slot dédié pour chargement manuel
    localStorage.setItem('aetheris_slot_auto', JSON.stringify(gameState));
    if(silent){
        updateStatusBars();
    } else {
        render();
    }
    if(triggerCloud && !skipCloud) queueCloudSave();
    if(!opts.skipToast) showToast('Sauvegardé');
};

// --- MOTEUR DE MODALE ---
window.openModal = function(config) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = config.title;
    document.getElementById('modal-desc').innerText = config.desc || "";
    const input = document.getElementById('modal-input-text');
    input.style.display = config.hasInput ? "block" : "none";
    input.value = "";
    const extra = document.getElementById('modal-extra-fields');
    extra.innerHTML = "";
    if(config.selectOptions) {
        const label = document.createElement('label');
        label.innerText = config.selectOptions.label || "Choisir";
        label.className = 'modal-label';
        const select = document.createElement('select');
        select.id = config.selectOptions.id || 'modal-select';
        (config.selectOptions.options || []).forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.innerText = opt.label;
            select.appendChild(option);
        });
        extra.appendChild(label);
        extra.appendChild(select);
    }
    if(config.numberField){
        const labelNum = document.createElement('label');
        labelNum.innerText = config.numberField.label || "Quantité";
        labelNum.className = 'modal-label';
        const inputNum = document.createElement('input');
        inputNum.type = 'number';
        inputNum.id = config.numberField.id || 'modal-number';
        inputNum.min = config.numberField.min || 1;
        inputNum.value = config.numberField.defaultValue || 1;
        extra.appendChild(labelNum);
        extra.appendChild(inputNum);
    }
    if(config.extraFields && Array.isArray(config.extraFields)){
        config.extraFields.forEach(f => {
            const lbl = document.createElement('label');
            lbl.innerText = f.label || f.id;
            lbl.className = 'modal-label';
            const inputExtra = document.createElement(f.type === 'select' ? 'select' : 'input');
            inputExtra.id = f.id;
            if(f.type === 'select' && Array.isArray(f.options)){
                f.options.forEach(opt => {
                    const o = document.createElement('option');
                    o.value = opt.value;
                    o.innerText = opt.label;
                    inputExtra.appendChild(o);
                });
            } else {
                inputExtra.type = f.type || 'text';
                if(f.type === 'date') inputExtra.placeholder = 'Échéance';
            }
            extra.appendChild(lbl);
            extra.appendChild(inputExtra);
        });
    }
    modal.style.display = 'flex';
    document.getElementById('modal-confirm').onclick = () => {
        const selectVal = config.selectOptions ? document.getElementById(config.selectOptions.id || 'modal-select').value : null;
        const numberVal = config.numberField ? Number(document.getElementById(config.numberField.id || 'modal-number').value) : null;
        const extraVals = {};
        if(config.extraFields){
            config.extraFields.forEach(f => {
                const el = document.getElementById(f.id);
                if(el) extraVals[f.id] = el.type === 'number' ? Number(el.value) : el.value;
            });
        }
        if(config.onConfirm) config.onConfirm(input.value, { select: selectVal, number: numberVal, fields: extraVals });
        modal.style.display = 'none';
    };
    document.getElementById('modal-cancel').onclick = () => modal.style.display = 'none';
};

// --- RENDU ---
function render() {
    document.getElementById('level-value').innerText = gameState.level;
    document.getElementById('gold-value').innerText = Math.floor(gameState.gold);
    document.getElementById('streak-value').innerText = gameState.streak || 0;
    document.getElementById('avatar-img').src = gameState.avatar || "https://via.placeholder.com/100?text=+";

    const xpNeeded = gameState.level * 100;
    document.getElementById('xp-fill').style.width = (gameState.xp / xpNeeded * 100) + "%";
    document.getElementById('xp-display-text').innerText = `${Math.floor(gameState.xp)} / ${xpNeeded} XP`;

    const statsEntries = Object.entries(gameState.stats || {});
    document.getElementById('active-stats-tags').innerHTML = statsEntries.length
        ? statsEntries.map(([k, v]) => {
            const safeKey = k.replace(/'/g, "\\'");
            return `<span class="tag-pill stat-pill"><strong>${k}</strong>${v}<span class="tag-delete" onclick="window.deleteStat('${safeKey}'); event.stopPropagation();">×</span></span>`;
        }).join('')
        : `<div class="tag-placeholder">Aucun attribut pour le moment</div>`;

    document.getElementById('hierarchy-container').innerHTML = gameState.objectives.map((obj, oI) => {
        const totalQuests = obj.totalQuests || obj.missions.reduce((sum, m) => sum + (m.quests?.length || 0), 0);
        const completedQuests = obj.completedQuests || 0;
        const p = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
        const expanded = obj.expanded !== false;
        const missionStatus = obj.missions.map(m => {
            const total = m.quests?.length || 0;
            const done = (m.quests || []).filter(q => q.completed || (q.progress||0) >= (q.target||1)).length;
            return {total, done};
        });
        return `<div class="glass-card" style="border-left: 2px solid var(--blue); padding: 10px;">
            <div class="objective-header" onclick="window.toggleObjective(${oI})">
                <div class="objective-title"><span class="objective-caret ${expanded?'open':'closed'}"></span><strong>${obj.title}</strong></div>
                <div class="objective-actions"><button onclick="event.stopPropagation(); window.changeObjectiveAttr(${oI})" class="objective-attr objective-attr-btn">${obj.attr || 'Choisir'}</button><span onclick="event.stopPropagation(); window.delObj(${oI})" class="objective-delete">X</span></div>
            </div>
            <div class="objective-progress-row">
                <div class="progress-bg-mini" style="margin:8px 0"><div style="width:${p}%; height:100%; background:var(--blue)"></div></div>
                <button onclick="event.stopPropagation(); window.addMission(${oI})" class="btn-util">+ MISSION</button>
            </div>
            <div class="objective-body ${expanded ? 'open' : 'closed'}">
                ${obj.missions.map((m, mI) => {
                    const total = m.quests?.length || 0;
                    const done = (m.quests || []).filter(q => q.completed || (q.progress||0) >= (q.target||1)).length;
                    const statusText = total > 0 && done === total ? 'Complet' : done > 0 ? 'En cours' : 'En attente';
                    const statusClass = done === total && total>0 ? 'status-done' : done>0 ? 'status-active' : 'status-pending';
                    return `
                    <div class="mission-block">
                        <div class="mission-header">
                            <div class="mission-title"><span class="mission-label">MISSION</span><span class="mission-name">${m.title}</span></div>
                            <span class="mission-status ${statusClass}">${statusText}</span>
                            <span class="mission-delete" onclick="window.delMis(${oI},${mI})">X</span>
                        </div>
                        <button onclick="window.addQuest(${oI},${mI})" class="btn-util mission-add-action">+ ACTION</button>
                    ${m.quests.map((q, qI) => {
                        const target = q.target || 1;
                        const progress = q.progress || 0;
                        const btn = progress >= target ? "OK" : "GO";
                        const isDone = progress >= target || q.completed;
                        const overdue = q.dueDate ? new Date(q.dueDate).getTime() < Date.now() && !isDone : false;
                        const statusText = isDone ? 'Complet' : overdue ? 'En retard' : 'En cours';
                        const statusClass = isDone ? 'status-done' : overdue ? 'status-overdue' : 'status-active';
                        return `<div class="action-row">
                            <div class="action-text">
                                <div class="action-title">${q.title} <span class="action-progress">(${progress}/${target})</span></div>
                                <div class="action-meta">${obj.title} → ${m.title}${q.priority ? ' · ' + q.priority.toUpperCase() : ''}${q.dueDate ? ' · ' + q.dueDate : ''}</div>
                                <span class="action-status ${statusClass}">${statusText}</span>
                            </div>
                            <div class="action-cta-group">
                                <button onclick="window.go(${oI},${mI},${qI})" class="btn-primary action-go">${btn}</button>
                                <span class="action-delete" onclick="window.deleteQuest(${oI},${mI},${qI}); event.stopPropagation();">×</span>
                            </div>
                        </div>`;
                    }).join('')}
                    ${!m.quests.length ? `<div class="tag-placeholder" style="margin-top:6px;">Aucune action</div>` : ''}
                    </div>`;
                }).join('')}
                ${!obj.missions.length ? `<div class="tag-placeholder" style="margin-top:6px;">Aucune mission</div>` : ''}
            </div>
        </div>`;
    }).join('');

    const now = Date.now();
    const activeFiltered = filterActiveQuests(gameState.activeQuests, now);
    document.getElementById('active-quests-list').innerHTML = activeFiltered.length ? activeFiltered.map((q, i) => {
        const missionLabel = q.missionTitle 
            || (q.pIdx!==undefined && q.mIdx!==undefined ? gameState.objectives[q.pIdx]?.missions?.[q.mIdx]?.title : null)
            || "Mission";
        const objectiveLabel = q.objectiveTitle || (q.pIdx!==undefined ? (gameState.objectives[q.pIdx]?.title || "Objectif") : "Objectif");
        const target = q.target || 1;
        const progress = q.progress || 0;
        const isDone = progress >= target || q.completed;
        const overdue = !!q.dueDate && !isDone && new Date(q.dueDate).getTime() < now;
        const statusText = isDone ? 'Complet' : overdue ? 'En retard' : 'En cours';
        const statusClass = isDone ? 'status-done' : overdue ? 'status-overdue' : 'status-active';
        const btnLabel = progress < target ? "VALIDER +1" : "OK";
        return `<div class="glass-card active-quest-card">
            <div>
                <div class="active-quest-title">${q.title}</div>
                <div class="active-quest-meta">${missionLabel} / ${objectiveLabel} - ${progress}/${target}</div>
                <div class="active-quest-status ${statusClass}">${statusText}${q.priority ? ' · ' + q.priority.toUpperCase() : ''}${q.dueDate ? ' · ' + q.dueDate : ''}</div>
            </div>
            <button onclick="window.done(${i})" class="btn-primary active-quest-cta">${btnLabel}</button>
        </div>`;
    }).join('') : `<div class="tag-placeholder">Aucune action active</div>`;

    document.getElementById('habit-list').innerHTML = gameState.habits.map((h, i) => `
        <div class="glass-card habit-card ${h.type==='good' ? 'habit-good' : 'habit-bad'}">
            <div class="habit-info">
                <div class="habit-header">
                    <span class="habit-title">${h.title}</span>
                    <span class="habit-delete" onclick="window.deleteHabit(${i}); event.stopPropagation();">×</span>
                </div>
                <span class="habit-tag ${h.type==='good' ? 'tag-good' : 'tag-bad'}">${h.type==='good' ? 'Positive' : 'Négative'}</span>
            </div>
            <button onclick="window.track(${i})" class="btn-habit ${h.type==='good' ? 'btn-habit-good' : 'btn-habit-bad'}">${h.type==='good'?'+' : '-'}</button>
        </div>`).join('');

    document.getElementById('reward-list').innerHTML = gameState.rewards.map((r, i) => `
        <div class="glass-card" style="display:flex; justify-content:space-between; font-size:0.7rem">
            <span>${r.name} (${r.cost} SY)</span><button onclick="window.buy(${i})" class="btn-gold">BUY</button>
        </div>`).join('');

    document.getElementById('inventory-list').innerHTML = gameState.inventory.length
        ? gameState.inventory.map(item => `
            <div class="glass-card" style="display:flex; justify-content:space-between; font-size:0.7rem">
                <span>${item.name}</span><span>x${item.qty}</span>
            </div>
        `).join('')
        : `<div class="tag-placeholder">Aucun item achete</div>`;

    updateStatusBars();
    updateRadarChart();
    updateAnalytics();
}

// --- CHART ---
let radarChartInstance = null;
function updateRadarChart() {
    const ctx = document.getElementById('radarChart');
    if(!ctx) return;

    const labels = Object.keys(gameState.stats || {});
    const data = labels.map(k => Number(gameState.stats[k]) || 0);
    const hasData = labels.length > 0;
    const displayLabels = hasData ? labels : ['Aucun attribut'];
    const displayData = hasData ? data : [0];
    const maxVal = displayData.length ? Math.max(...displayData) : 1;

    if(radarChartInstance) radarChartInstance.destroy();

    radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Empreinte d\'attributs',
                data: displayData,
                backgroundColor: 'rgba(88, 166, 255, 0.18)',
                borderColor: 'rgba(88, 166, 255, 0.75)',
                pointBackgroundColor: '#58a6ff',
                pointHoverRadius: 5,
                borderWidth: 2,
                tension: 0.2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 350 },
            plugins: { legend: { display: false } },
            scales: {
                r: {
                    beginAtZero: true,
                    suggestedMax: Math.max(5, Math.ceil(maxVal * 1.2)),
                    ticks: { display: false },
                    grid: { color: '#1f2937' },
                    angleLines: { color: '#1f2937' },
                    pointLabels: { color: '#8b949e', font: { size: 10 } }
                }
            },
            elements: {
                line: { borderWidth: 2 },
                point: { radius: 3 }
            }
        }
    });
}

function bumpStat(key, amount) {
    if(!key) return;
    const current = Number(gameState.stats[key]) || 0;
    gameState.stats[key] = current + amount;
}

window.deleteStat = (key) => {
    if(!key || !(key in (gameState.stats || {}))) return;
    if(!confirm(`Supprimer l'attribut "${key}" ?`)) return;
    delete gameState.stats[key];
    // Délie les objectifs utilisant cet attribut
    gameState.objectives.forEach(o => { if(o.attr === key) o.attr = null; });
    window.save();
};

window.toggleObjective = (idx) => {
    const obj = gameState.objectives[idx];
    if(!obj) return;
    obj.expanded = obj.expanded === false ? true : false;
    // On re-render tout de suite pour voir le corps s'ouvrir/fermer
    render();
    window.save({silent:true, skipToast:true});
};

function updateStatusBars(){
    const last = document.getElementById('last-save-display');
    const bk = document.getElementById('backup-status');
    if(last){
        if(!gameState.lastSavedAt){
            last.innerText = "Derniere sauvegarde : --";
        } else {
            const d = new Date(gameState.lastSavedAt);
            last.innerText = "Derniere sauvegarde : " + d.toLocaleString('fr-FR', { hour12:false });
        }
    }
    if(bk){
        const count = BACKUP_KEYS.filter(k => localStorage.getItem(k)).length;
        bk.innerText = `Backup: ${count}/3`;
    }
}

function updateAnalytics(){
    const speedEl = document.getElementById('speed-metric');
    const etaEl = document.getElementById('eta-metric');
    const xpEl = document.getElementById('xp-distribution');
    const timelineEl = document.getElementById('timeline-list');

    const completed = gameState.completedLog || [];
    const durations = completed.map(e => e.durationMs).filter(Boolean);
    const avgMs = durations.length ? durations.reduce((a,b)=>a+b,0)/durations.length : 0;
    const avgMinutes = avgMs ? (avgMs/60000).toFixed(1) : "--";
    if(speedEl) speedEl.innerText = durations.length ? `${avgMinutes} min/action` : "--";

    const remaining = gameState.activeQuests.filter(q => !q.completed && (q.progress||0) < (q.target||1));
    const etaTotal = remaining.reduce((sum,q)=>{
        const est = q.estimateMinutes || (q.target||1)*5;
        const left = (q.target||1) - (q.progress||0);
        return sum + est * (left / (q.target||1));
    },0);
    if(etaEl) etaEl.innerText = remaining.length ? `${Math.round(etaTotal)} min` : "--";

    const statsEntries = Object.entries(gameState.stats || {});
    if(xpEl){
        xpEl.innerText = statsEntries.length ? statsEntries.map(([k,v]) => `${k}: ${v}`).join('  |  ') : "--";
    }

    if(timelineEl){
        timelineEl.innerHTML = completed.length ? completed.slice(0,8).map(e => {
            const mins = e.durationMs ? Math.max(1, Math.round(e.durationMs/60000)) : null;
            const dateStr = e.completedAt ? new Date(e.completedAt).toLocaleDateString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '';
            return `<div class="timeline-item">
                <div class="timeline-left">
                    <div>${e.title}</div>
                    <div class="timeline-meta">${e.objective || ''}${e.mission ? ' → ' + e.mission : ''}${mins ? ' · ' + mins + ' min' : ''}${e.type ? ' · ' + e.type : ''}</div>
                </div>
                <div class="timeline-meta">${dateStr}</div>
            </div>`;
        }).join('') : `<div class="tag-placeholder">Pas encore d'actions terminées</div>`;
    }
}

function applyLoadedState(data) {
    gameState = Object.assign(baseState(), data || {});
    gameState.stats = gameState.stats || {};
    gameState.habits = gameState.habits || [];
    gameState.objectives = gameState.objectives || [];
    gameState.activeQuests = gameState.activeQuests || [];
    gameState.rewards = gameState.rewards || [];
    gameState.inventory = gameState.inventory || [];
    window.save({silent:true, skipBackup:true, skipToast:true, skipCloud:true});
    render();
}

// --- BACKUPS ---
window.exportBackup = () => {
    const doDownload = (data, label) => {
        const blob = new Blob([JSON.stringify(data)], {type: "application/json"});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = label || 'aetheris_backup.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const tryCloud = async () => {
        if(!supabaseClient || !currentUser) return false;
        const { data, error } = await supabaseClient
            .from('saves')
            .select('data')
            .eq('user_id', currentUser.id)
            .maybeSingle();
        if(error || !data) return false;
        doDownload(data.data, 'aetheris_backup_cloud.json');
        showToast('Exporté depuis le cloud');
        return true;
    };

    tryCloud().then(ok => {
        if(ok) return;
        doDownload(gameState, 'aetheris_backup_local.json');
        showToast('Exporté (local)');
    });
};

window.importBackup = (file) => {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        try {
            const data = JSON.parse(reader.result);
            applyLoadedState(data);
            showToast('Backup importé');
        } catch (e) {
            alert("Fichier de sauvegarde invalide.");
        }
    };
    reader.readAsText(file);
};

window.restorePreviousBackup = () => {
    alert("Fonction de restauration automatique retirée. Utilise Importer pour charger un fichier.");
};

// --- CLOUD (SUPABASE) ---
function formatCloudDate(ts){
    if(!ts) return null;
    try {
        return new Date(ts).toLocaleString('fr-FR', { hour12:false });
    } catch(e){
        return ts;
    }
}

function updateCloudUI(statusOverride){
    const statusEl = document.getElementById('cloud-status');
    const saveBtn = document.getElementById('cloud-save');
    const loadBtn = document.getElementById('cloud-load');
    const loginBtn = document.getElementById('cloud-login');
    const signupBtn = document.getElementById('cloud-signup');
    const resetBtn = document.getElementById('cloud-reset');
    const logoutBtn = document.getElementById('cloud-logout');
    const emailInput = document.getElementById('cloud-email');
    const passInput = document.getElementById('cloud-password');
    const hasClient = !!supabaseClient;
    const logged = !!currentUser;
    const stamp = formatCloudDate(cloudLastUpdated);

    if(statusEl){
        if(statusOverride){
            statusEl.innerText = statusOverride;
        } else if(!hasClient){
            statusEl.innerText = "Supabase indisponible";
        } else if(logged){
            statusEl.innerText = `Connecté : ${currentUser.email || currentUser.id}${stamp ? ' | Sauvegarde : ' + stamp : ''}`;
        } else {
            statusEl.innerText = "Non connecté";
        }
    }
    if(saveBtn) saveBtn.disabled = !hasClient || !logged;
    if(loadBtn) loadBtn.disabled = !hasClient || !logged;
    if(logoutBtn) logoutBtn.disabled = !hasClient || !logged;
    if(loginBtn) loginBtn.disabled = !hasClient;
    if(signupBtn) signupBtn.disabled = !hasClient;
    if(resetBtn) resetBtn.disabled = !hasClient;

    // Masquer les champs et boutons d'inscription/connexion quand l'utilisateur est connecté
    const authControls = [emailInput, passInput, signupBtn, loginBtn, resetBtn];
    authControls.forEach(el => {
        if(!el) return;
        el.style.display = logged ? 'none' : '';
    });
    if(logoutBtn) logoutBtn.style.display = logged ? '' : 'none';
}

async function bootstrapSupabaseAuth(){
    if(!supabaseClient){
        updateCloudUI("Supabase indisponible");
        return;
    }
    const { data } = await supabaseClient.auth.getUser();
    currentUser = data?.user || null;
    await fetchCloudMeta();
    if(currentUser) await window.cloudLoad({silent:true});
    updateCloudUI();
    supabaseClient.auth.onAuthStateChange(async (_event, session) => {
        currentUser = session?.user || null;
        await fetchCloudMeta();
        if(currentUser) await window.cloudLoad({silent:true});
        updateCloudUI();
    });
}

function queueCloudSave(){
    if(!supabaseClient || !currentUser) return;
    if(pendingCloudSave) return;
    pendingCloudSave = true;
    setTimeout(async ()=>{
        pendingCloudSave = false;
        await window.cloudSave({silent:true});
    }, 400);
}

async function fetchCloudMeta(){
    if(!supabaseClient || !currentUser) return;
    const { data, error } = await supabaseClient
        .from('saves')
        .select('updated_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();
    if(!error && data){
        cloudLastUpdated = data.updated_at;
    }
}

window.cloudLogin = async () => {
    if(!supabaseClient){ if(!silent) alert("Supabase non charg?."); return; }
    const email = (document.getElementById('cloud-email')?.value || '').trim();
    const password = (document.getElementById('cloud-password')?.value || '').trim();
    if(!email || !password){ alert("Saisis email et mot de passe."); return; }
    updateCloudUI("Connexion en cours...");
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error){ alert("Erreur connexion : " + error.message); updateCloudUI(); return; }
    showToast('Connecté');
    updateCloudUI();
};

window.cloudLogout = async () => {
    if(!supabaseClient) return;
    await supabaseClient.auth.signOut();
    currentUser = null;
    cloudLastUpdated = null;
    gameState = baseState();
    window.save({silent:true, skipToast:true, skipCloud:true});
    render();
    updateCloudUI("Deconnecte");
    showToast('Deconnecte (donnees locales reinitialisees)');
};

window.cloudSignUp = async () => {
    if(!supabaseClient){ if(!silent) alert("Supabase non charg?."); return; }
    const email = (document.getElementById('cloud-email')?.value || '').trim();
    const password = (document.getElementById('cloud-password')?.value || '').trim();
    if(!email || !password){ alert("Saisis email et mot de passe."); return; }
    if(password.length < 6){ alert("Mot de passe : 6 caractères minimum."); return; }
    updateCloudUI("Création du compte...");
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if(error){ alert("Erreur inscription : " + error.message); updateCloudUI(); return; }
    showToast('Inscription faite. Vérifie ton email si la confirmation est requise.');
    updateCloudUI();
};

window.cloudReset = async () => {
    if(!supabaseClient){ if(!silent) alert("Supabase non charg?."); return; }
    const email = (document.getElementById('cloud-email')?.value || '').trim();
    if(!email){ alert("Saisis ton email."); return; }
    updateCloudUI("Envoi du reset...");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href
    });
    if(error){ alert("Erreur reset : " + error.message); updateCloudUI(); return; }
    showToast('Email de réinitialisation envoyé.');
    updateCloudUI("Email reset envoyé.");
};

window.cloudSave = async (opts) => {
    const options = opts || {};
    const silent = !!options.silent;
    if(!supabaseClient){ if(!silent) alert("Supabase non charg?."); return; }
    if(!currentUser){ if(!silent) alert("Connecte-toi d'abord."); return; }
    if(!silent) updateCloudUI("Sauvegarde en cours...");
    const { error } = await supabaseClient
        .from('saves')
        .upsert({
            user_id: currentUser.id,
            data: gameState,
            updated_at: new Date().toISOString()
        });
    if(error){ if(!silent) alert("Erreur sauvegarde cloud : " + error.message); updateCloudUI(); return; }
    cloudLastUpdated = new Date().toISOString();
    if(!silent) showToast('Sauvegarde cloud OK');
    updateCloudUI();
};

window.cloudLoad = async (opts) => {
    const options = opts || {};
    const silent = !!options.silent;
    if(!supabaseClient){ if(!silent) alert("Supabase non charg?."); return; }
    if(!currentUser){ if(!silent) alert("Connecte-toi d'abord."); return; }
    if(!silent) updateCloudUI("Chargement cloud...");
    const { data, error } = await supabaseClient
        .from('saves')
        .select('data, updated_at')
        .eq('user_id', currentUser.id)
        .maybeSingle();
    if(error && error.code !== 'PGRST116'){ if(!silent) alert("Erreur cloud : " + error.message); updateCloudUI(); return; }
    if(!data){ if(!silent) alert("Aucune sauvegarde cloud trouv?e."); updateCloudUI(); return; }
    cloudLastUpdated = data.updated_at;
    applyLoadedState(data.data);
    showToast('Chargé depuis le cloud');
    updateCloudUI();
};

function refreshManualSlots(){
    // Slots retir�s de l'UI.
}

window.saveSlot = () => {
    alert("Slots retir�s. Utilise Exporter/Importer ou Sauver/Charger cloud.");
};

window.loadSlot = () => {
    alert("Slots retir�s. Utilise Exporter/Importer ou Sauver/Charger cloud.");
};

// --- ACTIONS GLOBALES ---
window.addNewStat = () => { 
    window.openModal({
        title:"NOUVEL ATTRIBUT", 
        hasInput:true, 
        onConfirm:(v)=>{
            const name = (v || '').trim();
            if(name){
                gameState.stats = gameState.stats || {};
                gameState.stats[name] = gameState.stats[name] ?? 0;
                window.save();
            }
        }
    }); 
};

window.requestNewObjective = () => { 
    const statsKeys = Object.keys(gameState.stats || {});
    if(!statsKeys.length){
        window.openModal({
            title:"AJOUTE UN ATTRIBUT",
            hasInput:true,
            desc:"Ajoute un attribut avant de lier un objectif.",
            onConfirm:(attrName)=>{
                const name = (attrName || '').trim();
                if(name){
                    gameState.stats[name] = gameState.stats[name] ?? 0;
                    window.save({silent:true, skipToast:true});
                    setTimeout(() => window.requestNewObjective(), 0);
                }
            }
        });
        return;
    }
    const presetTitle = (document.getElementById('obj-input').value || '').trim();
    const needsTitleInput = !presetTitle;
    window.openModal({
        title:"OBJECTIF", 
        hasInput: needsTitleInput, 
        desc:"Relie cet objectif a l'attribut qui doit monter.",
        selectOptions: {
            label: "Attribue a",
            options: statsKeys.map(k => ({value:k, label:k}))
        },
        onConfirm:(titleVal, extra)=>{
            const attrKey = extra?.select;
            const title = needsTitleInput ? (titleVal || '').trim() : presetTitle;
            if(title && attrKey){
                gameState.objectives.push({title, attr: attrKey, missions:[], totalQuests:0, completedQuests:0, expanded:true});
                document.getElementById('obj-input').value="";
                window.save();
            }
        }
    }); 
};

window.changeObjectiveAttr = (oIdx) => {
    const obj = gameState.objectives[oIdx];
    if(!obj) return;
    const statsKeys = Object.keys(gameState.stats || {});
    if(!statsKeys.length){
        alert("Ajoute un attribut avant de changer l'objectif.");
        return;
    }
    window.openModal({
        title:"CHANGER L'ATTRIBUT",
        desc:"Sélectionne l'attribut qui sera monté par cet objectif.",
        selectOptions:{
            id:'objective-attr-select',
            label:'Attribue à',
            options: statsKeys.map(k => ({value:k, label:k}))
        },
        onConfirm:(_, extra)=>{
            const attrKey = extra?.select;
            if(!attrKey) return;
            obj.attr = attrKey;
            window.save();
        }
    });
    const select = document.getElementById('objective-attr-select');
    if(select && obj.attr) select.value = obj.attr;
};

window.addMission = (oIdx) => {
    window.openModal({
        title:"MISSION",
        hasInput:true,
        onConfirm:(val)=>{
            const title = (val || '').trim();
            if(!title) return;
            const obj = gameState.objectives[oIdx];
            if(!obj) return;
            obj.missions = obj.missions || [];
            obj.missions.push({title, quests:[]});
            window.save();
        }
    });
};

window.addQuest = (oIdx, mIdx) => {
    window.openModal({
        title:"ACTION",
        hasInput:true,
        numberField:{ label:"Quantité cible", id:"quest-target", min:1, defaultValue:1 },
        extraFields:[
            { id:'quest-priority', label:'Priorité', type:'select', options:[
                {value:'high', label:'Haute'},
                {value:'normal', label:'Normale'},
                {value:'low', label:'Basse'}
            ]},
            { id:'quest-due', label:'Échéance', type:'date' },
            { id:'quest-eta', label:'Temps estimé (min)', type:'number' }
        ],
        onConfirm:(val, extra)=>{
            const title = (val || '').trim();
            const target = Math.max(1, Number(extra?.number || 1));
            const priority = extra?.fields?.['quest-priority'] || 'normal';
            const dueDate = extra?.fields?.['quest-due'] || null;
            const estimate = Math.max(0, Number(extra?.fields?.['quest-eta'] || 0));
            const obj = gameState.objectives[oIdx];
            const mission = obj?.missions?.[mIdx];
            if(!title || !mission) return;
            const quest = {title, target, progress:0, completed:false, priority, dueDate, estimateMinutes: estimate, createdAt: Date.now(), completedAt:null};
            mission.quests = mission.quests || [];
            mission.quests.push(quest);
            obj.totalQuests = (obj.totalQuests || 0) + 1;
            gameState.activeQuests.push({
                title,
                target,
                progress:0,
                pIdx:oIdx,
                mIdx,
                qIdx: mission.quests.length - 1,
                missionTitle: mission.title,
                objectiveTitle: obj.title,
                completed:false,
                priority,
                dueDate,
                estimateMinutes: estimate,
                createdAt: quest.createdAt,
                completedAt: null
            });
            window.save();
        }
    });
};

window.delObj = (idx) => {
    if(!confirm('Supprimer cet objectif ?')) return;
    gameState.objectives.splice(idx,1);
    gameState.activeQuests = gameState.activeQuests.filter(q => q.pIdx !== idx);
    window.save();
};

window.delMis = (oIdx, mIdx) => {
    if(!confirm('Supprimer cette mission ?')) return;
    const obj = gameState.objectives[oIdx];
    if(!obj) return;
    obj.missions.splice(mIdx,1);
    obj.totalQuests = obj.missions.reduce((sum,m)=>sum+(m.quests?.length||0),0);
    obj.completedQuests = Math.min(obj.completedQuests || 0, obj.totalQuests);
    gameState.activeQuests = gameState.activeQuests.filter(q => !(q.pIdx===oIdx && q.mIdx===mIdx));
    window.save();
};

function addTimelineEntry(entry){
    gameState.completedLog = gameState.completedLog || [];
    gameState.completedLog.unshift(entry);
    if(gameState.completedLog.length > 15) gameState.completedLog.length = 15;
}

function rewardProgress(obj, quest, increment){
    const xpBefore = gameState.xp;
    const goldBefore = gameState.gold;

    const perStep = Math.max(1, Math.round(10 / (quest.target || 1)));
    gameState.xp += perStep;
    gameState.gold += perStep * 0.6;
    bumpStat(obj.attr, perStep * 0.2);
    if(quest.progress >= quest.target && !quest.completed){
        quest.completed = true;
        obj.completedQuests = (obj.completedQuests || 0) + 1;
        gameState.xp += 10;
        gameState.gold += 5;
    }

    return {
        xp: gameState.xp - xpBefore,
        gold: gameState.gold - goldBefore
    };
}

function incrementQuestProgress(oIdx, mIdx, qIdx, activeIdx){
    const obj = gameState.objectives[oIdx];
    const mission = obj?.missions?.[mIdx];
    const quest = mission?.quests?.[qIdx];
    let active = activeIdx !== undefined && activeIdx !== null 
        ? gameState.activeQuests[activeIdx] 
        : gameState.activeQuests.find(a => a.pIdx===oIdx && a.mIdx===mIdx && a.qIdx===qIdx);

    // Si la carte active n'existe pas encore, on la crée à la volée pour l'afficher dans "Front actif"
    if(!active && quest){
        active = {
            title: quest.title,
            target: quest.target || 1,
            progress: quest.progress || 0,
            pIdx: oIdx,
            mIdx: mIdx,
            qIdx: qIdx,
            missionTitle: mission?.title,
            objectiveTitle: obj?.title,
            completed: !!quest.completed
        };
        gameState.activeQuests.push(active);
    }

    // Si on n'a ni quest ni active, rien à faire
    if(!quest && !active) return;

    const target = quest?.target || active?.target || 1;
    const current = quest?.progress ?? active?.progress ?? 0;
    const next = Math.min(target, current + 1);

    if(quest) quest.progress = next;
    if(active){
        active.progress = next;
        active.target = target;
    }

    if(obj && quest){
        const wasCompleted = !!quest.completed;
        const delta = rewardProgress(obj, quest, 1);
        if(quest.completed && !wasCompleted){
            quest.completedAt = quest.completedAt || Date.now();
            if(active) active.completedAt = quest.completedAt;
            if(active) active.completed = true;
            gameState.activeQuests = gameState.activeQuests.filter((a, idx) => idx !== activeIdx && !(a.pIdx===oIdx && a.mIdx===mIdx && a.qIdx===qIdx));

            const durationMs = (quest.completedAt || Date.now()) - (quest.createdAt || Date.now());
            addTimelineEntry({
                title: quest.title,
                mission: mission?.title,
                objective: obj?.title,
                durationMs,
                steps: target,
                xpGain: delta?.xp || 0,
                goldGain: delta?.gold || 0,
                completedAt: quest.completedAt
            });

            // Bonus de mission si toutes les actions sont complètes
            const missionDone = mission?.quests?.every(q => (q.completed || (q.progress||0) >= (q.target||1))) && (mission?.quests?.length || 0) > 0;
            if(missionDone && !mission.completed){
                mission.completed = true;
                const questCount = mission.quests.length;
                const bonusXp = Math.max(20, questCount * 10);
                const bonusGold = Math.max(10, questCount * 5);
                gameState.xp += bonusXp;
                gameState.gold += bonusGold;
                bumpStat(obj.attr, questCount * 0.5);
                addTimelineEntry({
                    title: mission.title,
                    mission: mission.title,
                    objective: obj?.title,
                    type: 'mission',
                    xpGain: bonusXp,
                    goldGain: bonusGold,
                    completedAt: Date.now()
                });
            }

            // Bonus d'objectif si toutes les missions sont complètes
            const objHasMissions = (obj?.missions?.length || 0) > 0;
            const objectiveDone = objHasMissions && obj.missions.every(m => m.completed || ((m.quests||[]).every(q => (q.completed || (q.progress||0) >= (q.target||1))) && (m.quests||[]).length>0));
            if(objectiveDone && !obj.completed){
                obj.completed = true;
                const missionCount = obj.missions.length;
                const bonusXp = Math.max(50, missionCount * 25);
                const bonusGold = Math.max(25, missionCount * 12);
                gameState.xp += bonusXp;
                gameState.gold += bonusGold;
                bumpStat(obj.attr, missionCount * 1.2);
                addTimelineEntry({
                    title: obj.title,
                    mission: '',
                    objective: obj.title,
                    type: 'objective',
                    xpGain: bonusXp,
                    goldGain: bonusGold,
                    completedAt: Date.now()
                });
            }
        }
    } else {
        // Cas où le backup ne contient plus les indices : on récompense quand même
        const perStep = Math.max(1, Math.round(10 / target));
        gameState.xp += perStep;
        gameState.gold += perStep * 0.6;
        if(active && next >= target){
            active.completed = true;
            gameState.xp += 10;
            gameState.gold += 5;
            gameState.activeQuests = gameState.activeQuests.filter((a, idx) => idx !== activeIdx);
        }
    }

    window.save();
}

window.go = (oIdx, mIdx, qIdx) => {
    incrementQuestProgress(oIdx, mIdx, qIdx, null);
};

window.done = (activeIdx) => {
    const q = gameState.activeQuests[activeIdx];
    if(!q) return;
    incrementQuestProgress(q.pIdx, q.mIdx, q.qIdx, activeIdx);
};

window.deleteQuest = (oIdx, mIdx, qIdx) => {
    const obj = gameState.objectives[oIdx];
    const mission = obj?.missions?.[mIdx];
    const quest = mission?.quests?.[qIdx];
    if(!quest) return;
    if(!confirm(`Supprimer l'action "${quest.title}" ?`)) return;
    mission.quests.splice(qIdx,1);
    obj.totalQuests = obj.missions.reduce((sum,m)=>sum+(m.quests?.length||0),0);
    obj.completedQuests = Math.min(obj.completedQuests || 0, obj.totalQuests);
    gameState.activeQuests = gameState.activeQuests.filter(q => !(q.pIdx===oIdx && q.mIdx===mIdx && q.qIdx===qIdx));
    window.save();
};

// --- HABITS ---
window.addHabit = () => {
    const input = document.getElementById('habit-input');
    const type = document.getElementById('habit-type').value || 'good';
    const title = (input.value || '').trim();
    if(!title) return;
    gameState.habits.push({title, type});
    input.value = "";
    window.save();
};

window.deleteHabit = (idx) => {
    const h = gameState.habits[idx];
    if(!h) return;
    if(!confirm(`Supprimer l'habitude "${h.title}" ?`)) return;
    gameState.habits.splice(idx,1);
    window.save();
};

window.track = (idx) => {
    const h = gameState.habits[idx];
    if(!h) return;
    const good = h.type === 'good';
    const baseXp = good ? 8 : -6; // habitude : inférieur à une action, mais impact visible
    const baseGold = good ? 4 : 0;
    gameState.xp = Math.max(0, gameState.xp + baseXp);
    gameState.gold = Math.max(0, gameState.gold + baseGold);
    bumpStat(good ? 'Discipline' : 'Contrôle', good ? 0.5 : -0.3);
    addTimelineEntry({
        title: h.title,
        objective: 'Rituel',
        mission: good ? 'Habitude positive' : 'Habitude négative',
        type: 'habitude',
        xpGain: baseXp,
        goldGain: baseGold,
        completedAt: Date.now()
    });
    window.save();
};

// --- REWARDS ---
window.addReward = () => {
    const name = (document.getElementById('reward-name').value || '').trim();
    const cost = Number(document.getElementById('reward-cost').value || 0);
    if(!name || cost <= 0) return;
    gameState.rewards.push({name, cost});
    document.getElementById('reward-name').value = "";
    document.getElementById('reward-cost').value = "";
    window.save();
};

window.buy = (idx) => {
    const r = gameState.rewards[idx];
    if(!r) return;
    if(gameState.gold < r.cost){
        alert("Pas assez d'or.");
        return;
    }
    gameState.gold -= r.cost;
    const existing = gameState.inventory.find(it => it.name === r.name);
    if(existing) existing.qty += 1;
    else gameState.inventory.push({name:r.name, qty:1});
    window.save();
};

// --- AVATAR / RESET ---
window.resetSystem = () => {
    if(!confirm("Supprimer toutes les données ?")) return;
    localStorage.removeItem(SAVE_KEY);
    BACKUP_KEYS.forEach(k => localStorage.removeItem(k));
    gameState = baseState();
    render();
    showToast('Réinitialisé');
};

window.copyBackup = async () => {
    if(!navigator.clipboard){ alert('Clipboard non disponible'); return; }
    await navigator.clipboard.writeText(JSON.stringify(gameState));
    showToast('Backup copié');
};

window.pasteBackup = async () => {
    if(!navigator.clipboard){ alert('Clipboard non disponible'); return; }
    try {
        const text = await navigator.clipboard.readText();
        const data = JSON.parse(text);
        applyLoadedState(data);
        showToast('Backup importé');
    } catch (e) {
        alert('Clipboard invalide');
    }
};

// --- CHARGEMENT ---
function filterActiveQuests(list, now){
    const filterVal = window.activeFilter || 'all';
    const sortVal = window.activeSort || 'none';

    let result = [...list];
    if(filterVal === 'active'){
        result = result.filter(q => !(q.completed || (q.progress||0) >= (q.target||1)));
    } else if(filterVal === 'done'){
        result = result.filter(q => q.completed || (q.progress||0) >= (q.target||1));
    } else if(filterVal === 'overdue'){
        result = result.filter(q => !q.completed && (q.progress||0) < (q.target||1) && q.dueDate && new Date(q.dueDate).getTime() < now);
    }

    if(sortVal === 'due'){
        result.sort((a,b)=>{
            const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
            const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
            return da - db;
        });
    } else if(sortVal === 'priority'){
        const score = {high:0, normal:1, low:2};
        result.sort((a,b)=>{
            return (score[a.priority] ?? 3) - (score[b.priority] ?? 3);
        });
    }
    return result;
}

window.setActiveFilter = (val) => { window.activeFilter = val; render(); };
window.setActiveSort = (val) => { window.activeSort = val; render(); };

window.onload = () => {
    const avatarUpload = document.getElementById('avatar-upload');
    if(avatarUpload){
        avatarUpload.onchange = (e) => {
            const file = e.target.files[0];
            if(!file) return;
            const reader = new FileReader();
            reader.onload = () => { gameState.avatar = reader.result; window.save(); };
            reader.readAsDataURL(file);
        };
    }

    const exportBtn = document.getElementById('export-backup');
    const importBtn = document.getElementById('import-backup');
    const importFile = document.getElementById('import-backup-file');
    const copyBtn = document.getElementById('copy-backup');
    const pasteBtn = document.getElementById('paste-backup');
    const restoreBtn = document.getElementById('restore-backup');
    const saveSlotBtn = document.getElementById('save-slot');
    const loadSlotBtn = document.getElementById('load-slot');
    const resetBtn = document.getElementById('reset-system-trigger');
    const addRewardBtn = document.getElementById('add-reward-btn');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const cloudLoginBtn = document.getElementById('cloud-login');
    const cloudSignupBtn = document.getElementById('cloud-signup');
    const cloudResetBtn = document.getElementById('cloud-reset');
    const cloudLogoutBtn = document.getElementById('cloud-logout');
    const cloudSaveBtn = document.getElementById('cloud-save');
    const cloudLoadBtn = document.getElementById('cloud-load');

    if(exportBtn) exportBtn.onclick = () => window.exportBackup();
    if(importBtn) importBtn.onclick = () => importFile?.click();
    if(importFile) importFile.onchange = (e) => window.importBackup(e.target.files[0]);
    if(copyBtn) copyBtn.onclick = () => window.copyBackup();
    if(pasteBtn) pasteBtn.onclick = () => window.pasteBackup();
    if(restoreBtn) restoreBtn.onclick = () => window.restorePreviousBackup();
    if(saveSlotBtn) saveSlotBtn.onclick = () => window.saveSlot();
    if(loadSlotBtn) loadSlotBtn.onclick = () => window.loadSlot();
    if(resetBtn) resetBtn.onclick = () => window.resetSystem();
    if(addRewardBtn) addRewardBtn.onclick = () => window.addReward();
    if(toggleSidebarBtn) toggleSidebarBtn.onclick = () => {
        document.body.classList.toggle('sidebar-collapsed');
    };
    if(cloudLoginBtn) cloudLoginBtn.onclick = () => window.cloudLogin();
    if(cloudSignupBtn) cloudSignupBtn.onclick = () => window.cloudSignUp();
    if(cloudResetBtn) cloudResetBtn.onclick = () => window.cloudReset();
    if(cloudLogoutBtn) cloudLogoutBtn.onclick = () => window.cloudLogout();
    if(cloudSaveBtn) cloudSaveBtn.onclick = () => window.cloudSave();
    if(cloudLoadBtn) cloudLoadBtn.onclick = () => window.cloudLoad();

    const filterSel = document.getElementById('active-filter');
    const sortSel = document.getElementById('active-sort');
    if(filterSel) filterSel.onchange = (e) => window.setActiveFilter(e.target.value);
    if(sortSel) sortSel.onchange = (e) => window.setActiveSort(e.target.value);

    updateCloudUI();
    bootstrapSupabaseAuth();
    refreshManualSlots();
    setInterval(() => window.save({silent:true, skipToast:true, skipBackup:true, triggerCloud:true}), 60000);
    render();
};
