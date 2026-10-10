// Global Application State
class EventManagementApp {
  constructor() {
    this.currentScreen = "login"
    this.currentCollection = null
    this.currentDatabase = "events"
    this.sessionId = this.generateSessionId()
    this.lockedRecords = new Set()
    this.dataCache = new Map()
    this.isConnected = false

    // Collection schemas with enhanced MongoDB features
    this.collectionSchemas = {
      members: {
        displayName: "👥 Members",
        fields: ["name", "roll_no", "department", "contact_no", "email", "team_id", "role_id", "status"],
        required: ["name", "roll_no", "email"],
        relationships: { team_id: "teams", role_id: "roles" },
        indexes: ["email", "roll_no", "team_id"],
        aggregations: ["countByDepartment", "activeMembers", "membersByTeam"],
      },
      events: {
        displayName: "🎉 Events",
        fields: ["event_id", "name", "date", "venue", "team_id", "collaborations", "budget", "status"],
        required: ["name", "date", "venue"],
        relationships: { team_id: "teams" },
        indexes: ["date", "status", "team_id"],
        aggregations: ["eventsByMonth", "budgetAnalysis", "upcomingEvents"],
      },
      teams: {
        displayName: "👥 Teams",
        fields: ["team_id", "name", "description", "head_id", "members_count", "budget"],
        required: ["name"],
        relationships: { head_id: "members" },
        indexes: ["name", "head_id"],
        aggregations: ["teamPerformance", "memberDistribution", "budgetUtilization"],
      },
      tasks: {
        displayName: "📋 Tasks",
        fields: ["task_id", "task_name", "description", "assigned_to", "status", "priority", "due_date"],
        required: ["task_name", "assigned_to"],
        relationships: { assigned_to: "members" },
        indexes: ["status", "due_date", "assigned_to"],
        aggregations: ["tasksByStatus", "overdueTasks", "taskCompletion"],
      },
      projects: {
        displayName: "📊 Projects",
        fields: ["project_id", "name", "description", "status", "team_id", "start_date", "end_date"],
        required: ["name", "status"],
        relationships: { team_id: "teams" },
        indexes: ["status", "team_id", "start_date"],
        aggregations: ["projectTimeline", "projectsByTeam", "completionRate"],
      },
      finances: {
        displayName: "💰 Finances",
        fields: ["finance_id", "event_id", "amount", "type", "description", "date", "category"],
        required: ["amount", "type"],
        relationships: { event_id: "events" },
        indexes: ["type", "date", "event_id"],
        aggregations: ["expenseAnalysis", "budgetTracking", "financialTrends"],
      },
      feedbacks: {
        displayName: "📝 Feedbacks",
        fields: ["feedback_id", "member_id", "event_id", "comments", "rating", "date"],
        required: ["member_id", "event_id", "rating"],
        relationships: { member_id: "members", event_id: "events" },
        indexes: ["rating", "date", "event_id"],
        aggregations: ["averageRatings", "feedbackTrends", "eventSatisfaction"],
      },
      attendance: {
        displayName: "✅ Attendance",
        fields: ["attendance_id", "member_id", "event_id", "status", "check_in_time"],
        required: ["member_id", "event_id", "status"],
        relationships: { member_id: "members", event_id: "events" },
        indexes: ["status", "event_id", "member_id"],
        aggregations: ["attendanceRates", "memberParticipation", "eventPopularity"],
      },
    }

    // Sample data for demonstration
    this.sampleData = this.generateSampleData()

    // Initialize the application
    this.init()
  }

  generateSessionId() {
    return "user_" + Date.now()
  }

