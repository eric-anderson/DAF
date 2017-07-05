/*
 ** DA Friends - common.js
 */
console.clear();

/*
 ** Lock Object
 */
function lockObject(obj, lock) {
    Object.keys(obj).forEach(function (key, idx, ary) {
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
 ** Convert unix time stamp to human readable string
 */
function unixDate(UNIX_timestamp, addTime = false, tzo = 0) {
    var s = parseInt(UNIX_timestamp);

    if (tzo) {
        tzo = parseInt(tzo);
        if (isNaN(tzo))
            tzo = 0;
    }

    if (s > 0) {
        var a = new Date((s + tzo) * 1000);

        if (a) {
            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            var year = a.getFullYear();
            var month = months[a.getMonth()];
            var date = a.getDate();
            var hour = a.getHours();
            var min = a.getMinutes() < 10 ? '0' + a.getMinutes() : a.getMinutes();
            var sec = a.getSeconds() < 10 ? '0' + a.getSeconds() : a.getSeconds();
            var time = date + ' ' + month + ' ' + year;

            if (addTime) {
                time += ' ' + hour + ':' + min;
                if (addTime == 'full')
                    time += ':' + sec;
            }

            return time;
        }
    }
    return "";
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
    if (typeof x !== 'number' && typeof x !== 'string')
        return '';

    var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

/*
 ** Flash extension badge with a message
 */
function badgeFlasher(message, times, interval, color = false, clear = false) {
    chrome.browserAction.getBadgeBackgroundColor({}, function (oldColor) {
        chrome.browserAction.getBadgeText({}, function (oldText) {
            var newColor = badgeColor(color);

            if (!newColor)
                newColor = oldColor;
            if (chrome.i18n.getMessage(message))
                message = chrome.i18n.getMessage(message);
            flash();

            function flash() {
                setTimeout(function () {
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
            parseXml.parser = function (xmlStr) {
                return (new window.DOMParser()).parseFromString(xmlStr, "text/xml");
            };
        } else if (typeof window.ActiveXObject != "undefined" &&
            new window.ActiveXObject("Microsoft.XMLDOM")) {
            parseXml.parser = function (xmlStr) {
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
 ** END
 *******************************************************************************/