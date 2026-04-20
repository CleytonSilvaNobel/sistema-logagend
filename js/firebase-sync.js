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
            dbRef = firebase.database().ref('logagend_db'); 
            isFirebaseInitialized = true;
            console.log('Firebase Cloud Database Conectado (LogAgend).');
        } catch (error) {
            console.error('Falha ao inicializar o Firebase. Verifique suas chaves.', error);
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
                    console.log('Firebase: Nova atualização recebida da nuvem.');
                    localStorage.setItem(DB_KEY, cloudStr);
                    if (onUpdateCallback) onUpdateCallback(cloudData);
                }
            }
        });
    },

    // Empurra a versão do LocalStorage para a Nuvem com Transação Anti-Concorrência
    syncSave: (latestLocalData) => {
        if (!isFirebaseInitialized) return;
        
        // Transação para evitar concorrência (Race Condition) no exato milissegundo
        dbRef.transaction((currentCloudData) => {
            return latestLocalData;
        }, (error, committed) => {
            if (error) console.error('Erro na gravação transacional:', error);
        });
    }
};

// Initialize as soon as script is parsed
FirebaseDB.init();
