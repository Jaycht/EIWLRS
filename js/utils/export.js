/**
 * 导出工具 — Excel、Word、打印
 */

/**
 * 导出HTML内容为Word文档（.doc）
 */
function exportToWord(html, filename) {
    const blob = new Blob([
        '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
        '<head><meta charset="utf-8"></head><body>',
        html,
        '</body></html>'
    ], { type: 'application/msword' });

    downloadBlob(blob, filename + '.doc');
}

/**
 * 导出HTML内容为HTML文件
 */
function exportToHtml(html, filename) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, filename + '.html');
}

/**
 * 导出为Excel（使用SheetJS）
 */
function exportToExcel(headers, data, filename, sheetName = 'Sheet1') {
    if (typeof XLSX === 'undefined') {
        showToast('Excel导出库未加载，请检查网络连接', 'error');
        return;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 设置列宽
    ws['!cols'] = headers.map((_, i) => ({ wch: Math.max(12, 18 - i * 0.5) }));

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    downloadBlob(blob, filename + '.xlsx');
}

/**
 * 导出案件进度明细表（Excel）
 */
async function exportCaseProgressExcel() {
    const cases = await DB.getAllCases(false);
    const records = await DB.getAllWorkRecords();

    const headers = ['案件名称', '立案编号', '案件类型', '主办民警', '涉案金额(元)', '案件状态', '当前阶段', '工作记录数', '证据调取数', '询问笔录数', '讯问笔录数', '冻结金额(元)'];
    const data = cases.map(c => {
        const cr = records.filter(r => r.caseId === c.id);
        return [
            c.caseName || '',
            c.caseNumber || '',
            c.caseType || '',
            c.leadOfficer || '',
            c.involvedAmount || 0,
            c.status || '',
            PHASE_NAMES_REPORT[c.phase] || '',
            cr.length,
            cr.reduce((s, r) => s + (r.evidenceCount || 0), 0),
            cr.reduce((s, r) => s + (r.witnessStatementCount || 0), 0),
            cr.reduce((s, r) => s + (r.suspectStatementCount || 0), 0),
            cr.reduce((s, r) => s + (r.assetFrozen || 0), 0)
        ];
    });

    exportToExcel(headers, data, '案件进度明细表_' + today());
    showToast('案件进度明细表已导出', 'success');
}

/**
 * 导出工作记录统计表（Excel）
 */
async function exportWorkRecordExcel(startDate, endDate) {
    const records = await DB.getAllWorkRecords();
    const cases = await DB.getAllCases(true);
    const caseMap = {};
    cases.forEach(c => caseMap[c.id] = c.caseName);

    const filtered = startDate && endDate ?
        records.filter(r => r.recordDate >= startDate && r.recordDate <= endDate) :
        records;

    const headers = ['序号', '记录日期', '关联案件', '工作类型', '核心工作内容', '工作成果', '完成状态', '下步计划', '填报人'];
    const data = filtered.sort((a, b) => a.recordDate.localeCompare(b.recordDate)).map((r, i) => {
        const workItems = [];
        if (r.evidenceTypes && r.evidenceTypes.length > 0) workItems.push('证据调取');
        if (r.witnessCount) workItems.push('证人询问');
        if (r.suspectInterrogationCount) workItems.push('讯问');
        if (r.coerciveMeasures && r.coerciveMeasures.length > 0) workItems.push('强制措施');

        const plans = (r.nextPlans || []).map(p => p.content).join('；');

        return [
            i + 1,
            r.recordDate || '',
            caseMap[r.caseId] || '',
            (r.recordType || '') + ' | ' + workItems.join('/'),
            r.achievements || '',
            r.evidenceDetail || r.witnessContent || '',
            r.completionStatus || '',
            plans,
            r.policeName || ''
        ];
    });

    exportToExcel(headers, data, '工作记录统计表_' + today());
    showToast('工作记录统计表已导出', 'success');
}

/**
 * 导出待办事项汇总表（Excel）
 */
async function exportTodoExcel() {
    const cases = await DB.getAllCases(false);
    const records = await DB.getAllWorkRecords();
    const todayStr = today();
    const caseMap = {};
    cases.forEach(c => caseMap[c.id] = c.caseName);

    const allTodos = [];
    for (const c of cases) {
        const cr = records.filter(r => r.caseId === c.id);
        for (const r of cr) {
            if (r.nextPlans) {
                for (const p of r.nextPlans) {
                    if (!p.completed) {
                        allTodos.push({
                            caseName: c.caseName,
                            content: p.content,
                            deadline: p.deadline,
                            responsible: p.responsible,
                            isOverdue: p.deadline && p.deadline < todayStr ? '是' : '否'
                        });
                    }
                }
            }
        }
    }

    const headers = ['序号', '关联案件', '待办内容', '完成时限', '责任人', '是否超期'];
    const data = allTodos.map((t, i) => [i + 1, t.caseName, t.content, t.deadline || '未设置', t.responsible || '-', t.isOverdue]);

    exportToExcel(headers, data, '待办事项汇总表_' + today());
    showToast('待办事项汇总表已导出', 'success');
}

/**
 * 打印HTML内容
 */
function printHtml(html) {
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.print();
}

/**
 * 下载Blob
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
