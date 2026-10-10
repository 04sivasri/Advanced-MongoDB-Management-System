const express = require("express")
const { MongoClient, ObjectId } = require("mongodb")
const cors = require("cors")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: "10mb" }))
app.use(express.static("public"))

// MongoDB connection
let db
let client
let availableDatabases = []

// Connect to MongoDB Atlas
async function connectToMongoDB() {
  try {
    console.log("🔄 Attempting to connect to MongoDB Atlas...")
    console.log("Connection URI:", process.env.MONGODB_URI ? "URI provided" : "❌ No URI provided")

    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set")
    }

    client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()

    // Test the connection
    await client.db("admin").command({ ping: 1 })

    console.log("✅ Successfully connected to MongoDB Atlas!")

    // Get list of available databases
    const adminDb = client.db("admin")
    const dbList = await adminDb.admin().listDatabases()
    availableDatabases = dbList.databases
      .filter((db) => !["admin", "local", "config"].includes(db.name))
      .map((db) => ({
        name: db.name,
        sizeOnDisk: db.sizeOnDisk || 0,
      }))

    console.log(
      "📊 Available databases:",
      availableDatabases.map((db) => db.name),
    )

    return true
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message)
    return false
  }
}

// Get available databases endpoint
app.get("/api/databases", async (req, res) => {
  try {
    if (!client) {
      return res.status(500).json({ error: "Database client not connected" })
    }

    // Refresh database list
    const adminDb = client.db("admin")
    const dbList = await adminDb.admin().listDatabases()
    const databases = dbList.databases
      .filter((db) => !["admin", "local", "config"].includes(db.name))
      .map((db) => ({
        name: db.name,
        sizeOnDisk: db.sizeOnDisk || 0,
        collections: 0, // Will be populated when selected
      }))

    res.json({ databases })
  } catch (error) {
    console.error("Database list error:", error)
    res.status(500).json({
      error: "Failed to fetch databases",
      details: error.message,
    })
  }
})

// Connect to specific database endpoint
app.post("/api/connect-database", async (req, res) => {
  try {
    const { databaseName } = req.body

    if (!client) {
      return res.status(500).json({ error: "MongoDB client not connected" })
    }

    if (!databaseName) {
      return res.status(400).json({ error: "Database name is required" })
    }

    // Connect to the specified database
    db = client.db(databaseName)

    // Test the database connection
    await db.command({ ping: 1 })

    // Get collections in this database
    const collections = await db.listCollections().toArray()

    console.log(`✅ Connected to database: ${databaseName}`)
    console.log(
      `📁 Collections found:`,
      collections.map((c) => c.name),
    )

    res.json({
      success: true,
      message: `Successfully connected to database: ${databaseName}`,
      database: {
        name: databaseName,
        collections: collections.map((c) => c.name),
      },
    })
  } catch (error) {
    console.error("Database connection error:", error)
    res.status(500).json({
      error: "Failed to connect to database",
      details: error.message,
    })
  }
})

// Simple authentication
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body

    console.log("🔐 Login attempt:", { username, password: "***" })

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" })
    }

    // Check credentials against environment variables
    const validUsername = process.env.ADMIN_USERNAME || "admin"
    const validPassword = process.env.ADMIN_PASSWORD || "password"

    if (username !== validUsername || password !== validPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Test MongoDB Atlas connection
    if (!client) {
      return res.status(500).json({ error: "MongoDB Atlas not connected" })
    }

    await client.db("admin").command({ ping: 1 })

    res.json({
      success: true,
      message: "Authentication successful! MongoDB Atlas connected.",
      user: { username },
      requiresDatabaseSelection: true,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      error: "Login failed",
      details: error.message,
    })
  }
})

// Get database statistics
app.get("/api/stats", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const collections = ["members", "events", "teams", "tasks", "projects", "finances", "feedbacks", "attendance"]
    const stats = {}

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        stats[collectionName] = await collection.countDocuments()
      } catch (error) {
        console.log(`Collection ${collectionName} might not exist yet`)
        stats[collectionName] = 0
      }
    }

    // Get database info
    const dbStats = await db.stats()

    res.json({
      collections: stats,
      database: {
        name: db.databaseName,
        size: dbStats.dataSize || 0,
        collections: dbStats.collections || 0,
        indexes: dbStats.indexes || 0,
      },
    })
  } catch (error) {
    console.error("Stats error:", error)
    res.status(500).json({
      error: "Failed to fetch statistics",
      details: error.message,
    })
  }
})

