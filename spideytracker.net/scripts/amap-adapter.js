/* SpideyTracker 高德地图适配层
 * 用高德 AMap JS API 2.0 模拟 google.maps 的少量接口，
 * 使 Map2D/flyToLocation/Radar 等既有代码无需改动即可运行。
 * 坐标系: 数据为 WGS84, 高德使用 GCJ-02, 境内坐标自动转换。
 */
(function () {
  'use strict';
  if (window.__amapAdapterLoaded) return;
  window.__amapAdapterLoaded = true;

  // ---------- WGS84 <-> GCJ-02 ----------
  var PI = Math.PI;
  var A = 6378245.0;
  var EE = 0.00669342162296594323;
  function outOfChina(lat, lng) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }
  function transformLat(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }
  function transformLng(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
    return ret;
  }
  function wgs84ToGcj02(lat, lng) {
    if (outOfChina(lat, lng)) return { lat: lat, lng: lng };
    var dLat = transformLat(lng - 105.0, lat - 35.0);
    var dLng = transformLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * PI;
    var magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return { lat: lat + dLat, lng: lng + dLng };
  }
  function gcj02ToWgs84(lat, lng) {
    if (outOfChina(lat, lng)) return { lat: lat, lng: lng };
    var g = wgs84ToGcj02(lat, lng);
    return { lat: lat * 2 - g.lat, lng: lng * 2 - g.lng };
  }
  function toLatLng(center) {
    // center: {lat,lng} 或 [lng,lat] 或 AMap.LngLat -> WGS84 {lat,lng}
    if (!center) return null;
    if (typeof center.lat === 'number' && typeof center.lng === 'number') return { lat: center.lat, lng: center.lng };
    if (Array.isArray(center) && center.length >= 2) return { lat: center[1], lng: center[0] };
    if (center.getLat && center.getLng) return { lat: center.getLat(), lng: center.getLng() };
    if (typeof center.lat === 'function' && typeof center.lng === 'function') return { lat: center.lat(), lng: center.lng() };
    return null;
  }

  // ---------- 事件工具 ----------
  function bindOnce(obj, type, cb) {
    if (!obj) { cb && cb(); return; }
    try {
      obj.on(type, function handler() {
        obj.off(type, handler);
        cb && cb();
      });
    } catch (e) { cb && cb(); }
  }

  // ---------- google.maps.Map 兼容类 ----------
  function AMapMapAdapter(el, opts) {
    opts = opts || {};
    var center = toLatLng(opts.center) || { lat: 40, lng: -73 };
    var gcj = wgs84ToGcj02(center.lat, center.lng);
    var mapOpts = {
      center: [gcj.lng, gcj.lat],
      zoom: typeof opts.zoom === 'number' ? opts.zoom : 4,
      viewMode: '2D',
      mapStyle: 'amap://styles/darkblue',
      resizeEnable: true,
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: true,
      keyboardEnable: false,
      showBuildingBlock: true
    };
    if (typeof opts.minZoom === 'number') mapOpts.minZoom = opts.minZoom;
    if (opts.maxZoom) mapOpts.maxZoom = opts.maxZoom;
    this._map = new AMap.Map(el, mapOpts);
    window.__amapMapInstance = this._map;
    var self = this;
    this._completed = false;
    try {
      this._map.on('complete', function () { self._completed = true; });
      // 若地图立即完成（缓存），complete 可能先触发，通过轮询兜底
      setTimeout(function () {
        try {
          var c = self._map.getCenter();
          if (c) self._completed = true;
        } catch (e) {}
      }, 1500);
    } catch (e) {}
    this._listeners = [];
    this._el = el;
  }
  AMapMapAdapter.prototype = {
    addListener: function (type, cb) {
      var self = this;
      var evtType = type;
      if (type === 'mousedown') evtType = 'mousedown';
      else if (type === 'mouseup') evtType = 'mouseup';
      else if (type === 'mousemove') evtType = 'mousemove';
      this._map.on(evtType, function (e) {
        var evt = e || {};
        var p = e && (e.lnglat || e.originalEvent && e.originalEvent.lnglat);
        var ll = toLatLng(p) || null;
        evt.latLng = ll ? { lat: ll.lat, lng: ll.lng, latFn: function () { return ll.lat; }, lngFn: function () { return ll.lng; } } : null;
        if (evt.latLng) { evt.latLng.lat = function () { return ll.lat; }; evt.latLng.lng = function () { return ll.lng; }; }
        cb && cb(evt);
      });
      return { remove: function () { self._map.off(evtType); } };
    },
    on: function (type, cb) { this._map.on(type, cb); return this; },
    once: function (type, cb) { bindOnce(this._map, type, cb); return this; },
    off: function (type, cb) { this._map.off(type, cb); return this; },
    getCenter: function () {
      var c = this._map.getCenter();
      var ll = toLatLng(c);
      if (!ll) return null;
      var w = gcj02ToWgs84(ll.lat, ll.lng);
      var res = { lat: function () { return w.lat; }, lng: function () { return w.lng; }, latv: w.lat, lngv: w.lng };
      return res;
    },
    getZoom: function () { return this._map.getZoom(); },
    getDiv: function () { return this._el; },
    get: function (key) {
      if (key === 'minZoom') { try { return typeof this._map.getMinZoom === 'function' ? this._map.getMinZoom() : this._map.getZoom() - 2; } catch (e) { return 1; } }
      if (key === 'maxZoom') { try { return typeof this._map.getMaxZoom === 'function' ? this._map.getMaxZoom() : 20; } catch (e) { return 20; } }
      try { return this._map.get(key); } catch (e) { return undefined; }
    },
    setCenter: function (center) {
      var ll = toLatLng(center);
      if (!ll) return this;
      var gcj = wgs84ToGcj02(ll.lat, ll.lng);
      this._map.setCenter([gcj.lng, gcj.lat]);
      return this;
    },
    setZoom: function (z) { this._map.setZoom(z); return this; },
    panTo: function (center) { return this.setCenter(center); },
    setOptions: function (o) { try { this._map.setStatus && this._map.setStatus({ dragEnable: true }); } catch (e) {} return this; },
    moveCamera: function (o) {
      if (!o) return this;
      var ll = toLatLng(o.center);
      if (ll) {
        var gcj = wgs84ToGcj02(ll.lat, ll.lng);
        if (typeof o.zoom === 'number') this._map.setZoomAndCenter(o.zoom, [gcj.lng, gcj.lat]);
        else this._map.setCenter([gcj.lng, gcj.lat]);
      } else if (typeof o.zoom === 'number') this._map.setZoom(o.zoom);
      return this;
    },
    fitBounds: function (b) { try { if (b && this._map.setFitView) this._map.setFitView(); } catch (e) {} return this; }
  };

  // ---------- AdvancedMarkerElement 兼容类 ----------
  function AMapMarkerAdapter(opts) {
    opts = opts || {};
    var ll = toLatLng(opts.position) || { lat: 0, lng: 0 };
    var gcj = wgs84ToGcj02(ll.lat, ll.lng);
    var markerOpts = {
      position: [gcj.lng, gcj.lat],
      zIndex: typeof opts.zIndex === 'number' ? opts.zIndex : 100
    };
    if (opts.content) markerOpts.content = opts.content;
    if (opts.title) markerOpts.title = opts.title;
    this._marker = new AMap.Marker(markerOpts);
    this.content = opts.content || null;
    this.map = null;
    if (opts.map) this.setMap(opts.map);
  }
  AMapMarkerAdapter.prototype = {
    setMap: function (map) {
      if (map && map._map) { this._marker.setMap(map._map); this.map = map; }
      else if (map === null || map === undefined) { this._marker.setMap(null); this.map = null; }
      return this;
    },
    setPosition: function (pos) {
      var ll = toLatLng(pos);
      if (ll) { var gcj = wgs84ToGcj02(ll.lat, ll.lng); this._marker.setPosition([gcj.lng, gcj.lat]); }
      return this;
    },
    getPosition: function () {
      var p = this._marker.getPosition();
      var ll = toLatLng(p);
      if (!ll) return null;
      var w = gcj02ToWgs84(ll.lat, ll.lng);
      return { lat: w.lat, lng: w.lng };
    },
    addListener: function (type, cb) {
      var evtType = type;
      if (type === 'gmp-click') evtType = 'click';
      if (type === 'gmp-pointerdown') evtType = 'mousedown';
      if (type === 'pointerdown') evtType = 'mousedown';
      this._marker.on(evtType, function (e) {
        var evt = e || {};
        var ll = e && e.lnglat ? toLatLng(e.lnglat) : null;
        evt.latLng = ll ? { lat: ll.lat, lng: ll.lng } : null;
        evt.stop = function () { try { e && e.originalEvent && e.originalEvent.stopPropagation(); } catch (err) {} };
        cb && cb(evt);
      });
      return this;
    },
    // 原生 DOM 风格（Map2D 使用）
    addEventListener: function (type, cb) {
      return this.addListener(type, cb);
    },
    removeEventListener: function (type) {
      try { this._marker.off(type === 'gmp-click' ? 'click' : type); } catch (e) {}
      return this;
    },
    setCenter: function (pos) { return this.setPosition(pos); },
    remove: function () { this._marker.setMap(null); return this; },
    setVisible: function (v) { this._marker.setVisible(v); return this; }
  };

  // ---------- importLibrary ----------
  function importLibrary(name) {
    if (name === 'marker') {
      return Promise.resolve({ AdvancedMarkerElement: AMapMarkerAdapter, Marker: AMapMarkerAdapter });
    }
    // 3D / 其他库: 禁用
    return Promise.reject(new Error('Library "' + name + '" is not supported in AMap adapter'));
  }

  // ---------- google.maps.event ----------
  var eventApi = {
    addListenerOnce: function (obj, type, cb) {
      if (!obj) { cb && cb(); return { remove: function () {} }; }
      if (obj._map) {
        // AMapMapAdapter 实例
        var target = obj._map;
        var evtType = type === 'idle' ? 'complete' : type;
        var done = false;
        var handler = function () {
          if (done) return;
          done = true;
          try { target.off(evtType, handler); } catch (e) {}
          cb && cb();
        };
        // 若地图已 complete（初次渲染完成），complete 事件已错过 -> 直接回调
        if (obj._completed) { handler(); return { remove: handler }; }
        try { target.on(evtType, handler); } catch (e) { handler(); }
        // 安全兜底：2 秒后强制回调
        setTimeout(handler, 2000);
        return { remove: handler };
      }
      bindOnce(obj, type, cb);
      return { remove: function () {} };
    },
    addListener: function (obj, type, cb) {
      if (!obj) return { remove: function () {} };
      if (obj._map) return obj.addListener(type, cb);
      return { remove: function () {} };
    },
    removeListener: function (l) { try { l && l.remove && l.remove(); } catch (e) {} },
    trigger: function (obj, type) { try { obj && obj._map && obj._map.emit && obj._map.emit(type); } catch (e) {} }
  };

  // 挂载 google.maps 全局
  window.google = window.google || {};
  window.google.maps = {
    Map: AMapMapAdapter,
    importLibrary: importLibrary,
    event: eventApi,
    LatLng: function (lat, lng) { this.lat = lat; this.lng = lng; this.latv = lat; this.lngv = lng; },
    Marker: AMapMarkerAdapter,
    AdvancedMarkerElement: AMapMarkerAdapter
  };
  window.__amapReady = function () {
    // 高德加载完成: 模拟 Google Maps callback=initMaps 行为
    window.__initMapsCalled = true;
    if (typeof window.initMaps === 'function') {
      try { window.initMaps(); } catch (e) { console.warn('[AMap] initMaps error:', e); }
    }
  };
  // 若 Map2D 模块先于高德加载执行，AMap 就绪后轮询补触发
  var _amapInterval = setInterval(function () {
    if (window.AMap) {
      clearInterval(_amapInterval);
      if (window.__initMapsCalled) return;
      window.__amapReady();
    }
  }, 100);
})();
