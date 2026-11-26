/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDBwFeqKSBErhRakyXz5kHTbLL6h8qKqcE",
  authDomain: "threatshield-ai-e78b3.firebaseapp.com",
  projectId: "threatshield-ai-e78b3",
  storageBucket: "threatshield-ai-e78b3.firebasestorage.app",
  messagingSenderId: "262251978015",
  appId: "1:262251978015:web:1f570594cff5feab0c242a",
  measurementId: "G-7ZX0EL3NQF",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "ThreatShield Alert", {
    body: body || "Security alert received.",
    icon: "/vite.svg",
  });
});
