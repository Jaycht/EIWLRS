/**
 * 系统设置 — 用户管理、审计日志、帮助中心、关于
 */

async function renderSettings(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        document.getElementById('contentActions').innerHTML = '';

        // 标签页
        container.innerHTML = `
            <div class="tabs">
                <div class="tab-item active" onclick="switchSettingTab(this, 'basic')">基本设置</div>
                <div class="tab-item" onclick="switchSettingTab(this, 'users')">用户管理</div>
                <div class="tab-item" onclick="switchSettingTab(this, 'audit')">审计日志</div>
                <div class="tab-item" onclick="switchSettingTab(this, 'help')">帮助中心</div>
                <div class="tab-item" onclick="switchSettingTab(this, 'about')">关于</div>
            </div>
            <div id="settingsTabContent">
                ${renderBasicSettings()}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

// ---- 标签页切换 ----
window.switchSettingTab = function(el, tab) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    const content = document.getElementById('settingsTabContent');

    switch (tab) {
        case 'basic': content.innerHTML = renderBasicSettings(); break;
        case 'users': renderUserSettings(content); break;
        case 'audit': renderAuditLog(content); break;
        case 'help': renderHelp(content); break;
        case 'about': renderAbout(content); break;
    }
};

// ---- 基本设置 ----
function renderBasicSettings() {
    const theme = LS.get('theme', 'light');
    const settings = LS.get('settings', { autoBackup: false, backupPath: '' });
    const user = currentUser || { name: '', badge: '', dept: '' };

    return `
        <div class="card">
            <div class="card-header">
                <h3>界面设置</h3>
            </div>
            <div class="form-group">
                <label>主题模式</label>
                <select class="form-control" style="width:200px;" onchange="setTheme(this.value)">
                    <option value="light" ${theme === 'light' ? 'selected' : ''}>浅色模式</option>
                    <option value="dark" ${theme === 'dark' ? 'selected' : ''}>暗黑模式</option>
                </select>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>备份设置</h3>
            </div>
            <div class="form-group">
                <label class="checkbox-item">
                    <input type="checkbox" ${settings.autoBackup ? 'checked' : ''}
                        onchange="toggleAutoBackup(this.checked)">
                    启用退出时自动备份提醒
                </label>
                <div class="form-hint">每次退出系统时提醒您进行数据备份</div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3>当前用户信息</h3>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);line-height:2;">
                <div><strong>姓名：</strong>${escapeHtml(user.name)}</div>
                <div><strong>警号：</strong>${escapeHtml(user.badge)}</div>
                <div><strong>所属部门：</strong>${escapeHtml(user.dept)}</div>
            </div>
        </div>
    `;
}

window.setTheme = function(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
    LS.set('theme', theme);
    showToast('主题已切换', 'success');
};

window.toggleAutoBackup = function(enabled) {
    const settings = LS.get('settings', {});
    settings.autoBackup = enabled;
    LS.set('settings', settings);
    showToast(enabled ? '已启用自动备份提醒' : '已关闭自动备份提醒', 'success');
};

// ---- 用户管理 ----
async function renderUserSettings(container) {
    const users = await DB.getUsers();
    const currentUserId = currentUser?.id;

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>用户列表</h3>
                <button class="btn btn-primary btn-sm" onclick="showAddUserForm()">+ 添加用户</button>
            </div>
            ${users.length === 0 ? `
                <div style="padding:20px;text-align:center;color:var(--text-muted);">暂无用户</div>
            ` : `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>用户名</th>
                            <th>姓名</th>
                            <th>警号</th>
                            <th>部门</th>
                            <th>角色</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${escapeHtml(u.username)}</td>
                                <td>${escapeHtml(u.name)}</td>
                                <td>${escapeHtml(u.badge)}</td>
                                <td>${escapeHtml(u.dept)}</td>
                                <td><span class="tag ${u.role === 'admin' ? 'tag-primary' : 'tag-success'}">${u.role === 'admin' ? '管理员' : '普通用户'}</span></td>
                                <td>
                                    ${u.id !== currentUserId ? `<button class="btn btn-danger btn-sm" onclick="deleteUserConfirm('${u.id}')">删除</button>` : '<span style="color:var(--text-muted);font-size:12px;">当前用户</span>'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `}
        </div>
    `;
}

