/* ============================================================
 * boneCV Pro — master.js
 * Logjikë e përbashkët për të gjitha modulet.
 * State i unifikuar përmes LocalStorage.
 * ============================================================ */
(function (global) {
    'use strict';

    const ARCHIVE_KEY = 'boneCV_Archive';
    const SETTINGS_KEY = 'boneCV_Settings';
    const EDIT_KEY = 'boneCV_EditItem';

    /* ---------- Settings ---------- */
    const defaultSettings = {
        name: 'Përdorues',
        profession: 'Profesionist',
        photo: '',
        lang: 'sq',
        theme: 'dark',        // 'dark' | 'light' | 'auto'
        accent: '#2563eb',
        textScale: 'md',      // 'sm' | 'md' | 'lg' | 'xl'
        reduceMotion: false,
        highContrast: false
    };

    function getSettings() {
        try {
            const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            return Object.assign({}, defaultSettings, s);
        } catch (e) {
            return Object.assign({}, defaultSettings);
        }
    }

    function setSettings(patch) {
        const next = Object.assign(getSettings(), patch || {});
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
        document.dispatchEvent(new CustomEvent('bonecv:settings', { detail: next }));
        return next;
    }

    /* ---------- Archive ---------- */
    function getArchive() {
        try {
            return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
        } catch (e) {
            return [];
        }
    }

    function setArchive(list) {
        localStorage.setItem(ARCHIVE_KEY, JSON.stringify(list || []));
        document.dispatchEvent(new CustomEvent('bonecv:archive', { detail: list }));
    }

    function saveToArchive(type, title, content) {
        const list = getArchive();
        const entry = {
            id: Date.now(),
            type: type,
            title: title || 'Pa titull',
            date: new Date().toISOString(),
            content: content || {}
        };
        list.unshift(entry);
        setArchive(list);
        return entry;
    }

    function updateArchiveEntry(id, patch) {
        const list = getArchive();
        const idx = list.findIndex(x => String(x.id) === String(id));
        if (idx === -1) return null;
        list[idx] = Object.assign({}, list[idx], patch, { date: new Date().toISOString() });
        setArchive(list);
        return list[idx];
    }

    function deleteArchiveEntry(id) {
        const list = getArchive().filter(x => String(x.id) !== String(id));
        setArchive(list);
    }

    function clearArchive() {
        setArchive([]);
    }

    function getArchiveStats() {
        const list = getArchive();
        return {
            total: list.length,
            cv: list.filter(x => x.type === 'CV').length,
            kontrate: list.filter(x => x.type === 'Kontratë').length,
            kerkese: list.filter(x => x.type === 'Kërkesë').length
        };
    }

    /* ---------- Edit handoff (loading documents from Arkiva to editors) ---------- */
    function setEditPayload(entry) {
        if (!entry) return localStorage.removeItem(EDIT_KEY);
        localStorage.setItem(EDIT_KEY, JSON.stringify(entry));
    }
    function consumeEditPayload(type) {
        try {
            const raw = localStorage.getItem(EDIT_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (type && obj.type !== type) return null;
            localStorage.removeItem(EDIT_KEY);
            return obj;
        } catch (e) { return null; }
    }

    /* ---------- Export / Import ---------- */
    function exportAllData() {
        const payload = {
            exportedAt: new Date().toISOString(),
            version: '1.0',
            settings: getSettings(),
            archive: getArchive()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bonecv-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function importAllData(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => {
                try {
                    const data = JSON.parse(r.result);
                    if (data.archive) setArchive(data.archive);
                    if (data.settings) setSettings(data.settings);
                    resolve(data);
                } catch (e) { reject(e); }
            };
            r.onerror = reject;
            r.readAsText(file);
        });
    }

    function clearAllData() {
        localStorage.removeItem(ARCHIVE_KEY);
        localStorage.removeItem(SETTINGS_KEY);
        localStorage.removeItem(EDIT_KEY);
        document.dispatchEvent(new CustomEvent('bonecv:reset'));
    }

    /* ---------- Formatters ---------- */
    const MONTHS_SQ = ['Janar', 'Shkurt', 'Mars', 'Prill', 'Maj', 'Qershor', 'Korrik', 'Gusht', 'Shtator', 'Tetor', 'Nëntor', 'Dhjetor'];
    const DAYS_SQ = ['E Diel', 'E Hënë', 'E Martë', 'E Mërkurë', 'E Enjte', 'E Premte', 'E Shtunë'];

    function formatDateSq(input) {
        const d = input ? new Date(input) : new Date();
        if (isNaN(d.getTime())) return '';
        return `${d.getDate()} ${MONTHS_SQ[d.getMonth()]} ${d.getFullYear()}`;
    }
    function formatDateTimeSq(input) {
        const d = input ? new Date(input) : new Date();
        const time = d.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' });
        return `${DAYS_SQ[d.getDay()]}, ${formatDateSq(d)} • ${time}`;
    }

    /* ---------- Toast ---------- */
    function toast(message, kind) {
        const existing = document.getElementById('bonecv-toast');
        if (existing) existing.remove();
        const el = document.createElement('div');
        el.id = 'bonecv-toast';
        const palette = {
            success: 'background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.4);color:#a7f3d0;',
            error: 'background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.4);color:#fecaca;',
            info: 'background:rgba(59,130,246,.15);border:1px solid rgba(59,130,246,.4);color:#bfdbfe;'
        }[kind || 'info'];
        el.setAttribute('style', `
            position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(20px);
            ${palette}
            backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
            padding:14px 22px;border-radius:14px;font:600 14px 'Plus Jakarta Sans',sans-serif;
            z-index:99999;opacity:0;transition:.35s cubic-bezier(.16,1,.3,1);
            box-shadow:0 20px 60px rgba(0,0,0,.5);
        `);
        el.textContent = message;
        document.body.appendChild(el);
        requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateX(-50%) translateY(0)';
        });
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => el.remove(), 400);
        }, 2400);
    }

    /* ---------- Brand mark (inline SVG, follows accent) ---------- */
    function brandMark() {
        return `<div class="bonecv-brandmark w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 relative overflow-hidden" style="background:linear-gradient(135deg,var(--accent,#2563eb),var(--accent-d,#1d4ed8));box-shadow:0 8px 22px var(--accent-glow,rgba(59,130,246,.4)),inset 0 1px 0 rgba(255,255,255,.25);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M7 3.5h6.2L18 8v11.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5v-14A1.5 1.5 0 0 1 7 3.5Z" fill="#fff"/>
                <path d="M13.2 3.7V7a1 1 0 0 0 1 1h3.3" fill="#fff" opacity="0.5"/>
                <circle cx="9.4" cy="10.2" r="1.5" fill="var(--accent,#2563eb)"/>
                <rect x="11.7" y="9.35" width="4.3" height="1.6" rx=".8" fill="var(--accent,#2563eb)" opacity=".85"/>
                <rect x="8" y="13.3" width="8" height="1.5" rx=".75" fill="#93c5fd"/>
                <rect x="8" y="16.1" width="5.6" height="1.5" rx=".75" fill="#93c5fd"/>
            </svg>
        </div>`;
    }

    /* ---------- Profile chip / setup CTA ---------- */
    function profileChip(s, photoEl) {
        const isSet = (s.name && s.name !== 'Përdorues') || (s.profession && s.profession !== 'Profesionist') || !!s.photo;
        if (!isSet) {
            return `<a href="cilesimet.html" class="bonecv-tap mx-4 mb-4 p-3 rounded-2xl flex items-center gap-3" style="background:var(--accent-soft,rgba(59,130,246,.16));border:1px solid var(--accent,#2563eb);">
                <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8));box-shadow:0 8px 20px var(--accent-glow,rgba(59,130,246,.35));">
                    <i class="fa-solid fa-user-plus text-white"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <div class="font-bold truncate text-sm">${escapeHTML(t('profile.create'))}</div>
                    <div class="text-xs text-white/60 truncate">${escapeHTML(t('profile.create_d'))}</div>
                </div>
                <i class="fa-solid fa-arrow-right text-xs" style="color:var(--accent)"></i>
            </a>`;
        }
        return `<a href="cilesimet.html" class="bonecv-tap mx-4 mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                ${photoEl}
                <div class="min-w-0 flex-1">
                    <div class="font-semibold truncate" data-bonecv-name>${escapeHTML(s.name)}</div>
                    <div class="text-xs text-white/50 truncate" data-bonecv-prof>${escapeHTML(s.profession)}</div>
                </div>
                <i class="fa-solid fa-pen text-[11px] text-white/30"></i>
            </a>`;
    }

    /* ---------- Grouped navigation ---------- */
    function navItem(it, activePage) {
        const active = activePage === it.id;
        return `<a href="${it.href}" data-page="${it.id}" class="nav-link bonecv-tap group flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${active ? 'is-active' : ''}">
            <i class="fa-solid ${it.icon} w-5 text-center"></i><span class="font-medium flex-1">${it.label}</span>
            ${active ? '<span class="sb-dot"></span>' : ''}
        </a>`;
    }
    function navGroup(label, list, activePage) {
        if (!list.length) return '';
        return `<div class="px-2 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">${escapeHTML(label)}</div>
            <div class="space-y-1">${list.map(it => navItem(it, activePage)).join('')}</div>`;
    }

    /* ---------- Sidebar HTML (shared) ---------- */
    function getSidebarHTML(activePage) {
        const s = getSettings();
        const items = [
            { id: 'index', label: t('nav.home'), icon: 'fa-house', href: 'index.html' },
            { id: 'cv', label: t('nav.cv'), icon: 'fa-id-badge', href: 'cv.html' },
            { id: 'kontrata', label: t('nav.kontrata'), icon: 'fa-file-signature', href: 'kontrata.html' },
            { id: 'kerkesa', label: t('nav.kerkesa'), icon: 'fa-envelope-open-text', href: 'kerkesa.html' },
            { id: 'arkiva', label: t('nav.arkiva'), icon: 'fa-box-archive', href: 'arkiva.html' },
            { id: 'cilesimet', label: t('nav.cilesimet'), icon: 'fa-sliders', href: 'cilesimet.html' }
        ];
        const initial = (s.name || 'P').charAt(0).toUpperCase();
        const photoEl = s.photo
            ? `<img src="${s.photo}" alt="" class="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10">`
            : `<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-lg">${initial}</div>`;

        return `
        <div class="flex flex-col h-full">
            <div class="px-6 pt-6 pb-4 flex items-center gap-3">
                ${brandMark()}
                <div>
                    <div class="font-extrabold tracking-tight text-[17px] leading-none">boneCV<span style="color:var(--accent)">.</span></div>
                    <div class="text-[10px] font-semibold tracking-wide text-white/45 mt-1">${escapeHTML(t('brand.motto'))}</div>
                </div>
            </div>
            ${profileChip(s, photoEl)}
            <div class="px-4 pb-2">
                <a href="#" id="sbCreate" class="bonecv-tap btn btn-primary w-full flex items-center justify-center gap-2" style="padding:13px;border-radius:14px;font-size:14px;">
                    <i class="fa-solid fa-plus"></i> ${escapeHTML(t('sidebar.create'))}
                </a>
            </div>
            <nav class="px-3 flex-1 overflow-y-auto pb-2">
                ${navGroup(t('group.main'), items.filter(i => i.id === 'index'), activePage)}
                ${navGroup(t('group.docs'), items.filter(i => ['cv', 'kontrata', 'kerkesa', 'arkiva'].includes(i.id)), activePage)}
                ${navGroup(t('group.system'), items.filter(i => i.id === 'cilesimet'), activePage)}
            </nav>
            <div class="px-4 py-4 border-t border-white/[0.06]">
                <div class="flex items-center gap-2 mb-3">
                    <button type="button" data-setlang="sq" class="bonecv-tap sb-lang ${getLang() === 'sq' ? 'on' : ''}">SQ</button>
                    <button type="button" data-setlang="en" class="bonecv-tap sb-lang ${getLang() === 'en' ? 'on' : ''}">EN</button>
                    ${canInstall() ? `<button type="button" id="sbInstall" class="bonecv-tap sb-install ml-auto"><i class="fa-solid fa-download"></i> ${escapeHTML(t('sidebar.install'))}</button>` : ''}
                </div>
                <div class="text-[11px] text-white/30">© ${new Date().getFullYear()} boneCV Pro • v1.2.0</div>
            </div>
        </div>`;
    }

    function getSidebarCSS() {
        return `
        #sidebar { background:rgba(5,5,5,0.85); backdrop-filter:blur(40px); -webkit-backdrop-filter:blur(40px); border-right:1px solid rgba(255,255,255,0.06); }
        .nav-link { color:rgba(255,255,255,0.6); }
        .nav-link:hover { background:rgba(255,255,255,0.04); color:#fff; }
        .nav-link.is-active { background:linear-gradient(135deg, rgba(37,99,235,0.18), rgba(37,99,235,0.06)); color:#fff; box-shadow:inset 0 0 0 1px rgba(59,130,246,0.25); }
        .nav-link.is-active i { color:#60a5fa; }
        `;
    }

    function escapeHTML(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    /* ---------- Confirm dialog (elegant) ---------- */
    function confirmDialog(opts) {
        return new Promise(resolve => {
            const o = Object.assign({
                title: 'Konfirmim',
                message: 'A jeni i sigurt?',
                confirmText: 'Po, vazhdo',
                cancelText: 'Anulo',
                danger: false
            }, opts || {});

            const wrap = document.createElement('div');
            wrap.setAttribute('style', `
                position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;
                background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;
            `);
            wrap.innerHTML = `
                <div style="
                    width:min(420px,92vw);background:rgba(15,15,15,0.95);
                    border:1px solid rgba(255,255,255,0.08);border-radius:24px;
                    padding:28px;transform:scale(.96);transition:transform .3s cubic-bezier(.16,1,.3,1);
                    font-family:'Plus Jakarta Sans',sans-serif;color:#fff;
                ">
                    <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${escapeHTML(o.title)}</div>
                    <div style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.55;margin-bottom:24px;">${escapeHTML(o.message)}</div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;">
                        <button data-act="cancel" style="
                            padding:10px 18px;border-radius:12px;background:rgba(255,255,255,0.05);
                            border:1px solid rgba(255,255,255,0.08);color:#fff;font-weight:600;font-size:13px;cursor:pointer;
                        ">${escapeHTML(o.cancelText)}</button>
                        <button data-act="ok" style="
                            padding:10px 18px;border-radius:12px;color:#fff;font-weight:700;font-size:13px;cursor:pointer;border:none;
                            background:${o.danger ? 'linear-gradient(135deg,#ef4444,#b91c1c)' : 'linear-gradient(135deg,#3b82f6,#1d4ed8)'};
                            box-shadow:0 10px 30px ${o.danger ? 'rgba(239,68,68,0.35)' : 'rgba(59,130,246,0.35)'};
                        ">${escapeHTML(o.confirmText)}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(wrap);
            requestAnimationFrame(() => {
                wrap.style.opacity = '1';
                wrap.querySelector('div').style.transform = 'scale(1)';
            });
            const close = (val) => {
                wrap.style.opacity = '0';
                setTimeout(() => { wrap.remove(); resolve(val); }, 220);
            };
            wrap.addEventListener('click', e => { if (e.target === wrap) close(false); });
            wrap.querySelector('[data-act="cancel"]').onclick = () => close(false);
            wrap.querySelector('[data-act="ok"]').onclick = () => close(true);
        });
    }

    /* ---------- Mouse glow effect ---------- */
    function attachMouseGlow(target) {
        const el = target || document.body;
        const glow = document.createElement('div');
        glow.setAttribute('style', `
            position:fixed;pointer-events:none;z-index:1;
            width:600px;height:600px;border-radius:50%;
            background:radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%);
            transform:translate(-50%,-50%);transition:opacity .3s;opacity:0;
        `);
        document.body.appendChild(glow);
        el.addEventListener('mousemove', (e) => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            glow.style.opacity = '1';
        });
        el.addEventListener('mouseleave', () => glow.style.opacity = '0');
    }

    /* ---------- Mount sidebar shortcut ---------- */
    function mountSidebar(containerId, activePage) {
        const c = document.getElementById(containerId);
        if (!c) return;
        const render = () => { c.innerHTML = getSidebarHTML(activePage); wireSidebar(c); };
        render();
        // refresh on settings / language / installability change
        document.addEventListener('bonecv:settings', render);
        document.addEventListener('bonecv:lang', render);
        document.addEventListener('bonecv:installable', render);
    }
    function wireSidebar(c) {
        const create = c.querySelector('#sbCreate');
        if (create) create.addEventListener('click', e => { e.preventDefault(); openCreateSheet(); });
        c.querySelectorAll('[data-setlang]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); setLang(b.getAttribute('data-setlang')); }));
        const inst = c.querySelector('#sbInstall');
        if (inst) inst.addEventListener('click', e => { e.preventDefault(); promptInstall(); });
    }

    /* ============================================================
     * PWA RUNTIME — Service Worker, Install prompt, Update detection
     * ============================================================ */
    let deferredInstallPrompt = null;
    let swRegistration = null;
    const INSTALL_DISMISS_KEY = 'boneCV_InstallDismissed';

    function initPWA(opts) {
        opts = opts || {};
        // 1) Register the service worker (offline shell).
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('service-worker.js')
                    .then(reg => {
                        swRegistration = reg;
                        watchForUpdate(reg);
                    })
                    .catch(() => { /* SW optional; app still works */ });

                // When the new SW takes control, reload once to get fresh assets.
                let reloaded = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (reloaded) return;
                    reloaded = true;
                    window.location.reload();
                });
            });
        }

        // 2) Capture the install prompt.
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredInstallPrompt = e;
            document.dispatchEvent(new CustomEvent('bonecv:installable'));
            if (!opts.silent && localStorage.getItem(INSTALL_DISMISS_KEY) !== '1') {
                showInstallBanner();
            }
        });

        // 3) Track a successful install.
        window.addEventListener('appinstalled', () => {
            deferredInstallPrompt = null;
            hideInstallBanner();
            toast('boneCV u instalua me sukses', 'success');
        });
    }

    function canInstall() { return !!deferredInstallPrompt; }

    async function promptInstall() {
        if (!deferredInstallPrompt) {
            toast('Instalimi nuk është i disponueshëm tani', 'info');
            return false;
        }
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        hideInstallBanner();
        return outcome === 'accepted';
    }

    function watchForUpdate(reg) {
        // A worker already waiting → offer update immediately.
        if (reg.waiting && navigator.serviceWorker.controller) {
            showUpdateToast(reg.waiting);
        }
        reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
                if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                    showUpdateToast(nw);
                }
            });
        });
        // Poll for updates every 30 min while the app is open.
        setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }

    function showUpdateToast(worker) {
        if (document.getElementById('bonecv-update')) return;
        const bar = document.createElement('div');
        bar.id = 'bonecv-update';
        bar.setAttribute('role', 'status');
        bar.setAttribute('style', `
            position:fixed;left:50%;bottom:88px;transform:translateX(-50%) translateY(16px);
            display:flex;align-items:center;gap:14px;z-index:99998;opacity:0;
            background:rgba(15,15,20,0.92);backdrop-filter:blur(20px);
            border:1px solid rgba(59,130,246,0.4);border-radius:16px;padding:12px 16px;
            box-shadow:0 20px 60px rgba(0,0,0,.5);transition:.35s cubic-bezier(.16,1,.3,1);
            font-family:'Plus Jakarta Sans',sans-serif;color:#fff;max-width:92vw;`);
        bar.innerHTML = `
            <span style="font-size:14px;font-weight:600;">Version i ri i disponueshëm</span>
            <button id="bonecv-update-btn" style="border:none;cursor:pointer;padding:8px 16px;border-radius:10px;
                background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;font-weight:700;font-size:13px;">
                Përditëso</button>`;
        document.body.appendChild(bar);
        requestAnimationFrame(() => { bar.style.opacity = '1'; bar.style.transform = 'translateX(-50%) translateY(0)'; });
        bar.querySelector('#bonecv-update-btn').onclick = () => {
            worker.postMessage({ type: 'SKIP_WAITING' });
            bar.remove();
        };
    }

    function ensureInstallCSS() {
        if (document.getElementById('bonecv-install-css')) return;
        const st = document.createElement('style');
        st.id = 'bonecv-install-css';
        st.textContent = `
        #bonecv-install{position:fixed;left:50%;bottom:calc(88px + env(safe-area-inset-bottom));
            transform:translateX(-50%) translateY(20px);z-index:99997;opacity:0;
            display:flex;align-items:center;gap:14px;max-width:92vw;
            background:rgba(15,15,20,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
            border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:12px 14px;
            box-shadow:0 24px 70px rgba(0,0,0,.55);transition:.4s cubic-bezier(.16,1,.3,1);
            font-family:'Plus Jakarta Sans',sans-serif;color:#fff;}
        #bonecv-install.show{opacity:1;transform:translateX(-50%) translateY(0);}
        #bonecv-install .bi-ic{width:40px;height:40px;border-radius:12px;flex-shrink:0;
            background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;
            box-shadow:0 8px 20px rgba(59,130,246,.4);}
        #bonecv-install .bi-t{font-size:13px;font-weight:700;line-height:1.2;}
        #bonecv-install .bi-s{font-size:11px;color:rgba(255,255,255,.55);margin-top:2px;}
        #bonecv-install .bi-go{border:none;cursor:pointer;padding:9px 16px;border-radius:11px;
            background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;font-weight:700;font-size:13px;flex-shrink:0;}
        #bonecv-install .bi-x{border:none;background:transparent;color:rgba(255,255,255,.4);
            cursor:pointer;font-size:18px;line-height:1;padding:4px 6px;flex-shrink:0;}
        @media(min-width:1024px){#bonecv-install{bottom:24px;}}`;
        document.head.appendChild(st);
    }

    function showInstallBanner() {
        if (document.getElementById('bonecv-install') || !deferredInstallPrompt) return;
        ensureInstallCSS();
        const el = document.createElement('div');
        el.id = 'bonecv-install';
        el.setAttribute('role', 'dialog');
        el.setAttribute('aria-label', 'Instalo boneCV');
        el.innerHTML = `
            <div class="bi-ic">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"
                     stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 12 5 5 5-5"/><path d="M5 21h14"/></svg>
            </div>
            <div style="min-width:0;">
                <div class="bi-t">Instalo boneCV Pro</div>
                <div class="bi-s">Hapje të shpejta, offline, si aplikacion</div>
            </div>
            <button class="bi-go" type="button">Instalo</button>
            <button class="bi-x" type="button" aria-label="Mbyll">&times;</button>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('show'));
        el.querySelector('.bi-go').onclick = () => promptInstall();
        el.querySelector('.bi-x').onclick = () => {
            localStorage.setItem(INSTALL_DISMISS_KEY, '1');
            hideInstallBanner();
        };
    }

    function hideInstallBanner() {
        const el = document.getElementById('bonecv-install');
        if (!el) return;
        el.classList.remove('show');
        setTimeout(() => el.remove(), 400);
    }

    /* ============================================================
     * I18N — Shqip (sq) + English (en), në kohë reale
     * ============================================================ */
    const I18N = {
        sq: {
            'brand.suite': 'Pro Suite',
            'nav.home': 'Kreu', 'nav.cv': 'CV', 'nav.kontrata': 'Kontrata',
            'nav.kerkesa': 'Kërkesa', 'nav.arkiva': 'Arkiva', 'nav.cilesimet': 'Cilësimet',
            'bottom.create': 'Krijo',
            'sheet.title': 'Krijo dokument', 'sheet.subtitle': 'Zgjidh çfarë dëshiron të krijosh',
            'sheet.cv': 'CV Elite', 'sheet.cv_d': 'CV profesionale me preview live',
            'sheet.kontrata': 'Kontratë', 'sheet.kontrata_d': 'Kontratë ligjore me nene standarde',
            'sheet.kerkesa': 'Kërkesë', 'sheet.kerkesa_d': 'Letër zyrtare për institucione',
            'common.language': 'Gjuha',
            'brand.motto': 'Krijo. Nënshkruaj. Mbaro.',
            'profile.create': 'Krijo profilin', 'profile.create_d': 'Personalizo emrin dhe foton',
            'help.aria': 'Ndihmë dhe manual', 'help.title': 'Qendra e ndihmës',
            'help.tab_manual': 'Manuali', 'help.tab_assistant': 'Asistenti',
            'help.assistant_intro': 'Përshëndetje! Jam asistenti i boneCV. Si mund të të ndihmoj?',
            'help.assistant_ph': 'Shkruaj një pyetje…', 'help.send': 'Dërgo',
            'help.assistant_fallback': 'Nuk jam i sigurt për këtë. Provo një nga pyetjet e shpejta më poshtë ose hap Manualin.',
            'help.quick': 'Pyetje të shpejta',
            'help.manual_lead': 'Udhëzues i plotë për të përdorur boneCV. Prek një temë për të kaluar tek ajo.',
            'sidebar.create': 'Krijo dokument', 'sidebar.install': 'Instalo aplikacionin',
            'group.main': 'Kryesore', 'group.docs': 'Dokumente', 'group.system': 'Sistem',
            /* Dashboard */
            'idx.badge': '100% Privat • Pa regjistrim',
            'idx.welcome': 'Mirë se erdhe,',
            'idx.sub': 'Krijo CV elite, kontrata ligjore dhe kërkesa zyrtare në <span class="text-white font-semibold">sekonda</span>, jo orë. <span class="text-white/85">Asnjë regjistrim, asnjë reklamë, asnjë gjurmë në server.</span> Vetëm dokumente premium në shqip, gati për t\'u dorëzuar.',
            'idx.cta_start': 'Fillo me një CV', 'idx.cta_why': 'Pse boneCV?',
            'idx.trust': '<span class="text-white font-semibold">Mijëra profesionistë</span> kanë krijuar CV-të e tyre këtu — gjithçka lokalisht, asgjë nuk lë pajisjen tuaj.',
            'idx.scroll': 'Lëviz poshtë',
            'idx.stat_total': 'Dokumente të ruajtura', 'idx.stat_cv': 'CV elite të krijuara',
            'idx.stat_kontrata': 'Kontrata ligjore', 'idx.stat_kerkesa': 'Letra zyrtare',
            'idx.why_eyebrow': 'Pse boneCV Pro',
            'idx.why_h1': 'E ndërtuar për ata që', 'idx.why_h2': 'nuk pranojnë kompromis.',
            'idx.why_p': 'Gjeneratorët online tradicionalë kërkojnë llogari, ruajnë të dhënat tuaja personale, shpesh me reklama dhe template të zakonshme. boneCV bën të kundërtën.',
            'idx.f1_t': 'Privatësi totale', 'idx.f1_d': 'Asnjë server, asnjë cloud, asnjë llogari. Të dhënat ruhen vetëm në pajisjen tuaj. Asgjë nuk udhëton kund.',
            'idx.f2_t': 'Shpejtësi e papërballueshme', 'idx.f2_d': 'Preview live ndërsa shkruani. Gjenero, redaktoni dhe printo për nën një minutë. Pa pritje, pa rëndim.',
            'idx.f3_t': 'Funksionon offline', 'idx.f3_d': 'Hapeni një herë dhe e keni gjithmonë. Nuk varet nga lidhja juaj me internetin. PWA me sinkronizim lokal.',
            'idx.f4_t': 'Dizajn premium', 'idx.f4_d': 'Template të frymëzuar nga Apple, Stripe dhe Vercel. Tipografi profesionale dhe paleta ngjyrash që ngrijnë syrin.',
            'idx.f5_t': '100% në shqip', 'idx.f5_d': 'Nene ligjore standarde shqiptare të para-populluara. Letra formale me strukturë vendore. Pa përkthime të çuditshme.',
            'idx.f6_t': 'Plotësisht falas', 'idx.f6_d': 'Asnjë "premium", asnjë limit, asnjë reklamë. Të gjitha veçoritë janë në dispozicion që në çastin e parë.',
            'idx.tpl_eyebrow': 'Template ekskluzive', 'idx.tpl_h1': 'Tri stile.', 'idx.tpl_h2': 'Një standard.',
            'idx.tpl_p': 'Përzgjidh stilin që pasqyron personalitetin profesional. Të gjitha të optimizuara për ekran dhe printim A4.',
            'idx.tpl_btn': 'Shiko të gjitha template',
            'idx.qa_eyebrow': 'Veprime të shpejta', 'idx.qa_h': 'Fillo tani.',
            'idx.qa_cv_t': 'CV Elite', 'idx.qa_cv_d': 'Krijo një CV profesionale me preview live në split-screen.',
            'idx.qa_kontrata_t': 'Kontratë e re', 'idx.qa_kontrata_d': 'Pune, shërbimi ose bashkëpunimi — me nene ligjore standarde.',
            'idx.qa_kerkesa_t': 'Kërkesë zyrtare', 'idx.qa_kerkesa_d': 'Letër formale për institucione, kompani, ankesa, leje.',
            'idx.start_now': 'Fillo tani',
            'idx.recent_eyebrow': 'Arkiva', 'idx.recent_h': 'Aktiviteti i fundit', 'idx.see_all': 'Shiko të gjitha',
            'idx.empty_t': 'Asnjë dokument ende', 'idx.empty_d': 'Krijo CV-në tënde të parë dhe fillo aventurën profesionale.',
            'idx.empty_btn': 'Krijo dokumentin e parë',
            'idx.cta_eyebrow': 'Gati për të filluar?', 'idx.cta_h1': 'CV-ja jote profesionale', 'idx.cta_h2': 'në një klikim.',
            'idx.cta_p': 'Pa regjistrim. Pa email. Pa pagesa. Vetëm cilësi premium në sekonda.',
            'idx.cta_create': 'Krijo CV tani', 'idx.cta_profile': 'Konfiguro profilin',
            'idx.footer': 'boneCV Pro v1.1 • E ndërtuar me dashuri për profesionistët shqiptarë',
            /* Settings */
            'set.eyebrow': 'Cilësimet', 'set.title': 'Profili & Preferencat',
            'set.subtitle': 'Personalizo platformën, gjuhën, pamjen dhe menaxho të dhënat — gjithçka lokalisht.',
            'set.profile': 'Profili', 'set.photo': 'Foto e profilit', 'set.photo_hint': 'Kliko mbi rrethin për të ngarkuar një imazh.',
            'set.remove_photo': 'Hiq foton', 'set.name': 'Emri i përdoruesit', 'set.name_ph': 'P.sh. Anita',
            'set.profession': 'Profesioni', 'set.prof_ph': 'P.sh. UI/UX Designer', 'set.save_profile': 'Ruaj profilin',
            'set.language': 'Gjuha', 'set.language_d': 'Zgjidh gjuhën e ndërfaqes. Ndryshon menjëherë.',
            'set.lang_sq': 'Shqip', 'set.lang_en': 'Anglisht',
            'set.appearance': 'Pamja', 'set.appearance_d': 'Tema, ngjyra dhe qasshmëria.',
            'set.theme': 'Tema', 'set.theme_dark': 'E errët', 'set.theme_light': 'E çelët', 'set.theme_auto': 'Automatike',
            'set.accent': 'Ngjyra kryesore', 'set.textsize': 'Madhësia e tekstit',
            'set.ts_sm': 'Vogël', 'set.ts_md': 'Normale', 'set.ts_lg': 'Madhe', 'set.ts_xl': 'Shumë madhe',
            'set.motion': 'Zvogëlo lëvizjet', 'set.motion_d': 'Çaktivizon animacionet për qetësi vizuale.',
            'set.contrast': 'Kontrast i lartë', 'set.contrast_d': 'Rrit dukshmërinë e teksteve dhe kufijve.',
            'set.data': 'Menaxhimi i të dhënave',
            'set.export': 'Eksporto (Backup)', 'set.export_d': 'Shkarko të gjitha dokumentet dhe preferencat si skedar JSON.',
            'set.download_backup': 'Shkarko backup',
            'set.import': 'Importo backup', 'set.import_d': 'Ngarko një skedar JSON të mëparshëm për të rikthyer të dhënat.',
            'set.choose_file': 'Zgjidh skedar',
            'set.storage': 'Hapësira lokale', 'set.docs_saved': 'Dokumente të ruajtura', 'set.size': 'Madhësia',
            'set.about': 'Rreth aplikacionit', 'set.about_d': 'boneCV Pro është një platformë falas, private dhe offline për dokumente profesionale në shqip.',
            'set.privacy': 'Privatësia', 'set.privacy_d': 'Të gjitha të dhënat ruhen vetëm në pajisjen tënde. Asgjë nuk dërgohet në server.',
            'set.version': 'Versioni',
            'set.danger': 'Zonë me rrezik',
            'set.clear_cache': 'Pastro cache-në', 'set.clear_cache_d': 'Çregjistron Service Worker dhe pastron cache.', 'set.clear_cache_btn': 'Pastro cache',
            'set.wipe': 'Fshi të gjitha të dhënat', 'set.wipe_d': 'Heq profil, arkivë dhe çdo gjë të ruajtur lokalisht.', 'set.wipe_btn': 'Fshi gjithçka',
            'set.footer': 'boneCV Pro v1.1 • Të gjitha të dhënat janë vetëm në pajisjen tuaj.',
            /* Toasts / dialogs */
            'toast.profile_saved': 'Profili u ruajt', 'toast.photo_updated': 'Foto u përditësua', 'toast.photo_removed': 'Foto u hoq',
            'toast.backup_downloaded': 'Backup u shkarkua', 'toast.data_imported': 'Të dhënat u importuan', 'toast.invalid_file': 'Skedari është i pavlefshëm',
            'toast.cache_cleared': 'Cache u pastrua', 'toast.cache_error': 'Nuk u arrit të pastrohet cache', 'toast.all_wiped': 'Të gjitha të dhënat u fshinë',
            'toast.lang_changed': 'Gjuha u ndryshua', 'toast.theme_changed': 'Pamja u përditësua',
            'dlg.import_title': 'Importo të dhënat?', 'dlg.import_msg': 'Të dhënat aktuale do të zëvendësohen nga skedari i importuar.', 'dlg.import_ok': 'Po, importo',
            'dlg.cache_title': 'Pastro cache?', 'dlg.cache_msg': 'Cache i Service Worker do të pastrohet. Të dhënat tuaja mbeten të paprekura.', 'dlg.cache_ok': 'Po, pastro',
            'dlg.wipe_title': 'Fshi gjithçka?', 'dlg.wipe_msg': 'Çdo dokument, profil dhe preferencë do të fshihen përgjithmonë. Ky veprim nuk mund të rikthehet.', 'dlg.wipe_ok': 'Po, fshi përfundimisht', 'dlg.cancel': 'Anulo'
        },
        en: {
            'brand.suite': 'Pro Suite',
            'nav.home': 'Home', 'nav.cv': 'CV', 'nav.kontrata': 'Contracts',
            'nav.kerkesa': 'Requests', 'nav.arkiva': 'Archive', 'nav.cilesimet': 'Settings',
            'bottom.create': 'Create',
            'sheet.title': 'Create document', 'sheet.subtitle': 'Choose what you want to create',
            'sheet.cv': 'Elite CV', 'sheet.cv_d': 'Professional CV with live preview',
            'sheet.kontrata': 'Contract', 'sheet.kontrata_d': 'Legal contract with standard clauses',
            'sheet.kerkesa': 'Request', 'sheet.kerkesa_d': 'Formal letter for institutions',
            'common.language': 'Language',
            'brand.motto': 'Create. Sign. Done.',
            'profile.create': 'Create profile', 'profile.create_d': 'Set your name and photo',
            'help.aria': 'Help & manual', 'help.title': 'Help center',
            'help.tab_manual': 'Manual', 'help.tab_assistant': 'Assistant',
            'help.assistant_intro': "Hi! I'm the boneCV assistant. How can I help you?",
            'help.assistant_ph': 'Type a question…', 'help.send': 'Send',
            'help.assistant_fallback': "I'm not sure about that. Try a quick question below or open the Manual.",
            'help.quick': 'Quick questions',
            'help.manual_lead': 'A complete guide to using boneCV. Tap a topic to jump to it.',
            'sidebar.create': 'Create document', 'sidebar.install': 'Install the app',
            'group.main': 'Main', 'group.docs': 'Documents', 'group.system': 'System',
            'idx.badge': '100% Private • No sign-up',
            'idx.welcome': 'Welcome,',
            'idx.sub': 'Create elite CVs, legal contracts and official requests in <span class="text-white font-semibold">seconds</span>, not hours. <span class="text-white/85">No sign-up, no ads, no trace on any server.</span> Just premium documents, ready to submit.',
            'idx.cta_start': 'Start with a CV', 'idx.cta_why': 'Why boneCV?',
            'idx.trust': '<span class="text-white font-semibold">Thousands of professionals</span> have built their CVs here — everything locally, nothing ever leaves your device.',
            'idx.scroll': 'Scroll down',
            'idx.stat_total': 'Documents saved', 'idx.stat_cv': 'Elite CVs created',
            'idx.stat_kontrata': 'Legal contracts', 'idx.stat_kerkesa': 'Official letters',
            'idx.why_eyebrow': 'Why boneCV Pro',
            'idx.why_h1': 'Built for those who', 'idx.why_h2': 'refuse to compromise.',
            'idx.why_p': 'Traditional online generators demand accounts, store your personal data, often with ads and generic templates. boneCV does the opposite.',
            'idx.f1_t': 'Total privacy', 'idx.f1_d': 'No server, no cloud, no account. Your data stays only on your device. Nothing travels anywhere.',
            'idx.f2_t': 'Unbeatable speed', 'idx.f2_d': 'Live preview as you type. Generate, edit and print in under a minute. No waiting, no lag.',
            'idx.f3_t': 'Works offline', 'idx.f3_d': 'Open it once and keep it forever. It never depends on your connection. A PWA with local sync.',
            'idx.f4_t': 'Premium design', 'idx.f4_d': 'Templates inspired by Apple, Stripe and Vercel. Professional typography and eye-catching palettes.',
            'idx.f5_t': '100% in Albanian', 'idx.f5_d': 'Standard Albanian legal clauses pre-filled. Formal letters with local structure. No awkward translations.',
            'idx.f6_t': 'Completely free', 'idx.f6_d': 'No "premium", no limits, no ads. Every feature is available from the very first moment.',
            'idx.tpl_eyebrow': 'Exclusive templates', 'idx.tpl_h1': 'Three styles.', 'idx.tpl_h2': 'One standard.',
            'idx.tpl_p': 'Pick the style that reflects your professional persona. All optimized for screen and A4 print.',
            'idx.tpl_btn': 'See all templates',
            'idx.qa_eyebrow': 'Quick actions', 'idx.qa_h': 'Start now.',
            'idx.qa_cv_t': 'Elite CV', 'idx.qa_cv_d': 'Create a professional CV with live split-screen preview.',
            'idx.qa_kontrata_t': 'New contract', 'idx.qa_kontrata_d': 'Employment, service or partnership — with standard legal clauses.',
            'idx.qa_kerkesa_t': 'Official request', 'idx.qa_kerkesa_d': 'Formal letter for institutions, companies, complaints, permits.',
            'idx.start_now': 'Start now',
            'idx.recent_eyebrow': 'Archive', 'idx.recent_h': 'Recent activity', 'idx.see_all': 'See all',
            'idx.empty_t': 'No documents yet', 'idx.empty_d': 'Create your first CV and begin your professional journey.',
            'idx.empty_btn': 'Create your first document',
            'idx.cta_eyebrow': 'Ready to start?', 'idx.cta_h1': 'Your professional CV', 'idx.cta_h2': 'in one click.',
            'idx.cta_p': 'No sign-up. No email. No payment. Just premium quality in seconds.',
            'idx.cta_create': 'Create CV now', 'idx.cta_profile': 'Set up profile',
            'idx.footer': 'boneCV Pro v1.1 • Built with love for Albanian professionals',
            'set.eyebrow': 'Settings', 'set.title': 'Profile & Preferences',
            'set.subtitle': 'Personalize the app, language, appearance and manage your data — all locally.',
            'set.profile': 'Profile', 'set.photo': 'Profile photo', 'set.photo_hint': 'Tap the circle to upload an image.',
            'set.remove_photo': 'Remove photo', 'set.name': 'Your name', 'set.name_ph': 'e.g. Anita',
            'set.profession': 'Profession', 'set.prof_ph': 'e.g. UI/UX Designer', 'set.save_profile': 'Save profile',
            'set.language': 'Language', 'set.language_d': 'Choose the interface language. Changes instantly.',
            'set.lang_sq': 'Albanian', 'set.lang_en': 'English',
            'set.appearance': 'Appearance', 'set.appearance_d': 'Theme, color and accessibility.',
            'set.theme': 'Theme', 'set.theme_dark': 'Dark', 'set.theme_light': 'Light', 'set.theme_auto': 'Auto',
            'set.accent': 'Accent color', 'set.textsize': 'Text size',
            'set.ts_sm': 'Small', 'set.ts_md': 'Normal', 'set.ts_lg': 'Large', 'set.ts_xl': 'Extra large',
            'set.motion': 'Reduce motion', 'set.motion_d': 'Disables animations for visual calm.',
            'set.contrast': 'High contrast', 'set.contrast_d': 'Increases text and border visibility.',
            'set.data': 'Data management',
            'set.export': 'Export (Backup)', 'set.export_d': 'Download all documents and preferences as a JSON file.',
            'set.download_backup': 'Download backup',
            'set.import': 'Import backup', 'set.import_d': 'Upload a previous JSON file to restore your data.',
            'set.choose_file': 'Choose file',
            'set.storage': 'Local storage', 'set.docs_saved': 'Documents saved', 'set.size': 'Size',
            'set.about': 'About', 'set.about_d': 'boneCV Pro is a free, private, offline platform for professional documents in Albanian.',
            'set.privacy': 'Privacy', 'set.privacy_d': 'All data is stored only on your device. Nothing is sent to a server.',
            'set.version': 'Version',
            'set.danger': 'Danger zone',
            'set.clear_cache': 'Clear cache', 'set.clear_cache_d': 'Unregisters the Service Worker and clears cache.', 'set.clear_cache_btn': 'Clear cache',
            'set.wipe': 'Delete all data', 'set.wipe_d': 'Removes profile, archive and everything stored locally.', 'set.wipe_btn': 'Delete everything',
            'set.footer': 'boneCV Pro v1.1 • All your data lives only on your device.',
            'toast.profile_saved': 'Profile saved', 'toast.photo_updated': 'Photo updated', 'toast.photo_removed': 'Photo removed',
            'toast.backup_downloaded': 'Backup downloaded', 'toast.data_imported': 'Data imported', 'toast.invalid_file': 'The file is invalid',
            'toast.cache_cleared': 'Cache cleared', 'toast.cache_error': 'Could not clear cache', 'toast.all_wiped': 'All data deleted',
            'toast.lang_changed': 'Language changed', 'toast.theme_changed': 'Appearance updated',
            'dlg.import_title': 'Import data?', 'dlg.import_msg': 'Your current data will be replaced by the imported file.', 'dlg.import_ok': 'Yes, import',
            'dlg.cache_title': 'Clear cache?', 'dlg.cache_msg': 'The Service Worker cache will be cleared. Your data stays intact.', 'dlg.cache_ok': 'Yes, clear',
            'dlg.wipe_title': 'Delete everything?', 'dlg.wipe_msg': 'Every document, profile and preference will be permanently deleted. This cannot be undone.', 'dlg.wipe_ok': 'Yes, delete permanently', 'dlg.cancel': 'Cancel'
        }
    };

    function getLang() { const l = getSettings().lang; return l === 'en' ? 'en' : 'sq'; }
    function setLang(l) {
        l = l === 'en' ? 'en' : 'sq';
        setSettings({ lang: l });
        document.documentElement.setAttribute('lang', l);
        applyI18n(document);
        document.dispatchEvent(new CustomEvent('bonecv:lang', { detail: l }));
    }
    function t(key) {
        const d = I18N[getLang()] || I18N.sq;
        if (d[key] != null) return d[key];
        if (I18N.sq[key] != null) return I18N.sq[key];
        return key;
    }
    function applyI18n(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.getAttribute('data-i18n')); if (v != null) el.textContent = v; });
        root.querySelectorAll('[data-i18n-html]').forEach(el => { const v = t(el.getAttribute('data-i18n-html')); if (v != null) el.innerHTML = v; });
        root.querySelectorAll('[data-i18n-ph]').forEach(el => { const v = t(el.getAttribute('data-i18n-ph')); if (v != null) el.setAttribute('placeholder', v); });
        root.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = t(el.getAttribute('data-i18n-aria')); if (v != null) el.setAttribute('aria-label', v); });
    }

    /* ============================================================
     * THEME ENGINE — dark / light / auto, accent, text size, motion
     * ============================================================ */
    const ACCENT_PRESETS = ['#2563eb', '#7c3aed', '#059669', '#e11d48', '#d97706', '#0891b2'];
    const TEXT_SCALE = { sm: '15px', md: '16px', lg: '18px', xl: '20px' };

    function shade(hex, amt) {
        hex = (hex || '#2563eb').replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        let r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        r = Math.round(Math.min(255, Math.max(0, r + amt * 255)));
        g = Math.round(Math.min(255, Math.max(0, g + amt * 255)));
        b = Math.round(Math.min(255, Math.max(0, b + amt * 255)));
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    function hexA(hex, a) {
        hex = (hex || '#2563eb').replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r},${g},${b},${a})`;
    }
    function resolveTheme() {
        let th = getSettings().theme || 'dark';
        if (th === 'auto') {
            th = (window.matchMedia && matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
        }
        return th === 'light' ? 'light' : 'dark';
    }
    function applyTheme() {
        const s = getSettings();
        const th = resolveTheme();
        const html = document.documentElement;
        html.setAttribute('data-theme', th);
        html.setAttribute('data-motion', s.reduceMotion ? 'reduce' : 'full');
        html.setAttribute('data-contrast', s.highContrast ? 'high' : 'normal');
        html.setAttribute('lang', getLang());
        const accent = s.accent || '#2563eb';
        html.style.setProperty('--accent', accent);
        html.style.setProperty('--accent-2', accent);
        html.style.setProperty('--accent-d', shade(accent, -0.22));
        html.style.setProperty('--accent-glow', hexA(accent, 0.45));
        html.style.setProperty('--accent-soft', hexA(accent, 0.16));
        html.style.fontSize = TEXT_SCALE[s.textScale] || '16px';
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', th === 'light' ? '#f4f6f9' : '#020202');
        injectGlobalCSS();
    }

    function injectGlobalCSS() {
        if (document.getElementById('bonecv-global-css')) return;
        const st = document.createElement('style');
        st.id = 'bonecv-global-css';
        st.textContent = `
        /* ---- Accent (both themes) ---- */
        .btn-primary{ background:linear-gradient(135deg,var(--accent),var(--accent-d)) !important; box-shadow:0 20px 50px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.15) !important; }
        .nav-link.is-active{ background:linear-gradient(135deg,var(--accent-soft),transparent) !important; box-shadow:inset 0 0 0 1px var(--accent) !important; }
        .nav-link.is-active i{ color:var(--accent) !important; }
        .input:focus{ border-color:var(--accent) !important; }
        /* ---- Reduce motion ---- */
        html[data-motion="reduce"] *, html[data-motion="reduce"] *::before, html[data-motion="reduce"] *::after{
            animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; scroll-behavior:auto !important; }
        /* ---- High contrast ---- */
        html[data-contrast="high"] .glass, html[data-contrast="high"] .glass-soft{ border-color:rgba(255,255,255,0.3) !important; }
        html[data-contrast="high"] [class*="text-white/"]{ color:#fff !important; }
        html[data-contrast="high"][data-theme="light"] .glass, html[data-contrast="high"][data-theme="light"] .glass-soft{ border-color:rgba(15,23,42,0.28) !important; }
        html[data-contrast="high"][data-theme="light"] [class*="text-white/"]{ color:#0b1220 !important; }
        /* ---- LIGHT THEME ---- */
        html[data-theme="light"]{ --bg:#f4f6f9; --bg-2:#eceff4; --card:rgba(255,255,255,0.72); --border:rgba(15,23,42,0.08); color-scheme:light; }
        html[data-theme="light"] body{ background:#f4f6f9 !important; color:#0b1220; }
        html[data-theme="light"] .mesh-bg{ background:#f4f6f9 !important; }
        html[data-theme="light"] .mesh-bg::before{ opacity:.25; } html[data-theme="light"] .mesh-bg::after{ opacity:.18; } html[data-theme="light"] .mesh-bg .blob{ opacity:.14; }
        html[data-theme="light"] .grain{ display:none; }
        html[data-theme="light"] .glass{ background:rgba(255,255,255,0.72) !important; border-color:rgba(15,23,42,0.08) !important; box-shadow:0 10px 40px rgba(15,23,42,0.06); }
        html[data-theme="light"] .glass-soft{ background:rgba(15,23,42,0.03) !important; border-color:rgba(15,23,42,0.07) !important; }
        html[data-theme="light"] .text-white{ color:#0b1220 !important; }
        html[data-theme="light"] [class*="text-white/9"], html[data-theme="light"] [class*="text-white/8"], html[data-theme="light"] [class*="text-white/7"]{ color:#1f2937 !important; }
        html[data-theme="light"] [class*="text-white/6"], html[data-theme="light"] [class*="text-white/5"]{ color:#475569 !important; }
        html[data-theme="light"] [class*="text-white/4"], html[data-theme="light"] [class*="text-white/3"], html[data-theme="light"] [class*="text-white/2"]{ color:#64748b !important; }
        html[data-theme="light"] [class*="bg-white/"]{ background-color:rgba(15,23,42,0.04) !important; }
        html[data-theme="light"] [class*="border-white/"]{ border-color:rgba(15,23,42,0.08) !important; }
        html[data-theme="light"] .gradient-text{ background:linear-gradient(135deg,#0f172a,#334155) !important; -webkit-background-clip:text; background-clip:text; color:transparent; }
        html[data-theme="light"] .input{ background:rgba(15,23,42,0.04); color:#0b1220; }
        html[data-theme="light"] .input::placeholder{ color:rgba(15,23,42,0.4); }
        html[data-theme="light"] #sidebar{ background:rgba(255,255,255,0.86) !important; border-right-color:rgba(15,23,42,0.08) !important; }
        html[data-theme="light"] .nav-link{ color:#475569; }
        html[data-theme="light"] .nav-link:hover{ background:rgba(15,23,42,0.04); color:#0b1220; }
        html[data-theme="light"] #menuBtn{ background:rgba(255,255,255,0.8) !important; border-color:rgba(15,23,42,0.08) !important; color:#0b1220; }
        html[data-theme="light"] .danger-zone{ background:rgba(239,68,68,0.05); border-color:rgba(239,68,68,0.22); }
        /* ---- BOTTOM NAV ---- */
        #bonecv-bottomnav{ position:fixed; left:0; right:0; bottom:0; z-index:6000; display:flex; justify-content:center;
            pointer-events:none; padding:0 12px calc(8px + env(safe-area-inset-bottom)); }
        #bonecv-bottomnav .bn-bar{ pointer-events:auto; width:100%; max-width:520px; height:62px; display:flex; align-items:center;
            justify-content:space-around; background:rgba(10,10,12,0.72); backdrop-filter:blur(28px) saturate(1.5);
            -webkit-backdrop-filter:blur(28px) saturate(1.5); border:1px solid rgba(255,255,255,0.08); border-radius:24px;
            box-shadow:0 18px 50px rgba(0,0,0,0.45); }
        html[data-theme="light"] #bonecv-bottomnav .bn-bar{ background:rgba(255,255,255,0.85); border-color:rgba(15,23,42,0.08); box-shadow:0 16px 42px rgba(15,23,42,0.14); }
        .bn-item{ flex:1; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px;
            color:rgba(255,255,255,0.55); font-size:10px; font-weight:600; text-decoration:none; transition:color .25s;
            -webkit-tap-highlight-color:transparent; }
        html[data-theme="light"] .bn-item{ color:rgba(15,23,42,0.5); }
        .bn-item i{ font-size:18px; transition:transform .3s cubic-bezier(.16,1,.3,1); }
        .bn-item.active{ color:var(--accent); }
        .bn-item.active i{ transform:translateY(-2px) scale(1.1); }
        .bn-item .bn-dot{ width:5px; height:5px; border-radius:50%; background:var(--accent); opacity:0; transform:scale(0); transition:.3s; }
        .bn-item.active .bn-dot{ opacity:1; transform:scale(1); }
        .bn-fab{ flex:0 0 auto; pointer-events:auto; width:60px; height:60px; margin:0 4px; border:none; border-radius:22px;
            background:linear-gradient(135deg,var(--accent),var(--accent-d)); color:#fff; display:flex; align-items:center; justify-content:center;
            transform:translateY(-16px); box-shadow:0 16px 34px var(--accent-glow), inset 0 1px 0 rgba(255,255,255,0.25); cursor:pointer;
            transition:transform .25s cubic-bezier(.16,1,.3,1); }
        .bn-fab:active{ transform:translateY(-16px) scale(.9); }
        .bn-fab i{ font-size:22px; }
        @media (min-width:1024px){ #bonecv-bottomnav{ display:none; } }
        @media print{ #bonecv-bottomnav, #bonecv-sheet{ display:none !important; } }
        /* ---- CREATE SHEET ---- */
        #bonecv-sheet{ position:fixed; inset:0; z-index:7000; display:flex; align-items:flex-end; justify-content:center; pointer-events:none; }
        #bonecv-sheet .sh-backdrop{ position:absolute; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); opacity:0; transition:opacity .3s; }
        #bonecv-sheet .sh-panel{ position:relative; width:100%; max-width:520px; background:rgba(18,18,22,0.97); backdrop-filter:blur(30px);
            border:1px solid rgba(255,255,255,0.08); border-radius:28px 28px 0 0; padding:10px 18px calc(24px + env(safe-area-inset-bottom));
            transform:translateY(110%); transition:transform .42s cubic-bezier(.16,1,.3,1); pointer-events:auto; color:#fff; }
        html[data-theme="light"] #bonecv-sheet .sh-panel{ background:rgba(255,255,255,0.98); border-color:rgba(15,23,42,0.08); color:#0b1220; }
        #bonecv-sheet.open{ pointer-events:auto; } #bonecv-sheet.open .sh-backdrop{ opacity:1; } #bonecv-sheet.open .sh-panel{ transform:translateY(0); }
        .sh-grabber{ width:40px; height:5px; border-radius:3px; background:rgba(255,255,255,0.2); margin:6px auto 14px; }
        html[data-theme="light"] .sh-grabber{ background:rgba(15,23,42,0.15); }
        .sh-title{ font-weight:800; font-size:18px; padding:0 4px 2px; }
        .sh-sub{ font-size:13px; color:rgba(255,255,255,0.5); padding:0 4px 14px; }
        html[data-theme="light"] .sh-sub{ color:rgba(15,23,42,0.5); }
        .sh-opt{ display:flex; align-items:center; gap:14px; padding:14px; border-radius:18px; background:rgba(255,255,255,0.04);
            border:1px solid rgba(255,255,255,0.06); margin-bottom:10px; text-decoration:none; color:inherit; transition:transform .2s, background .2s; }
        html[data-theme="light"] .sh-opt{ background:rgba(15,23,42,0.03); border-color:rgba(15,23,42,0.06); }
        .sh-opt:active{ transform:scale(.98); }
        .sh-opt .sh-ic{ width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0; }
        .sh-opt .sh-t{ font-weight:700; font-size:15px; }
        .sh-opt .sh-d{ display:block; font-size:12px; color:rgba(255,255,255,0.5); margin-top:2px; }
        html[data-theme="light"] .sh-opt .sh-d{ color:rgba(15,23,42,0.5); }
        /* ---- MECHANICAL: ripple + press ---- */
        .btn, .bonecv-tap, .qa, .sh-opt, .nav-link, .seg button, .bn-item, .bn-fab, .hp-chip { position:relative; overflow:hidden; }
        .bonecv-ripple{ position:absolute; border-radius:50%; transform:scale(0); pointer-events:none;
            background:rgba(255,255,255,0.35); animation:bonecvRipple .6s cubic-bezier(.16,1,.3,1) forwards; }
        html[data-theme="light"] .bonecv-ripple{ background:rgba(15,23,42,0.16); }
        @keyframes bonecvRipple{ to{ transform:scale(1); opacity:0; } }
        .bonecv-press{ transform:scale(.96) !important; }
        html[data-motion="reduce"] .bonecv-ripple{ display:none; }
        /* ---- Bottom nav scroll-hide ---- */
        #bonecv-bottomnav{ transition:transform .4s cubic-bezier(.16,1,.3,1); }
        #bonecv-bottomnav.nav-hidden{ transform:translateY(170%); }
        /* ---- Help button ---- */
        #bonecv-help-btn{ position:fixed; top:calc(18px + env(safe-area-inset-top)); right:18px; z-index:6200;
            width:48px; height:48px; border-radius:16px; border:1px solid rgba(255,255,255,0.25); cursor:pointer;
            background:linear-gradient(135deg,var(--accent,#2563eb),var(--accent-d,#1d4ed8)); color:#fff;
            display:flex; align-items:center; justify-content:center; font-size:20px;
            box-shadow:0 14px 34px var(--accent-glow,rgba(37,99,235,0.45)), inset 0 1px 0 rgba(255,255,255,0.3);
            transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .25s; }
        #bonecv-help-btn:hover{ transform:translateY(-2px); box-shadow:0 18px 42px var(--accent-glow,rgba(37,99,235,0.55)); }
        #bonecv-help-btn:active{ transform:scale(.9); }
        @media print{ #bonecv-help-btn, #bonecv-help{ display:none !important; } }
        /* ---- Help drawer ---- */
        #bonecv-help{ position:fixed; inset:0; z-index:7500; pointer-events:none; }
        #bonecv-help .hp-back{ position:absolute; inset:0; background:rgba(0,0,0,0.5); backdrop-filter:blur(4px); opacity:0; transition:opacity .3s; }
        #bonecv-help .hp-panel{ position:absolute; top:0; right:0; height:100%; width:min(420px,100%); display:flex; flex-direction:column;
            background:rgba(16,16,20,0.97); backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); border-left:1px solid rgba(255,255,255,0.08);
            transform:translateX(100%); transition:transform .42s cubic-bezier(.16,1,.3,1); pointer-events:auto; color:#fff; }
        html[data-theme="light"] #bonecv-help .hp-panel{ background:rgba(255,255,255,0.98); border-left-color:rgba(15,23,42,0.08); color:#0b1220; }
        #bonecv-help.open{ pointer-events:auto; } #bonecv-help.open .hp-back{ opacity:1; }
        #bonecv-help.open .hp-panel{ transform:translateX(0); }
        .hp-head{ display:flex; align-items:center; gap:12px; padding:calc(16px + env(safe-area-inset-top)) 18px 12px; }
        .hp-head .hp-t{ font-weight:800; font-size:17px; flex:1; }
        .hp-x{ border:none; background:rgba(255,255,255,0.06); color:inherit; width:34px; height:34px; border-radius:11px; cursor:pointer; font-size:15px; }
        html[data-theme="light"] .hp-x{ background:rgba(15,23,42,0.05); }
        .hp-tabs{ display:flex; gap:6px; margin:0 18px 10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:4px; }
        html[data-theme="light"] .hp-tabs{ background:rgba(15,23,42,0.04); border-color:rgba(15,23,42,0.07); }
        .hp-tab{ flex:1; border:none; background:transparent; color:rgba(255,255,255,0.6); font-family:inherit; font-weight:700; font-size:13px; padding:9px; border-radius:10px; cursor:pointer; }
        html[data-theme="light"] .hp-tab{ color:rgba(15,23,42,0.55); }
        .hp-tab.on{ background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8)); color:#fff; }
        .hp-body{ flex:1; overflow-y:auto; padding:4px 18px 20px; }
        .hp-card{ display:flex; gap:12px; padding:14px; border-radius:16px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); margin-bottom:10px; }
        html[data-theme="light"] .hp-card{ background:rgba(15,23,42,0.03); border-color:rgba(15,23,42,0.06); }
        .hp-card .hp-ic{ width:38px; height:38px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
            background:var(--accent-soft,rgba(59,130,246,.16)); color:var(--accent); font-size:15px; }
        .hp-card .hp-ct{ font-weight:700; font-size:14px; margin-bottom:3px; }
        .hp-card .hp-cd{ font-size:12.5px; line-height:1.55; color:rgba(255,255,255,0.6); }
        html[data-theme="light"] .hp-card .hp-cd{ color:rgba(15,23,42,0.6); }
        .hp-chat{ display:flex; flex-direction:column; gap:10px; }
        .hp-msg{ max-width:86%; padding:11px 14px; border-radius:16px; font-size:13.5px; line-height:1.5; }
        .hp-msg.bot{ align-self:flex-start; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.07); border-bottom-left-radius:5px; }
        html[data-theme="light"] .hp-msg.bot{ background:rgba(15,23,42,0.04); border-color:rgba(15,23,42,0.07); }
        .hp-msg.me{ align-self:flex-end; background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8)); color:#fff; border-bottom-right-radius:5px; }
        .hp-quick{ display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
        .hp-chip{ border:1px solid var(--accent); color:var(--accent); background:var(--accent-soft,rgba(59,130,246,.14));
            border-radius:999px; padding:8px 13px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:inherit; }
        .hp-inbar{ display:flex; gap:8px; padding:10px 18px calc(14px + env(safe-area-inset-bottom)); border-top:1px solid rgba(255,255,255,0.07); }
        html[data-theme="light"] .hp-inbar{ border-top-color:rgba(15,23,42,0.07); }
        .hp-in{ flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:11px 14px; color:inherit; font-family:inherit; font-size:13.5px; }
        html[data-theme="light"] .hp-in{ background:rgba(15,23,42,0.04); border-color:rgba(15,23,42,0.08); }
        .hp-in:focus{ outline:none; border-color:var(--accent); }
        .hp-go{ border:none; border-radius:12px; width:44px; flex-shrink:0; background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8)); color:#fff; cursor:pointer; font-size:15px; }
        /* ---- Real manual ---- */
        .mn-lead{ font-size:13px; color:rgba(255,255,255,0.55); line-height:1.55; margin:2px 0 14px; }
        html[data-theme="light"] .mn-lead{ color:rgba(15,23,42,0.55); }
        .mn-toc{ display:flex; flex-wrap:wrap; gap:8px; margin-bottom:16px; }
        .mn-chip{ display:inline-flex; align-items:center; gap:7px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04);
            color:inherit; border-radius:12px; padding:8px 12px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; }
        html[data-theme="light"] .mn-chip{ border-color:rgba(15,23,42,0.1); background:rgba(15,23,42,0.03); }
        .mn-chip i{ color:var(--accent); font-size:12px; }
        .mn-sec{ padding:16px 0; border-top:1px solid rgba(255,255,255,0.07); scroll-margin-top:10px; }
        html[data-theme="light"] .mn-sec{ border-top-color:rgba(15,23,42,0.08); }
        .mn-h{ display:flex; align-items:center; gap:11px; margin-bottom:8px; }
        .mn-h .mn-ic{ width:34px; height:34px; border-radius:11px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
            background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8)); color:#fff; font-size:14px; box-shadow:0 6px 16px var(--accent-glow,rgba(37,99,235,.35)); }
        .mn-h .mn-t{ font-weight:800; font-size:15px; }
        .mn-intro{ font-size:13px; color:rgba(255,255,255,0.6); margin:0 0 10px 45px; line-height:1.5; }
        html[data-theme="light"] .mn-intro{ color:rgba(15,23,42,0.6); }
        .mn-steps{ list-style:none; counter-reset:mn; margin:0 0 0 45px; padding:0; display:flex; flex-direction:column; gap:9px; }
        .mn-steps li{ counter-increment:mn; position:relative; padding-left:32px; font-size:13.5px; line-height:1.5; color:rgba(255,255,255,0.85); }
        html[data-theme="light"] .mn-steps li{ color:rgba(15,23,42,0.85); }
        .mn-steps li::before{ content:counter(mn); position:absolute; left:0; top:-1px; width:22px; height:22px; border-radius:8px;
            background:var(--accent-soft,rgba(59,130,246,.16)); color:var(--accent); font-size:12px; font-weight:800; display:flex; align-items:center; justify-content:center; }
        .mn-tip{ display:flex; gap:9px; align-items:flex-start; margin:12px 0 0 45px; padding:10px 12px; border-radius:12px;
            background:var(--accent-soft,rgba(59,130,246,.12)); border:1px solid var(--accent); font-size:12.5px; line-height:1.5; }
        .mn-tip i{ color:var(--accent); margin-top:2px; }
        /* ---- Sidebar extras ---- */
        .sb-lang{ width:40px; height:32px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.04);
            color:rgba(255,255,255,0.6); font-family:inherit; font-weight:800; font-size:11px; cursor:pointer; letter-spacing:.05em; }
        html[data-theme="light"] .sb-lang{ border-color:rgba(15,23,42,0.1); background:rgba(15,23,42,0.03); color:rgba(15,23,42,0.6); }
        .sb-lang.on{ background:linear-gradient(135deg,var(--accent),var(--accent-d,#1d4ed8)); color:#fff; border-color:transparent; }
        .sb-install{ display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:10px; border:1px solid var(--accent);
            background:var(--accent-soft,rgba(59,130,246,.14)); color:var(--accent); font-family:inherit; font-weight:700; font-size:11px; cursor:pointer; }
        .sb-dot{ width:6px; height:6px; border-radius:50%; background:var(--accent); box-shadow:0 0 10px var(--accent); }
        /* ---- Burger menu (transparent, advanced) ---- */
        #menuBtn{ background:rgba(255,255,255,0.05) !important; backdrop-filter:blur(26px) saturate(1.5) !important;
            -webkit-backdrop-filter:blur(26px) saturate(1.5) !important; border:1px solid rgba(255,255,255,0.14) !important;
            box-shadow:0 8px 26px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12) !important; border-radius:15px !important;
            overflow:hidden; transition:transform .2s cubic-bezier(.16,1,.3,1), background .25s, border-color .25s; }
        #menuBtn:hover{ background:rgba(255,255,255,0.1) !important; border-color:rgba(255,255,255,0.24) !important; }
        #menuBtn:active{ transform:scale(.9); }
        #menuBtn i{ color:var(--accent); font-size:17px; }
        html[data-theme="light"] #menuBtn{ background:rgba(255,255,255,0.55) !important; border-color:rgba(15,23,42,0.1) !important; }
        /* ---- Light theme for editor pages (cv / kontrata / kerkesa) ---- */
        html[data-theme="light"] .editor{ background:rgba(255,255,255,0.92) !important; border-right-color:rgba(15,23,42,0.08) !important; }
        html[data-theme="light"] .preview{ background:#eceff4 !important; }
        html[data-theme="light"] .glass-card{ background:rgba(15,23,42,0.03) !important; border-color:rgba(15,23,42,0.07) !important; }
        html[data-theme="light"] .section-label{ color:rgba(15,23,42,0.5) !important; }
        html[data-theme="light"] .input{ background:rgba(15,23,42,0.04) !important; color:#0b1220 !important; }
        html[data-theme="light"] .input::placeholder{ color:rgba(15,23,42,0.4) !important; }
        html[data-theme="light"] .kind-btn{ color:#0b1220; }
        html[data-theme="light"] .art-row, html[data-theme="light"] .dyn-row{ border-top-color:rgba(15,23,42,0.06) !important; }
        html[data-theme="light"] .action-bar{ background:linear-gradient(to top, rgba(255,255,255,0.98) 60%, rgba(255,255,255,0)) !important; border-top-color:rgba(15,23,42,0.08) !important; }
        @media (max-width:1023px){ #bonecv-help .hp-panel{ width:100%; } .mn-intro,.mn-steps,.mn-tip{ margin-left:0; } }`;
        document.head.appendChild(st);
    }

    /* ============================================================
     * BOTTOM NAVIGATION + CREATE SHEET (Apple-style, mobile)
     * ============================================================ */
    function mountBottomNav(active) {
        const old = document.getElementById('bonecv-bottomnav');
        if (old) old.remove();
        const tabs = [
            { id: 'index', href: 'index.html', icon: 'fa-house', label: t('nav.home') },
            { id: 'cv', href: 'cv.html', icon: 'fa-id-badge', label: t('nav.cv') },
            { id: 'arkiva', href: 'arkiva.html', icon: 'fa-box-archive', label: t('nav.arkiva') },
            { id: 'cilesimet', href: 'cilesimet.html', icon: 'fa-sliders', label: t('nav.cilesimet') }
        ];
        const item = it => `<a href="${it.href}" class="bn-item ${active === it.id ? 'active' : ''}" aria-label="${escapeHTML(it.label)}"><i class="fa-solid ${it.icon}"></i><span>${escapeHTML(it.label)}</span><span class="bn-dot"></span></a>`;
        const nav = document.createElement('div');
        nav.id = 'bonecv-bottomnav';
        nav.setAttribute('role', 'navigation');
        nav.innerHTML = `<div class="bn-bar">${tabs.slice(0, 2).map(item).join('')}<button class="bn-fab" id="bnFab" type="button" aria-label="${escapeHTML(t('bottom.create'))}"><i class="fa-solid fa-plus"></i></button>${tabs.slice(2).map(item).join('')}</div>`;
        document.body.appendChild(nav);
        document.getElementById('bnFab').addEventListener('click', openCreateSheet);
        document.addEventListener('bonecv:lang', () => mountBottomNav(active), { once: true });
    }

    function openCreateSheet() {
        const old = document.getElementById('bonecv-sheet');
        if (old) old.remove();
        const opts = [
            { href: 'cv.html', icon: 'fa-id-badge', c: '59,130,246', t: t('sheet.cv'), d: t('sheet.cv_d') },
            { href: 'kontrata.html', icon: 'fa-file-signature', c: '16,185,129', t: t('sheet.kontrata'), d: t('sheet.kontrata_d') },
            { href: 'kerkesa.html', icon: 'fa-envelope-open-text', c: '245,158,11', t: t('sheet.kerkesa'), d: t('sheet.kerkesa_d') }
        ];
        const sheet = document.createElement('div');
        sheet.id = 'bonecv-sheet';
        sheet.setAttribute('role', 'dialog');
        sheet.innerHTML = `<div class="sh-backdrop"></div><div class="sh-panel">
            <div class="sh-grabber"></div>
            <div class="sh-title">${escapeHTML(t('sheet.title'))}</div>
            <div class="sh-sub">${escapeHTML(t('sheet.subtitle'))}</div>
            ${opts.map(o => `<a href="${o.href}" class="sh-opt"><span class="sh-ic" style="background:rgba(${o.c},0.15);color:rgb(${o.c});border:1px solid rgba(${o.c},0.25)"><i class="fa-solid ${o.icon}"></i></span><span><span class="sh-t">${escapeHTML(o.t)}</span><span class="sh-d">${escapeHTML(o.d)}</span></span></a>`).join('')}
        </div>`;
        document.body.appendChild(sheet);
        const close = () => { sheet.classList.remove('open'); setTimeout(() => sheet.remove(), 380); };
        sheet.querySelector('.sh-backdrop').addEventListener('click', close);
        requestAnimationFrame(() => sheet.classList.add('open'));
    }

    /* ============================================================
     * BOOT — one call per page wires the whole chrome
     * ============================================================ */
    function boot(page) {
        applyTheme();
        try {
            matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
                if ((getSettings().theme || 'dark') === 'auto') applyTheme();
            });
        } catch (e) {}
        applyI18n(document);
        mountHelp();
        attachMechanics();
        document.addEventListener('bonecv:settings', applyTheme);
        initPWA();
    }

    /* ============================================================
     * HELP CENTER — Manual + local Assistant (offline, rule-based)
     * ============================================================ */
    const HELP = {
        sq: {
            manual: [
                { icon: 'fa-rocket', title: 'Fillimi i shpejtë', intro: 'Krijo dokumentin tënd të parë në pak hapa.', steps: [
                    'Hap menynë anësore me butonin ☰ (majtas lart) — në desktop është gjithmonë e dukshme.',
                    'Kliko "Krijo dokument" ose zgjidh një kategori: CV, Kontrata ose Kërkesa.',
                    'Plotëso fushat — preview-ja përditësohet në kohë reale.',
                    'Shtyp Printo dhe zgjidh "Ruaj si PDF" për ta eksportuar.',
                    'Dokumenti ruhet vetvetiu në Arkivë.'
                ], tip: 'Vendos fillimisht profilin te Cilësimet që të dhënat të para-plotësohen.' },
                { icon: 'fa-id-badge', title: 'Krijo një CV', intro: 'Një CV profesionale me preview live.', steps: [
                    'Hap "CV" nga menyja.',
                    'Plotëso të dhënat personale, kontaktin dhe foton.',
                    'Shto përvojën, edukimin dhe aftësitë.',
                    'Zgjidh stilin/template që të përfaqëson më mirë.',
                    'Kontrollo preview-n dhe printo në format A4.'
                ], tip: 'Mbaje CV-n të pastër dhe, kur mundesh, në një faqe.' },
                { icon: 'fa-file-signature', title: 'Krijo një Kontratë', intro: 'Kontrata ligjore me nene standarde.', steps: [
                    'Hap "Kontrata" nga menyja.',
                    'Zgjidh llojin: pune, shërbimi ose bashkëpunimi.',
                    'Plotëso palët, objektin dhe kushtet.',
                    'Rishiko nenet ligjore standarde (të para-plotësuara).',
                    'Printo ose eksporto për nënshkrim.'
                ], tip: 'Kontrollo me kujdes emrat dhe datat para nënshkrimit.' },
                { icon: 'fa-envelope-open-text', title: 'Krijo një Kërkesë', intro: 'Letra zyrtare për institucione dhe kompani.', steps: [
                    'Hap "Kërkesa" nga menyja.',
                    'Zgjidh marrësin (institucion ose kompani).',
                    'Shkruaj subjektin dhe përmbajtjen.',
                    'Struktura formale gjenerohet automatikisht.',
                    'Printo ose ruaj si PDF.'
                ], tip: 'Ji i qartë dhe konciz në subjekt për efekt më të mirë.' },
                { icon: 'fa-box-archive', title: 'Arkiva & redaktimi', intro: 'Të gjitha dokumentet në një vend.', steps: [
                    'Hap "Arkiva" për të parë çdo dokument të ruajtur.',
                    'Kliko një dokument për ta hapur dhe redaktuar.',
                    'Ruaj ndryshimet — përditësohen menjëherë.',
                    'Fshi dokumentet që nuk të duhen.'
                ], tip: 'Arkiva funksionon plotësisht edhe pa internet.' },
                { icon: 'fa-file-pdf', title: 'Eksport, Printim & PDF', intro: 'Merr dokumentin gati për dorëzim.', steps: [
                    'Hap dokumentin që dëshiron.',
                    'Shtyp butonin Printo.',
                    'Në dritaren e printimit zgjidh "Ruaj si PDF".',
                    'Përcakto format A4 dhe margjinat.',
                    'Ruaj skedarin në pajisje.'
                ], tip: 'Për pamje më të pastër, çaktivizo headers/footers të shfletuesit.' },
                { icon: 'fa-cloud-arrow-down', title: 'Backup & Rikthim', intro: 'Ruaj dhe rikthe të gjitha të dhënat.', steps: [
                    'Shko te Cilësimet → Eksporto (Backup).',
                    'Shkarkohet një skedar JSON me gjithçka.',
                    'Ruaje skedarin në një vend të sigurt.',
                    'Për rikthim: Cilësimet → Importo dhe zgjidh skedarin.'
                ], tip: 'Bëj një backup para se të pastrosh ose fshish të dhënat.' },
                { icon: 'fa-sliders', title: 'Gjuha, Tema & Qasshmëria', intro: 'Përshtate boneCV sipas teje.', steps: [
                    'Cilësimet → Gjuha: Shqip ose Anglisht.',
                    'Pamja → Tema: e errët, e çelët ose automatike.',
                    'Zgjidh ngjyrën kryesore që preferon.',
                    'Rregullo madhësinë e tekstit dhe zvogëlimin e lëvizjeve.'
                ], tip: 'Të gjitha ndryshimet zbatohen menjëherë, në kohë reale.' },
                { icon: 'fa-wifi', title: 'Offline & Instalim', intro: 'Përdore si aplikacion të vërtetë.', steps: [
                    'Hape aplikacionin një herë me internet.',
                    'Kliko banner-in "Instalo" ose menynë e shfletuesit → "Add to Home Screen".',
                    'Hape nga ekrani kryesor si aplikacion.',
                    'Përdore edhe kur nuk ke lidhje.'
                ], tip: 'Pas instalimit, boneCV hapet menjëherë, pa shfletues.' },
                { icon: 'fa-shield-halved', title: 'Privatësia & Siguria', intro: 'Të dhënat e tua, vetëm te ti.', steps: [
                    'Të dhënat ruhen vetëm në pajisjen tënde.',
                    'Nuk ka server, llogari apo gjurmim.',
                    'Inputet sanitizohen automatikisht për siguri.',
                    'Për t\'i fshirë të gjitha: Cilësimet → Fshi gjithçka.'
                ], tip: 'Eksporto një backup para fshirjes totale.' }
            ],
            qa: [
                { q: 'Si krijoj një CV?', a: 'Hap "CV" nga menyja ose butoni +, plotëso fushat dhe shiko preview-n live. Në fund shtyp Printo → Ruaj si PDF.', k: ['cv', 'si bej cv', 'krijo cv'] },
                { q: 'Si e ruaj një dokument?', a: 'Çdo dokument ruhet automatikisht në Arkivë ndërsa e krijon. E gjen te seksioni "Arkiva".', k: ['ruaj', 'ruajtje', 'save', 'arkiv'] },
                { q: 'Si e eksportoj në PDF?', a: 'Përdor butonin Printo brenda dokumentit dhe zgjidh "Ruaj si PDF" në dritaren e printimit.', k: ['pdf', 'eksport', 'printo', 'print'] },
                { q: 'A punon pa internet?', a: 'Po. Pas hapjes së parë, gjithçka punon plotësisht offline — krijim, ruajtje, eksport dhe printim.', k: ['offline', 'internet', 'lidhje'] },
                { q: 'Si e instaloj si aplikacion?', a: 'Kur shfaqet banner-i "Instalo", shtype. Ose nga menyja e shfletuesit zgjidh "Add to Home Screen".', k: ['instalo', 'instalim', 'install', 'aplikacion', 'app'] },
                { q: 'Si bëj backup?', a: 'Shko te Cilësimet → Eksporto (Backup) për të shkarkuar një skedar JSON. Rikthe me Importo.', k: ['backup', 'kopje', 'import'] },
                { q: 'Si ndryshoj gjuhën ose temën?', a: 'Te Cilësimet → Gjuha dhe Pamja. Ndryshimet aplikohen menjëherë.', k: ['gjuh', 'tema', 'temen', 'light', 'dark', 'anglisht', 'ngjyr'] },
                { q: 'A ruhen të dhënat në server?', a: 'Jo. Të gjitha të dhënat ruhen vetëm lokalisht në pajisjen tënde. S\'ka server.', k: ['server', 'privatesi', 'privat', 'siguri'] },
                { q: 'Si fshij gjithçka?', a: 'Te Cilësimet → Zona me rrezik → "Fshi gjithçka". Kujdes: veprimi nuk kthehet.', k: ['fshij', 'fshi', 'delete', 'pastro'] }
            ]
        },
        en: {
            manual: [
                { icon: 'fa-rocket', title: 'Quick start', intro: 'Create your first document in a few steps.', steps: [
                    'Open the side menu with the ☰ button (top left) — on desktop it is always visible.',
                    'Click "Create document" or pick a category: CV, Contracts or Requests.',
                    'Fill in the fields — the preview updates in real time.',
                    'Press Print and choose "Save as PDF" to export.',
                    'The document is saved to the Archive automatically.'
                ], tip: 'Set up your profile in Settings first so fields are pre-filled.' },
                { icon: 'fa-id-badge', title: 'Create a CV', intro: 'A professional CV with live preview.', steps: [
                    'Open "CV" from the menu.',
                    'Fill in personal details, contact and photo.',
                    'Add experience, education and skills.',
                    'Choose the template that represents you best.',
                    'Check the preview and print in A4.'
                ], tip: 'Keep your CV clean and, when possible, to one page.' },
                { icon: 'fa-file-signature', title: 'Create a Contract', intro: 'Legal contracts with standard clauses.', steps: [
                    'Open "Contracts" from the menu.',
                    'Choose the type: employment, service or partnership.',
                    'Fill in the parties, subject and terms.',
                    'Review the standard legal clauses (pre-filled).',
                    'Print or export for signing.'
                ], tip: 'Double-check names and dates before signing.' },
                { icon: 'fa-envelope-open-text', title: 'Create a Request', intro: 'Official letters for institutions and companies.', steps: [
                    'Open "Requests" from the menu.',
                    'Choose the recipient (institution or company).',
                    'Write the subject and the body.',
                    'The formal structure is generated automatically.',
                    'Print or save as PDF.'
                ], tip: 'Be clear and concise in the subject for best effect.' },
                { icon: 'fa-box-archive', title: 'Archive & editing', intro: 'All your documents in one place.', steps: [
                    'Open "Archive" to see every saved document.',
                    'Click a document to open and edit it.',
                    'Save changes — they update instantly.',
                    'Delete the documents you no longer need.'
                ], tip: 'The Archive works fully offline.' },
                { icon: 'fa-file-pdf', title: 'Export, Print & PDF', intro: 'Get your document ready to submit.', steps: [
                    'Open the document you want.',
                    'Press the Print button.',
                    'In the print dialog choose "Save as PDF".',
                    'Set A4 format and margins.',
                    'Save the file to your device.'
                ], tip: 'For a cleaner look, turn off the browser headers/footers.' },
                { icon: 'fa-cloud-arrow-down', title: 'Backup & Restore', intro: 'Save and restore all your data.', steps: [
                    'Go to Settings → Export (Backup).',
                    'A JSON file with everything is downloaded.',
                    'Keep the file in a safe place.',
                    'To restore: Settings → Import and pick the file.'
                ], tip: 'Make a backup before you clear or delete data.' },
                { icon: 'fa-sliders', title: 'Language, Theme & Accessibility', intro: 'Tailor boneCV to you.', steps: [
                    'Settings → Language: Albanian or English.',
                    'Appearance → Theme: dark, light or auto.',
                    'Pick your preferred accent color.',
                    'Adjust text size and reduce motion.'
                ], tip: 'All changes apply instantly, in real time.' },
                { icon: 'fa-wifi', title: 'Offline & Install', intro: 'Use it as a real app.', steps: [
                    'Open the app once while online.',
                    'Tap the "Install" banner or the browser menu → "Add to Home Screen".',
                    'Open it from your home screen as an app.',
                    'Use it even without a connection.'
                ], tip: 'After installing, boneCV opens instantly, without a browser.' },
                { icon: 'fa-shield-halved', title: 'Privacy & Security', intro: 'Your data, only yours.', steps: [
                    'Data is stored only on your device.',
                    'No server, account or tracking.',
                    'Inputs are sanitized automatically for safety.',
                    'To erase everything: Settings → Delete everything.'
                ], tip: 'Export a backup before a full wipe.' }
            ],
            qa: [
                { q: 'How do I create a CV?', a: 'Open "CV" from the menu or the + button, fill the fields and watch the live preview. Finally press Print → Save as PDF.', k: ['cv', 'resume', 'create cv'] },
                { q: 'How do I save a document?', a: 'Every document is saved to the Archive automatically as you build it. Find it in the "Archive" section.', k: ['save', 'store', 'archive'] },
                { q: 'How do I export to PDF?', a: 'Use the Print button inside the document and choose "Save as PDF" in the print dialog.', k: ['pdf', 'export', 'print'] },
                { q: 'Does it work offline?', a: 'Yes. After the first visit, everything works fully offline — create, save, export and print.', k: ['offline', 'internet', 'connection'] },
                { q: 'How do I install it as an app?', a: 'When the "Install" banner appears, tap it. Or from the browser menu choose "Add to Home Screen".', k: ['install', 'app', 'home screen'] },
                { q: 'How do I make a backup?', a: 'Go to Settings → Export (Backup) to download a JSON file. Restore it with Import.', k: ['backup', 'import', 'copy'] },
                { q: 'How do I change language or theme?', a: 'In Settings → Language and Appearance. Changes apply instantly.', k: ['language', 'theme', 'light', 'dark', 'color', 'english'] },
                { q: 'Is my data stored on a server?', a: 'No. All data is stored only locally on your device. There is no server.', k: ['server', 'privacy', 'private', 'security'] },
                { q: 'How do I delete everything?', a: 'In Settings → Danger zone → "Delete everything". Careful: this cannot be undone.', k: ['delete', 'wipe', 'clear'] }
            ]
        }
    };

    function assistantAnswer(query) {
        const norm = x => String(x || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const nq = norm(query);
        const qa = (HELP[getLang()] || HELP.sq).qa;
        for (const item of qa) for (const k of item.k) if (nq.includes(norm(k))) return item.a;
        for (const item of qa) if (norm(item.q).split(/\s+/).filter(w => w.length > 3).some(w => nq.includes(w))) return item.a;
        return t('help.assistant_fallback');
    }

    function mountHelp() {
        if (document.getElementById('bonecv-help-btn')) return;
        const btn = document.createElement('button');
        btn.id = 'bonecv-help-btn';
        btn.type = 'button';
        btn.setAttribute('aria-label', t('help.aria'));
        btn.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
        document.body.appendChild(btn);
        btn.addEventListener('click', openHelp);
        document.addEventListener('bonecv:lang', () => btn.setAttribute('aria-label', t('help.aria')));
    }

    function openHelp() {
        const old = document.getElementById('bonecv-help');
        if (old) old.remove();
        const H = HELP[getLang()] || HELP.sq;
        const wrap = document.createElement('div');
        wrap.id = 'bonecv-help';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.innerHTML = `<div class="hp-back"></div>
            <div class="hp-panel">
                <div class="hp-head">
                    <div class="hp-t">${escapeHTML(t('help.title'))}</div>
                    <button class="hp-x" type="button" aria-label="close">&times;</button>
                </div>
                <div class="hp-tabs">
                    <button class="hp-tab on" type="button" data-tab="manual">${escapeHTML(t('help.tab_manual'))}</button>
                    <button class="hp-tab" type="button" data-tab="assistant">${escapeHTML(t('help.tab_assistant'))}</button>
                </div>
                <div class="hp-body" id="hpBody"></div>
                <div class="hp-inbar" id="hpInbar" style="display:none;">
                    <input class="hp-in" id="hpIn" placeholder="${escapeHTML(t('help.assistant_ph'))}" aria-label="${escapeHTML(t('help.assistant_ph'))}">
                    <button class="hp-go" id="hpGo" type="button" aria-label="${escapeHTML(t('help.send'))}"><i class="fa-solid fa-arrow-up"></i></button>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        const body = wrap.querySelector('#hpBody');
        const inbar = wrap.querySelector('#hpInbar');
        const chat = [];

        function renderManual() {
            inbar.style.display = 'none';
            const secs = H.manual;
            const toc = `<div class="mn-toc">${secs.map((m, i) => `<button class="mn-chip" type="button" data-go="mns${i}"><i class="fa-solid ${m.icon}"></i> ${escapeHTML(m.title)}</button>`).join('')}</div>`;
            const sections = secs.map((m, i) => `<div class="mn-sec" id="mns${i}">
                <div class="mn-h"><span class="mn-ic"><i class="fa-solid ${m.icon}"></i></span><span class="mn-t">${escapeHTML(m.title)}</span></div>
                ${m.intro ? `<div class="mn-intro">${escapeHTML(m.intro)}</div>` : ''}
                <ol class="mn-steps">${(m.steps || []).map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ol>
                ${m.tip ? `<div class="mn-tip"><i class="fa-solid fa-lightbulb"></i><span>${escapeHTML(m.tip)}</span></div>` : ''}
            </div>`).join('');
            body.innerHTML = `<div class="mn-lead">${escapeHTML(t('help.manual_lead'))}</div>${toc}${sections}`;
            body.querySelectorAll('.mn-chip').forEach(c => c.addEventListener('click', () => {
                const el = body.querySelector('#' + c.dataset.go);
                if (el) body.scrollTo({ top: el.offsetTop - 6, behavior: 'smooth' });
            }));
        }
        function renderAssistant() {
            inbar.style.display = 'flex';
            if (!chat.length) chat.push({ who: 'bot', text: t('help.assistant_intro') });
            body.innerHTML = `<div class="hp-chat">${chat.map(m => `<div class="hp-msg ${m.who}">${escapeHTML(m.text)}</div>`).join('')}<div class="hp-quick">${H.qa.slice(0, 5).map((q, i) => `<button class="hp-chip" type="button" data-q="${i}">${escapeHTML(q.q)}</button>`).join('')}</div></div>`;
            body.querySelectorAll('.hp-chip').forEach(ch => ch.addEventListener('click', () => ask(H.qa[+ch.dataset.q].q)));
            body.scrollTop = body.scrollHeight;
        }
        function ask(text) {
            text = (text || '').trim();
            if (!text) return;
            chat.push({ who: 'me', text });
            chat.push({ who: 'bot', text: assistantAnswer(text) });
            renderAssistant();
        }
        wrap.querySelectorAll('.hp-tab').forEach(tb => tb.addEventListener('click', () => {
            wrap.querySelectorAll('.hp-tab').forEach(x => x.classList.toggle('on', x === tb));
            tb.dataset.tab === 'manual' ? renderManual() : renderAssistant();
        }));
        wrap.querySelector('#hpGo').addEventListener('click', () => { const i = wrap.querySelector('#hpIn'); ask(i.value); i.value = ''; });
        wrap.querySelector('#hpIn').addEventListener('keydown', e => { if (e.key === 'Enter') { ask(e.target.value); e.target.value = ''; } });
        const close = () => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 420); };
        wrap.querySelector('.hp-back').addEventListener('click', close);
        wrap.querySelector('.hp-x').addEventListener('click', close);
        renderManual();
        requestAnimationFrame(() => wrap.classList.add('open'));
    }

    /* ============================================================
     * MECHANICS — ripple, press feedback, scroll-aware nav
     * ============================================================ */
    function attachMechanics() {
        if (window.__bonecvMech) return;
        window.__bonecvMech = true;
        const SEL = '.btn, .bonecv-tap, .qa, .sh-opt, .nav-link, .seg button, .bn-item, .bn-fab, .hp-chip, .hp-go';
        document.addEventListener('pointerdown', e => {
            const el = e.target.closest(SEL);
            if (!el) return;
            el.classList.add('bonecv-press');
            if (getSettings().reduceMotion) return;
            const r = el.getBoundingClientRect();
            const size = Math.max(r.width, r.height);
            const rip = document.createElement('span');
            rip.className = 'bonecv-ripple';
            rip.style.width = rip.style.height = size + 'px';
            rip.style.left = (e.clientX - r.left - size / 2) + 'px';
            rip.style.top = (e.clientY - r.top - size / 2) + 'px';
            el.appendChild(rip);
            setTimeout(() => rip.remove(), 620);
        }, { passive: true });
        const release = () => document.querySelectorAll('.bonecv-press').forEach(el => el.classList.remove('bonecv-press'));
        document.addEventListener('pointerup', release);
        document.addEventListener('pointercancel', release);
    }

    function initNavScroll() {
        let lastY = window.scrollY || 0, ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const nav = document.getElementById('bonecv-bottomnav');
                const y = window.scrollY || 0;
                if (nav) {
                    if (y > lastY + 8 && y > 120) nav.classList.add('nav-hidden');
                    else if (y < lastY - 8) nav.classList.remove('nav-hidden');
                }
                lastY = y;
                ticking = false;
            });
        }, { passive: true });
    }

    /* ---------- Public API ---------- */
    global.bonecv = {
        // settings
        getSettings, setSettings,
        // archive
        getArchive, setArchive, saveToArchive, updateArchiveEntry, deleteArchiveEntry, clearArchive, getArchiveStats,
        // edit handoff
        setEditPayload, consumeEditPayload,
        // import/export
        exportAllData, importAllData, clearAllData,
        // formatters / ui
        formatDateSq, formatDateTimeSq, toast, confirmDialog, attachMouseGlow,
        // sidebar
        getSidebarHTML, getSidebarCSS, mountSidebar,
        // pwa
        initPWA, canInstall, promptInstall, showInstallBanner,
        // i18n
        t, getLang, setLang, applyI18n, I18N,
        // theme
        applyTheme, resolveTheme, ACCENT_PRESETS, shade, hexA,
        // navigation / boot
        mountBottomNav, openCreateSheet, boot,
        // help / mechanics
        mountHelp, openHelp, attachMechanics,
        escapeHTML
    };
    // Backwards-compat global helper
    global.saveToArchive = saveToArchive;
})(window);
/* boneCV Pro — master.js end (v1.1.0) */