// Advanced Analytics endpoint
app.get("/api/analytics/overview", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const collections = ["members", "events", "teams", "tasks", "projects", "finances", "feedbacks", "attendance"]
    const analytics = {
      totalDocuments: 0,
      activeCollections: 0,
      collectionStats: {},
      recentActivity: [],
    }

    // Get collection stats
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        const count = await collection.countDocuments()
        analytics.collectionStats[collectionName] = count
        analytics.totalDocuments += count
        if (count > 0) analytics.activeCollections++
      } catch (error) {
        analytics.collectionStats[collectionName] = 0
      }
    }

    // Calculate average documents per collection
    analytics.avgDocsPerCollection =
      analytics.activeCollections > 0 ? Math.round(analytics.totalDocuments / analytics.activeCollections) : 0

    // Find most active collection
    const mostActive = Object.entries(analytics.collectionStats).reduce(
      (max, [name, count]) => (count > max.count ? { name, count } : max),
      { name: "None", count: 0 },
    )
    analytics.mostActiveCollection = mostActive.name

    // Get recent activity (last 10 documents across all collections)
    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName)
        const recent = await collection.find({}).sort({ _id: -1 }).limit(2).toArray()

        recent.forEach((doc) => {
          analytics.recentActivity.push({
            action: "Document Created",
            collection: collectionName,
            timestamp: doc._id.getTimestamp(),
          })
        })
      } catch (error) {
        // Collection might not exist
      }
    }

    // Sort recent activity by timestamp
    analytics.recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    analytics.recentActivity = analytics.recentActivity.slice(0, 10)

    res.json(analytics)
  } catch (error) {
    console.error("Analytics error:", error)
    res.status(500).json({
      error: "Failed to fetch analytics",
      details: error.message,
    })
  }
})

// Fix the aggregation pipeline endpoint to properly handle and return results
app.post("/api/aggregation/:collection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        error: "Database not connected",
        details: "MongoDB connection was not established",
      })
    }

    const { collection: collectionName } = req.params
    const { pipeline } = req.body

    console.log("Executing aggregation pipeline:", JSON.stringify(pipeline))

    if (!pipeline || !Array.isArray(pipeline) || pipeline.length === 0) {
      return res.status(400).json({
        error: "Invalid pipeline",
        details: "Pipeline must be a non-empty array",
      })
    }

    const collection = db.collection(collectionName)

    // Execute the aggregation pipeline
    const results = await collection.aggregate(pipeline).toArray()

    console.log(`Aggregation returned ${results.length} results`)

    res.json({
      collection: collectionName,
      pipeline,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("Aggregation error:", error)
    res.status(500).json({
      error: "Aggregation failed: " + error.message,
      details: error.stack,
    })
  }
})

// Views endpoints
app.get("/api/views", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const views = await db.collection("_views").find({}).toArray()
    res.json(views)
  } catch (error) {
    console.error("Views error:", error)
    res.status(500).json({ error: "Failed to fetch views" })
  }
})

app.post("/api/views", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { name, collection, pipeline } = req.body
    const view = {
      name,
      collection,
      pipeline,
      created_at: new Date(),
    }

    const result = await db.collection("_views").insertOne(view)
    res.json({ success: true, id: result.insertedId })
  } catch (error) {
    console.error("Create view error:", error)
    res.status(500).json({ error: "Failed to create view" })
  }
})

// Execute view endpoint
app.get("/api/views/:id/execute", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { id } = req.params
    const view = await db.collection("_views").findOne({ _id: new ObjectId(id) })

    if (!view) {
      return res.status(404).json({ error: "View not found" })
    }

    const collection = db.collection(view.collection)
    const results = await collection.aggregate(view.pipeline).toArray()

    res.json({
      view: view.name,
      collection: view.collection,
      pipeline: view.pipeline,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("View execution error:", error)
    res.status(500).json({
      error: "Failed to execute view: " + error.message,
      details: error.stack,
    })
  }
})

// Delete view endpoint
app.delete("/api/views/:id", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { id } = req.params
    const result = await db.collection("_views").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "View not found" })
    }

    res.json({ message: "View deleted successfully" })
  } catch (error) {
    console.error("Delete view error:", error)
    res.status(500).json({ error: "Failed to delete view: " + error.message })
  }
})

// Indexes endpoints
app.get("/api/indexes/:collection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { collection: collectionName } = req.params
    const collection = db.collection(collectionName)
    const indexes = await collection.indexes()

    res.json(indexes)
  } catch (error) {
    console.error("Indexes error:", error)
    res.status(500).json({ error: "Failed to fetch indexes" })
  }
})

