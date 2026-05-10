/**
 * 工作记录 — 标准化填报、记录详情展示、复制昨日
 */

let workLogFilter = { caseId: '', date: '' };

async function renderWorkLog(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();
        const caseMap = {};
        cases.forEach(c => caseMap[c.id] = c.caseName);

        let filtered = [...records];
        if (workLogFilter.caseId) filtered = filtered.filter(r => r.caseId === workLogFilter.caseId);
        if (workLogFilter.date) filtered = filtered.filter(r => r.recordDate === workLogFilter.date);

        document.getElementById('contentActions').innerHTML = `
            <div class="quick-actions">
                <button class="btn btn-success" onclick="showNewRecordForm()">&#128221; 新建记录</button>
                <button class="btn btn-outline" onclick="copyFromYesterday()" style="font-size:11px;">复制昨日记录</button>
            </div>
        `;

        container.innerHTML = `
            <div class="card" style="padding:10px 14px;margin-bottom:12px;">
                <div class="filter-bar">
                    <select onchange="workLogFilter.caseId=this.value;renderWorkLog(document.getElementById('contentBody'))">
                        <option value="">全部案件</option>
                        ${cases.map(c => `<option value="${c.id}" ${workLogFilter.caseId === c.id ? 'selected' : ''}>${escapeHtml(c.caseName)}</option>`).join('')}
                    </select>
                    <input type="date" class="form-control" style="width:150px;" value="${workLogFilter.date}"
                        onchange="workLogFilter.date=this.value;renderWorkLog(document.getElementById('contentBody'))">
                    ${workLogFilter.caseId || workLogFilter.date ? `
                        <button class="btn btn-outline btn-sm" onclick="workLogFilter={caseId:'',date:''};renderWorkLog(document.getElementById('contentBody'))">清除筛选</button>
                    ` : ''}
                    <span style="font-size:11px;color:var(--text-muted);margin-left:auto;">共 ${filtered.length} 条记录</span>
                </div>
            </div>

            ${filtered.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">&#128203;</div>
                    <h4>暂无工作记录</h4>
                    <p>选择案件后点击"新建记录"开始填报</p>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:10px;">
                    ${filtered.map(r => renderRecordCard(r, caseMap)).join('')}
                </div>
            `}
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

