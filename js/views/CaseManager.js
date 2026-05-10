/**
 * 案件管理 — 案件列表、新建、编辑、筛选、归档
 */

// 当前筛选状态
let caseFilter = { status: '', marker: '', search: '', archived: false };

async function renderCaseManager(container) {
    container.innerHTML = '<div style="text-align:center;padding:40px;">正在加载...</div>';

    try {
        const cases = await DB.getAllCases(caseFilter.archived);
        cases.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        // 筛选
        let filtered = [...cases];
        if (caseFilter.status) filtered = filtered.filter(c => c.status === caseFilter.status);
        if (caseFilter.marker) filtered = filtered.filter(c => c.marker === caseFilter.marker);
        if (caseFilter.search) {
            const q = caseFilter.search.toLowerCase();
            filtered = filtered.filter(c =>
                (c.caseName || '').toLowerCase().includes(q) ||
                (c.caseNumber || '').toLowerCase().includes(q) ||
                (c.caseType || '').toLowerCase().includes(q)
            );
        }

        // 更新操作栏
        const actions = document.getElementById('contentActions');
        actions.innerHTML = `
            <div class="quick-actions">
                <button class="btn btn-primary" onclick="showNewCaseForm()">&#10133; 新建案件</button>
            </div>
        `;

        container.innerHTML = `
            <!-- 筛选栏 -->
            <div class="card" style="padding:12px 16px;margin-bottom:16px;">
                <div class="filter-bar">
                    <div class="search-box">
                        <span class="search-icon">&#128269;</span>
                        <input type="text" placeholder="搜索案件名称、编号、类型..."
                            value="${escapeHtml(caseFilter.search)}"
                            oninput="caseFilter.search=this.value;renderCaseManager(document.getElementById('contentBody'))"
                            onkeydown="if(event.key==='Enter'){caseFilter.search=this.value;renderCaseManager(document.getElementById('contentBody'))}">
                    </div>
                    <select onchange="caseFilter.status=this.value;renderCaseManager(document.getElementById('contentBody'))">
                        <option value="">全部状态</option>
                        <option value="在办" ${caseFilter.status === '在办' ? 'selected' : ''}>在办</option>
                        <option value="提捕" ${caseFilter.status === '提捕' ? 'selected' : ''}>提捕</option>
                        <option value="移诉" ${caseFilter.status === '移诉' ? 'selected' : ''}>移诉</option>
                        <option value="中止" ${caseFilter.status === '中止' ? 'selected' : ''}>中止</option>
                        <option value="已结" ${caseFilter.status === '已结' ? 'selected' : ''}>已结</option>
                        <option value="撤销" ${caseFilter.status === '撤销' ? 'selected' : ''}>撤销</option>
                    </select>
                    <select onchange="caseFilter.marker=this.value;renderCaseManager(document.getElementById('contentBody'))">
                        <option value="">全部标记</option>
                        <option value="重点" ${caseFilter.marker === '重点' ? 'selected' : ''}>重点案件</option>
                        <option value="督办" ${caseFilter.marker === '督办' ? 'selected' : ''}>督办案件</option>
                        <option value="常规" ${caseFilter.marker === '常规' ? 'selected' : ''}>常规案件</option>
                    </select>
                    <label class="checkbox-item" style="margin-left:8px;">
                        <input type="checkbox" ${caseFilter.archived ? 'checked' : ''}
                            onchange="caseFilter.archived=this.checked;renderCaseManager(document.getElementById('contentBody'))">
                        显示已归档案件
                    </label>
                </div>
            </div>

            ${filtered.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">&#128220;</div>
                    <h4>${cases.length === 0 ? '暂无案件' : '未找到匹配案件'}</h4>
                    <p>${cases.length === 0 ? '点击上方"新建案件"开始创建' : '请调整筛选条件'}</p>
                </div>
            ` : `
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">
                    共找到 <strong>${filtered.length}</strong> 个案件
                </div>
                <div class="case-grid">
                    ${filtered.map(c => renderCaseCardFull(c)).join('')}
                </div>
            `}
        `;
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">&#9888;</div><h4>加载失败</h4><p>${e.message}</p></div>`;
    }
}

