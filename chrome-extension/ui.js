console.log('ui');

var objectURLs = {};
var playerID = 0;

reprocess();

function reprocess() {
    console.log('loading rawData...');
    chrome.storage.local.get(['rawData', 'lastDownload', 'playerID'], gotRaw);
}

function gotRaw(items) {
    if (typeof items.rawData != 'string') {
        console.log('rawData is not string?', items);
        return;
    }
    console.log('rawData is', items.rawData.length, 'bytes');

    playerID = items.playerID;

    replaceDownloadElement('rawData', items.rawData);

    var neighbours = filterXML(items.rawData, 'neighbours');
    if (neighbours === undefined) {
        console.log("Internal error, unable to find neighbours in raw data");
        return;
    }
    replaceDownloadElement('neighboursXML', neighbours);

    parseNeighboursXML(neighbours);
}

function replaceDownloadElement(name, data) {
    var data = new Blob([data], {type: 'text/plain'});
    if (objectURLs.hasOwnProperty(name)) {
        window.URL.revokeObjectURL(objectURLs[name]);
    }
    var url = window.URL.createObjectURL(data);
    objectURLs[name] = url;
    document.getElementById(name).innerHTML = '<a href="' + url + '">' + name + '</a>';
}

function filterXML(raw, part) {
    var start = raw.indexOf('<' + part + '>');
    if (start == -1) {
        return undefined;
    }
    var endStr = '</' + part + '>';
    var end = raw.indexOf(endStr, start);
    if (end == -1) {
        return undefined;
    }
    return '<xml>' + raw.substring(start, end + endStr.length) + '</xml>';
}

function parseNeighboursXML(neighbours) {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(neighbours, 'text/xml');
    console.log('xmlDoc', xmlDoc);
    var items = xmlDoc.getElementsByTagName('item');
    var friends = [];
    var columns = [];
    for (var i = 0; i < items.length; i++) {
        var friend = {};
        var f = items.item(i);
        for (var j = 0; j < f.childNodes.length; j++) {
            var n = f.childNodes.item(j);
            friend[n.nodeName] = n.innerHTML;
            if (i==0) {
                columns.push(n.nodeName);
            }
        }
        friends.push(friend);
    }
    console.log('columns & friends', columns, friends);

    friendsToTSV(columns, friends);
}

function friendsToTSV(columns, friends) {
    var tsv = [];
    tsv.push(columns.join('\t'));
    for (var i = 0; i < friends.length; i++) {
        var vals = [];
        for (var j = 0; j < columns.length; j++) {
            vals.push(friends[i][columns[j]]);
        }
        tsv.push(vals.join('\t'));
    }
    tsv.push('');
    replaceDownloadElement('neighboursTSV', tsv.join('\n'));

    friendsToTable(friends);
    friendsToGodChildrenTable(friends);
}

function friendsToTable(friends) {
    var tbody = document.getElementById('friendsTableBody');
    tbody.innerHTML = '';
    var now = Math.floor(Date.now()/1000);
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];

        if (f.level == 1 && f.uid == 1 || f.uid == playerID) { // Mr. Bill
            continue;
        }

        var age = dayAge(now, parseInt(f.rec_gift));
        if (age <= 2) {
            continue;
        }
        var url = 'http://facebook.com/' + f.fb_id;
        tbody.appendChild(makeRow('td', [
            '<a href="' + url + '">' + escapeHTML(f.name + " " + f.surname) + '</a>',
            parseInt(f.level), 
            age,
        ]));
    }
    sorttable.makeSortable(document.getElementById('friendsTable'));
}

function makeRow(type, values) {
    var row = document.createElement('tr');

    for (var i = 0; i < values.length; i++) {
        var cell = document.createElement(type);
        cell.innerHTML = values[i];
        row.appendChild(cell);
    }

    return row;
}

function dayAge(now, old) {
    var age = Math.floor((now - old) / (24*60*60) + 0.5);
    if (age < 0) {
        age = 0;
    } else if (age > 1000) {
        age = 1000;
    }
    return age;
}

function escapeHTML(unsafe) {
  var map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return unsafe.replace(/[&<>"']/g, function(m) { return map[m]; });
}

function friendsToGodChildrenTable(friends) {
    var row = document.getElementById('godChildrenRow');
    row.innerHTML = '';
    for (var i = 0; i < friends.length; i++) {
        var f = friends[i];

        if (f.spawned == 0) {
            continue;
        }

        row.appendChild(makeGodChildrenCell(f.name, f.level, f.pic_square));
    }
}

function makeGodChildrenCell(name, level, pic) {
    var cell = document.createElement('td');
    cell.setAttribute('class', 'friend');

    var img = document.createElement('img');
    img.setAttribute('width', 64);
    img.setAttribute('src', pic);
    cell.appendChild(img);
    cell.appendChild(makeGodChildrenSpan('levelbg', ''));
    cell.appendChild(makeGodChildrenSpan('level', level));
    cell.appendChild(makeGodChildrenSpan('name', name));
    
    return cell;
}

function makeGodChildrenSpan(sClass, text) {
    var span = document.createElement('span');
    span.setAttribute('class', sClass);
    span.innerHTML = text;
    return span;
}
