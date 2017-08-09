/*
 ** DA Friends - common.js
 */
console.clear();

/*
 ** Lock Object
 */
function lockObject(obj, lock) {
    Object.keys(obj).forEach(function(key, idx, ary) {
        lockProperty(obj, key, lock);
    });
}

/*
 ** Lock Property
 */
function lockProperty(obj, prop, lock) {
    Object.defineProperty(obj, prop, {
        writable: !lock,
        configurable: true
    });
}

/*
 ** Format date
 */
var formatDateCache = {};

function formatDate(dt, format, locale) {
    // not a Date object
    if (!(dt instanceof Date)) return '';

    locale = locale || 'en';

    function pad0(n) {
        return n < 10 ? '0' + n : n;
    }

    function properCase(t) {
        return t[0].toUpperCase() + t.substr(1);
    }

    // we cache the localization information to speed up formatting
    var localization = formatDateCache[locale];
    if (localization == undefined || localization.monthNames == undefined) {
        localization = Object.assign({}, localization, {
            monthNames: [],
            monthShortNames: [],
            weekDayNames: [],
            weekDayShortNames: []
        });
        var temp = new Date(2000, 0, 1);
        for (var month = 0; month < 12; month++) {
            temp.setMonth(month);
            localization.monthNames[month] = properCase(temp.toLocaleDateString(locale, {
                month: 'long'
            }));
            localization.monthShortNames[month] = properCase(temp.toLocaleDateString(locale, {
                month: 'short'
            }));
        }
        for (var date = 1; date <= 7; date++) {
            temp.setDate(date);
            var weekDay = temp.getDay();
            localization.weekDayNames[weekDay] = properCase(temp.toLocaleDateString(locale, {
                weekday: 'long'
            }));
            localization.weekDayShortNames[weekDay] = properCase(temp.toLocaleDateString(locale, {
                weekday: 'short'
            }));
        }
        formatDateCache[locale] = localization;
    }

    return format.replace(/[yMdEhHmsSap]+/g, pattern => {
        var hour, milli;
        switch (pattern) {
            case 'yy':
                return dt.getYear();
            case 'yyyy':
                return dt.getFullYear();
            case 'M':
                return dt.getMonth() + 1;
            case 'MM':
                return pad0(dt.getMonth() + 1);
            case 'MMM':
                return localization.monthShortNames[dt.getMonth()];
            case 'MMMM':
                return localization.monthNames[dt.getMonth()];
            case 'd':
                return dt.getDate();
            case 'dd':
                return pad0(dt.getDate());
            case 'ddd':
                return localization.weekDayNames[dt.getDay()];
            case 'E':
                return localization.weekDayShortNames[dt.getDay()];
            case 'D':
                return 'ORDINAL DAY';
            case 'h':
                hour = dt.getHours();
                return hour > 12 ? hour - 12 : (hour > 0 ? hour : 12);
            case 'hh':
                hour = dt.getHours();
                return pad0(hour > 12 ? hour - 12 : (hour > 0 ? hour : 12));
            case 'H':
                return dt.getHours();
            case 'HH':
                return pad0(dt.getHours());
            case 'm':
                return dt.getMinutes();
            case 'mm':
                return pad0(dt.getMinutes());
            case 's':
                return dt.getSeconds();
            case 'ss':
                return pad0(dt.getSeconds());
            case 'SSS':
                milli = dt.getMilliseconds();
                return milli < 100 ? '0' + pad0(milli) : milli;
            case 'a':
                return dt.getHours() < 12 ? 'AM' : 'PM';
            case 'p':
                return dt.getHours() < 12 ? 'am' : 'pm';
        }
        return pattern;
    });
}

/*
 ** Convert unix time stamp to human readable string
 */
function unixDate(UNIX_timestamp, addTime = false, tzo = 0) {
    var seconds = parseInt(UNIX_timestamp);
    var timezone = (tzo ? parseInt(tzo) : 0) || 0;

    if (seconds > 0) {
        var dt = new Date((seconds + timezone) * 1000);
        if (dt) {
            var locale = chrome.i18n.getUILanguage();
            var localization = formatDateCache[locale];
            if (localization == undefined || localization.dateFormat == undefined) {
                localization = Object.assign({}, localization);
                localization.dateFormat = chrome.i18n.getMessage('DateFormat');
                localization.timeFormat = chrome.i18n.getMessage('TimeFormat');
                localization.timeFormatShort = chrome.i18n.getMessage('TimeFormatShort');
                formatDateCache[locale] = localization;
            }
            var format = localization.dateFormat;
            if (addTime) format += ' ' + (addTime == 'full' ? localization.timeFormat : localization.timeFormatShort);
            return formatDate(dt, format, locale);
        }
    }
    return '';
}

