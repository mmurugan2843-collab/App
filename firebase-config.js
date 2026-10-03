/**
 * ClientFlow - Firebase Configuration & Data Provider Adapter
 * 
 * Instructions:
 * 1. Go to Firebase Console (https://console.firebase.google.com/)
 * 2. Create a project and register a Web App
 * 3. Replace the placeholder values in the `firebaseConfig` object below,
 *    OR use the "Connect Firebase" button in the app dashboard.
 * 4. Enable Authentication (Email/Password & Google) and Cloud Firestore
 */

// ============================================================================
// YOUR CONFIGURATION HERE
// Replace placeholder values with your actual Firebase project settings
// ============================================================================
let firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// ============================================================================

// Check if credentials were saved dynamically via in-app Connect Firebase modal
try {
  const dynamicConfig = localStorage.getItem("clientflow_custom_firebase_config");
  if (dynamicConfig) {
    const parsed = JSON.parse(dynamicConfig);
    if (parsed && parsed.apiKey && parsed.apiKey !== "YOUR_API_KEY_HERE") {
      firebaseConfig = { ...firebaseConfig, ...parsed };
      console.log("[ClientFlow] Loaded custom Firebase configuration from local app storage.");
    }
  }
} catch (e) {
  console.warn("[ClientFlow] Error checking custom dynamic config:", e);
}

// Helper to save dynamic config from dashboard modal
window.saveDynamicFirebaseConfig = function (cfg) {
  localStorage.setItem("clientflow_custom_firebase_config", JSON.stringify(cfg));
  window.location.reload();
};

window.clearDynamicFirebaseConfig = function () {
  localStorage.removeItem("clientflow_custom_firebase_config");
  window.location.reload();
};

window.getCurrentFirebaseConfig = function () {
  return firebaseConfig;
};

// Detect if user has provided real Firebase credentials
const isConfigured = 
  firebaseConfig.apiKey !== "YOUR_API_KEY_HERE" && 
  firebaseConfig.apiKey.trim() !== "" &&
  !firebaseConfig.projectId.includes("YOUR_PROJECT_ID");

window.CLIENTFLOW_FIREBASE_ENABLED = isConfigured;

// Initialize Firebase if configured and SDK is present
let authInstance = null;
let dbInstance = null;

if (isConfigured && typeof firebase !== "undefined") {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    authInstance = firebase.auth();
    dbInstance = firebase.firestore();
    console.log("[ClientFlow] Firebase initialized successfully with live cloud backend:", firebaseConfig.projectId);
  } catch (err) {
    console.warn("[ClientFlow] Failed to initialize live Firebase, falling back to LocalStorage adapter:", err);
    window.CLIENTFLOW_FIREBASE_ENABLED = false;
  }
} else {
  console.log("[ClientFlow] Running in Demo/LocalStorage mode. Connect Firebase in firebase-config.js or via the Connect Firebase button.");
}

// ----------------------------------------------------------------------------
// LocalStorage Fallback Adapter (for instant demonstration without setup)
// ----------------------------------------------------------------------------
const DEMO_STORAGE_KEY = "clientflow_data_v1";
const DEMO_AUTH_KEY = "clientflow_auth_user";