app.post("/api/indexes/:collection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { collection: collectionName } = req.params
    const { key, unique = false, sparse = false } = req.body

    const collection = db.collection(collectionName)
    const options = { unique, sparse }

    await collection.createIndex(key, options)
    res.json({ success: true, message: "Index created successfully" })
  } catch (error) {
    console.error("Create index error:", error)
    res.status(500).json({ error: "Failed to create index: " + error.message })
  }
})

// Bulk operations endpoint
app.post("/api/bulk/:collection/:operation", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { collection: collectionName, operation } = req.params
    const collection = db.collection(collectionName)

    if (operation === "insert") {
      const { count = 10 } = req.body
      const sampleDocuments = []

      // Generate sample documents based on collection type
      for (let i = 0; i < count; i++) {
        let doc = {
          created_at: new Date(),
          sample: true,
        }

        switch (collectionName) {
          case "members":
            doc = {
              ...doc,
              name: `Sample Member ${i + 1}`,
              email: `sample${i + 1}@example.com`,
              status: "Active",
            }
            break
          case "events":
            doc = {
              ...doc,
              name: `Sample Event ${i + 1}`,
              date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
              status: "Planned",
            }
            break
          default:
            doc.name = `Sample ${collectionName} ${i + 1}`
        }

        sampleDocuments.push(doc)
      }

      const result = await collection.insertMany(sampleDocuments)
      res.json({
        success: true,
        inserted: result.insertedCount,
        message: `${result.insertedCount} sample documents inserted`,
      })
    } else {
      res.status(400).json({ error: "Operation not supported" })
    }
  } catch (error) {
    console.error("Bulk operation error:", error)
    res.status(500).json({ error: "Bulk operation failed: " + error.message })
  }
})

// Export endpoint with format support
app.get("/api/export/:collection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { collection: collectionName } = req.params
    const { format = "json" } = req.query

    const collections = ["members", "events", "teams", "tasks", "projects", "finances", "feedbacks", "attendance"]
    if (!collections.includes(collectionName)) {
      return res.status(400).json({ error: "Invalid collection name" })
    }

    const collection = db.collection(collectionName)
    const documents = await collection.find({}).toArray()

    if (format === "csv") {
      // Convert to CSV
      if (documents.length === 0) {
        return res.status(404).json({ error: "No documents to export" })
      }

      const headers = Object.keys(documents[0]).join(",")
      const rows = documents.map((doc) =>
        Object.values(doc)
          .map((val) => (typeof val === "object" ? JSON.stringify(val) : val))
          .join(","),
      )

      const csv = [headers, ...rows].join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${collectionName}_export_${new Date().toISOString().split("T")[0]}.csv`,
      )
      res.send(csv)
    } else {
      // JSON format
      res.setHeader("Content-Type", "application/json")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${collectionName}_export_${new Date().toISOString().split("T")[0]}.json`,
      )
      res.json(documents)
    }
  } catch (error) {
    console.error("Export error:", error)
    res.status(500).json({ error: "Failed to export data" })
  }
})

// Generic CRUD operations for collections
const collections = ["members", "events", "teams", "tasks", "projects", "finances", "feedbacks", "attendance"]

