/*
** DA Friends - content_wk.js
*/
(function() {
   var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
   link.type = 'image/x-icon';
   link.rel = 'shortcut icon';
   link.href = chrome.runtime.getURL('/img/daf.ico');
   document.getElementsByTagName('head')[0].appendChild(link);

   // <script src="//bits.wikimedia.org/geoiplookup"></script>
   var wikiScripts = document.getElementsByTagName("SCRIPT");
   //console.log("content_wk.js", wikiScripts);
   if (wikiScripts) {
      for (s = 0; s < wikiScripts.length; s++) {
         console.log("Zap", wikiScripts[s].outerHTML);
      }
   }
})();
/*
** End
*******************************************************************************/