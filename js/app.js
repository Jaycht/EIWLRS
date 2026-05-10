/**
 * 经侦工作日志登记系统 — 主应用入口
 * SPA路由、全局状态、菜单栏、底部状态栏
 */

let currentRoute = 'dashboard';
let currentUser = null;
let clockInterval = null;

// 页面初始化
document.addEventListener('DOMContentLoaded', async () => {
    await openDB();
    currentUser = LS.get('currentUser', null);
    if (!currentUser) {
        showLogin();
        return;
    }
    renderApp();
    navigateTo('dashboard');
    updateTopBar();
    updateStatusBar();
    startClock();
});

// ===== 路由系统 =====
const routes = {
    dashboard: { title: '工作台', view: renderDashboard },
    cases: { title: '案件管理', view: renderCaseManager },
    records: { title: '工作记录', view: renderWorkLog },
    progress: { title: '案件进度', view: renderProgress },
    reports: { title: '报告生成', view: renderReports },
    data: { title: '数据管理', view: renderDataManager },
    settings: { title: '系统设置', view: renderSettings }
};

function navigateTo(route) {
    currentRoute = route;
    const rc = routes[route];
    if (!rc) return;

    document.getElementById('pageTitle').textContent = rc.title;
    // 状态栏页名
    document.getElementById('statusPage').textContent = rc.title;

    // 导航高亮
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === route);
    });

    // 关闭所有菜单
    closeAllMenus();

    const content = document.getElementById('contentBody');
    content.innerHTML = '';
    rc.view(content);
    updateStatsPanel();
}

// ===== 界面切换 =====
function renderApp() {
    document.getElementById('appContainer').style.display = 'flex';
    document.getElementById('loginContainer').style.display = 'none';
    const u = currentUser || {};
    document.getElementById('userName').textContent = u.name || u.username || '';
    document.getElementById('userBadge').textContent = u.badge || '';
    document.getElementById('userDept').textContent = u.dept || '';
}

function showLogin() {
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginContainer').style.display = 'flex';
}

// ===== 菜单栏 =====
document.addEventListener('click', (e) => {
    const menuItem = e.target.closest('.menu-item[data-menu]');
    if (menuItem) {
        e.stopPropagation();
        const isOpen = menuItem.classList.contains('open');
        closeAllMenus();
        if (!isOpen) menuItem.classList.add('open');
        return;
    }

    // 菜单项点击
    const dropdownItem = e.target.closest('.menu-dropdown-item');
    if (dropdownItem) {
        const action = dropdownItem.dataset.action;
        closeAllMenus();
        handleMenuAction(action);
        return;
    }

    // 导航点击
    const navItem = e.target.closest('.nav-item');
    if (navItem && navItem.dataset.route) {
        navigateTo(navItem.dataset.route);
    }

    // 点击外部关闭菜单
    closeAllMenus();
});

function closeAllMenus() {
    document.querySelectorAll('.menu-item.open').forEach(el => el.classList.remove('open'));
}

function handleMenuAction(action) {
    switch (action) {
        case 'newCase': showNewCaseForm(); break;
        case 'cases': navigateTo('cases'); break;
        case 'records': navigateTo('records'); break;
        case 'progress': navigateTo('progress'); break;
        case 'logout': logout(); break;
        case 'close':
            if (window.electronAPI && window.electronAPI.closeApp) {
                window.electronAPI.closeApp();
            } else {
                window.close();
            }
            break;
        case 'backup': navigateTo('data'); setTimeout(() => doBackup(), 200); break;
        case 'restore': navigateTo('data'); setTimeout(() => document.getElementById('restoreFileInput')?.click(), 200); break;
        case 'migrate': navigateTo('data'); break;
        case 'cleanup': navigateTo('data'); break;
        case 'help': navigateTo('settings'); setTimeout(() => {
            const tabs = document.querySelectorAll('.tab-item');
            tabs.forEach(t => { if (t.textContent.includes('帮助')) t.click(); });
        }, 200); break;
        case 'copyright': navigateTo('settings'); setTimeout(() => {
            const tabs = document.querySelectorAll('.tab-item');
            tabs.forEach(t => { if (t.textContent.includes('关于')) t.click(); });
        }, 200); break;
    }
}

// ===== 时钟 =====
function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const mi = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const el = document.getElementById('statusClock');
    if (el) el.textContent = `${y}-${m}-${d} ${h}:${mi}:${s}`;
}