function renderCaseCardFull(c) {
    const markerLabel = c.marker === '重点' ? 'marker-key' : c.marker === '督办' ? 'marker-supervise' : 'marker-normal';
    const markerText = c.marker === '重点' ? '重点' : c.marker === '督办' ? '督办' : '常规';
    const statusMap = {
        '在办': 'tag-primary', '提捕': 'tag-warning', '移诉': 'tag-warning',
        '中止': 'tag-disabled', '已结': 'tag-success', '撤销': 'tag-disabled'
    };

    return `
        <div class="case-card">
            <div class="case-title">
                <span>${escapeHtml(c.caseName)}</span>
                <span class="marker-badge ${markerLabel}">${markerText}</span>
            </div>
            <div class="case-meta">
                <span>编号：${escapeHtml(c.caseNumber || '-')}</span>
                <span>类型：${escapeHtml(c.caseType || '-')}</span>
                <span>主办：${escapeHtml(c.leadOfficer || '-')}</span>
            </div>
            <div class="case-meta">
                <span>涉案金额：<strong>${formatMoney(c.involvedAmount)}</strong>元</span>
                <span>立案：${formatDate(c.filingDate)}</span>
            </div>
            <div style="margin:8px 0;">
                <span class="tag ${statusMap[c.status] || 'tag-primary'}">${c.status || '在办'}</span>
                <span style="margin-left:6px;font-size:12px;color:var(--text-secondary);">阶段：${getPhaseName(c.phase || 0)}</span>
            </div>
            <div class="case-footer">
                <div style="display:flex;gap:6px;">
                    <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();showCaseDetail('${c.id}')">查看</button>
                    <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editCase('${c.id}')">编辑</button>
                    ${c.isArchived ? `
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();unarchiveCaseConfirm('${c.id}')">恢复</button>
                    ` : `
                        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();archiveCaseConfirm('${c.id}')">归档</button>
                    `}
                    <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteCaseConfirm('${c.id}')">删除</button>
                </div>
            </div>
        </div>
    `;
}

// ---- 新建案件 ----
window.showNewCaseForm = function() {
    const favCrimes = getFavoriteCrimes();
    
    let crimeOptions = '';
    // 常用案件
    if (favCrimes.length > 0) {
        crimeOptions += `<optgroup label="☆ 常用案件">`;
        favCrimes.forEach(fav => {
            crimeOptions += `<option value="${fav}">${fav}</option>`;
        });
        crimeOptions += `</optgroup>`;
    }
    // 全部案件
    CRIME_CATEGORIES.forEach(cat => {
        crimeOptions += `<optgroup label="${cat.name}">`;
        cat.subs.forEach(sub => {
            sub.crimes.forEach(crime => {
                const isFav = favCrimes.includes(crime.name) ? '☆ ' : '';
                crimeOptions += `<option value="${crime.name}">${isFav}${crime.name}（${crime.article}）</option>`;
            });
        });
        crimeOptions += `</optgroup>`;
    });

    // 收藏按钮用JS处理
    const overlay = openModal(`
        <form id="newCaseForm" onsubmit="saveNewCase(event)">
            <div class="form-row">
                <div class="form-group">
                    <label>案件名称 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="caseName" required placeholder="请输入案件名称">
                </div>
                <div class="form-group">
                    <label>立案编号 <span class="required">*</span></label>
                    <input type="text" class="form-control" name="caseNumber" required placeholder="如：经侦立字[2026]001号">
                </div>
            </div>
            <div class="form-group">
                <label>
                    案件类型 <span class="required">*</span>
                    <span style="font-size:11px;color:var(--text-muted);font-weight:normal;margin-left:8px;">
                        支持收藏常用类型
                    </span>
                </label>
                <div style="display:flex;gap:8px;">
                    <select class="form-control" name="caseType" required style="flex:1;" id="caseTypeSelect">
                        <option value="">-- 请选择案件类型 --</option>
                        ${crimeOptions}
                    </select>
                    <button type="button" class="btn btn-outline" onclick="toggleFavoriteFromForm()" title="收藏/取消收藏" id="favBtn">☆</button>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>立案日期 <span class="required">*</span></label>
                    <input type="date" class="form-control" name="filingDate" value="${today()}" required>
                </div>
                <div class="form-group">
                    <label>涉案金额（元）</label>
                    <input type="number" class="form-control" name="involvedAmount" step="0.01" placeholder="0.00">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>主办民警</label>
                    <input type="text" class="form-control" name="leadOfficer" placeholder="请输入主办民警姓名">
                </div>
                <div class="form-group">
                    <label>协办民警</label>
                    <input type="text" class="form-control" name="assistantOfficer" placeholder="请输入协办民警姓名">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>案件标记</label>
                    <select class="form-control" name="marker">
                        <option value="常规">常规案件</option>
                        <option value="重点">重点案件</option>
                        <option value="督办">督办案件</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>初始阶段</label>
                    <select class="form-control" name="phase">
                        <option value="0">立案初查</option>
                        <option value="1">侦查取证</option>
                        <option value="2">讯问突破</option>
                        <option value="3">强制措施</option>
                        <option value="4">资产处置</option>
                        <option value="5">移送起诉</option>
                        <option value="6">结案归档</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>简要案情</label>
                <textarea class="form-control" name="summary" rows="4" placeholder="请简要描述案件基本情况..."></textarea>
            </div>
            <div class="form-group" style="margin-bottom:0;">
                <button type="submit" class="btn btn-primary btn-lg" style="width:100%;">创建案件</button>
            </div>
        </form>
    `, 'modal-lg');
    overlay.querySelector('#modalTitle').textContent = '新建案件';

    // 收藏按钮状态监听
    const select = overlay.querySelector('#caseTypeSelect');
    const favBtn = overlay.querySelector('#favBtn');
    select.addEventListener('change', () => {
        updateFavBtn(select.value, favBtn);
    });
};

