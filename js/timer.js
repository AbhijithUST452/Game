/* ======================================================
   THE SCHRODINGER PARADOX — timer.js
   Exact, deterministic round timer.
   Exposes window.SP.Timer
   ====================================================== */

   window.SP = window.SP || {};

   SP.Timer = (function () {
     let remaining = 60;
     let intervalId = null;
     let tickCallback = null;
     let completeCallback = null;
   
     /**
      * Starts the countdown.
      * @param {number} seconds - total duration (always 60 for GameCraft compliance)
      * @param {(remaining:number)=>void} onTick - fired immediately and every second
      * @param {()=>void} onComplete - fired exactly once when the clock hits 0
      */
     function start(seconds, onTick, onComplete) {
       stop();
       remaining = seconds;
       tickCallback = onTick;
       completeCallback = onComplete;
   
       if (tickCallback) tickCallback(remaining);
   
       intervalId = setInterval(function () {
         remaining -= 1;
         if (remaining < 0) remaining = 0;
         if (tickCallback) tickCallback(remaining);
   
         if (remaining <= 0) {
           stop();
           if (completeCallback) completeCallback();
         }
       }, 1000);
     }
   
     function stop() {
       if (intervalId !== null) {
         clearInterval(intervalId);
         intervalId = null;
       }
     }
   
     function getRemaining() {
       return remaining;
     }
   
     function isRunning() {
       return intervalId !== null;
     }
   
     return { start: start, stop: stop, getRemaining: getRemaining, isRunning: isRunning };
   })();