function getLocalData() {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch (e) { }
  }
  // Initial realistic sample data for small businesses
  const initial = {
    customers: [
      {
        id: "cust-1",
        userId: "demo-user-123",
        name: "Elena Rostova",
        business: "Luxe Interior Design",
        email: "elena@luxeinterior.com",
        phone: "+1 (555) 234-8901",
        source: "Instagram",
        status: "Interested",
        notes: "Requested a quote for complete 3-bedroom renovation. High budget, looking to start next month.",
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: "cust-2",
        userId: "demo-user-123",
        name: "Marcus Vance",
        business: "Vance Auto Detailing",
        email: "marcus@vancedetail.com",
        phone: "+1 (555) 456-7890",
        source: "Referral",
        status: "Customer",
        notes: "Booked monthly commercial fleet cleaning package. Prefers text message reminders.",
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: "cust-3",
        userId: "demo-user-123",
        name: "Sophia Chen",
        business: "Chen Tutoring Academy",
        email: "sophia@chentutoring.org",
        phone: "+1 (555) 678-1234",
        source: "Google Search",
        status: "New",
        notes: "Inquired via website form about private SAT/ACT math coaching for high school student.",
        createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: "cust-4",
        userId: "demo-user-123",
        name: "David Kim",
        business: "Kim's Artisan Bakery",
        email: "david@kimbakery.com",
        phone: "+1 (555) 789-5678",
        source: "Walk-in",
        status: "Contacted",
        notes: "Discussed custom wedding cake and dessert table catering for 150 guests in October.",
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: "cust-5",
        userId: "demo-user-123",
        name: "Rachel Green",
        business: "Green Oasis Spa",
        email: "rachel@greenoasis.com",
        phone: "+1 (555) 890-4321",
        source: "Facebook",
        status: "Not interested",
        notes: "Postponed opening till Q2 next year due to lease negotiations.",
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString()
      }
    ],
    followups: [
      {
        id: "fu-1",
        userId: "demo-user-123",
        customerId: "cust-1",
        customerName: "Elena Rostova",
        date: new Date().toISOString().split("T")[0], // Today
        time: "14:00",
        notes: "Send revised proposal with tiered material selections and 3D renderings.",
        priority: "High",
        status: "Pending",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "fu-2",
        userId: "demo-user-123",
        customerId: "cust-3",
        customerName: "Sophia Chen",
        date: new Date().toISOString().split("T")[0], // Today
        time: "16:30",
        notes: "Quick check-in call to confirm schedule availability for trial diagnostic session.",
        priority: "Medium",
        status: "Pending",
        completed: false,
        createdAt: new Date().toISOString()
      },
      {
        id: "fu-3",
        userId: "demo-user-123",
        customerId: "cust-4",
        customerName: "David Kim",
        date: new Date(Date.now() - 86400000).toISOString().split("T")[0], // Overdue (Yesterday)
        time: "11:00",
        notes: "Follow up regarding cake flavor tasting box confirmation.",
        priority: "High",
        status: "Pending",
        completed: false,
        createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: "fu-4",
        userId: "demo-user-123",
        customerId: "cust-2",
        customerName: "Marcus Vance",
        date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0], // Upcoming
        time: "10:00",
        notes: "Deliver quarterly service invoice and check satisfaction on ceramic coating.",
        priority: "Low",
        status: "Pending",
        completed: false,
        createdAt: new Date().toISOString()
      }
    ],
    appointments: [
      {
        id: "apt-1",
        userId: "demo-user-123",
        customerId: "cust-1",
        customerName: "Elena Rostova",
        date: new Date().toISOString().split("T")[0], // Today
        time: "15:00",
        service: "On-site Design Consultation",
        notes: "Bring color swatches, laser measurement tool, and portfolio binder.",
        status: "Confirmed",
        createdAt: new Date().toISOString()
      },
      {
        id: "apt-2",
        userId: "demo-user-123",
        customerId: "cust-2",
        customerName: "Marcus Vance",
        date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
        time: "09:30",
        service: "Fleet Inspection",
        notes: "Review van interiors at depot location.",
        status: "Scheduled",
        createdAt: new Date().toISOString()
      }
    ],
    settings: {
      businessName: "Summit Creative & Services",
      ownerName: "Alex Morgan",
      email: "alex@summitcreative.com",
      phone: "+1 (555) 800-4321",
      currency: "$",
      theme: "dark",
      plan: "free"
    }
  };
  saveLocalData(initial);
  return initial;
}

function saveLocalData(data) {
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
}

