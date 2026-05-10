/**
 * 工作台（Dashboard）— 主面板
 * 展示案件列表、快捷统计、待办事项
 */

async function renderDashboard(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();

        // 按更新时间排序，最新的在前
        cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        // 统计信息
        const activeCases = cases.filter(c => c.status === '在办').length;
        const todayStr = today();
        const todayRecords = records.filter(r => r.recordDate === todayStr).length;
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekKey = weekStart.toISOString().split('T')[0];
        const weekRecords = records.filter(r => r.recordDate >= weekKey).length;

        // 收集待办事项
        const allTodos = [];
        for (const c of cases) {
            const caseRecords = records.filter(r => r.caseId === c.id);
            for (const r of caseRecords) {
                if (r.nextPlans && r.nextPlans.length > 0) {
                    for (let pi = 0; pi < r.nextPlans.length; pi++) {
                        const plan = r.nextPlans[pi];
                        if (!plan.completed) {
                            allTodos.push({
                                caseName: c.caseName,
                                caseId: c.id,
                                content: plan.content,
                                deadline: plan.deadline,
                                responsible: plan.responsible,
                                recordDate: r.recordDate
                            });
                        }
                    }
                }
            }
        }

        // 按紧急程度排序（超期的最前）
        allTodos.sort((a, b) => {
            const aOverdue = a.deadline && a.deadline < todayStr ? 0 : 1;
            const bOverdue = b.deadline && b.deadline < todayStr ? 0 : 1;
            if (aOverdue !== bOverdue) return aOverdue - bOverdue;
            return (a.deadline || '').localeCompare(b.deadline || '');
        });

        // 超期待办数
        const overdueTodos = allTodos.filter(t => t.deadline && t.deadline < todayStr);

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <div class="summary-grid">
                    <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                        <div class="summary-number">${cases.length}</div>
                        <div class="summary-label">在办案件总数</div>
                    </div>
                    <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                        <div class="summary-number">${activeCases}</div>
                        <div class="summary-label">活跃案件</div>
                    </div>
                    <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                        <div class="summary-number">${todayRecords}</div>
                        <div class="summary-label">今日记录</div>
                    </div>
                    <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                        <div class="summary-number">${weekRecords}</div>
                        <div class="summary-label">近7日记录</div>
                    </div>
                    <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                        <div class="summary-number" style="${overdueTodos.length > 0 ? 'color:var(--danger)' : ''}">${overdueTodos.length}</div>
                        <div class="summary-label">超期事项</div>
                    </div>
                </div>
            </div>

            <!-- 快捷操作 -->
            <div class="card" style="margin-bottom:16px;">
                <div class="card-header">
                    <h3>快捷操作</h3>
                </div>
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    <button class="btn btn-primary" onclick="navigateTo('cases')">&#10133; 新建案件</button>
                    <button class="btn btn-success" onclick="navigateTo('records')">&#128221; 快速记录工作</button>
                    <button class="btn btn-outline" onclick="navigateTo('reports')">&#128196; 生成报告</button>
                    <button class="btn btn-outline" onclick="navigateTo('data')">&#128427; 备份数据</button>
                </div>
            </div>

            <!-- 案件列表 -->
            <div class="card">
                <div class="card-header">
                    <h3>我的案件</h3>
                    <button class="btn btn-primary btn-sm" onclick="navigateTo('cases')">查看全部</button>
                </div>
                ${cases.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">&#128220;</div>
                        <h4>暂无案件</h4>
                        <p>点击上方"新建案件"开始创建</p>
                    </div>
                ` : `
                    <div class="case-grid">
                        ${cases.slice(0, 6).map(c => renderCaseCard(c, records)).join('')}
                    </div>
                    ${cases.length > 6 ? `<div style="text-align:center;margin-top:12px;"><span style="color:var(--text-muted);font-size:13px;">还有 ${cases.length - 6} 个案件，点击"查看全部"浏览</span></div>` : ''}
                `}
            </div>

            <!-- 待办事项 -->
            <div class="card">
                <div class="card-header">
                    <h3>待办事项 ${allTodos.length > 0 ? `<span class="tag tag-danger">${allTodos.length}</span>` : ''}</h3>
                </div>
                ${allTodos.length === 0 ? `
                    <div class="empty-state" style="padding:30px 20px;">
                        <div class="empty-icon">&#9989;</div>
                        <h4>暂无待办事项</h4>
                        <p>所有计划工作已按时完成</p>
                    </div>
                ` : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:50px">状态</th>
                                <th>待办内容</th>
                                <th style="width:150px">关联案件</th>
                                <th style="width:100px">完成时限</th>
                                <th style="width:80px">责任人</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${allTodos.slice(0, 10).map(t => {
                                const isOverdue = t.deadline && t.deadline < todayStr;
                                return `
                                    <tr>
                                        <td>${isOverdue ? '<span class="tag tag-danger">超期</span>' : '<span class="tag tag-warning">待办</span>'}</td>
                                        <td style="color:var(--text-primary);font-weight:500;">${escapeHtml(t.content)}</td>
                                        <td>
                                            <a href="javascript:navigateTo('cases')" style="color:var(--primary);text-decoration:none;"
                                                onclick="showCaseDetail('${t.caseId}')">${escapeHtml(t.caseName)}</a>
                                        </td>
                                        <td style="${isOverdue ? 'color:var(--danger);font-weight:600;' : ''}">${t.deadline || '未设置'}</td>
                                        <td>${t.responsible || '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                    ${allTodos.length > 10 ? `<div style="margin-top:8px;text-align:center;"><span style="color:var(--text-muted);font-size:12px;">还有 ${allTodos.length - 10} 项待办...</span></div>` : ''}
                `}
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

function renderCaseCard(c, records) {
    const caseRecords = records.filter(r => r.caseId === c.id);
    const lastRecord = caseRecords.length > 0 ? caseRecords[0] : null;
    const markerLabel = c.marker === '重点' ? 'marker-key' : c.marker === '督办' ? 'marker-supervise' : 'marker-normal';
    const markerText = c.marker === '重点' ? '重点' : c.marker === '督办' ? '督办' : '常规';

    const statusMap = {
        '在办': 'tag-primary', '提捕': 'tag-warning', '移诉': 'tag-warning',
        '中止': 'tag-disabled', '已结': 'tag-success', '撤销': 'tag-disabled'
    };

    return `
        <div class="case-card" onclick="showCaseDetail('${c.id}')">
            <div class="case-title">
                <span>${escapeHtml(c.caseName)}</span>
                <span class="marker-badge ${markerLabel}">${markerText}</span>
            </div>
            <div class="case-meta">
                <span>编号：${escapeHtml(c.caseNumber || '-')}</span>
                <span>类型：${escapeHtml(c.caseType || '-')}</span>
                <span>涉案金额：${formatMoney(c.involvedAmount)}元</span>
            </div>
            <div style="margin:8px 0;">
                <span class="tag ${statusMap[c.status] || 'tag-primary'}">${c.status || '在办'}</span>
                <span style="margin-left:8px;font-size:12px;color:var(--text-secondary);">
                    进度：${getPhaseName(c.phase || 0)}
                </span>
                <span style="float:right;font-size:11px;color:var(--text-muted);">
                    ${lastRecord ? '最近记录：' + formatShortDate(lastRecord.recordDate) : '暂无记录'}
                </span>
            </div>
            <div class="case-footer">
                <span style="font-size:11px;color:var(--text-muted);">
                    主办：${escapeHtml(c.leadOfficer || '-')}
                </span>
                <span style="font-size:11px;color:var(--text-muted);">
                    记录：${caseRecords.length}条
                </span>
            </div>
        </div>
    `;
}

function getPhaseName(phase) {
    const phases = ['立案初查', '侦查取证', '讯问突破', '强制措施', '资产处置', '移送起诉', '结案归档'];
    return phases[phase] || '立案初查';
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.showCaseDetail = async function(caseId) {
    const c = await DB.getCase(caseId);
    if (!c) { showToast('案件不存在', 'error'); return; }

    const records = await DB.getWorkRecordsByCase(caseId);
    const recordCount = records.length;
    const totalEvidence = records.reduce((sum, r) => sum + (r.evidenceCount || 0), 0);
    const totalWitnessStmts = records.reduce((sum, r) => sum + (r.witnessStatementCount || 0), 0);
    const totalSuspectStmts = records.reduce((sum, r) => sum + (r.suspectStatementCount || 0), 0);

    const overlay = openModal(`
        <div style="margin-bottom:16px;">
            <table class="data-table">
                <tr><th style="width:120px;background:var(--bg-main);color:var(--text-primary);">案件名称</th><td><strong>${escapeHtml(c.caseName)}</strong></td>
                    <th style="width:120px;background:var(--bg-main);color:var(--text-primary);">立案编号</th><td>${escapeHtml(c.caseNumber) || '-'}</td></tr>
                <tr><th style="background:var(--bg-main);color:var(--text-primary);">案件类型</th><td>${escapeHtml(c.caseType) || '-'}</td>
                    <th style="background:var(--bg-main);color:var(--text-primary);">立案日期</th><td>${formatDate(c.filingDate)}</td></tr>
                <tr><th style="background:var(--bg-main);color:var(--text-primary);">主办民警</th><td>${escapeHtml(c.leadOfficer) || '-'}</td>
                    <th style="background:var(--bg-main);color:var(--text-primary);">协办民警</th><td>${escapeHtml(c.assistantOfficer) || '-'}</td></tr>
                <tr><th style="background:var(--bg-main);color:var(--text-primary);">涉案金额</th><td>${formatMoney(c.involvedAmount)}元</td>
                    <th style="background:var(--bg-main);color:var(--text-primary);">案件状态</th><td><span class="tag tag-primary">${c.status || '在办'}</span></td></tr>
            </table>
        </div>
        <div class="summary-grid" style="margin-bottom:16px;">
            <div class="summary-item" style="background:var(--bg-main);border-radius:var(--radius);">
                <div class="summary-number">${recordCount}</div>
                <div class="summary-label">工作记录</div>
            </div>
            <div class="summary-item" style="background:var(--bg-main);border-radius:var(--radius);">
                <div class="summary-number">${totalEvidence}</div>
                <div class="summary-label">证据调取</div>
            </div>
            <div class="summary-item" style="background:var(--bg-main);border-radius:var(--radius);">
                <div class="summary-number">${totalWitnessStmts}</div>
                <div class="summary-label">询问笔录</div>
            </div>
            <div class="summary-item" style="background:var(--bg-main);border-radius:var(--radius);">
                <div class="summary-number">${totalSuspectStmts}</div>
                <div class="summary-label">讯问笔录</div>
            </div>
        </div>
        <div style="margin-bottom:16px;">
            <h4 style="font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text-primary);">简要案情</h4>
            <p style="font-size:13px;color:var(--text-secondary);">${escapeHtml(c.summary) || '未填写'}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="editCase('${c.id}')">&#9998; 编辑案件</button>
            <button class="btn btn-success btn-sm" onclick="navigateTo('records');closeModal(this.closest('.modal-overlay'))">&#128221; 添加记录</button>
            <button class="btn btn-outline btn-sm" onclick="navigateTo('reports');closeModal(this.closest('.modal-overlay'));setTimeout(()=>generateCaseReport('${c.id}'),100)">&#128196; 生成报告</button>
        </div>
    `, 'modal-lg');
    overlay.querySelector('#modalTitle').textContent = '案件详情';
};

window.editCase = async function(caseId) {
    const c = await DB.getCase(caseId);
    if (!c) return;

    const favCrimes = getFavoriteCrimes();
    const allCrimes = getAllCrimes();

    // 构建案件类型选择
    let crimeOptions = '';
    // 常用案件
    if (favCrimes.length > 0) {
        crimeOptions += `<optgroup label="☆ 常用案件">`;
        favCrimes.forEach(fav => {
            const selected = c.caseType === fav ? 'selected' : '';
            crimeOptions += `<option value="${fav}" ${selected}>${fav}</option>`;
        });
        crimeOptions += `</optgroup>`;
    }
    // 全部案件
    crimeOptions += `<optgroup label="全部案件类型">`;
    CRIME_CATEGORIES.forEach(cat => {
        cat.subs.forEach(sub => {
            sub.crimes.forEach(crime => {
                const fullName = crime.name;
                const val = `${cat.name} > ${sub.name} > ${crime.name}`;
                const selected = c.caseType === fullName || c.caseType === val ? 'selected' : '';
                crimeOptions += `<option value="${fullName}" ${selected}>${fullName}（${crime.article}）</option>`;
            });
        });
    });
    crimeOptions += `</optgroup>`;

    const overlay = openModal(`
        <form id="editCaseForm" onsubmit="saveEditCase(event, '${c.id}')">
            <div class="form-row">
                <div class="form-group">
                    <label>案件名称 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="caseName" value="${escapeHtml(c.caseName || '')}" required>
                </div>
                <div class="form-group">
                    <label>立案编号 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="caseNumber" value="${escapeHtml(c.caseNumber || '')}" required>
                </div>
            </div>
            <div class="form-group">
                <label>案件类型 <span class="required">*</span></label>
                <select class="form-control" name="caseType">
                    <option value="">-- 请选择案件类型 --</option>
                    ${crimeOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>立案日期 <span class="required">*</span></label>
                    <input type="date" class="form-control" name="filingDate" value="${c.filingDate || ''}" required>
                </div>
                <div class="form-group">
                    <label>涉案金额（元）</label>
                    <input type="number" class="form-control" name="involvedAmount" value="${c.involvedAmount || ''}" step="0.01">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>主办民警</label>
                    <input type="text" class="form-control" name="leadOfficer" value="${escapeHtml(c.leadOfficer || '')}">
                </div>
                <div class="form-group">
                    <label>协办民警</label>
                    <input type="text" class="form-control" name="assistantOfficer" value="${escapeHtml(c.assistantOfficer || '')}">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>案件状态</label>
                    <select class="form-control" name="status">
                        <option value="在办" ${c.status === '在办' ? 'selected' : ''}>在办</option>
                        <option value="提捕" ${c.status === '提捕' ? 'selected' : ''}>提捕</option>
                        <option value="移诉" ${c.status === '移诉' ? 'selected' : ''}>移诉</option>
                        <option value="中止" ${c.status === '中止' ? 'selected' : ''}>中止</option>
                        <option value="已结" ${c.status === '已结' ? 'selected' : ''}>已结</option>
                        <option value="撤销" ${c.status === '撤销' ? 'selected' : ''}>撤销</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>案件标记</label>
                    <select class="form-control" name="marker">
                        <option value="常规" ${c.marker === '常规' || !c.marker ? 'selected' : ''}>常规案件</option>
                        <option value="重点" ${c.marker === '重点' ? 'selected' : ''}>重点案件</option>
                        <option value="督办" ${c.marker === '督办' ? 'selected' : ''}>督办案件</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>简要案情</label>
                <textarea class="form-control" name="summary" rows="4">${escapeHtml(c.summary || '')}</textarea>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">保存修改</button>
            </div>
        </form>
    `, 'modal-lg');
    overlay.querySelector('#modalTitle').textContent = '编辑案件';
};

window.saveEditCase = async function(e, caseId) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const caseData = {
        _isNew: false,
        id: caseId,
        ...Object.fromEntries(data)
    };
    caseData.involvedAmount = parseFloat(caseData.involvedAmount) || 0;
    const existing = await DB.getCase(caseId);
    caseData.phase = existing.phase || 0;
    caseData.isArchived = existing.isArchived || false;
    caseData.createdAt = existing.createdAt;

    await DB.saveCase(caseData);
    showToast('案件修改成功！', 'success');
    closeModal(form.closest('.modal-overlay'));
    navigateTo('cases');
};