function updateFavBtn(crimeName, btn) {
    if (!crimeName) { btn.textContent = '☆'; btn.style.opacity = '0.3'; return; }
    const isFav = isFavoriteCrime(crimeName);
    btn.textContent = isFav ? '★' : '☆';
    btn.style.opacity = '1';
    btn.style.color = isFav ? '#FFC107' : '';
}

window.toggleFavoriteFromForm = function() {
    const select = document.getElementById('caseTypeSelect');
    const crimeName = select.value;
    if (!crimeName) { showToast('请先选择案件类型', 'warning'); return; }
    toggleFavoriteCrime(crimeName);
    updateFavBtn(crimeName, document.getElementById('favBtn'));
    showToast(isFavoriteCrime(crimeName) ? '已收藏到常用案件' : '已取消收藏', 'success');
};

window.saveNewCase = async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = new FormData(form);
    const caseData = {
        _isNew: true,
        id: generateId(),
        ...Object.fromEntries(data)
    };
    caseData.involvedAmount = parseFloat(caseData.involvedAmount) || 0;
    caseData.phase = parseInt(caseData.phase) || 0;
    caseData.status = '在办';
    caseData.isArchived = false;

    await DB.saveCase(caseData);
    showToast('案件创建成功！', 'success');
    closeModal(form.closest('.modal-overlay'));
    navigateTo('cases');
};

// ---- 归档与删除 ----
window.archiveCaseConfirm = async function(id) {
    const confirmed = await showConfirm('确认归档', '归档后案件将移至历史案件库，可随时恢复查看。');
    if (!confirmed) return;
    await DB.archiveCase(id);
    showToast('案件已归档', 'success');
    renderCaseManager(document.getElementById('contentBody'));
};

window.unarchiveCaseConfirm = async function(id) {
    await DB.unarchiveCase(id);
    showToast('案件已恢复', 'success');
    renderCaseManager(document.getElementById('contentBody'));
};

window.deleteCaseConfirm = async function(id) {
    const confirmed = await showConfirm('确认删除', '此操作将永久删除案件及所有关联工作记录，不可恢复！', 'error');
    if (!confirmed) return;
    const doubleConfirm = await showConfirm('再次确认', '请确认您真的要删除此案件吗？数据将不可恢复！', 'error');
    if (!doubleConfirm) return;
    await DB.deleteCase(id);
    showToast('案件已删除', 'success');
    renderCaseManager(document.getElementById('contentBody'));
};
