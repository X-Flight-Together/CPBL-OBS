// Firebase initialization helper
// 1) Rename the placeholders below with your real Firebase config
// 2) Both pages include this file, so they share the same DB

(function () {
  const config = {
    apiKey: "AIzaSyA1xZqkVz7KnqvdT5kMcjC-UyXTduxX2KM",
    authDomain: "cpbl-livescore.firebaseapp.com",
    // If this URL is different in your Firebase console, replace it here
    databaseURL: "https://cpbl-livescore-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "cpbl-livescore",
    storageBucket: "cpbl-livescore.firebasestorage.app",
    messagingSenderId: "244509611991",
    appId: "1:244509611991:web:cff905f61eb3a268fc9d92",
  };

  function isConfigured(cfg) {
    return cfg && cfg.apiKey && !cfg.apiKey.startsWith("YOUR_");
  }

  window.ScoreboardFirebase = {
    getDb() {
      if (!isConfigured(config)) {
        alert("請先在 js/firebase.js 填入 Firebase 設定，才能進行遠端同步。");
        throw new Error("Firebase not configured");
      }
      // Allow URL override: append ?db=YOUR_DB_URL when visiting the page
      try {
        const params = new URLSearchParams(window.location.search);
        const override = params.get('db');
        if (override) {
          config.databaseURL = override;
          console.info('[Scoreboard] Using databaseURL override from query:', override);
        }
      } catch (_) { /* no-op */ }
      if (!firebase.apps.length) {
        firebase.initializeApp(config);
      }
      return firebase.database();
    },
    gameRef() {
      return this.getDb().ref("game");
    },
  };
})();


