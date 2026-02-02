require('dotenv').config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;
const API_KEY = 'my-secret-api-key';

const client = new MongoClient(MONGO_URL);
let items;

app.use(express.json());

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

function checkDb(req, res, next) {
  if (!items) {
    return res.status(503).json({
      error: "Service unavailable",
      message: "Database not ready"
    });
  }
  next();
}

function apiKeyAuth(req, res, next) {
  const apiKey = req.header("x-api-key");

  if (!apiKey) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "API key is missing"
    });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Invalid API key"
    });
  }

  next();
}

async function startServer() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("shop");
    items = db.collection("items");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
  }
}

startServer();

app.use("/api", checkDb);

app.get("/api/items", async (req, res) => {
  const list = await items.find().toArray();
  res.status(200).json(list);
});

app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await items.findOne({ _id: new ObjectId(req.params.id) });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

app.post("/api/items", apiKeyAuth, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const result = await items.insertOne(req.body);
  res.status(201).json({ id: result.insertedId });
});

app.put("/api/items/:id", apiKeyAuth, async (req, res) => {
  try {
    const result = await items.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Updated successfully" });
  } catch {
    res.status(400).json({ error: "Invalid ID or data" });
  }
});

app.patch("/api/items/:id", apiKeyAuth, async (req, res) => {
  try {
    const result = await items.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Partially updated" });
  } catch {
    res.status(400).json({ error: "Invalid ID or data" });
  }
});

app.delete("/api/items/:id", apiKeyAuth, async (req, res) => {
  try {
    const result = await items.deleteOne({
      _id: new ObjectId(req.params.id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});