window.showAddUserForm = function() {
    const overlay = openModal(`
        <form id="addUserForm" onsubmit="saveNewUser(event)">
            <div class="form-group">
                <label>用户名 <span class="required">*</span></label>
                <input type="text" class="form-control" name="username" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>姓名 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label>警号 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="badge" required>
                </div>
            </div>
            <div class="form-group">
                <label>所属部门 <span class="required">*</span></label>
                <input type="text" class="form-control" name="dept" required>
            </div>
            <div class="form-group">
                <label>密码 <span class="required">*</span></label>
                <input type="password" class="form-control" name="password" required minlength="6">
            </div>
            <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">添加用户</button>
        </form>
    `);
    overlay.querySelector('#modalTitle').textContent = '添加用户';
};

window.saveNewUser = async function(e) {
    e.preventDefault();
    const data = new FormData(e.target);
    const users = await DB.getUsers();

    if (users.find(u => u.username === data.get('username'))) {
        showToast('用户名已存在', 'error');
        return;
    }

    const user = {
        id: generateId(),
        username: data.get('username'),
        name: data.get('name'),
        badge: data.get('badge'),
        dept: data.get('dept'),
        password: btoa(data.get('password')),
        role: 'user',
        createdAt: new Date().toISOString()
    };

    users.push(user);
    LS.set('users', users);

    await DB.addAuditLog({
        id: generateId(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || '系统',
        action: '添加用户',
        target: user.name,
        detail: `添加用户：${user.name}（${user.badge}）`
    });

    showToast('用户添加成功', 'success');
    closeModal(e.target.closest('.modal-overlay'));
    renderUserSettings(document.getElementById('settingsTabContent'));
};

window.deleteUserConfirm = async function(userId) {
    const confirmed = await showConfirm('确认删除', '删除用户后该用户将无法登录系统。');
    if (!confirmed) return;

    let users = await DB.getUsers();
    const user = users.find(u => u.id === userId);
    users = users.filter(u => u.id !== userId);
    LS.set('users', users);

    await DB.addAuditLog({
        id: generateId(),
        userId: currentUser?.id || 'system',
        userName: currentUser?.name || '系统',
        action: '删除用户',
        target: user?.name || '未知',
        detail: `删除用户：${user?.name}`
    });

    showToast('用户已删除', 'success');
    renderUserSettings(document.getElementById('settingsTabContent'));
};

// ---- 审计日志 ----
async function renderAuditLog(container) {
    const logs = await DB.getAuditLogs(500);

    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>操作审计日志</h3>
                <div style="font-size:12px;color:var(--text-muted);">共 ${logs.length} 条记录 | 日志不可删除 | 可导出备案</div>
            </div>
            <div style="max-height:500px;overflow-y:auto;">
                ${logs.length === 0 ? `
                    <div style="padding:20px;text-align:center;color:var(--text-muted);">暂无审计日志</div>
                ` : `
                    <table class="data-table" style="font-size:12px;">
                        <thead>
                            <tr>
                                <th style="width:140px;">时间</th>
                                <th style="width:80px;">用户</th>
                                <th style="width:100px;">操作</th>
                                <th>目标/详情</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td style="white-space:nowrap;">${formatDate(log.timestamp)}<br><span style="color:var(--text-muted);font-size:11px;">${log.timestamp ? log.timestamp.split('T')[1]?.split('.')[0] : ''}</span></td>
                                    <td>${escapeHtml(log.userName)}</td>
                                    <td><span class="tag tag-primary" style="font-size:10px;">${escapeHtml(log.action)}</span></td>
                                    <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(log.detail || '')}">${escapeHtml(log.detail || log.target || '')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
            <div style="margin-top:12px;">
                <button class="btn btn-outline btn-sm" onclick="exportAuditLog()">导出审计日志（Excel）</button>
            </div>
        </div>
    `;
}

window.exportAuditLog = async function() {
    const logs = await DB.getAuditLogs(500);
    const headers = ['序号', '时间', '用户', '操作', '目标/详情'];
    const data = logs.map((log, i) => [
        i + 1,
        log.timestamp || '',
        log.userName || '',
        log.action || '',
        log.detail || log.target || ''
    ]);
    exportToExcel(headers, data, '审计日志_' + today());
    showToast('审计日志已导出', 'success');
};

// ---- 帮助中心 ----
function renderHelp(container) {
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3>操作手册</h3>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);line-height:2;">
                <h4 style="font-size:14px;font-weight:600;color:var(--text-primary);margin:12px 0 6px;">一、快速上手</h4>
                <ol style="padding-left:20px;">
                    <li><strong>新建案件：</strong>进入「案件管理」→ 点击「新建案件」→ 填写必填信息 → 创建完成</li>
                    <li><strong>记录工作：</strong>进入「工作记录」→ 点击「新建记录」→ 选择关联案件 → 勾选/填写工作内容 → 保存</li>
                    <li><strong>查看进度：</strong>进入「案件进度」→ 查看进度条、统计数据和待办事项</li>
                    <li><strong>生成报告：</strong>进入「报告生成」→ 选择案件 → 点击「生成工作报告」→ 自动下载Word文档</li>
                    <li><strong>备份数据：</strong>进入「数据管理」→ 点击「一键备份」→ 保存备份文件</li>
                </ol>

                <h4 style="font-size:14px;font-weight:600;color:var(--text-primary);margin:12px 0 6px;">二、常用功能</h4>
                <ul style="padding-left:20px;">
                    <li><strong>复制昨日记录：</strong>在新建工作记录时，查看上一条记录后点击「复制为今日记录」</li>
                    <li><strong>案件筛选：</strong>在案件管理页面可按状态、标记、关键字快速筛选案件</li>
                    <li><strong>快捷统计：</strong>右侧统计面板实时显示在办案件数、近7日记录数</li>
                    <li><strong>暗黑模式：</strong>点击顶部状态栏的月亮图标切换夜间模式</li>
                </ul>

                <h4 style="font-size:14px;font-weight:600;color:var(--text-primary);margin:12px 0 6px;">三、注意事项</h4>
                <ul style="padding-left:20px;">
                    <li>删除案件将同时删除该案件的所有工作记录，不可恢复</li>
                    <li>数据恢复会覆盖当前所有数据，恢复前建议先备份</li>
                    <li>审计日志不可手动删除，仅可清理超过保存期限的日志</li>
                    <li>建议每周至少备份一次数据</li>
                </ul>
            </div>
        </div>
    `;
}

// ---- 关于 ----
function renderAbout(container) {
    container.innerHTML = `
        <div class="card" style="text-align:center;padding:30px;">
            <div style="font-size:48px;color:var(--primary);margin-bottom:12px;">&#9878;</div>
            <h3 style="font-size:20px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">经侦工作日志登记系统</h3>
            <p style="font-size:14px;color:var(--text-secondary);margin-bottom:4px;">Economic Investigation Work Log Registration System</p>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">版本 V1.2</p>
            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
                公安经济犯罪侦查案件管理平台
            </p>
            <div style="border-top:1px solid var(--border);padding-top:16px;font-size:13px;color:var(--text-secondary);line-height:2;">
                <p><strong style="color:#1565C0;">&copy; 版权所有 经侦工作日志登记系统（EIWLRS）</strong></p>
                <p><strong style="color:#1565C0;">制作人：陈洪涛</strong></p>
                <p style="margin-top:8px;font-size:12px;color:var(--text-muted);">
                    本软件及相关文档（含报告模板、表格模板）仅供公安经侦部门内部离线使用，<br>
                    未经许可，不得复制、传播、修改或用于其他非经侦工作场景。
                </p>
                <p style="margin-top:8px;font-size:11px;color:var(--text-muted);">
                    免责声明：本软件仅用于经侦案件工作日志登记、案件管理及报告生成，<br>
                    所有数据均存储于本地离线设备，软件开发者及制作人不对数据使用过程中的违规操作承担责任，<br>
                    使用者需严格遵守公安数据安全管理规定。
                </p>
                <p style="margin-top:12px;font-size:12px;color:var(--text-secondary);">
                    开发完成日期：2026年5月25日<br>
                    联系方式：Jaycht@126.com
                </p>
                <p style="margin-top:12px;font-size:12px;color:var(--text-muted);">
                    本软件专为公安经侦基层民警设计<br>
                    纯离线运行 | 无联网依赖 | 适配Win7/10/11<br>
                    &copy; 版权所有 经侦工作日志登记系统（EIWLRS）| 制作人：陈洪涛
                </p>
            </div>
        </div>
    `;
}
