/*
** DA Friends - index.js
*/
var bgp = chrome.extension.getBackgroundPage();
var wikiLink = "https://wiki.diggysadventure.com";
var wikiVars = "/index.php?title=";

// Add Property value as a Message Key in _locales/xx/messages.json
// So the user gets a nice description of the theme/alarm sound.
var pageThemes = {
    'default':  'cssDefault',
    'minty':    'cssMinty',
    'rose':     'cssRose'
};

var alarmSounds = {
    'rooster':  'sndRooster'
};

/*
** On Page load Handler
*/
document.addEventListener('DOMContentLoaded', function()
{
   guiTheme();
   document.getElementById('tabStatus').style.display = 'none';
   document.getElementsByTagName('html')[0].setAttribute('lang', bgp.exPrefs.gameLang.toLowerCase());
   document.getElementById('extTitle').innerHTML = guiString('extTitle');
   document.getElementById('disclaimer').innerHTML = guiString('disclaimer');
   document.getElementById('gameURL').title = guiString('gameURL');
   document.getElementById('gameURL').addEventListener('click', function(e) {
      e.preventDefault();
      bgp.daGame.reload();
      return false;
   });

   // Add Entry for each tab to be loaded; Options tab
   // is implicit and in here allready
   //
   // Property value: true for production, false = tab
   // only loaded if running in development environment
   //
   guiTabs.initialise({
      neighbours:   true,
      crowns:       true,
      camp:         false,
      events:       false
   }).then(function() {
      guiTabs.update();
      guiWikiLinks();
   });

   // Extension message handler
   //
   chrome.runtime.onMessage.addListener(function(request, sender, sendResponse)
   {
      var status = "ok", results = null;

      switch(request.cmd) {
         case 'gameLoading':
         case 'dataLoading':
         case 'dataStart':
            guiStatus(request.text, null, 'download');
            break;

         case 'gameMaintenance':
         case 'userMaintenance':
            guiStatus(request.text, 'Warning', 'warning');
            guiTabs.update();
            break;

         case 'dataDone':
            guiStatus();
            guiTabs.update();
            break;

         case 'dataError':
            guiStatus(request.text, 'Error', 'error');
            guiTabs.update();
            break;

         default:
            if (bgp.exPrefs.debug) console.log("chrome.extension.onMessage", request);
            sendResponse({ status: "error", result: `Invalid 'cmd'` });
            break;
      }

      sendResponse({ status: status, result: results });
      return true;    // MUST return true; here!
   });
});

