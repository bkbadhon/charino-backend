const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const Port = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "UOyDqGyN6N+5xay2vV/3WNK2XVH59Bbi2je0+aGtVSc=";
const corsOptions = {
  origin: ["http://localhost:5173",'https://charino.vercel.app'],
  credentials: true,
};

// Hardcoded admin user from env vars
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "112233";

app.use(express.json());
app.use(cors(corsOptions));

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.t87ip2a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const db = client.db("charino"); // change db name if you want
    
    const campaignsCollection = db.collection("campaign");
    const donationsCollection = db.collection("donation");

app.post("/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });
    return res.send({ token });
  }
  res.status(401).send({ message: "Invalid username or password" });
});

// Middleware to verify admin JWT token
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: "Forbidden" });
    req.admin = decoded;
    next();
  });
}

    // ✅ GET all campaigns
    app.get("/campaign", verifyAdminToken, async (req, res) => {
      try {
        const campaigns = await campaignsCollection.find().toArray();
        res.send(campaigns);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch campaigns" });
      }
    });

      app.get("/campaign/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const campaign = await campaignsCollection.findOne({ _id: new ObjectId(id) });
        if (!campaign) {
          return res.status(404).send({ message: "Campaign not found" });
        }
        res.send(campaign);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Error fetching campaign" });
      }
    });

    // ✅ POST new campaign
    app.post("/campaign", async (req, res) => {
      try {
        const newCampaign = req.body;
        const result = await campaignsCollection.insertOne(newCampaign);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to add campaign" });
      }
    });

app.patch("/campaign/:id", async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  try {
    const result = await campaignsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $inc: { raised: parseInt(amount) } }
    );
    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update raised amount" });
  }
});

// ✅ POST donation & update campaign
app.post("/donation", async (req, res) => {
  const { donorName, amount, campaignId } = req.body;

  if (!donorName || !amount || !campaignId) {
    return res.status(400).send({ message: "All fields are required" });
  }

  try {
    // Insert donation record
    const donationResult = await donationsCollection.insertOne({
      donorName,
      amount: parseInt(amount),
      campaignId: new ObjectId(campaignId),
      date: new Date(),
    });

    // Update campaign raised amount
    const campaignResult = await campaignsCollection.updateOne(
      { _id: new ObjectId(campaignId) },
      { $inc: { raised: parseInt(amount) } }
    );

    if (campaignResult.modifiedCount === 0) {
      return res.status(404).send({ message: "Campaign not found" });
    }

    res.send({
      message: "Donation successful",
      donationId: donationResult.insertedId,
      campaignUpdate: campaignResult,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to process donation" });
  }
});



    console.log("✅ MongoDB connected & API ready.");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send({ message: "Welcome to our server" });
});

app.listen(Port, () => {
  console.log(`🚀 Server is running at http://localhost:${Port}`);
});
