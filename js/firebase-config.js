// Firebase configuration for the online daily-challenge leaderboard.
//
// To enable the leaderboard:
//   1. Go to https://console.firebase.google.com and create a free project.
//   2. In the project, open "Build > Firestore Database" and create a database
//      (start in production mode, pick any region).
//   3. In Firestore "Rules", paste:
//        rules_version = '2';
//        service cloud.firestore {
//          match /databases/{database}/documents {
//            match /daily_scores/{date}/entries/{entryId} {
//              allow read: if true;
//              allow write: if request.resource.data.keys().hasAll(['name','score','timeMs','hearts','updatedAt'])
//                && request.resource.data.score is int
//                && request.resource.data.score >= 0 && request.resource.data.score <= 100000;
//            }
//          }
//        }
//   4. Go to Project settings > General > "Your apps" > Add app > Web,
//      register the app, and copy the config values into FIREBASE_CONFIG below.
//
// Leaving apiKey empty keeps the leaderboard hidden and the game fully
// playable offline — nothing else is affected.
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};
