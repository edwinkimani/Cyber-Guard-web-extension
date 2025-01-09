// Import the functions you need from the SDKs you need
const { initializeApp } = require('firebase/app');

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBp41pSWPUNkWR31qjoKjmZG3agtu305Uo",
  authDomain: "cyberguard-70c8e.firebaseapp.com",
  projectId: "cyberguard-70c8e",
  storageBucket: "cyberguard-70c8e.appspot.com",
  messagingSenderId: "377646083146",
  appId: "1:377646083146:web:9a31278689aa4c5fcf8ab3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//export
module.exports=app