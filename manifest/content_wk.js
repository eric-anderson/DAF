/*
** DA Friends - content_wk.js
*/
// <script src="//bits.wikimedia.org/geoiplookup"></script>
document.querySelectorAll('script[src="//bits.wikimedia.org/geoiplookup"]')
.forEach(function (e) {
   console.log("Zap", e);
   e.parentNode.removeChild(e);
});

document.addEventListener('DOMContentLoaded', function()
{
    var link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = chrome.runtime.getURL('/img/daf.ico');
    document.getElementsByTagName('head')[0].appendChild(link);
});
/*
** End
*******************************************************************************/