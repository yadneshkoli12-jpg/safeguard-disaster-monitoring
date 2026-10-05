const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'app', 'globals.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Fix weather card min-height
css = css.replace(/min-height:\s*280px;/g, 'min-height: 220px;');

// 2. Hide mobile bottom nav (we will remove it from TSX, but clean up CSS too)
css = css.replace(/\.mobile-bottom-nav\s*\{[\s\S]*?\}/g, '/* .mobile-bottom-nav removed */');

// 3. Increase font sizes for better readability
// We'll scale up font sizes by 2px, but cap very large ones if needed.
// We target `font-size: Xpx;`
css = css.replace(/font-size:\s*(\d+)px;/g, (match, p1) => {
    let size = parseInt(p1, 10);
    
    // Increase size for readability
    if (size >= 7 && size <= 10) {
        size += 2; // e.g. 8px -> 10px, 9px -> 11px
    } else if (size > 10 && size <= 14) {
        size += 2; // e.g. 11px -> 13px, 14px -> 16px
    } else if (size > 14 && size <= 18) {
        size += 2; // 15px -> 17px
    }
    // Very large sizes (like 54px, 70px) we leave alone to avoid breaking layouts too much, 
    // or maybe add 2px as well.
    else if (size > 18 && size <= 30) {
        size += 2;
    }
    
    return `font-size: ${size}px;`;
});

// Also fix some specific overlapping issues in mobile header
// hamburger, logo, search, user, refresh must not overlap.
// Topbar right gap and search box width adjustments for mobile.
css = css.replace(/\.location-search-wrap\s*\{\s*width:\s*clamp\(105px,\s*32vw,\s*195px\);\s*\}/, '.location-search-wrap { width: clamp(90px, 25vw, 160px); }');
css = css.replace(/\.location-search-wrap\s*\{\s*width:\s*clamp\(95px,\s*30vw,\s*136px\);\s*\}/, '.location-search-wrap { width: clamp(80px, 20vw, 120px); }');


// Add auth styles
const authStyles = `
/* ==== AUTHENTICATION ==== */
.auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; position: relative; overflow: hidden; background: #0c1524; color: #fff; }
.auth-backdrop { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.auth-backdrop-orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; }
.auth-orb-1 { width: 40vw; height: 40vw; top: -10vw; left: -10vw; background: #274b7b; }
.auth-orb-2 { width: 30vw; height: 30vw; bottom: -5vw; right: -5vw; background: #1a365d; }
.auth-orb-3 { width: 20vw; height: 20vw; top: 40%; left: 60%; background: #2b4c7e; }
.auth-container { position: relative; z-index: 1; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 24px; }
.auth-brand { display: flex; align-items: center; justify-content: center; gap: 12px; }
.auth-brand-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 12px; background: linear-gradient(135deg, #2b5894, #1a365d); color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.auth-brand div { display: flex; flex-direction: column; }
.auth-brand strong { font-size: 20px; font-weight: 700; letter-spacing: 0.1em; color: #fff; }
.auth-brand small { font-size: 11px; color: #93a4bd; letter-spacing: 0.05em; }
.auth-card { background: #152336; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px 24px; box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
.auth-tabs { display: flex; gap: 8px; margin-bottom: 24px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 12px; }
.auth-tab { flex: 1; padding: 10px; border: none; background: transparent; color: #8a9ba8; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.auth-tab-active { background: #2b5894; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.auth-form { display: flex; flex-direction: column; gap: 20px; }
.auth-field-group { display: flex; flex-direction: column; gap: 16px; }
.auth-field-group-row { flex-direction: row; gap: 12px; }
.auth-field-group-row > .auth-field { flex: 1; min-width: 0; }
.auth-field { display: flex; flex-direction: column; gap: 8px; }
.auth-field > span { font-size: 13px; font-weight: 500; color: #b0c0d0; display: flex; justify-content: space-between; }
.auth-field > span em { font-style: normal; font-size: 11px; color: #efb6a8; }
.auth-field input, .auth-field textarea { width: 100%; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; background: rgba(0,0,0,0.2); color: #fff; font-size: 14px; transition: all 0.2s; }
.auth-field input:focus, .auth-field textarea:focus { border-color: #4a7ab5; outline: none; background: rgba(0,0,0,0.3); }
.auth-field input[aria-invalid="true"] { border-color: #ae5450; }
.auth-password-wrap { position: relative; }
.auth-password-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: transparent; border: none; color: #8a9ba8; cursor: pointer; padding: 4px; display: grid; place-items: center; }
.auth-password-toggle:hover { color: #fff; }
.auth-field-error { font-size: 12px; color: #efb6a8; display: flex; align-items: center; gap: 4px; margin-top: 4px; }
.auth-global-error { background: rgba(174, 84, 80, 0.1); border: 1px solid rgba(174, 84, 80, 0.3); color: #efb6a8; padding: 12px; border-radius: 10px; font-size: 13px; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
.auth-submit { margin-top: 8px; padding: 14px; font-size: 15px; font-weight: 600; display: flex; justify-content: center; align-items: center; gap: 8px; }
.auth-switch-prompt { text-align: center; font-size: 13px; color: #8a9ba8; margin-top: 16px; }
.auth-switch-link { background: transparent; border: none; color: #4a7ab5; font-weight: 600; cursor: pointer; padding: 0; }
.auth-switch-link:hover { color: #6ba0e5; text-decoration: underline; }
.auth-section-label { font-size: 12px; font-weight: 700; color: #72839e; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }
.auth-optional-label { font-size: 10px; color: #5a6b82; font-weight: 500; }
.auth-footer-note { text-align: center; font-size: 11px; color: #5a6b82; line-height: 1.5; padding: 0 20px; }
.auth-loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #0c1524; gap: 20px; }
.auth-loading-brand { width: 64px; height: 64px; display: grid; place-items: center; border-radius: 16px; background: linear-gradient(135deg, #2b5894, #1a365d); color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.3); animation: pulse 2s infinite; }
.auth-loading-text { font-size: 15px; font-weight: 600; color: #93a4bd; letter-spacing: 0.05em; }
.spin-icon { animation: spin 1s linear infinite; }
@keyframes pulse { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(43, 88, 148, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(43, 88, 148, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(43, 88, 148, 0); } }

/* Account profile grid */
.account-profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; text-align: left; background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e6ebf2; }
.account-profile-grid > div { display: flex; flex-direction: column; gap: 4px; }
.account-profile-grid > div > span { font-size: 11px; color: #7b899c; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
.account-profile-grid > div > strong { font-size: 14px; color: #2d3d54; }
.account-profile-grid > div:first-child { grid-column: span 2; }
`;

if (!css.includes('==== AUTHENTICATION ====')) {
    css += '\n' + authStyles;
}

fs.writeFileSync(cssPath, css);
console.log("CSS updated!");