// ===== 顶部状态栏实时更新 =====
async function updateTopBar() {
    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();
        const todayStr = today();

        const totalEl = document.getElementById('totalCases');
        const recEl = document.getElementById('todayRecords');
        const overEl = document.getElementById('overdueCount');

        if (totalEl) totalEl.textContent = cases.length;

        const todayRecs = records.filter(r => r.recordDate === todayStr);
        if (recEl) recEl.textContent = todayRecs.length;

        let overdue = 0;
        for (const r of records) {
            if (r.nextPlans) {
                for (const p of r.nextPlans) {
                    if (p.deadline && p.deadline < todayStr && !p.completed) overdue++;
                }
            }
        }
        if (overEl) {
            overEl.textContent = overdue;
            overEl.style.display = overdue > 0 ? '' : 'none';
        }

        // 状态栏用户
        const su = document.getElementById('statusUser');
        if (su && currentUser) su.textContent = currentUser.name || currentUser.username || '';
    } catch (e) {
        console.error('更新状态栏失败:', e);
    }
}

// ===== 底部状态栏 =====
function updateStatusBar() {
    const su = document.getElementById('statusUser');
    if (su && currentUser) {
        su.textContent = `${currentUser.name || ''}（${currentUser.badge || ''}）`;
    }
}

// ===== 右侧统计面板 =====
async function updateStatsPanel() {
    const panel = document.getElementById('statsPanel');
    if (!panel) return;

    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();
        const allCases = await DB.getAllCases(true);

        const activeCases = cases.filter(c => c.status === '在办' || c.status === '提捕' || c.status === '移诉');
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekKey = weekAgo.toISOString().split('T')[0];
        const weekRecords = records.filter(r => r.recordDate >= weekKey);
        const archived = allCases.filter(c => c.isArchived);

        panel.innerHTML = `
            <div class="stats-card">
                <div class="stats-title">活跃在办案件</div>
                <div class="stats-number">${activeCases.length}</div>
                <div class="stats-desc">共 ${cases.length} 个在办案件</div>
            </div>
            <div class="stats-card">
                <div class="stats-title">近7日工作记录</div>
                <div class="stats-number">${weekRecords.length}</div>
                <div class="stats-desc">条工作记录</div>
            </div>
            <div class="stats-card">
                <div class="stats-title">归档案件</div>
                <div class="stats-number">${archived.length}</div>
                <div class="stats-desc">已归档案件总数</div>
            </div>
            <div class="stats-card">
                <div class="stats-title">快捷操作</div>
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:5px;">
                    <button class="btn btn-primary btn-sm" onclick="navigateTo('records')">新建工作记录</button>
                    <button class="btn btn-success btn-sm" onclick="showNewCaseForm()">新建案件</button>
                    <button class="btn btn-outline btn-sm" onclick="navigateTo('data')">一键备份</button>
                </div>
            </div>
        `;
    } catch (e) {
        console.error('更新统计面板失败:', e);
    }
}

// ===== 登出 =====
function logout() {
    if (clockInterval) clearInterval(clockInterval);
    LS.remove('currentUser');
    currentUser = null;
    showLogin();
    renderLogin();
}

// ===== 进度自动计算（基于工作记录） =====
function autoCalcProgress(c, records) {
    const caseRecords = records.filter(r => r.caseId === c.id);
    if (!caseRecords || caseRecords.length === 0) return 0;

    // 根据工作记录的完整度和证据量自动计算阶段
    const totalEvidence = caseRecords.reduce((s, r) => s + (r.evidenceCount || 0), 0);
    const totalWitness = caseRecords.reduce((s, r) => s + (r.witnessStatementCount || 0), 0);
    const totalSuspect = caseRecords.reduce((s, r) => s + (r.suspectStatementCount || 0), 0);
    const totalFrozen = caseRecords.reduce((s, r) => s + (r.assetFrozen || 0), 0);
    const hasCoercive = caseRecords.some(r => r.coerciveMeasures && r.coerciveMeasures.length > 0);
    const hasCollaboration = caseRecords.some(r => r.collaborationDetail);

    let phase = 0;
    // 有证据调取 → 侦查取证
    if (totalEvidence > 0 || totalWitness > 0 || totalSuspect > 0) phase = 1;
    // 有讯问 → 讯问突破
    if (totalSuspect > 0 || hasCollaboration) phase = Math.max(phase, 2);
    // 有强制措施 → 强制措施
    if (hasCoercive) phase = Math.max(phase, 3);
    // 有资产查控 → 资产处置
    if (totalFrozen > 0) phase = Math.max(phase, 4);
    // 如果有大量工作完成（>=5条记录）→ 移送起诉阶段
    if (caseRecords.length >= 5 && totalEvidence >= 5 && totalWitness >= 2) phase = Math.max(phase, 5);
    // 如果有10条以上记录且有大量证据 → 结案归档
    if (caseRecords.length >= 10 && c.status === '已结') phase = 6;

    return phase;
}

// ===== 全局暴露 =====
window.navigateTo = navigateTo;
window.logout = logout;
window.showToast = showToast;
window.showConfirm = showConfirm;
window.openModal = openModal;
window.closeModal = closeModal;
window.DB = DB;
window.LS = LS;
window.autoCalcProgress = autoCalcProgress;
window.startClock = startClock;
