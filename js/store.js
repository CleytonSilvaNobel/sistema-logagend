/**
 * Centralized Store using LocalStorage to persist data for Vanilla JS App.
 * Maps array structures representing tables.
 */

const Store = {
    _dbKey: 'delivery_system_db',

    // Initial Database state
    _initialState: {
        receiptTypes: [],    // {id, nome_tipo, descricao}
        limits: [],          // {id, tipo_recebimento, capacidade_dia, dias_semana_ativos, hora_inicio, hora_fim, buffer, capacidade_janela}
        suppliers: [],       // {id, nome_fornecedor, observacoes}
        holidays: [],        // {id, data, descricao}
        locations: [],       // {id, nome_local, observacoes}
        supplierTypes: [],   // {id, fornecedor_id, tipo_id}
        schedules: [],       // {id, tipo_recebimento, fornecedor, local_recebimento, data, hora_inicio, hora_fim, documentos, observacoes, flag_encaixe, status (PENDENTE/RECEBIDO/NOSHOW), volumes_recebidos, data_recebimento_real, hora_recebimento_real, responsavel_recebimento, criado_por, criado_em, atualizado_por, atualizado_em}
        users: [             // {id, nome, login, senha, grupo}
            { id: 'u1', nome: 'Admin Master', login: 'admin', senha: 'Senha123', grupo: 'ADM' },
            { id: 'u2', nome: 'Supervisor Fulano', login: 'supervisor', senha: 'Senha123', grupo: 'Supervisor' },
            { id: 'u3', nome: 'Operador Ciclano', login: 'op', senha: 'Senha123', grupo: 'Operador' }
        ],
        groups: [
            { id: 'g1', nome: 'ADM', permissoes: 'total', permitir_ia: true },
            { id: 'g2', nome: 'Supervisor', permissoes: 'ultrapassar_limite, feriados', permitir_ia: true },
            { id: 'g3', nome: 'Operador', permissoes: 'padrao_restrito', permitir_ia: false }
        ],
        parameters: {
            gemini_api_key: '',
            gemini_model: 'gemini-2.0-flash',
            noshow_threshold: 15,
            lead_time_threshold: 24,
            backup_path: ''
        }
    },

    // Load entire DB from LocalStorage
    loadDB: () => {
        const data = localStorage.getItem(Store._dbKey);
        if (!data) {
            // IMPORTANTE: Salva APENAS localmente, NÃO empurra para a nuvem!
            // Se empurrar, um dispositivo novo sobrescreve a nuvem com dados vazios.
            localStorage.setItem(Store._dbKey, JSON.stringify(Store._initialState));
            return Store._initialState;
        }
        return JSON.parse(data);
    },

    // Save entire DB to LocalStorage
    saveDB: (dbData) => {
        localStorage.setItem(Store._dbKey, JSON.stringify(dbData));
        if (window.FirebaseDB) { window.FirebaseDB.syncSave(dbData); }
    },

    // Get a specific table/collection
    get: (collection) => {
        const db = Store.loadDB();
        return db[collection] || [];
    },

    // Set a specific table/collection
    set: (collection, data) => {
        const db = Store.loadDB();
        db[collection] = data;
        Store.saveDB(db);
    },

    // Find one by ID
    getById: (collection, id) => {
        const items = Store.get(collection);
        return items.find(item => item.id === id);
    },

    // Insert new item into a collection
    insert: (collection, item) => {
        const db = Store.loadDB();
        if (!db[collection]) db[collection] = [];

        const newItem = {
            ...item,
            id: item.id || Utils.generateId()
        };

        // Audit logic (if auth exists globally, auto append created_by)
        if (window.Auth && window.Auth.currentUser) {
            newItem.criado_por = window.Auth.currentUser.login;
            newItem.criado_em = new Date().toISOString();
        }

        db[collection].push(newItem);
        Store.saveDB(db);
        return newItem;
    },

    // Update an existing item
    update: (collection, id, updates) => {
        const db = Store.loadDB();
        if (!db[collection]) return null;

        const index = db[collection].findIndex(item => item.id === id);
        if (index !== -1) {
            // Audit update logic
            let auditData = {};
            if (window.Auth && window.Auth.currentUser) {
                auditData.atualizado_por = window.Auth.currentUser.login;
                auditData.atualizado_em = new Date().toISOString();
            }

            db[collection][index] = { ...db[collection][index], ...updates, ...auditData };
            Store.saveDB(db);
            return db[collection][index];
        }
        return null;
    },

    // Delete an item
    delete: (collection, id) => {
        const db = Store.loadDB();
        if (!db[collection]) return false;

        const index = db[collection].findIndex(item => item.id === id);
        if (index !== -1) {
            db[collection].splice(index, 1);
            Store.saveDB(db);
            return true;
        }
        return false;
    },

    // Automação: Update pendings in the past to No Show
    runAutomations: () => {
        const db = Store.loadDB();
        let changed = false;
        const today = Utils.getToday();

        db.schedules.forEach(schedule => {
            if (schedule.status === 'PENDENTE' && schedule.data < today) {
                schedule.status = 'NOSHOW';
                schedule.atualizado_por = 'SYSTEM_AUTO';
                schedule.atualizado_em = new Date().toISOString();
                changed = true;
            }
        });

        if (changed) {
            Store.saveDB(db);
            console.log("Automações rodadas: Atualizados status para No Show.");
        }
    },

    // Parameter Helpers
    get parameters() {
        return Store.get('parameters');
    },
    saveParameters: (params) => {
        const db = Store.loadDB();
        db.parameters = { ...db.parameters, ...params };
        Store.saveDB(db);
    }
};

// Immediately run DB automations on script load
Store.runAutomations();
