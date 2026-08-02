/* ============================================================
   寻找小蜘蛛 · 用户系统（登录/报告目击/我的记录）
   独立模块：不修改现有压缩 Astro 产物
   - 登录/注册（邮箱验证码，本地验证码输出到服务器控制台）
   - 发布目击（地图点选位置 + 图片上传）
   - 我的记录（收藏 + 目击历史）
   - 用户目击点位合并渲染（app:event-pins-ready → Map2D addPins）
   ============================================================ */
(function () {
  'use strict';

  /* ==================== 工具 ==================== */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(msg) {
    document.dispatchEvent(new CustomEvent('app:toast', { detail: { message: msg } }));
  }

  // 带 cookie 的 API 请求；body 为对象时自动 JSON
  function api(path, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.cache = 'no-store'; // 避免 GET 被启发式缓存导致数据不刷新
    if (opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData)) {
      opts.headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
      opts.body = JSON.stringify(opts.body);
    }
    return fetch(path, opts).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) throw new Error(data && data.error ? data.error : '请求失败 (' + res.status + ')');
        return data;
      });
    });
  }

  /* ==================== 坐标转换（GCJ02 ↔ WGS84） ==================== */
  var PI = Math.PI, A = 6378245.0, EE = 0.00669342162296594323;
  function outOfChina(lng, lat) { return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55); }
  function tLat(x, y) {
    var r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(y * PI) + 40 * Math.sin(y / 3 * PI)) * 2 / 3;
    r += (160 * Math.sin(y / 12 * PI) + 320 * Math.sin(y * PI / 30)) * 2 / 3;
    return r;
  }
  function tLng(x, y) {
    var r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    r += (20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2 / 3;
    r += (20 * Math.sin(x * PI) + 40 * Math.sin(x / 3 * PI)) * 2 / 3;
    r += (150 * Math.sin(x / 12 * PI) + 300 * Math.sin(x / 30 * PI)) * 2 / 3;
    return r;
  }
  // 高德点击坐标（GCJ02）→ 存储用 WGS84
  function gcj02ToWgs84(lng, lat) {
    if (outOfChina(lng, lat)) return { lng: lng, lat: lat };
    var dLat = tLat(lng - 105, lat - 35), dLng = tLng(lng - 105, lat - 35);
    var radLat = lat / 180 * PI, magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
    dLng = (dLng * 180) / (A / sqrtMagic * Math.cos(radLat) * PI);
    return { lng: lng - dLng, lat: lat - dLat };
  }

  /* ==================== 全局状态 ==================== */
  var currentUser = null;
  var userPins = [];      // 当前用户目击点位（apiToPin 转换后）
  var favIds = {};        // 已收藏标记：key = 'usr-N' 或 pin_id
  var picking = false;    // 地图点选模式
  var reportState = null; // 报告弹窗句柄

  /* ==================== 弹窗基础设施 ==================== */
  function createModal(title, wide) {
    var overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';
    // 复用主站页面框架素材（images/frame 15 宫格）：顶 36px + 侧边 + 底 50px 装饰 + 7px 收尾（主页 row4+row5 同款）
    overlay.innerHTML =
      '<div class="app-modal' + (wide ? ' is-wide' : '') + '">' +
      '  <div class="app-fr app-fr--t-l" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--t-c" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--t-r" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--m-l" aria-hidden="true"></div>' +
      '  <div class="app-modal__content">' +
      '    <div class="app-modal__logo"><img src="favicon.png" alt="寻找小蜘蛛" aria-hidden="true"></div>' +
      '    <div class="app-modal__head">' +
      '      <h3 class="app-modal__title">' + esc(title) + '</h3>' +
      '      <button type="button" class="app-modal__close" aria-label="关闭"></button>' +
      '    </div>' +
      '    <div class="app-modal__body"></div>' +
      '    <div class="app-modal__spidey" aria-hidden="true"></div>' +
      '  </div>' +
      '  <div class="app-fr app-fr--m-r" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b2-l" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b2-c" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b2-r" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b1-l" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b1-c" aria-hidden="true"></div>' +
      '  <div class="app-fr app-fr--b1-r" aria-hidden="true"></div>' +
      '</div>';
    document.body.appendChild(overlay);
    var modal = $('.app-modal', overlay);
    var body = $('.app-modal__body', overlay);
    var close = function () {
      overlay.classList.remove('is-open');
      setTimeout(function () { overlay.remove(); }, 240);
      document.removeEventListener('keydown', escHandler);
    };
    var escHandler = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escHandler);
    $('.app-modal__close', overlay).addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    return { overlay: overlay, modal: modal, body: body, close: close };
  }

  function closeAllAppModals() {
    $$('.app-modal-overlay').forEach(function (o) { o.remove(); });
    stopPicking();
  }

  /* ==================== 用户状态与菜单联动 ==================== */
  function updateMenuState() {
    try {
      var items = window.siteInit && window.siteInit.general && window.siteInit.general.mainMenu && window.siteInit.general.mainMenu.items;
      if (items) {
        items.authLogin.show = !currentUser;
        items.userPanel.show = !!currentUser;
      }
    } catch (e) { /* siteInit 未就绪则跳过 */ }
    // 菜单内"用户面板"项显示 头像+名字（位于菜单最顶部）
    var userLink = document.querySelector('.main-menu__link[data-menu-key="userPanel"]');
    if (userLink) {
      userLink.innerHTML = currentUser
        ? '<img src="favicon.png" class="app-menu-avatar" alt="">' + esc(currentUser.username || currentUser.email)
        : '用户';
    }
    document.dispatchEvent(new CustomEvent('app:site-init-ready')); // 触发 MainMenu 重渲染
  }

  function checkAuth() {
    return api('/api/auth/me').then(function (d) {
      currentUser = d.user;
    }).catch(function () {
      currentUser = null;
    }).then(function () {
      updateMenuState();
      if (currentUser) loadFavIds();
    });
  }

  // 缓存已收藏 id
  function loadFavIds() {
    favIds = {};
    return api('/api/favorites').then(function (d) {
      (d.favorites || []).forEach(function (f) {
        favIds[f.sighting_id ? 'usr-' + f.sighting_id : f.pin_id] = true;
      });
    }).catch(function () {});
  }

  /* ==================== 用户面板（菜单内 头像+名字） ==================== */
  function openUserPanel() {
    closeAllAppModals();
    if (!currentUser) {
      toast('请先登录');
      openAuthModal('login', openUserPanel);
      return;
    }
    var h = createModal('用户中心', false);
    var name = currentUser.username || currentUser.email || '';
    h.body.innerHTML =
      '<div class="app-user-panel">' +
      '  <div class="app-user-panel__avatar"><img src="favicon.png" alt="蜘蛛侠头像"></div>' +
      '  <div class="app-user-panel__name">' + esc(name) + '</div>' +
      '  <div class="app-user-panel__email">' + esc(currentUser.email || '') + '</div>' +
      '  <div class="app-user-panel__stats">' +
      '    <div class="app-user-panel__stat"><b data-stat-mine>…</b><span>发布目击</span></div>' +
      '    <div class="app-user-panel__stat"><b data-stat-fav>…</b><span>收藏</span></div>' +
      '  </div>' +
      '  <div class="app-user-panel__actions">' +
      '    <button type="button" class="app-btn app-btn--primary" data-up-records>我的记录</button>' +
      '    <button type="button" class="app-btn app-btn--ghost is-danger" data-up-logout>退出登录</button>' +
      '  </div>' +
      '</div>';
    // 统计
    api('/api/favorites').then(function (d) {
      var el = $('[data-stat-fav]', h.body);
      if (el) el.textContent = (d.favorites || []).length;
    }).catch(function () {});
    api('/api/sightings').then(function (d) {
      var n = (d.sightings || []).filter(function (s) { return s.author && s.author.id === currentUser.id; }).length;
      var el = $('[data-stat-mine]', h.body);
      if (el) el.textContent = n;
    }).catch(function () {});
    $('[data-up-records]', h.body).addEventListener('click', function () {
      h.close();
      openRecordsModal('favorites');
    });
    $('[data-up-logout]', h.body).addEventListener('click', function () {
      h.close();
      doLogout();
    });
  }

  function doLogout() {
    api('/api/auth/logout', { method: 'POST' }).catch(function () {});
    currentUser = null;
    favIds = {};
    updateMenuState();
    toast('已退出登录');
  }

  /* ==================== 登录 / 注册弹窗 ==================== */
  var authState = { onSuccess: null };

  function openAuthModal(mode, onSuccess) {
    closeAllAppModals();
    authState.onSuccess = onSuccess || null;
    var h = createModal(mode === 'register' ? '注册账号' : '登录', false);
    renderAuth(h, mode || 'login');
  }

  function renderAuth(h, mode) {
    var logged = currentUser && mode === 'login';
    h.body.innerHTML =
      '<div class="app-tabs">' +
      '  <button type="button" class="app-tab' + (mode === 'login' ? ' is-active' : '') + '" data-auth-tab="login">登录</button>' +
      '  <button type="button" class="app-tab' + (mode === 'register' ? ' is-active' : '') + '" data-auth-tab="register">注册</button>' +
      '</div>' +
      '<form data-auth-form="' + mode + '"></form>' +
      '<p class="app-error-msg" data-auth-error></p>' +
      '<p class="app-auth-hint">' +
      (mode === 'login'
        ? '还没有账号？<span class="app-auth-link" data-auth-switch="register">立即注册</span>'
        : '已有账号？<span class="app-auth-link" data-auth-switch="login">直接登录</span>') +
      '</p>';

    var form = $('[data-auth-form]', h.body);
    if (mode === 'login') {
      form.innerHTML =
        '<div class="app-field"><label class="app-field__label">邮箱</label>' +
        '  <input class="app-input" type="email" name="email" placeholder="you@example.com" autocomplete="email" required></div>' +
        '<div class="app-field"><label class="app-field__label">密码</label>' +
        '  <input class="app-input" type="password" name="password" placeholder="至少 6 位" autocomplete="current-password" required></div>' +
        '<button type="submit" class="app-btn app-btn--primary app-btn--block">登 录</button>';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitLogin(form);
      });
    } else {
      form.innerHTML =
        '<div class="app-field"><label class="app-field__label">邮箱</label>' +
        '  <input class="app-input" type="email" name="email" placeholder="you@example.com" required></div>' +
        '<div class="app-field"><label class="app-field__label">用户名</label>' +
        '  <input class="app-input" type="text" name="username" placeholder="2 个字符以上" required></div>' +
        '<div class="app-field"><label class="app-field__label">密码</label>' +
        '  <input class="app-input" type="password" name="password" placeholder="至少 6 位" required></div>' +
        '<div class="app-field" data-code-field hidden>' +
        '  <label class="app-field__label">邮箱验证码（本地测试请在服务器控制台查看）</label>' +
        '  <div class="app-code-row"><input class="app-input" name="code" placeholder="6 位验证码" inputmode="numeric" maxlength="6">' +
        '  <button type="button" class="app-btn" data-resend>重新发送</button></div></div>' +
        '<button type="submit" class="app-btn app-btn--primary app-btn--block" data-submit>发送验证码</button>';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        submitRegister(form);
      });
      $('[data-resend]', form).addEventListener('click', function () {
        submitRegister(form, true);
      });
    }

    $$('[data-auth-switch]', h.body).forEach(function (el) {
      el.addEventListener('click', function () { renderAuth(h, el.dataset.authSwitch); });
    });
    $$('.app-tab', h.body).forEach(function (el) {
      el.addEventListener('click', function () { renderAuth(h, el.dataset.authTab); });
    });
    if (!logged) $('input', form).focus();
  }

  function authError(h, msg) {
    var el = $('[data-auth-error]', h.body);
    el.textContent = msg || '';
  }

  function submitLogin(form) {
    var email = $('[name=email]', form).value.trim();
    var password = $('[name=password]', form).value;
    var btn = $('[type=submit]', form);
    btn.disabled = true;
    authError(form.closest('.app-modal'), '');
    api('/api/auth/login', { method: 'POST', body: { email: email, password: password } })
      .then(function (d) {
        currentUser = d.user;
        updateMenuState();
        loadFavIds();
        var cb = authState.onSuccess;
        form.closest('.app-modal-overlay').remove();
        toast('欢迎回来，' + (d.user.username || d.user.email) + '！');
        if (cb) cb();
      })
      .catch(function (err) {
        authError(form.closest('.app-modal'), err.message);
        btn.disabled = false;
      });
  }

  function submitRegister(form, resendOnly) {
    var email = $('[name=email]', form).value.trim();
    var username = $('[name=username]', form).value.trim();
    var password = $('[name=password]', form).value;
    var codeField = $('[data-code-field]', form);
    var btn = $('[data-submit]', form);
    var errorEl = $('[data-auth-error]', form.closest('.app-modal'));

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { errorEl.textContent = '请输入正确的邮箱'; return; }
    if (username.length < 2) { errorEl.textContent = '用户名至少 2 个字符'; return; }
    if (password.length < 6) { errorEl.textContent = '密码至少 6 位'; return; }

    var finishStep = function () {
      // 验证码步骤：提交 verify
      var code = $('[name=code]', form).value.trim();
      if (!/^\d{6}$/.test(code)) { errorEl.textContent = '请输入 6 位验证码'; return; }
      btn.disabled = true;
      errorEl.textContent = '';
      api('/api/auth/verify', { method: 'POST', body: { email: email, code: code, username: username, password: password } })
        .then(function (d) {
          currentUser = d.user;
          updateMenuState();
          loadFavIds();
          var cb = authState.onSuccess;
          form.closest('.app-modal-overlay').remove();
          toast('注册成功，欢迎加入寻找小蜘蛛！');
          if (cb) cb();
        })
        .catch(function (err) {
          errorEl.textContent = err.message;
          btn.disabled = false;
        });
    };

    if (!codeField.hidden && !resendOnly) { finishStep(); return; }

    btn.disabled = true;
    errorEl.textContent = '';
    api('/api/auth/register', { method: 'POST', body: { email: email, username: username, password: password } })
      .then(function (d) {
        codeField.hidden = false;
        btn.textContent = '完成注册';
        btn.disabled = false;
        toast(d.message || '验证码已发送');
        $('[name=code]', form).focus();
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        btn.disabled = false;
      });
  }

  /* ==================== 报告目击弹窗 ==================== */
  function openReportModal() {
    closeAllAppModals();
    if (!currentUser) {
      toast('请先登录后再报告目击');
      openAuthModal('login', function () { openReportModal(); });
      return;
    }
    var h = createModal('报告目击', true);
    reportState = { h: h, picked: null, images: [] };
    renderReport(h);
  }

  function renderReport(h) {
    var st = reportState;
    h.body.innerHTML =
      '<form data-report-form>' +
      '  <div class="app-field"><label class="app-field__label">标题 *</label>' +
      '    <input class="app-input" name="title" placeholder="例：皇后区发现蜘蛛侠荡过屋顶" required></div>' +
      '  <div class="app-field"><label class="app-field__label">目击类型</label>' +
      '    <div class="app-type-row">' +
      '      <label class="app-type-opt is-active"><input type="radio" name="pin_type" value="rumored" checked><img src="img/images/ui/map/red_pin.png" alt="传闻">传闻目击</label>' +
      '      <label class="app-type-opt"><input type="radio" name="pin_type" value="confirmed"><img src="img/images/ui/map/green_pin.png" alt="已确认">已确认目击</label>' +
      '    </div>' +
      '  </div>' +
      '  <div class="app-field"><label class="app-field__label">目击描述</label>' +
      '    <textarea class="app-textarea" name="description" placeholder="描述你看到的情景、时间、细节…" rows="3"></textarea></div>' +
      '  <div class="app-field"><label class="app-field__label">目击位置 *</label>' +
      '    <div class="app-code-row">' +
      '      <button type="button" class="app-btn" data-pick>📍 在地图上选择</button>' +
      '      <button type="button" class="app-btn app-btn--ghost" data-locate>📍 我的位置</button>' +
      '    </div>' +
      '    <div class="app-loc-row">' +
      '      <input class="app-input" name="lat" placeholder="纬度 lat" inputmode="decimal">' +
      '      <input class="app-input" name="lng" placeholder="经度 lng" inputmode="decimal">' +
      '    </div>' +
      '    <p class="app-loc-coords" data-picked-info>未选择位置 —— 点击"在地图上选择"后点击地图取点</p>' +
      '  </div>' +
      '  <div class="app-field"><label class="app-field__label">位置名称（可选）</label>' +
      '    <input class="app-input" name="address" placeholder="例：皇后区 时代广场附近"></div>' +
      '  <div class="app-field"><label class="app-field__label">现场照片（最多 6 张）</label>' +
      '    <div class="app-upload-grid" data-upload-grid>' +
      '      <div class="app-upload-box" data-upload-add title="添加照片">＋</div>' +
      '    </div>' +
      '    <input type="file" name="images" accept="image/*" multiple hidden data-upload-input>' +
      '  </div>' +
      '  <p class="app-error-msg" data-report-error></p>' +
      '  <button type="submit" class="app-btn app-btn--primary app-btn--block" data-report-submit>发布目击</button>' +
      '</form>';

    // 类型选择样式联动
    $$('.app-type-opt', h.body).forEach(function (opt) {
      opt.addEventListener('click', function () {
        $$('.app-type-opt', h.body).forEach(function (o) { o.classList.remove('is-active'); });
        opt.classList.add('is-active');
      });
    });

    var grid = $('[data-upload-grid]', h.body);
    var input = $('[data-upload-input]', h.body);

    $('[data-upload-add]', h.body).addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () {
      var files = Array.prototype.slice.call(input.files || []);
      // 同步截断：最多添加 6 张，超出的不显示
      var remaining = 6 - st.images.length;
      var accepted = [];
      var skipped = 0;
      files.forEach(function (f) {
        if (accepted.length >= remaining) { skipped++; return; }
        if (!/^image\//.test(f.type)) { toast('只支持图片文件'); return; }
        accepted.push(f);
      });
      if (skipped > 0) toast('最多上传 6 张照片');
      accepted.forEach(function (f) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          st.images.push({ file: f, dataUrl: ev.target.result });
          renderUploadGrid(grid, input, st);
        };
        reader.readAsDataURL(f);
      });
      input.value = '';
    });

    $('[data-pick]', h.body).addEventListener('click', function () {
      if (st.picked) {
        st.picked = null;
        setPickedInfo(h, null);
        return;
      }
      if (!window.spideyMap) { toast('地图尚未就绪，请稍后再试'); return; }
      startPicking();
    });

    $('[data-locate]', h.body).addEventListener('click', function () {
      if (!navigator.geolocation) { toast('当前浏览器不支持定位'); return; }
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lng = pos.coords.longitude;
        st.picked = { lat: lat, lng: lng };
        setPickedInfo(h, st.picked);
        toast('已使用当前位置');
      }, function () { toast('定位失败，请检查权限'); }, { timeout: 8000 });
    });

    h.overlay.addEventListener('click', function (e) { if (e.target === h.overlay) stopPicking(); });

    $('[data-report-form]', h.body).addEventListener('submit', function (e) {
      e.preventDefault();
      submitReport(h);
    });
  }

  function renderUploadGrid(grid, input, st) {
    grid.innerHTML = '';
    st.images.forEach(function (img, i) {
      var box = document.createElement('div');
      box.className = 'app-upload-box';
      box.innerHTML = '<img src="' + img.dataUrl + '" alt="照片预览">' +
        '<button type="button" class="app-upload-del" data-del="' + i + '">✕</button>';
      $('[data-del]', box).addEventListener('click', function () {
        st.images.splice(i, 1);
        renderUploadGrid(grid, input, st);
      });
      grid.appendChild(box);
    });
    if (st.images.length < 6) {
      var add = document.createElement('div');
      add.className = 'app-upload-box';
      add.textContent = '＋';
      add.title = '添加照片';
      add.addEventListener('click', function () { input.click(); });
      grid.appendChild(add);
    }
  }

  function setPickedInfo(h, picked) {
    var el = $('[data-picked-info]', h.body);
    var latEl = $('[name=lat]', h.body), lngEl = $('[name=lng]', h.body);
    if (picked) {
      el.textContent = '已选位置：' + picked.lat.toFixed(5) + ', ' + picked.lng.toFixed(5) + '（再次点击"在地图上选择"可重新选取）';
      latEl.value = picked.lat.toFixed(6);
      lngEl.value = picked.lng.toFixed(6);
      $('[data-pick]', h.body).textContent = '🔄 重新选择';
    } else {
      el.textContent = '未选择位置 —— 点击"在地图上选择"后点击地图取点';
      latEl.value = '';
      lngEl.value = '';
      $('[data-pick]', h.body).textContent = '📍 在地图上选择';
    }
  }

  function submitReport(h) {
    var form = $('[data-report-form]', h.body);
    var title = $('[name=title]', form).value.trim();
    var description = $('[name=description]', form).value.trim();
    var lat = $('[name=lat]', form).value.trim();
    var lng = $('[name=lng]', form).value.trim();
    var address = $('[name=address]', form).value.trim();
    var pinTypeEl = $('[name=pin_type]:checked', form);
    var pinType = pinTypeEl ? pinTypeEl.value : 'rumored';
    var errorEl = $('[data-report-error]', h.body);
    var btn = $('[data-report-submit]', form);

    if (!title) { errorEl.textContent = '请填写标题'; return; }
    var latN = Number(lat), lngN = Number(lng);
    if (!isFinite(latN) || !isFinite(lngN) || Math.abs(latN) > 90 || Math.abs(lngN) > 180) {
      errorEl.textContent = '请先在地图上选择目击位置';
      return;
    }

    var fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('lat', String(latN));
    fd.append('lng', String(lngN));
    fd.append('address', address);
    fd.append('pin_type', pinType);
    (reportState.images || []).forEach(function (img) { fd.append('images', img.file); });

    btn.disabled = true;
    errorEl.textContent = '';
    api('/api/sightings', { method: 'POST', body: fd })
      .then(function (d) {
        h.close();
        reportState = null;
        stopPicking();
        toast(d.message || '目击已发布！');
        refreshUserPins();
      })
      .catch(function (err) {
        errorEl.textContent = err.message;
        btn.disabled = false;
      });
  }

  /* ---------- 地图点选模式 ---------- */
  // 进入点选时隐藏报告弹窗，地图完全露出；选点/取消后恢复
  function startPicking() {
    picking = true;
    document.body.classList.add('app-picking');
    if (reportState && reportState.h && reportState.h.overlay.isConnected) {
      reportState.h.overlay.classList.add('is-picking');
    }
    var banner = ensurePickBanner();
    banner.classList.add('is-visible');
  }

  function stopPicking() {
    picking = false;
    document.body.classList.remove('app-picking');
    if (reportState && reportState.h && reportState.h.overlay.isConnected) {
      reportState.h.overlay.classList.remove('is-picking');
    }
    // 直接移除提示条 DOM，彻底避免残留显示
    var banner = $('#app-pick-banner');
    if (banner) banner.remove();
  }

  function ensurePickBanner() {
    var banner = $('#app-pick-banner');
    if (banner) return banner;
    banner = document.createElement('div');
    banner.id = 'app-pick-banner';
    banner.innerHTML =
      '<span>🕷️ 点击地图上的位置标记目击地点（点击点位针不会选中，按 Esc 取消）</span>' +
      '<button type="button" class="app-btn" data-cancel>取消</button>';
    document.body.appendChild(banner);
    $('[data-cancel]', banner).addEventListener('click', stopPicking);
    return banner;
  }

  // 用两个已渲染点位反投影地图像素 → GCJ02 经纬度（Web 墨卡托）
  function buildMapProjection() {
    var map = window.spideyMap;
    var container = $('#map-view');
    if (!map || !container) return null;
    var cRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) return null;
    var pins = (window.spideyPins || []).concat(userPins);
    var entries = [];
    for (var id in map.markersByPinId) {
      var el = map.markersByPinId[id];
      if (!el || !el.isConnected || el.style.display === 'none') continue;
      var pin = null;
      for (var i = 0; i < pins.length; i++) { if (pins[i].id === id) { pin = pins[i]; break; } }
      if (!pin) continue;
      var eRect = el.getBoundingClientRect();
      entries.push({ x: eRect.left - cRect.left + eRect.width / 2, y: eRect.top - cRect.top + eRect.height / 2, lng: Number(pin.lng), lat: Number(pin.lat) });
    }
    if (entries.length < 2) return null;
    var p1 = entries[0], p2 = entries[entries.length - 1];
    var dX = p2.x - p1.x;
    if (Math.abs(dX) < 2) return null;
    var r1 = p1.lng * PI / 180, r2 = p2.lng * PI / 180;
    var m1 = Math.log(Math.tan(PI / 4 + p1.lat * PI / 360));
    var m2 = Math.log(Math.tan(PI / 4 + p2.lat * PI / 360));
    var S = dX / (r2 - r1); // 像素 / 经度弧度
    if (!isFinite(S) || Math.abs(S) < 1e-9) return null;
    var lng0 = r1 - p1.x / S;
    var m0 = m1 - p1.y / S;
    return {
      toLatLng: function (px, py) {
        var lng = (lng0 + px / S) * 180 / PI;
        var m = m0 + py / S;
        var lat = (2 * Math.atan(Math.exp(m)) - PI / 2) * 180 / PI;
        return { lng: lng, lat: lat };
      }
    };
  }

  // 地图容器点击 → 取点
  document.addEventListener('click', function (e) {
    if (!picking) return;
    var container = $('#map-view');
    if (!container) return;
    var cRect = container.getBoundingClientRect();
    if (!cRect.width || !cRect.height) {
      toast('地图尚未显示，请先进入平面地图后再选位置');
      return;
    }
    if (e.clientX < cRect.left || e.clientX > cRect.right || e.clientY < cRect.top || e.clientY > cRect.bottom) return;
    // 点击点位针、点位卡片不算选点
    if (e.target.closest && (e.target.closest('.spidey-pin-wrap') || e.target.closest('.pin-card-wrap'))) return;
    var wgs = null;
    // 优先使用高德官方投影 API（精确）
    var amap = window.__amapMapInstance;
    if (amap && typeof amap.containerToLngLat === 'function') {
      try {
        var ll = amap.containerToLngLat([e.clientX - cRect.left, e.clientY - cRect.top]);
        if (ll) {
          var glng = typeof ll.getLng === 'function' ? ll.getLng() : ll.lng;
          var glat = typeof ll.getLat === 'function' ? ll.getLat() : ll.lat;
          if (isFinite(glng) && isFinite(glat)) wgs = gcj02ToWgs84(glng, glat);
        }
      } catch (err) { /* 回退到反投影 */ }
    }
    // 兜底：墨卡托反投影（基于已渲染点位）
    if (!wgs) {
      var proj = buildMapProjection();
      if (!proj) {
        toast('暂时无法取点，请移动或缩放地图后重试');
        return;
      }
      var gcj = proj.toLatLng(e.clientX - cRect.left, e.clientY - cRect.top);
      wgs = gcj02ToWgs84(gcj.lng, gcj.lat);
    }
    if (reportState && reportState.h && reportState.h.overlay.isConnected) {
      reportState.picked = { lat: wgs.lat, lng: wgs.lng };
      setPickedInfo(reportState.h, reportState.picked);
      stopPicking();
      toast('位置已选定！');
    } else {
      stopPicking();
      openReportModal();
      reportState.picked = { lat: wgs.lat, lng: wgs.lng };
      setPickedInfo(reportState.h, reportState.picked);
    }
  }, true);

  /* ==================== 我的记录弹窗 ==================== */
  function openRecordsModal(tab) {
    closeAllAppModals();
    if (!currentUser) {
      toast('请先登录');
      openAuthModal('login', function () { openRecordsModal(tab); });
      return;
    }
    var h = createModal('我的记录', true);
    h.body.innerHTML =
      '<div class="app-tabs">' +
      '  <button type="button" class="app-tab" data-rec-tab="favorites">我的收藏</button>' +
      '  <button type="button" class="app-tab" data-rec-tab="mine">我的目击</button>' +
      '</div>' +
      '<div data-rec-list><div class="app-loading">加载中</div></div>';
    $$('[data-rec-tab]', h.body).forEach(function (el) {
      el.addEventListener('click', function () { renderRecordsTab(h, el.dataset.recTab); });
    });
    renderRecordsTab(h, tab || 'favorites');
  }

  function renderRecordsTab(h, tab) {
    $$('[data-rec-tab]', h.body).forEach(function (el) { el.classList.toggle('is-active', el.dataset.recTab === tab); });
    var list = $('[data-rec-list]', h.body);
    list.innerHTML = '<div class="app-loading">加载中</div>';
    if (tab === 'favorites') renderFavorites(h, list);
    else renderMySightings(h, list);
  }

  function renderFavorites(h, list) {
    api('/api/favorites').then(function (d) {
      var favs = d.favorites || [];
      if (!favs.length) {
        list.innerHTML = '<div class="app-list-empty">还没有收藏 —— 打开地图，点击点位卡片上的 ★ 收藏</div>';
        return;
      }
      list.innerHTML = '<div class="app-list">' + favs.map(function (f) {
        var id = f.sighting_id ? 'usr-' + f.sighting_id : f.pin_id;
        return '<div class="app-list-item" data-fav-id="' + esc(id) + '" data-fav-row="' + f.id + '">' +
          '<div class="app-list-item__thumb" data-fav-go="' + esc(id) + '">' +
          (f.thumb ? '<img src="' + esc(f.thumb) + '" alt="" loading="lazy">' : '🗺️') +
          '</div>' +
          '<div class="app-list-item__body">' +
          '  <p class="app-list-item__title" data-fav-go="' + esc(id) + '">' + esc(f.title || '未命名') + '</p>' +
          '  <p class="app-list-item__meta">' + esc(Number(f.lat).toFixed(4) + ', ' + Number(f.lng).toFixed(4)) + ' · ' + esc(f.pin_type === 'rumored' ? '用户目击' : '官方点位') + '</p>' +
          '  <div class="app-list-item__actions">' +
          '    <button type="button" class="app-btn" data-fav-go="' + esc(id) + '">查看地图</button>' +
          '    <button type="button" class="app-btn" data-fav-del="' + f.id + '">取消收藏</button>' +
          '  </div>' +
          '</div></div>';
      }).join('') + '</div>';

      $$('[data-fav-del]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          api('/api/favorites/' + btn.dataset.favDel, { method: 'DELETE' })
            .then(function () {
              delete favIds[btn.closest('[data-fav-row]').dataset.favId];
              toast('已取消收藏');
              renderRecordsTab(h, 'favorites');
            })
            .catch(function (err) { toast(err.message); });
        });
      });
      $$('[data-fav-go]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.dataset.favGo;
          var pin = null;
          if (id.indexOf('usr-') === 0) {
            for (var i = 0; i < userPins.length; i++) { if (userPins[i].id === id) { pin = userPins[i]; break; } }
          } else {
            for (var j = 0; j < (window.spideyPins || []).length; j++) { if (window.spideyPins[j].id === id) { pin = window.spideyPins[j]; break; } }
          }
          if (!pin) { toast('该点位不在当前地图数据中'); return; }
          h.close();
          document.dispatchEvent(new CustomEvent('app:fly-to-pin', { detail: { pin: pin } }));
        });
      });
    }).catch(function (err) {
      list.innerHTML = '<div class="app-list-empty">加载失败：' + esc(err.message) + '</div>';
    });
  }

  function renderMySightings(h, list) {
    api('/api/sightings').then(function (d) {
      var mine = (d.sightings || []).filter(function (s) { return s.author && s.author.id === currentUser.id; });
      if (!mine.length) {
        list.innerHTML = '<div class="app-list-empty">你还没有发布过目击 —— 打开菜单"报告目击"开始寻找！</div>';
        return;
      }
      list.innerHTML = '<div class="app-list">' + mine.map(function (s) {
        var idNum = String(s.id).replace('usr-', '');
        return '<div class="app-list-item" data-mine-id="' + esc(s.id) + '">' +
          '<div class="app-list-item__thumb" data-mine-go="' + esc(s.id) + '">' +
          (s.cardThumbImg ? '<img src="' + esc(s.cardThumbImg) + '" alt="" loading="lazy">' : '🕷️') +
          '</div>' +
          '<div class="app-list-item__body">' +
          '  <p class="app-list-item__title" data-mine-go="' + esc(s.id) + '">' + esc(s.title) + '</p>' +
          (s.description ? '<p class="app-list-item__desc">' + esc(s.description) + '</p>' : '') +
          '  <p class="app-list-item__meta">' + esc(new Date(s.createdAt).toLocaleString('zh-CN')) + ' · ' + esc(Number(s.lat).toFixed(4) + ', ' + Number(s.lng).toFixed(4)) + '</p>' +
          '  <div class="app-list-item__actions">' +
          '    <button type="button" class="app-btn" data-mine-go="' + esc(s.id) + '">查看地图</button>' +
          '    <button type="button" class="app-btn is-danger" data-mine-del="' + idNum + '">删除</button>' +
          '  </div>' +
          '</div></div>';
      }).join('') + '</div>';

      $$('[data-mine-del]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!window.confirm('确定删除这条目击记录吗？')) return;
          api('/api/sightings/' + btn.dataset.mineDel, { method: 'DELETE' })
            .then(function () {
              toast('已删除');
              removeUserPinDom(btn.closest('[data-mine-id]').dataset.mineId);
              renderRecordsTab(h, 'mine');
              refreshUserPins();
            })
            .catch(function (err) { toast(err.message); });
        });
      });
      $$('[data-mine-go]', list).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.dataset.mineGo;
          var pin = null;
          for (var i = 0; i < userPins.length; i++) { if (userPins[i].id === id) { pin = userPins[i]; break; } }
          if (!pin) { toast('点位数据尚未加载，请稍后再试'); return; }
          h.close();
          document.dispatchEvent(new CustomEvent('app:fly-to-pin', { detail: { pin: pin } }));
        });
      });
    }).catch(function (err) {
      list.innerHTML = '<div class="app-list-empty">加载失败：' + esc(err.message) + '</div>';
    });
  }

  /* ==================== 地图点位合并 ==================== */
  function apiToPin(s) {
    var thumb = s.cardThumbImg || (s.images && s.images[0]) || '';
    return {
      id: s.id,                    // 'usr-N'
      pinType: s.pinType || 'rumored',
      title: s.title || '未命名目击',
      description: s.description || '',
      imageSrc: thumb,
      cardThumbImg: thumb,
      lat: Number(s.lat),
      lng: Number(s.lng),
      displayLocation: s.address || '',
      fanXHandle: s.author ? '@' + s.author.username : '',
      x_msg: s.description || '',
      images: s.images || [],
      // 全部图片 → 官方 MsgCenter 左侧点击即打开 image-gallery 灯箱（可翻页+圆点）
      lightboxImages: (s.images || []).filter(Boolean),
      author: s.author || null,
      createdAt: s.createdAt
    };
  }

  function refreshUserPins() {
    return api('/api/sightings').then(function (d) {
      var next = (d.sightings || []).map(apiToPin);
      // 移除已被删除的旧点位 DOM
      var known = {};
      next.forEach(function (p) { known[p.id] = true; });
      userPins.forEach(function (old) {
        if (!known[old.id]) removeUserPinDom(old.id);
      });
      userPins = next;
      window.userPins = next; // 暴露给外部脚本与调试
      // 同步到 mainData.spideyPins：活动日志等组件从该数据流读取
      try {
        if (window.mainData) window.mainData.spideyPins = next;
        if (window.spideyPins) window.spideyPins = next;
        document.dispatchEvent(new CustomEvent('app:activity-log-refresh'));
        refreshCommunityFeed();
      } catch (e) { /* 非关键路径 */ }
      // 派发事件；若地图容器已就绪但点位未实际渲染（初始化时序竞争），延迟重试
      var attempt = 0;
      (function dispatch() {
        document.dispatchEvent(new CustomEvent('app:event-pins-ready', { detail: { pins: userPins } }));
        if (!window.spideyMap || !userPins.length || attempt >= 6) return;
        setTimeout(function () {
          var rendered = 0;
          userPins.forEach(function (p) {
            var el = document.querySelector('#map-view .spidey-pin-wrap[data-pin-id="' + p.id + '"]');
            if (el && el.style.display !== 'none') rendered++;
          });
          if (rendered < userPins.length) { attempt++; dispatch(); }
        }, 1500);
      })();
    }).catch(function (e) { console.warn('[app] 用户点位加载失败:', e); });
  }

  function removeUserPinDom(id) {
    // 直接从 DOM 移除（兼容 markersByPinId 与当前地图实例不同步的情况）
    try {
      document.querySelectorAll('#map-view .spidey-pin-wrap[data-pin-id="' + CSS.escape(id) + '"]').forEach(function (el) { el.remove(); });
    } catch (e) {}
    var map = window.spideyMap;
    if (map && map.markersByPinId) {
      var el = map.markersByPinId[id];
      if (el) { try { el.remove(); } catch (e2) {} delete map.markersByPinId[id]; }
    }
  }

  function waitForMap(cb, timeout) {
    var t0 = Date.now();
    (function check() {
      if (window.spideyMap) { cb(); return; }
      if (Date.now() - t0 > (timeout || 20000)) return;
      setTimeout(check, 300);
    })();
  }

  /* ==================== 收藏按钮注入（点位卡片 / 目击详情） ==================== */
  // 卡片：app:pin-click 后往卡片注入 ★ 收藏 + 左上角张数角标（卡片可能因飞行缩放延迟显示，轮询等待）
  document.addEventListener('app:pin-click', function (e) {
    var pin = e.detail && e.detail.pin;
    if (!pin) return;
    setTimeout(function () {
      injectFavBtnToCards(pin, 8);
      injectImgCountToCards(pin, 8);
    }, 300);
  });

  function injectFavBtnToCards(pin, tries) {
    var wraps = $$('.pin-card-wrap.is-visible');
    if (!wraps.length) {
      if (tries > 0) setTimeout(function () { injectFavBtnToCards(pin, tries - 1); }, 500);
      return;
    }
    var wrap = wraps[wraps.length - 1];
    var key = pinKey(pin);
    if ($('[data-app-fav]', wrap)) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'app-fav-btn' + (favIds[key] ? ' is-faved' : '');
    btn.dataset.appFav = key;
    btn.title = favIds[key] ? '已收藏' : '收藏此目击';
    btn.innerHTML = favIds[key] ? '★' : '☆';
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      toggleFavorite(pin, btn);
    });
    wrap.appendChild(btn);
  }

  // 卡片图片左上角：多图目击显示张数角标
  function injectImgCountToCards(pin, tries) {
    var wraps = $$('.pin-card-wrap.is-visible');
    if (!wraps.length) {
      if (tries > 0) setTimeout(function () { injectImgCountToCards(pin, tries - 1); }, 500);
      return;
    }
    var wrap = wraps[wraps.length - 1];
    if ($('.app-img-count', wrap)) return;
    var imgs = (pin.images || []).filter(Boolean);
    if (imgs.length < 2) return; // 单张无需角标
    var imgBox = $('.pin-card-dyn__image', wrap);
    if (!imgBox) return;
    var badge = document.createElement('span');
    badge.className = 'app-img-count';
    badge.textContent = imgs.length + ' 张';
    imgBox.appendChild(badge);
  }

  // 目击详情（MsgCenter 面板）
  document.addEventListener('app:view-red-pin-sighting', function (e) {
    var pin = e.detail && e.detail.pin;
    if (!pin) return;
    setTimeout(function () {
      // 左侧媒体区：无图 → 蜘蛛侠 logo；多图 → 左上角张数角标
      var left = $('.content-left');
      if (left) {
        // 清理上一次注入（面板会复用）
        $$('[data-app-detail-logo], [data-app-detail-count]', left).forEach(function (el) { el.remove(); });
        left.classList.remove('app-no-media');
        var imgs = (pin.images || []).filter(Boolean);
        if (!imgs.length) {
          var logo = document.createElement('img');
          logo.className = 'app-detail-logo';
          logo.dataset.appDetailLogo = '1';
          logo.src = 'favicon.png';
          logo.alt = '';
          logo.loading = 'eager';
          left.appendChild(logo);
          left.classList.add('app-no-media'); // 无图时左侧不可点（避免打开空白灯箱）
        } else if (imgs.length > 1) {
          var badge = document.createElement('span');
          badge.className = 'app-img-count';
          badge.dataset.appDetailCount = '1';
          badge.textContent = imgs.length + ' 张';
          left.appendChild(badge);
        }
      }
      var fields = $('.msg-center .content-right__fields, .base .content-right__fields, #alert-btn .content-right__fields');
      if (!fields) return;
      var key = pinKey(pin);
      if ($('[data-app-fav]', fields)) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'app-btn';
      btn.dataset.appFav = key;
      btn.style.cssText = 'margin-top:10px;font-size:12px;padding:6px 14px;';
      btn.textContent = favIds[key] ? '已收藏 ★' : '★ 收藏此目击';
      btn.addEventListener('click', function () { toggleFavorite(pin, btn); });
      fields.appendChild(btn);
    }, 120);
  });

  function pinKey(pin) {
    return String(pin.id).indexOf('usr-') === 0 ? pin.id : String(pin.id);
  }

  function toggleFavorite(pin, btn) {
    if (!currentUser) {
      toast('请先登录');
      openAuthModal('login');
      return;
    }
    var key = pinKey(pin);
    var isUsr = key.indexOf('usr-') === 0;
    var body = isUsr
      ? { sighting_id: Number(key.slice(4)), title: pin.title, lat: pin.lat, lng: pin.lng, thumb: pin.cardThumbImg || '', pin_type: pin.pinType || 'rumored' }
      : { pin_id: key, title: pin.title, lat: pin.lat, lng: pin.lng, thumb: pin.cardThumbImg || pin.imageSrc || '', pin_type: pin.pinType || 'confirmed' };
    btn.disabled = true;
    api('/api/favorites', { method: 'POST', body: body })
      .then(function (d) {
        favIds[key] = true;
        btn.classList.add('is-faved');
        btn.innerHTML = '★';
        if (d.duplicated) toast('已收藏过该目击');
        else toast('已收藏 ★');
        btn.disabled = false;
      })
      .catch(function (err) {
        toast(err.message);
        btn.disabled = false;
      });
  }

  /* ==================== 菜单联动 ==================== */
  // 社区面板（原版报告目击）底部"发布目击"按钮 → 打开发布弹窗
  document.addEventListener('click', function (e) {
    var cta = e.target.closest ? e.target.closest('.x-feed__cta') : null;
    if (!cta) return;
    e.preventDefault();
    openReportModal();
  }, false);




  // 底部滚动字幕条（.ticker）：点击打开「报告目击」社区面板
  // 只有地图出来后的文字可点（地图就绪前保持不可点击，不响应）
  // pointerdown + click 双触发保证响应可靠；未命中 ticker 时用坐标兜底
  function tickerHitTest(e) {
    var t = e.target && e.target.closest ? e.target.closest('.ticker') : null;
    if (!t) {
      var ticker = document.querySelector('.ticker');
      if (ticker) {
        var r = ticker.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) t = ticker;
      }
    }
    return t;
  }
  function openCommunityFromTicker(e) {
    if (!tickerHitTest(e)) return;
    // 地图出来前（pre-map 未淡出）：文字不可点
    if (!window.__menuMapReady) return;
    e.preventDefault(); // 阻止 pointerdown 后续兼容性 mouse 事件 → click 不重复触发
    document.dispatchEvent(new CustomEvent('menu-nav:open-x-feed'));
  }
  document.addEventListener('pointerdown', openCommunityFromTicker, false);
  document.addEventListener('click', openCommunityFromTicker, false);

  // 底部 ticker：仅「分享到社区」文字显示下划线（其他消息如"加载中"不显示）
  (function () {
    var track = document.querySelector('.ticker-track');
    if (!track) return;
    function refresh() {
      track.classList.toggle('is-share', track.textContent.indexOf('分享') !== -1);
    }
    refresh();
    new MutationObserver(refresh).observe(track, { childList: true, subtree: true, characterData: true });
  })();

  // 用户点位刷新后同步社区面板（新目击立即出现在时间线）
  function refreshCommunityFeed() {
    document.dispatchEvent(new CustomEvent('app:x-feed-refresh'));
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('.main-menu__link') : null;
    if (!link) return;
    var action = link.dataset.action;
    if (action === 'open-auth-modal') { e.preventDefault(); openAuthModal('login'); }
    else if (action === 'open-user-panel') { e.preventDefault(); openUserPanel(); }
    else if (action === 'open-records-modal') { e.preventDefault(); openRecordsModal('favorites'); }
  }, false);

  /* ==================== 初始化 ==================== */
  function init() {
    checkAuth();
    // 立即加载用户点位：雷达/社区等组件不依赖地图，首页（未进地图）也需要数据
    refreshUserPins();
    // 地图真正就绪（app:map-2d-ready 在 Map2D 事件监听器注册后才派发）→ 重新派发点位
    // 解决：刷新后必须新建目击地图才有点位的问题（之前派发过早，监听器未注册点位丢失）
    document.addEventListener('app:map-2d-ready', function () {
      refreshUserPins();
    });
    // 兜底：spideyMap 就绪后刷新一次
    waitForMap(function () {
      refreshUserPins();
      // 地图切换回 2D 时刷新一次（3D 模式下点位可能不同）
      document.addEventListener('app:map-switched-2d', function () { refreshUserPins(); });
    });
    // 点位渲染保障：不依赖任何事件，直接轮询检查地图上用户点位是否渲染
    // 未渲染则重新派发（解决刷新后必须创建目击才显示点位的问题）
    setTimeout(function ensurePinsOnMap() {
      if (!window.spideyMap) return; // 地图未就绪，等下一轮
      var rendered = !!document.querySelector('#map-view .spidey-pin-wrap[data-pin-id^="usr-"]');
      var hasPins = !!(window.spideyPins || []).length;
      if (!rendered && hasPins) {
        refreshUserPins(); // 重新派发点位事件
        setTimeout(ensurePinsOnMap, 1200); // 1.2 秒后再检查
      }
    }, 4000); // 4 秒后开始检查（给地图初始化留时间）

    // 地图就绪后定位到用户目击区域：否则全球视图（巴西）下中国点位在视野外不可见
    function focusMapOnUserPins() {
      var pins = window.spideyPins || [];
      if (!pins.length) return;
      var map = window.spideyMap || window.__amapMapInstance;
      if (!map || window.__userPinsFocused) return;
      window.__userPinsFocused = true; // 每次刷新只自动定位一次
      var sumLat = 0, sumLng = 0, minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      pins.forEach(function (p) {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) return;
        sumLat += p.lat; sumLng += p.lng;
        minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
        minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
      });
      var cLat = sumLat / pins.length, cLng = sumLng / pins.length;
      var span = Math.max(maxLat - minLat, maxLng - minLng);
      var zoom = span > 60 ? 3 : span > 20 ? 4 : span > 8 ? 5 : span > 3 ? 6 : span > 1 ? 8 : 10;
      zoom = Math.min(13, Math.max(3, zoom));
      try {
        if (typeof map.setCenter === 'function') map.setCenter({ lat: cLat, lng: cLng });
        if (typeof map.setZoom === 'function') map.setZoom(zoom);
      } catch (e) { /* 适配层兼容 */ }
    }
    document.addEventListener('app:map-2d-ready', focusMapOnUserPins);
    waitForMap(function () { focusMapOnUserPins(); });
    // 雷达诊断（5 秒后输出，确认数据是否到达雷达）
    setTimeout(function () {
      var pins = window.spideyPins || [];
      var map = window.spideyMap || window.__amapMapInstance;
      var center = null, zoom = null;
      try {
        if (map && typeof map.getCenter === 'function') {
          var c = map.getCenter();
          if (c) { center = { lat: c.lat ? (typeof c.lat === 'function' ? c.lat() : c.lat) : null, lng: c.lng ? (typeof c.lng === 'function' ? c.lng() : c.lng) : null }; }
          if (typeof map.getZoom === 'function') zoom = map.getZoom();
        }
      } catch (e) { center = { err: e.message }; }
      var radar = document.getElementById('radar-canvas');
      var diag = {
        pinsCount: pins.length,
        pinsSample: pins.slice(0, 3).map(function (p) { return { id: p.id, type: p.pinType, lat: p.lat, lng: p.lng }; }),
        mapReady: !!map,
        center: center,
        zoom: zoom,
        radarCanvas: !!radar,
        radarSize: radar ? radar.width + 'x' + radar.height : 'missing'
      };
      // 距离计算（与雷达逻辑一致）
      if (pins.length && center && center.lat != null) {
        var p = pins[0];
        var dLat = (p.lat - center.lat) * Math.PI / 180;
        var dLng = (p.lng - center.lng) * Math.PI / 180;
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(center.lat * Math.PI / 180) * Math.cos(p.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        var km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        diag.distKm = Math.round(km);
        // G() 半径
        var e = Number.isFinite(zoom) ? zoom : 13;
        var r = 20000; // 我们修复的：zoom<=3 全球半径
        if (e > 3) {
          var o = window.__amapMapInstance && window.__amapMapInstance.getMinZoom ? window.__amapMapInstance.getMinZoom() : 2;
          var c = Math.max(0, 13 - e), i = Math.max(1, 13 - (Number.isFinite(o) ? o : 13)), s = Math.min(1, c / i);
          r = Math.max(25, 50 * Math.pow(2, s * i * 0.58));
        }
        diag.radarRadiusKm = Math.round(r);
        diag.wouldShow = km <= r;
      }
      console.log('[雷达诊断]', JSON.stringify(diag, null, 1));
    }, 5000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // 防止官方数据模块把 window.spideyPins 覆盖为空（官方 spideyPins 已清空）
  // 官方模块加载完成（app:pins-loaded）后，恢复为用户目击数据
  document.addEventListener('app:pins-loaded', function () {
    if (window.userPins && window.userPins.length) {
      window.spideyPins = window.userPins;
      if (window.mainData) window.mainData.spideyPins = window.userPins;
    }
  });
  // 轮询兜底：spideyPins 为空但用户有数据时恢复
  setInterval(function () {
    var u = window.userPins;
    if (u && u.length && (!window.spideyPins || !window.spideyPins.length)) {
      window.spideyPins = u;
      if (window.mainData) window.mainData.spideyPins = u;
    }
  }, 2000);

  /* ==================== 点位卡片跟随目击移动 ==================== */
  // 地图移动/缩放后，把卡片重新定位到点位的新位置（否则卡片固定在原地与点位分离）
  (function cardFollowPin() {
    var currentPinId = null;
    document.addEventListener('app:pin-click', function (e) {
      var id = e.detail && (e.detail.id != null ? e.detail.id : (e.detail.pin && e.detail.pin.id));
      if (id != null) currentPinId = String(id);
      // 立即隐藏当前卡片：避免 flyTo 唤起动画期间旧卡片跟随地图平移
      // （Map2D 要等动画结束才 show 新卡片，期间旧卡片会跟着平移再闪烁切换）
      var cur = document.querySelector('.pin-card-wrap.is-visible');
      if (cur) cur.remove();
    });
    document.addEventListener('app:view-red-pin-sighting', function (e) {
      var pin = e.detail && e.detail.pin;
      if (pin && pin.id != null) currentPinId = String(pin.id);
    });

    function repositionCard() {
      if (!currentPinId) return;
      var card = document.querySelector('.pin-card-wrap.is-visible');
      if (!card) return;
      var container = document.querySelector('#map-view');
      if (!container) return;
      var pinEl;
      try { pinEl = document.querySelector('#map-view .spidey-pin-wrap[data-pin-id="' + CSS.escape(currentPinId) + '"]'); } catch (e) { return; }
      if (!pinEl) return;
      var o = pinEl.getBoundingClientRect();
      var M = container.getBoundingClientRect();
      var B = o.left - M.left + o.width / 2;
      var H = o.top - M.top;
      var C = card.offsetWidth || 220;
      var h = card.offsetHeight || 170;
      // 智能定位：弹窗跟随点位（容器 overflow visible 允许超出），仅在超出视口时收拢
      var left = B - C / 2;
      var top = H - h - 10;
      var vw = window.innerWidth, vh = window.innerHeight;
      if (M.left + left < 24) left = 24 - M.left;
      if (M.left + left + C > vw - 24) left = vw - 24 - M.left - C;
      if (M.top + top < 24) {
        top = H + 10; // 点位在顶部 → 弹窗翻转到下方
        card.classList.add('is-below');
      } else {
        card.classList.remove('is-below');
      }
      if (M.top + top + h > vh - 24) top = Math.max(24 - M.top, vh - 24 - M.top - h);
      card.style.left = left + 'px';
      card.style.top = top + 'px';
    }

    function bindMapEvents() {
      var map = window.__amapMapInstance;
      if (!map || map.__appCardFollow) return;
      map.__appCardFollow = true;
      ['moveend', 'zoomend', 'dragend', 'resize'].forEach(function (evt) {
        try { map.on(evt, repositionCard); } catch (e) { /* 兼容 */ }
      });
      // 持续移动/缩放中实时跟随
      try { map.on('move', repositionCard); map.on('zooming', repositionCard); } catch (e) { /* 兼容 */ }
    }
    document.addEventListener('app:map-2d-ready', bindMapEvents);
    setTimeout(bindMapEvents, 6000); // 兜底：地图就绪后绑定
    setInterval(function () {
      if (!window.__amapMapInstance || !window.__amapMapInstance.__appCardFollow) bindMapEvents();
    }, 3000);

    // 卡片区域点击：若点击位置附近有点位（rumored 点位 z-index 低于卡片会被盖住），
    // 视为「切换点位」而非打开详情——解决再点击另一个点位时卡片不切换的问题
    document.addEventListener('click', function (e) {
      if (!e.target || !e.target.closest) return;
      var card = e.target.closest('.pin-card-wrap');
      if (!card || !card.classList.contains('is-visible')) return;
      // 按钮（查看目击/收藏）点击不拦截，正常打开详情
      if (e.target.closest('.pin-card-dyn__cta') || e.target.closest('.app-fav-btn')) return;
      var closestPin = null, minDist = 40; // 40px 内视为点击该点位
      var pins = document.querySelectorAll('#map-view .spidey-pin-wrap');
      for (var i = 0; i < pins.length; i++) {
        var r = pins[i].getBoundingClientRect();
        if (r.width <= 0) continue;
        var cx = r.x + r.width / 2, cy = r.y + r.height / 2;
        var d = Math.sqrt(Math.pow(e.clientX - cx, 2) + Math.pow(e.clientY - cy, 2));
        if (d < minDist) { minDist = d; closestPin = pins[i]; }
      }
      if (closestPin) {
        e.preventDefault();
        e.stopPropagation(); // 阻止 Map2D 打开详情
        try { closestPin.click(); } catch (err) { /* 兼容 */ } // 触发点位点击 → 切换卡片
      }
    }, true); // 捕获阶段：先于 Map2D 的卡片 click 监听
  })();

  // 暴露给其他脚本
  window.spideyApp = {
    openAuth: openAuthModal,
    openReport: openReportModal,
    openRecords: openRecordsModal,
    refreshUserPins: refreshUserPins,
    getCurrentUser: function () { return currentUser; }
  };
})();
