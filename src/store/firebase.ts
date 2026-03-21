import { initializeApp, getApp, getApps } from 'firebase/app'
import { getFirestore, initializeFirestore, persistentLocalCache, doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore'
import type { StateStorage } from 'zustand/middleware'

// Remplace ceci par la config générée par Firebase à l'étape 1
const firebaseConfig = {
  apiKey: "AIzaSyC7W_qVVlJX-AEQY0W5qSE7Bzj-3VS419Y",
  authDomain: "aetheris-ef887.firebaseapp.com",
  projectId: "aetheris-ef887",
  storageBucket: "aetheris-ef887.firebasestorage.app",
  messagingSenderId: "593636088449",
  appId: "1:593636088449:web:427d8656466f68212d8b80",
  measurementId: "G-QB3V8GBSCZ"
}

console.log('[Firebase] 🔧 Configuration de démarrage :', {
  ...firebaseConfig,
  apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 8)}...` : undefined
})

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

// Initialise Firestore avec un cache local persistant (IndexedDB)
// Permet l'utilisation 100% hors-ligne avec synchronisation auto au retour d'internet
export const db = getApps().length > 0 
  ? getFirestore(app) 
  : initializeFirestore(app, {
      localCache: persistentLocalCache(),
      experimentalForceLongPolling: true
    })

console.log('[Firebase] 📡 Lancement du test de connexion onSnapshot...')
try {
  onSnapshot(
    collection(db, 'aetheris_stores'),
    (snapshot) => {
      console.log('[Firebase] 🟢 Test onSnapshot réussi ! Documents trouvés :', snapshot.size)
    },
    (error) => {
      console.error('[Firebase] 🔴 Erreur détaillée onSnapshot :', error)
    }
  )
} catch (error) {
  console.error('[Firebase] 🔴 Erreur critique lors de l\'initialisation du test :', error)
}

// Adaptateur sur-mesure pour Zustand
export const firestoreStorage: StateStorage = {
  getItem: async (name) => {
    try {
      const snap = await getDoc(doc(db, 'aetheris_stores', name))
      
      if (snap.exists()) {
        console.log(`[Firebase] 🟢 Lecture réussie pour le store : ${name}`)
        return snap.data()?.value ?? null
      }

      const localData = window.localStorage.getItem(name)
      if (localData) {
        await setDoc(doc(db, 'aetheris_stores', name), { value: localData }, { merge: true })
        console.log('Migration Cloud terminée avec succès')
        return localData
      }

      return null
    } catch (error) {
      console.error(`[Firebase] 🔴 Erreur de lecture pour ${name} :`, error)
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await setDoc(doc(db, 'aetheris_stores', name), { value }, { merge: true })
      console.log(`[Firebase] 🟢 Écriture réussie pour le store : ${name}`)
    } catch (error) {
      console.error(`[Firebase] 🔴 Erreur d'écriture pour ${name} :`, error)
    }
  },
  removeItem: async (name) => {
    // Optionally remove from Firestore in the future
    console.log(`[Firebase] removeItem called for store: ${name} (not implemented)`)
  }
}