/*
** Master Tab Handler
*/
var guiTabs = (function ()
{
   // @Private
   var tabElement = '#tabs';
   var tabNavigationLinks = '.c-tabs-nav';
   var tabContentWrapper = '.c-tabs-wrapper';
   var tabContentContainers = '.c-tab';
   var tabWrapper;
   var tabOrder = [];
   var locked = false;
   var active;

   // @Public - Tab Array
   self.tabs = {};

   // @Public - Options Tab
   self.tabs.Options = {
      title: 'Options',
      image: 'options.png',
      order: 9999,
      onInit: tabOptionsInit,
      onUpdate: tabOptionsUpdate
   };

   /*
   ** @Public - Initialise Tabs
   */
   self.initialise = function(loadTabs = {})
   {
      return Promise.all(Object.keys(loadTabs).reduce(function(tabs, key) {
         if ((loadTabs[key] === true) || localStorage.installType == 'development') {
            tabs.push(new Promise((resolve, reject) => {
               var script = document.createElement('script');
               script.onerror = function () {
                  reject(key);
               };
               script.onload = function () {
                  resolve(key);
               };
               script.type = "text/javascript";
               script.src = "/manifest/tabs/" + key + ".js";
               document.head.appendChild(script);
               script = null;
            }));
         }
         return tabs;
      }, [])).then(function(f) {
         // Sort them so we display in a prefered order
         tabOrder = Object.keys(self.tabs).sort(function(a, b) {
            return self.tabs[a].order > self.tabs[b].order;
         });

         // Create each tab entry
         var nav, e = document.querySelector(tabElement);
         if (e) {
            nav = e.querySelectorAll(tabContentWrapper);
            if ((nav) && nav.length == 1) {
               tabWrapper = nav[0];
            }else {
               tabWrapper = document.createElement('div');
               tabWrapper.className = 'c-tabs-wrapper';
               e.appendChild(tabWrapper);
            }

            nav = e.querySelectorAll(tabNavigationLinks);
            if ((nav) && nav.length == 1) {

               console.log(bgp.exPrefs, nav[0]);

               tabOrder.forEach(function(tab, idx) {
                  var id = self.tabs[tab].id = ('' + tab);
                  var a = document.createElement('a');
                  //var i = document.createElement('i')
                  var img = document.createElement('img')
                  var span = document.createElement('span')

                  a.id = id;
                  a.className = 'c-tabs-nav__link';
                  a.setAttribute('href', '#');
                  a.addEventListener('click', tabClicked);
                  //a.appendChild(i);
                  a.appendChild(img);
                  a.appendChild(span);
                  img.setAttribute('src', '/img/' + self.tabs[tab].image);
                  span.innerHTML = guiString(self.tabs[tab].title);
                  nav[0].appendChild(a);
                  self.tabs[tab].nav = a;

                  var d1 = document.createElement('div');
                  var d2 = document.createElement('div');
                  d1.setAttribute('data-c-tab-id', id);
                  d1.className = 'c-tab';
                  d1.innerHTML = '<br />';
                  d1.appendChild(d2);
                  d2.setAttribute('data-c-tab-id', id);
                  d2.className = 'c-tab-content';
                  tabWrapper.appendChild(d1);
                  self.tabs[tab].container = d1;
                  self.tabs[tab].content = d2;

                  // Do any tab specific initialisation
                  if (self.tabs[id].hasOwnProperty('onInit')) {
                     if (typeof self.tabs[id].onInit === 'function')
                        self.tabs[id].onInit(id);
                     delete self.tabs[id].onInit;
                  }
               });

               tabActive(bgp.exPrefs.tabIndex);
            }
         }

         // Were done initialising so leave the building
         delete self.initialise;
      });
   }

   /*
   ** @Public - Hide Tab Content
   */
   self.hideContent = function(state)
   {
      tabWrapper.style.display = (state ? 'none' : 'block');
   }

   /*
   ** @Public - Lock Tabs
   */
   self.lock = function(state)
   {
      locked = (state ? true : false);
   }

   /*
   ** @Public - Update (Active) Tab
   */
   self.update = function()
   {
      tabUpdate(active, 'update');
   }

   /*
   ** @Public - Refresh Tabs
   */
   self.refresh = function()
   {
      tabOrder.forEach(function(tab, idx) {
         tabUpdate(tab, 'refresh');
      });
   }

   /*
   ** @Private onClick
   */
   function tabClicked(e)
   {
      var id = e.target.id;
      if (!id)
         id = e.target.parentElement.id;
      e.preventDefault();
      if ((!locked) && active != id) {
         console.log("Tab Clicked", id, e.target);
         id = tabActive(id);
         chrome.storage.sync.set({ tabIndex: id});
      }
   }

   /*
   ** @Private tabUpdate
   */
   function tabUpdate(id, reason)
   {
      if (!self.tabs.hasOwnProperty(id))
         return;
      if (self.tabs[id].hasOwnProperty('onUpdate')) {
         if (typeof self.tabs[id].onUpdate === 'function')
            setTimeout(function() {
               self.tabs[id].onUpdate(id, reason);
            }, 20);
      }
   }

   /*
   ** @Private tabActive
   */
   function tabActive(id)
   {
      if (!self.tabs.hasOwnProperty(id))
         id = tabOrder[0];
      if (self.tabs.hasOwnProperty(active)) {
         self.tabs[active].nav.classList.remove('is-active');
         self.tabs[active].container.classList.remove('is-active');
      }
      self.tabs[id].nav.classList.add('is-active');
      self.tabs[id].container.classList.add('is-active');

      if (active != id) {
         active = id;
         tabUpdate(id, 'active');
      }

      return active;
   }

   /*
   ** @Private Initialise the options tab
   */
   function tabOptionsInit(id)
   {
   }

   /*
   ** @Private Update the options tab
   */
   function tabOptionsUpdate(id, reason)
   {
   }

	return self;
}());

