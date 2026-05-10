/**
 * 数据管理 — 备份、恢复、导入导出、数据清理
 */

async function renderDataManager(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(true);
        const records = await DB.getAllWorkRecords();
        const logs = await DB.getAuditLogs(5);
        const settings = LS.get('settings', { autoBackup: false, backupPath: '' });

        document.getElementById('contentActions').innerHTML = '';

        container.innerHTML = `
            <!-- 数据概览 -->
            <div class="summary-grid" style="margin-bottom:16px;">
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${cases.length}</div>
                    <div class="summary-label">案件总数</div>
                </div>
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${records.length}</div>
                    <div class="summary-label">工作记录</div>
                </div>
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${logs.length}</div>
                    <div class="summary-label">审计日志</div>
                </div>
            </div>

            <!-- 一键备份 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128190; 一键备份</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    备份所有案件数据、工作记录、系统设置，生成加密备份包。
                </p>
                <div style="display:flex;gap:8px;">
                    <button class="btn btn-primary btn-lg" onclick="doBackup()">&#128190; 一键备份</button>
                    <button class="btn btn-outline" onclick="doBackupWithPassword()">设置密码备份</button>
                </div>
            </div>

            <!-- 数据恢复 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128191; 数据恢复</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    从备份文件恢复数据。注意：恢复将覆盖当前所有数据！
                </p>
                <div>
                    <input type="file" id="restoreFileInput" accept=".json,.eci" style="display:none;" onchange="doRestore(event)">
                    <button class="btn btn-danger" onclick="document.getElementById('restoreFileInput').click()">&#128191; 选择备份文件恢复</button>
                </div>
            </div>

            <!-- 案件迁移 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128230; 案件迁移</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    导出单个/多个案件数据，可在其他同版本软件中导入，适配民警换电脑、轮岗交接。
                </p>
                <div style="display:flex;gap:8px;align-items:center;">
                    <select class="form-control" id="migrateCaseSelect" style="width:300px;">
                        <option value="__all">导出全部案件</option>
                        ${cases.filter(c => !c.isArchived).map(c =>
                            `<option value="${c.id}">${escapeHtml(c.caseName)}</option>`
                        ).join('')}
                    </select>
                    <button class="btn btn-outline" onclick="exportCaseMigration()">导出案件</button>
                </div>
                <div style="margin-top:10px;">
                    <input type="file" id="importCaseFile" accept=".json" style="display:none;" onchange="importCaseMigration(event)">
                    <button class="btn btn-outline" onclick="document.getElementById('importCaseFile').click()">导入案件迁移包</button>
                </div>
            </div>

            <!-- 数据清理 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128465; 数据清理</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;" class="tag-danger" style="display:inline-block;">
                    &#9888; 清理前系统会自动备份，防止误删
                </p>
                <div style="display:flex;gap:8px;align-items:center;">
                    <span style="font-size:13px;color:var(--text-secondary);">清理</span>
                    <input type="number" class="form-control" id="cleanDays" style="width:80px;" value="180" min="30">
                    <span style="font-size:13px;color:var(--text-secondary);">天前的审计日志（合规保留至少半年）</span>
                    <button class="btn btn-outline btn-sm" onclick="cleanOldLogs()">清理</button>
                </div>
            </div>

            <!-- 最近操作记录 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128214; 最近操作记录</h3>
                </div>
                ${logs.slice(0, 10).map(log => `
                    <div class="log-entry">
                        <span class="log-time">${formatDate(log.timestamp)} ${log.timestamp ? log.timestamp.split('T')[1]?.split('.')[0] : ''}</span>
                        <span class="log-action">${escapeHtml(log.action)}</span>
                        <span style="color:var(--text-muted);">${escapeHtml(log.target)}</span>
                        <span style="color:var(--text-muted);font-size:11px;">by ${escapeHtml(log.userName)}</span>
                    </div>
                `).join('') || '<div style="color:var(--text-muted);font-size:13px;padding:10px 0;">暂无操作记录</div>'}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

// ---- 备份 ----
window.doBackup = async function() {
    try {
        const data = await DB.exportAllData();
        const json = JSON.stringify(data, null, 2);
        downloadBlob(new Blob([json], { type: 'application/json' }), `经侦备份_${today()}.eci`);

        await DB.addAuditLog({
            id: generateId(),
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || '系统',
            action: '一键备份',
            target: '全部数据',
            detail: `手动备份全部数据，共 ${data.cases.length} 个案件，${data.workRecords.length} 条记录`,
            timestamp: new Date().toISOString()
        });

        showToast('数据备份成功！', 'success');
    } catch (e) {
        showToast('备份失败：' + e.message, 'error');
    }
};

window.doBackupWithPassword = async function() {
    const password = prompt('请输入备份加密密码：');
    if (!password) return;
    try {
        const data = await DB.exportAllData();
        const encrypted = simpleEncrypt(data, password);
        downloadBlob(new Blob([encrypted], { type: 'application/octet-stream' }), `经侦备份_加密_${today()}.eci`);

        await DB.addAuditLog({
            id: generateId(),
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || '系统',
            action: '加密备份',
            target: '全部数据',
            detail: '带密码加密备份',
            timestamp: new Date().toISOString()
        });

        showToast('加密备份成功！请牢记密码！', 'success');
    } catch (e) {
        showToast('备份失败：' + e.message, 'error');
    }
};

// ---- 恢复 ----
window.doRestore = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmed = await showConfirm('确认恢复',
        '恢复数据将覆盖当前所有案件数据、工作记录和系统设置，此操作不可撤销！\n建议先备份当前数据。',
        'error');
    if (!confirmed) {
        event.target.value = '';
        return;
    }

    try {
        const text = await file.text();
        let data;

        // 尝试JSON解析
        try {
            data = JSON.parse(text);
        } catch {
            // 尝试解密
            const pwd = prompt('文件已加密，请输入解密密码：');
            if (!pwd) { event.target.value = ''; return; }
            data = simpleDecrypt(text, pwd);
            if (!data) { showToast('密码错误或文件损坏', 'error'); event.target.value = ''; return; }
        }

        await DB.importAllData(data);

        await DB.addAuditLog({
            id: generateId(),
            userId: currentUser?.id || 'system',
            userName: currentUser?.name || '系统',
            action: '数据恢复',
            target: '全部数据',
            detail: `从备份文件恢复数据：${data.cases?.length || 0} 个案件，${data.workRecords?.length || 0} 条记录`,
            timestamp: new Date().toISOString()
        });

        showToast('数据恢复成功！', 'success');
        event.target.value = '';
        navigateTo('dashboard');
    } catch (e) {
        showToast('恢复失败：' + e.message, 'error');
        event.target.value = '';
    }
};

// ---- 案件迁移 ----
window.exportCaseMigration = async function() {
    const select = document.getElementById('migrateCaseSelect');
    const caseId = select.value;

    let caseList, recordList;
    if (caseId === '__all') {
        const allCases = await DB.getAllCases(false);
        caseList = allCases;
        const allRecords = await DB.getAllWorkRecords();
        recordList = allRecords;
    } else {
        const c = await DB.getCase(caseId);
        caseList = [c];
        recordList = await DB.getWorkRecordsByCase(caseId);
    }

    const migration = {
        type: 'case_migration',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.name || '未知',
        cases: caseList,
        records: recordList
    };

    const json = JSON.stringify(migration, null, 2);
    downloadBlob(new Blob([json], { type: 'application/json' }), `案件迁移_${today()}.json`);
    showToast('案件数据已导出', 'success');
};

window.importCaseMigration = async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.type !== 'case_migration') {
            showToast('无效的案件迁移文件', 'error');
            event.target.value = '';
            return;
        }

        let imported = 0;
        for (const c of (data.cases || [])) {
            c.isArchived = false;
            c.id = generateId(); // 重新生成ID避免冲突
            await DB.saveCase({ ...c, _isNew: true });
            imported++;
        }
        for (const r of (data.records || [])) {
            r.id = generateId();
            await DB.saveWorkRecord(r);
        }

        showToast(`成功导入 ${imported} 个案件`, 'success');
        event.target.value = '';
        navigateTo('cases');
    } catch (e) {
        showToast('导入失败：' + e.message, 'error');
        event.target.value = '';
    }
};

// ---- 数据清理 ----
window.cleanOldLogs = async function() {
    const days = parseInt(document.getElementById('cleanDays').value) || 180;
    const confirmed = await showConfirm('确认清理',
        `将清理 ${days} 天前的审计日志（合规保留不少于半年），清理前将自动备份当前数据。`,
        'warning');
    if (!confirmed) return;

    try {
        // 先自动备份
        const data = await DB.exportAllData();
        const backupJson = JSON.stringify(data, null, 2);
        downloadBlob(new Blob([backupJson], { type: 'application/json' }), `清理前备份_${today()}.eci`);

        // 清理日志
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        await DB.clearAuditLogs(cutoffDate.toISOString());

        showToast(`已清理 ${days} 天前的审计日志，备份文件已保存`, 'success');
        navigateTo('data');
    } catch (e) {
        showToast('清理失败：' + e.message, 'error');
    }
};
