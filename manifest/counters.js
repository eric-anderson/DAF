/*
** DA Friends - counters.js
*/
(function() {
    'use strict';

    var countDown = function(endTime, el = null, warn1 = 0, warn2 = 0)
    {
        var element = el;
        var expireTime = null;
        var interval = null;
        var secsRemaining = 0;

        var cfg = {
            runClass: '__cdt',
            pauseClass: '__cdt-Pause',
            endedClass: '__cdt-Ended',
            warn1Class: '__cdt-Warn1',
            warn1Seconds: warn1,
            warn2Class: '__cdt-Warn2',
            warn2Seconds: warn2,
            callback: null,
        };

        /*
        ** Timer
        */
        var onTimer = function()
        {
           try {
               var rem = timeSpan(expireTime, false);
               var timeString = ((rem.dd) ? rem.dd + 'd : ' : '');

               if(rem.ts <= 0) {
                   window.clearTimeout(interval);
                   secsRemaining = 0;
                   interval = null;
               }else
                   secsRemaining = rem.ts;

               timeString +=
                   (rem.hh < 10 ? '0' : '') + parseInt(rem.hh) + 'h : ' +
                   (rem.mm < 10 ? '0' : '') + parseInt(rem.mm) + 'm : ' +
                   (rem.ss < 10 ? '0' : '') + (rem.ss % 60) + 's';

               if (element) {
                   element.innerHTML = timeString;
                   if (rem.ts <= 0) {
                       element.className = cfg.endedClass;
                   }else if ((cfg.warn2Seconds && rem.ts > 0) && rem.ts <= cfg.warn2Seconds) {
                       element.className = cfg.warn2Class;
                   }else if ((cfg.warn1Seconds && rem.ts > 0) && rem.ts <= cfg.warn1Seconds) {
                       element.className = cfg.warn1Class;
                   }else
                       element.className = cfg.runClass;
               }
            } catch(e) {
               window.clearTimeout(interval);
               interval = null;
            }
        }

        var timeSpan = function(eTime, showNegative = true)
        {
            var tt = Math.ceil(eTime - Date.parse(new Date()));
            var ts = 0, ss = 0, mm = 0, hh = 0, dd = 0;

            if ((tt > 0) || showNegative) {
                ts = (tt / 1000);
                ss = Math.floor(ts % 60 );
                mm = Math.floor((ts / 60) % 60);
                hh = Math.floor((tt / (1000 * 60 * 60)) % 24);
                dd = Math.floor(tt / (1000 * 60 * 60 * 24));
            }

            return {
                'tt': tt,
                'ts': Math.floor(ts),
                'dd': dd,
                'hh': hh,
                'mm': mm,
                'ss': ss
            };
        }

        /*
        ** Start the timer
        */
        var beginTimer = function(eTime)
        {
            if (!interval) {
                expireTime = eTime;
                interval = setInterval(onTimer, 200);
                onTimer();
            }
        }

        /*
        ** Reset the timer
        */
        var resetTimer = function()
        {
            if (interval) {
                window.clearTimeout(interval);
                expireTime = 0;
                interval = null;
                onTimer();
            }
        }

        /*
        ** Pause the timer
        */
        var pauseTimer = function()
        {
            if (interval) {
                window.clearTimeout(interval);
                interval = null;
                if (element)
                    element.className = cfg.pauseClass;
            }else
                beginTimer(expireTime);
        }

        element.className = cfg.runClass;
        beginTimer(endTime);

        /*
        ** Return methods
        */
        return {
            secsRemaining: secsRemaining,
            timeSpan: timeSpan,
            beginTimer: beginTimer,
            resetTimer: resetTimer,
            pauseTimer: pauseTimer,
        };
    };

    /*
    ** Attach to global namespace
    */
    window.countDown = countDown;
})();
/*
** End
*******************************************************************************/