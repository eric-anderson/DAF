/*
** DA Friends - content_gm.js - Add support for greasemonkey scripts
*/
var isGM = !(typeof GM_getValue === "undefined" || GM_getValue("a", "b") === undefined);

if (typeof window['__DAF_Event'] === 'undefined')
{
   window.__DAF_Event = new Event('__DAF_Ready');
   window.__DAF_exPrefs = {
      autoClick: true,
      autoPortal: false,
      DAfullwindow: 0,
      gameLang: null,
      gameNews: ''
   };

   chrome.storage.sync.get(window.__DAF_exPrefs, function(loaded)
   {
      if (chrome.runtime.lastError) {
         console.error(chrome.runtime.lastError);
      }else
        window.__DAF_exPrefs = loaded;
      chrome.storage.onChanged.addListener(function(changes, area)
      {
         if (area == 'sync') {
            for (var key in changes) {
               if (window.__DAF_exPrefs.hasOwnProperty(key)) {
                  if (window.__DAF_exPrefs[key] != changes[key].newValue) {
                     window.__DAF_exPrefs[key] = changes[key].newValue;
                     //console.log(key, changes[key].oldValue, '->', changes[key].newValue);
                  }
               }
            }
         }
      });
      document.dispatchEvent(window.__DAF_Event);
   });

   __DAF_getValue = function(name, defaultValue)
   {
      var value = window.__DAF_exPrefs[name];

      if (value === undefined || value === null) {
          return defaultValue;
      }

      return value;
   }

   __DAF_setValue = function(name, value)
   {
      try {
         if ((window.hasOwnProperty('__DAF_exPrefs')) && name !== undefined && name !== null) {
            console.log("__DAF_setValue:", name, value);
            window.__DAF_exPrefs[name] = value;
            chrome.storage.sync.set(window.__DAF_exPrefs);
         }
      }catch(e) {
         console.log("Something dodgy going on here, but what?", e);
      }
   }
}

if (!isGM)
{
   GM_getValue = function(name, defaultValue)
   {
      return __DAF_getValue(name, defaultValue);
   }

   GM_setValue = function(name, value)
   {
      __DAF_setValue(name, value)
   }
}
/*
** END
*******************************************************************************/