  generateSampleData() {
    return {
      members: [
        {
          _id: "507f1f77bcf86cd799439011",
          name: "John Doe",
          roll_no: "2021001",
          department: "Computer Science",
          contact_no: "+91-9876543210",
          email: "john.doe@isb.edu",
          team_id: 1,
          role_id: 1,
          status: "Active",
          created_at: new Date("2024-01-15"),
          updated_at: new Date("2024-01-20"),
        },
        {
          _id: "507f1f77bcf86cd799439012",
          name: "Jane Smith",
          roll_no: "2021002",
          department: "Business Administration",
          contact_no: "+91-9876543211",
          email: "jane.smith@isb.edu",
          team_id: 2,
          role_id: 2,
          status: "Active",
          created_at: new Date("2024-01-16"),
          updated_at: new Date("2024-01-21"),
        },
        {
          _id: "507f1f77bcf86cd799439013",
          name: "Mike Johnson",
          roll_no: "2021003",
          department: "Marketing",
          contact_no: "+91-9876543212",
          email: "mike.johnson@isb.edu",
          team_id: 1,
          role_id: 3,
          status: "Active",
          created_at: new Date("2024-01-17"),
          updated_at: new Date("2024-01-22"),
        },
      ],
      events: [
        {
          _id: "507f1f77bcf86cd799439021",
          event_id: 1,
          name: "Annual Tech Conference",
          date: new Date("2024-03-15"),
          venue: "Main Auditorium",
          team_id: 1,
          collaborations: ["Tech Corp", "Innovation Hub"],
          budget: 50000,
          status: "Planned",
          created_at: new Date("2024-01-10"),
        },
        {
          _id: "507f1f77bcf86cd799439022",
          event_id: 2,
          name: "Business Leadership Summit",
          date: new Date("2024-04-20"),
          venue: "Conference Hall",
          team_id: 2,
          collaborations: ["Business Leaders Forum"],
          budget: 75000,
          status: "In Progress",
          created_at: new Date("2024-01-12"),
        },
      ],
      teams: [
        {
          _id: "507f1f77bcf86cd799439031",
          team_id: 1,
          name: "Technology Team",
          description: "Handles all tech-related events and initiatives",
          head_id: "507f1f77bcf86cd799439011",
          members_count: 15,
          budget: 100000,
        },
        {
          _id: "507f1f77bcf86cd799439032",
          team_id: 2,
          name: "Business Development Team",
          description: "Focuses on business events and partnerships",
          head_id: "507f1f77bcf86cd799439012",
          members_count: 12,
          budget: 120000,
        },
      ],
      tasks: [
        {
          _id: "507f1f77bcf86cd799439041",
          task_id: 1,
          task_name: "Setup Event Registration",
          description: "Create online registration system for tech conference",
          assigned_to: "507f1f77bcf86cd799439011",
          status: "In Progress",
          priority: "High",
          due_date: new Date("2024-02-15"),
        },
        {
          _id: "507f1f77bcf86cd799439042",
          task_id: 2,
          task_name: "Venue Booking",
          description: "Book and confirm venue for business summit",
          assigned_to: "507f1f77bcf86cd799439012",
          status: "Completed",
          priority: "Medium",
          due_date: new Date("2024-02-01"),
        },
      ],
      finances: [
        {
          _id: "507f1f77bcf86cd799439051",
          finance_id: 1,
          event_id: 1,
          amount: 25000,
          type: "Expense",
          description: "Venue booking payment",
          date: new Date("2024-01-20"),
          category: "Venue",
        },
        {
          _id: "507f1f77bcf86cd799439052",
          finance_id: 2,
          event_id: 1,
          amount: 15000,
          type: "Expense",
          description: "Catering advance payment",
          date: new Date("2024-01-25"),
          category: "Catering",
        },
      ],
    }
  }

