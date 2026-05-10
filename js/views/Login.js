/**
 * 登录/注册界面
 */

function renderLogin() {
    const container = document.getElementById('loginBody');
    const registerLink = document.getElementById('loginRegisterLink');
    const users = LS.get('users', []);

    if (users.length === 0) {
        // 首次使用：注册管理员
        container.innerHTML = `
            <div style="margin-bottom:16px;text-align:center;">
                <div style="font-size:13px;color:var(--text-secondary);">首次使用，请注册管理员账号</div>
            </div>
            <div class="form-group">
                <label>用户名 <span class="required">*</span></label>
                <input type="text" class="form-control" id="regUsername" placeholder="请输入用户名" autocomplete="off">
            </div>
            <div class="form-group">
                <label>姓名 <span class="required">*</span></label>
                <input type="text" class="form-control" id="regName" placeholder="请输入真实姓名">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>警号 <span class="required">*</span></label>
                    <input type="text" class="form-control" id="regBadge" placeholder="请输入警号">
                </div>
                <div class="form-group">
                    <label>所属部门 <span class="required">*</span></label>
                    <input type="text" class="form-control" id="regDept" placeholder="如：XX市公安局经侦支队">
                </div>
            </div>
            <div class="form-group">
                <label>登录密码 <span class="required">*</span></label>
                <input type="password" class="form-control" id="regPassword" placeholder="请设置密码（至少6位）">
            </div>
            <div class="form-group">
                <label>确认密码 <span class="required">*</span></label>
                <input type="password" class="form-control" id="regConfirmPwd" placeholder="请再次输入密码">
            </div>
            <button class="login-btn" onclick="registerAdmin()">创建管理员账号</button>
        `;
        registerLink.textContent = '已有账号？立即登录';
        registerLink.onclick = renderLogin;
    } else {
        // 登录界面
        container.innerHTML = `
            <div class="form-group">
                <label>用户名</label>
                <input type="text" class="form-control" id="loginUsername" placeholder="请输入用户名" autocomplete="username" autofocus>
            </div>
            <div class="form-group">
                <label>密码</label>
                <input type="password" class="form-control" id="loginPassword" placeholder="请输入密码" autocomplete="current-password"
                    onkeydown="if(event.key==='Enter')doLogin()">
            </div>
            <button class="login-btn" onclick="doLogin()">登 录</button>
        `;
        registerLink.textContent = '还没有账号？注册用户';
        registerLink.onclick = showRegisterForm;
    }
}

function showRegisterForm() {
    const container = document.getElementById('loginBody');
    const registerLink = document.getElementById('loginRegisterLink');

    container.innerHTML = `
        <div style="margin-bottom:16px;text-align:center;">
            <div style="font-size:13px;color:var(--text-secondary);">注册新用户</div>
        </div>
        <div class="form-group">
            <label>用户名 <span class="required">*</span></label>
            <input type="text" class="form-control" id="regUsername" placeholder="请输入用户名">
        </div>
        <div class="form-group">
            <label>姓名 <span class="required">*</span></label>
            <input type="text" class="form-control" id="regName" placeholder="请输入真实姓名">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>警号 <span class="required">*</span></label>
                <input type="text" class="form-control" id="regBadge" placeholder="请输入警号">
            </div>
            <div class="form-group">
                <label>所属部门 <span class="required">*</span></label>
                <input type="text" class="form-control" id="regDept" placeholder="如：XX市公安局经侦支队">
            </div>
        </div>
        <div class="form-group">
            <label>密码 <span class="required">*</span></label>
            <input type="password" class="form-control" id="regPassword" placeholder="请设置密码（至少6位）">
        </div>
        <div class="form-group">
            <label>确认密码 <span class="required">*</span></label>
            <input type="password" class="form-control" id="regConfirmPwd" placeholder="请再次输入密码">
        </div>
        <button class="login-btn" onclick="registerNewUser()">注册</button>
    `;
    registerLink.textContent = '已有账号？返回登录';
    registerLink.onclick = renderLogin;
}

function registerAdmin() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const badge = document.getElementById('regBadge').value.trim();
    const dept = document.getElementById('regDept').value.trim();
    const pwd = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPwd').value;

    if (!username || !name || !badge || !dept || !pwd) {
        showToast('请填写所有必填项', 'error');
        return;
    }
    if (pwd.length < 6) { showToast('密码长度至少6位', 'error'); return; }
    if (pwd !== confirm) { showToast('两次密码输入不一致', 'error'); return; }

    const user = {
        id: generateId(),
        username, name, badge, dept,
        password: btoa(pwd),
        role: 'admin',
        createdAt: new Date().toISOString()
    };

    LS.set('users', [user]);
    LS.set('currentUser', { id: user.id, username: user.username, name: user.name, badge: user.badge, dept: user.dept, role: user.role });
    currentUser = LS.get('currentUser');

    DB.addAuditLog({ id: generateId(), userId: user.id, userName: user.name,
        action: '系统初始化', target: '管理员账号',
        detail: `创建管理员账号：${user.name}（${user.badge}）`,
        timestamp: new Date().toISOString() });

    showToast('管理员账号创建成功！', 'success');
    renderApp();
    navigateTo('dashboard');
    updateTopBar();
    updateStatusBar();
    startClock();
}

function registerNewUser() {
    const username = document.getElementById('regUsername').value.trim();
    const name = document.getElementById('regName').value.trim();
    const badge = document.getElementById('regBadge').value.trim();
    const dept = document.getElementById('regDept').value.trim();
    const pwd = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPwd').value;

    if (!username || !name || !badge || !dept || !pwd) {
        showToast('请填写所有必填项', 'error');
        return;
    }
    if (pwd.length < 6) { showToast('密码长度至少6位', 'error'); return; }
    if (pwd !== confirm) { showToast('两次密码输入不一致', 'error'); return; }

    const users = LS.get('users', []);
    if (users.find(u => u.username === username)) {
        showToast('用户名已存在', 'error');
        return;
    }

    const user = {
        id: generateId(), username, name, badge, dept,
        password: btoa(pwd), role: 'user',
        createdAt: new Date().toISOString()
    };
    users.push(user);
    LS.set('users', users);
    showToast('注册成功，请登录', 'success');
    renderLogin();
}

function doLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const users = LS.get('users', []);

    const user = users.find(u => u.username === username && atob(u.password) === password);
    if (!user) { showToast('用户名或密码错误', 'error'); return; }

    LS.set('currentUser', { id: user.id, username: user.username, name: user.name, badge: user.badge, dept: user.dept, role: user.role });
    currentUser = LS.get('currentUser');

    DB.addAuditLog({ id: generateId(), userId: user.id, userName: user.name,
        action: '登录系统', target: '系统登录',
        detail: `用户 ${user.name}（${user.badge}）登录系统`,
        timestamp: new Date().toISOString() });

    showToast('登录成功！', 'success');
    renderApp();
    navigateTo('dashboard');
    updateTopBar();
    updateStatusBar();
    startClock();
}

window.registerAdmin = registerAdmin;
window.registerNewUser = registerNewUser;
window.doLogin = doLogin;
window.showRegisterForm = showRegisterForm;

function toggleDarkMode() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'dark') {
        html.removeAttribute('data-theme');
        LS.set('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        LS.set('theme', 'dark');
    }
}
window.toggleDarkMode = toggleDarkMode;

(function() {
    const theme = LS.get('theme', 'light');
    if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
})();

renderLogin();
