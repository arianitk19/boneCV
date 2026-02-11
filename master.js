// master.js - Autoriteti Qendror i boneCV

/**
 * 1. APLIKIMI I SETTINGS (Tema dhe Emri)
 * Ky funksion kontrollon nëse jemi në Dark apo Light mode
 * dhe përditëson emrin e përdoruesit në të gjithë ndërfaqen.
 */
function applyGlobalSettings() {
    const theme = localStorage.getItem('theme');
    const html = document.documentElement;

    // Menaxhimi i Temës
    if (theme === 'light') {
        html.style.filter = "invert(1) hue-rotate(180deg)";
        // Re-invert elementet që duhen ruajtur origjinale (ikonat dhe imazhet)
        document.querySelectorAll('img, i, .fa-solid, .fa-regular, .no-invert, .swatch, iframe').forEach(el => {
            el.style.filter = "invert(1) hue-rotate(180deg)";
        });
    } else {
        html.style.filter = "none";
        document.querySelectorAll('img, i, .fa-solid, .fa-regular, .no-invert, .swatch, iframe').forEach(el => {
            el.style.filter = "none";
        });
    }

    // Menaxhimi i Emrit të Përdoruesit
    const savedName = localStorage.getItem('perdoruesi') || "User Pro";
    // Kërkon për çdo element që ka klasën 'user-name-display' dhe ia ndryshon tekstin
    document.querySelectorAll('.user-name-display').forEach(el => {
        el.innerText = savedName;
    });
}

/**
 * 2. RUAJTJA NË ARKIVË
 * Funksion universal që thirret nga CV, Kontratat dhe Kërkesat.
 */
window.saveToArchive = function(type, title) {
    let arkiva = JSON.parse(localStorage.getItem('boneCV_Archive')) || [];
    let dokumentiRi = {
        id: Date.now(),
        title: title || "Dokument pa emër",
        type: type,
        date: new Date().toLocaleDateString('sq-AL')
    };
    
    arkiva.unshift(dokumentiRi); // Shtoje në fillim të listës
    localStorage.setItem('boneCV_Archive', JSON.stringify(arkiva));
    console.log("Dokumenti u ruajt me sukses në Arkivë!");
};

/**
 * 3. AUTO-EKZEKUTIMI
 * Sapo faqja të ngarkohet, aplikohen rregullat.
 */
document.addEventListener('DOMContentLoaded', applyGlobalSettings);

// Dëgjues i ndryshimeve në memorie (nëse ndryshon tema në një tab tjetër)
window.addEventListener('storage', (e) => {
    if (e.key === 'theme' || e.key === 'perdoruesi') {
        applyGlobalSettings();
    }
});