  init() {
    this.setupEventListeners()
    this.showScreen("login")
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
        this.handleSearch(e.target.value)
      })
    }

    // Context menu
    document.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".data-table tbody tr")) {
        e.preventDefault()
        this.showContextMenu(e)
      }
    })

    // Close context menu on click
    document.addEventListener("click", () => {
      this.hideContextMenu()
    })

    // Close modal on outside click
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.closeModal()
      }
    })
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

  handleLogin() {
    const username = document.getElementById("username").value.trim()
    const password = document.getElementById("password").value.trim()
    const statusEl = document.getElementById("loginStatus")

    if (!username || !password) {
      this.showStatus(statusEl, "Please enter both username and password.", "error")
      return
    }

    this.showStatus(statusEl, "Establishing secure connection to CDS ISB Database...", "info")

    // Simulate connection delay
    setTimeout(() => {
      // In a real application, this would make an actual API call
      this.isConnected = true
      document.getElementById("currentDatabase").textContent = this.currentDatabase
      document.getElementById("sessionId").textContent = this.sessionId.slice(-8)

      this.showStatus(statusEl, "Connected successfully! Loading professional dashboard...", "success")

      setTimeout(() => {
        this.showScreen("dashboard")
      }, 1500)
    }, 2000)
  }

  showStatus(element, message, type) {
    element.textContent = message
    element.className = `status-message ${type}`
  }

  initDashboard() {
    this.loadRealTimeStats()
    this.loadCollectionModules()
  }

  loadRealTimeStats() {
    const statsGrid = document.getElementById("statsGrid")
    if (!statsGrid) return

    const stats = [
      { label: "👥 Members", value: this.sampleData.members.length },
      { label: "🎉 Events", value: this.sampleData.events.length },
      { label: "👥 Teams", value: this.sampleData.teams.length },
      { label: "📋 Tasks", value: this.sampleData.tasks.length },
      { label: "💰 Finances", value: this.sampleData.finances.length },
      { label: "🔒 Locked Records", value: this.lockedRecords.size },
      { label: "⏱️ Session Time", value: this.getSessionDuration() },
      { label: "🗄️ Collections", value: Object.keys(this.collectionSchemas).length },
    ]

    statsGrid.innerHTML = stats
      .map(
        (stat) => `
            <div class="stat-card">
                <div class="stat-value">${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `,
      )
      .join("")
  }

  loadCollectionModules() {
    const modulesGrid = document.getElementById("modulesGrid")
    if (!modulesGrid) return

    const modules = Object.entries(this.collectionSchemas).map(([key, schema]) => {
      const count = this.sampleData[key] ? this.sampleData[key].length : 0
      return {
        key,
        displayName: schema.displayName,
        count,
        icon: schema.displayName.split(" ")[0],
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
                <div class="module-count">${module.count} records</div>
                <button class="btn btn-primary" onclick="app.showCollectionManager('${module.key}')">
                    Manage ${module.displayName}
                </button>
            </div>
        `,
      )
      .join("")
  }

  getSessionDuration() {
    const sessionStart = Number.parseInt(this.sessionId.split("_")[1])
    const duration = Math.floor((Date.now() - sessionStart) / 60000)
    return `${duration}m`
  }

  showCollectionManager(collectionName) {
    this.currentCollection = collectionName
    this.showScreen("collection")

    const schema = this.collectionSchemas[collectionName]
    document.getElementById("collectionTitle").innerHTML =
      `<i class="fas fa-database"></i> ${schema.displayName} Management`
    document.getElementById("collectionSubtitle").textContent =
      `Professional data management for ${collectionName} collection`
  }

  initCollectionManager() {
    if (!this.currentCollection) return

    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  loadCollectionData() {
    const schema = this.collectionSchemas[this.currentCollection]
    const data = this.sampleData[this.currentCollection] || []

    // Create table headers
    const tableHeader = document.getElementById("tableHeader")
    tableHeader.innerHTML = schema.fields
      .map((field) => `<th>${field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</th>`)
      .join("")

    // Create table rows
    const tableBody = document.getElementById("tableBody")
    tableBody.innerHTML = data
      .map((record) => {
        const isLocked = this.lockedRecords.has(`${this.currentCollection}_${record._id}`)
        const rowClass = isLocked ? "locked" : ""

        const cells = schema.fields
          .map((field) => {
            let value = record[field] || ""
            if (value instanceof Date) {
              value = value.toLocaleDateString()
            } else if (typeof value === "object") {
              value = JSON.stringify(value)
            }
            return `<td>${isLocked && field === schema.fields[0] ? "🔒 " + value : value}</td>`
          })
          .join("")

        return `<tr class="${rowClass}" data-id="${record._id}">${cells}</tr>`
      })
      .join("")

    // Add click handlers
    tableBody.querySelectorAll("tr").forEach((row) => {
      row.addEventListener("dblclick", () => {
        this.editRecord(row.dataset.id)
      })
    })
  }

  updateCollectionStatus() {
    const data = this.sampleData[this.currentCollection] || []
    const recordCount = document.getElementById("recordCount")
    const lockedCount = document.getElementById("lockedCount")

    recordCount.textContent = `${data.length} records`

    const lockedInCollection = Array.from(this.lockedRecords).filter((key) =>
      key.startsWith(this.currentCollection),
    ).length

    if (lockedInCollection > 0) {
      lockedCount.textContent = `🔒 Locked: ${lockedInCollection}`
      lockedCount.style.display = "inline"
    } else {
      lockedCount.style.display = "none"
    }
  }

  handleSearch(query) {
    if (!this.currentCollection || !query.trim()) {
      this.loadCollectionData()
      return
    }

    const schema = this.collectionSchemas[this.currentCollection]
    const data = this.sampleData[this.currentCollection] || []

    const filteredData = data.filter((record) => {
      return schema.fields.some((field) => {
        const value = record[field]
        if (value) {
          return value.toString().toLowerCase().includes(query.toLowerCase())
        }
        return false
      })
    })

    this.renderFilteredData(filteredData)
  }

  renderFilteredData(data) {
    const schema = this.collectionSchemas[this.currentCollection]
    const tableBody = document.getElementById("tableBody")

    tableBody.innerHTML = data
      .map((record) => {
        const isLocked = this.lockedRecords.has(`${this.currentCollection}_${record._id}`)
        const rowClass = isLocked ? "locked" : ""

        const cells = schema.fields
          .map((field) => {
            let value = record[field] || ""
            if (value instanceof Date) {
              value = value.toLocaleDateString()
            } else if (typeof value === "object") {
              value = JSON.stringify(value)
            }
            return `<td>${isLocked && field === schema.fields[0] ? "🔒 " + value : value}</td>`
          })
          .join("")

        return `<tr class="${rowClass}" data-id="${record._id}">${cells}</tr>`
      })
      .join("")

    // Update record count
    document.getElementById("recordCount").textContent = `${data.length} records (filtered)`
  }

  showContextMenu(event) {
    const contextMenu = document.getElementById("contextMenu")
    const row = event.target.closest("tr")

    if (!row || !row.dataset.id) return

    const recordId = row.dataset.id
    const lockKey = `${this.currentCollection}_${recordId}`
    const isLocked = this.lockedRecords.has(lockKey)

    // Update context menu items based on lock status
    const lockItem = contextMenu.querySelector(".context-item:nth-child(2)")
    if (isLocked) {
      lockItem.innerHTML = '<i class="fas fa-unlock"></i> Unlock Record'
      lockItem.onclick = () => this.unlockRecord(recordId)
    } else {
      lockItem.innerHTML = '<i class="fas fa-lock"></i> Lock Record'
      lockItem.onclick = () => this.lockRecord(recordId)
    }

    // Position and show context menu
    contextMenu.style.left = event.pageX + "px"
    contextMenu.style.top = event.pageY + "px"
    contextMenu.style.display = "block"

    // Store current record ID for other actions
    contextMenu.dataset.recordId = recordId
  }

  hideContextMenu() {
    const contextMenu = document.getElementById("contextMenu")
    contextMenu.style.display = "none"
  }

  addRecord() {
    this.openRecordModal("add")
  }

  editRecord(recordId = null) {
    if (!recordId) {
      const contextMenu = document.getElementById("contextMenu")
      recordId = contextMenu.dataset.recordId
    }

    if (!recordId) {
      this.showToast("Please select a record to edit.", "warning")
      return
    }

    const lockKey = `${this.currentCollection}_${recordId}`
    if (this.lockedRecords.has(lockKey)) {
      this.showToast("This record is currently locked for editing.", "warning")
      return
    }

    this.openRecordModal("edit", recordId)
  }

  openRecordModal(mode, recordId = null) {
    const modal = document.getElementById("recordModal")
    const modalTitle = document.getElementById("modalTitle")
    const formFields = document.getElementById("formFields")

    const schema = this.collectionSchemas[this.currentCollection]
    const isEdit = mode === "edit"

    modalTitle.textContent = isEdit ? `Edit ${schema.displayName} Record` : `Add New ${schema.displayName} Record`

    // Get record data for editing
    let recordData = {}
    if (isEdit && recordId) {
      const data = this.sampleData[this.currentCollection] || []
      recordData = data.find((record) => record._id === recordId) || {}

      // Lock the record
      this.lockRecord(recordId)
    }

    // Generate form fields
    formFields.innerHTML = schema.fields
      .filter((field) => field !== "_id")
      .map((field) => {
        const isRequired = schema.required.includes(field)
        const fieldValue = recordData[field] || ""
        const displayValue = fieldValue instanceof Date ? fieldValue.toISOString().split("T")[0] : fieldValue

        return `
                    <div class="form-group">
                        <label for="${field}">
                            ${field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            ${isRequired ? " *" : ""}
                        </label>
                        ${this.generateFieldInput(field, displayValue, schema)}
                    </div>
                `
      })
      .join("")

    // Store record ID for editing
    modal.dataset.recordId = recordId || ""
    modal.dataset.mode = mode
    modal.classList.add("active")
  }

  generateFieldInput(field, value, schema) {
    const relationships = schema.relationships || {}

    if (relationships[field]) {
      // Dropdown for relationships
      const relatedCollection = relationships[field]
      const relatedData = this.sampleData[relatedCollection] || []
      const options = relatedData
        .map((item) => {
          const label = item.name || item[`${relatedCollection.slice(0, -1)}_id`] || item._id
          return `<option value="${item._id}" ${item._id === value ? "selected" : ""}>${label}</option>`
        })
        .join("")

      return `<select id="${field}" name="${field}">
                <option value="">Select ${field.replace(/_/g, " ")}</option>
                ${options}
            </select>`
    } else if (field.includes("date")) {
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

  handleRecordSubmit() {
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
      } else if (field.endsWith("_id") && value) {
        formData[field] = value
      } else {
        formData[field] = value
      }
    })

    if (hasErrors) return

    // Add metadata
    const now = new Date()
    if (mode === "add") {
      formData._id = this.generateObjectId()
      formData.created_at = now
      formData.created_by = this.sessionId
    } else {
      formData.updated_at = now
      formData.updated_by = this.sessionId
    }

    // Save record
    if (mode === "add") {
      this.saveNewRecord(formData)
    } else {
      this.updateRecord(recordId, formData)
    }

    this.closeModal()
  }

  saveNewRecord(recordData) {
    if (!this.sampleData[this.currentCollection]) {
      this.sampleData[this.currentCollection] = []
    }

    this.sampleData[this.currentCollection].push(recordData)
    this.showToast("Record added successfully!", "success")
    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  updateRecord(recordId, updatedData) {
    const data = this.sampleData[this.currentCollection] || []
    const recordIndex = data.findIndex((record) => record._id === recordId)

    if (recordIndex !== -1) {
      // Merge updated data with existing record
      data[recordIndex] = { ...data[recordIndex], ...updatedData }
      this.showToast("Record updated successfully!", "success")
      this.loadCollectionData()
      this.updateCollectionStatus()

      // Unlock the record
      this.unlockRecord(recordId)
    } else {
      this.showToast("Record not found.", "error")
    }
  }

  generateObjectId() {
    return (
      Math.random().toString(16).slice(2, 10) +
      Math.random().toString(16).slice(2, 10) +
      Math.random().toString(16).slice(2, 10)
    )
  }

  lockRecord(recordId) {
    const lockKey = `${this.currentCollection}_${recordId}`
    this.lockedRecords.add(lockKey)
    this.showToast(`Record locked for editing.`, "info")
    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  unlockRecord(recordId) {
    const lockKey = `${this.currentCollection}_${recordId}`
    this.lockedRecords.delete(lockKey)
    this.showToast(`Record unlocked.`, "info")
    this.loadCollectionData()
    this.updateCollectionStatus()
  }

  copyRecord() {
    const contextMenu = document.getElementById("contextMenu")
    const recordId = contextMenu.dataset.recordId

    if (!recordId) return

    const data = this.sampleData[this.currentCollection] || []
    const record = data.find((r) => r._id === recordId)

    if (record) {
      const recordText =
        `CDS ISB ${this.currentCollection} Record\n` +
        "=".repeat(50) +
        "\n" +
        Object.entries(record)
          .map(([key, value]) => `${key}: ${value}`)
          .join("\n") +
        `\n\nExported on: ${new Date().toLocaleString()}\n` +
        `Session: ${this.sessionId}`

      navigator.clipboard.writeText(recordText).then(() => {
        this.showToast("Record copied to clipboard!", "success")
      })
    }
  }

  deleteRecord() {
    const contextMenu = document.getElementById("contextMenu")
    const recordId = contextMenu.dataset.recordId

    if (!recordId) return

    const lockKey = `${this.currentCollection}_${recordId}`
    if (this.lockedRecords.has(lockKey)) {
      this.showToast("Cannot delete a locked record. Please unlock it first.", "warning")
      return
    }

    if (confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      const data = this.sampleData[this.currentCollection] || []
      const recordIndex = data.findIndex((record) => record._id === recordId)

      if (recordIndex !== -1) {
        data.splice(recordIndex, 1)
        this.showToast("Record deleted successfully.", "success")
        this.loadCollectionData()
        this.updateCollectionStatus()
      } else {
        this.showToast("Record not found.", "error")
      }
    }
  }

  viewDetails() {
    const contextMenu = document.getElementById("contextMenu")
    const recordId = contextMenu.dataset.recordId

    if (!recordId) return

    const data = this.sampleData[this.currentCollection] || []
    const record = data.find((r) => r._id === recordId)

    if (record) {
      const detailsWindow = window.open("", "_blank", "width=800,height=600")
      detailsWindow.document.write(`
                <html>
                <head>
                    <title>Record Details - ${this.currentCollection}</title>
                    <style>
                        body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
                        h1 { color: #1e40af; }
                        pre { background: #f8fafc; padding: 20px; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>Record Details</h1>
                    <p><strong>Collection:</strong> ${this.currentCollection}</p>
                    <p><strong>Record ID:</strong> ${recordId}</p>
                    <pre>${JSON.stringify(record, null, 2)}</pre>
                </body>
                </html>
            `)
    }
  }

  closeModal() {
    const modal = document.getElementById("recordModal")
    modal.classList.remove("active")

    // Unlock record if it was being edited
    const recordId = modal.dataset.recordId
    if (recordId && modal.dataset.mode === "edit") {
      this.unlockRecord(recordId)
    }
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

  // Advanced Analytics Functions
  initAnalytics() {
    this.loadSystemOverview()
    this.populateAggregationCollections()
  }

  loadSystemOverview() {
    const systemStats = document.getElementById("systemStats")
    if (!systemStats) return

    const totalDocuments = Object.values(this.sampleData).reduce((sum, collection) => sum + collection.length, 0)

    const stats = `
            <div class="stat-item">
                <strong>Total Collections:</strong> ${Object.keys(this.collectionSchemas).length}
            </div>
            <div class="stat-item">
                <strong>Total Documents:</strong> ${totalDocuments.toLocaleString()}
            </div>
            <div class="stat-item">
                <strong>Active Session:</strong> ${this.sessionId.slice(-8)}
            </div>
            <div class="stat-item">
                <strong>Locked Records:</strong> ${this.lockedRecords.size}
            </div>
            <div class="stat-item">
                <strong>Database:</strong> ${this.currentDatabase}
            </div>
        `

    systemStats.innerHTML = stats

    // Load recent activity
    this.loadRecentActivity()

    // Create collection chart
    this.createCollectionChart()
  }

  loadRecentActivity() {
    const recentActivity = document.getElementById("recentActivity")
    if (!recentActivity) return

    const activities = [
      { action: "Record Added", collection: "members", time: "2 minutes ago" },
      { action: "Record Updated", collection: "events", time: "5 minutes ago" },
      { action: "Record Locked", collection: "tasks", time: "10 minutes ago" },
      { action: "Data Exported", collection: "finances", time: "15 minutes ago" },
      { action: "Analytics Generated", collection: "system", time: "20 minutes ago" },
    ]

    recentActivity.innerHTML = activities
      .map(
        (activity) => `
            <div class="activity-item" style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <strong>${activity.action}</strong> in ${activity.collection}
                <div style="font-size: 0.8rem; color: #6b7280;">${activity.time}</div>
            </div>
        `,
      )
      .join("")
  }

  createCollectionChart() {
    const canvas = document.getElementById("collectionChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    const collections = Object.keys(this.sampleData)
    const counts = collections.map((col) => this.sampleData[col].length)

    new Chart(ctx, {
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

  populateAggregationCollections() {
    const select = document.getElementById("aggregationCollection")
    if (!select) return

    select.innerHTML =
      '<option value="">Select Collection</option>' +
      Object.entries(this.collectionSchemas)
        .map(([key, schema]) => `<option value="${key}">${schema.displayName}</option>`)
        .join("")
  }

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

    // Generate sample trend data
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    const eventsData = [5, 8, 12, 15, 18, 22]
    const membersData = [50, 65, 80, 95, 110, 125]

    new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Events",
            data: eventsData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
          },
          {
            label: "Members",
            data: membersData,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
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
                <div class="metric-item">
                    <strong>Slow Queries:</strong> 3
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
                    <strong>Unused Indexes:</strong> 2
                </div>
                <div class="metric-item">
                    <strong>Index Size:</strong> 45MB
                </div>
            `
    }
  }

  runAggregation() {
    const collection = document.getElementById("aggregationCollection").value
    const pipeline = document.getElementById("aggregationPipeline").value

    if (!collection || !pipeline) {
      this.showToast("Please select both collection and pipeline type.", "warning")
      return
    }

    const pipelineCode = this.generateAggregationPipeline(collection, pipeline)
    const results = this.executeAggregation(collection, pipeline)

    document.getElementById("pipelineCode").textContent = pipelineCode
    document.getElementById("aggregationResults").innerHTML = this.formatAggregationResults(results)
  }

  generateAggregationPipeline(collection, pipelineType) {
    const pipelines = {
      count: `db.${collection}.aggregate([
    {
        $group: {
            _id: "$status",
            count: { $sum: 1 }
        }
    },
    {
        $sort: { count: -1 }
    }
])`,
      group: `db.${collection}.aggregate([
    {
        $group: {
            _id: "$team_id",
            total: { $sum: "$amount" },
            average: { $avg: "$amount" },
            count: { $sum: 1 }
        }
    }
])`,
      match: `db.${collection}.aggregate([
    {
        $match: {
            status: "Active",
            date: { $gte: new Date("2024-01-01") }
        }
    },
    {
        $project: {
            name: 1,
            status: 1,
            date: 1
        }
    }
])`,
      sort: `db.${collection}.aggregate([
    {
        $sort: { date: -1 }
    },
    {
        $limit: 10
    }
])`,
      lookup: `db.${collection}.aggregate([
    {
        $lookup: {
            from: "teams",
            localField: "team_id",
            foreignField: "team_id",
            as: "team_info"
        }
    },
    {
        $unwind: "$team_info"
    }
])`,
    }

    return pipelines[pipelineType] || "// Select a pipeline type"
  }

  executeAggregation(collection, pipelineType) {
    const data = this.sampleData[collection] || []

    switch (pipelineType) {
      case "count":
        return this.aggregateCount(data)
      case "group":
        return this.aggregateGroup(data)
      case "match":
        return this.aggregateMatch(data)
      case "sort":
        return this.aggregateSort(data)
      case "lookup":
        return this.aggregateLookup(data, collection)
      default:
        return []
    }
  }

  aggregateCount(data) {
    const counts = {}
    data.forEach((record) => {
      const status = record.status || "Unknown"
      counts[status] = (counts[status] || 0) + 1
    })

    return Object.entries(counts)
      .map(([status, count]) => ({ _id: status, count }))
      .sort((a, b) => b.count - a.count)
  }

  aggregateGroup(data) {
    const groups = {}
    data.forEach((record) => {
      const teamId = record.team_id || "Unknown"
      if (!groups[teamId]) {
        groups[teamId] = { total: 0, count: 0, amounts: [] }
      }

      const amount = record.amount || record.budget || 0
      groups[teamId].total += amount
      groups[teamId].count += 1
      groups[teamId].amounts.push(amount)
    })

    return Object.entries(groups).map(([teamId, group]) => ({
      _id: teamId,
      total: group.total,
      average: group.total / group.count,
      count: group.count,
    }))
  }

  aggregateMatch(data) {
    return data
      .filter((record) => {
        const isActive = record.status === "Active"
        const isRecent = record.date && new Date(record.date) >= new Date("2024-01-01")
        return isActive && isRecent
      })
      .map((record) => ({
        name: record.name,
        status: record.status,
        date: record.date,
      }))
  }

  aggregateSort(data) {
    return data
      .filter((record) => record.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10)
  }

  aggregateLookup(data, collection) {
    if (collection === "events") {
      return data.map((event) => {
        const team = this.sampleData.teams?.find((t) => t.team_id === event.team_id)
        return {
          ...event,
          team_info: team || null,
        }
      })
    }
    return data
  }

  formatAggregationResults(results) {
    if (!results || results.length === 0) {
      return '<div class="no-results">No results found</div>'
    }

    return `
            <div class="results-summary">
                <strong>${results.length} documents returned</strong>
            </div>
            <div class="results-data">
                <pre>${JSON.stringify(results, null, 2)}</pre>
            </div>
        `
  }

  // Aggregation Pipeline Builder
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
      group: '{\n  "_id": "$team_id",\n  "count": { "$sum": 1 },\n  "total": { "$sum": "$amount" }\n}',
      sort: '{\n  "date": -1\n}',
      project: '{\n  "name": 1,\n  "status": 1,\n  "date": 1\n}',
      lookup: '{\n  "from": "teams",\n  "localField": "team_id",\n  "foreignField": "team_id",\n  "as": "team_info"\n}',
      unwind: '"$team_info"',
      limit: "10",
      skip: "5",
    }

    return templates[stageType] || "{}"
  }

  moveStageUp(stageId) {
    const stage = document.getElementById(stageId)
    const prevStage = stage.previousElementSibling
    if (prevStage) {
      stage.parentNode.insertBefore(stage, prevStage)
    }
  }

  moveStageDown(stageId) {
    const stage = document.getElementById(stageId)
    const nextStage = stage.nextElementSibling
    if (nextStage) {
      stage.parentNode.insertBefore(nextStage, stage)
    }
  }

  removeStage(stageId) {
    const stage = document.getElementById(stageId)
    if (stage) {
      stage.remove()
    }
  }

  executePipeline() {
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
      const results = this.executePipelineStages(collection, stages)
      this.displayPipelineResults(results)
    } catch (error) {
      this.showToast("Pipeline execution failed: " + error.message, "error")
    }
  }

  getPipelineStages() {
    const stagesContainer = document.getElementById("pipelineStages")
    const stageElements = stagesContainer.querySelectorAll(".pipeline-stage")

    return Array.from(stageElements).map((stageEl) => {
      const stageType = stageEl.querySelector(".stage-title").textContent.replace("$", "")
      const stageContent = stageEl.querySelector("textarea").value.trim()

      try {
        return {
          type: stageType,
          content: JSON.parse(stageContent),
        }
      } catch (error) {
        throw new Error(`Invalid JSON in ${stageType} stage: ${error.message}`)
      }
    })
  }

  executePipelineStages(collection, stages) {
    let data = [...(this.sampleData[collection] || [])]

    for (const stage of stages) {
      data = this.applyPipelineStage(data, stage)
    }

    return data
  }

  applyPipelineStage(data, stage) {
    switch (stage.type) {
      case "match":
        return data.filter((doc) => this.matchDocument(doc, stage.content))
      case "group":
        return this.groupDocuments(data, stage.content)
      case "sort":
        return this.sortDocuments(data, stage.content)
      case "project":
        return data.map((doc) => this.projectDocument(doc, stage.content))
      case "limit":
        return data.slice(0, Number.parseInt(stage.content))
      case "skip":
        return data.slice(Number.parseInt(stage.content))
      default:
        return data
    }
  }

  matchDocument(doc, matchCriteria) {
    for (const [field, criteria] of Object.entries(matchCriteria)) {
      const docValue = doc[field]

      if (typeof criteria === "object" && criteria !== null) {
        // Handle operators like $gte, $lte, etc.
        for (const [operator, value] of Object.entries(criteria)) {
          switch (operator) {
            case "$gte":
              if (docValue < value) return false
              break
            case "$lte":
              if (docValue > value) return false
              break
            case "$gt":
              if (docValue <= value) return false
              break
            case "$lt":
              if (docValue >= value) return false
              break
            case "$ne":
              if (docValue === value) return false
              break
            case "$in":
              if (!value.includes(docValue)) return false
              break
          }
        }
      } else {
        // Direct equality match
        if (docValue !== criteria) return false
      }
    }
    return true
  }

  groupDocuments(data, groupCriteria) {
    const groups = {}
    const groupId = groupCriteria._id

    data.forEach((doc) => {
      const key = this.evaluateGroupKey(doc, groupId)
      if (!groups[key]) {
        groups[key] = { _id: key, docs: [] }
      }
      groups[key].docs.push(doc)
    })

    return Object.values(groups).map((group) => {
      const result = { _id: group._id }

      for (const [field, operation] of Object.entries(groupCriteria)) {
        if (field === "_id") continue

        if (typeof operation === "object" && operation !== null) {
          for (const [operator, fieldName] of Object.entries(operation)) {
            switch (operator) {
              case "$sum":
                if (fieldName === 1) {
                  result[field] = group.docs.length
                } else {
                  const sumField = fieldName.replace("$", "")
                  result[field] = group.docs.reduce((sum, doc) => sum + (doc[sumField] || 0), 0)
                }
                break
              case "$avg":
                const avgField = fieldName.replace("$", "")
                const values = group.docs.map((doc) => doc[avgField] || 0)
                result[field] = values.reduce((sum, val) => sum + val, 0) / values.length
                break
              case "$max":
                const maxField = fieldName.replace("$", "")
                result[field] = Math.max(...group.docs.map((doc) => doc[maxField] || 0))
                break
              case "$min":
                const minField = fieldName.replace("$", "")
                result[field] = Math.min(...group.docs.map((doc) => doc[minField] || 0))
                break
            }
          }
        }
      }

      return result
    })
  }

  evaluateGroupKey(doc, groupId) {
    if (typeof groupId === "string" && groupId.startsWith("$")) {
      const field = groupId.replace("$", "")
      return doc[field] || null
    }
    return groupId
  }

  sortDocuments(data, sortCriteria) {
    return data.sort((a, b) => {
      for (const [field, direction] of Object.entries(sortCriteria)) {
        const aVal = a[field]
        const bVal = b[field]

        if (aVal < bVal) return direction === 1 ? -1 : 1
        if (aVal > bVal) return direction === 1 ? 1 : -1
      }
      return 0
    })
  }

  projectDocument(doc, projection) {
    const result = {}

    for (const [field, include] of Object.entries(projection)) {
      if (include === 1) {
        result[field] = doc[field]
      }
    }

    // Always include _id unless explicitly excluded
    if (projection._id !== 0) {
      result._id = doc._id
    }

    return result
  }

  displayPipelineResults(results) {
    const resultsContainer = document.getElementById("pipelineResults")
    const resultCount = document.getElementById("resultCount")

    if (resultCount) {
      resultCount.textContent = `${results.length} documents`
    }

    if (resultsContainer) {
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

  savePipeline() {
    const collection = document.getElementById("pipelineCollection").value
    const stages = this.getPipelineStages()

    if (!collection || stages.length === 0) {
      this.showToast("Please select a collection and add pipeline stages.", "warning")
      return
    }

    const pipeline = {
      collection,
      stages,
      created: new Date().toISOString(),
      name: prompt("Enter pipeline name:") || "Untitled Pipeline",
    }

    // In a real application, this would save to a database
    localStorage.setItem("savedPipeline_" + Date.now(), JSON.stringify(pipeline))
    this.showToast("Pipeline saved successfully!", "success")
  }

  clearPipeline() {
    const stagesContainer = document.getElementById("pipelineStages")
    if (stagesContainer) {
      stagesContainer.innerHTML = ""
    }

    const resultsContainer = document.getElementById("pipelineResults")
    if (resultsContainer) {
      resultsContainer.innerHTML = '<div class="no-results">No pipeline executed yet</div>'
    }

    const resultCount = document.getElementById("resultCount")
    if (resultCount) {
      resultCount.textContent = "0 documents"
    }
  }

  // Utility Functions
  refreshAllData() {
    this.dataCache.clear()
    this.showToast("All data refreshed from database.", "success")

    if (this.currentScreen === "dashboard") {
      this.initDashboard()
    } else if (this.currentScreen === "collection") {
      this.initCollectionManager()
    }
  }

  refreshCollection() {
    if (this.currentCollection) {
      this.loadCollectionData()
      this.updateCollectionStatus()
      this.showToast("Collection data refreshed.", "success")
    }
  }

  exportData() {
    if (!this.currentCollection) return

    const data = this.sampleData[this.currentCollection] || []
    const jsonData = JSON.stringify(data, null, 2)

    const blob = new Blob([jsonData], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${this.currentCollection}_export_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    this.showToast("Data exported successfully!", "success")
  }

  createView() {
    if (!this.currentCollection) return

    const viewName = prompt("Enter view name:")
    if (!viewName) return

    const pipeline = prompt("Enter aggregation pipeline (JSON):")
    if (!pipeline) return

    try {
      const parsedPipeline = JSON.parse(pipeline)

      // In a real MongoDB application, this would create an actual view
      const view = {
        name: viewName,
        collection: this.currentCollection,
        pipeline: parsedPipeline,
        created: new Date().toISOString(),
      }

      localStorage.setItem("view_" + viewName, JSON.stringify(view))
      this.showToast(`View "${viewName}" created successfully!`, "success")
    } catch (error) {
      this.showToast("Invalid JSON pipeline: " + error.message, "error")
    }
  }

  showAdvancedAnalytics() {
    this.showScreen("analytics")
  }

  showDatabaseAdmin() {
    this.showToast("Database administration features coming soon!", "info")
  }

  showAggregationPipeline() {
    this.showScreen("aggregation")
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

  showDashboard() {
    this.showScreen("dashboard")
  }

  logout() {
    if (confirm("Are you sure you want to logout?")) {
      this.isConnected = false
      this.lockedRecords.clear()
      this.dataCache.clear()
      this.currentCollection = null
      this.showScreen("login")

      // Clear form fields
      document.getElementById("username").value = ""
      document.getElementById("password").value = ""
      document.getElementById("loginStatus").textContent = ""
    }
  }

  showCollectionAnalytics() {
    this.showToast("Collection analytics feature coming soon!", "info")
  }
}

// Initialize the application
const app = new EventManagementApp()

// Global functions for HTML onclick handlers
window.app = app
window.showDashboard = () => app.showDashboard()
window.showAdvancedAnalytics = () => app.showAdvancedAnalytics()
window.showDatabaseAdmin = () => app.showDatabaseAdmin()
window.showAggregationPipeline = () => app.showAggregationPipeline()
window.showLockedRecords = () => app.showLockedRecords()
window.refreshAllData = () => app.refreshAllData()
window.refreshCollection = () => app.refreshCollection()
window.logout = () => app.logout()
window.addRecord = () => app.addRecord()
window.editRecord = () => app.editRecord()
window.lockRecord = () => app.lockRecord()
window.copyRecord = () => app.copyRecord()
window.deleteRecord = () => app.deleteRecord()
window.viewDetails = () => app.viewDetails()
window.closeModal = () => app.closeModal()
window.exportData = () => app.exportData()
window.createView = () => app.createView()
window.showCollectionAnalytics = () => app.showCollectionAnalytics()
window.searchRecords = () => app.handleSearch(document.getElementById("searchInput").value)
window.runAggregation = () => app.runAggregation()
window.showAnalyticsTab = (tab) => app.showAnalyticsTab(tab)
window.addStage = (type) => app.addStage(type)
window.executePipeline = () => app.executePipeline()
window.savePipeline = () => app.savePipeline()
window.clearPipeline = () => app.clearPipeline()
