/**
 * ClientFlow - Authentication Module
 * Manages user sign up, sign in, password reset, demo mode, and session persistence.
 */

window.ClientFlowAuth = {
  // Returns currently signed in user object or null
  getCurrentUser() {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      return firebase.auth().currentUser;
    }
    const raw = localStorage.getItem("clientflow_auth_user");
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { }
    }
    return null;
  },

  // Listen for authentication changes
  onAuthStateChanged(callback) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      return firebase.auth().onAuthStateChanged(async (firebaseUser) => {
        if (firebaseUser) {
          // Format standard user object
          const user = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
            isAnonymous: firebaseUser.isAnonymous,
            isDemo: false
          };
          callback(user);
        } else {
          callback(null);
        }
      });
    }

    // LocalStorage fallback for demo/offline mode
    const user = this.getCurrentUser();
    setTimeout(() => {
      callback(user);
    }, 50);

    // Event listener for storage changes across tabs
    window.addEventListener("storage", (e) => {
      if (e.key === "clientflow_auth_user") {
        const updated = e.newValue ? JSON.parse(e.newValue) : null;
        callback(updated);
      }
    });
  },

  // Sign up with Email and Password
  async signUp(email, password, displayName, businessName) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: displayName });
      // Create initial Firestore user profile
      await window.ClientFlowDB.saveSettings(cred.user.uid, {
        businessName: businessName || `${displayName}'s Business`,
        ownerName: displayName,
        email: email,
        plan: "free",
        createdAt: new Date().toISOString()
      });
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName,
        isDemo: false
      };
    }

    // Demo/LocalStorage Fallback
    const uid = "user-" + Math.random().toString(36).substring(2, 9);
    const user = {
      uid: uid,
      email: email,
      displayName: displayName || email.split("@")[0],
      businessName: businessName || `${displayName || "My"} Business`,
      isDemo: true
    };
    localStorage.setItem("clientflow_auth_user", JSON.stringify(user));
    await window.ClientFlowDB.saveSettings(uid, {
      businessName: user.businessName,
      ownerName: user.displayName,
      email: email,
      currency: "$",
      theme: "dark",
      plan: "free"
    });
    return user;
  },

  // Sign in with Email and Password
  async signIn(email, password) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
      return {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email.split("@")[0],
        isDemo: false
      };
    }

    // Demo/LocalStorage Fallback
    const user = {
      uid: "demo-user-123",
      email: email,
      displayName: email.split("@")[0],
      isDemo: true
    };
    localStorage.setItem("clientflow_auth_user", JSON.stringify(user));
    return user;
  },

  // Sign in with Google Popup
  async signInWithGoogle() {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await firebase.auth().signInWithPopup(provider);
      // Ensure initial Firestore user profile exists
      try {
        const existing = await window.ClientFlowDB.getSettings(result.user.uid);
        if (!existing || !existing.businessName) {
          await window.ClientFlowDB.saveSettings(result.user.uid, {
            businessName: `${result.user.displayName || "My"}'s Business`,
            ownerName: result.user.displayName || "Business Owner",
            email: result.user.email,
            currency: "$",
            theme: "dark",
            plan: "free",
            createdAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn("[ClientFlow] Profile setup warning on Google Sign-In:", e);
      }
      return {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        isDemo: false
      };
    }

    // Demo fallback for Google Sign-In
    const user = {
      uid: "demo-google-user",
      email: "demo.business@gmail.com",
      displayName: "Alex Morgan (Google)",
      isDemo: true
    };
    localStorage.setItem("clientflow_auth_user", JSON.stringify(user));
    return user;
  },

  // Instant 1-Click Demo Login (Pre-populated sample business)
  loginAsDemo() {
    const demoUser = {
      uid: "demo-user-123",
      email: "alex@summitcreative.com",
      displayName: "Alex Morgan",
      businessName: "Summit Creative & Services",
      isDemo: true
    };
    localStorage.setItem("clientflow_auth_user", JSON.stringify(demoUser));
    return demoUser;
  },

  // Send Password Reset Email
  async sendPasswordReset(email) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      await firebase.auth().sendPasswordResetEmail(email);
      return true;
    }
    // Demo simulation
    await new Promise((res) => setTimeout(res, 600));
    return true;
  },

  // Sign Out
  async signOut() {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && typeof firebase !== "undefined" && firebase.auth()) {
      await firebase.auth().signOut();
    }
    localStorage.removeItem("clientflow_auth_user");
    return true;
  },

  // Route Guard: Ensures access control on dashboard and auth pages
  protectRoute(requiresAuth = true) {
    this.onAuthStateChanged((user) => {
      const isAuthPage = window.location.pathname.endsWith("login.html") || 
                         window.location.pathname.endsWith("signup.html");
      const isDashboardPage = window.location.pathname.endsWith("dashboard.html");

      if (requiresAuth && !user && isDashboardPage) {
        window.location.href = "login.html";
      } else if (!requiresAuth && user && isAuthPage) {
        window.location.href = "dashboard.html";
      }
    });
  }
};
