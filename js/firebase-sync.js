/**
 * Firebase Sync Controller for LogAgend
 * This script initializes Firebase and provides an async bridge to sync with LocalStorage
 */

const firebaseConfig = {
    apiKey: "AIzaSyB8esLUJzqnumckLfjf5isY3qAcbw0pZ6s",
    authDomain: "nobelpack-systems-4d510.firebaseapp.com",
    databaseURL: "https://nobelpack-systems-4d510-default-rtdb.firebaseio.com",
    projectId: "nobelpack-systems-4d510",
    storageBucket: "nobelpack-systems-4d510.firebasestorage.app",
    messagingSenderId: "661674699484",
    appId: "1:661674699484:web:fa68c08bc3d9398d90e219",
    measurementId: "G-EWFDHF9CDE"
};

let dbRef = null;
let isFirebaseInitialized = false;

const FirebaseDB = {
    init: () => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            // Use Realtime Database connection
            dbRef = firebase.database().ref('delivery_system_db'); 
            isFirebaseInitialized = true;
            console.log('Firebase Cloud Database Conectado (LogAgend - delivery_system_db).');
        } catch (error) {
            console.error('Falha ao inicializar o Firebase. Verifique suas chaves.', error);
        }
    },

    // Carregamento único da nuvem (chamado ANTES do Auth para garantir dados atualizados)
    syncLoad: async () => {
        if (!isFirebaseInitialized) return null;
        const DB_KEY = 'delivery_system_db';
        try {
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
                console.log('Firebase: Dados carregados da nuvem com sucesso (LogAgend syncLoad).');
                return cloudData;
            } else {
                console.log('Firebase: Nuvem vazia, usando dados locais.');
                return null;
            }
        } catch (error) {
            console.error('Firebase: Erro ao carregar dados da nuvem:', error);
            return null;
        }
    },

    // Escuta constante da nuvem, injetando dados na tela em tempo real
    listen: (onUpdateCallback) => {
        if (!isFirebaseInitialized) return;
        
        // Chave DEVE ser idêntica à usada em Store._dbKey
        const DB_KEY = 'delivery_system_db';
        
        dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                
                // Evita loop infinito comparando assinatura simples
                const localStr = localStorage.getItem(DB_KEY);
                const cloudStr = JSON.stringify(cloudData);
                
                if (localStr !== cloudStr) {
                    console.log('Firebase: Nova atualização recebida da nuvem (LogAgend).');
                    localStorage.setItem(DB_KEY, cloudStr);
                    if (onUpdateCallback) onUpdateCallback(cloudData);
                }
            }
        });
    },

    // Empurra a versão do LocalStorage para a Nuvem com Transação Anti-Concorrência
    syncSave: (latestLocalData, isManualWipe = false) => {
        if (!isFirebaseInitialized) return;
        
        console.log('Firebase: Iniciando sincronização LogAgend...');
        
        // Transação para evitar concorrência (Race Condition) no exato milissegundo
        dbRef.transaction((currentCloudData) => {
            // ANTI-WIPE SAFETY: Impede que um dispositivo novo/vazio zere a nuvem
            if (currentCloudData && !isManualWipe) {
                const cloudSchedules = currentCloudData.schedules ? currentCloudData.schedules.length : 0;
                const localSchedules = latestLocalData.schedules ? latestLocalData.schedules.length : 0;
                
                // Se a nuvem tem agendamentos e o local não, recusa a gravação
                if (cloudSchedules > 0 && localSchedules === 0) {
                    console.warn('SAFETY LOCK (LogAgend): Tentativa de sobrescrever nuvem com dados vazios bloqueada.');
                    // Em vez de abortar tudo, vamos apenas manter as schedules da nuvem, mas salvar os outros dados (como users novos)
                    latestLocalData.schedules = currentCloudData.schedules;
                }
            }

            return latestLocalData;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error('Firebase (LogAgend): Erro na gravação transacional:', error);
            } else if (!committed) {
                console.log('Firebase (LogAgend): Gravação abortada (Trava de Segurança Anti-Wipe acionada).');
            } else {
                console.log('Firebase (LogAgend): Dados sincronizados com sucesso.');
            }
        });
    }
};

// Initialize as soon as script is parsed
FirebaseDB.init();

// Expor para o escopo global para que o Store.js consiga enxergar
window.FirebaseDB = FirebaseDB;
