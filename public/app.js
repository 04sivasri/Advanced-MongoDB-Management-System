// Global Application State
class EventManagementApp {
  constructor() {
    this.currentScreen = "login"
    this.currentCollection = null
    this.currentUser = null
    this.currentDatabase = null
    this.currentPage = 1
    this.itemsPerPage = 20
    this.availableDatabases = []

    // Collection schemas - these will be dynamic based on actual collections
    this.collectionSchemas = {}
    this.actualCollections = []

    this.lockedRecords = new Set()
    this.currentChart = null

    this.init()
  }

  init() {
    this.setupEventListeners()
    this.showScreen("login")

    // Test connection on startup
    this.testConnection()
  }

  async testConnection() {
    try {
      const response = await fetch("/api/test-connection")
      const data = await response.json()

      if (data.success) {
        console.log("✅ Database connection test successful:", data)
      } else {
        console.error("❌ Database connection test failed:", data)
      }
    } catch (error) {
      console.error("❌ Connection test error:", error)
    }
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.handleLogin()
      })
    }

    // Record form
    const recordForm = document.getElementById("recordForm")
    if (recordForm) {
      recordForm.addEventListener("submit", (e) => {
        e.preventDefault()
        this.handleRecordSubmit()
      })
    }

    // Search functionality
    const searchInput = document.getElementById("searchInput")
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        clearTimeout(this.searchTimeout)
        this.searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value)
        }, 500)
      })
    }

    // Close modal on outside click
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.closeModal()
      }
    })
  }

  // API Helper Methods
  async apiCall(endpoint, options = {}) {
    const url = `/api${endpoint}`
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    }

    if (config.body && typeof config.body === "object") {
      config.body = JSON.stringify(config.body)
    }

    try {
      console.log(`🌐 API Call: ${config.method || "GET"} ${url}`)
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        console.error("❌ API Error:", data)
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      console.log("✅ API Success:", data)
      return data
    } catch (error) {
      console.error("❌ API call failed:", error)
      throw error
    }
  }

  showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active")
    })

    // Show target screen
    const targetScreen = document.getElementById(screenName + "Screen")
    if (targetScreen) {
      targetScreen.classList.add("active")
      this.currentScreen = screenName
    }

    // Initialize screen-specific content
    switch (screenName) {
      case "dashboard":
        this.initDashboard()
        break
      case "collection":
        this.initCollectionManager()
        break
      case "analytics":
        this.initAnalytics()
        break
      case "aggregation":
        this.initAggregationBuilder()
        break
    }
  }

  async handleLogin() {
    const username = document.getElementById("username").value.trim()
    const password = document.getElementById("password").value.trim()
    const statusEl = document.getElementById("loginStatus")

    if (!username || !password) {
      this.showStatus(statusEl, "Please enter both username and password.", "error")
      return
    }

    this.showStatus(statusEl, "Authenticating and connecting to MongoDB Atlas...", "info")

    try {
      const response = await this.apiCall("/auth/login", {
        method: "POST",
        body: { username, password },
      })

      this.currentUser = response.user
      this.showStatus(statusEl, `✅ ${response.message}`, "success")

      if (response.requiresDatabaseSelection) {
        setTimeout(() => {
          this.showDatabaseSelection()
        }, 1500)
      } else {
        setTimeout(() => {
          this.showScreen("dashboard")
        }, 2000)
      }
    } catch (error) {
      this.showStatus(statusEl, `❌ ${error.message}`, "error")
      console.error("Login failed:", error)
    }
  }

  showStatus(element, message, type) {
    element.innerHTML = message
    element.className = `status-message ${type}`
  }

  async initDashboard() {
    await this.loadRealTimeStats()
    this.loadCollectionModules()
    this.updateUserInfo()
  }

  updateUserInfo() {
    const currentDatabase = document.getElementById("currentDatabase")
    const currentUser = document.getElementById("currentUser")

    if (currentDatabase) currentDatabase.textContent = this.currentDatabase || "Unknown"
    if (currentUser) currentUser.textContent = this.currentUser?.username || "Unknown"
  }

  async loadRealTimeStats() {
    const statsGrid = document.getElementById("statsGrid")
    if (!statsGrid) return

    try {
      const stats = await this.apiCall("/stats")

      const statsArray = Object.entries(stats.collections).map(([collection, count]) => ({
        label: this.collectionSchemas[collection]?.displayName || collection,
        value: count,
      }))

      // Add database stats
      statsArray.push(
        { label: "📊 Total Collections", value: Object.keys(stats.collections).length },
        { label: "💾 Database Size", value: this.formatBytes(stats.database.size) },
        { label: "🗄️ Database", value: stats.database.name },
      )

      statsGrid.innerHTML = statsArray
        .map(
          (stat) => `
            <div class="stat-card">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
          `,
        )
        .join("")
    } catch (error) {
      console.error("Error loading stats:", error)
      this.showToast("Failed to load statistics: " + error.message, "error")
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  async showDatabaseSelection() {
    this.showScreen("databaseSelection")
    await this.loadAvailableDatabases()
  }

  async loadAvailableDatabases() {
    const databaseList = document.getElementById("databaseList")
    const statusEl = document.getElementById("databaseStatus")

    try {
      this.showStatus(statusEl, "Loading available databases from your Atlas account...", "info")

      const response = await this.apiCall("/databases")
      this.availableDatabases = response.databases

      if (this.availableDatabases.length === 0) {
        databaseList.innerHTML = `
          <div class="no-databases">
            <i class="fas fa-database" style="font-size: 3rem; color: #6b7280; margin-bottom: 20px;"></i>
            <h3>No databases found</h3>
            <p>No databases were found in your MongoDB Atlas account.</p>
            <p>You can create a new database by adding data to it.</p>
          </div>
        `
        return
      }

      databaseList.innerHTML = this.availableDatabases
        .map(
          (database) => `
            <div class="database-card" onclick="app.selectDatabase('${database.name}')">
              <div class="database-header">
                <i class="fas fa-database"></i>
                <h3>${database.name}</h3>
              </div>
              <div class="database-info">
                <span>Size: ${this.formatBytes(database.sizeOnDisk)}</span>
              </div>
            </div>
          `,
        )
        .join("")

      this.showStatus(statusEl, `Found ${this.availableDatabases.length} databases in your Atlas account`, "success")
    } catch (error) {
      console.error("Error loading databases:", error)
      this.showStatus(statusEl, "Failed to load databases: " + error.message, "error")
    }
  }

  async selectDatabase(databaseName) {
    const statusEl = document.getElementById("databaseStatus")

    try {
      this.showStatus(statusEl, `Connecting to database: ${databaseName}...`, "info")

      const response = await this.apiCall("/connect-database", {
        method: "POST",
        body: { databaseName },
      })

      this.currentDatabase = databaseName
      this.actualCollections = response.database.collections

      // Create dynamic collection schemas based on actual collections
      this.createDynamicSchemas()

      this.showStatus(statusEl, `✅ Connected to ${databaseName}`, "success")

      setTimeout(() => {
        this.showScreen("dashboard")
      }, 1500)
    } catch (error) {
      this.showStatus(statusEl, `Failed to connect to ${databaseName}: ${error.message}`, "error")
    }
  }

  createDynamicSchemas() {
    // Create schemas for actual collections found in the database
    this.collectionSchemas = {}

    this.actualCollections.forEach((collectionName) => {
      // Create a basic schema - this will be enhanced when we inspect the collection
      this.collectionSchemas[collectionName] = {
        displayName: `📊 ${collectionName}`,
        fields: [], // Will be populated when we load data
        required: [],
      }
    })

    // Add some common collection schemas if they exist
    const commonSchemas = {
      members: {
        displayName: "👥 Members",
        fields: ["name", "roll_no", "department", "contact_no", "email", "team_id", "role_id", "status"],
        required: ["name", "email"],
      },
      events: {
        displayName: "🎉 Events",
        fields: ["name", "date", "venue", "team_id", "collaborations", "budget", "status"],
        required: ["name", "date", "venue"],
      },
      teams: {
        displayName: "👥 Teams",
        fields: ["name", "description", "head_id", "members_count", "budget"],
        required: ["name"],
      },
      tasks: {
        displayName: "📋 Tasks",
        fields: ["task_name", "description", "assigned_to", "status", "priority", "due_date"],
        required: ["task_name", "assigned_to"],
      },
      projects: {
        displayName: "📊 Projects",
        fields: ["name", "description", "status", "team_id", "start_date", "end_date"],
        required: ["name", "status"],
      },
      finances: {
        displayName: "💰 Finances",
        fields: ["event_id", "amount", "type", "description", "date", "category"],
        required: ["amount", "type"],
      },
      feedbacks: {
        displayName: "📝 Feedbacks",
        fields: ["member_id", "event_id", "comments", "rating", "date"],
        required: ["member_id", "event_id", "rating"],
      },
      attendance: {
        displayName: "✅ Attendance",
        fields: ["member_id", "event_id", "status", "check_in_time"],
        required: ["member_id", "event_id", "status"],
      },
    }

    // Override with predefined schemas if the collection exists
    Object.keys(commonSchemas).forEach((collectionName) => {
      if (this.actualCollections.includes(collectionName)) {
        this.collectionSchemas[collectionName] = commonSchemas[collectionName]
      }
    })
  }

  async loadCollectionModules() {
    const modulesGrid = document.getElementById("modulesGrid")
    if (!modulesGrid) return

    try {
      const stats = await this.apiCall("/stats")

      const modules = Object.entries(this.collectionSchemas).map(([key, schema]) => {
        const count = stats.collections[key] || 0
        return {
          key,
          displayName: schema.displayName,
          count,
        }
      })

      modulesGrid.innerHTML = modules
        .map(
          (module) => `
            <div class="module-card">
                <div class="module-header">
                    <i class="fas fa-database"></i>
                    <h3>${module.displayName}</h3>
                </div>
                <div class="module-count">${module.count} records in MongoDB</div>
                <button class="btn btn-primary" onclick="app.showCollectionManager('${module.key}')">
                    Manage Collection
                </button>
            </div>
          `,
        )
        .join("")
    } catch (error) {
      console.error("Error loading modules:", error)
      this.showToast("Failed to load collection modules: " + error.message, "error")
    }
  }

  showCollectionManager(collectionName) {
    this.currentCollection = collectionName
    this.currentPage = 1
    this.showScreen("collection")

    const schema = this.collectionSchemas[collectionName]
    document.getElementById("collectionTitle").innerHTML =
      `<i class="fas fa-database"></i> ${schema.displayName} Management`
    document.getElementById("collectionSubtitle").textContent =
      `Live MongoDB collection: ${this.currentDatabase}.${collectionName}`

    // Add analytics button to collection header
    const collectionHeader = document.querySelector(".collection-header")
    if (collectionHeader) {
      const analyticsBtn = collectionHeader.querySelector(".analytics-btn")
      if (!analyticsBtn) {
        const analyticsButton = document.createElement("button")
        analyticsButton.className = "btn btn-info analytics-btn"
        analyticsButton.innerHTML = '<i class="fas fa-chart-bar"></i> Analytics'
        analyticsButton.onclick = () => this.showCollectionAnalytics()
        collectionHeader.appendChild(analyticsButton)
      }
    }
  }

  async initCollectionManager() {
    if (!this.currentCollection) return
    await this.loadCollectionData()
  }

  // Update the loadCollectionData method to inspect actual collection structure
  async loadCollectionData(search = "") {
    const schema = this.collectionSchemas[this.currentCollection]

    try {
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: this.itemsPerPage,
        ...(search && { search }),
      })

      const response = await this.apiCall(`/${this.currentCollection}?${params}`)

      // If we have data, inspect the structure to update our schema
      if (response.data.length > 0 && schema.fields.length === 0) {
        const sampleDoc = response.data[0]
        schema.fields = Object.keys(sampleDoc).filter((key) => key !== "_id")
        console.log(`Updated schema for ${this.currentCollection}:`, schema.fields)
      }

      // Create table headers
      const tableHeader = document.getElementById("tableHeader")
      const headers = ["Actions", ...schema.fields.filter((f) => f !== "_id"), "Created", "Updated"]
      tableHeader.innerHTML = headers
        .map((field) => `<th>${field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</th>`)
        .join("")

      // Create table rows
      const tableBody = document.getElementById("tableBody")

      if (response.data.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="${headers.length}" style="text-align: center; padding: 40px;">
              <div style="color: #6b7280;">
                <i class="fas fa-database" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No records found in this collection</p>
                <p style="font-size: 0.9rem;">Click "Add Record" to create your first entry</p>
              </div>
            </td>
          </tr>
        `
      } else {
        tableBody.innerHTML = response.data
          .map((record) => {
            const isLocked = this.isRecordLocked(record._id)
            const lockIcon = isLocked ? "🔒 " : ""

            const cells = [
              `<td>
                <button class="btn-small btn-primary" onclick="app.editRecord('${record._id}')" title="Edit" ${isLocked ? "disabled" : ""}>
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-small btn-danger" onclick="app.deleteRecord('${record._id}')" title="Delete" ${isLocked ? "disabled" : ""}>
                  <i class="fas fa-trash"></i>
                </button>
                <button class="btn-small ${isLocked ? "btn-warning" : "btn-secondary"}" onclick="app.${isLocked ? "unlockRecord" : "lockRecord"}('${record._id}')" title="${isLocked ? "Unlock" : "Lock"}">
                  <i class="fas fa-${isLocked ? "unlock" : "lock"}"></i>
                </button>
                <button class="btn-small btn-info" onclick="app.viewRecordDetails('${record._id}')" title="View Details">
                  <i class="fas fa-eye"></i>
                </button>
              </td>`,
              ...schema.fields
                .filter((f) => f !== "_id")
                .map((field) => {
                  let value = record[field] || ""
                  if (value instanceof Date || (typeof value === "string" && value.includes("T"))) {
                    value = new Date(value).toLocaleDateString()
                  } else if (typeof value === "object") {
                    value = JSON.stringify(value)
                  }
                  return `<td>${lockIcon}${value}</td>`
                }),
              `<td>${record.created_at ? new Date(record.created_at).toLocaleDateString() : ""}</td>`,
              `<td>${record.updated_at ? new Date(record.updated_at).toLocaleDateString() : ""}</td>`,
            ]

            return `<tr data-id="${record._id}" class="${isLocked ? "locked-row" : ""}">${cells.join("")}</tr>`
          })
          .join("")
      }

      // Update record count and pagination
      this.updatePagination(response.pagination)
    } catch (error) {
      console.error("Error loading collection data:", error)
      this.showToast("Failed to load collection data: " + error.message, "error")
    }
  }

  updatePagination(pagination) {
    const recordCount = document.getElementById("recordCount")
    const paginationEl = document.getElementById("pagination")

    recordCount.textContent = `${pagination.total} records in MongoDB (Page ${pagination.page} of ${pagination.pages})`

    let paginationHTML = ""
    if (pagination.pages > 1) {
      paginationHTML = `
        <button class="btn-small" ${pagination.page === 1 ? "disabled" : ""} 
                onclick="app.changePage(${pagination.page - 1})">
          <i class="fas fa-chevron-left"></i>
        </button>
        <span>Page ${pagination.page} of ${pagination.pages}</span>
        <button class="btn-small" ${pagination.page === pagination.pages ? "disabled" : ""} 
                onclick="app.changePage(${pagination.page + 1})">
          <i class="fas fa-chevron-right"></i>
        </button>
      `
    }

    paginationEl.innerHTML = paginationHTML
  }

  async changePage(page) {
    this.currentPage = page
    await this.loadCollectionData()
  }

  async handleSearch(query) {
    this.currentPage = 1
    await this.loadCollectionData(query)
  }

  addRecord() {
    this.openRecordModal("add")
  }

  async editRecord(recordId) {
    if (this.isRecordLocked(recordId)) {
      this.showToast("This record is locked and cannot be edited", "warning")
      return
    }

    try {
      // Fetch the record data from the server
      const response = await fetch(`/api/${this.currentCollection}/${recordId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch record: ${response.statusText}`)
      }

      const record = await response.json()
      this.openRecordModal("edit", record)
    } catch (error) {
      this.showToast("Failed to load record for editing: " + error.message, "error")
    }
  }

  openRecordModal(mode, recordData = null) {
    const modal = document.getElementById("recordModal")
    const modalTitle = document.getElementById("modalTitle")
    const formFields = document.getElementById("formFields")

    const schema = this.collectionSchemas[this.currentCollection]
    const isEdit = mode === "edit"

    modalTitle.textContent = isEdit
      ? `Edit ${schema.displayName} Record`
      : `Add New ${schema.displayName} Record to MongoDB`

    // Generate form fields
    formFields.innerHTML = schema.fields
      .filter((field) => field !== "_id")
      .map((field) => {
        const isRequired = schema.required.includes(field)
        const fieldValue = recordData?.[field] || ""
        const displayValue = fieldValue instanceof Date ? fieldValue.toISOString().split("T")[0] : fieldValue

        return `
          <div class="form-group">
              <label for="${field}">
                  ${field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  ${isRequired ? " *" : ""}
              </label>
              ${this.generateFieldInput(field, displayValue)}
          </div>
        `
      })
      .join("")

    // Store record data for editing
    modal.dataset.mode = mode
    modal.dataset.recordId = recordData?._id || ""
    modal.classList.add("active")
  }

  generateFieldInput(field, value) {
    if (field.includes("date")) {
      return `<input type="date" id="${field}" name="${field}" value="${value}">`
    } else if (field === "status") {
      const statusOptions = ["Active", "Inactive", "Pending", "Completed", "In Progress"]
      const options = statusOptions
        .map((status) => `<option value="${status}" ${status === value ? "selected" : ""}>${status}</option>`)
        .join("")
      return `<select id="${field}" name="${field}">
                <option value="">Select Status</option>
                ${options}
              </select>`
    } else if (field === "type") {
      const typeOptions = ["Event Sponsor", "Partner", "Vendor", "Sponsorship", "Expense", "Income"]
      const options = typeOptions
        .map((type) => `<option value="${type}" ${type === value ? "selected" : ""}>${type}</option>`)
        .join("")
      return `<select id="${field}" name="${field}">
                <option value="">Select Type</option>
                ${options}
              </select>`
    } else if (field === "priority") {
      const priorityOptions = ["Low", "Medium", "High", "Critical"]
      const options = priorityOptions
        .map((priority) => `<option value="${priority}" ${priority === value ? "selected" : ""}>${priority}</option>`)
        .join("")
      return `<select id="${field}" name="${field}">
                <option value="">Select Priority</option>
                ${options}
              </select>`
    } else if (field.includes("amount") || field.includes("budget")) {
      return `<input type="number" id="${field}" name="${field}" value="${value}" step="0.01">`
    } else if (field === "rating") {
      return `<input type="number" id="${field}" name="${field}" value="${value}" min="1" max="5">`
    } else if (field.includes("description") || field.includes("comments")) {
      return `<textarea id="${field}" name="${field}" rows="3">${value}</textarea>`
    } else {
      return `<input type="text" id="${field}" name="${field}" value="${value}">`
    }
  }

  async handleRecordSubmit() {
    const modal = document.getElementById("recordModal")
    const mode = modal.dataset.mode
    const recordId = modal.dataset.recordId
    const schema = this.collectionSchemas[this.currentCollection]

    // Collect form data
    const formData = {}
    const form = document.getElementById("recordForm")
    const formElements = form.querySelectorAll("input, select, textarea")

    let hasErrors = false

    formElements.forEach((element) => {
      const field = element.name
      const value = element.value.trim()

      // Validate required fields
      if (schema.required.includes(field) && !value) {
        this.showToast(`${field.replace(/_/g, " ")} is required.`, "error")
        element.focus()
        hasErrors = true
        return
      }

      // Process value based on field type
      if (field.includes("date") && value) {
        formData[field] = new Date(value)
      } else if ((field.includes("amount") || field.includes("budget")) && value) {
        formData[field] = Number.parseFloat(value)
      } else if (field === "rating" && value) {
        formData[field] = Number.parseInt(value)
      } else if (value) {
        formData[field] = value
      }
    })

    if (hasErrors) return

    try {
      if (mode === "add") {
        // Create new record
        const response = await this.apiCall(`/${this.currentCollection}`, {
          method: "POST",
          body: formData,
        })

        this.showToast("✅ Record added to MongoDB successfully!", "success")
      } else {
        // Update existing record - use the fixed endpoint
        const response = await this.apiCall(`/${this.currentCollection}/${recordId}`, {
          method: "PUT",
          body: formData,
        })

        this.showToast("✅ Record updated in MongoDB successfully!", "success")
      }

      this.closeModal()
      await this.loadCollectionData()
    } catch (error) {
      this.showToast("❌ Failed to save record: " + error.message, "error")
    }
  }

  async deleteRecord(recordId) {
    if (!confirm("Are you sure you want to delete this record from MongoDB? This action cannot be undone.")) {
      return
    }

    try {
      await this.apiCall(`/${this.currentCollection}/${recordId}`, {
        method: "DELETE",
      })
      this.showToast("✅ Record deleted from MongoDB successfully!", "success")
      await this.loadCollectionData()
    } catch (error) {
      this.showToast("❌ Failed to delete record: " + error.message, "error")
    }
  }

  closeModal() {
    const modal = document.getElementById("recordModal")
    modal.classList.remove("active")
  }

  showToast(message, type = "info") {
    const toastContainer = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`

    const icon = {
      success: "fas fa-check-circle",
      error: "fas fa-exclamation-circle",
      warning: "fas fa-exclamation-triangle",
      info: "fas fa-info-circle",
    }[type]

    toast.innerHTML = `
      <i class="${icon}"></i>
      <span>${message}</span>
    `

    toastContainer.appendChild(toast)

    // Auto remove after 5 seconds
    setTimeout(() => {
      toast.remove()
    }, 5000)
  }

  // Utility Functions
  async refreshAllData() {
    if (this.currentScreen === "dashboard") {
      await this.initDashboard()
    } else if (this.currentScreen === "collection") {
      await this.loadCollectionData()
    }
    this.showToast("✅ Data refreshed from MongoDB!", "success")
  }

  async refreshCollection() {
    if (this.currentCollection) {
      await this.loadCollectionData()
      this.showToast("✅ Collection data refreshed from MongoDB!", "success")
    }
  }

  showDashboard() {
    this.showScreen("dashboard")
  }

  logout() {
    if (confirm("Are you sure you want to logout?")) {
      this.currentUser = null
      this.currentDatabase = null
      this.showScreen("login")

      // Clear form fields
      document.getElementById("username").value = ""
      document.getElementById("password").value = ""
      document.getElementById("loginStatus").innerHTML = ""
    }
  }

  // Advanced Analytics Functions
  async showAdvancedAnalytics() {
    this.showScreen("analytics")
  }

  initAnalytics() {
    this.loadSystemOverview()
    this.createAnalyticsCharts()
  }

  async loadSystemOverview() {
    try {
      const analytics = await this.apiCall("/analytics/overview")

      const systemStats = document.getElementById("systemStats")
      if (systemStats) {
        systemStats.innerHTML = `
        <div class="metric-item">
          <strong>Total Documents:</strong> ${analytics.totalDocuments?.toLocaleString() || 0}
        </div>
        <div class="metric-item">
          <strong>Active Collections:</strong> ${analytics.activeCollections || 0}
        </div>
        <div class="metric-item">
          <strong>Average Documents per Collection:</strong> ${analytics.avgDocsPerCollection || 0}
        </div>
        <div class="metric-item">
          <strong>Most Active Collection:</strong> ${analytics.mostActiveCollection || "N/A"}
        </div>
      `
      }

      // Load recent activity
      this.loadRecentActivity(analytics.recentActivity || [])

      // Create charts
      this.createCollectionChart(analytics.collectionStats || {})
    } catch (error) {
      console.error("Analytics error:", error)
      this.showToast("Failed to load analytics: " + error.message, "error")
    }
  }

  loadRecentActivity(activities) {
    const recentActivity = document.getElementById("recentActivity")
    if (!recentActivity) return

    if (activities.length === 0) {
      recentActivity.innerHTML = "<p>No recent activity found</p>"
      return
    }

    recentActivity.innerHTML = activities
      .map(
        (activity) => `
      <div class="activity-item">
        <strong>${activity.action}</strong> in ${activity.collection}
        <div class="activity-time">${new Date(activity.timestamp).toLocaleString()}</div>
      </div>
    `,
      )
      .join("")
  }

  createCollectionChart(collectionStats) {
    const canvas = document.getElementById("collectionChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    // Clear previous chart
    if (this.currentChart) {
      this.currentChart.destroy()
    }

    const collections = Object.keys(collectionStats)
    const counts = Object.values(collectionStats)

    this.currentChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: collections.map((col) => this.collectionSchemas[col]?.displayName || col),
        datasets: [
          {
            data: counts,
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    })
  }

  // Aggregation Pipeline Functions
  showAggregationPipeline() {
    this.showScreen("aggregation")
  }

  initAggregationBuilder() {
    this.populatePipelineCollections()
    this.clearPipeline()
  }

  populatePipelineCollections() {
    const select = document.getElementById("pipelineCollection")
    if (!select) return

    select.innerHTML =
      '<option value="">Select Collection</option>' +
      Object.entries(this.collectionSchemas)
        .map(([key, schema]) => `<option value="${key}">${schema.displayName}</option>`)
        .join("")
  }

  addStage(stageType) {
    const stagesContainer = document.getElementById("pipelineStages")
    if (!stagesContainer) return

    const stageId = "stage_" + Date.now()
    const stageHtml = `
    <div class="pipeline-stage" id="${stageId}">
      <div class="stage-header">
        <div class="stage-title">$${stageType}</div>
        <div class="stage-actions">
          <button onclick="app.moveStageUp('${stageId}')" title="Move Up">↑</button>
          <button onclick="app.moveStageDown('${stageId}')" title="Move Down">↓</button>
          <button onclick="app.removeStage('${stageId}')" title="Remove">×</button>
        </div>
      </div>
      <div class="stage-content">
        <textarea placeholder="${this.getStageTemplate(stageType)}">${this.getStageTemplate(stageType)}</textarea>
      </div>
    </div>
  `

    stagesContainer.insertAdjacentHTML("beforeend", stageHtml)
  }

  getStageTemplate(stageType) {
    const templates = {
      match: '{\n  "status": "Active"\n}',
      group: '{\n  "_id": "$status",\n  "count": { "$sum": 1 }\n}',
      sort: '{\n  "created_at": -1\n}',
      project: '{\n  "name": 1,\n  "status": 1,\n  "created_at": 1\n}',
      lookup: '{\n  "from": "teams",\n  "localField": "team_id",\n  "foreignField": "_id",\n  "as": "team_info"\n}',
      unwind: '"$team_info"',
      limit: "10",
      skip: "5",
    }
    return templates[stageType] || "{}"
  }

  async executePipeline() {
    const collection = document.getElementById("pipelineCollection").value
    if (!collection) {
      this.showToast("Please select a collection first.", "warning")
      return
    }

    const stages = this.getPipelineStages()
    if (stages.length === 0) {
      this.showToast("Please add at least one pipeline stage.", "warning")
      return
    }

    try {
      // Show loading state
      const resultsContainer = document.getElementById("pipelineResults")
      if (resultsContainer) {
        resultsContainer.innerHTML = '<div class="loading">Executing pipeline...</div>'
      }

      const response = await fetch(`/api/aggregation/${collection}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pipeline: stages }),
      })

      if (!response.ok) {
        throw new Error(`Pipeline execution failed: ${response.statusText}`)
      }

      const result = await response.json()
      this.displayPipelineResults(result.results)
      this.showToast("Pipeline executed successfully!", "success")
    } catch (error) {
      this.showToast("Pipeline execution failed: " + error.message, "error")
      const resultsContainer = document.getElementById("pipelineResults")
      if (resultsContainer) {
        resultsContainer.innerHTML = `<div class="error-message">Error: ${error.message}</div>`
      }
    }
  }

  getPipelineStages() {
    const stagesContainer = document.getElementById("pipelineStages")
    const stageElements = stagesContainer.querySelectorAll(".pipeline-stage")

    return Array.from(stageElements).map((stageEl) => {
      const stageType = stageEl.querySelector(".stage-title").textContent.replace("$", "")
      const stageContent = stageEl.querySelector("textarea").value.trim()

      try {
        const stageObj = {}
        if (stageType === "limit" || stageType === "skip") {
          stageObj[`$${stageType}`] = Number.parseInt(stageContent)
        } else if (stageType === "unwind") {
          stageObj[`$${stageType}`] = stageContent.startsWith("$") ? stageContent : `$${stageContent.replace(/"/g, "")}`
        } else {
          stageObj[`$${stageType}`] = JSON.parse(stageContent)
        }
        return stageObj
      } catch (error) {
        throw new Error(`Invalid JSON in ${stageType} stage: ${error.message}`)
      }
    })
  }

  displayPipelineResults(results) {
    const resultsContainer = document.getElementById("pipelineResults")
    const resultCount = document.getElementById("resultCount")

    if (resultCount) {
      resultCount.textContent = `${results.length} documents`
    }

    if (resultsContainer) {
      if (results.length === 0) {
        resultsContainer.innerHTML = `
          <div class="no-results">
            <i class="fas fa-info-circle"></i>
            <p>No results returned from this pipeline.</p>
          </div>
        `
      } else {
        resultsContainer.innerHTML = `
        <div class="results-summary">
          <strong>Pipeline executed successfully</strong>
        </div>
        <div class="results-data">
          <pre>${JSON.stringify(results, null, 2)}</pre>
        </div>
      `
      }
    }
  }

  // Data Locking Functions
  lockRecord(recordId) {
    const lockKey = `${this.currentCollection}_${recordId}`
    this.lockedRecords.add(lockKey)
    this.showToast("Record locked successfully!", "info")
    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  unlockRecord(recordId) {
    const lockKey = `${this.currentCollection}_${recordId}`
    this.lockedRecords.delete(lockKey)
    this.showToast("Record unlocked successfully!", "info")
    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  isRecordLocked(recordId) {
    const lockKey = `${this.currentCollection}_${recordId}`
    return this.lockedRecords.has(lockKey)
  }

  showLockedRecords() {
    if (this.lockedRecords.size === 0) {
      this.showToast("No records are currently locked.", "info")
      return
    }

    const lockedList = Array.from(this.lockedRecords)
      .map((lockKey) => {
        const [collection, recordId] = lockKey.split("_")
        return `${collection}: ${recordId.slice(0, 8)}...`
      })
      .join("\n")

    alert(`Locked Records:\n\n${lockedList}`)
  }

  // Database Views Functions
  async createView() {
    if (!this.currentCollection) return

    const viewName = prompt("Enter view name:")
    if (!viewName) return

    const pipeline = prompt("Enter aggregation pipeline (JSON array):")
    if (!pipeline) return

    try {
      const parsedPipeline = JSON.parse(pipeline)

      const result = await this.apiCall("/views", {
        method: "POST",
        body: {
          name: viewName,
          collection: this.currentCollection,
          pipeline: parsedPipeline,
        },
      })

      this.showToast(`View "${viewName}" created successfully!`, "success")
    } catch (error) {
      this.showToast("Failed to create view: " + error.message, "error")
    }
  }

  async showViews() {
    try {
      const views = await this.apiCall("/views")

      const viewsList = views
        .map(
          (view) =>
            `<div class="view-item">
        <strong>${view.name}</strong> (${view.collection})
        <button onclick="app.executeView('${view._id}')" class="btn-small btn-primary">Execute</button>
        <button onclick="app.deleteView('${view._id}')" class="btn-small btn-danger">Delete</button>
      </div>`,
        )
        .join("")

      const modal = this.createModal(
        "Database Views",
        `
      <div class="views-container">
        ${viewsList || "<p>No views created yet</p>"}
      </div>
    `,
      )

      document.body.appendChild(modal)
    } catch (error) {
      this.showToast("Failed to load views: " + error.message, "error")
    }
  }

  // Update the loadCollectionData method to show lock status
  // Find the existing loadCollectionData method and replace the tableBody.innerHTML section

  viewRecordDetails(recordId) {
    this.apiCall(`/${this.currentCollection}/${recordId}`)
      .then((record) => {
        const modal = this.createModal(
          "Record Details",
          `
        <div class="record-details">
          <pre>${JSON.stringify(record, null, 2)}</pre>
        </div>
      `,
        )
        document.body.appendChild(modal)
      })
      .catch((error) => {
        this.showToast("Failed to load record details: " + error.message, "error")
      })
  }

  createModal(title, content, wide = false) {
    const modal = document.createElement("div")
    modal.className = "modal active"
    modal.innerHTML = `
  <div class="modal-content ${wide ? "modal-wide" : ""}">
    <div class="modal-header">
      <h2>${title}</h2>
      <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
    </div>
    <div class="modal-body">
      ${content}
    </div>
  </div>
`

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })

    return modal
  }

  // Add new MongoDB features
  async exportCollection() {
    if (!this.currentCollection) return

    try {
      const format = prompt("Export format (json/csv):", "json")
      if (!format) return

      const response = await fetch(`/api/export/${this.currentCollection}?format=${format}`)
      if (!response.ok) throw new Error("Export failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${this.currentCollection}_export_${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      this.showToast("Collection exported successfully!", "success")
    } catch (error) {
      this.showToast("Export failed: " + error.message, "error")
    }
  }

  async showIndexes() {
    try {
      const indexes = await this.apiCall(`/indexes/${this.currentCollection}`)

      const indexList = indexes
        .map(
          (index) =>
            `<div class="index-item">
        <strong>${index.name}</strong>
        <div class="index-keys">${JSON.stringify(index.key)}</div>
        ${index.unique ? '<span class="badge">UNIQUE</span>' : ""}
        ${index.sparse ? '<span class="badge">SPARSE</span>' : ""}
      </div>`,
        )
        .join("")

      const modal = this.createModal(
        "Collection Indexes",
        `
      <div class="indexes-container">
        <button class="btn btn-primary mb-20" onclick="app.createIndex()">Create New Index</button>
        ${indexList}
      </div>
    `,
      )

      document.body.appendChild(modal)
    } catch (error) {
      this.showToast("Failed to load indexes: " + error.message, "error")
    }
  }

  async createIndex() {
    const field = prompt("Enter field name for index:")
    if (!field) return

    const direction = confirm("Ascending order? (Cancel for descending)") ? 1 : -1
    const unique = confirm("Make this index unique?")

    try {
      await this.apiCall(`/indexes/${this.currentCollection}`, {
        method: "POST",
        body: {
          key: { [field]: direction },
          unique,
        },
      })

      this.showToast("Index created successfully!", "success")
    } catch (error) {
      this.showToast("Failed to create index: " + error.message, "error")
    }
  }

  async bulkOperations() {
    const operation = prompt("Bulk operation type (insert/update/delete):")
    if (!operation) return

    if (operation === "insert") {
      const count = Number.parseInt(prompt("Number of sample records to insert:", "10"))
      if (isNaN(count)) return

      try {
        await this.apiCall(`/bulk/${this.currentCollection}/insert`, {
          method: "POST",
          body: { count },
        })

        this.showToast(`${count} sample records inserted!`, "success")
        this.loadCollectionData()
      } catch (error) {
        this.showToast("Bulk insert failed: " + error.message, "error")
      }
    }
  }

  // Analytics tab switching
  showAnalyticsTab(tabName) {
    // Hide all tabs
    document.querySelectorAll(".analytics-tab").forEach((tab) => {
      tab.classList.remove("active")
    })

    // Remove active class from all buttons
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.classList.remove("active")
    })

    // Show selected tab
    const targetTab = document.getElementById(tabName + "Tab")
    if (targetTab) {
      targetTab.classList.add("active")
    }

    // Add active class to clicked button
    event.target.classList.add("active")

    // Load tab-specific content
    switch (tabName) {
      case "trends":
        this.loadTrendsChart()
        break
      case "performance":
        this.loadPerformanceMetrics()
        break
    }
  }

  loadTrendsChart() {
    const canvas = document.getElementById("trendsChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Documents Created",
            data: [12, 19, 3, 5, 2, 3],
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    })
  }

  loadPerformanceMetrics() {
    const queryMetrics = document.getElementById("queryMetrics")
    const indexMetrics = document.getElementById("indexMetrics")

    if (queryMetrics) {
      queryMetrics.innerHTML = `
      <div class="metric-item">
        <strong>Average Query Time:</strong> 15ms
      </div>
      <div class="metric-item">
        <strong>Queries per Second:</strong> 1,250
      </div>
      <div class="metric-item">
        <strong>Cache Hit Rate:</strong> 94.5%
      </div>
    `
    }

    if (indexMetrics) {
      indexMetrics.innerHTML = `
      <div class="metric-item">
        <strong>Total Indexes:</strong> 24
      </div>
      <div class="metric-item">
        <strong>Index Usage:</strong> 87%
      </div>
      <div class="metric-item">
        <strong>Index Size:</strong> 45MB
      </div>
    `
    }
  }

  // Update collection status to show locked records
  updateCollectionStatus() {
    const data = this.sampleData?.[this.currentCollection] || []
    const recordCount = document.getElementById("recordCount")
    const lockedCount = document.getElementById("lockedCount")

    if (recordCount) {
      recordCount.textContent = `${data.length} records in MongoDB`
    }

    const lockedInCollection = Array.from(this.lockedRecords).filter((key) =>
      key.startsWith(this.currentCollection),
    ).length

    if (lockedCount) {
      if (lockedInCollection > 0) {
        lockedCount.textContent = `🔒 Locked: ${lockedInCollection}`
        lockedCount.style.display = "inline"
      } else {
        lockedCount.style.display = "none"
      }
    }
  }

  removeStage(stageId) {
    const stage = document.getElementById(stageId)
    if (stage) {
      stage.remove()
    }
  }

  moveStageUp(stageId) {
    const stage = document.getElementById(stageId)
    if (!stage) return

    const previousStage = stage.previousElementSibling
    if (!previousStage) return

    stage.parentNode.insertBefore(stage, previousStage)
  }

  moveStageDown(stageId) {
    const stage = document.getElementById(stageId)
    if (!stage) return

    const nextStage = stage.nextElementSibling
    if (!nextStage) return

    stage.parentNode.insertBefore(nextStage, stage)
  }

  clearPipeline() {
    const stagesContainer = document.getElementById("pipelineStages")
    if (stagesContainer) {
      stagesContainer.innerHTML = ""
    }
  }

  async executeView(viewId) {
    try {
      const response = await this.apiCall(`/views/${viewId}/execute`)

      const modal = this.createModal(
        `View Results: ${response.view}`,
        `
        <div class="view-results">
          <div class="view-info">
            <strong>Collection:</strong> ${response.collection}<br>
            <strong>Results:</strong> ${response.count} documents
          </div>
          <div class="view-pipeline">
            <h4>Pipeline:</h4>
            <pre>${JSON.stringify(response.pipeline, null, 2)}</pre>
          </div>
          <div class="view-data">
            <h4>Results:</h4>
            <pre>${JSON.stringify(response.results, null, 2)}</pre>
          </div>
        </div>
        `,
      )
      document.body.appendChild(modal)
    } catch (error) {
      this.showToast("Failed to execute view: " + error.message, "error")
    }
  }

  async deleteView(viewId) {
    if (!confirm("Are you sure you want to delete this view?")) {
      return
    }

    try {
      await this.apiCall(`/views/${viewId}`, {
        method: "DELETE",
      })
      this.showToast("View deleted successfully!", "success")

      // Close and refresh the views modal
      const modal = document.querySelector(".modal")
      if (modal) {
        modal.remove()
      }
      this.showViews()
    } catch (error) {
      this.showToast("Failed to delete view: " + error.message, "error")
    }
  }

  async showCollectionAnalytics() {
    if (!this.currentCollection) {
      this.showToast("Please select a collection first", "warning")
      return
    }

    try {
      const analytics = await this.apiCall(`/analytics/${this.currentCollection}`)

      const modal = this.createModal(
        `📊 ${this.collectionSchemas[this.currentCollection].displayName} Analytics`,
        `
        <div class="collection-analytics">
          <div class="analytics-summary">
            <div class="metric-card">
              <div class="metric-value">${analytics.totalCount}</div>
              <div class="metric-label">Total Documents</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.recentCount}</div>
              <div class="metric-label">Added (30 days)</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${analytics.statusDistribution.length}</div>
              <div class="metric-label">Status Types</div>
            </div>
          </div>

          <div class="analytics-charts">
            <div class="chart-container">
              <h4>Status Distribution</h4>
              <canvas id="statusChart" width="300" height="200"></canvas>
            </div>
            
            <div class="chart-container">
              <h4>Daily Creation Trend (Last 7 Days)</h4>
              <canvas id="trendChart" width="300" height="200"></canvas>
            </div>
          </div>

          <div class="recent-documents">
            <h4>Recent Documents</h4>
            <div class="recent-list">
              ${analytics.recentDocuments
                .map(
                  (doc) => `
                <div class="recent-item">
                  <strong>${doc.name}</strong>
                  <span class="recent-date">${new Date(doc.created_at).toLocaleDateString()}</span>
                  <span class="recent-status">${doc.status}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        </div>
        `,
        true, // Extra wide modal
      )

      document.body.appendChild(modal)

      // Create charts after modal is added to DOM
      setTimeout(() => {
        this.createStatusChart(analytics.statusDistribution)
        this.createTrendChart(analytics.dailyTrend)
      }, 100)
    } catch (error) {
      this.showToast("Failed to load collection analytics: " + error.message, "error")
    }
  }

  createStatusChart(statusData) {
    const canvas = document.getElementById("statusChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: statusData.map((item) => item._id || "Unknown"),
        datasets: [
          {
            data: statusData.map((item) => item.count),
            backgroundColor: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    })
  }

  createTrendChart(trendData) {
    const canvas = document.getElementById("trendChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    // Fill in missing dates for last 7 days
    const last7Days = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      last7Days.push(dateStr)
    }

    const chartData = last7Days.map((date) => {
      const found = trendData.find((item) => item._id === date)
      return found ? found.count : 0
    })

    new Chart(ctx, {
      type: "line",
      data: {
        labels: last7Days.map((date) => new Date(date).toLocaleDateString()),
        datasets: [
          {
            label: "Documents Created",
            data: chartData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    })
  }
}

// Initialize the application
const app = new EventManagementApp()

// Global functions for HTML onclick handlers
window.app = app
window.showDashboard = () => app.showDashboard()
window.refreshAllData = () => app.refreshAllData()
window.refreshCollection = () => app.refreshCollection()
window.logout = () => app.logout()
window.addRecord = () => app.addRecord()
window.searchRecords = () => app.handleSearch(document.getElementById("searchInput").value)
window.showAdvancedAnalytics = () => app.showAdvancedAnalytics()
window.showAggregationPipeline = () => app.showAggregationPipeline()
window.addStage = (stageType) => app.addStage(stageType)
window.executePipeline = () => app.executePipeline()
window.lockRecord = (recordId) => app.lockRecord(recordId)
window.unlockRecord = (recordId) => app.unlockRecord(recordId)
window.showLockedRecords = () => app.showLockedRecords()
window.createView = () => app.createView()
window.showViews = () => app.showViews()
window.viewRecordDetails = (recordId) => app.viewRecordDetails(recordId)
window.exportCollection = () => app.exportCollection()
window.showIndexes = () => app.showIndexes()
window.createIndex = () => app.createIndex()
window.bulkOperations = () => app.bulkOperations()
window.showAnalyticsTab = (tabName) => app.showAnalyticsTab(tabName)
window.executeView = (viewId) => app.executeView(viewId)
window.deleteView = (viewId) => app.deleteView(viewId)
window.showCollectionAnalytics = () => app.showCollectionAnalytics()
