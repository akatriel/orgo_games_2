(function() {
  var CSRFToken, Click, ComponentUrl, EVENTS, Link, ProgressBar, browserIsntBuggy, browserSupportsCustomEvents, browserSupportsPushState, browserSupportsTurbolinks, bypassOnLoadPopstate, cacheCurrentPage, cacheSize, changePage, clone, constrainPageCacheTo, createDocument, crossOriginRedirect, currentState, enableProgressBar, enableTransitionCache, executeScriptTags, extractTitleAndBody, fetch, fetchHistory, fetchReplacement, historyStateIsDefined, initializeTurbolinks, installDocumentReadyPageEventTriggers, installHistoryChangeHandler, installJqueryAjaxSuccessPageUpdateTrigger, loadedAssets, manuallyTriggerHashChangeForFirefox, pageCache, pageChangePrevented, pagesCached, popCookie, processResponse, progressBar, recallScrollPosition, ref, referer, reflectNewUrl, reflectRedirectedUrl, rememberCurrentState, rememberCurrentUrl, rememberReferer, removeNoscriptTags, requestMethodIsSafe, resetScrollPosition, setAutofocusElement, transitionCacheEnabled, transitionCacheFor, triggerEvent, visit, xhr,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty,
    slice = [].slice,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  pageCache = {};

  cacheSize = 10;

  transitionCacheEnabled = false;

  progressBar = null;

  currentState = null;

  loadedAssets = null;

  referer = null;

  xhr = null;

  EVENTS = {
    BEFORE_CHANGE: 'page:before-change',
    FETCH: 'page:fetch',
    RECEIVE: 'page:receive',
    CHANGE: 'page:change',
    UPDATE: 'page:update',
    LOAD: 'page:load',
    RESTORE: 'page:restore',
    BEFORE_UNLOAD: 'page:before-unload',
    EXPIRE: 'page:expire'
  };

  fetch = function(url) {
    var cachedPage;
    url = new ComponentUrl(url);
    rememberReferer();
    cacheCurrentPage();
    if (progressBar != null) {
      progressBar.start();
    }
    if (transitionCacheEnabled && (cachedPage = transitionCacheFor(url.absolute))) {
      fetchHistory(cachedPage);
      return fetchReplacement(url, null, false);
    } else {
      return fetchReplacement(url, resetScrollPosition);
    }
  };

  transitionCacheFor = function(url) {
    var cachedPage;
    cachedPage = pageCache[url];
    if (cachedPage && !cachedPage.transitionCacheDisabled) {
      return cachedPage;
    }
  };

  enableTransitionCache = function(enable) {
    if (enable == null) {
      enable = true;
    }
    return transitionCacheEnabled = enable;
  };

  enableProgressBar = function(enable) {
    if (enable == null) {
      enable = true;
    }
    if (!browserSupportsTurbolinks) {
      return;
    }
    if (enable) {
      return progressBar != null ? progressBar : progressBar = new ProgressBar('html');
    } else {
      if (progressBar != null) {
        progressBar.uninstall();
      }
      return progressBar = null;
    }
  };

  fetchReplacement = function(url, onLoadFunction, showProgressBar) {
    if (showProgressBar == null) {
      showProgressBar = true;
    }
    triggerEvent(EVENTS.FETCH, {
      url: url.absolute
    });
    if (xhr != null) {
      xhr.abort();
    }
    xhr = new XMLHttpRequest;
    xhr.open('GET', url.withoutHashForIE10compatibility(), true);
    xhr.setRequestHeader('Accept', 'text/html, application/xhtml+xml, application/xml');
    xhr.setRequestHeader('X-XHR-Referer', referer);
    xhr.onload = function() {
      var doc;
      triggerEvent(EVENTS.RECEIVE, {
        url: url.absolute
      });
      if (doc = processResponse()) {
        reflectNewUrl(url);
        reflectRedirectedUrl();
        changePage.apply(null, extractTitleAndBody(doc));
        manuallyTriggerHashChangeForFirefox();
        if (typeof onLoadFunction === "function") {
          onLoadFunction();
        }
        return triggerEvent(EVENTS.LOAD);
      } else {
        return document.location.href = crossOriginRedirect() || url.absolute;
      }
    };
    if (progressBar && showProgressBar) {
      xhr.onprogress = (function(_this) {
        return function(event) {
          var percent;
          percent = event.lengthComputable ? event.loaded / event.total * 100 : progressBar.value + (100 - progressBar.value) / 10;
          return progressBar.advanceTo(percent);
        };
      })(this);
    }
    xhr.onloadend = function() {
      return xhr = null;
    };
    xhr.onerror = function() {
      return document.location.href = url.absolute;
    };
    return xhr.send();
  };

  fetchHistory = function(cachedPage) {
    if (xhr != null) {
      xhr.abort();
    }
    changePage(cachedPage.title, cachedPage.body);
    recallScrollPosition(cachedPage);
    return triggerEvent(EVENTS.RESTORE);
  };

  cacheCurrentPage = function() {
    var currentStateUrl;
    currentStateUrl = new ComponentUrl(currentState.url);
    pageCache[currentStateUrl.absolute] = {
      url: currentStateUrl.relative,
      body: document.body,
      title: document.title,
      positionY: window.pageYOffset,
      positionX: window.pageXOffset,
      cachedAt: new Date().getTime(),
      transitionCacheDisabled: document.querySelector('[data-no-transition-cache]') != null
    };
    return constrainPageCacheTo(cacheSize);
  };

  pagesCached = function(size) {
    if (size == null) {
      size = cacheSize;
    }
    if (/^[\d]+$/.test(size)) {
      return cacheSize = parseInt(size);
    }
  };

  constrainPageCacheTo = function(limit) {
    var cacheTimesRecentFirst, i, key, len, pageCacheKeys, results;
    pageCacheKeys = Object.keys(pageCache);
    cacheTimesRecentFirst = pageCacheKeys.map(function(url) {
      return pageCache[url].cachedAt;
    }).sort(function(a, b) {
      return b - a;
    });
    results = [];
    for (i = 0, len = pageCacheKeys.length; i < len; i++) {
      key = pageCacheKeys[i];
      if (!(pageCache[key].cachedAt <= cacheTimesRecentFirst[limit])) {
        continue;
      }
      triggerEvent(EVENTS.EXPIRE, pageCache[key]);
      results.push(delete pageCache[key]);
    }
    return results;
  };

  changePage = function(title, body, csrfToken, runScripts) {
    triggerEvent(EVENTS.BEFORE_UNLOAD);
    document.title = title;
    document.documentElement.replaceChild(body, document.body);
    if (csrfToken != null) {
      CSRFToken.update(csrfToken);
    }
    setAutofocusElement();
    if (runScripts) {
      executeScriptTags();
    }
    currentState = window.history.state;
    if (progressBar != null) {
      progressBar.done();
    }
    triggerEvent(EVENTS.CHANGE);
    return triggerEvent(EVENTS.UPDATE);
  };

  executeScriptTags = function() {
    var attr, copy, i, j, len, len1, nextSibling, parentNode, ref, ref1, script, scripts;
    scripts = Array.prototype.slice.call(document.body.querySelectorAll('script:not([data-turbolinks-eval="false"])'));
    for (i = 0, len = scripts.length; i < len; i++) {
      script = scripts[i];
      if (!((ref = script.type) === '' || ref === 'text/javascript')) {
        continue;
      }
      copy = document.createElement('script');
      ref1 = script.attributes;
      for (j = 0, len1 = ref1.length; j < len1; j++) {
        attr = ref1[j];
        copy.setAttribute(attr.name, attr.value);
      }
      if (!script.hasAttribute('async')) {
        copy.async = false;
      }
      copy.appendChild(document.createTextNode(script.innerHTML));
      parentNode = script.parentNode, nextSibling = script.nextSibling;
      parentNode.removeChild(script);
      parentNode.insertBefore(copy, nextSibling);
    }
  };

  removeNoscriptTags = function(node) {
    node.innerHTML = node.innerHTML.replace(/<noscript[\S\s]*?<\/noscript>/ig, '');
    return node;
  };

  setAutofocusElement = function() {
    var autofocusElement, list;
    autofocusElement = (list = document.querySelectorAll('input[autofocus], textarea[autofocus]'))[list.length - 1];
    if (autofocusElement && document.activeElement !== autofocusElement) {
      return autofocusElement.focus();
    }
  };

  reflectNewUrl = function(url) {
    if ((url = new ComponentUrl(url)).absolute !== referer) {
      return window.history.pushState({
        turbolinks: true,
        url: url.absolute
      }, '', url.absolute);
    }
  };

  reflectRedirectedUrl = function() {
    var location, preservedHash;
    if (location = xhr.getResponseHeader('X-XHR-Redirected-To')) {
      location = new ComponentUrl(location);
      preservedHash = location.hasNoHash() ? document.location.hash : '';
      return window.history.replaceState(window.history.state, '', location.href + preservedHash);
    }
  };

  crossOriginRedirect = function() {
    var redirect;
    if (((redirect = xhr.getResponseHeader('Location')) != null) && (new ComponentUrl(redirect)).crossOrigin()) {
      return redirect;
    }
  };

  rememberReferer = function() {
    return referer = document.location.href;
  };

  rememberCurrentUrl = function() {
    return window.history.replaceState({
      turbolinks: true,
      url: document.location.href
    }, '', document.location.href);
  };

  rememberCurrentState = function() {
    return currentState = window.history.state;
  };

  manuallyTriggerHashChangeForFirefox = function() {
    var url;
    if (navigator.userAgent.match(/Firefox/) && !(url = new ComponentUrl).hasNoHash()) {
      window.history.replaceState(currentState, '', url.withoutHash());
      return document.location.hash = url.hash;
    }
  };

  recallScrollPosition = function(page) {
    return window.scrollTo(page.positionX, page.positionY);
  };

  resetScrollPosition = function() {
    if (document.location.hash) {
      return document.location.href = document.location.href;
    } else {
      return window.scrollTo(0, 0);
    }
  };

  clone = function(original) {
    var copy, key, value;
    if ((original == null) || typeof original !== 'object') {
      return original;
    }
    copy = new original.constructor();
    for (key in original) {
      value = original[key];
      copy[key] = clone(value);
    }
    return copy;
  };

  popCookie = function(name) {
    var ref, value;
    value = ((ref = document.cookie.match(new RegExp(name + "=(\\w+)"))) != null ? ref[1].toUpperCase() : void 0) || '';
    document.cookie = name + '=; expires=Thu, 01-Jan-70 00:00:01 GMT; path=/';
    return value;
  };

  triggerEvent = function(name, data) {
    var event;
    if (typeof Prototype !== 'undefined') {
      Event.fire(document, name, data, true);
    }
    event = document.createEvent('Events');
    if (data) {
      event.data = data;
    }
    event.initEvent(name, true, true);
    return document.dispatchEvent(event);
  };

  pageChangePrevented = function(url) {
    return !triggerEvent(EVENTS.BEFORE_CHANGE, {
      url: url
    });
  };

  processResponse = function() {
    var assetsChanged, clientOrServerError, doc, extractTrackAssets, intersection, validContent;
    clientOrServerError = function() {
      var ref;
      return (400 <= (ref = xhr.status) && ref < 600);
    };
    validContent = function() {
      var contentType;
      return ((contentType = xhr.getResponseHeader('Content-Type')) != null) && contentType.match(/^(?:text\/html|application\/xhtml\+xml|application\/xml)(?:;|$)/);
    };
    extractTrackAssets = function(doc) {
      var i, len, node, ref, results;
      ref = doc.querySelector('head').childNodes;
      results = [];
      for (i = 0, len = ref.length; i < len; i++) {
        node = ref[i];
        if ((typeof node.getAttribute === "function" ? node.getAttribute('data-turbolinks-track') : void 0) != null) {
          results.push(node.getAttribute('src') || node.getAttribute('href'));
        }
      }
      return results;
    };
    assetsChanged = function(doc) {
      var fetchedAssets;
      loadedAssets || (loadedAssets = extractTrackAssets(document));
      fetchedAssets = extractTrackAssets(doc);
      return fetchedAssets.length !== loadedAssets.length || intersection(fetchedAssets, loadedAssets).length !== loadedAssets.length;
    };
    intersection = function(a, b) {
      var i, len, ref, results, value;
      if (a.length > b.length) {
        ref = [b, a], a = ref[0], b = ref[1];
      }
      results = [];
      for (i = 0, len = a.length; i < len; i++) {
        value = a[i];
        if (indexOf.call(b, value) >= 0) {
          results.push(value);
        }
      }
      return results;
    };
    if (!clientOrServerError() && validContent()) {
      doc = createDocument(xhr.responseText);
      if (doc && !assetsChanged(doc)) {
        return doc;
      }
    }
  };

  extractTitleAndBody = function(doc) {
    var title;
    title = doc.querySelector('title');
    return [title != null ? title.textContent : void 0, removeNoscriptTags(doc.querySelector('body')), CSRFToken.get(doc).token, 'runScripts'];
  };

  CSRFToken = {
    get: function(doc) {
      var tag;
      if (doc == null) {
        doc = document;
      }
      return {
        node: tag = doc.querySelector('meta[name="csrf-token"]'),
        token: tag != null ? typeof tag.getAttribute === "function" ? tag.getAttribute('content') : void 0 : void 0
      };
    },
    update: function(latest) {
      var current;
      current = this.get();
      if ((current.token != null) && (latest != null) && current.token !== latest) {
        return current.node.setAttribute('content', latest);
      }
    }
  };

  createDocument = function(html) {
    var doc;
    doc = document.documentElement.cloneNode();
    doc.innerHTML = html;
    doc.head = doc.querySelector('head');
    doc.body = doc.querySelector('body');
    return doc;
  };

  ComponentUrl = (function() {
    function ComponentUrl(original1) {
      this.original = original1 != null ? original1 : document.location.href;
      if (this.original.constructor === ComponentUrl) {
        return this.original;
      }
      this._parse();
    }

    ComponentUrl.prototype.withoutHash = function() {
      return this.href.replace(this.hash, '').replace('#', '');
    };

    ComponentUrl.prototype.withoutHashForIE10compatibility = function() {
      return this.withoutHash();
    };

    ComponentUrl.prototype.hasNoHash = function() {
      return this.hash.length === 0;
    };

    ComponentUrl.prototype.crossOrigin = function() {
      return this.origin !== (new ComponentUrl).origin;
    };

    ComponentUrl.prototype._parse = function() {
      var ref;
      (this.link != null ? this.link : this.link = document.createElement('a')).href = this.original;
      ref = this.link, this.href = ref.href, this.protocol = ref.protocol, this.host = ref.host, this.hostname = ref.hostname, this.port = ref.port, this.pathname = ref.pathname, this.search = ref.search, this.hash = ref.hash;
      this.origin = [this.protocol, '//', this.hostname].join('');
      if (this.port.length !== 0) {
        this.origin += ":" + this.port;
      }
      this.relative = [this.pathname, this.search, this.hash].join('');
      return this.absolute = this.href;
    };

    return ComponentUrl;

  })();

  Link = (function(superClass) {
    extend(Link, superClass);

    Link.HTML_EXTENSIONS = ['html'];

    Link.allowExtensions = function() {
      var extension, extensions, i, len;
      extensions = 1 <= arguments.length ? slice.call(arguments, 0) : [];
      for (i = 0, len = extensions.length; i < len; i++) {
        extension = extensions[i];
        Link.HTML_EXTENSIONS.push(extension);
      }
      return Link.HTML_EXTENSIONS;
    };

    function Link(link1) {
      this.link = link1;
      if (this.link.constructor === Link) {
        return this.link;
      }
      this.original = this.link.href;
      this.originalElement = this.link;
      this.link = this.link.cloneNode(false);
      Link.__super__.constructor.apply(this, arguments);
    }

    Link.prototype.shouldIgnore = function() {
      return this.crossOrigin() || this._anchored() || this._nonHtml() || this._optOut() || this._target();
    };

    Link.prototype._anchored = function() {
      return (this.hash.length > 0 || this.href.charAt(this.href.length - 1) === '#') && (this.withoutHash() === (new ComponentUrl).withoutHash());
    };

    Link.prototype._nonHtml = function() {
      return this.pathname.match(/\.[a-z]+$/g) && !this.pathname.match(new RegExp("\\.(?:" + (Link.HTML_EXTENSIONS.join('|')) + ")?$", 'g'));
    };

    Link.prototype._optOut = function() {
      var ignore, link;
      link = this.originalElement;
      while (!(ignore || link === document)) {
        ignore = link.getAttribute('data-no-turbolink') != null;
        link = link.parentNode;
      }
      return ignore;
    };

    Link.prototype._target = function() {
      return this.link.target.length !== 0;
    };

    return Link;

  })(ComponentUrl);

  Click = (function() {
    Click.installHandlerLast = function(event) {
      if (!event.defaultPrevented) {
        document.removeEventListener('click', Click.handle, false);
        return document.addEventListener('click', Click.handle, false);
      }
    };

    Click.handle = function(event) {
      return new Click(event);
    };

    function Click(event1) {
      this.event = event1;
      if (this.event.defaultPrevented) {
        return;
      }
      this._extractLink();
      if (this._validForTurbolinks()) {
        if (!pageChangePrevented(this.link.absolute)) {
          visit(this.link.href);
        }
        this.event.preventDefault();
      }
    }

    Click.prototype._extractLink = function() {
      var link;
      link = this.event.target;
      while (!(!link.parentNode || link.nodeName === 'A')) {
        link = link.parentNode;
      }
      if (link.nodeName === 'A' && link.href.length !== 0) {
        return this.link = new Link(link);
      }
    };

    Click.prototype._validForTurbolinks = function() {
      return (this.link != null) && !(this.link.shouldIgnore() || this._nonStandardClick());
    };

    Click.prototype._nonStandardClick = function() {
      return this.event.which > 1 || this.event.metaKey || this.event.ctrlKey || this.event.shiftKey || this.event.altKey;
    };

    return Click;

  })();

  ProgressBar = (function() {
    var className;

    className = 'turbolinks-progress-bar';

    function ProgressBar(elementSelector) {
      this.elementSelector = elementSelector;
      this._trickle = bind(this._trickle, this);
      this.value = 0;
      this.content = '';
      this.speed = 300;
      this.opacity = 0.99;
      this.install();
    }

    ProgressBar.prototype.install = function() {
      this.element = document.querySelector(this.elementSelector);
      this.element.classList.add(className);
      this.styleElement = document.createElement('style');
      document.head.appendChild(this.styleElement);
      return this._updateStyle();
    };

    ProgressBar.prototype.uninstall = function() {
      this.element.classList.remove(className);
      return document.head.removeChild(this.styleElement);
    };

    ProgressBar.prototype.start = function() {
      return this.advanceTo(5);
    };

    ProgressBar.prototype.advanceTo = function(value) {
      var ref;
      if ((value > (ref = this.value) && ref <= 100)) {
        this.value = value;
        this._updateStyle();
        if (this.value === 100) {
          return this._stopTrickle();
        } else if (this.value > 0) {
          return this._startTrickle();
        }
      }
    };

    ProgressBar.prototype.done = function() {
      if (this.value > 0) {
        this.advanceTo(100);
        return this._reset();
      }
    };

    ProgressBar.prototype._reset = function() {
      var originalOpacity;
      originalOpacity = this.opacity;
      setTimeout((function(_this) {
        return function() {
          _this.opacity = 0;
          return _this._updateStyle();
        };
      })(this), this.speed / 2);
      return setTimeout((function(_this) {
        return function() {
          _this.value = 0;
          _this.opacity = originalOpacity;
          return _this._withSpeed(0, function() {
            return _this._updateStyle(true);
          });
        };
      })(this), this.speed);
    };

    ProgressBar.prototype._startTrickle = function() {
      if (this.trickling) {
        return;
      }
      this.trickling = true;
      return setTimeout(this._trickle, this.speed);
    };

    ProgressBar.prototype._stopTrickle = function() {
      return delete this.trickling;
    };

    ProgressBar.prototype._trickle = function() {
      if (!this.trickling) {
        return;
      }
      this.advanceTo(this.value + Math.random() / 2);
      return setTimeout(this._trickle, this.speed);
    };

    ProgressBar.prototype._withSpeed = function(speed, fn) {
      var originalSpeed, result;
      originalSpeed = this.speed;
      this.speed = speed;
      result = fn();
      this.speed = originalSpeed;
      return result;
    };

    ProgressBar.prototype._updateStyle = function(forceRepaint) {
      if (forceRepaint == null) {
        forceRepaint = false;
      }
      if (forceRepaint) {
        this._changeContentToForceRepaint();
      }
      return this.styleElement.textContent = this._createCSSRule();
    };

    ProgressBar.prototype._changeContentToForceRepaint = function() {
      return this.content = this.content === '' ? ' ' : '';
    };

    ProgressBar.prototype._createCSSRule = function() {
      return this.elementSelector + "." + className + "::before {\n  content: '" + this.content + "';\n  position: fixed;\n  top: 0;\n  left: 0;\n  z-index: 2000;\n  background-color: #0076ff;\n  height: 3px;\n  opacity: " + this.opacity + ";\n  width: " + this.value + "%;\n  transition: width " + this.speed + "ms ease-out, opacity " + (this.speed / 2) + "ms ease-in;\n  transform: translate3d(0,0,0);\n}";
    };

    return ProgressBar;

  })();

  bypassOnLoadPopstate = function(fn) {
    return setTimeout(fn, 500);
  };

  installDocumentReadyPageEventTriggers = function() {
    return document.addEventListener('DOMContentLoaded', (function() {
      triggerEvent(EVENTS.CHANGE);
      return triggerEvent(EVENTS.UPDATE);
    }), true);
  };

  installJqueryAjaxSuccessPageUpdateTrigger = function() {
    if (typeof jQuery !== 'undefined') {
      return jQuery(document).on('ajaxSuccess', function(event, xhr, settings) {
        if (!jQuery.trim(xhr.responseText)) {
          return;
        }
        return triggerEvent(EVENTS.UPDATE);
      });
    }
  };

  installHistoryChangeHandler = function(event) {
    var cachedPage, ref;
    if ((ref = event.state) != null ? ref.turbolinks : void 0) {
      if (cachedPage = pageCache[(new ComponentUrl(event.state.url)).absolute]) {
        cacheCurrentPage();
        return fetchHistory(cachedPage);
      } else {
        return visit(event.target.location.href);
      }
    }
  };

  initializeTurbolinks = function() {
    rememberCurrentUrl();
    rememberCurrentState();
    document.addEventListener('click', Click.installHandlerLast, true);
    window.addEventListener('hashchange', function(event) {
      rememberCurrentUrl();
      return rememberCurrentState();
    }, false);
    return bypassOnLoadPopstate(function() {
      return window.addEventListener('popstate', installHistoryChangeHandler, false);
    });
  };

  historyStateIsDefined = window.history.state !== void 0 || navigator.userAgent.match(/Firefox\/2[6|7]/);

  browserSupportsPushState = window.history && window.history.pushState && window.history.replaceState && historyStateIsDefined;

  browserIsntBuggy = !navigator.userAgent.match(/CriOS\//);

  requestMethodIsSafe = (ref = popCookie('request_method')) === 'GET' || ref === '';

  browserSupportsTurbolinks = browserSupportsPushState && browserIsntBuggy && requestMethodIsSafe;

  browserSupportsCustomEvents = document.addEventListener && document.createEvent;

  if (browserSupportsCustomEvents) {
    installDocumentReadyPageEventTriggers();
    installJqueryAjaxSuccessPageUpdateTrigger();
  }

  if (browserSupportsTurbolinks) {
    visit = fetch;
    initializeTurbolinks();
  } else {
    visit = function(url) {
      return document.location.href = url;
    };
  }

  this.Turbolinks = {
    visit: visit,
    pagesCached: pagesCached,
    enableTransitionCache: enableTransitionCache,
    enableProgressBar: enableProgressBar,
    allowLinkExtensions: Link.allowExtensions,
    supported: browserSupportsTurbolinks,
    EVENTS: clone(EVENTS)
  };

}).call(this);
// var startX, startY, topNodes, botNodes, topSideChains, primaryNode, secondaryNode, primarySC, secondarySC, ran, success, num, si, score;
// score = 0;
// success = false;
// var isDown = false;
// var canvas = document.getElementById("canvas");
// if(canvas.getContext){
// 	var context = canvas.getContext("2d");
// 	context.clearRect(0,0,canvas.width, canvas.height);
// }

// $('#unlimited').click(function(){
// 	$('#start, #unlimited, h2').hide();
// 	setNodes();
// 	drawSC();
// });

// $('#start').on('click', function(){
// 	$('#start, #unlimited, h2').hide();
// 	setTimer();
// 	//canvas setup
// 	setNodes();
// 	drawSC();
// });
// $('#canvas').on('mousedown', function(evt){
// 	success = false;
// 	evt.stopPropagation();
// 		evt.preventDefault();
// 	var downPositions = mousePosition(evt);
// 	startX = downPositions[0];
// 	startY = downPositions[1];
// 	if(intersects(startX, startY, primaryNode[0], primaryNode[1], 10)){
// 		isDown = true;
// 	}
// });

// $('#canvas').on('mousemove', function(evt) {
// 	if(!isDown){return;}
// 		var x = mousePosition(evt)[0];
// 		var y = mousePosition(evt)[1];

// 		if(isDown){
// 			context.clearRect(0,0,canvas.width, canvas.height);
// 			drawNodes();
// 			drawSC();
// 		var drawnAngle = getAngle(x,y);
// 		var psc;
// 		if(ran === 1){
// 			psc = primarySC[ran -1];
// 		}
// 		else{
// 			psc = primarySC[ran + 1];
// 		}
// 		if (Math.abs(drawnAngle - psc) < 10){
// 			success = true;
// 		}
// 		else{
// 			success = false;
// 		}
// 		drawLine(x,y);
// 	}
// });

// $('#canvas').on('mouseup', function(evt){
// 	evt.stopPropagation();
// 	evt.preventDefault();
// 	isDown = false;
// 	if(success){
// 		//redraw
// 		context.clearRect(0,0,canvas.width, canvas.height);
// 		setNodes();
// 		drawSC();
// 		score = score + (100 - num);

// 		if(num >= 10){
// 			num -= 10;
// 		}

// 		$('#score').show();

// 		if(isNaN(score)){
// 			$('#score').hide();
// 		}

// 		$('#score').text(score);
// 		console.log(score);
// 	}
// 	if(!success){
// 		num += 10;
// 	}
// });

// //just for logging
// $('#canvas').on('click', function(evt){
// 		var positions = mousePosition(evt);
// 		var x = positions[0];
// 		var y = positions[1];
//     console.log(x,y);

//     if(intersects(x,y,116,108,10)){
//     	console.log("intersects");
//     }
// });

// function setTimer(){
// 	$('#progressbar, #innerBar').show();
// 	$('#innerBar').width('0%');
// 	num = 0;
// 	si = setInterval(function(){
// 		var wid = num + '%';
// 		num++;

// 		if(num > 100){
// 			clearInterval(si);
// 			wid = '100%'
// 			$('h2').text('Game Over. Your score was: ' + score);
// 			$('h2').show();
// 			$('#playAgain').show();
// 		}
// 		$('#innerBar').width(wid);
// 	}, 500);
// }

// function getRandomInt(min, max) {
// 	return Math.floor(Math.random() * (max - min)) + min;
// }


// //set nodes. Counting starts at leftmost carbon and counts clockwise.
// function setNodes(){
// 	console.log('setNodes');
// 	//coordinates of each node (x,y) from carbon-1 clockwise.
// 	topNodes = [[116,106], [266,141], [414,105], [492, 225], [345, 191], [195,227]];
// 	botNodes = [[109,494], [185,376], [336,414], [481,375], [405,495], [257,455]];
// 	//angles of rotation for axial and then equatorial. In degrees.
// 	topSideChains = [[90, 192], [270,120], [90,345], [270, 13], [90, 303], [270, 166]];
// 	botSideChains = [[270,166], [90, 192], [270, 57], [90, 345], [270, 15], [90, 235]];

// 	//choose a chair to draw on and a chair to be the template // 1 || 2
// 	var randy = getRandomInt(0,2);
// 	//setup primary and secondary nodes. They correspond to the appropriate carbons on the alternate conformation. Secondary Node is template, Primary Node is where the user draws from.  
// 	var rand = getRandomInt(0, topNodes.length);

// 	ran = getRandomInt(0,2); //To determine axial or equatorial

// 	if(randy === 1){//Top sidechains to be user drawn, bottom chair is template.
// 		primaryNode = topNodes[rand];
// 		secondaryNode = botNodes[rand];
// 		primarySC = topSideChains[rand];
// 		secondarySC = botSideChains[rand];
// 	}
// 	else{//Bot sidechains to be user drawn, top chair is template.
// 		primaryNode = botNodes[rand];
// 		secondaryNode = topNodes[rand];
// 		primarySC = botSideChains[rand];
// 		secondarySC = topSideChains[rand];
// 	}	
// 	drawNodes();
// }

// //draws all nodes and changes color of primary and secondary nodes. These are selected at random in setNodes()
// function drawNodes(){
// 	//draw nodes top
// 	for(var i = 0; i < topNodes.length; i++){
// 		var x = topNodes[i][0];
// 		var y = topNodes[i][1];

// 		context.beginPath();
// 		context.globalAlpha = 0.4;
// 		if(x === primaryNode[0] && y === primaryNode[1]){
// 			context.strokeStyle = 'green';
// 			context.globalAlpha = 1;
// 		}
// 		else if(x === secondaryNode[0] && y === secondaryNode[1]){
// 			context.strokeStyle = 'red';
// 			context.globalAlpha = 1;
// 		}
// 		else{	
// 			context.strokeStyle = 'black';
// 		}
// 		context.lineWidth = 4;
// 		context.arc(x,y,10,0,2*Math.PI);
// 		context.closePath();
// 		context.stroke();
// 	}
// 	//draw bottom nodes
// 	for(var i = 0; i < botNodes.length; i++){
// 		var x = botNodes[i][0];
// 		var y = botNodes[i][1];

// 		context.beginPath();
// 		context.globalAlpha = 0.4;
// 		if(x === primaryNode[0] && y === primaryNode[1]){
// 			context.strokeStyle = 'green';
// 			context.globalAlpha = 1;
// 		}
// 		else if(x === secondaryNode[0] && y === secondaryNode[1]){
// 			context.strokeStyle = 'red'; 
// 			context.globalAlpha = 1;
// 		}
// 		else{
// 			context.strokeStyle = 'black';
// 		}
// 		context.arc(x,y,10,0,2*Math.PI);
// 		context.closePath();
// 		context.stroke();
// 	}
// }

// //draw side chain on a random chair at secondary node.
// function drawSC(){
// 	var ox = secondaryNode[0];
// 	var oy = secondaryNode[1];
// 	var direction = secondarySC[ran];//in degrees
// 	console.log("sc direction: " + direction);

// 	direction = direction * (Math.PI / 180); //to set direction to radians
// 	var opp = Math.sin(direction) * 50;// hyp = 50
// 	var adj = Math.cos(direction) * 50;
	
// 	var x = ox + adj;
// 	var y = oy - opp;

// 	context.beginPath();
// 	context.moveTo(ox, oy);
// 	context.strokeStyle = 'black';
// 	context.globalAlpha = 1;
// 	context.lineTo(x,y);
// 	context.closePath();
// 	context.stroke();
	
// }

// //getBoundingClientRect returns the dimensions of the canvas element including offsets, such as a border. This is used to adjust the mouse coordinates returned so that they correspond to the canvas directly and consistently.
// function mousePosition(evt){
// 	var rect = canvas.getBoundingClientRect();
// 	var x = Math.round((evt.clientX-rect.left)/(rect.right-rect.left)*canvas.width);
// 	var y = Math.round((evt.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height);
// 	var array = [x, y];
// 	return array
// }

// //called on mouse move
// function drawLine(x,y){
// 	context.beginPath();
// 	context.moveTo(primaryNode[0],primaryNode[1]);
// 	context.globalAlpha = 1;
// 	if(success){
// 		context.strokeStyle = 'green';
// 	}
// 	else{
// 		context.strokeStyle = 'black';	
// 	}
// 	context.lineTo(x, y);
// 	context.closePath();
// 	context.stroke();
// }

// //called on mouse move
// //returns angle from node to mouse
// function getAngle(x,y){
// 	var aX = x - primaryNode[0];
// 	var aY = y - primaryNode[1];
// 	//in Radians between [-PI <--> +PI]
// 	var theta = Math.atan2(-aY,aX);
// 	//for Non-negative values
// 	if(theta < 0){
// 		theta += 2 * Math.PI;
// 	}
// 	//to Degrees
// 	theta = theta * 180 / Math.PI;
// 	console.log(theta);
// 	return theta;
// }

// //http://stackoverflow.com/questions/2212604/javascript-check-mouse-clicked-inside-the-circle-or-polygon/2212851#2212851
// function intersects(x, y, cx, cy, r) {
// 	var dx = x - cx;
// 	var dy = y - cy;
// 	//Pythagorean Theorem
// 	return dx * dx + dy * dy <= r * r;
// }

// //TODO list:
// // drag and drop line only from node. [x]
// //calculate degrees rotated from origin (node) [x]
// //randomize node appearance. [x]
// //randomize drawing between different chairs [x]
// //draw template and allow drawing only from corresponding node on opposite chair.[x]
// //fix angle drawn [x]
// //Fix line color [x]
// //prevent template line to be cleared when drawing user line [x]
// //compare drawn line to template line [x]
// //timer[x]
// //scoring [x]
;
// var movie = new ChemDoodle.MovieCanvas3D('cyclohexane', 300, 300);
// // load the frames, which are read in from a XYZ movie file that has been split into the individual XYZ files to be read by the ChemDoodle.readXYZ() function
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -38.59443 KCAL = -161.47910 KJ; FOR REACTION COORDINATE = -176.55290 DEG\nC                0.0000      0.0000      0.0000\nC                1.5158      0.0000      0.0000\nC                2.0591      1.4144      0.0000\nC                1.5171      2.2065      1.1728\nC                0.0013      2.2193      1.1610\nC               -0.5553      0.8094      1.1544\nH                3.1787      1.3865      0.0508\nH                1.8900     -0.5445      0.9063\nH                1.8916     -0.5483     -0.9024\nH               -0.3710      0.4307     -0.9674\nH               -0.3761     -1.0540      0.0635\nH                1.8698      1.7417      2.1311\nH                1.9069      3.2559      1.1353\nH               -0.3773      2.7684      2.0618\nH               -0.3611      2.7691      0.2531\nH               -0.2976      0.3033      2.1219\nH               -1.6733      0.8476      1.0818\nH                1.7779      1.9242     -0.9586\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -38.34625 KCAL = -160.44071 KJ; FOR REACTION COORDINATE = -170.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5142      0.0000      0.0000\nC                2.1041      1.3951      0.0000\nC                1.5080      2.2796      1.0740\nC               -0.0041      2.2924      1.0153\nC               -0.5666      0.8896      1.0886\nH                3.2140      1.3278      0.1453\nH                1.8780     -0.5488      0.9096\nH                1.8862     -0.5593     -0.8980\nH               -0.3795      0.3358     -0.9991\nH               -0.3658     -1.0450      0.1843\nH                1.8512      1.9295      2.0828\nH                1.8921      3.3262      0.9451\nH               -0.4074      2.9010      1.8664\nH               -0.3372      2.7799      0.0617\nH               -0.3264      0.4464      2.0911\nH               -1.6832      0.9267      0.9963\nH                1.9264      1.8677     -1.0028\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -37.72036 KCAL = -157.82199 KJ; FOR REACTION COORDINATE = -165.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5138      0.0000      0.0000\nC                2.1364      1.3811      0.0000\nC                1.4968      2.3420      0.9775\nC               -0.0110      2.3507      0.8663\nC               -0.5781      0.9584      1.0224\nH                3.2300      1.2890      0.2320\nH                1.8701     -0.5521      0.9117\nH                1.8830     -0.5676     -0.8944\nH               -0.3840      0.2546     -1.0204\nH               -0.3598     -1.0279      0.2754\nH                1.8192      2.0915      2.0218\nH                1.8837      3.3765      0.7704\nH               -0.4419      3.0253      1.6512\nH               -0.3077      2.7648     -0.1337\nH               -0.3513      0.5800      2.0544\nH               -1.6935      0.9890      0.9140\nH                2.0526      1.8133     -1.0338\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -36.83616 KCAL = -154.12251 KJ; FOR REACTION COORDINATE = -160.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5138      0.0000      0.0000\nC                2.1670      1.3663      0.0000\nC                1.4865      2.4059      0.8617\nC               -0.0149      2.4083      0.6962\nC               -0.5905      1.0333      0.9378\nH                3.2342      1.2568      0.3292\nH                1.8633     -0.5566      0.9126\nH                1.8788     -0.5753     -0.8917\nH               -0.3842      0.1649     -1.0385\nH               -0.3564     -1.0014      0.3645\nH                1.7786      2.2631      1.9347\nH                1.8818      3.4185      0.5722\nH               -0.4699      3.1412      1.4128\nH               -0.2749      2.7458     -0.3416\nH               -0.3859      0.7299      1.9987\nH               -1.7036      1.0612      0.8054\nH                2.1885      1.7481     -1.0576\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -35.80020 KCAL = -149.78803 KJ; FOR REACTION COORDINATE = -155.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5133      0.0000      0.0000\nC                2.1947      1.3527      0.0000\nC                1.4718      2.4689      0.7200\nC               -0.0206      2.4536      0.4931\nC               -0.6067      1.1056      0.8382\nH                3.2198      1.2374      0.4430\nH                1.8573     -0.5602      0.9134\nH                1.8752     -0.5830     -0.8886\nH               -0.3829      0.0695     -1.0501\nH               -0.3534     -0.9673      0.4510\nH                1.7196      2.4420      1.8133\nH                1.8792      3.4491      0.3460\nH               -0.5036      3.2488      1.1194\nH               -0.2381      2.6932     -0.5813\nH               -0.4266      0.8911      1.9251\nH               -1.7167      1.1235      0.6797\nH                2.3377      1.6702     -1.0702\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.71743 KCAL = -145.25772 KJ; FOR REACTION COORDINATE = -150.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5139      0.0000      0.0000\nC                2.2198      1.3416      0.0000\nC                1.4578      2.5262      0.5519\nC               -0.0224      2.4826      0.2631\nC               -0.6199      1.1759      0.7229\nH                3.1834      1.2374      0.5669\nH                1.8537     -0.5644      0.9128\nH                1.8707     -0.5890     -0.8871\nH               -0.3790     -0.0313     -1.0541\nH               -0.3529     -0.9244      0.5337\nH                1.6505      2.6212      1.6531\nH                1.8842      3.4612      0.0932\nH               -0.5323      3.3367      0.7804\nH               -0.1944      2.6067     -0.8389\nH               -0.4610      1.0634      1.8283\nH               -1.7266      1.1803      0.5426\nH                2.5004      1.5823     -1.0632\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -33.69361 KCAL = -140.97405 KJ; FOR REACTION COORDINATE = -145.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5144      0.0000      0.0000\nC                2.2402      1.3325      0.0000\nC                1.4488      2.5715      0.3574\nC               -0.0168      2.4908      0.0086\nC               -0.6293      1.2413      0.5919\nH                3.1179      1.2588      0.6971\nH                1.8532     -0.5693      0.9103\nH                1.8661     -0.5932     -0.8869\nH               -0.3738     -0.1353     -1.0487\nH               -0.3554     -0.8734      0.6115\nH                1.5763      2.7947      1.4503\nH                1.8998      3.4477     -0.1848\nH               -0.5468      3.3968      0.4032\nH               -0.1423      2.4860     -1.1062\nH               -0.4902      1.2427      1.7053\nH               -1.7331      1.2287      0.3927\nH                2.6683      1.4871     -1.0296\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.86477 KCAL = -137.50619 KJ; FOR REACTION COORDINATE = -140.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5154      0.0000      0.0000\nC                2.2491      1.3280      0.0000\nC                1.4499      2.6012      0.1761\nC               -0.0007      2.4792     -0.2208\nC               -0.6323      1.2919      0.4657\nH                3.0359      1.2959      0.8017\nH                1.8557     -0.5742      0.9065\nH                1.8627     -0.5932     -0.8892\nH               -0.3701     -0.2333     -1.0332\nH               -0.3593     -0.8155      0.6842\nH                1.5287      2.9469      1.2415\nH                1.9263      3.4104     -0.4423\nH               -0.5463      3.4182      0.0585\nH               -0.0834      2.3608     -1.3332\nH               -0.5126      1.3949      1.5765\nH               -1.7325      1.2653      0.2496\nH                2.8041      1.4072     -0.9763\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.30529 KCAL = -135.16535 KJ; FOR REACTION COORDINATE = -135.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5153      0.0000      0.0000\nC                2.2545      1.3254      0.0000\nC                1.4506      2.6085     -0.0029\nC                0.0141      2.4458     -0.4351\nC               -0.6379      1.3268      0.3410\nH                2.9371      1.3478      0.8929\nH                1.8591     -0.5783      0.9021\nH                1.8590     -0.5911     -0.8926\nH               -0.3678     -0.3282     -1.0084\nH               -0.3600     -0.7527      0.7527\nH                1.4855      3.0680      1.0215\nH                1.9525      3.3455     -0.6874\nH               -0.5385      3.4065     -0.2639\nH               -0.0347      2.2210     -1.5328\nH               -0.5384      1.5274      1.4405\nH               -1.7335      1.2846      0.1058\nH                2.9267      1.3378     -0.9025\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.08211 KCAL = -134.23155 KJ; FOR REACTION COORDINATE = -130.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5160      0.0000      0.0000\nC                2.2534      1.3263      0.0000\nC                1.4620      2.5999     -0.2167\nC                0.0456      2.3808     -0.6915\nC               -0.6373      1.3571      0.1858\nH                2.7990      1.4237      0.9785\nH                1.8656     -0.5818      0.8969\nH                1.8566     -0.5863     -0.8975\nH               -0.3611     -0.4315     -0.9725\nH               -0.3673     -0.6820      0.8128\nH                1.4347      3.1806      0.7450\nH                2.0013      3.2447     -0.9613\nH               -0.5150      3.3511     -0.6606\nH                0.0461      2.0268     -1.7557\nH               -0.5637      1.6733      1.2594\nH               -1.7270      1.2952     -0.0705\nH                3.0502      1.2702     -0.7922\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.18014 KCAL = -134.64170 KJ; FOR REACTION COORDINATE = -125.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5159      0.0000      0.0000\nC                2.2428      1.3316      0.0000\nC                1.4804      2.5690     -0.4305\nC                0.0829      2.2910     -0.9343\nC               -0.6331      1.3704      0.0284\nH                2.6332      1.5152      1.0389\nH                1.8726     -0.5831      0.8924\nH                1.8561     -0.5783     -0.9032\nH               -0.3541     -0.5302     -0.9268\nH               -0.3745     -0.6066      0.8663\nH                1.3938      3.2621      0.4503\nH                2.0601      3.1117     -1.2221\nH               -0.4786      3.2561     -1.0332\nH                0.1235      1.8190     -1.9503\nH               -0.5847      1.7972      1.0644\nH               -1.7163      1.2884     -0.2494\nH                3.1493      1.2241     -0.6562\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.54234 KCAL = -136.15714 KJ; FOR REACTION COORDINATE = -120.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5163      0.0000      0.0000\nC                2.2281      1.3379      0.0000\nC                1.5071      2.5259     -0.6069\nC                0.1296      2.1951     -1.1355\nC               -0.6244      1.3700     -0.1161\nH                2.4800      1.5973      1.0653\nH                1.8780     -0.5820      0.8905\nH                1.8583     -0.5718     -0.9067\nH               -0.3499     -0.6181     -0.8732\nH               -0.3804     -0.5275      0.9136\nH                1.3848      3.3144      0.1848\nH                2.1266      2.9687     -1.4291\nH               -0.4266      3.1432     -1.3548\nH                0.2109      1.6239     -2.0970\nH               -0.6068      1.8890      0.8778\nH               -1.6988      1.2681     -0.4207\nH                3.2108      1.2026     -0.5280\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -33.09095 KCAL = -138.45251 KJ; FOR REACTION COORDINATE = -115.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5158      0.0000      0.0000\nC                2.2085      1.3479      0.0000\nC                1.5269      2.4759     -0.7496\nC                0.1630      2.1079     -1.2900\nC               -0.6207      1.3567     -0.2359\nH                2.3381      1.6715      1.0694\nH                1.8819     -0.5789      0.8901\nH                1.8616     -0.5654     -0.9090\nH               -0.3490     -0.6923     -0.8159\nH               -0.3822     -0.4455      0.9555\nH                1.3897      3.3414     -0.0457\nH                2.1795      2.8262     -1.5905\nH               -0.3859      3.0381     -1.5893\nH                0.2686      1.4700     -2.2059\nH               -0.6299      1.9491      0.7165\nH               -1.6859      1.2327     -0.5624\nH                3.2430      1.2054     -0.4137\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -33.72467 KCAL = -141.10403 KJ; FOR REACTION COORDINATE = -110.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5168      0.0000      0.0000\nC                2.1897      1.3569      0.0000\nC                1.5591      2.4194     -0.8796\nC                0.2045      2.0186     -1.4249\nC               -0.6080      1.3408     -0.3428\nH                2.2035      1.7393      1.0573\nH                1.8851     -0.5753      0.8910\nH                1.8667     -0.5600     -0.9103\nH               -0.3514     -0.7551     -0.7559\nH               -0.3853     -0.3602      0.9895\nH                1.4172      3.3520     -0.2691\nH                2.2444      2.6725     -1.7291\nH               -0.3346      2.9262     -1.8013\nH                0.3303      1.3187     -2.2922\nH               -0.6367      1.9939      0.5685\nH               -1.6654      1.1998     -0.6863\nH                3.2619      1.2163     -0.3019\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.36118 KCAL = -143.76717 KJ; FOR REACTION COORDINATE = -105.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5163      0.0000      0.0000\nC                2.1637      1.3681      0.0000\nC                1.5921      2.3547     -0.9998\nC                0.2489      1.9240     -1.5527\nC               -0.5984      1.3116     -0.4583\nH                2.0613      1.8052      1.0305\nH                1.8873     -0.5716      0.8916\nH                1.8715     -0.5546     -0.9110\nH               -0.3515     -0.8168     -0.6882\nH               -0.3853     -0.2725      1.0169\nH                1.4509      3.3438     -0.4866\nH                2.3107      2.5094     -1.8450\nH               -0.2770      2.8089     -1.9957\nH                0.3962      1.1752     -2.3744\nH               -0.6644      2.0248      0.4047\nH               -1.6409      1.1396     -0.8320\nH                3.2629      1.2427     -0.1889\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.90759 KCAL = -146.05335 KJ; FOR REACTION COORDINATE = -100.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5165      0.0000      0.0000\nC                2.1308      1.3836      0.0000\nC                1.6209      2.2852     -1.1086\nC                0.2890      1.8242     -1.6677\nC               -0.5896      1.2751     -0.5638\nH                1.9143      1.8682      0.9900\nH                1.8899     -0.5650      0.8942\nH                1.8791     -0.5497     -0.9102\nH               -0.3537     -0.8692     -0.6186\nH               -0.3851     -0.1828      1.0367\nH                1.4843      3.3202     -0.6950\nH                2.3725      2.3450     -1.9367\nH               -0.2238      2.6824     -2.1741\nH                0.4543      1.0293     -2.4414\nH               -0.6867      2.0420      0.2490\nH               -1.6192      1.0739     -0.9576\nH                3.2455      1.2872     -0.0796\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -35.29061 KCAL = -147.65592 KJ; FOR REACTION COORDINATE = -95.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5165      0.0000      0.0000\nC                2.1066      1.3933      0.0000\nC                1.6521      2.2265     -1.1845\nC                0.3250      1.7553     -1.7473\nC               -0.5812      1.2396     -0.6496\nH                1.8078      1.9108      0.9505\nH                1.8910     -0.5610      0.8959\nH                1.8845     -0.5467     -0.9092\nH               -0.3585     -0.9108     -0.5500\nH               -0.3829     -0.0918      1.0498\nH                1.5468      3.2945     -0.8565\nH                2.4270      2.1989     -1.9935\nH               -0.1741      2.5995     -2.2898\nH                0.5010      0.9367     -2.4941\nH               -0.7179      2.0419      0.1227\nH               -1.5930      1.0054     -1.0708\nH                3.2256      1.3220      0.0013\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -35.43405 KCAL = -148.25608 KJ; FOR REACTION COORDINATE = -90.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5172      0.0000      0.0000\nC                2.0773      1.4065      0.0000\nC                1.6702      2.1770     -1.2416\nC                0.3470      1.7015     -1.8103\nC               -0.5806      1.1995     -0.7246\nH                1.7076      1.9454      0.9123\nH                1.8927     -0.5555      0.8982\nH                1.8914     -0.5428     -0.9079\nH               -0.3646     -0.9459     -0.4794\nH               -0.3759      0.0000      1.0569\nH                1.6029      3.2676     -0.9884\nH                2.4629      2.0723     -2.0282\nH               -0.1444      2.5392     -2.3700\nH                0.5316      0.8738     -2.5446\nH               -0.7643      2.0274      0.0092\nH               -1.5714      0.9260     -1.1718\nH                3.1955      1.3666      0.0682\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -35.15942 KCAL = -147.10700 KJ; FOR REACTION COORDINATE = 145.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5156      0.0000      0.0000\nC                2.0546      1.4144      0.0000\nC                1.7020      2.1275     -1.2890\nC                0.3535      1.7053     -1.8409\nC               -0.5838      1.1625     -0.7812\nH                1.6241      1.9733      0.8722\nH                1.8923     -0.5523      0.8995\nH                1.8944     -0.5396     -0.9074\nH               -0.3637     -0.9686     -0.4335\nH               -0.3754      0.0460      1.0560\nH                1.7061      3.2341     -1.1049\nH                2.4910      1.9225     -2.0597\nH               -0.1413      2.5879     -2.3258\nH                0.5031      0.9227     -2.6304\nH               -0.8517      1.9895     -0.0727\nH               -1.5271      0.8292     -1.2895\nH                3.1678      1.3985      0.1299\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.65585 KCAL = -145.00008 KJ; FOR REACTION COORDINATE = 140.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5146      0.0000      0.0000\nC                2.0373      1.4215      0.0000\nC                1.7148      2.1009     -1.3139\nC                0.3587      1.7039     -1.8651\nC               -0.5908      1.1184     -0.8376\nH                1.5713      1.9887      0.8478\nH                1.8925     -0.5491      0.9007\nH                1.8971     -0.5376     -0.9067\nH               -0.3634     -0.9907     -0.3809\nH               -0.3726      0.0991      1.0537\nH                1.7538      3.2126     -1.1676\nH                2.5038      1.8452     -2.0696\nH               -0.1397      2.6107     -2.3012\nH                0.5011      0.9600     -2.6924\nH               -0.9439      1.9393     -0.1600\nH               -1.4823      0.7255     -1.3960\nH                3.1459      1.4234      0.1640\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.00290 KCAL = -142.26813 KJ; FOR REACTION COORDINATE = 135.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5134      0.0000      0.0000\nC                2.0307      1.4231      0.0000\nC                1.7309      2.0779     -1.3308\nC                0.3657      1.7124     -1.8819\nC               -0.5925      1.0736     -0.8936\nH                1.5446      1.9987      0.8303\nH                1.8908     -0.5482      0.9016\nH                1.8975     -0.5379     -0.9058\nH               -0.3645     -1.0092     -0.3276\nH               -0.3703      0.1540      1.0481\nH                1.8055      3.1914     -1.2135\nH                2.5154      1.7779     -2.0753\nH               -0.1351      2.6452     -2.2585\nH                0.4991      1.0201     -2.7544\nH               -1.0346      1.8783     -0.2488\nH               -1.4264      0.6232     -1.4971\nH                3.1357      1.4330      0.1859\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -33.31678 KCAL = -139.39741 KJ; FOR REACTION COORDINATE = 130.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5119      0.0000      0.0000\nC                2.0240      1.4250      0.0000\nC                1.7237      2.0737     -1.3328\nC                0.3444      1.7472     -1.8725\nC               -0.6074      1.0347     -0.9275\nH                1.5340      1.9997      0.8288\nH                1.8895     -0.5467      0.9023\nH                1.8981     -0.5371     -0.9053\nH               -0.3632     -1.0223     -0.2875\nH               -0.3654      0.1899      1.0446\nH                1.8318      3.1860     -1.2276\nH                2.4926      1.7440     -2.0815\nH               -0.1623      2.7066     -2.1665\nH                0.4604      1.1272     -2.8004\nH               -1.1379      1.8043     -0.3063\nH               -1.3785      0.5310     -1.5717\nH                3.1284      1.4410      0.1873\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.69707 KCAL = -136.80454 KJ; FOR REACTION COORDINATE = 125.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5114      0.0000      0.0000\nC                2.0251      1.4232      0.0000\nC                1.7082      2.0856     -1.3205\nC                0.3086      1.8124     -1.8346\nC               -0.6230      1.0079     -0.9462\nH                1.5511      1.9934      0.8412\nH                1.8876     -0.5465      0.9033\nH                1.8977     -0.5393     -0.9040\nH               -0.3624     -1.0300     -0.2603\nH               -0.3604      0.2123      1.0425\nH                1.8576      3.1932     -1.2145\nH                2.4500      1.7342     -2.0874\nH               -0.2009      2.7965     -2.0247\nH                0.3933      1.2902     -2.8253\nH               -1.2424      1.7235     -0.3417\nH               -1.3269      0.4627     -1.6331\nH                3.1331      1.4339      0.1692\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.25889 KCAL = -134.97121 KJ; FOR REACTION COORDINATE = 120.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5110      0.0000      0.0000\nC                2.0266      1.4215      0.0000\nC                1.7027      2.0851     -1.3186\nC                0.2877      1.8531     -1.8092\nC               -0.6284      0.9710     -0.9799\nH                1.5597      1.9917      0.8451\nH                1.8857     -0.5467      0.9040\nH                1.8970     -0.5408     -0.9033\nH               -0.3639     -1.0385     -0.2215\nH               -0.3572      0.2504      1.0355\nH                1.8867      3.1886     -1.2252\nH                2.4201      1.7048     -2.0952\nH               -0.2211      2.8514     -1.9068\nH                0.3473      1.4224     -2.8456\nH               -1.3311      1.6346     -0.4063\nH               -1.2608      0.3853     -1.7022\nH                3.1359      1.4301      0.1612\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.07744 KCAL = -134.21200 KJ; FOR REACTION COORDINATE = 115.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5109      0.0000      0.0000\nC                2.0222      1.4226      0.0000\nC                1.6968      2.0838     -1.3188\nC                0.2672      1.8896     -1.7834\nC               -0.6285      0.9354     -1.0140\nH                1.5537      1.9931      0.8441\nH                1.8858     -0.5453      0.9049\nH                1.8977     -0.5411     -0.9027\nH               -0.3654     -1.0451     -0.1844\nH               -0.3547      0.2878      1.0267\nH                1.9144      3.1822     -1.2414\nH                2.3905      1.6732     -2.1019\nH               -0.2397      2.8935     -1.7929\nH                0.2997      1.5497     -2.8551\nH               -1.4074      1.5456     -0.4791\nH               -1.1851      0.3142     -1.7681\nH                3.1315      1.4343      0.1613\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.20434 KCAL = -134.74296 KJ; FOR REACTION COORDINATE = 110.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5104      0.0000      0.0000\nC                2.0293      1.4191      0.0000\nC                1.6782      2.0954     -1.3041\nC                0.2313      1.9449     -1.7273\nC               -0.6326      0.9101     -1.0332\nH                1.5851      1.9842      0.8607\nH                1.8838     -0.5466      0.9050\nH                1.8960     -0.5436     -0.9020\nH               -0.3672     -1.0487     -0.1590\nH               -0.3516      0.3126      1.0210\nH                1.9286      3.1871     -1.2305\nH                2.3365      1.6686     -2.1092\nH               -0.2701      2.9464     -1.6276\nH                0.2239      1.7169     -2.8296\nH               -1.4833      1.4504     -0.5321\nH               -1.1113      0.2670     -1.8218\nH                3.1423      1.4222      0.1348\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -32.63798 KCAL = -136.55730 KJ; FOR REACTION COORDINATE = 105.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5097      0.0000      0.0000\nC                2.0444      1.4119      0.0000\nC                1.6577      2.1276     -1.2719\nC                0.1933      2.0182     -1.6425\nC               -0.6329      0.9008     -1.0402\nH                1.6411      1.9657      0.8886\nH                1.8821     -0.5492      0.9041\nH                1.8917     -0.5455     -0.9030\nH               -0.3693     -1.0490     -0.1511\nH               -0.3515      0.3222      1.0182\nH                1.9321      3.2122     -1.1819\nH                2.2749      1.7074     -2.1126\nH               -0.3010      3.0015     -1.4114\nH                0.1360      1.9199     -2.7634\nH               -1.5459      1.3654     -0.5720\nH               -1.0305      0.2530     -1.8690\nH                3.1616      1.3975      0.0948\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -33.34283 KCAL = -139.50639 KJ; FOR REACTION COORDINATE = 100.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5106      0.0000      0.0000\nC                2.0459      1.4116      0.0000\nC                1.6421      2.1382     -1.2611\nC                0.1661      2.0559     -1.5869\nC               -0.6261      0.8784     -1.0620\nH                1.6564      1.9607      0.8975\nH                1.8830     -0.5489      0.9042\nH                1.8917     -0.5458     -0.9031\nH               -0.3702     -1.0514     -0.1295\nH               -0.3517      0.3458      1.0103\nH                1.9388      3.2172     -1.1780\nH                2.2267      1.7059     -2.1186\nH               -0.3211      3.0135     -1.2557\nH                0.0680      2.0584     -2.7093\nH               -1.5914      1.2797     -0.6416\nH               -0.9407      0.2238     -1.9204\nH                3.1646      1.3946      0.0780\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -34.23848 KCAL = -143.25381 KJ; FOR REACTION COORDINATE = 95.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5110      0.0000      0.0000\nC                2.0529      1.4087      0.0000\nC                1.6354      2.1481     -1.2500\nC                0.1487      2.0910     -1.5286\nC               -0.6114      0.8618     -1.0840\nH                1.6790      1.9536      0.9068\nH                1.8826     -0.5491      0.9046\nH                1.8900     -0.5488     -0.9023\nH               -0.3732     -1.0517     -0.1133\nH               -0.3555      0.3669      1.0010\nH                1.9520      3.2215     -1.1724\nH                2.1872      1.7073     -2.1242\nH               -0.3277      3.0145     -1.0995\nH                0.0093      2.1909     -2.6422\nH               -1.6203      1.2029     -0.7155\nH               -0.8395      0.2086     -1.9696\nH                3.1725      1.3850      0.0621\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -35.24500 KCAL = -147.46510 KJ; FOR REACTION COORDINATE = 90.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5112      0.0000      0.0000\nC                2.0601      1.4062      0.0000\nC                1.6184      2.1599     -1.2336\nC                0.1227      2.1239     -1.4623\nC               -0.6025      0.8486     -1.0989\nH                1.7083      1.9461      0.9187\nH                1.8833     -0.5510      0.9033\nH                1.8876     -0.5476     -0.9045\nH               -0.3745     -1.0524     -0.1013\nH               -0.3571      0.3826      0.9944\nH                1.9524      3.2281     -1.1593\nH                2.1352      1.7152     -2.1270\nH               -0.3405      3.0015     -0.9355\nH               -0.0598      2.3183     -2.5571\nH               -1.6460      1.1298     -0.7805\nH               -0.7447      0.2057     -2.0093\nH                3.1804      1.3764      0.0380\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -36.26816 KCAL = -151.74596 KJ; FOR REACTION COORDINATE = 85.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5119      0.0000      0.0000\nC                2.0655      1.4052      0.0000\nC                1.5957      2.1805     -1.2108\nC                0.0932      2.1584     -1.3861\nC               -0.5924      0.8411     -1.1095\nH                1.7400      1.9345      0.9345\nH                1.8843     -0.5521      0.9023\nH                1.8861     -0.5477     -0.9053\nH               -0.3754     -1.0525     -0.0947\nH               -0.3599      0.3918      0.9894\nH                1.9415      3.2445     -1.1314\nH                2.0777      1.7429     -2.1263\nH               -0.3549      2.9760     -0.7597\nH               -0.1355      2.4479     -2.4502\nH               -1.6646      1.0609     -0.8437\nH               -0.6484      0.2193     -2.0431\nH                3.1863      1.3701      0.0085\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -37.20527 KCAL = -155.66683 KJ; FOR REACTION COORDINATE = 80.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5127      0.0000      0.0000\nC                2.0700      1.4045      0.0000\nC                1.5704      2.2070     -1.1811\nC                0.0621      2.1930     -1.3011\nC               -0.5836      0.8398     -1.1150\nH                1.7757      1.9207      0.9522\nH                1.8856     -0.5519      0.9022\nH                1.8857     -0.5477     -0.9058\nH               -0.3753     -1.0525     -0.0942\nH               -0.3630      0.3956      0.9864\nH                1.9242      3.2672     -1.0903\nH                2.0181      1.7860     -2.1210\nH               -0.3671      2.9357     -0.5767\nH               -0.2137      2.5744     -2.3230\nH               -1.6759      1.0025     -0.8976\nH               -0.5545      0.2503     -2.0700\nH                3.1905      1.3637     -0.0253\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -37.93698 KCAL = -158.72834 KJ; FOR REACTION COORDINATE = 75.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5136      0.0000      0.0000\nC                2.0735      1.4039      0.0000\nC                1.5422      2.2394     -1.1436\nC                0.0296      2.2274     -1.2054\nC               -0.5759      0.8446     -1.1155\nH                1.8161      1.9044      0.9716\nH                1.8872     -0.5505      0.9028\nH                1.8861     -0.5476     -0.9059\nH               -0.3744     -1.0525     -0.0999\nH               -0.3663      0.3939      0.9855\nH                1.9011      3.2960     -1.0351\nH                1.9546      1.8441     -2.1099\nH               -0.3753      2.8798     -0.3871\nH               -0.2948      2.6985     -2.1726\nH               -1.6825      0.9508     -0.9457\nH               -0.4636      0.2991     -2.0893\nH                3.1926      1.3578     -0.0632\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -38.47390 KCAL = -160.97480 KJ; FOR REACTION COORDINATE = 70.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5143      0.0000      0.0000\nC                2.0727      1.4065      0.0000\nC                1.5394      2.2149     -1.1642\nC                0.0252      2.2151     -1.1970\nC               -0.5559      0.8183     -1.1470\nH                1.8000      1.9154      0.9621\nH                1.8885     -0.5517      0.9016\nH                1.8856     -0.5472     -0.9066\nH               -0.3766     -1.0531     -0.0753\nH               -0.3707      0.4218      0.9713\nH                1.9121      3.2696     -1.0919\nH                1.9311      1.7846     -2.1237\nH               -0.3631      2.8220     -0.3370\nH               -0.3223      2.7225     -2.1359\nH               -1.6711      0.8896     -1.0414\nH               -0.3548      0.2854     -2.1135\nH                3.1919      1.3662     -0.0533\n')], []);
// movie.addFrame([ChemDoodle.readXYZ('18\nHEAT OF FORMATION = -38.62079 KCAL = -161.58938 KJ; FOR REACTION COORDINATE = 66.00000 DEG\nC                0.0000      0.0000      0.0000\nC                1.5152      0.0000      0.0000\nC                2.0658      1.4114      0.0000\nC                1.5158      2.2171     -1.1593\nC                0.0008      2.2167     -1.1613\nC               -0.5509      0.8056     -1.1590\nH                1.7974      1.9162      0.9652\nH                1.8905     -0.5497      0.9020\nH                1.8880     -0.5457     -0.9064\nH               -0.3755     -1.0543     -0.0638\nH               -0.3729      0.4328      0.9654\nH                1.8909      3.2715     -1.0954\nH                1.8899      1.7842     -2.1243\nH               -0.3727      2.7646     -0.2563\nH               -0.3736      2.7647     -2.0647\nH               -1.6694      0.8405     -1.0936\nH               -0.2855      0.2995     -2.1242\nH                3.1845      1.3782     -0.0629\n')], []);
// movie.specs.set3DRepresentation('Ball and Stick');
// movie.specs.backgroundColor = 'black';
// // preload the first frame of the movie
// movie.loadMolecule(movie.frames[0].mols[0]);
// // start the movie
// movie.startAnimation();
// var projections = [['1_back', '1_front', 300, '6.10'], ['2_back', '2_front', 300, '6.11'], ['3_back', '3_front', 180, '6.12'], ['4_back', '4_front', 180, '6.13'], ['5_back', '5_front', 180, '6.14']];

// $(document).ready(function(){
//     setup();
//     $('#stable').hide();

//     function getRandomInt(min, max) {
//         return Math.floor(Math.random() * (max - min)) + min;
//     };

//     function setup(){
//         //setup random images 
//         var rand = getRandomInt(0, projections.length);
//         $('#back').attr('src', 'images/newman/newman_' + projections[rand][0] + '.png');
//         $('#front').attr('src', 'images/newman/newman_' + projections[rand][1] + '.png');
//         $('#molec').attr('src', 'images/newman/newman_projections/' + projections[rand][3] + '.png');
//         //global variable for expected angle to compare against userAngle
//         expectedAngle = projections[rand][2];

        
//     };
//     //rotation
//     var userAngle;
//     $('#back').propeller({
//         inertia: 0, 
//         speed: 0,
//         onDragStop: function(){
//             userAngle = this.angle;
//             console.log("inside callback: ", userAngle);
//             parseAngle();
//         }
//     });

//     function parseAngle(){
//         console.log("user: "+ userAngle);
//         console.log( "expected: " + expectedAngle);
//         if(Math.abs(userAngle - expectedAngle)  < 10){
//             console.log('parsed');
//             $('#stable').show();
//             fireWorkIt();
//         }
//     };
// });







// //http://codepen.io/loktar00/pen/fczsA
// function fireWorkIt(){
//     (function () {
//     var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
//     window.requestAnimationFrame = requestAnimationFrame;
// })();


// var canvas = document.getElementById("canvas"),
//     ctx = canvas.getContext("2d"),
//     width = 0,
//     height = 0,
//     vanishPointY = 0,
//     vanishPointX = 0,
//     focalLength = 300,
//     angleX = 180,
//     angleY = 180,
//     angleZ = 180,
//     angle = 0,
//     cycle = 0,
//     colors = {r : 255, g : 0, b : 0},
//     lastShot = new Date().getTime();

// canvas.width = width;
// canvas.height = height;

// /*
//  *  Controls the emitter
//  */
// function Emitter() {
//     this.reset();
// }

// Emitter.prototype.reset = function () {
//     var PART_NUM = 200,
//         x = (Math.random() * 400) - 200,
//         y = (Math.random() * 400) - 200,
//         z = (Math.random() * 800) - 200;
    
//     this.x = x || 0;
//     this.y = y || 0;
//     this.z = z || 0;
    
//     var color = [~~(Math.random() * 150) + 10, ~~(Math.random() * 150) + 10, ~~(Math.random() * 150) + 10]
//     this.particles = [];

//     for (var i = 0; i < PART_NUM; i++) {
//         this.particles.push(new Particle(this.x, this.y, this.z, {
//             r: colors.r,
//             g: colors.g,
//             b: colors.b
//         }));
//     }
// }

// Emitter.prototype.update = function () {
//     var partLen = this.particles.length;

//     angleY = (angle - vanishPointX) * 0.0001;
//     angleX = (angle - vanishPointX) * 0.0001;

//     this.particles.sort(function (a, b) {
//         return b.z - a.z;
//     });

//     for (var i = 0; i < partLen; i++) {
//         this.particles[i].update();
//     }
    
//     if(this.particles.length <= 0){
//       this.reset();   
//     }

// };

// Emitter.prototype.render = function (imgData) {
//     var data = imgData.data;

//     for (i = 0; i < this.particles.length; i++) {
//         var particle = this.particles[i],
//             dist = Math.sqrt((particle.x - particle.ox) * (particle.x - particle.ox) + (particle.y - particle.oy) * (particle.y - particle.oy) + (particle.z - particle.oz) * (particle.z - particle.oz));

//         if (dist > 255) {
//             particle.render = false;
//             this.particles.splice(i, 1);
//             this.particles.length--;
//         }

//         if (particle.render && particle.xPos < width && particle.xPos > 0 && particle.yPos > 0 && particle.yPos < height) {
//             for (w = 0; w < particle.size; w++) {
//                 for (h = 0; h < particle.size; h++) {
//                     if (particle.xPos + w < width && particle.xPos + w > 0 && particle.yPos + h > 0 && particle.yPos + h < height) {
//                         pData = (~~ (particle.xPos + w) + (~~ (particle.yPos + h) * width)) * 4;
//                         data[pData] = particle.color[0];
//                         data[pData + 1] = particle.color[1];
//                         data[pData + 2] = particle.color[2];
//                         data[pData + 3] = 255 - dist;
//                     }
//                 }
//             }
//         }
//     }
// };


// /*
//  *  Controls the individual particles
//  */
// function Particle(x, y, z, color) {
//     this.x = x;
//     this.y = y;
//     this.z = z;

//     this.startX = this.x;
//     this.startY = this.y;
//     this.startZ = this.z;

//     this.ox = this.x;
//     this.oy = this.y;
//     this.oz = this.z;

//     this.xPos = 0;
//     this.yPos = 0;

//     this.vx = (Math.random() * 10) - 5;
//     this.vy = (Math.random() * 10) - 5;
//     this.vz = (Math.random() * 10) - 5;

//     this.color = [color.r, color.g, color.b];
//     this.render = true;

//     this.size = Math.round(1 + Math.random() * 1);
// }

// Particle.prototype.rotate = function () {
//     var x = this.startX * Math.cos(angleZ) - this.startY * Math.sin(angleZ),
//         y = this.startY * Math.cos(angleZ) + this.startX * Math.sin(angleZ);

//      this.x = x;
//      this.y = y;
// }

// Particle.prototype.update = function () {
//     var cosY = Math.cos(angleX),
//         sinY = Math.sin(angleX);

//     this.x = (this.startX += this.vx);
//     this.y = (this.startY += this.vy);
//     this.z = (this.startZ -= this.vz);
//     this.rotate();

//     this.vy += 0.1;
//     this.x += this.vx;
//     this.y += this.vy;
//     this.z -= this.vz;

//     this.render = false;

//     if (this.z > -focalLength) {
//         var scale = focalLength / (focalLength + this.z);

//         this.size = scale * 2;
//         this.xPos = vanishPointX + this.x * scale;
//         this.yPos = vanishPointY + this.y * scale;
//         this.render = true;
//     }
// };

// function render() {
//     colorCycle();
//     angleY = Math.sin(angle += 0.01);
//     angleX = Math.sin(angle);
//     angleZ = Math.sin(angle);

//     var imgData = ctx.createImageData(width, height);

//     for (var e = 0; e < 30; e++) {
//         emitters[e].update();
//         emitters[e].render(imgData);
//     }
//     ctx.putImageData(imgData, 0, 0);
//     requestAnimationFrame(render);
// }

// function colorCycle() {
//     cycle += .6;
//     if (cycle > 100) {
//         cycle = 0;
//     }
//     colors.r = ~~ (Math.sin(.3 * cycle + 0) * 127 + 128);
//     colors.g = ~~ (Math.sin(.3 * cycle + 2) * 127 + 128);
//     colors.b = ~~ (Math.sin(.3 * cycle + 4) * 127 + 128);
// }

// var emitters = [];
// for (var e = 0; e < 30; e++) {
//     colorCycle();
//     emitters.push(new Emitter());
// }
// //render();


// // smart trick from @TimoHausmann for full screen pens
// setTimeout(function () {
//     width = canvas.width = window.innerWidth;
//     height = canvas.height = document.body.offsetHeight;
//     vanishPointY = height / 2;
//     vanishPointX = width / 2;
//     render();
// }, 500);
// }
;
$('.home index').ready(function(){
	//check current slide
	var currentProjectNum = getCurrentSlide();
	$('.info').hide();
	$($('.info')[currentProjectNum]).show();
	$('#myCarousel').on('slid.bs.carousel', function (e){
		currentProjectNum = getCurrentSlide();
		//hides elements, waits until all animations are done and then shows the current slides info
		$('.info').hide().promise().done(function(){
			$($('.info')[currentProjectNum]).fadeIn(300);
		});
	});
});
function getCurrentSlide() {
	return parseInt($('.carousel-indicators > li.active').attr('data-slide-to'));
}
;
/*!
 *                          . .
 *                          | |            o
 *      ;-. ;-. ,-. ;-. ,-. | | ,-. ;-.    , ,-.
 *      | | |   | | | | |-' | | |-' |      | `-.
 *      |-' '   `-' |-' `-' ' ' `-' '   o  | `-'
 *      '           '                     -'
 *
 *      http://pixelscommander.com/polygon/propeller/example/
 *      jQuery plugin to rotate HTML elements by mouse. With inertia or without it.
 *
 *      Copyright (c) 2014 Denis Radin
 *      Licensed under the MIT license.
 *
 *      Title generated using "speed" http://patorjk.com/software/taag/#p=display&f=Shimrod&t=propeller.js
 *      Inspired by Brian Gonzalez
 */


;
(function (w) {

    var jqPluginName = 'propeller';

    var defaults = {
        angle: 0,
        speed: 0,
        inertia: 0,
        minimalSpeed: 0.001,
        minimalAngleChange: 0.1,
        step: 0,
        stepTransitionTime: 0,
        stepTransitionEasing: 'linear',
        rotateParentInstantly: false,
        touchElement: null
    };

    var Propeller = function (element, options) {
        if (typeof element === 'string') {
            element = document.querySelectorAll(element);
        }

        if (element.length > 1) {
            return Propeller.createMany(element, options);
        } else if (element.length === 1) {
            element = element[0];
        }

        this.element = element;
        this.active = false;
        this.transiting = false;
        this.update = this.update.bind(this);

        this.initCSSPrefix();
        this.initAngleGetterSetter();
        this.initOptions(options);
        this.initHardwareAcceleration();
        this.initTransition();
        this.bindHandlers();
        this.addListeners();
        this.update();
    };

    Propeller.createMany = function (nodes, options) {
        var result = [];
        for (var i = 0; i < nodes.length; i++) {
            result.push(new Propeller(nodes[i], options));
        }
        return result;
    };

    var p = Propeller.prototype;

    p.initAngleGetterSetter = function () {
        getterSetter(this, 'angle', function () {
            return this._angle
        }, function (value) {
            this._angle = value;
            this.virtualAngle = value;
            this.updateCSS();
        });
    }

    p.bindHandlers = function () {
        this.onRotationStart = this.onRotationStart.bind(this);
        this.onRotationStop = this.onRotationStop.bind(this);
        this.onRotated = this.onRotated.bind(this);
    }

    p.addListeners = function () {
        this.listenersInstalled = true;

        if ('ontouchstart' in document.documentElement) {
            this.touchElement.addEventListener('touchstart', this.onRotationStart);
            this.touchElement.addEventListener('touchmove', this.onRotated);
            this.touchElement.addEventListener('touchend', this.onRotationStop);
            this.touchElement.addEventListener('touchcancel', this.onRotationStop);
            this.touchElement.addEventListener('dragstart', this.returnFalse);
        } else {
            this.touchElement.addEventListener('mousedown', this.onRotationStart);
            this.touchElement.addEventListener('mousemove', this.onRotated);
            this.touchElement.addEventListener('mouseup', this.onRotationStop);
            this.touchElement.addEventListener('mouseleave', this.onRotationStop);
            this.touchElement.addEventListener('dragstart', this.returnFalse);
        }

        this.touchElement.ondragstart = this.returnFalse;
    }

    p.removeListeners = function () {
        this.listenersInstalled = false;

        if ('ontouchstart' in document.documentElement) {
            this.touchElement.removeEventListener('touchstart', this.onRotationStart);
            this.touchElement.removeEventListener('touchmove', this.onRotated);
            this.touchElement.removeEventListener('touchend', this.onRotationStop);
            this.touchElement.removeEventListener('touchcancel', this.onRotationStop);
            this.touchElement.removeEventListener('dragstart', this.returnFalse);
        } else {
            this.touchElement.removeEventListener('mousedown', this.onRotationStart);
            this.touchElement.removeEventListener('mousemove', this.onRotated);
            this.touchElement.removeEventListener('mouseup', this.onRotationStop);
            this.touchElement.removeEventListener('mouseleave', this.onRotationStop);
            this.touchElement.removeEventListener('dragstart', this.returnFalse);
        }
    }

    p.bind = function () {
        if (this.listenersInstalled !== true) {
            this.addListeners();
        }
    }

    p.unbind = function () {
        if (this.listenersInstalled === true) {
            this.removeListeners();
            this.onRotationStop();
        }
    }

    p.stop = function () {
        this.speed = 0;
        this.onRotationStop();
    }

    p.onRotationStart = function (event) {
        //Initializes coordinates if object was moved
        this.initCoordinates();
        this.initDrag();
        this.active = true;

        //Execute onDragStart callback if stopped
        if (this.onDragStart !== undefined) {
            this.onDragStart();
        }

        if (this.rotateParentInstantly === false) {
            event.stopPropagation();
        }
    }

    p.onRotationStop = function () {
        //Execute onDragStop callback if stopped
        if (this.onDragStop !== undefined && this.active === true) {
            this.onDragStop();
        }

        this.active = false;
    }

    p.onRotated = function (event) {
        if (this.active === true) {
            event.stopPropagation();
            event.preventDefault();

            if (event.targetTouches !== undefined && event.targetTouches[0] !== undefined) {
                this.lastMouseEvent = {
                    pageX: event.targetTouches[0].pageX,
                    pageY: event.targetTouches[0].pageY
                }
            } else {
                this.lastMouseEvent = {
                    pageX: event.pageX || event.clientX,
                    pageY: event.pageY || event.clientY
                }
            }
        }
    }

    p.update = function () {
        //Calculating angle on requestAnimationFrame only for optimisation purposes
        if (this.lastMouseEvent !== undefined && this.active === true) {
            this.updateAngleToMouse(this.lastMouseEvent);
        }

        this.updateAngle();
        this.applySpeed();
        this.applyInertia();

        if (Math.abs(this.lastAppliedAngle - this._angle) >= this.minimalAngleChange && this.transiting === false) {
            this.updateCSS();

            //Prevents new transition before old is completed
            this.blockTransition();

            if (this.onRotate !== undefined && typeof this.onRotate === 'function') {
                this.onRotate.bind(this)();
            }

            this.lastAppliedAngle = this._angle;

        }

        window.requestAnimFrame(this.update);
    }

    p.updateAngle = function () {
        if (this.step > 0) {
            this._angle = this.getAngleFromVirtual();
        } else {
            this._angle = this.normalizeAngle(this.virtualAngle);
        }
    }

    p.getAngleFromVirtual = function () {
        return Math.ceil(this.virtualAngle / this.step) * this.step;
    }

    p.normalizeAngle = function (angle) {
        var result = angle;
        result = result % 360;
        if (result < 0) {
            result = 360 + result;
        }
        return result;
    }

    p.differenceBetweenAngles = function (newAngle, oldAngle) {
        var a1 = newAngle * (Math.PI / 180);
        var a2 = oldAngle * (Math.PI / 180);
        var radians = Math.atan2(Math.sin(a1 - a2), Math.cos(a1 - a2));
        var degrees = radians * (180 / Math.PI);
        return Math.round(degrees * 100) / 100;
    }

    p.applySpeed = function () {
        if (this.inertia > 0 && this.speed !== 0 && this.active === false) {
            this.virtualAngle += this.speed;
        }
    }

    p.applyInertia = function () {
        if (this.inertia > 0) {
            if (Math.abs(this.speed) >= this.minimalSpeed) {
                this.speed = this.speed * this.inertia;

                //Execute onStop callback if stopped
                if (this.active === false && Math.abs(this.speed) < this.minimalSpeed) {
                    if (this.onStop !== undefined) {
                        this.onStop();
                    }
                }
            } else if (this.speed !== 0) {
                this.speed = 0;
            }
        }
    }

    p.updateAngleToMouse = function (event) {
        var xDiff = event.pageX - this.cx;
        var yDiff = event.pageY - this.cy;

        var mouseRadians = Math.atan2(xDiff, yDiff);
        var mouseDegrees = mouseRadians * (180 / Math.PI * -1) + 180;

        if (this.lastMouseAngle === undefined) {
            this.lastElementAngle = this.virtualAngle;
            this.lastMouseAngle = mouseDegrees;
        }

        //At this moment we have to use specific algorithm when CSS transition is enabled. Using same approach when transition is disabled lead to worse precision.
        //TODO Develop universal algorithm to support transitions and allow good precision at once
        if (this.stepTransitionTime !== defaults.stepTransitionTime) {
            this.speed = this.mouseDiff = this.differenceBetweenAngles(mouseDegrees, this.lastMouseAngle);
            this.virtualAngle = this.lastElementAngle + this.mouseDiff;
            this.lastElementAngle = this.virtualAngle;
            this.lastMouseAngle = mouseDegrees;
        } else {
            var oldAngle = this.virtualAngle;
            this.mouseDiff = mouseDegrees - this.lastMouseAngle;
            this.virtualAngle = this.lastElementAngle + this.mouseDiff;
            var newAngle = this.virtualAngle;
            this.speed = this.differenceBetweenAngles(newAngle, oldAngle);
        }
    }

    p.initCoordinates = function () {
        var elementOffset = this.getViewOffset();
        this.cx = elementOffset.x + (this.element.offsetWidth / 2);
        this.cy = elementOffset.y + (this.element.offsetHeight / 2);
    }

    p.initDrag = function () {
        this.speed = 0;
        this.lastMouseAngle = undefined;
        this.lastElementAngle = undefined;
        this.lastMouseEvent = undefined;
    }

    p.initOptions = function (options) {
        options = options || defaults;

        this.touchElement = document.querySelectorAll(options.touchElement)[0] || this.element;

        this.onRotate = options.onRotate || options.onrotate;
        this.onStop = options.onStop || options.onstop;
        this.onDragStop = options.onDragStop || options.ondragstop;
        this.onDragStart = options.onDragStart || options.ondragstart;

        this.step = options.step || defaults.step;
        this.stepTransitionTime = options.stepTransitionTime || defaults.stepTransitionTime;
        this.stepTransitionEasing = options.stepTransitionEasing || defaults.stepTransitionEasing;

        this.angle = options.angle || defaults.angle;
        this.speed = options.speed || defaults.speed;
        this.inertia = options.inertia || defaults.inertia;
        this.minimalSpeed = options.minimalSpeed || defaults.minimalSpeed;
        this.lastAppliedAngle = this.virtualAngle = this._angle = options.angle || defaults.angle;
        this.minimalAngleChange = this.step !== defaults.step ? this.step : defaults.minimalAngleChange;
        this.rotateParentInstantly = options.rotateParentInstantly || defaults.rotateParentInstantly;
    }

    p.initCSSPrefix = function () {
        if (Propeller.cssPrefix === undefined) {
            if (typeof(document.body.style.transform) != 'undefined') {
                Propeller.cssPrefix = '';
            } else if (typeof(document.body.style.mozTransform) != 'undefined') {
                Propeller.cssPrefix = '-moz-';
            } else if (typeof(document.body.style.webkitTransform) != 'undefined') {
                Propeller.cssPrefix = '-webkit-';
            } else if (typeof(document.body.style.msTransform) != 'undefined') {
                Propeller.cssPrefix = '-ms-';
            }
        }
    }

    p.initHardwareAcceleration = function () {
        this.accelerationPostfix = '';

        //Check for CSS3d support
        var el = document.createElement('p'),
            has3d,
            transforms = {
                'webkitTransform': '-webkit-transform',
                'OTransform': '-o-transform',
                'msTransform': '-ms-transform',
                'MozTransform': '-moz-transform',
                'transform': 'transform'
            };

        document.body.insertBefore(el, null);

        for (var t in transforms) {
            if (el.style[t] !== undefined) {
                el.style[t] = "translate3d(1px,1px,1px)";
                has3d = window.getComputedStyle(el).getPropertyValue(transforms[t]);
            }
        }

        document.body.removeChild(el);

        var supported = (has3d !== undefined && has3d.length > 0 && has3d !== "none");

        //If CSS3d is supported then ann translateZ hack to enable GPU acceleration on layer
        if (supported === true) {
            this.accelerationPostfix = 'translateZ(0)';
            this.element.style[Propeller.cssPrefix + 'transform'] = this.accelerationPostfix;
            this.updateCSS();
        }
    }

    p.initTransition = function () {
        if (this.stepTransitionTime !== defaults.stepTransitionTime) {
            var prop = 'all ' + this.stepTransitionTime + 'ms ' + this.stepTransitionEasing;
            this.element.style[Propeller.cssPrefix + 'transition'] = prop;
        }
    }

    p.updateCSS = function () {
        this.element.style[Propeller.cssPrefix + 'transform'] = 'rotate(' + this._angle + 'deg) ' + this.accelerationPostfix;
    }


    p.blockTransition = function () {
        if (this.stepTransitionTime !== defaults.stepTransitionTime) {
            var self = this;
            setTimeout(function () {
                self.transiting = false;
            }, this.stepTransitionTime);
            this.transiting = true;
        }
    }

    //Calculating pageX, pageY for elements with offset parents
    p.getViewOffset = function (singleFrame) {
        var coords = {x: 0, y: 0};

        if (Propeller.IEVersion !== false && Propeller.IEVersion < 9) {
            coords.x = this.element.offsetLeft;
            coords.y = this.element.offsetTop;
            return coords;
        }

        if (this.element)
            this.addOffset(this.element, coords, 'defaultView' in document ? document.defaultView : document.parentWindow);

        return coords;
    }

    p.addOffset = function (node, coords, view) {
        var p = node.offsetParent;
        coords.x += node.offsetLeft - (p ? p.scrollLeft : 0);
        coords.y += node.offsetTop - (p ? p.scrollTop : 0);

        if (p) {
            if (p.nodeType == 1) {
                var parentStyle = view.getComputedStyle(p, '');
                if (parentStyle.position != 'static') {
                    coords.x += parseInt(parentStyle.borderLeftWidth);
                    coords.y += parseInt(parentStyle.borderTopWidth);

                    if (p.localName.toLowerCase() == 'table') {
                        coords.x += parseInt(parentStyle.paddingLeft);
                        coords.y += parseInt(parentStyle.paddingTop);
                    }
                    else if (p.localName.toLowerCase() == 'body') {
                        var style = view.getComputedStyle(node, '');
                        coords.x += parseInt(style.marginLeft);
                        coords.y += parseInt(style.marginTop);
                    }
                }
                else if (p.localName.toLowerCase() == 'body') {
                    coords.x += parseInt(parentStyle.borderLeftWidth);
                    coords.y += parseInt(parentStyle.borderTopWidth);
                }

                var parent = node.parentNode;
                while (p != parent) {
                    coords.x -= parent.scrollLeft;
                    coords.y -= parent.scrollTop;
                    parent = parent.parentNode;
                }
                this.addOffset(p, coords, view);
            }
        }
        else {
            if (node.localName.toLowerCase() == 'body') {
                var style = view.getComputedStyle(node, '');
                coords.x += parseInt(style.borderLeftWidth);
                coords.y += parseInt(style.borderTopWidth);

                var htmlStyle = view.getComputedStyle(node.parentNode, '');
                coords.x += parseInt(htmlStyle.paddingLeft);
                coords.y += parseInt(htmlStyle.paddingTop);
                coords.x += parseInt(htmlStyle.marginLeft);
                coords.y += parseInt(htmlStyle.marginTop);
            }

            if (node.scrollLeft)
                coords.x += node.scrollLeft;
            if (node.scrollTop)
                coords.y += node.scrollTop;

            var win = node.ownerDocument.defaultView;
            if (win && (win.frameElement))
                this.addOffset(win.frameElement, coords, win);
        }
    }

    p.returnFalse = function () {
        return false;
    }

    //Wrap to jQuery plugin
    if (w.$ !== undefined) {
        $.propeller = {};
        $.propeller.propellers = [];

        $.fn[jqPluginName] = function (options) {
            return this.each(function () {
                if (!$.data(this, 'plugin_' + jqPluginName)) {
                    var propellerObj = new Propeller(this, options);
                    $.data(this, 'plugin_' + jqPluginName, propellerObj);
                    $.propeller.propellers.push(propellerObj);
                }
            });
        };
    }

    var nav = navigator.userAgent.toLowerCase();
    Propeller.IEVersion = (nav.indexOf('msie') != -1) ? parseInt(nav.split('msie')[1]) : false;
    Propeller.deg2radians = Math.PI * 2 / 360;

    w.Propeller = Propeller;
})(window);

//RequestAnimatedFrame polyfill
window.requestAnimFrame = (function () {
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function (callback) {
        window.setTimeout(callback, 1000 / 60);
    };
})();

//Function.bind polyfill
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {
            },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                        ? this
                        : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

//IE addEventListener polyfill
(function (win, doc) {
    if (win.addEventListener)return;		//No need to polyfill

    function docHijack(p) {
        var old = doc[p];
        doc[p] = function (v) {
            return addListen(old(v))
        }
    }

    function addEvent(on, fn, self) {
        return (self = this).attachEvent('on' + on, function (e) {
            var e = e || win.event;
            e.preventDefault = e.preventDefault || function () {
                e.returnValue = false
            }
            e.stopPropagation = e.stopPropagation || function () {
                e.cancelBubble = true
            }
            fn.call(self, e);
        });
    }

    function addListen(obj, i) {
        if (i = obj.length)while (i--)obj[i].addEventListener = addEvent;
        else obj.addEventListener = addEvent;
        return obj;
    }

    addListen([doc, win]);
    if ('Element' in win)win.Element.prototype.addEventListener = addEvent;			//IE8
    else {		//IE < 8
        doc.attachEvent('onreadystatechange', function () {
            addListen(doc.all)
        });		//Make sure we also init at domReady
        docHijack('getElementsByTagName');
        docHijack('getElementById');
        docHijack('createElement');
        addListen(doc.all);
    }
})(window, document);

//IE getComputedStyle polyfill
if (!window.getComputedStyle) {
    window.getComputedStyle = function (el, pseudo) {
        this.el = el;
        this.getPropertyValue = function (prop) {
            var re = /(\-([a-z]){1})/g;
            if (prop == 'float') prop = 'styleFloat';
            if (re.test(prop)) {
                prop = prop.replace(re, function () {
                    return arguments[2].toUpperCase();
                });
            }
            return el.currentStyle[prop] ? el.currentStyle[prop] : null;
        }
        return this;
    }
}

function getterSetter(variableParent, variableName, getterFunction, setterFunction) {
    if (Object.defineProperty) {
        Object.defineProperty(variableParent, variableName, {
            get: getterFunction,
            set: setterFunction
        });
    }
    else if (document.__defineGetter__) {
        variableParent.__defineGetter__(variableName, getterFunction);
        variableParent.__defineSetter__(variableName, setterFunction);
    }
}
;