function renderRecordCard(r, caseMap) {
    const compMap = { '已完成': 'tag-success', '部分完成': 'tag-warning', '未启动': 'tag-danger' };

    // 构建工作摘要信息
    const workSummary = [];
    if (r.evidenceTypes && r.evidenceTypes.length > 0) {
        workSummary.push(`<span title="证据调取">&#128230; 证据：${r.evidenceTypes.join('、')}${r.evidenceCount ? '(' + r.evidenceCount + '份)' : ''}</span>`);
    }
    if (r.witnessCount) {
        workSummary.push(`<span title="证人询问">&#128101; 询问证人${r.witnessCount}人，笔录${r.witnessStatementCount || 0}份</span>`);
    }
    if (r.suspectInterrogationCount) {
        workSummary.push(`<span title="嫌疑人讯问">&#128100; 讯问${r.suspectInterrogationCount}次，笔录${r.suspectStatementCount || 0}份</span>`);
    }
    if (r.coerciveMeasures && r.coerciveMeasures.length > 0) {
        workSummary.push(`<span title="强制措施">&#128276; ${r.coerciveMeasures.join('、')}</span>`);
    }
    if (r.assetFrozen || r.assetSeized || r.assetConfiscated) {
        workSummary.push(`<span title="资产查控">&#128176; 冻结${formatMoney(r.assetFrozen)}元</span>`);
    }
    if (r.collaborationDetail) {
        workSummary.push(`<span title="协作办案">&#129309; 协作办案</span>`);
    }
    if (r.otherWork) {
        workSummary.push(`<span title="其他工作">&#128221; 其他工作</span>`);
    }

    const plans = (r.nextPlans || []).filter(p => !p.completed);
    const plansText = plans.map(p => p.content).join('；');

    return `
        <div class="card" style="padding:12px 14px;cursor:pointer;" onclick="showEditRecord('${r.id}')">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;">
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
                        <span style="font-size:14px;font-weight:600;color:var(--text-primary);">${r.recordDate || '-'}</span>
                        <span class="tag tag-primary" style="font-size:10px;">${r.recordType || '日常进度'}</span>
                        <span class="tag ${compMap[r.completionStatus] || 'tag-primary'}" style="font-size:10px;">${r.completionStatus || '-'}</span>
                        <span style="font-size:11px;color:var(--text-muted);">${r.policeName || '-'}</span>
                    </div>
                    <div style="font-size:12px;color:var(--primary);font-weight:500;margin-bottom:4px;">
                        ${caseMap[r.caseId] || '未知案件'}
                    </div>
                    ${r.achievements ? `<div style="font-size:12px;color:var(--text-primary);margin-bottom:4px;">&#128200; ${escapeHtml(r.achievements)}</div>` : ''}
                    <div style="font-size:11px;color:var(--text-secondary);display:flex;flex-wrap:wrap;gap:6px 12px;">
                        ${workSummary.join('') || '<span style="color:var(--text-muted);">暂无详细工作内容</span>'}
                    </div>
                    ${plansText ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:11px;color:var(--text-muted);">
                        &#128203; 下步计划：${escapeHtml(plansText)}
                    </div>` : ''}
                </div>
                <div style="display:flex;gap:3px;flex-shrink:0;margin-left:10px;">
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showEditRecord('${r.id}')">详情</button>
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteRecordConfirm('${r.id}')">删除</button>
                </div>
            </div>
        </div>
    `;
}

window.showNewRecordForm = async function(copyCaseId, copyDate) {
    const cases = await DB.getAllCases(false);
    if (cases.length === 0) { showToast('请先创建案件', 'warning'); return; }

    const defaultCaseId = workLogFilter.caseId || cases[0].id;
    const defaultRecord = {
        recordDate: today(), recordType: '日常进度',
        policeName: currentUser ? currentUser.name : '',
        policeBadge: currentUser ? currentUser.badge : '',
        evidenceTypes: [], evidenceDetail: '', evidenceCount: 0,
        witnessName: '', witnessCount: 0, witnessStatementCount: 0, witnessContent: '', witnessFixed: false, witnessNote: '',
        suspectName: '', suspectInterrogationCount: 0, suspectStatementCount: 0, suspectBreakthrough: '', suspectNewClues: '',
        coerciveMeasures: [], coerciveDocNumbers: '',
        assetFrozen: 0, assetSeized: 0, assetConfiscated: 0, assetExecution: '',
        collaborationDetail: '', otherWork: '',
        completionStatus: '已完成', completionDetail: '', achievements: '',
        nextPlans: [], caseId: defaultCaseId
    };

    let copyData = null;
    if (copyCaseId && copyDate) {
        copyData = await DB.getLastRecordByDate(copyCaseId, copyDate);
    }

    const record = copyData || defaultRecord;
    const caseOptions = cases.map(c => `<option value="${c.id}" ${c.id === record.caseId ? 'selected' : ''}>${escapeHtml(c.caseName)}</option>`).join('');

    const evidenceOpts = ['银行流水', '工商信息', '税务票据', '资产查控', '电子数据取证'];
    const coerciveOpts = ['取保候审', '监视居住', '拘留', '逮捕', '变更/解除强制措施'];

    const evidenceChecks = evidenceOpts.map(opt =>
        `<label class="checkbox-item"><input type="checkbox" name="evidenceTypes" value="${opt}" ${(record.evidenceTypes || []).includes(opt) ? 'checked' : ''}>${opt}</label>`
    ).join('');

    const coerciveChecks = coerciveOpts.map(opt =>
        `<label class="checkbox-item"><input type="checkbox" name="coerciveMeasures" value="${opt}" ${(record.coerciveMeasures || []).includes(opt) ? 'checked' : ''}>${opt}</label>`
    ).join('');

    let plansHTML = '';
    if (record.nextPlans && record.nextPlans.length > 0) {
        plansHTML = record.nextPlans.map((p, i) => `
            <div class="plan-item" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                <input type="text" class="form-control" name="planContent${i}" value="${escapeHtml(p.content || '')}" placeholder="计划内容" style="flex:2;">
                <input type="date" class="form-control" name="planDeadline${i}" value="${p.deadline || ''}" style="flex:1;">
                <input type="text" class="form-control" name="planResp${i}" value="${escapeHtml(p.responsible || '')}" placeholder="责任人" style="flex:1;">
                <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.plan-item').remove()">X</button>
            </div>
        `).join('');
    }

    const overlay = openModal(`
        <form id="newRecordForm" onsubmit="saveNewRecord(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>记录日期 <span class="required">*</span></label>
                    <input type="date" class="form-control" name="recordDate" value="${record.recordDate}" required>
                </div>
                <div class="form-group">
                    <label>关联案件 <span class="required">*</span></label>
                    <select class="form-control" name="caseId" required>${caseOptions}</select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>记录类型</label>
                    <select class="form-control" name="recordType">
                        <option value="日常进度" ${record.recordType === '日常进度' ? 'selected' : ''}>日常进度</option>
                        <option value="专项工作" ${record.recordType === '专项工作' ? 'selected' : ''}>专项工作</option>
                        <option value="紧急事项" ${record.recordType === '紧急事项' ? 'selected' : ''}>紧急事项</option>
                        <option value="会议部署" ${record.recordType === '会议部署' ? 'selected' : ''}>会议部署</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>填报人</label>
                    <input type="text" class="form-control" name="policeName" value="${record.policeName || currentUser?.name || ''}">
                </div>
            </div>

            <div style="border-top:1px solid var(--border);margin:14px 0;"></div>

            <!-- 开展工作 -->
            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--primary);">一、开展工作</h4>

            <!-- 1. 证据调取 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">1. 证据调取</h5>
                <div class="form-group">
                    <label style="font-size:11px;">调取类型（可多选）</label>
                    <div class="checkbox-group">${evidenceChecks}</div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">具体内容</label>
                        <input type="text" class="form-control" name="evidenceDetail" value="${escapeHtml(record.evidenceDetail || '')}" placeholder="如：调取XX银行涉案账户流水">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">份数</label>
                        <input type="number" class="form-control" name="evidenceCount" value="${record.evidenceCount || 0}" min="0">
                    </div>
                </div>
            </div>

            <!-- 2. 证人询问 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">2. 证人询问</h5>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">被询问人</label>
                        <input type="text" class="form-control" name="witnessName" value="${escapeHtml(record.witnessName || '')}">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">人数</label>
                        <input type="number" class="form-control" name="witnessCount" value="${record.witnessCount || 0}" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">笔录份数</label>
                        <input type="number" class="form-control" name="witnessStatementCount" value="${record.witnessStatementCount || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">证据固定</label>
                        <label class="checkbox-item" style="margin-top:6px;">
                            <input type="checkbox" name="witnessFixed" ${record.witnessFixed ? 'checked' : ''}>已完成固定
                        </label>
                    </div>
                </div>
                <div class="form-group">
                    <label style="font-size:11px;">取证内容</label>
                    <textarea class="form-control" name="witnessContent" rows="2">${escapeHtml(record.witnessContent || '')}</textarea>
                </div>
            </div>

            <!-- 3. 嫌疑人讯问 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">3. 嫌疑人讯问</h5>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">讯问对象</label>
                        <input type="text" class="form-control" name="suspectName" value="${escapeHtml(record.suspectName || '')}">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">讯问次数</label>
                        <input type="number" class="form-control" name="suspectInterrogationCount" value="${record.suspectInterrogationCount || 0}" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">笔录份数</label>
                        <input type="number" class="form-control" name="suspectStatementCount" value="${record.suspectStatementCount || 0}" min="0">
                    </div>
                </div>
                <div class="form-group">
                    <label style="font-size:11px;">供述突破</label>
                    <textarea class="form-control" name="suspectBreakthrough" rows="2">${escapeHtml(record.suspectBreakthrough || '')}</textarea>
                </div>
                <div class="form-group">
                    <label style="font-size:11px;">新增线索</label>
                    <textarea class="form-control" name="suspectNewClues" rows="2">${escapeHtml(record.suspectNewClues || '')}</textarea>
                </div>
            </div>

            <!-- 4. 强制措施 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">4. 强制措施</h5>
                <div class="form-group">
                    <label style="font-size:11px;">措施类型（可多选）</label>
                    <div class="checkbox-group">${coerciveChecks}</div>
                </div>
                <div class="form-group">
                    <label style="font-size:11px;">法律文书编号</label>
                    <input type="text" class="form-control" name="coerciveDocNumbers" value="${escapeHtml(record.coerciveDocNumbers || '')}" placeholder="如：公经拘字[2026]001号">
                </div>
            </div>

            <!-- 5. 资产查控 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">5. 资产查控</h5>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">冻结金额（元）</label>
                        <input type="number" class="form-control" name="assetFrozen" value="${record.assetFrozen || 0}" step="0.01">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">查封数量</label>
                        <input type="number" class="form-control" name="assetSeized" value="${record.assetSeized || 0}" min="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label style="font-size:11px;">扣押数量</label>
                        <input type="number" class="form-control" name="assetConfiscated" value="${record.assetConfiscated || 0}" min="0">
                    </div>
                    <div class="form-group">
                        <label style="font-size:11px;">执行情况</label>
                        <input type="text" class="form-control" name="assetExecution" value="${escapeHtml(record.assetExecution || '')}">
                    </div>
                </div>
            </div>

            <!-- 6. 协作办案 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">6. 协作办案</h5>
                <textarea class="form-control" name="collaborationDetail" rows="2" placeholder="异地协作、跨部门协作、线索移送、会商研判">${escapeHtml(record.collaborationDetail || '')}</textarea>
            </div>

            <!-- 7. 其他工作 -->
            <div class="card" style="padding:12px;margin-bottom:10px;">
                <h5 style="font-size:13px;font-weight:600;margin-bottom:6px;color:var(--text-primary);">7. 其他工作</h5>
                <textarea class="form-control" name="otherWork" rows="2" placeholder="案卷整理、法律文书制作、汇报材料等">${escapeHtml(record.otherWork || '')}</textarea>
            </div>

            <div style="border-top:1px solid var(--border);margin:14px 0;"></div>

            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--primary);">二、工作成果与完成情况</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>完成状态</label>
                    <select class="form-control" name="completionStatus">
                        <option value="已完成" ${record.completionStatus === '已完成' ? 'selected' : ''}>已完成</option>
                        <option value="部分完成" ${record.completionStatus === '部分完成' ? 'selected' : ''}>部分完成</option>
                        <option value="未启动" ${record.completionStatus === '未启动' ? 'selected' : ''}>未启动</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>成果量化</label>
                <input type="text" class="form-control" name="achievements" value="${escapeHtml(record.achievements || '')}" placeholder="如：完成5份流水调取，梳理资金流向1份">
            </div>
            <div class="form-group">
                <label>详细总结</label>
                <textarea class="form-control" name="completionDetail" rows="2">${escapeHtml(record.completionDetail || '')}</textarea>
            </div>

            <div style="border-top:1px solid var(--border);margin:14px 0;"></div>

            <h4 style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--primary);">三、下步工作计划</h4>
            <div id="plansContainer">
                ${plansHTML || `
                <div class="plan-item" style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
                    <input type="text" class="form-control" name="planContent0" placeholder="计划内容" style="flex:2;">
                    <input type="date" class="form-control" name="planDeadline0" style="flex:1;">
                    <input type="text" class="form-control" name="planResp0" placeholder="责任人" style="flex:1;">
                </div>`}
            </div>
            <button type="button" class="btn btn-outline btn-sm" onclick="addPlanItem()" style="margin-bottom:12px;">+ 添加一条计划</button>

            <div class="form-group" style="margin-bottom:0;">
                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">保存记录</button>
            </div>
        </form>
    `, 'modal-lg');
    overlay.querySelector('#modalTitle').textContent = '新建工作记录';
};

window.addPlanItem = function() {
    const container = document.getElementById('plansContainer');
    const idx = container.children.length;
    const div = document.createElement('div');
    div.className = 'plan-item';
    div.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;';
    div.innerHTML = `
        <input type="text" class="form-control" name="planContent${idx}" placeholder="计划内容" style="flex:2;">
        <input type="date" class="form-control" name="planDeadline${idx}" style="flex:1;">
        <input type="text" class="form-control" name="planResp${idx}" placeholder="责任人" style="flex:1;">
        <button type="button" class="btn btn-danger btn-sm" onclick="this.closest('.plan-item').remove()">X</button>
    `;
    container.appendChild(div);
};

window.copyFromYesterday = async function() {
    const cases = await DB.getAllCases(false);
    if (cases.length === 0) { showToast('请先创建案件', 'warning'); return; }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const caseId = workLogFilter.caseId || cases[0].id;
    showNewRecordForm(caseId, yesterdayStr);
};

window.saveNewRecord = async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);

    const evidenceTypes = [];
    const coerciveMeasures = [];
    form.querySelectorAll('input[name="evidenceTypes"]:checked').forEach(cb => evidenceTypes.push(cb.value));
    form.querySelectorAll('input[name="coerciveMeasures"]:checked').forEach(cb => coerciveMeasures.push(cb.value));

    const nextPlans = [];
    let planIdx = 0;
    while (form.querySelector(`input[name="planContent${planIdx}"]`)) {
        const content = form.querySelector(`input[name="planContent${planIdx}"]`).value.trim();
        const deadline = form.querySelector(`input[name="planDeadline${planIdx}"]`).value;
        const responsible = form.querySelector(`input[name="planResp${planIdx}"]`).value.trim();
        if (content) nextPlans.push({ content, deadline, responsible, completed: false });
        planIdx++;
    }

    const recordData = {
        id: generateId(),
        recordDate: data.get('recordDate'),
        caseId: data.get('caseId'),
        recordType: data.get('recordType'),
        policeName: data.get('policeName') || currentUser?.name || '',
        policeBadge: currentUser?.badge || '',
        evidenceTypes, evidenceDetail: data.get('evidenceDetail') || '', evidenceCount: parseInt(data.get('evidenceCount')) || 0,
        witnessName: data.get('witnessName') || '', witnessCount: parseInt(data.get('witnessCount')) || 0,
        witnessStatementCount: parseInt(data.get('witnessStatementCount')) || 0,
        witnessContent: data.get('witnessContent') || '', witnessFixed: !!form.querySelector('input[name="witnessFixed"]:checked'), witnessNote: '',
        suspectName: data.get('suspectName') || '', suspectInterrogationCount: parseInt(data.get('suspectInterrogationCount')) || 0,
        suspectStatementCount: parseInt(data.get('suspectStatementCount')) || 0,
        suspectBreakthrough: data.get('suspectBreakthrough') || '', suspectNewClues: data.get('suspectNewClues') || '',
        coerciveMeasures, coerciveDocNumbers: data.get('coerciveDocNumbers') || '',
        assetFrozen: parseFloat(data.get('assetFrozen')) || 0, assetSeized: parseInt(data.get('assetSeized')) || 0,
        assetConfiscated: parseInt(data.get('assetConfiscated')) || 0, assetExecution: data.get('assetExecution') || '',
        collaborationDetail: data.get('collaborationDetail') || '', otherWork: data.get('otherWork') || '',
        completionStatus: data.get('completionStatus') || '已完成', completionDetail: data.get('completionDetail') || '',
        achievements: data.get('achievements') || '', nextPlans
    };

    await DB.saveWorkRecord(recordData);
    await DB.addAuditLog({
        id: generateId(), userId: currentUser?.id || 'system', userName: currentUser?.name || '系统',
        action: '新建工作记录', target: recordData.recordDate, detail: `新建 ${recordData.recordDate} 工作记录`,
        timestamp: new Date().toISOString()
    });

    showToast('工作记录保存成功！', 'success');
    closeModal(form.closest('.modal-overlay'));
    navigateTo('records');
};

