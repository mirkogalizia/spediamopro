import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAdl-rVdm0Jh0YHaNjiEqI8vEIGIqVLm7w",
  authDomain: "spediamopro-a4936.firebaseapp.com",
  projectId: "spediamopro-a4936",
  storageBucket: "spediamopro-a4936.appspot.com", // correggi se serve
  messagingSenderId: "922145834033",
  appId: "1:922145834033:web:6efec5bfaa9ac105f40110",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);