/*
** Set theme
*/
function guiTheme(name = null)
{
   if (name === null)
      name = bgp.exPrefs.cssTheme;
   if (!pageThemes.hasOwnProperty(name))
       name = 'default';

   var filename = "/manifest/css/themes/" + name + ".css";
   var className = 'themeStylesheet';
   var css = document.getElementById(className);

   if (!css) {
      css = document.createElement('link');
      css.id = className;
      css.setAttribute('rel', "stylesheet")
      css.setAttribute('type', "text/css")
      document.getElementsByTagName('head')[0].appendChild(css);
   }

   css.setAttribute('href', filename)

   return name;
}

/*
** Set status message
*/
function guiStatus(text = null, title = null, style = null, hideTabs = true)
{
   if (text !== null)
   {
      if (title == null)
         title = 'pleaseWait';
      guiTabs.lock(true);
      document.getElementById('tabStatus').style.display = 'block';
      if (hideTabs)
         guiTabs.hideContent(true);
      document.getElementById('statusText').innerHTML = guiString(text);
      if (title !== null)
         document.getElementById('statusTitle').innerHTML = guiString(title);
      if (style !== null)
         document.getElementById('statusAlert').className = style;
   }else {
      guiTabs.lock(false);
      guiTabs.hideContent(false);
      document.getElementById('tabStatus').style.display = 'none';
   }
}

/*
** Get a GUI string
*/
function guiString(message, subs = null)
{
    var text = chrome.i18n.getMessage(message, subs);
    if (!text)
        return message;
    return text;
}

/*
** Set Wiki Links
*/
function guiWikiLinks()
{
    document.querySelectorAll('[data-wiki-page]').forEach(function (e)
    {
        var title = e.getAttribute('data-wiki-title') || 'clickWiki';

        e.title = guiString(title);
        e.onmouseenter = function(e) {
            e.target.classList.toggle('wiki-hover', true);
            return true;
        };
        e.onmouseleave = function(e) {
            e.target.classList.toggle('wiki-hover', false);
            return true;
        };
        e.onclick = function(e) {
            var wikiPage = e.target.getAttribute('data-wiki-page');
            var wikiUrl;

            if (wikiPage.indexOf('http') == 0) {
                wikiUrl = wikiPage;
            }else
                wikiUrl = wikiLink + ((wikiPage) ? wikiVars + wikiPage : '/');

            chrome.tabs.query({}, function(tabs)
            {
                var wkTab = 0;

                tabs.forEach(function (tab) {
                    if ((!wkTab) && (tab.url.indexOf(wikiLink) != -1 || tab.url == wikiUrl)) {
                        chrome.windows.update(tab.windowId, {focused: true, drawAttention: true});
                        wkTab = tab.id;
                    }
                });

                if (!wkTab) {
                    var maxWidth = Math.round(((window.screen.availWidth * 72) / 100));
                    var maxHeight = Math.round(((window.screen.availHeight * 80) / 100));
                    var top = Math.round((window.screen.availHeight - maxHeight) / 2);
                    var left = Math.round((window.screen.availWidth - maxWidth) / 2);

                    chrome.windows.create({
                        url: wikiUrl,
                        left: left,
                        top: top,
                        width: maxWidth,
                        height: maxHeight,
                        focused: true,
                        type: 'popup'
                    }, function(w) {
                        setWikiScript(w.tabs[0].id);
                    });
                }else {
                    guiWikiScript(wkTab);
                    chrome.tabs.update(wkTab, {url: wikiUrl, active: true});
                }
            });

            return false;
        };
    });
}

/*
** Set Wiki Content Script
*/
function guiWikiScript(tabId)
{
    var url = "/manifest/content_wk.js";
    chrome.tabs.executeScript(tabId, {file: url, runAt: 'document_start'});
}
/*
** END
*******************************************************************************/