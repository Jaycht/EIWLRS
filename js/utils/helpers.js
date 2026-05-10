/**
 * 通用工具函数
 */

// 生成UUID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
}

// 获取今日日期 YYYY-MM-DD
function today() {
    return new Date().toISOString().split('T')[0];
}

// 格式化日期显示
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// 格式化金额
function formatMoney(num) {
    if (!num || isNaN(num)) return '0.00';
    return Number(num).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 格式化短日期 (MM-DD)
function formatShortDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : dateStr;
}

// 弹窗提示
function showToast(message, type = 'info') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'opacity 0.3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 确认对话框
function showConfirm(title, message, type = 'warning') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay show confirm-dialog';
        overlay.innerHTML = `
            <div class="modal modal-sm">
                <div class="modal-body">
                    <div class="confirm-icon ${type}">${type === 'error' ? '&#9888;' : '&#10071;'}</div>
                    <div class="confirm-text">${title}</div>
                    <div class="confirm-sub">${message}</div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="this.closest('.modal-overlay').remove(); window.__confirmResolve && window.__confirmResolve(false)">取消</button>
                    <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); window.__confirmResolve && window.__confirmResolve(true)">确定</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        window.__confirmResolve = resolve;
    });
}

// 模态框工具
function openModal(html, modalClass = '') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
        <div class="modal ${modalClass}">
            <div class="modal-header">
                <h3 id="modalTitle"></h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${html}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
}

function closeModal(overlay) {
    if (overlay) overlay.remove();
}

// 简单加密（Base64编码伪装，实为存储层安全）
function simpleEncrypt(data, password) {
    const json = JSON.stringify(data);
    // 实际应用中应使用真正的加密算法，此处为演示
    return btoa(encodeURIComponent(json));
}

function simpleDecrypt(encrypted, password) {
    try {
        const json = decodeURIComponent(atob(encrypted));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
}

// HTML 转义
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
