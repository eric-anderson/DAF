console.log("Hack script checking", window.location.href, window.document);

// if (window.location.href.includes("diggysadventure.com")) {
//   var n = document.createElement('script');
//   n.src = chrome.extension.getURL('inject.js');
//   window.document.documentElement.appendChild(n);
// }

if (window.location.href.includes('www.facebook.com/eric.anderson.nature.photos/friends')) {
  var n = document.createElement('script');
  n.src = chrome.extension.getURL('inject-friends.js');
  window.document.documentElement.appendChild(n);
}

if (window.location.href.includes('m.facebook.com/friends/center/friends')) {
  var n = document.createElement('script');
  n.src = chrome.extension.getURL('inject-friends.js');
  window.document.documentElement.appendChild(n);
}
