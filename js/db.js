/**
 * 数据持久层 — localStorage + IndexedDB 混合存储
 * localStorage 存储元数据（用户、设置、索引）
 * IndexedDB 存储主要业务数据（案件、记录、日志）
 */

const DB_NAME = 'ECIWorkLog';
const DB_VERSION = 1;

// ===========================
// IndexedDB 初始化
// ===========================
let _db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (_db) { resolve(_db); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            // 案件存储
            if (!db.objectStoreNames.contains('cases')) {
                const store = db.createObjectStore('cases', { keyPath: 'id' });
                store.createIndex('status', 'status', { unique: false });
                store.createIndex('isArchived', 'isArchived', { unique: false });
                store.createIndex('caseNumber', 'caseNumber', { unique: false });
                store.createIndex('updatedAt', 'updatedAt', { unique: false });
            }
            // 工作记录存储
            if (!db.objectStoreNames.contains('workRecords')) {
                const store = db.createObjectStore('workRecords', { keyPath: 'id' });
                store.createIndex('caseId', 'caseId', { unique: false });
                store.createIndex('recordDate', 'recordDate', { unique: false });
            }
            // 审计日志（不可删除）
            if (!db.objectStoreNames.contains('auditLogs')) {
                const store = db.createObjectStore('auditLogs', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
                store.createIndex('userId', 'userId', { unique: false });
            }
        };

        req.onsuccess = (e) => {
            _db = e.target.result;
            resolve(_db);
        };

        req.onerror = (e) => {
            console.error('数据库打开失败:', e.target.error);
            reject(e.target.error);
        };
    });
}

// IndexedDB 通用操作
function dbPut(storeName, data) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbGet(storeName, id) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbGetAll(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbDelete(storeName, id) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function dbClear(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

function dbGetByIndex(storeName, indexName, value) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const req = index.getAll(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

// ===========================
// localStorage 数据管理（用户、设置、应用状态）
// ===========================
const LS = {
    get(key, defaultVal = null) {
        try {
            const val = localStorage.getItem('eci_' + key);
            return val ? JSON.parse(val) : defaultVal;
        } catch { return defaultVal; }
    },
    set(key, val) {
        localStorage.setItem('eci_' + key, JSON.stringify(val));
    },
    remove(key) {
        localStorage.removeItem('eci_' + key);
    }
};

// ===========================
// 业务数据 API
// ===========================
const DB = {
    // ---- 案件 ----
    async saveCase(caseData) {
        caseData.updatedAt = new Date().toISOString();
        if (!caseData.createdAt) caseData.createdAt = caseData.updatedAt;
        await dbPut('cases', caseData);
        await DB.addAuditLog({
            userId: LS.get('currentUser', {}).id || 'system',
            userName: LS.get('currentUser', {}).name || '系统',
            action: caseData._isNew ? '新建案件' : '修改案件',
            target: caseData.caseName,
            detail: `案件：${caseData.caseName}（编号：${caseData.caseNumber}）`
        });
        delete caseData._isNew;
        return caseData;
    },

    async getCase(id) {
        return dbGet('cases', id);
    },

    async getAllCases(includeArchived = false) {
        const all = await dbGetAll('cases');
        return includeArchived ? all : all.filter(c => !c.isArchived);
    },

    async deleteCase(id) {
        const c = await DB.getCase(id);
        if (c) {
            await DB.addAuditLog({
                userId: LS.get('currentUser', {}).id || 'system',
                userName: LS.get('currentUser', {}).name || '系统',
                action: '删除案件',
                target: c.caseName,
                detail: `案件：${c.caseName}（编号：${c.caseNumber}）`
            });
        }
        // 同时删除关联工作记录
        const records = await dbGetByIndex('workRecords', 'caseId', id);
        for (const r of records) {
            await dbDelete('workRecords', r.id);
        }
        await dbDelete('cases', id);
    },

    async archiveCase(id) {
        const c = await DB.getCase(id);
        if (c) {
            c.isArchived = true;
            c.updatedAt = new Date().toISOString();
            await dbPut('cases', c);
        }
    },

    async unarchiveCase(id) {
        const c = await DB.getCase(id);
        if (c) {
            c.isArchived = false;
            c.updatedAt = new Date().toISOString();
            await dbPut('cases', c);
        }
    },

    // ---- 工作记录 ----
    async saveWorkRecord(record) {
        record.updatedAt = new Date().toISOString();
        if (!record.createdAt) record.createdAt = record.updatedAt;
        await dbPut('workRecords', record);
        return record;
    },

    async getWorkRecord(id) {
        return dbGet('workRecords', id);
    },

    async getWorkRecordsByCase(caseId) {
        const all = await dbGetByIndex('workRecords', 'caseId', caseId);
        all.sort((a, b) => b.recordDate.localeCompare(a.recordDate) || b.createdAt.localeCompare(a.createdAt));
        return all;
    },

    async getAllWorkRecords() {
        const all = await dbGetAll('workRecords');
        all.sort((a, b) => b.recordDate.localeCompare(a.recordDate) || b.createdAt.localeCompare(a.createdAt));
        return all;
    },

    async deleteWorkRecord(id) {
        const r = await DB.getWorkRecord(id);
        if (r) {
            await DB.addAuditLog({
                userId: LS.get('currentUser', {}).id || 'system',
                userName: LS.get('currentUser', {}).name || '系统',
                action: '删除工作记录',
                target: r.recordDate,
                detail: `删除 ${r.recordDate} 的工作记录`
            });
        }
        await dbDelete('workRecords', id);
    },

    // 获取某案件某日期的最后一条记录（用于复制昨日）
    async getLastRecordByDate(caseId, date) {
        const records = await DB.getWorkRecordsByCase(caseId);
        return records.find(r => r.recordDate === date) || null;
    },

    // ---- 审计日志 ----
    async addAuditLog(log) {
        if (!log.id) log.id = generateId();
        if (!log.timestamp) log.timestamp = new Date().toISOString();
        await dbPut('auditLogs', log);
    },

    async getAuditLogs(limit = 200) {
        const all = await dbGetAll('auditLogs');
        all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        return all.slice(0, limit);
    },

    async clearAuditLogs(beforeDate) {
        // 不可删除全部日志，仅可清理指定日期之前的（合规保留）
        if (!beforeDate) return;
        const all = await dbGetAll('auditLogs');
        for (const log of all) {
            if (log.timestamp < beforeDate) {
                await dbDelete('auditLogs', log.id);
            }
        }
    },

    // ---- 用户管理 ----
    async getUsers() {
        return LS.get('users', []);
    },

    async saveUser(user) {
        const users = await DB.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        else users.push(user);
        LS.set('users', users);
    },

    // ---- 备份与恢复 ----
    async exportAllData() {
        const cases = await dbGetAll('cases');
        const workRecords = await dbGetAll('workRecords');
        const auditLogs = await dbGetAll('auditLogs');
        const users = await DB.getUsers();
        const settings = LS.get('settings', {});
        return { cases, workRecords, auditLogs, users, settings, exportedAt: new Date().toISOString() };
    },

    async importAllData(data) {
        // 清空旧数据
        await dbClear('cases');
        await dbClear('workRecords');
        await dbClear('auditLogs');

        // 导入新数据
        for (const c of (data.cases || [])) await dbPut('cases', c);
        for (const r of (data.workRecords || [])) await dbPut('workRecords', r);
        for (const l of (data.auditLogs || [])) await dbPut('auditLogs', l);
        if (data.users) LS.set('users', data.users);
        if (data.settings) LS.set('settings', data.settings);
    }
};