/*
 ** Calculate the period between two Unix dates
 ** What a bloody 'faf' this is!
 **
 ** TODO: What if period is over a month, a year etc.
 */
function unixDaysAgo(uTime1, uTime2, days = 0, asString = true) {
    var t1 = parseInt(uTime1);
    var t2 = parseInt(uTime2);

    if ((isNaN(t1)) || t1 == 0 || isNaN(t2) || t2 == 0)
        return '';

    var dt1 = new Date(t1 * 1000);
    var d1 = dt1.setHours(0, 0, 0, 0);
    var dt2 = new Date(t2 * 1000);
    var d2 = dt2.setHours(0, 0, 0, 0);
    var dt = d2 - d1;
    var dd = Math.floor(dt / (86400 * 1000)); // Fix bug by rounding down (floor)

    //console.log(d1, d2, dt, dd);

    /**
    var daySecs = 86400;
    var d1 = Math.floor(t1 / daySecs);
    var d2 = Math.floor(t2 / daySecs);
    var dd = Math.round((t2 - t1) / daySecs);

    console.log(dd, Math.round(dd), timeConverter(t1, true), timeConverter(d1 * daySecs, true));
    **/

    if (dd >= days) {
        if (!asString)
            return dd;
        if (dd == 0)
            return chrome.i18n.getMessage('Today');
        if (dd == 1)
            return chrome.i18n.getMessage('Yesterday');

        var str = chrome.i18n.getMessage('Days', [dd]);

        if (!str)
            str = dd + ' Days';

        return str;
    } else if (!asString)
        return null;

    return false;
}

/*
 ** Number formatter
 */
function numberWithCommas(x) {
    // if (typeof x !== 'number' && typeof x !== 'string')
    //     return '';

    // var parts = x.toString().split(".");
    // parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // return parts.join(".");
    if (typeof x == 'string') x = parseFloat(x);
    else if (typeof x != 'number') return '';
    return x.toLocaleString(chrome.i18n.getUILanguage());
}

/*
 ** Flash extension badge with a message
 */
function badgeFlasher(message, times, interval, color = false, clear = false) {
    chrome.browserAction.getBadgeBackgroundColor({}, function(oldColor) {
        chrome.browserAction.getBadgeText({}, function(oldText) {
            var newColor = badgeColor(color);

            if (!newColor)
                newColor = oldColor;
            if (chrome.i18n.getMessage(message))
                message = chrome.i18n.getMessage(message);
            flash();

            function flash() {
                setTimeout(function() {
                    if (times == 0) {
                        message = ((clear) ? '' : oldText);
                        chrome.browserAction.setBadgeText({
                            text: message
                        });
                        chrome.browserAction.setBadgeBackgroundColor({
                            color: oldColor
                        });
                        return;
                    }
                    if (times % 2 == 0) {
                        chrome.browserAction.setBadgeText({
                            text: message
                        });
                    } else {
                        chrome.browserAction.setBadgeText({
                            text: ''
                        });
                    }
                    times--;
                    flash();
                }, interval);
            }
        });
    });
}

function badgeColor(color = false) {
    var newColor;

    switch (color) {
        case 'green':
            newColor = [105, 187, 17, 230];
            break
        case 'blue':
            newColor = [57, 78, 255, 230];
            break
        case 'red':
            newColor = [209, 33, 29, 230];
            break;
        case 'grey':
            newColor = [190, 190, 190, 230];
            break;
        default:
            return false;
    }

    chrome.browserAction.setBadgeBackgroundColor({
        color: newColor
    });
    return newColor;
}

/*
 ** As localStorage only uses strings, we need this to help out!
 */
function isBool(value) {
    if (value === 'false' || value === '0' || value === false)
        return false;
    if (value === 'true' || value === '1' || value === true)
        return true;
    return Boolean(value);
}

/*
 ** Simple "wildcard" string compare
 */
function wildCompare(string, search) {
    var startIndex = 0,
        array = search.split('*');

    for (var i = 0; i < array.length; i++) {
        var index = string.indexOf(array[i], startIndex);
        if (index == -1) return false;
        else startIndex = index;
    }
    return true;
}

/*
 ** Split out a URL
 */
