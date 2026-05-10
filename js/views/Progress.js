/**
 * 案件进度 — 自动进度条、统计面板、逾期预警
 */

const PHASE_NAMES = ['立案初查', '侦查取证', '讯问突破', '强制措施', '资产处置', '移送起诉', '结案归档'];

async function renderProgress(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();
        const todayStr = today();
        document.getElementById('contentActions').innerHTML = '';

        // 自动更新进度
        for (const c of cases) {
            const newPhase = autoCalcProgress(c, records);
            if (newPhase !== (c.phase || 0)) {
                c.phase = newPhase;
                await DB.saveCase(c);
            }
        }

        container.innerHTML = `
            <div class="summary-grid" style="margin-bottom:14px;">
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${cases.length}</div>
                    <div class="summary-label">在办案件</div>
                </div>
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${records.length}</div>
                    <div class="summary-label">总工作记录</div>
                </div>
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number">${getAvgProgress(cases)}%</div>
                    <div class="summary-label">平均进度</div>
                </div>
                <div class="summary-item" style="background:var(--bg-white);border-radius:var(--radius);border:1px solid var(--border);">
                    <div class="summary-number" style="${getOverdueCount(cases, records, todayStr) > 0 ? 'color:var(--danger)' : ''}">${getOverdueCount(cases, records, todayStr)}</div>
                    <div class="summary-label">超期事项</div>
                </div>
            </div>
            ${cases.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">&#128200;</div>
                    <h4>暂无案件</h4>
                    <p>创建案件后即可查看进度，进度将根据工作记录自动计算</p>
                </div>
            ` : cases.map(c => renderProgressCard(c, records, todayStr)).join('')}
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

function getAvgProgress(cases) {
    if (!cases || cases.length === 0) return 0;
    const total = cases.reduce((s, c) => s + ((c.phase || 0) / 6 * 100), 0);
    return Math.round(total / cases.length);
}

function getOverdueCount(cases, records, todayStr) {
    let count = 0;
    for (const r of records) {
        if (r.nextPlans) {
            for (const p of r.nextPlans) {
                if (p.deadline && p.deadline < todayStr && !p.completed) count++;
            }
        }
    }
    return count;
}

function renderProgressCard(c, records, todayStr) {
    const phase = c.phase || 0;
    const progress = Math.round(phase / 6 * 100);
    const caseRecords = records.filter(r => r.caseId === c.id);

    const totalEvidence = caseRecords.reduce((s, r) => s + (r.evidenceCount || 0), 0);
    const totalWitness = caseRecords.reduce((s, r) => s + (r.witnessStatementCount || 0), 0);
    const totalSuspect = caseRecords.reduce((s, r) => s + (r.suspectStatementCount || 0), 0);
    const totalFrozen = caseRecords.reduce((s, r) => s + (r.assetFrozen || 0), 0);

    const overduePlans = [];
    for (const r of caseRecords) {
        if (r.nextPlans) {
            for (const p of r.nextPlans) {
                if (p.deadline && p.deadline < todayStr && !p.completed) {
                    overduePlans.push({ content: p.content, deadline: p.deadline });
                }
            }
        }
    }

    const markerLabel = c.marker === '重点' ? 'marker-key' : c.marker === '督办' ? 'marker-supervise' : 'marker-normal';
    const statusMap = { '在办': 'tag-primary', '提捕': 'tag-warning', '移诉': 'tag-warning', '中止': 'tag-disabled', '已结': 'tag-success', '撤销': 'tag-disabled' };

    return `
        <div class="card" style="margin-bottom:12px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
                <div>
                    <h4 style="font-size:14px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px;">
                        ${escapeHtml(c.caseName)}
                        <span class="marker-badge ${markerLabel}">${c.marker || '常规'}</span>
                        <span class="tag ${statusMap[c.status] || 'tag-primary'}" style="font-size:10px;">${c.status || '在办'}</span>
                    </h4>
                    <div style="font-size:11px;color:var(--text-secondary);margin-top:3px;">
                        编号：${c.caseNumber || '-'} | 主办：${c.leadOfficer || '-'} | 记录：${caseRecords.length}条
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-size:22px;font-weight:bold;color:${progress >= 100 ? 'var(--success)' : 'var(--primary)'};">${progress}%</div>
                    <div style="font-size:10px;color:var(--text-muted);">完成率</div>
                </div>
            </div>

            <div style="margin-bottom:10px;">
                <div class="progress-bar">
                    <div class="progress-fill ${progress >= 100 ? 'complete' : ''}" style="width:${progress}%;"></div>
                </div>
            </div>

            <div class="phase-steps">
                ${PHASE_NAMES.map((name, i) => `
                    <div class="phase-step ${i < phase ? 'completed' : i === phase ? 'active' : ''}">
                        <div class="step-dot">${i < phase ? '&#10003;' : i + 1}</div>
                        <div class="step-label">${name}</div>
                    </div>
                `).join('')}
            </div>

            <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;text-align:center;">
                当前阶段：<strong style="color:var(--primary);">${PHASE_NAMES[phase]}</strong>
                ${phase < 6 ? '（进度根据工作记录自动计算）' : ''}
            </div>

            <div style="display:flex;gap:12px;flex-wrap:wrap;margin:8px 0;padding:8px;background:var(--bg-main);border-radius:var(--radius);font-size:11px;">
                <span><strong style="color:var(--primary);">${totalEvidence}</strong>份证据</span>
                <span><strong style="color:var(--primary);">${totalWitness}</strong>份询问笔录</span>
                <span><strong style="color:var(--primary);">${totalSuspect}</strong>份讯问笔录</span>
                <span>冻结<strong style="color:var(--primary);">${formatMoney(totalFrozen)}</strong>元</span>
            </div>

            ${overduePlans.length > 0 ? `
                <div style="background:rgba(244,67,54,0.05);border:1px solid rgba(244,67,54,0.2);border-radius:var(--radius);padding:8px;margin-top:6px;">
                    <div style="font-size:11px;font-weight:600;color:var(--danger);margin-bottom:3px;">&#9888; 超期事项（${overduePlans.length}项）</div>
                    ${overduePlans.slice(0,3).map(p => `
                        <div style="font-size:10px;color:var(--text-secondary);padding:2px 0;">${escapeHtml(p.content)} — 截止：${p.deadline}</div>
                    `).join('')}
                    ${overduePlans.length > 3 ? `<div style="font-size:10px;color:var(--text-muted);">还有${overduePlans.length-3}项...</div>` : ''}
                </div>
            ` : ''}

            <div style="margin-top:8px;display:flex;gap:6px;">
                <button class="btn btn-primary btn-sm" onclick="showCaseDetail('${c.id}')">查看详情</button>
                <button class="btn btn-success btn-sm" onclick="navigateTo('records')">添加记录</button>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
