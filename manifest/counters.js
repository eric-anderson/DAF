/*
** DA Friends - counters.js
*/
(function() {
    'use strict';

    var countDown = function(endTime, el = null)
    {
        var element = el;
        var expireTime = null;
        var interval = null;
        var secsRemaining = 0;

        var cfg = {
            runClass: '__cdt',
            pauseClass: '__cdt-Pause',
            endedClass: '__cdt-Ended',
            warnClass: '__cdt-Warn',
            warnSeconds: 0,
            callback: null,
        };

        /*
        ** Timer
        */
        var onTimer = function()
        {
            var rem = timeSpan(expireTime, false);
            var timeString = ((rem.dd) ? rem.dd + 'd:' : '');

            if(rem.ts <= 0) {
                window.clearTimeout(interval);
                secsRemaining = 0;
                interval = null;
            }else
                secsRemaining = rem.ts;

            timeString +=
                (rem.hh < 10 ? '0' : '') + parseInt(rem.hh) + 'h:' +
                (rem.mm < 10 ? '0' : '') + parseInt(rem.mm) + 'm:' +
                (rem.ss < 10 ? '0' : '') + (rem.ss % 60) + 's';

            if (element) {
                element.innerHTML = timeString;
                if ((cfg.warnSeconds) && rem.ts <= cfg.warnSeconds) {
                    element.className = cfg.warnClass;
                }else
                    element.className = (rem.ts <= 0) ? cfg.endedClass : cfg.runClass;
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
                'ts': ts,
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
                interval = setInterval(onTimer, 100);
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