window.showEditRecord = async function(recordId) {
    const r = await DB.getWorkRecord(recordId);
    if (!r) { showToast('记录不存在', 'error'); return; }
    const caseName = (await DB.getCase(r.caseId))?.caseName || '未知案件';

    const evidenceText = (r.evidenceTypes || []).join('、') || '无';
    const coerciveText = (r.coerciveMeasures || []).join('、') || '无';
    const plansText = (r.nextPlans || []).map(p =>
        `${p.content}${p.deadline ? '（截止：'+p.deadline+'）' : ''}${p.responsible ? '【'+p.responsible+'】' : ''}`
    ).join('\n') || '无';

    const overlay = openModal(`
        <div style="font-size:13px;">
            <div style="display:flex;gap:14px;margin-bottom:14px;flex-wrap:wrap;">
                <span><strong>记录日期：</strong>${r.recordDate}</span>
                <span><strong>关联案件：</strong>${escapeHtml(caseName)}</span>
                <span><strong>类型：</strong>${r.recordType}</span>
                <span><strong>状态：</strong><span class="tag ${r.completionStatus === '已完成' ? 'tag-success' : r.completionStatus === '部分完成' ? 'tag-warning' : 'tag-danger'}">${r.completionStatus}</span></span>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">证据调取</h5>
                <p style="color:var(--text-secondary);font-size:12px;">类型：${evidenceText} | 份数：${r.evidenceCount || 0}</p>
                ${r.evidenceDetail ? '<p style="color:var(--text-secondary);font-size:12px;">内容：'+escapeHtml(r.evidenceDetail)+'</p>' : ''}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">证人询问</h5>
                <p style="color:var(--text-secondary);font-size:12px;">被询问人：${r.witnessName || '-'} | 人数：${r.witnessCount || 0} | 笔录：${r.witnessStatementCount || 0}份</p>
                ${r.witnessContent ? '<p style="color:var(--text-secondary);font-size:12px;">内容：'+escapeHtml(r.witnessContent)+'</p>' : ''}
                <p style="color:var(--text-secondary);font-size:12px;">证据固定：${r.witnessFixed ? '已完成' : '未完成'}</p>
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">嫌疑人讯问</h5>
                <p style="color:var(--text-secondary);font-size:12px;">对象：${r.suspectName || '-'} | 讯问：${r.suspectInterrogationCount || 0}次 | 笔录：${r.suspectStatementCount || 0}份</p>
                ${r.suspectBreakthrough ? '<p style="color:var(--text-secondary);font-size:12px;">供述：'+escapeHtml(r.suspectBreakthrough)+'</p>' : ''}
                ${r.suspectNewClues ? '<p style="color:var(--text-secondary);font-size:12px;">线索：'+escapeHtml(r.suspectNewClues)+'</p>' : ''}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">强制措施</h5>
                <p style="color:var(--text-secondary);font-size:12px;">措施：${coerciveText}</p>
                ${r.coerciveDocNumbers ? '<p style="color:var(--text-secondary);font-size:12px;">文书编号：'+escapeHtml(r.coerciveDocNumbers)+'</p>' : ''}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">资产查控</h5>
                <p style="color:var(--text-secondary);font-size:12px;">冻结：${formatMoney(r.assetFrozen)}元 | 查封：${r.assetSeized || 0}件 | 扣押：${r.assetConfiscated || 0}件</p>
                ${r.assetExecution ? '<p style="color:var(--text-secondary);font-size:12px;">执行：'+escapeHtml(r.assetExecution)+'</p>' : ''}
            </div>

            ${r.collaborationDetail ? '<div style="border-top:1px solid var(--border);padding-top:10px;"><h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">协作办案</h5><p style="color:var(--text-secondary);font-size:12px;">'+escapeHtml(r.collaborationDetail)+'</p></div>' : ''}
            ${r.otherWork ? '<div style="border-top:1px solid var(--border);padding-top:10px;"><h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">其他工作</h5><p style="color:var(--text-secondary);font-size:12px;">'+escapeHtml(r.otherWork)+'</p></div>' : ''}

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">工作成果</h5>
                <p style="color:var(--text-secondary);font-size:12px;">${escapeHtml(r.achievements) || '未填写'}</p>
                ${r.completionDetail ? '<p style="color:var(--text-secondary);font-size:12px;">总结：'+escapeHtml(r.completionDetail)+'</p>' : ''}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:10px;">
                <h5 style="font-size:13px;font-weight:600;color:var(--primary);margin-bottom:6px;">下步计划</h5>
                <pre style="font-size:12px;color:var(--text-secondary);white-space:pre-wrap;font-family:inherit;">${escapeHtml(plansText)}</pre>
            </div>

            <div style="margin-top:12px;display:flex;gap:6px;">
                <button class="btn btn-outline" onclick="copyRecordToNew('${r.id}')">复制为今日记录</button>
            </div>
        </div>
    `, 'modal-lg');
    overlay.querySelector('#modalTitle').textContent = '工作记录详情';
};

window.copyRecordToNew = async function(recordId) {
    const r = await DB.getWorkRecord(recordId);
    if (!r) return;
    closeModal(document.querySelector('.modal-overlay.show'));
    showNewRecordForm(r.caseId, r.recordDate);
};

window.deleteRecordConfirm = async function(id) {
    const confirmed = await showConfirm('确认删除', '删除后将无法恢复此工作记录，是否继续？', 'warning');
    if (!confirmed) return;
    await DB.deleteWorkRecord(id);
    showToast('记录已删除', 'success');
    navigateTo('records');
};
