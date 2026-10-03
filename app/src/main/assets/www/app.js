/**
 * ClientFlow - Core Application Logic
 * Customer Management, Follow-ups, Appointments, Analytics, AI Generator & CSV Export
 */

(function () {
  "use strict";

  // Application State
  const state = {
    user: null,
    customers: [],
    followups: [],
    appointments: [],
    settings: {
      businessName: "My Business",
      ownerName: "Business Owner",
      currency: "$",
      theme: "dark",
      plan: "free"
    },
    activeTab: "overview",
    searchQuery: "",
    statusFilter: "all",
    sourceFilter: "all",
    followupFilter: "all",
    selectedCustomer: null
  };

  // Helper: Format Date
  function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  // Helper: Get Today's YYYY-MM-DD
  function getTodayString() {
    return new Date().toISOString().split("T")[0];
  }

  // Helper: Toast Notifications
  function showToast(message, type = "success") {
    let container = document.getElementById("toastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "toastContainer";
      container.className = "toast-container";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon = type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
  window.showToast = showToast;

  // Initialize App
  async function init() {
    // Auth Listener
    window.ClientFlowAuth.onAuthStateChanged(async (user) => {
      if (!user) {
        // If on dashboard and not authenticated, route guard will redirect
        return;
      }
      state.user = user;
      updateUserUI();
      await loadAllData();
      setupEventListeners();
      renderCurrentTab();
      setupRealtimeDemoBanner();
    });
  }

  // Update Topbar and Sidebar User Info
  function updateUserUI() {
    const nameEl = document.getElementById("headerUserName");
    const subEl = document.getElementById("headerUserSub");
    const avatarEl = document.getElementById("headerUserAvatar");
    const bizEl = document.getElementById("sidebarBusinessName");

    const displayName = state.user.displayName || state.user.email.split("@")[0];
    if (nameEl) nameEl.textContent = displayName;
    if (subEl) subEl.textContent = state.user.email;
    if (avatarEl) avatarEl.textContent = (displayName[0] || "U").toUpperCase();
    if (bizEl) bizEl.textContent = state.settings.businessName || "ClientFlow";
  }

  // Show banner if running in local demo storage
  function setupRealtimeDemoBanner() {
    const banner = document.getElementById("demoModeBanner");
    if (!banner) return;
    if (!window.CLIENTFLOW_FIREBASE_ENABLED) {
      banner.style.display = "flex";
    } else {
      banner.style.display = "none";
    }
  }

  // Load all user data from Firestore or LocalStorage
  async function loadAllData() {
    if (!state.user) return;
    try {
      const [customers, followups, appointments, settings] = await Promise.all([
        window.ClientFlowDB.getCustomers(state.user.uid),
        window.ClientFlowDB.getFollowups(state.user.uid),
        window.ClientFlowDB.getAppointments(state.user.uid),
        window.ClientFlowDB.getSettings(state.user.uid)
      ]);

      state.customers = customers || [];
      state.followups = followups || [];
      state.appointments = appointments || [];
      state.settings = { ...state.settings, ...(settings || {}) };

      // Apply saved theme
      if (state.settings.theme) {
        document.documentElement.setAttribute("data-theme", state.settings.theme);
      }

      updateUserUI();
      updateNavigationCounts();
    } catch (err) {
      console.error("[ClientFlow] Error loading data:", err);
      showToast("Error loading business records", "error");
    }
  }

  // Update badge counters on navigation
  function updateNavigationCounts() {
    const today = getTodayString();
    const dueFollowups = state.followups.filter(f => !f.completed && f.date <= today).length;
    const dueBadge = document.getElementById("navCountFollowups");
    if (dueBadge) dueBadge.textContent = dueFollowups > 0 ? dueFollowups : "";

    const todayApts = state.appointments.filter(a => a.date === today && a.status !== "Cancelled").length;
    const aptBadge = document.getElementById("navCountAppointments");
    if (aptBadge) aptBadge.textContent = todayApts > 0 ? todayApts : "";
  }

  // Tab Navigation Handling
  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".mobile-nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
      const titles = {
        overview: "Dashboard Overview",
        customers: "Customer Management",
        followups: "Follow-up System",
        appointments: "Appointments & Schedule",
        analytics: "Business Analytics",
        ai: "AI Message Generator",
        settings: "Business Settings"
      };
      titleEl.textContent = titles[tabName] || "Dashboard";
    }
    renderCurrentTab();
  }

  function renderCurrentTab() {
    const sections = ["overview", "customers", "followups", "appointments", "analytics", "ai", "settings"];
    sections.forEach(sec => {
      const el = document.getElementById(`tab-${sec}`);
      if (el) el.style.display = sec === state.activeTab ? "block" : "none";
    });

    if (state.activeTab === "overview") renderOverview();
    else if (state.activeTab === "customers") renderCustomers();
    else if (state.activeTab === "followups") renderFollowups();
    else if (state.activeTab === "appointments") renderAppointments();
    else if (state.activeTab === "analytics") renderAnalytics();
    else if (state.activeTab === "ai") renderAITool();
    else if (state.activeTab === "settings") renderSettings();
  }

  // --------------------------------------------------------------------------
  // 1. OVERVIEW DASHBOARD
  // --------------------------------------------------------------------------
  function renderOverview() {
    const today = getTodayString();
    
    // Calculate KPIs
    const totalCustomers = state.customers.length;
    const newLeads = state.customers.filter(c => c.status === "New").length;
    const followupsDueToday = state.followups.filter(f => !f.completed && f.date === today).length;
    const followupsOverdue = state.followups.filter(f => !f.completed && f.date < today).length;
    const appointmentsToday = state.appointments.filter(a => a.date === today && a.status !== "Cancelled").length;

    // Update KPI Card UI
    const totalEl = document.getElementById("statTotalCustomers");
    if (totalEl) totalEl.textContent = totalCustomers;
    const leadsEl = document.getElementById("statNewLeads");
    if (leadsEl) leadsEl.textContent = newLeads;
    const dueEl = document.getElementById("statDueToday");
    if (dueEl) dueEl.textContent = followupsDueToday;
    const overdueEl = document.getElementById("statOverdue");
    if (overdueEl) overdueEl.textContent = followupsOverdue;
    const aptEl = document.getElementById("statAppointmentsToday");
    if (aptEl) aptEl.textContent = appointmentsToday;

    // Render Urgent Follow-ups Preview List (Overdue + Today)
    const urgentFollowups = state.followups
      .filter(f => !f.completed && f.date <= today)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 5);

    const urgentContainer = document.getElementById("overviewUrgentFollowups");
    if (urgentContainer) {
      if (urgentFollowups.length === 0) {
        urgentContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🎉</div>
            <div class="empty-title">All caught up!</div>
            <div class="empty-subtitle">You have no pending follow-ups due today or overdue.</div>
          </div>`;
      } else {
        urgentContainer.innerHTML = urgentFollowups.map(f => {
          const isOverdue = f.date < today;
          return `
            <div class="item-card">
              <div class="item-left">
                <input type="checkbox" onchange="window.completeFollowup('${f.id}')" style="width: 18px; height: 18px; accent-color: var(--primary); cursor: pointer;" title="Mark as completed">
                <div class="item-details">
                  <h5>${escapeHTML(f.customerName)}</h5>
                  <p>${escapeHTML(f.notes || "No notes provided")}</p>
                  <div class="item-meta">
                    <span class="badge ${isOverdue ? 'badge-high' : 'badge-contacted'}">${isOverdue ? 'Overdue: ' + f.date : 'Today at ' + (f.time || 'flexible')}</span>
                    <span class="badge badge-${(f.priority || 'medium').toLowerCase()}">${f.priority || 'Medium'}</span>
                  </div>
                </div>
              </div>
              <div class="item-actions">
                <button class="btn btn-secondary btn-sm" onclick="window.openCustomerDetails('${f.customerId}')">View</button>
              </div>
            </div>`;
        }).join("");
      }
    }

    // Render Recent Customers Preview List
    const recentCustomers = [...state.customers]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    const recentContainer = document.getElementById("overviewRecentCustomers");
    if (recentContainer) {
      if (recentCustomers.length === 0) {
        recentContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <div class="empty-title">No customers yet</div>
            <div class="empty-subtitle">Add your first lead or customer to start tracking conversations.</div>
            <button class="btn btn-primary btn-sm" onclick="window.openCustomerModal()">+ Add Customer</button>
          </div>`;
      } else {
        recentContainer.innerHTML = `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentCustomers.map(c => `
                  <tr>
                    <td>
                      <div class="customer-cell-main">${escapeHTML(c.name)}</div>
                      <div class="customer-cell-sub">${escapeHTML(c.business || c.email || c.phone || "")}</div>
                    </td>
                    <td><span class="badge badge-${formatStatusBadge(c.status)}">${escapeHTML(c.status)}</span></td>
                    <td class="customer-cell-sub">${escapeHTML(c.source || "Direct")}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="window.openCustomerDetails('${c.id}')">Details</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>`;
      }
    }
  }

  // --------------------------------------------------------------------------
  // 2. CUSTOMER MANAGEMENT
  // --------------------------------------------------------------------------
  function renderCustomers() {
    const listContainer = document.getElementById("customerTableBody");
    const countEl = document.getElementById("customerFilterCount");
    if (!listContainer) return;

    // Filter logic
    let filtered = state.customers.filter(c => {
      const matchSearch = 
        !state.searchQuery ||
        (c.name && c.name.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
        (c.email && c.email.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
        (c.phone && c.phone.includes(state.searchQuery)) ||
        (c.business && c.business.toLowerCase().includes(state.searchQuery.toLowerCase()));

      const matchStatus = state.statusFilter === "all" || c.status.toLowerCase() === state.statusFilter.toLowerCase();
      const matchSource = state.sourceFilter === "all" || (c.source && c.source.toLowerCase() === state.sourceFilter.toLowerCase());

      return matchSearch && matchStatus && matchSource;
    });

    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${state.customers.length} records`;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state">
              <div class="empty-icon">🔍</div>
              <div class="empty-title">No matching customers found</div>
              <div class="empty-subtitle">Try adjusting your search criteria or add a new customer.</div>
              <button class="btn btn-primary btn-sm" onclick="window.openCustomerModal()">+ Add Customer</button>
            </div>
          </td>
        </tr>`;
      return;
    }

    listContainer.innerHTML = filtered.map(c => `
      <tr>
        <td>
          <div class="customer-cell-main">${escapeHTML(c.name)}</div>
          <div class="customer-cell-sub">${escapeHTML(c.business || "Individual")}</div>
        </td>
        <td>
          <div>${escapeHTML(c.phone || "-")}</div>
          <div class="customer-cell-sub">${escapeHTML(c.email || "-")}</div>
        </td>
        <td><span class="badge badge-${formatStatusBadge(c.status)}">${escapeHTML(c.status)}</span></td>
        <td><span class="badge" style="background-color: var(--bg-surface-elevated); color: var(--text-muted);">${escapeHTML(c.source || "Unknown")}</span></td>
        <td class="customer-cell-sub">${formatDate(c.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="window.openCustomerDetails('${c.id}')" title="View Details">View</button>
            <button class="btn btn-secondary btn-sm" onclick="window.openCustomerModal('${c.id}')" title="Edit">✎</button>
            <button class="btn btn-danger btn-sm" onclick="window.confirmDeleteCustomer('${c.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `).join("");
  }

  // --------------------------------------------------------------------------
  // 3. FOLLOW-UP SYSTEM
  // --------------------------------------------------------------------------
  function renderFollowups() {
    const container = document.getElementById("followupsListContainer");
    if (!container) return;

    const today = getTodayString();
    let items = [...state.followups];

    // Filter by Tab/Category
    if (state.followupFilter === "today") {
      items = items.filter(f => !f.completed && f.date === today);
    } else if (state.followupFilter === "overdue") {
      items = items.filter(f => !f.completed && f.date < today);
    } else if (state.followupFilter === "upcoming") {
      items = items.filter(f => !f.completed && f.date > today);
    } else if (state.followupFilter === "completed") {
      items = items.filter(f => f.completed);
    } else {
      // Default: Active follow-ups
      items = items.filter(f => !f.completed);
    }

    items.sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No follow-ups in this view</div>
          <div class="empty-subtitle">Stay top of mind with your prospects by scheduling follow-up reminders.</div>
          <button class="btn btn-primary btn-sm" onclick="window.openFollowupModal()">+ Schedule Follow-up</button>
        </div>`;
      return;
    }

    container.innerHTML = items.map(f => {
      const isOverdue = !f.completed && f.date < today;
      const isToday = !f.completed && f.date === today;
      let dateBadge = `<span class="badge ${isOverdue ? 'badge-high' : isToday ? 'badge-contacted' : 'badge-new'}">${isOverdue ? 'Overdue: ' + f.date : isToday ? 'Due Today' : f.date}</span>`;
      if (f.time) dateBadge += ` <span class="customer-cell-sub">at ${f.time}</span>`;

      return `
        <div class="item-card ${f.completed ? 'completed' : ''}">
          <div class="item-left">
            <input type="checkbox" ${f.completed ? 'checked' : ''} onchange="window.toggleFollowupStatus('${f.id}', this.checked)" style="width: 20px; height: 20px; accent-color: var(--primary); cursor: pointer;" title="Toggle Completion">
            <div class="item-details">
              <h5>${escapeHTML(f.customerName)}</h5>
              <p>${escapeHTML(f.notes || "No notes")}</p>
              <div class="item-meta">
                ${dateBadge}
                <span class="badge badge-${(f.priority || 'medium').toLowerCase()}">${f.priority || 'Medium'}</span>
              </div>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.openAIToolForCustomer('${f.customerId}')" title="Write AI Message">⚡ AI Reply</button>
            <button class="btn btn-secondary btn-sm" onclick="window.openFollowupModal('${f.id}')">✎</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteFollowup('${f.id}')">🗑</button>
          </div>
        </div>`;
    }).join("");
  }

  // --------------------------------------------------------------------------
  // 4. APPOINTMENT SYSTEM
  // --------------------------------------------------------------------------
  function renderAppointments() {
    const container = document.getElementById("appointmentsListContainer");
    if (!container) return;

    const today = getTodayString();
    const sorted = [...state.appointments].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📅</div>
          <div class="empty-title">No appointments scheduled</div>
          <div class="empty-subtitle">Keep your calendar organized by logging customer appointments and consultations.</div>
          <button class="btn btn-primary btn-sm" onclick="window.openAppointmentModal()">+ New Appointment</button>
        </div>`;
      return;
    }

    container.innerHTML = sorted.map(a => {
      const isPast = a.date < today;
      return `
        <div class="item-card ${isPast ? 'completed' : ''}">
          <div class="item-left">
            <div style="font-size: 24px; color: var(--accent);">🗓️</div>
            <div class="item-details">
              <h5>${escapeHTML(a.service || "Appointment")} - <span style="font-weight: 500;">${escapeHTML(a.customerName)}</span></h5>
              <p>${escapeHTML(a.notes || "No additional notes")}</p>
              <div class="item-meta">
                <span class="badge badge-new">${a.date}</span>
                <span class="customer-cell-sub">${a.time || "Time not specified"}</span>
                <span class="badge badge-${a.status === 'Confirmed' ? 'interested' : a.status === 'Cancelled' ? 'not-interested' : 'contacted'}">${a.status}</span>
              </div>
            </div>
          </div>
          <div class="item-actions">
            <button class="btn btn-secondary btn-sm" onclick="window.openAppointmentModal('${a.id}')">✎ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="window.deleteAppointment('${a.id}')">🗑</button>
          </div>
        </div>`;
    }).join("");
  }

  // --------------------------------------------------------------------------
  // 5. BUSINESS ANALYTICS
  // --------------------------------------------------------------------------
  function renderAnalytics() {
    const total = state.customers.length;
    const customersCount = state.customers.filter(c => c.status === "Customer").length;
    const leadsCount = state.customers.filter(c => ["New", "Contacted", "Interested"].includes(c.status)).length;
    const convRate = total > 0 ? Math.round((customersCount / total) * 100) : 0;

    const totalFollowups = state.followups.length;
    const completedFollowups = state.followups.filter(f => f.completed).length;
    const completionRate = totalFollowups > 0 ? Math.round((completedFollowups / totalFollowups) * 100) : 0;

    const convEl = document.getElementById("analyticsConversionRate");
    if (convEl) convEl.textContent = `${convRate}%`;

    const compEl = document.getElementById("analyticsFollowupRate");
    if (compEl) compEl.textContent = `${completionRate}%`;

    const totalCustEl = document.getElementById("analyticsCustomersWon");
    if (totalCustEl) totalCustEl.textContent = customersCount;

    // Draw Status Breakdown Donut on Canvas
    drawStatusDonutChart();
    // Draw Acquisition Bar Chart on Canvas
    drawAcquisitionBarChart();
  }

  function drawStatusDonutChart() {
    const canvas = document.getElementById("analyticsDonutCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const counts = {
      "New": 0,
      "Contacted": 0,
      "Interested": 0,
      "Customer": 0,
      "Not interested": 0
    };
    state.customers.forEach(c => {
      if (counts[c.status] !== undefined) counts[c.status]++;
      else counts["New"]++;
    });

    const colors = {
      "New": "#6366f1",
      "Contacted": "#f59e0b",
      "Interested": "#10b981",
      "Customer": "#06b6d4",
      "Not interested": "#64748b"
    };

    const total = state.customers.length || 1;
    let startAngle = -0.5 * Math.PI;
    const centerX = width / 2 - 50;
    const centerY = height / 2;
    const radius = 65;
    const innerRadius = 42;

    Object.entries(counts).forEach(([status, count]) => {
      const sliceAngle = (count / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[status];
      ctx.fill();
      startAngle += sliceAngle;
    });

    // Draw Legend on the right side
    let legendY = 35;
    const legendX = width / 2 + 35;
    ctx.font = "12px sans-serif";
    Object.entries(counts).forEach(([status, count]) => {
      ctx.fillStyle = colors[status];
      ctx.fillRect(legendX, legendY, 10, 10);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText(`${status} (${count})`, legendX + 16, legendY + 9);
      legendY += 24;
    });
  }

  function drawAcquisitionBarChart() {
    const canvas = document.getElementById("analyticsBarCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const sources = {};
    state.customers.forEach(c => {
      const src = c.source || "Direct";
      sources[src] = (sources[src] || 0) + 1;
    });

    const labels = Object.keys(sources).slice(0, 5);
    const data = labels.map(l => sources[l]);
    const maxVal = Math.max(...data, 5);

    const chartHeight = height - 60;
    const chartWidth = width - 40;
    const barWidth = Math.min(36, chartWidth / (labels.length || 1) - 16);

    ctx.font = "11px sans-serif";
    labels.forEach((label, i) => {
      const val = data[i];
      const barHeight = (val / maxVal) * (chartHeight - 30);
      const x = 30 + i * ((chartWidth - 20) / labels.length) + 10;
      const y = height - 35 - barHeight;

      // Draw Bar
      ctx.fillStyle = "#4f46e5";
      ctx.fillRect(x, y, barWidth, barHeight);

      // Value label
      ctx.fillStyle = "#f8fafc";
      ctx.fillText(val, x + barWidth / 2 - 4, y - 6);

      // Category label
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(label.slice(0, 8), x - 4, height - 15);
    });
  }

  // --------------------------------------------------------------------------
  // 6. AI FOLLOW-UP MESSAGE GENERATOR
  // --------------------------------------------------------------------------
  function renderAITool() {
    populateAICustomerDropdown();
  }

  function populateAICustomerDropdown() {
    const select = document.getElementById("aiCustomerSelect");
    if (!select) return;
    select.innerHTML = '<option value="">-- Choose Customer or Enter Below --</option>' +
      state.customers.map(c => `<option value="${c.id}">${escapeHTML(c.name)} (${escapeHTML(c.business || c.phone || "")})</option>`).join("");
  }

  window.onAICustomerChange = function (customerId) {
    if (!customerId) return;
    const customer = state.customers.find(c => c.id === customerId);
    if (!customer) return;
    document.getElementById("aiCustomerName").value = customer.name;
    if (customer.notes) {
      document.getElementById("aiSituation").value = customer.notes.slice(0, 100);
    }
  };

  window.generateAIMessage = function () {
    const customerName = document.getElementById("aiCustomerName").value.trim() || "there";
    const service = document.getElementById("aiService").value.trim() || "our services";
    const situation = document.getElementById("aiSituationSelect").value;
    const tone = document.getElementById("aiToneSelect").value;
    const businessName = state.settings.businessName || "our team";
    const ownerName = state.settings.ownerName || "me";

    let message = "";

    if (situation === "first_enquiry") {
      if (tone === "friendly") {
        message = `Hi ${customerName}! 👋 Thanks so much for reaching out to ${businessName} about ${service}. I'd love to learn more about what you have in mind and see how we can help. Do you have 5 minutes for a quick call this week, or is messaging here best for you? Looking forward to connecting! - ${ownerName}`;
      } else if (tone === "direct") {
        message = `Hello ${customerName}, thanks for your interest in ${service} at ${businessName}. I have a few openings this week to discuss your requirements. Would tomorrow at 10 AM or 2 PM work for a brief call? Best, ${ownerName}`;
      } else {
        message = `Dear ${customerName},\n\nThank you for contacting ${businessName} regarding ${service}. We appreciate your enquiry and would be delighted to assist you. Please let us know your availability for a short discussion so we can provide recommendations tailored to your goals.\n\nSincerely,\n${ownerName}\n${businessName}`;
      }
    } else if (situation === "after_quote") {
      if (tone === "friendly") {
        message = `Hey ${customerName}! Hope you're having a great week! Just wanted to make sure you received the quote for ${service} that I sent over. Happy to answer any questions or adjust anything to match your budget. Let me know what you think! - ${ownerName}`;
      } else if (tone === "urgent") {
        message = `Hi ${customerName}, quick update regarding your proposal for ${service}: our project calendar for this month is nearly fully booked. If you'd like to reserve your spot and lock in the current quote, please let me know by Friday. Best, ${ownerName}`;
      } else {
        message = `Dear ${customerName},\n\nI am following up regarding the estimate sent for ${service}. Please let me know if you had an opportunity to review it or if you require any adjustments.\n\nBest regards,\n${ownerName}`;
      }
    } else if (situation === "appointment_reminder") {
      message = `Hi ${customerName}! Friendly reminder from ${businessName} regarding your upcoming appointment for ${service}. We are looking forward to seeing you! If you need to make any changes, please let us know in advance. See you soon!`;
    } else if (situation === "check_in_no_response") {
      if (tone === "direct") {
        message = `Hi ${customerName}, I know how busy schedules get! Just wanted to check if you're still interested in ${service}. If timing isn't right now, no problem at all—just let me know. Thanks! - ${ownerName}`;
      } else {
        message = `Hello ${customerName},\n\nChecking in briefly to see if you still require assistance with ${service}. If your priorities have shifted, please let us know and we will be happy to reconnect whenever you are ready.\n\nWarm regards,\n${ownerName}`;
      }
    } else {
      // Re-engagement
      message = `Hi ${customerName}! It's ${ownerName} from ${businessName}. Hope all is going great! We've recently introduced some exciting updates to our ${service} offerings and thought of you. Would love to catch up whenever you have a moment. Have a wonderful week!`;
    }

    const outputBox = document.getElementById("aiOutputText");
    if (outputBox) {
      outputBox.textContent = message;
      document.getElementById("aiOutputContainer").style.display = "block";
      showToast("Follow-up message generated!");
    }
  };

  window.copyAIMessage = function () {
    const text = document.getElementById("aiOutputText").textContent;
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Message copied to clipboard!");
    }).catch(() => {
      showToast("Failed to copy automatically. Please copy manually.", "error");
    });
  };

  window.shareAIWhatsApp = function () {
    const text = encodeURIComponent(document.getElementById("aiOutputText").textContent);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  window.shareAIEmail = function () {
    const text = encodeURIComponent(document.getElementById("aiOutputText").textContent);
    window.open(`mailto:?subject=Follow%20up%20from%20${encodeURIComponent(state.settings.businessName || 'ClientFlow')}&body=${text}`, "_blank");
  };

  // --------------------------------------------------------------------------
  // 7. CSV EXPORT
  // --------------------------------------------------------------------------
  window.exportCustomersCSV = function () {
    if (state.customers.length === 0) {
      showToast("No customer records to export", "error");
      return;
    }

    const headers = ["ID", "Name", "Business", "Email", "Phone", "Status", "Source", "Notes", "Created Date"];
    const rows = state.customers.map(c => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.business || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      c.status || "New",
      c.source || "Direct",
      `"${(c.notes || '').replace(/"/g, '""')}"`,
      c.createdAt || ""
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `clientflow_customers_${getTodayString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Customer database exported to CSV!");
  };

  // --------------------------------------------------------------------------
  // 8. SETTINGS & PROFILE
  // --------------------------------------------------------------------------
  function renderSettings() {
    const form = document.getElementById("settingsForm");
    if (!form) return;
    document.getElementById("setBizName").value = state.settings.businessName || "";
    document.getElementById("setOwnerName").value = state.settings.ownerName || "";
    document.getElementById("setEmail").value = state.settings.email || (state.user ? state.user.email : "");
    document.getElementById("setPhone").value = state.settings.phone || "";
    document.getElementById("setCurrency").value = state.settings.currency || "$";
    document.getElementById("setTheme").value = state.settings.theme || "dark";
    document.getElementById("currentPlanDisplay").textContent = (state.settings.plan || "Free").toUpperCase();
  }

  window.saveBusinessSettings = async function (e) {
    if (e) e.preventDefault();
    const updates = {
      businessName: document.getElementById("setBizName").value.trim(),
      ownerName: document.getElementById("setOwnerName").value.trim(),
      email: document.getElementById("setEmail").value.trim(),
      phone: document.getElementById("setPhone").value.trim(),
      currency: document.getElementById("setCurrency").value,
      theme: document.getElementById("setTheme").value
    };

    state.settings = { ...state.settings, ...updates };
    document.documentElement.setAttribute("data-theme", updates.theme);

    await window.ClientFlowDB.saveSettings(state.user.uid, state.settings);
    updateUserUI();
    showToast("Settings saved successfully!");
  };

  // --------------------------------------------------------------------------
  // 9. MODALS & ACTIONS
  // --------------------------------------------------------------------------

  // Customer Modal (Add / Edit)
  window.openCustomerModal = function (customerId = null) {
    const modal = document.getElementById("customerModal");
    const title = document.getElementById("customerModalTitle");
    const form = document.getElementById("customerForm");
    form.reset();

    if (customerId) {
      const c = state.customers.find(item => item.id === customerId);
      if (c) {
        title.textContent = "Edit Customer Details";
        document.getElementById("custEditId").value = c.id;
        document.getElementById("custName").value = c.name || "";
        document.getElementById("custBusiness").value = c.business || "";
        document.getElementById("custEmail").value = c.email || "";
        document.getElementById("custPhone").value = c.phone || "";
        document.getElementById("custStatus").value = c.status || "New";
        document.getElementById("custSource").value = c.source || "Instagram";
        document.getElementById("custNotes").value = c.notes || "";
      }
    } else {
      title.textContent = "Add New Customer / Lead";
      document.getElementById("custEditId").value = "";
    }
    modal.classList.add("active");
  };

  window.saveCustomer = async function (e) {
    e.preventDefault();
    const editId = document.getElementById("custEditId").value;
    const customerData = {
      userId: state.user.uid,
      name: document.getElementById("custName").value.trim(),
      business: document.getElementById("custBusiness").value.trim(),
      email: document.getElementById("custEmail").value.trim(),
      phone: document.getElementById("custPhone").value.trim(),
      status: document.getElementById("custStatus").value,
      source: document.getElementById("custSource").value,
      notes: document.getElementById("custNotes").value.trim()
    };

    if (!customerData.name) {
      showToast("Customer name is required", "error");
      return;
    }

    if (editId) {
      await window.ClientFlowDB.updateCustomer(editId, customerData);
      const idx = state.customers.findIndex(c => c.id === editId);
      if (idx !== -1) state.customers[idx] = { ...state.customers[idx], ...customerData };
      showToast("Customer updated!");
    } else {
      const created = await window.ClientFlowDB.addCustomer(customerData);
      state.customers.unshift(created);
      showToast("New customer added!");
    }

    closeModal("customerModal");
    renderCurrentTab();
  };

  window.confirmDeleteCustomer = function (customerId) {
    const c = state.customers.find(item => item.id === customerId);
    if (!c) return;
    if (confirm(`Are you sure you want to delete ${c.name}? Associated follow-ups and appointments will also be removed.`)) {
      window.ClientFlowDB.deleteCustomer(customerId).then(() => {
        state.customers = state.customers.filter(item => item.id !== customerId);
        state.followups = state.followups.filter(f => f.customerId !== customerId);
        state.appointments = state.appointments.filter(a => a.customerId !== customerId);
        showToast("Customer record deleted");
        renderCurrentTab();
      });
    }
  };

  // Customer Details View Modal
  window.openCustomerDetails = function (customerId) {
    const c = state.customers.find(item => item.id === customerId);
    if (!c) return;
    state.selectedCustomer = c;

    document.getElementById("detailCustName").textContent = c.name;
    document.getElementById("detailCustBusiness").textContent = c.business || "Individual Client";
    document.getElementById("detailCustEmail").textContent = c.email || "No email";
    document.getElementById("detailCustPhone").textContent = c.phone || "No phone";
    document.getElementById("detailCustStatus").innerHTML = `<span class="badge badge-${formatStatusBadge(c.status)}">${c.status}</span>`;
    document.getElementById("detailCustSource").textContent = c.source || "Direct";
    document.getElementById("detailCustNotes").textContent = c.notes || "No notes entered.";

    // Linked follow-ups
    const linkedFollowups = state.followups.filter(f => f.customerId === customerId);
    const fuList = document.getElementById("detailCustFollowups");
    if (fuList) {
      if (linkedFollowups.length === 0) {
        fuList.innerHTML = `<p class="customer-cell-sub">No follow-ups recorded.</p>`;
      } else {
        fuList.innerHTML = linkedFollowups.map(f => `
          <div style="padding: 8px 0; border-bottom: 1px solid var(--border-color); font-size: 13px;">
            <div style="font-weight: 600;">${f.completed ? '✓ (Completed)' : '⏰'} ${f.date} ${f.time || ''}</div>
            <div class="customer-cell-sub">${escapeHTML(f.notes || '')}</div>
          </div>
        `).join("");
      }
    }

    document.getElementById("customerDetailsModal").classList.add("active");
  };

  // Follow-up Modal (Add / Edit)
  window.openFollowupModal = function (followupId = null) {
    const modal = document.getElementById("followupModal");
    const form = document.getElementById("followupForm");
    form.reset();

    // Populate customer dropdown
    const custSelect = document.getElementById("fuCustomerSelect");
    custSelect.innerHTML = state.customers.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");

    if (followupId) {
      const f = state.followups.find(item => item.id === followupId);
      if (f) {
        document.getElementById("fuEditId").value = f.id;
        custSelect.value = f.customerId;
        document.getElementById("fuDate").value = f.date;
        document.getElementById("fuTime").value = f.time || "";
        document.getElementById("fuPriority").value = f.priority || "Medium";
        document.getElementById("fuNotes").value = f.notes || "";
      }
    } else {
      document.getElementById("fuEditId").value = "";
      document.getElementById("fuDate").value = getTodayString();
      if (state.selectedCustomer) {
        custSelect.value = state.selectedCustomer.id;
      }
    }
    modal.classList.add("active");
  };

  window.saveFollowup = async function (e) {
    e.preventDefault();
    const editId = document.getElementById("fuEditId").value;
    const custId = document.getElementById("fuCustomerSelect").value;
    const cust = state.customers.find(c => c.id === custId);

    const existing = editId ? state.followups.find(f => f.id === editId) : null;
    const fuData = {
      userId: state.user.uid,
      customerId: custId,
      customerName: cust ? cust.name : "Customer",
      date: document.getElementById("fuDate").value,
      time: document.getElementById("fuTime").value,
      priority: document.getElementById("fuPriority").value,
      notes: document.getElementById("fuNotes").value.trim(),
      completed: existing ? existing.completed : false
    };

    if (editId) {
      await window.ClientFlowDB.updateFollowup(editId, fuData);
      const idx = state.followups.findIndex(f => f.id === editId);
      if (idx !== -1) state.followups[idx] = { ...state.followups[idx], ...fuData };
      showToast("Follow-up updated!");
    } else {
      const created = await window.ClientFlowDB.addFollowup(fuData);
      state.followups.unshift(created);
      showToast("Follow-up reminder set!");
    }

    closeModal("followupModal");
    updateNavigationCounts();
    renderCurrentTab();
  };

  window.toggleFollowupStatus = async function (id, completed) {
    await window.ClientFlowDB.updateFollowup(id, { completed });
    const idx = state.followups.findIndex(f => f.id === id);
    if (idx !== -1) state.followups[idx].completed = completed;
    showToast(completed ? "Marked as completed!" : "Re-opened follow-up");
    updateNavigationCounts();
    renderCurrentTab();
  };

  window.completeFollowup = function (id) {
    window.toggleFollowupStatus(id, true);
  };

  window.deleteFollowup = async function (id) {
    if (confirm("Delete this follow-up?")) {
      await window.ClientFlowDB.deleteFollowup(id);
      state.followups = state.followups.filter(f => f.id !== id);
      showToast("Follow-up deleted");
      updateNavigationCounts();
      renderCurrentTab();
    }
  };

  // Appointment Modal
  window.openAppointmentModal = function (aptId = null) {
    const modal = document.getElementById("appointmentModal");
    const form = document.getElementById("appointmentForm");
    form.reset();

    const custSelect = document.getElementById("aptCustomerSelect");
    custSelect.innerHTML = state.customers.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join("");

    if (aptId) {
      const a = state.appointments.find(item => item.id === aptId);
      if (a) {
        document.getElementById("aptEditId").value = a.id;
        custSelect.value = a.customerId;
        document.getElementById("aptDate").value = a.date;
        document.getElementById("aptTime").value = a.time || "";
        document.getElementById("aptService").value = a.service || "";
        document.getElementById("aptStatus").value = a.status || "Scheduled";
        document.getElementById("aptNotes").value = a.notes || "";
      }
    } else {
      document.getElementById("aptEditId").value = "";
      document.getElementById("aptDate").value = getTodayString();
      if (state.selectedCustomer) {
        custSelect.value = state.selectedCustomer.id;
      }
    }
    modal.classList.add("active");
  };

  window.saveAppointment = async function (e) {
    e.preventDefault();
    const editId = document.getElementById("aptEditId").value;
    const custId = document.getElementById("aptCustomerSelect").value;
    const cust = state.customers.find(c => c.id === custId);

    const aptData = {
      userId: state.user.uid,
      customerId: custId,
      customerName: cust ? cust.name : "Customer",
      date: document.getElementById("aptDate").value,
      time: document.getElementById("aptTime").value,
      service: document.getElementById("aptService").value.trim() || "Consultation",
      status: document.getElementById("aptStatus").value,
      notes: document.getElementById("aptNotes").value.trim()
    };

    if (editId) {
      await window.ClientFlowDB.updateAppointment(editId, aptData);
      const idx = state.appointments.findIndex(a => a.id === editId);
      if (idx !== -1) state.appointments[idx] = { ...state.appointments[idx], ...aptData };
      showToast("Appointment updated!");
    } else {
      const created = await window.ClientFlowDB.addAppointment(aptData);
      state.appointments.unshift(created);
      showToast("Appointment scheduled!");
    }

    closeModal("appointmentModal");
    updateNavigationCounts();
    renderCurrentTab();
  };

  window.deleteAppointment = async function (id) {
    if (confirm("Cancel and delete this appointment?")) {
      await window.ClientFlowDB.deleteAppointment(id);
      state.appointments = state.appointments.filter(a => a.id !== id);
      showToast("Appointment removed");
      updateNavigationCounts();
      renderCurrentTab();
    }
  };

  window.openAIToolForCustomer = function (customerId) {
    switchTab("ai");
    setTimeout(() => {
      const select = document.getElementById("aiCustomerSelect");
      if (select) {
        select.value = customerId;
        window.onAICustomerChange(customerId);
      }
    }, 100);
  };

  window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("active");
  };

  window.openUpgradeModal = function () {
    const modal = document.getElementById("upgradeModal");
    if (modal) modal.classList.add("active");
  };

  // Helper formatting
  function formatStatusBadge(status) {
    switch ((status || "").toLowerCase()) {
      case "new": return "new";
      case "contacted": return "contacted";
      case "interested": return "interested";
      case "customer": return "customer";
      default: return "not-interested";
    }
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  // Event Listeners
  function setupEventListeners() {
    // Nav Click Handling
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });
    document.querySelectorAll(".mobile-nav-item").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Search bar debounce
    const searchInput = document.getElementById("customerSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value;
        renderCustomers();
      });
    }

    // Status filter
    const statusSelect = document.getElementById("customerStatusFilter");
    if (statusSelect) {
      statusSelect.addEventListener("change", (e) => {
        state.statusFilter = e.target.value;
        renderCustomers();
      });
    }

    // Followup filter tabs
    document.querySelectorAll(".fu-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".fu-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.followupFilter = btn.dataset.filter;
        renderFollowups();
      });
    });

    // Logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await window.ClientFlowAuth.signOut();
        window.location.href = "login.html";
      });
    }
  }

  // Run on DOM Ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
