console.log("ERIC", window.location.href, window.document);

if (window.location.href.includes("diggysadventure.com")) {
  var n = document.createElement('script');
  n.src = chrome.extension.getURL('inject.js');
  window.document.documentElement.appendChild(n);
}
