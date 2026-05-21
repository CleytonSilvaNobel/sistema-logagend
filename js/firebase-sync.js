/**
 * Firebase Sync Controller for LogAgend
 * ProteÃ§Ã£o AvanÃ§ada contra Perda de Dados
 */

const firebaseConfig = {
    apiKey: "AIzaSyCNvK23xN1hjRxD1dDaoW-uK2dyeqJzEgk",
    authDomain: "nobelpack-systems-2.firebaseapp.com",
    databaseURL: "https://nobelpack-systems-2-default-rtdb.firebaseio.com",
    projectId: "nobelpack-systems-2",
    storageBucket: "nobelpack-systems-2.firebasestorage.app",
    messagingSenderId: "736419755079",
    appId: "1:736419755079:web:5d3f1292252331fbc7ad62",
    measurementId: "G-7NB3625L3H"
};

let dbRef = null;
let isFirebaseInitialized = false;
let isDataLoaded = false; // Trava de seguranÃ§a crucial

const FirebaseDB = {
    init: () => {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            dbRef = firebase.database().ref('delivery_system_db'); 
            isFirebaseInitialized = true;
            console.log('Firebase Cloud Database Conectado (LogAgend).');
        } catch (error) {
            console.error('Falha ao inicializar o Firebase:', error);
        }
    },

    // Carregamento inicial obrigatÃ³rio
    syncLoad: async () => {
        if (!isFirebaseInitialized) return null;
        const DB_KEY = 'delivery_system_db';
        try {
            console.log('Firebase (LogAgend): Sincronizando entrada...');
            const snapshot = await dbRef.once('value');
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                localStorage.setItem(DB_KEY, JSON.stringify(cloudData));
                
                isDataLoaded = true; // Liberar gravaÃ§Ã£o
                console.log('Firebase (LogAgend): Dados carregados. SincronizaÃ§Ã£o de saÃ­da liberada.');
                return cloudData;
            } else {
                isDataLoaded = true; // Nuvem vazia Ã© vÃ¡lido
                console.log('Firebase (LogAgend): Nuvem vazia.');
                return null;
            }
        } catch (error) {
            console.error('Firebase (LogAgend): Erro no syncLoad:', error);
            return null;
        }
    },

    // Monitoramento em tempo real
    listen: (onUpdateCallback) => {
        if (!isFirebaseInitialized) return;
        const DB_KEY = 'delivery_system_db';
        
        dbRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const cloudData = snapshot.val();
                const localStr = localStorage.getItem(DB_KEY);
                const cloudStr = JSON.stringify(cloudData);
                
                if (localStr !== cloudStr) {
                    console.log('Firebase (LogAgend): AtualizaÃ§Ã£o em tempo real recebida.');
                    localStorage.setItem(DB_KEY, cloudStr);
                    isDataLoaded = true;
                    if (onUpdateCallback) onUpdateCallback(cloudData);
                }
            } else {
                isDataLoaded = true;
            }
        });
    },

    // GravaÃ§Ã£o segura na nuvem
    syncSave: (latestLocalData, isManualWipe = false) => {
        if (!isFirebaseInitialized) return;
        
        // SEGURANÃ‡A: Bloqueia salvamento automÃ¡tico se ainda nÃ£o houve carregamento bem sucedido
        if (!isDataLoaded && !isManualWipe) {
            console.warn('Firebase (LogAgend): syncSave BLOQUEADO. Aguardando syncLoad inicial.');
            return;
        }
        
        dbRef.transaction((currentCloudData) => {
            if (currentCloudData && !isManualWipe) {
                const cloudSchedules = currentCloudData.schedules ? currentCloudData.schedules.length : 0;
                const localSchedules = latestLocalData.schedules ? latestLocalData.schedules.length : 0;
                
                // Trava Anti-Wipe: Se a nuvem tem dados e o local nÃ£o, recusa a gravaÃ§Ã£o dos agendamentos
                if (cloudSchedules > 0 && localSchedules === 0) {
                    console.warn('SAFETY LOCK (LogAgend): Bloqueada tentativa de apagar agendamentos da nuvem.');
                    latestLocalData.schedules = currentCloudData.schedules;
                }
                
                // ProteÃ§Ã£o contra perda massiva de dados (ex: local tem menos que 50% da nuvem)
                if (cloudSchedules > 20 && localSchedules < (cloudSchedules / 2)) {
                    console.warn(`SAFETY LOCK (LogAgend): Perda massiva detectada (Nuvem: ${cloudSchedules}, Local: ${localSchedules}). Abortando syncSave.`);
                    return; // Aborta transaÃ§Ã£o
                }
            }

            return latestLocalData;
        }, (error, committed) => {
            if (error) console.error('Firebase (LogAgend) Erro Sync:', error);
            else if (!committed) console.log('Firebase (LogAgend) Sync Protegido.');
            else console.log('Firebase (LogAgend) Cloud Sincronizada.');
        });
    }
};

FirebaseDB.init();
window.FirebaseDB = FirebaseDB;
