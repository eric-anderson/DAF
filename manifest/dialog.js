/*
 ** dialog.js
 */

// Inject stylesheet
if (!document.getElementById('DAF-md-style'))
    document.head.appendChild(Object.assign(document.createElement('link'), {
        id: 'DAF-md-style',
        type: 'text/css',
        rel: 'stylesheet',
        href: chrome.extension.getURL('manifest/css/dialog.css')
    }));

function Dialog(idOrElement) {
    if (!(this instanceof Dialog)) {
        return new Dialog(idOrElement);
    }
    if (idOrElement) {
        this.element = typeof idOrElement == 'string' ? document.getElementById(idOrElement) : idOrElement;
    } else {
        this.element = document.createElement('div');
        this.element.className = 'DAF-modal DAF-md-superscale';
        this.element.innerHTML = [
            '<div class="DAF-md-box"><div class="DAF-md-content"><div class="DAF-md-title"></div><div class="DAF-md-body"></div><div class="DAF-md-footer">',
            '<button value="ok">', Dialog.escapeHtmlBr(chrome.i18n.getMessage('Ok')) + '</button>',
            '<button value="confirm">', Dialog.escapeHtmlBr(chrome.i18n.getMessage('Confirm')) + '</button>',
            '<button value="yes">', Dialog.escapeHtmlBr(chrome.i18n.getMessage('Yes')) + '</button>',
            '<button value="no">', Dialog.escapeHtmlBr(chrome.i18n.getMessage('No')) + '</button>',
            '<button value="cancel">', Dialog.escapeHtmlBr(chrome.i18n.getMessage('Cancel')) + '</button>',
            '</div></div></div></div>'
        ].join('');
        document.body.appendChild(this.element);
    }
}
// static methods
Object.assign(Dialog, {
    CRITICAL: 'critical',
    OK: 'ok',
    CONFIRM: 'confirm',
    YES: 'yes',
    NO: 'no',
    CANCEL: 'cancel',
    escapeHtml: (function() {
        var re = /[&<>'"]/g;
        var o = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };
        return function(value) {
            value = typeof value == 'string' ? value : (value ? value.toString() : '');
            return value.replace(re, c => o[c]);
        }
    })(),
    escapeHtmlBr: function(value) {
        return Dialog.escapeHtml(value).replace(/\n/g, '<br>');
    }
});
// class methods
Object.assign(Dialog.prototype, {
    show: function(options, callback) {
        var o = Object.assign({}, this.defaults, options);
        if (this.element.classList.contains('DAF-md-wait')) {
            o.title = Dialog.escapeHtmlBr(chrome.i18n.getMessage('PleaseWait'));
            o.style = [Dialog.CRITICAL];
        }
        this.lastStyle = [Dialog.CONFIRM];
        this.callback = callback;
        this.lastStyle = o.style;
        this.element.classList.add('DAF-md-show');
        this.setTitle(o.title);
        if (o.html) this.setHtml(o.html);
        else this.setText(o.text);
        return this;
    },
    hide: function() {
        this.element.classList.remove('DAF-md-show');
        return this;
    },
    setTitle: function(title) {
        var el = this.element.getElementsByClassName('DAF-md-title')[0];
        if (el) {
            el.innerHTML = Dialog.escapeHtmlBr(title);
            el.style.display = title ? '' : 'none';
        }
        return this;
    },
    setHtml: function(html) {
        var el = this.element.getElementsByClassName('DAF-md-body')[0];
        if (el) {
            el.innerHTML = html;
            el.style.display = el.firstChild ? '' : 'none';
        }
        return this.setStyle();
    },
    setText: function(text) {
        if (this.element.classList.contains('DAF-md-wait') && !this.element.classList.contains('DAF-md-show')) {
            return this.show({
                text: text
            });
        }
        return this.setHtml(Dialog.escapeHtmlBr(text));
    },
    setStyle: function(style) {
        if (style === null || style === undefined) style = this.lastStyle;
        style = this.lastStyle = style instanceof Array ? style : String(style).split(/,|\s/);
        this.element.classList.toggle('DAF-md-critical', style.indexOf(Dialog.CRITICAL) >= 0);
        Array.from(this.element.getElementsByTagName('button')).forEach(button => {
            var dialog = this,
                method = button.value.toLowerCase();
            button.style.display = style.indexOf(method) >= 0 ? '' : 'none';
            if (!button.getAttribute('hasListener')) {
                button.setAttribute('hasListener', '1');
                button.addEventListener('click', function() {
                    dialog.element.classList.remove('DAF-md-show');
                    if (dialog.callback) setTimeout(() => dialog.callback(method), 100);
                });
            }
        });
        return this;
    }
});
/*
 ** END
 *******************************************************************************/