collections.forEach((collectionName) => {
  // Get all documents
  app.get(`/api/${collectionName}`, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not connected" })
      }

      const { page = 1, limit = 100, search } = req.query
      const collection = db.collection(collectionName)

      let query = {}
      if (search) {
        query = {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        }
      }

      const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

      const documents = await collection
        .find(query)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(Number.parseInt(limit))
        .toArray()

      const total = await collection.countDocuments(query)

      res.json({
        data: documents,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / Number.parseInt(limit)),
        },
      })
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error)
      res.status(500).json({
        error: `Failed to fetch ${collectionName}`,
        details: error.message,
      })
    }
  })

  // Get single document
  app.get(`/api/${collectionName}/:id`, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not connected" })
      }

      const collection = db.collection(collectionName)
      const document = await collection.findOne({ _id: new ObjectId(req.params.id) })

      if (!document) {
        return res.status(404).json({ error: "Document not found" })
      }

      res.json(document)
    } catch (error) {
      console.error(`Error fetching ${collectionName} document:`, error)
      res.status(500).json({
        error: "Failed to fetch document",
        details: error.message,
      })
    }
  })

  // Create new document
  app.post(`/api/${collectionName}`, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not connected" })
      }

      const collection = db.collection(collectionName)
      const document = {
        ...req.body,
        created_at: new Date(),
        updated_at: new Date(),
      }

      const result = await collection.insertOne(document)
      const newDocument = await collection.findOne({ _id: result.insertedId })

      res.status(201).json(newDocument)
    } catch (error) {
      console.error(`Error creating ${collectionName} document:`, error)
      res.status(500).json({
        error: "Failed to create document",
        details: error.message,
      })
    }
  })

  // Fix the document update endpoint to properly handle updates
  app.put(`/api/${collectionName}/:id`, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not connected" })
      }

      const { id } = req.params

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid document ID format" })
      }

      const collection = db.collection(collectionName)
      const updateData = {
        ...req.body,
        updated_at: new Date(),
      }

      console.log(`Updating document ${id} in ${collectionName}:`, updateData)

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: "after" },
      )

      if (!result.value) {
        return res.status(404).json({ error: "Document not found" })
      }

      console.log("Document updated successfully")
      res.json(result.value)
    } catch (error) {
      console.error(`Error updating document:`, error)
      res.status(500).json({
        error: "Failed to update document",
        details: error.message,
      })
    }
  })

  // Delete document
  app.delete(`/api/${collectionName}/:id`, async (req, res) => {
    try {
      if (!db) {
        return res.status(500).json({ error: "Database not connected" })
      }

      const collection = db.collection(collectionName)
      const result = await collection.deleteOne({ _id: new ObjectId(req.params.id) })

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Document not found" })
      }

      res.json({ message: "Document deleted successfully" })
    } catch (error) {
      console.error(`Error deleting ${collectionName} document:`, error)
      res.status(500).json({
        error: "Failed to delete document",
        details: error.message,
      })
    }
  })
})

// Collection analytics endpoint
app.get("/api/analytics/:collection", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not connected" })
    }

    const { collection: collectionName } = req.params
    const collection = db.collection(collectionName)

    // Get basic stats
    const totalCount = await collection.countDocuments()

    // Get documents created in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCount = await collection.countDocuments({
      created_at: { $gte: thirtyDaysAgo },
    })

    // Get status distribution (if status field exists)
    const statusDistribution = await collection
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }])
      .toArray()

    // Get daily creation trend (last 7 days)
    const dailyTrend = await collection
      .aggregate([
        {
          $match: {
            created_at: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray()

    // Get recent documents
    const recentDocuments = await collection.find({}).sort({ _id: -1 }).limit(5).toArray()

    res.json({
      totalCount,
      recentCount,
      statusDistribution,
      dailyTrend,
      recentDocuments: recentDocuments.map((doc) => ({
        _id: doc._id,
        name: doc.name || doc.title || "Unnamed",
        created_at: doc.created_at || doc._id.getTimestamp(),
        status: doc.status || "Unknown",
      })),
    })
  } catch (error) {
    console.error("Collection analytics error:", error)
    res.status(500).json({
      error: "Failed to fetch collection analytics",
      details: error.message,
    })
  }
})

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({
        status: "unhealthy",
        database: "disconnected",
        error: "Database not connected",
      })
    }

    await db.admin().command({ ping: 1 })
    res.json({
      status: "healthy",
      database: "connected",
      dbName: db.databaseName,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
      error: error.message,
    })
  }
})

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error)
  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" })
})

// Start server
async function startServer() {
  console.log("🚀 Starting CDS ISB Advanced Event Management System...")
  console.log("Environment variables check:")
  console.log("- MONGODB_URI:", process.env.MONGODB_URI ? "✅ Set" : "❌ Missing")
  console.log("- DB_NAME:", process.env.DB_NAME || "events (default)")
  console.log("- ADMIN_USERNAME:", process.env.ADMIN_USERNAME || "admin (default)")
  console.log("- ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD ? "✅ Set" : "❌ Missing")

  const connected = await connectToMongoDB()

  if (!connected) {
    console.log("⚠️  Starting server without database connection")
    console.log("Please check your MongoDB Atlas configuration")
  }

  app.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`)
    console.log(`📊 Database: ${db ? db.databaseName : "Not connected"}`)
    console.log(`🔗 Frontend: http://localhost:${PORT}`)
    console.log("\n📋 Next steps:")
    console.log("1. Open http://localhost:3000 in your browser")
    console.log("2. Use your MongoDB Atlas credentials to login")
    console.log("3. Explore the advanced MongoDB features!")
  })
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...")
  if (client) {
    await client.close()
    console.log("📦 MongoDB connection closed")
  }
  process.exit(0)
})

startServer().catch(console.error)
