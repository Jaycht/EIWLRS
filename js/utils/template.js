/**
 * 报告模板引擎
 * 生成案件阶段性工作报告、工作总结、结案报告等 Word/HTML 格式文档
 */

const PHASE_NAMES_REPORT = ['立案初查', '侦查取证', '讯问突破', '强制措施', '资产处置', '移送起诉', '结案归档'];

/**
 * 生成案件阶段性工作报告（HTML格式，可转为Word）
 */
async function generateCaseStageReport(caseId) {
    const c = await DB.getCase(caseId);
    if (!c) return null;
    const records = await DB.getWorkRecordsByCase(caseId);
    const todayStr = today();
    const user = LS.get('currentUser', { name: '未知', badge: '' });

    // 统计数据
    const totalEvidence = records.reduce((s, r) => s + (r.evidenceCount || 0), 0);
    const totalWitnessStmts = records.reduce((s, r) => s + (r.witnessStatementCount || 0), 0);
    const totalSuspectStmts = records.reduce((s, r) => s + (r.suspectStatementCount || 0), 0);
    const totalFrozen = records.reduce((s, r) => s + (r.assetFrozen || 0), 0);
    const evidenceBank = records.filter(r => (r.evidenceTypes || []).includes('银行流水')).length;
    const evidenceBiz = records.filter(r => (r.evidenceTypes || []).includes('工商信息')).length;
    const evidenceTax = records.filter(r => (r.evidenceTypes || []).includes('税务票据')).length;
    const evidenceElect = records.filter(r => (r.evidenceTypes || []).includes('电子数据取证')).length;

    // 工作天数
    const workDays = new Set(records.map(r => r.recordDate)).size;

    // 完成率
    const doneCount = records.filter(r => r.completionStatus === '已完成').length;
    const completionRate = records.length > 0 ? Math.round(doneCount / records.length * 100) : 0;

    // 问题困难
    const problems = records.filter(r => r.completionDetail && r.completionStatus !== '已完成').map(r => r.completionDetail);
    // 下步计划
    const allPlans = [];
    for (const r of records) {
        if (r.nextPlans) {
            for (const p of r.nextPlans) {
                if (!p.completed) {
                    allPlans.push(p);
                }
            }
        }
    }

    const html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>案件阶段性工作报告</title>
            <style>
                @page { margin: 2.5cm 2cm; }
                body { font-family: "SimSun", "宋体", serif; font-size: 14px; color: #333; line-height: 1.8; }
                .report-title { text-align: center; font-size: 20px; font-weight: bold; color: #1565C0; margin-bottom: 6px; }
                .report-title-line { border: none; border-top: 2px solid #1565C0; margin: 4px 0 20px; }
                .report-meta { text-align: right; font-size: 13px; color: #666; margin-bottom: 24px; }
                .report-meta p { margin: 2px 0; }
                h1 { font-size: 16px; color: #1565C0; font-weight: bold; margin: 20px 0 10px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
                h2 { font-size: 14px; color: #333; font-weight: bold; margin: 14px 0 8px; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                th, td { border: 1px solid #e0e0e0; padding: 6px 10px; text-align: left; font-size: 13px; }
                th { background: #f5f5f5; font-weight: bold; color: #333; }
                .highlight { color: #1565C0; font-weight: bold; }
                .sign-area { margin-top: 40px; display: flex; justify-content: space-between; }
                .sign-box { width: 45%; }
                .sign-line { border-bottom: 1px solid #1565C0; height: 30px; margin-top: 8px; }
                .supplement-area { border: 1px dashed #FFC107; padding: 10px; margin: 10px 0; color: #999; font-size: 12px; }
                ul { padding-left: 20px; }
                li { margin: 4px 0; }
            </style>
        </head>
        <body>
            <div class="report-title">XX市公安局经侦支队 案件阶段性工作报告</div>
            <hr class="report-title-line">
            <div class="report-meta">
                <p>报告编号：${c.caseNumber || '------'}-${new Date().getTime().toString(36).toUpperCase()}</p>
                <p>报告日期：${todayStr}</p>
                <p>填报人：${user.name}（${user.badge}）</p>
            </div>

            <h1>一、案件基础信息</h1>
            <table>
                <tr><th style="width:18%;">案件名称</th><td style="width:32%;" class="highlight">${escHtml(c.caseName || '')}</td>
                    <th style="width:18%;">立案编号</th><td style="width:32%;" class="highlight">${escHtml(c.caseNumber || '')}</td></tr>
                <tr><th>案件类型</th><td>${escHtml(c.caseType || '')}</td>
                    <th>立案日期</th><td>${c.filingDate || ''}</td></tr>
                <tr><th>涉案金额</th><td class="highlight">${formatMoney(c.involvedAmount)}元</td>
                    <th>案件状态</th><td>${c.status || '在办'}</td></tr>
                <tr><th>当前阶段</th><td>${PHASE_NAMES_REPORT[c.phase] || '立案初查'}</td>
                    <th>进度占比</th><td class="highlight">${Math.round((c.phase || 0) / 6 * 100)}%</td></tr>
                <tr><th>主办民警</th><td>${escHtml(c.leadOfficer || '')}</td>
                    <th>协办民警</th><td>${escHtml(c.assistantOfficer || '')}</td></tr>
            </table>

            <h1>二、阶段性工作开展情况</h1>
            <p>本阶段（${records.length > 0 ? records[records.length-1].recordDate : '——'} 至 ${todayStr}），围绕本案开展以下工作：</p>

            <h2>（一）核心工作内容汇总</h2>
            <ul>
                <li><strong>证据调取：</strong>共调取 <span class="highlight">${totalEvidence}</span> 份证据，其中银行流水 ${evidenceBank} 项、工商信息 ${evidenceBiz} 项、税务票据 ${evidenceTax} 项、电子数据 ${evidenceElect} 项。</li>
                <li><strong>证人询问：</strong>共询问证人 <span class="highlight">${records.reduce((s,r) => s + (r.witnessCount||0), 0)}</span> 人，制作笔录 ${totalWitnessStmts} 份。</li>
                <li><strong>嫌疑人讯问：</strong>共讯问嫌疑人 <span class="highlight">${records.reduce((s,r) => s + (r.suspectInterrogationCount||0), 0)}</span> 次，制作笔录 ${totalSuspectStmts} 份。</li>
                ${c.coerciveMeasures ? `<li><strong>强制措施：</strong>依法采取相关强制措施。</li>` : ''}
                <li><strong>资产查控：</strong>冻结涉案资产 <span class="highlight">${formatMoney(totalFrozen)}</span> 元。</li>
            </ul>

            <h2>（二）工作成果量化</h2>
            <ul>
                <li>累计工作天数：<span class="highlight">${workDays}</span> 天</li>
                <li>累计制作笔录：<span class="highlight">${totalWitnessStmts + totalSuspectStmts}</span> 份</li>
                <li>累计调取证据：<span class="highlight">${totalEvidence}</span> 份</li>
                <li>完成率：<span class="highlight">${completionRate}%</span></li>
            </ul>

            <h1>三、存在的问题与困难</h1>
            ${problems.length > 0 ? `<ul>${problems.slice(0, 5).map(p => `<li>${escHtml(p)}</li>`).join('')}</ul>` : `<p>暂无突出问题。</p>`}
            <div class="supplement-area">手动补充区域：________</div>

            <h1>四、下步工作计划</h1>
            ${allPlans.length > 0 ? `<ul>${allPlans.slice(0, 8).map(p => {
                let item = `<li>${escHtml(p.content)}`;
                if (p.deadline) item += `，时限：${p.deadline}`;
                if (p.responsible) item += `，责任人：${escHtml(p.responsible)}`;
                item += '</li>';
                return item;
            }).join('')}</ul>` : `<p>暂无下步计划。</p>`}
            <div class="supplement-area">手动补充区域：________</div>

            <h1>五、汇报人意见</h1>
            <div class="sign-area">
                <div class="sign-box">
                    <p>签字：</p>
                    <div class="sign-line"></div>
                </div>
                <div class="sign-box" style="text-align:right;">
                    <p>日期：____年____月____日</p>
                </div>
            </div>

            <h1>六、领导批示</h1>
            <div class="sign-area">
                <div class="sign-box">
                    <p>签字：</p>
                    <div class="sign-line" style="height:60px;"></div>
                </div>
                <div class="sign-box" style="text-align:right;">
                    <p>日期：____年____月____日</p>
                </div>
            </div>
            <div style="text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #e0e0e0;font-size:10px;color:#999;">
                &copy; 版权所有 经侦工作日志登记系统 | 制作人：陈洪涛
            </div>
        </body>
        </html>
    `;
    return html;
}

/**
 * 生成民警工作总结报告
 */
async function generateWorkSummary(startDate, endDate) {
    const records = await DB.getAllWorkRecords();
    const user = LS.get('currentUser', { name: '未知', badge: '' });
    const cases = await DB.getAllCases(true);

    const filtered = records.filter(r => r.recordDate >= startDate && r.recordDate <= endDate);
    const caseMap = {};
    cases.forEach(c => caseMap[c.id] = c.caseName);

    // 按日期分组
    const byDate = {};
    filtered.forEach(r => {
        if (!byDate[r.recordDate]) byDate[r.recordDate] = [];
        byDate[r.recordDate].push(r);
    });

    const sortedDates = Object.keys(byDate).sort();

    const html = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <title>民警工作总结</title>
            <style>
                @page { margin: 2.5cm 2cm; }
                body { font-family: "SimSun", "宋体", serif; font-size: 14px; color: #333; line-height: 1.8; }
                .report-title { text-align: center; font-size: 20px; font-weight: bold; color: #1565C0; margin-bottom: 20px; }
                h1 { font-size: 16px; color: #1565C0; font-weight: bold; margin: 20px 0 10px; border-bottom: 1px solid #e0e0e0; }
                table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
                th, td { border: 1px solid #e0e0e0; padding: 6px 10px; text-align: left; }
                th { background: #1565C0; color: white; font-weight: bold; }
                tr:nth-child(even) td { background: #f5f5f5; }
            </style>
        </head>
        <body>
            <div class="report-title">民警工作记录统计表</div>
            <p style="text-align:center;color:#666;font-size:13px;">
                统计时间段：${startDate} 至 ${endDate}
                <br>统计民警：${user.name}（${user.badge}）
                <br>共统计：${filtered.length} 条工作记录，涉及 ${new Set(filtered.map(r => r.caseId)).size} 个案件
            </p>

            <table>
                <thead>
                    <tr>
                        <th style="width:40px;">序号</th>
                        <th style="width:100px;">记录日期</th>
                        <th>关联案件</th>
                        <th style="width:100px;">案件类型</th>
                        <th style="width:80px;">工作类型</th>
                        <th>核心工作内容</th>
                        <th style="width:80px;">完成状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${filtered.sort((a,b) => a.recordDate.localeCompare(b.recordDate)).map((r, i) => {
                        const workItems = [];
                        if (r.evidenceTypes && r.evidenceTypes.length > 0) workItems.push('证据调取');
                        if (r.witnessCount) workItems.push('证人询问');
                        if (r.suspectInterrogationCount) workItems.push('嫌疑人讯问');
                        if (r.coerciveMeasures && r.coerciveMeasures.length > 0) workItems.push('强制措施');
                        const workContent = `${workItems.join('、')}${r.achievements ? '：' + r.achievements : ''}`;
                        return `<tr>
                            <td>${i + 1}</td>
                            <td>${r.recordDate}</td>
                            <td>${caseMap[r.caseId] || '未知案件'}</td>
                            <td>${r.recordType || '日常进度'}</td>
                            <td>${workItems.join('/') || '其他工作'}</td>
                            <td>${escHtml(workContent)}</td>
                            <td>${r.completionStatus || '-'}</td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <p style="color:#999;font-size:11px;text-align:center;margin-top:8px;">
                本表格数据自动提取自经侦工作日志登记系统
                <br>&copy; 版权所有 经侦工作日志登记系统 | 制作人：陈洪涛
            </p>
        </body>
        </html>
    `;
    return html;
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
