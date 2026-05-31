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
        theme: 'dark',
        accent: '#2563eb'
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

    /* ---------- Sidebar HTML (shared) ---------- */
    function getSidebarHTML(activePage) {
        const s = getSettings();
        const items = [
            { id: 'index', label: 'Kreu', icon: 'fa-house', href: 'index.html' },
            { id: 'cv', label: 'CV Elite', icon: 'fa-id-badge', href: 'cv.html' },
            { id: 'kontrata', label: 'Kontrata Pro', icon: 'fa-file-signature', href: 'kontrata.html' },
            { id: 'kerkesa', label: 'Kërkesa Master', icon: 'fa-envelope-open-text', href: 'kerkesa.html' },
            { id: 'arkiva', label: 'Arkiva Reale', icon: 'fa-box-archive', href: 'arkiva.html' },
            { id: 'cilesimet', label: 'Cilësimet', icon: 'fa-sliders', href: 'cilesimet.html' }
        ];
        const initial = (s.name || 'P').charAt(0).toUpperCase();
        const photoEl = s.photo
            ? `<img src="${s.photo}" alt="" class="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10">`
            : `<div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-lg">${initial}</div>`;

        return `
        <div class="flex flex-col h-full">
            <div class="px-6 pt-6 pb-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <i class="fa-solid fa-cube text-blue-400"></i>
                </div>
                <div>
                    <div class="font-extrabold tracking-tight">boneCV</div>
                    <div class="text-[10px] uppercase tracking-[0.25em] text-white/40">Pro Suite</div>
                </div>
            </div>
            <div class="mx-4 mb-4 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center gap-3">
                ${photoEl}
                <div class="min-w-0">
                    <div class="font-semibold truncate" data-bonecv-name>${escapeHTML(s.name)}</div>
                    <div class="text-xs text-white/50 truncate" data-bonecv-prof>${escapeHTML(s.profession)}</div>
                </div>
            </div>
            <nav class="px-3 flex-1 space-y-1 overflow-y-auto">
                ${items.map(it => `
                    <a href="${it.href}" data-page="${it.id}" class="nav-link group flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${activePage === it.id ? 'is-active' : ''}">
                        <i class="fa-solid ${it.icon} w-5 text-center"></i>
                        <span class="font-medium">${it.label}</span>
                    </a>
                `).join('')}
            </nav>
            <div class="px-6 py-4 text-[11px] text-white/30 border-t border-white/[0.06]">
                © ${new Date().getFullYear()} boneCV Pro
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
        c.innerHTML = getSidebarHTML(activePage);
        // refresh on settings change
        document.addEventListener('bonecv:settings', () => {
            c.innerHTML = getSidebarHTML(activePage);
        });
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
        escapeHTML
    };
    // Backwards-compat global helper
    global.saveToArchive = saveToArchive;
})(window);
