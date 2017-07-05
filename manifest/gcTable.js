console.log('gcTable.js', location.href);

var minerApp = document.getElementById('miner');
if (!minerApp) {
    console.log('unable to find miner element');
} else {
    console.log('found miner element');
}

chrome.runtime.sendMessage({cmd: 'getGCTable'}, updateGCTable);

function updateGCTable(result) {
    if (result.status != 'ok' || !result.result) {
	console.error('unable to getGCTable', result);
	return;
    }
    var neighbours = result.result;
    // console.log('createGCT', neighbours);
    var row = document.getElementById('diggyGodChildrenRow');
    if (!row) {
	console.log('making table...');
	row = createGCTable();
    }
    var gcNeighbours = [];
    for (var i in neighbours) {
	if (!neighbours.hasOwnProperty(i)) continue;
	var n = neighbours[i];
	if (n.spawned == "0") continue;
	if (i == 0 || i == 1) { // Mr. Bill; index 9999 bigger than any possible 5k max friends
	    gcNeighbours.push({name: n.name, level: '', pic_square: n.pic_square, neighbourIndex: 9999});
	} else {
	    gcNeighbours.push({name: getName(n), level: parseInt(n.level), pic_square: n.pic_square, neighbourIndex: n.neighbourIndex});
	}
    }
    // Level isn't sufficient to order neighbours and I couldn't figure out
    // what else they were using to sort (e.g. it's not uid or name)
    gcNeighbours.sort(function(a,b) { return a.neighbourIndex - b.neighbourIndex; });
    console.log('gcNeighbours', gcNeighbours);
    row.innerHTML = '';
    if (gcNeighbours.length == 0) {
	row.innerHTML = '<td>All god children collected</td>';
    } else {
	for (var i = 0; i <gcNeighbours.length; i++) {
	    var n = gcNeighbours[i];
	    var cell = makeGodChildrenCell(n.name, n.level, n.pic_square)
	    row.appendChild(cell);
	}
    }
    var resize = document.getElementById('DAResizeButton');
    if (resize && typeof resize.externalRefresh == 'function') {
	console.log('requesting auto-resize');
	// Add delay so table can finish rendering before resize.
	setTimeout(function() { resize.externalRefresh(); }, 100);
    }
}

function getName(f) {
    if (f.name == '') {
        return 'Player ' + f.uid;
    }
    return f.name;
}

function makeGodChildrenCell(name, level, pic) {
    var cell = document.createElement('td');
    cell.setAttribute('class', 'friend');

    var img = document.createElement('img');
    img.setAttribute('width', 64);
    img.setAttribute('src', pic);
    cell.appendChild(img);
    if (level != '') {
	cell.appendChild(makeGodChildrenSpan('levelbg', ''));
	cell.appendChild(makeGodChildrenSpan('level', level));
    }
    cell.appendChild(makeGodChildrenSpan('name', name));

    cell.onclick = function() { cell.parentNode.removeChild(cell); };
    return cell;
}

function makeGodChildrenSpan(sClass, text) {
    var span = document.createElement('span');
    span.setAttribute('class', sClass);
    span.innerHTML = text;
    return span;
}

function insertAfter(afterNode, newElem) {
    afterNode.parentNode.insertBefore(newElem, afterNode.nextSibling);
}

function createGCTable() {
    var div = document.createElement('div');
    div.setAttribute('class', 'godChildrenDiv');
    div.setAttribute('id', 'godChildrenDiv');
    insertAfter(minerApp, div);
    var table = document.createElement('table');
    table.setAttribute('class', 'godChildrenTable');
    div.appendChild(table);
    var tbody = document.createElement('tbody');
    table.appendChild(tbody);
    var tr = document.createElement('tr');
    tr.setAttribute('id', 'diggyGodChildrenRow');
    tbody.appendChild(tr);
    return tr;
}

