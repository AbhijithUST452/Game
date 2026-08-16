/* ======================================================
   THE SCHRODINGER PARADOX — ui.js
   Screen flow, name capture, instructions, HUD, game over.
   Exposes window.SP.UI and window.SP.state
   ====================================================== */

   window.SP = window.SP || {};

   SP.state = {
     mode: 'solo',            // 'solo' | 'multiplayer'
     soloRole: 'schrodinger',  // role the human plays in solo mode
     swapRoles: false,         // multiplayer: swap which keyset controls which role
     names: {
       schrodinger: 'SCHRODINGER',
       cat: 'THE CAT'
     }
   };
   
   SP.UI = (function () {
   
     function $(id) { return document.getElementById(id); }
   
     function showScreen(id) {
       document.querySelectorAll('.screen').forEach(function (el) {
         el.classList.remove('active');
       });
       $(id).classList.add('active');
     }
   
     function wireBackButtons() {
       document.querySelectorAll('[data-back]').forEach(function (btn) {
         btn.addEventListener('click', function () {
           showScreen(btn.getAttribute('data-back'));
         });
       });
     }
   
     function wireModeSelect() {
       $('btn-mode-solo').addEventListener('click', function () {
         SP.state.mode = 'solo';
         showScreen('screen-role');
       });
       $('btn-mode-multi').addEventListener('click', function () {
         SP.state.mode = 'multiplayer';
         prepareNameScreen();
         showScreen('screen-names');
       });
     }
   
     function wireRoleSelect() {
       $('btn-role-schrodinger').addEventListener('click', function () {
         SP.state.soloRole = 'schrodinger';
         prepareNameScreen();
         showScreen('screen-names');
       });
       $('btn-role-cat').addEventListener('click', function () {
         SP.state.soloRole = 'cat';
         prepareNameScreen();
         showScreen('screen-names');
       });
     }
   
     // Adjusts the name-capture form based on mode (solo needs one name, one AI label)
     function prepareNameScreen() {
       var fieldSchrodinger = $('field-schrodinger');
       var fieldCat = $('field-cat');
       var swapWrap = $('swap-toggle-wrap');
       var inputSchrodinger = $('input-name-schrodinger');
       var inputCat = $('input-name-cat');
   
       // reset previous validation state
       fieldSchrodinger.classList.remove('invalid');
       fieldCat.classList.remove('invalid');
   
       if (SP.state.mode === 'multiplayer') {
         fieldSchrodinger.style.display = '';
         fieldCat.style.display = '';
         swapWrap.style.display = 'flex';
         inputSchrodinger.placeholder = 'Enter name';
         inputCat.placeholder = 'Enter name';
       } else {
         swapWrap.style.display = 'none';
         if (SP.state.soloRole === 'schrodinger') {
           fieldSchrodinger.style.display = '';
           fieldCat.style.display = 'none';
           inputSchrodinger.placeholder = 'Enter name';
         } else {
           fieldSchrodinger.style.display = 'none';
           fieldCat.style.display = '';
           inputCat.placeholder = 'Enter name';
         }
       }
     }
   
     function validateField(inputEl, fieldEl) {
       var value = inputEl.value.trim();
       if (value.length === 0) {
         fieldEl.classList.add('invalid');
         return null;
       }
       fieldEl.classList.remove('invalid');
       return value;
     }
   
     function wireNameForm() {
       $('form-names').addEventListener('submit', function (e) {
         e.preventDefault();
   
         var schrodingerNeeded = SP.state.mode === 'multiplayer' || SP.state.soloRole === 'schrodinger';
         var catNeeded = SP.state.mode === 'multiplayer' || SP.state.soloRole === 'cat';
   
         var schrodingerName = 'SCHRODINGER (AI)';
         var catName = 'THE CAT (AI)';
         var ok = true;
   
         if (schrodingerNeeded) {
           var v1 = validateField($('input-name-schrodinger'), $('field-schrodinger'));
           if (v1 === null) ok = false; else schrodingerName = v1.toUpperCase();
         }
         if (catNeeded) {
           var v2 = validateField($('input-name-cat'), $('field-cat'));
           if (v2 === null) ok = false; else catName = v2.toUpperCase();
         }
   
         if (!ok) return;
   
         SP.state.names.schrodinger = schrodingerName;
         SP.state.names.cat = catName;
         SP.state.swapRoles = $('chk-swap-roles').checked;
   
         buildInstructions();
         showScreen('screen-instructions');
       });
     }
   
     function buildInstructions() {
       var body = $('instructions-body');
       var html = '';
   
       html += '<h3>OBJECTIVE</h3><ul>';
       html += '<li><strong>SCHRODINGER</strong> charges and throws boxes over the crates to hit <strong>THE CAT</strong>. Each hit scores points.</li>';
       html += '<li><strong>THE CAT</strong> stays alive and unobserved, evading incoming boxes and dashing through the grid.</li>';
       html += '</ul>';
   
       html += '<h3>CONTROLS</h3><ul>';
   
       if (SP.state.mode === 'solo') {
         html += '<li>Move: <kbd>&uarr;</kbd><kbd>&darr;</kbd><kbd>&larr;</kbd><kbd>&rarr;</kbd></li>';
         html += '<li>Action: <kbd>SHIFT</kbd> — hold to charge a throw (Schrodinger) or tap to dash (Cat)</li>';
         html += '<li>You are playing as <strong>' + (SP.state.soloRole === 'schrodinger' ? 'SCHRODINGER' : 'THE CAT') + '</strong>. The other side is controlled by an adaptive AI.</li>';
       } else {
         var arrowsRole = SP.state.swapRoles ? 'SCHRODINGER' : 'THE CAT';
         var wasdRole = SP.state.swapRoles ? 'THE CAT' : 'SCHRODINGER';
         html += '<li><strong>' + wasdRole + '</strong> — Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>, Action: <kbd>SPACE</kbd></li>';
         html += '<li><strong>' + arrowsRole + '</strong> — Move: <kbd>&uarr;</kbd><kbd>&darr;</kbd><kbd>&larr;</kbd><kbd>&rarr;</kbd>, Action: <kbd>ENTER</kbd></li>';
       }
       html += '</ul>';
   
       html += '<h3>QUANTUM MECHANICS</h3><ul>';
       html += '<li><strong>Charge Throw</strong> — the longer the action key is held (Schrodinger), the farther and faster the box travels.</li>';
       html += '<li><strong>Superposition Dash</strong> — the Cat can dash a short distance, leaving a fading decoy behind.</li>';
       html += '<li><strong>Observer Effect</strong> — if Schrodinger stands still for 1.5s, the Cat is briefly slowed.</li>';
       html += '<li>Collect glowing <strong>orbs</strong> for power-ups. Avoid the pulsing <strong>radioactive zones</strong> — they drain your score.</li>';
       html += '</ul>';
   
       body.innerHTML = html;
     }
   
     function wireStartGame() {
       $('btn-start-game').addEventListener('click', function () {
         applyHudLabels();
         showScreen('screen-game');
         SP.Game.start(getRunConfig());
       });
     }
   
     function getRunConfig() {
       return {
         mode: SP.state.mode,
         soloRole: SP.state.soloRole,
         swapRoles: SP.state.swapRoles,
         names: SP.state.names
       };
     }
   
     function applyHudLabels() {
       $('hud-schrodinger-name').textContent = SP.state.names.schrodinger;
       $('hud-cat-name').textContent = SP.state.names.cat;
       $('hud-schrodinger-score').textContent = '0';
       $('hud-cat-score').textContent = '0';
       $('hud-timer').textContent = '60';
     }
   
     function updateTimerDisplay(seconds) {
       $('hud-timer').textContent = String(seconds);
     }
   
     function updateScoreDisplay(schrodingerScore, catScore) {
       $('hud-schrodinger-score').textContent = String(Math.max(0, Math.round(schrodingerScore)));
       $('hud-cat-score').textContent = String(Math.max(0, Math.round(catScore)));
     }
   
     function flashObserver() {
       var el = $('observer-flash');
       el.classList.remove('active');
       // force reflow so the animation can restart
       void el.offsetWidth;
       el.classList.add('active');
     }
   
     function updateChargeMeter(pct) {
       $('charge-fill').style.width = Math.min(100, Math.max(0, pct)) + '%';
     }
   
     function onGameOver(stats) {
       $('result-schrodinger-name').textContent = SP.state.names.schrodinger;
       $('result-cat-name').textContent = SP.state.names.cat;
       $('result-schrodinger-score').textContent = String(Math.max(0, Math.round(stats.schrodingerScore)));
       $('result-cat-score').textContent = String(Math.max(0, Math.round(stats.catScore)));
   
       var winnerLine = $('winner-line');
       if (SP.state.mode === 'multiplayer') {
         if (stats.schrodingerScore > stats.catScore) {
           winnerLine.textContent = SP.state.names.schrodinger + ' WINS THE PARADOX';
         } else if (stats.catScore > stats.schrodingerScore) {
           winnerLine.textContent = SP.state.names.cat + ' WINS THE PARADOX';
         } else {
           winnerLine.textContent = 'QUANTUM TIE';
         }
       } else {
         winnerLine.textContent = 'RUN COMPLETE';
       }
   
       var chip = $('achievements');
       chip.innerHTML = '';
       (stats.achievements || []).forEach(function (text) {
         var span = document.createElement('span');
         span.className = 'achievement-chip';
         span.textContent = text;
         chip.appendChild(span);
       });
   
       showScreen('screen-gameover');
     }
   
     function wireGameOverButtons() {
       $('btn-rematch').addEventListener('click', function () {
         applyHudLabels();
         showScreen('screen-game');
         SP.Game.start(getRunConfig());
       });
       $('btn-main-menu').addEventListener('click', function () {
         showScreen('screen-mode');
       });
     }
   
     function init() {
       wireBackButtons();
       $('btn-to-mode').addEventListener('click', function () { showScreen('screen-mode'); });
       wireModeSelect();
       wireRoleSelect();
       wireNameForm();
       wireStartGame();
       wireGameOverButtons();
     }
   
     document.addEventListener('DOMContentLoaded', init);
   
     return {
       showScreen: showScreen,
       updateTimerDisplay: updateTimerDisplay,
       updateScoreDisplay: updateScoreDisplay,
       updateChargeMeter: updateChargeMeter,
       flashObserver: flashObserver,
       onGameOver: onGameOver
     };
   })();