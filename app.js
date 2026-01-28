require('dotenv').config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;

const client = new MongoClient(MONGO_URL);

let items;

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.use(express.json());

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
    console.error(error);
  }
}

startServer();

app.get("/", (req, res) => {
  res.send("<h1>Items API</h1>");
});


// GET 
app.get("/api/items", async (req, res) => {
  const list = await items.find().toArray();
  res.status(200).json(list);
});


// GET
app.get("/api/items/:id", async (req, res) => {
  try {
    const item = await items.findOne({ _id: new ObjectId(req.params.id) });
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});


// POST 
app.post("/api/items", async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Name is required" });
  }

  const result = await items.insertOne(req.body);
  res.status(201).json({ id: result.insertedId });
});


// PUT
app.put("/api/items/:id", async (req, res) => {
  try {
    const result = await items.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.json({ message: "Updated successfully" });
  } catch {
    res.status(400).json({ error: "Invalid ID or data" });
  }
});


// PATCH 
app.patch("/api/items/:id", async (req, res) => {
  try {
    const result = await items.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: req.body }
    );

    if (result.matchedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.json({ message: "Partially updated" });
  } catch {
    res.status(400).json({ error: "Invalid ID or data" });
  }
});


// DELETE 
app.delete("/api/items/:id", async (req, res) => {
  try {
    const result = await items.deleteOne({ _id: new ObjectId(req.params.id) });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Item not found" });

    res.status(204).send();
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});


app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});