// Unified client interface exported to window
window.ClientFlowDB = {
  isLive: isConfigured,
  
  async getCustomers(userId) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const snap = await dbInstance.collection("customers").where("userId", "==", userId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const data = getLocalData();
    return data.customers.filter(c => c.userId === userId || (!c.userId && userId === "demo-user-123"));
  },

  async addCustomer(customer) {
    const dataToSave = {
      ...customer,
      createdAt: customer.createdAt || new Date().toISOString()
    };
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const ref = await dbInstance.collection("customers").add(dataToSave);
      return { id: ref.id, ...dataToSave };
    }
    const data = getLocalData();
    const id = "cust-" + Date.now();
    const created = { id, ...dataToSave };
    data.customers.unshift(created);
    saveLocalData(data);
    return created;
  },

  async updateCustomer(id, updates) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("customers").doc(id).update(updates);
      return { id, ...updates };
    }
    const data = getLocalData();
    const idx = data.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      data.customers[idx] = { ...data.customers[idx], ...updates };
      saveLocalData(data);
    }
    return { id, ...updates };
  },

  async deleteCustomer(id) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("customers").doc(id).delete();
      try {
        const fuSnap = await dbInstance.collection("followups").where("customerId", "==", id).get();
        const batch = dbInstance.batch();
        fuSnap.docs.forEach(doc => batch.delete(doc.ref));
        const aptSnap = await dbInstance.collection("appointments").where("customerId", "==", id).get();
        aptSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      } catch (e) {
        console.warn("[ClientFlow] Cascading delete warning:", e);
      }
      return true;
    }
    const data = getLocalData();
    data.customers = data.customers.filter(c => c.id !== id);
    // Also delete associated follow-ups & appointments
    data.followups = data.followups.filter(f => f.customerId !== id);
    data.appointments = data.appointments.filter(a => a.customerId !== id);
    saveLocalData(data);
    return true;
  },

  async getFollowups(userId) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const snap = await dbInstance.collection("followups").where("userId", "==", userId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const data = getLocalData();
    return data.followups.filter(f => f.userId === userId || !f.userId || userId === "demo-user-123");
  },

  async addFollowup(followup) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const ref = await dbInstance.collection("followups").add(followup);
      return { id: ref.id, ...followup };
    }
    const data = getLocalData();
    const id = "fu-" + Date.now();
    const created = { id, ...followup, createdAt: followup.createdAt || new Date().toISOString() };
    data.followups.unshift(created);
    saveLocalData(data);
    return created;
  },

  async updateFollowup(id, updates) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("followups").doc(id).update(updates);
      return { id, ...updates };
    }
    const data = getLocalData();
    const idx = data.followups.findIndex(f => f.id === id);
    if (idx !== -1) {
      data.followups[idx] = { ...data.followups[idx], ...updates };
      saveLocalData(data);
    }
    return { id, ...updates };
  },

  async deleteFollowup(id) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("followups").doc(id).delete();
      return true;
    }
    const data = getLocalData();
    data.followups = data.followups.filter(f => f.id !== id);
    saveLocalData(data);
    return true;
  },

  async getAppointments(userId) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const snap = await dbInstance.collection("appointments").where("userId", "==", userId).get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    const data = getLocalData();
    return data.appointments.filter(a => a.userId === userId || !a.userId || userId === "demo-user-123");
  },

  async addAppointment(appointment) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const ref = await dbInstance.collection("appointments").add(appointment);
      return { id: ref.id, ...appointment };
    }
    const data = getLocalData();
    const id = "apt-" + Date.now();
    const created = { id, ...appointment, createdAt: appointment.createdAt || new Date().toISOString() };
    data.appointments.unshift(created);
    saveLocalData(data);
    return created;
  },

  async updateAppointment(id, updates) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("appointments").doc(id).update(updates);
      return { id, ...updates };
    }
    const data = getLocalData();
    const idx = data.appointments.findIndex(a => a.id === id);
    if (idx !== -1) {
      data.appointments[idx] = { ...data.appointments[idx], ...updates };
      saveLocalData(data);
    }
    return { id, ...updates };
  },

  async deleteAppointment(id) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("appointments").doc(id).delete();
      return true;
    }
    const data = getLocalData();
    data.appointments = data.appointments.filter(a => a.id !== id);
    saveLocalData(data);
    return true;
  },

  async getSettings(userId) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      const doc = await dbInstance.collection("users").doc(userId).get();
      if (doc.exists) return doc.data();
    }
    const data = getLocalData();
    return data.settings || {};
  },

  async saveSettings(userId, settings) {
    if (window.CLIENTFLOW_FIREBASE_ENABLED && dbInstance) {
      await dbInstance.collection("users").doc(userId).set(settings, { merge: true });
      return settings;
    }
    const data = getLocalData();
    data.settings = { ...data.settings, ...settings };
    saveLocalData(data);
    return data.settings;
  }
};
