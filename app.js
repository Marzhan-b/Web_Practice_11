require('dotenv').config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URI;

const client = new MongoClient(MONGO_URL);

let products;

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
    products = db.collection("products");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
}

startServer();

app.get("/", (req, res) => {
  res.send(`
    <h1>Shop API</h1>
    <ul>
      <li><a href="/api/products">/api/products</a></li>
      <li><a href="/api/products/1">/api/products/1</a></li>
    </ul>
  `);
});

app.get("/api/products", async (req, res) => {
  const { category, minPrice, sort, fields } = req.query;

  const filter = {};
  if (category) {
    filter.category = category;
  }
  if (minPrice) {
    filter.price = { $gte: Number(minPrice) };
  }

  const sortOption = {};
  if (sort === "price") {
    sortOption.price = 1;
  }

  let projection = null;
  if (fields) {
    projection = {};
    fields.split(",").forEach((field) => {
      projection[field] = 1;
    });
    projection._id = 0;
  }

  let query = products.find(filter);

  if (sort) {
    query = query.sort(sortOption);
  }

  if (projection) {
    query = query.project(projection);
  }

  const productsList = await query.toArray();

  res.json({
    count: productsList.length,
    products: productsList,
  });
});
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await products.findOne({ _id: new ObjectId(req.params.id) });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});

app.post("/api/products", async (req, res) => {
  const { name, price, category } = req.body;

  if (!name || price === undefined || !category) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const result = await products.insertOne({
    name,
    price,
    category,
  });

  res.status(201).json({
    id: result.insertedId,
  });
});
app.put("/api/products/:id", async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const result = await products.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { name, price: Number(price), category } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID or data" });
  }
});
app.delete("/api/products/:id", async (req, res) => {
  try {
    const result = await products.deleteOne({ _id: new ObjectId(req.params.id) });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID format" });
  }
});
app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.use((req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});