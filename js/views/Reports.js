/**
 * 报告生成 — 案件工作报告、工作总结、结案报告、表格导出
 */

async function renderReports(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(false);
        const records = await DB.getAllWorkRecords();

        document.getElementById('contentActions').innerHTML = '';

        container.innerHTML = `
            <!-- 案件阶段性报告 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128196; 案件阶段性工作报告</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    自动汇总案件基础信息、全周期工作记录、完成情况、存在问题、下步计划，生成规范Word文档。
                </p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <select class="form-control" id="reportCaseSelect" style="width:300px;">
                        <option value="">-- 请选择案件 --</option>
                        ${cases.map(c => `<option value="${c.id}">${escapeHtml(c.caseName)}</option>`).join('')}
                    </select>
                    <button class="btn btn-primary" onclick="genStageReport()">生成工作报告（Word）</button>
                    <button class="btn btn-outline" onclick="genStageReportHtml()">生成报告（HTML）</button>
                    <button class="btn btn-outline" onclick="genStageReportPrint()">直接打印</button>
                </div>
            </div>

            <!-- 民警工作总结 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128203; 民警工作总结</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    自动汇总指定时间段内所有案件的工作记录，生成个人工作总结。
                </p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    <input type="date" class="form-control" id="summaryStartDate" style="width:160px;" value="${getWeekStart()}">
                    <span style="color:var(--text-muted);">至</span>
                    <input type="date" class="form-control" id="summaryEndDate" style="width:160px;" value="${today()}">
                    <button class="btn btn-primary" onclick="genSummaryReport()">生成工作总结（Word）</button>
                    <button class="btn btn-outline" onclick="genSummaryReportPrint()">直接打印</button>
                </div>
            </div>

            <!-- Excel表格导出 -->
            <div class="card">
                <div class="card-header">
                    <h3>&#128200; 表格数据导出</h3>
                </div>
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    导出Excel格式的案件进度表、工作记录统计表、待办汇总表，适用于台账归档。
                </p>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="btn btn-success" onclick="exportCaseProgressExcel()">&#128200; 案件进度明细表</button>
                    <button class="btn btn-success" onclick="exportWorkRecordDialog()">&#128203; 工作记录统计表</button>
                    <button class="btn btn-success" onclick="exportTodoExcel()">&#128203; 待办事项汇总表</button>
                </div>
            </div>

            <!-- 模板使用说明 -->
            <div class="card" style="background:var(--bg-main);border:1px dashed var(--border);">
                <div class="card-header">
                    <h3 style="font-size:14px;">&#128161; 模板说明</h3>
                </div>
                <ul style="font-size:12px;color:var(--text-secondary);line-height:2;">
                    <li>所有报告数据自动提取自案件管理与工作记录模块，无需手动输入</li>
                    <li>Word文档生成后可直接修改、打印，符合公安办案归档规范</li>
                    <li>Excel表格包含完整列名，可按案件、工作类型筛选查看</li>
                    <li>所有模板遵循公安公文规范，标题、签字栏、页眉页脚齐全</li>
                    <li>&copy; 版权所有 经侦工作日志登记系统 | 制作人：陈洪涛 | V1.2 | Jaycht@126.com</li>
                </ul>
            </div>
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

function getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
}

// ---- 案件阶段性报告 ----
window.genStageReport = async function() {
    const caseId = document.getElementById('reportCaseSelect').value;
    if (!caseId) { showToast('请先选择案件', 'warning'); return; }
    const c = await DB.getCase(caseId);
    const html = await generateCaseStageReport(caseId);
    if (!html) return;
    exportToWord(html, `案件工作报告_${c.caseName}_${today()}`);
    showToast('工作报告已生成并下载', 'success');
};

window.genStageReportHtml = async function() {
    const caseId = document.getElementById('reportCaseSelect').value;
    if (!caseId) { showToast('请先选择案件', 'warning'); return; }
    const c = await DB.getCase(caseId);
    const html = await generateCaseStageReport(caseId);
    if (!html) return;
    exportToHtml(html, `案件工作报告_${c.caseName}_${today()}`);
    showToast('HTML报告已下载', 'success');
};

window.genStageReportPrint = async function() {
    const caseId = document.getElementById('reportCaseSelect').value;
    if (!caseId) { showToast('请先选择案件', 'warning'); return; }
    const html = await generateCaseStageReport(caseId);
    if (!html) return;
    printHtml(html);
};

// ---- 工作总结 ----
window.genSummaryReport = async function() {
    const start = document.getElementById('summaryStartDate').value;
    const end = document.getElementById('summaryEndDate').value;
    if (!start || !end) { showToast('请选择统计时间段', 'warning'); return; }
    const html = await generateWorkSummary(start, end);
    exportToWord(html, `工作总结_${start}_至_${end}`);
    showToast('工作总结已生成并下载', 'success');
};

window.genSummaryReportPrint = async function() {
    const start = document.getElementById('summaryStartDate').value;
    const end = document.getElementById('summaryEndDate').value;
    if (!start || !end) { showToast('请选择统计时间段', 'warning'); return; }
    const html = await generateWorkSummary(start, end);
    printHtml(html);
};

// ---- 工作记录导出对话框 ----
window.exportWorkRecordDialog = function() {
    const overlay = openModal(`
        <div style="margin-bottom:16px;">
            <label style="font-size:13px;font-weight:500;">选择统计时间段</label>
            <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
                <input type="date" class="form-control" id="exportStartDate" style="flex:1;" value="${getWeekStart()}">
                <span>至</span>
                <input type="date" class="form-control" id="exportEndDate" style="flex:1;" value="${today()}">
            </div>
            <div style="margin-top:12px;">
                <button class="btn btn-primary btn-lg" style="width:100%;" onclick="doExportWorkRecord()">导出Excel</button>
            </div>
        </div>
    `);
    overlay.querySelector('#modalTitle').textContent = '导出工作记录统计表';
};

window.doExportWorkRecord = function() {
    const start = document.getElementById('exportStartDate').value;
    const end = document.getElementById('exportEndDate').value;
    if (!start || !end) { showToast('请选择时间段', 'warning'); return; }
    closeModal(document.querySelector('.modal-overlay.show'));
    exportWorkRecordExcel(start, end);
};