function urlObject(options) {
    "use strict";
    /*global window, document*/

    var url_search_arr,
        option_key,
        i,
        urlObj,
        get_param,
        key,
        val,
        url_query,
        url_get_params = {},
        a = document.createElement('a'),
        default_options = {
            'url': window.location.href,
            'unescape': true,
            'convert_num': true
        };

    if (typeof options !== "object") {
        options = default_options;
    } else {
        for (option_key in default_options) {
            if (default_options.hasOwnProperty(option_key)) {
                if (options[option_key] === undefined) {
                    options[option_key] = default_options[option_key];
                }
            }
        }
    }

    a.href = options.url;
    url_query = a.search.substring(1);
    url_search_arr = url_query.split('&');

    if (url_search_arr[0].length > 1) {
        for (i = 0; i < url_search_arr.length; i += 1) {
            get_param = url_search_arr[i].split("=");

            if (options.unescape) {
                key = decodeURI(get_param[0]);
                val = decodeURI(get_param[1]);
            } else {
                key = get_param[0];
                val = get_param[1];
            }

            if (options.convert_num) {
                if (val.match(/^\d+$/)) {
                    val = parseInt(val, 10);
                } else if (val.match(/^\d+\.\d+$/)) {
                    val = parseFloat(val);
                }
            }

            if (url_get_params[key] === undefined) {
                url_get_params[key] = val;
            } else if (typeof url_get_params[key] === "string") {
                url_get_params[key] = [url_get_params[key], val];
            } else {
                url_get_params[key].push(val);
            }

            get_param = [];
        }
    }

    urlObj = {
        protocol: a.protocol,
        hostname: a.hostname,
        host: a.host,
        port: a.port,
        hash: a.hash.substr(1),
        pathname: a.pathname,
        search: a.search,
        parameters: url_get_params
    };

    return urlObj;
}

/*
 ** inject multiple files
 * BUG?: only the first specified css file (the last injected) is actually inserted
 */
function chromeMultiInject(tabId, details, callback) {
    var files = details.file instanceof Array ? details.file : [details.file];

    function createInject(tabId, details, callback) {
        return details.file.endsWith('.css') ? () => chrome.tabs.insertCSS(tabId, details, callback) : () => chrome.tabs.executeScript(tabId, details, callback);
    }
    for (var i = files.length - 1; i >= 0; i--) {
        var dtl = Object.assign({}, details);
        dtl.file = files[i];
        callback = createInject(tabId, dtl, callback);
    }

    if (callback !== null)
        callback(); // execute outermost function
}

/**
 * XML2jsobj v1.0
 * Converts XML to a JavaScript object
 * so it can be handled like a JSON message
 *
 * By Craig Buckler, @craigbuckler, http://optimalworks.net
 *
 * As featured on SitePoint.com:
 * http://www.sitepoint.com/xml-to-javascript-object/
 *
 * Please use as you wish at your own risk.
 */
function XML2jsobj(node, skipAttributes = true) {

    var data = {};

    // append a value
    function Add(name, value) {
        if (data[name]) {
            if (data[name].constructor != Array) {
                data[name] = [data[name]];
            }
            data[name][data[name].length] = value;
        } else {
            data[name] = value;
        }
    };

    // element attributes
    var c, cn;

    if ((!skipAttributes) && node.hasOwnProperty('attributes')) {
        for (c = 0; cn = node.attributes[c]; c++) {
            Add(cn.name, cn.value);
        }
    }

    // child elements
    for (c = 0; cn = node.childNodes[c]; c++) {
        if (cn.nodeType == 1) {
            if (cn.childNodes.length == 1 && cn.firstChild.nodeType == 3) {
                // text value
                Add(cn.nodeName, cn.firstChild.nodeValue);
            } else {
                // sub-object
                Add(cn.nodeName, XML2jsobj(cn, skipAttributes));
            }
        }
    }

    if (Object.keys(data).length === 0) {
        return null;
    }

    return data;

}

/*
 ** Parse XML String - Creates XML Parser object when needed
 */
function parseXml(str) {
    if (typeof parseXml.parser === 'undefined') {

        if (typeof window.DOMParser != "undefined") {
            parseXml.parser = function(xmlStr) {
                return (new window.DOMParser()).parseFromString(xmlStr, "text/xml");
            };
        } else if (typeof window.ActiveXObject != "undefined" &&
            new window.ActiveXObject("Microsoft.XMLDOM")) {
            parseXml.parser = function(xmlStr) {
                var xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = "false";
                xmlDoc.loadXML(xmlStr);
                return xmlDoc;
            };
        } else {
            throw new Error("No XML parser found");
        }
    }
    return parseXml.parser(str);
}

/*
 ** StopWatch class, used to profile the code
 */
function StopWatch() {
    this.enabled = true;
    this.reset = function() {
        this.start = Date.now();
        this.last = this.start;
    };
    this.reset();

    function partial(message, t1, t0) {
        console.log(message, ((t1 - t0) / 1000) + 's');
    }
    this.elapsed = function(message) {
        var now = Date.now();
        if (this.enabled) partial(message, now, this.last);
        this.last = now;
    };
    this.total = function(message) {
        var now = Date.now();
        if (this.enabled) partial(message, now, this.start);
    };
}
/*
 ** END
 *******************************************************************************/