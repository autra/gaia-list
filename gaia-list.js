;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Pointer event abstraction to make
 * it work for touch and mouse.
 *
 * @type {Object}
 */
var pointer = [
  { down: 'touchstart', up: 'touchend', move: 'touchmove' },
  { down: 'mousedown', up: 'mouseup', move: 'mousemove' }
]['ontouchstart' in window ? 0 : 1];

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  try { document.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  this.createShadowRoot().innerHTML = template;
  this.els = { inner: this.shadowRoot.querySelector('.inner') };
  this.addEventListener('click', this.onPointerDown.bind(this));
  this.shadowStyleHack();
  this.makeAccessible();
};

proto.makeAccessible = function() {
  [].forEach.call(this.children, function(el) {
    el.tabIndex = 0;
  });
};

proto.shadowStyleHack = function() {
  if (hasShadowCSS) { return; }
  var style = this.shadowRoot.querySelector('style').cloneNode(true);
  this.classList.add('-content', '-host');
  style.setAttribute('scoped', '');
  this.appendChild(style);
};

proto.attachedCallback = function() {
  this.restyleShadowDom();
  this.rerunFontFit();
};

/**
 * Workaround for bug 1056783.
 *
 * Fixes shadow-dom stylesheets not applying
 * when shadow host node is detached on
 * shadow-root creation.
 *
 * TODO: Needs abstraction
 *
 * @private
 */
proto.restyleShadowDom = function() {
  var style = this.shadowRoot.querySelector('style');
  this.shadowRoot.removeChild(style);
  this.shadowRoot.appendChild(style);
};

proto.itemShouldRipple = function(el) {
  if (scrolling) { return false; }
  else if (el.classList.contains('ripple')) { return true; }
  else if (el.classList.contains('no-ripple')) { return false; }
  else if (this.classList.contains('ripple')){ return true; }
  else if (this.classList.contains('no-ripple')){ return false; }
  else if (el.tagName === 'A') { return true; }
  else { return false; }
};

proto.onPointerDown = function(e) {
  var point = e.touches ? e.changedTouches[0] : e;
  var target = this.getChild(e.target);

  if (!this.itemShouldRipple(target)) { return; }

  var pos = {
    list: this.getBoundingClientRect(),
    item: target.getBoundingClientRect()
  };

  var els = {
    container: document.createElement('div'),
    ripple: document.createElement('div')
  };

  els.container.className = 'ripple-container';
  els.container.style.left = (pos.item.left - pos.list.left) + 'px';
  els.container.style.top = (pos.item.top - pos.list.top) + 'px';
  els.container.style.width = pos.item.width + 'px';
  els.container.style.height = pos.item.height + 'px';

  var offset = {
    x: point.clientX - pos.item.left,
    y: point.clientY - pos.item.top
  };

  els.ripple.className = 'ripple';
  els.ripple.style.left = offset.x + 'px';
  els.ripple.style.top = offset.y + 'px';
  els.ripple.style.visibility = 'hidden';

  els.container.appendChild(els.ripple);
  this.els.inner.appendChild(els.container);

  // var reflow = els.ripple.offsetTop;
  var scale = (pos.item.width / 15);
  var duration = 500;

  setTimeout(function() {
    els.ripple.style.visibility = '';
    els.ripple.style.transform = 'scale(' + scale + ')';
    els.ripple.style.transitionDuration = duration  + 'ms';
    setTimeout(function() {
      els.ripple.style.transitionDuration = '1000ms';
      els.ripple.style.opacity = '0';
      setTimeout(function() {
        els.container.remove();
      }, 1000);
    }, duration);
  });
};

proto.getChild = function(el) {
  return el.parentNode === this ? el : this.getChild(el.parentNode);
};

var template = `
<style>

/** Reset
 ---------------------------------------------------------*/

label { background: transparent; }

/** Host
 ---------------------------------------------------------*/

:host {
  display: block;
  position: relative;
  font-size: 17px;
  overflow: hidden;
  text-align: left;
}

/** Children
 ---------------------------------------------------------*/

::content > *:not(style) {
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 60px;
  margin: 0;
  padding: 9px 16px;
  font-size: 17px;
  font-style: normal;
  background: transparent;
  list-style-type: none;
  outline: 0;
  border: 0;

  color:
    var(--text-color);
}

/** Border
 ---------------------------------------------------------*/

::content > *:before {
  content: '';
  position: absolute;
  bottom: 0px;
  left: 16px;
  right: 16px;
  height: 1px;

  background:
    var(--border-color,
    var(--background-plus));
}

/** Titles
 ---------------------------------------------------------*/

::content small,
::content p {
  font-size: 0.7em;
  line-height: 1.35em;
}

/** Icon
 ---------------------------------------------------------*/

::content i {
  display: inline-block;
  width: 40px;
}

::content i:before {
  display: block;
}

::content > * > i:last-child {
  display: block;
  position: absolute;
  top: 50%;
  right: 16px;
  margin-top: -14px;
  line-height: 1;
  text-align: right;
}

/** Divided
 ---------------------------------------------------------*/

::content .divided {
  border-left: solid 1px;
  padding-left: 14px;

  border-color:
    var(--border-color,
    var(--background-plus));
}

/** Ripple Container
 ---------------------------------------------------------*/

.ripple-container.ripple-container {
  box-sizing: content-box;
  position: absolute;
  z-index: -1;
  padding-top: 1px;
  margin-top: -1px;
  overflow: hidden;
}

/** Ripple
 ---------------------------------------------------------*/

.ripple-container > .ripple {
  background: var(--background-minus);
  position: absolute;
  left: 0;
  top: 0;
  width: 30px;
  height: 30px;
  margin: -15px;
  border-radius: 50%;
  opacity: 0.2;
  transition-property: transform, opacity;
  will-change: transform;
}

</style>

<div class="inner"><content></content></div>`;

// If the browser doesn't support shadow-css
// selectors yet, we update the template
// to use the shim classes instead.
if (!hasShadowCSS) {
  template = template
    .replace('::content', '.-content', 'g')
    .replace(':host', '.-host', 'g');
}

var scrolling = false;
var scrollTimeout;

addEventListener('scroll', function() {
  scrolling = true;
  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(function() {
    scrolling = false;
  }, 100);
});

// Register and return the constructor
// and expose `protoype` (bug 1048339)
module.exports = document.registerElement('gaia-list', { prototype: proto });
module.exports.proto = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-list',this));