import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import { swaggerUi, specs } from './swagger.js'; // Import swagger setup

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ATLAS_URI = process.env.ATLAS_URI;
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: '*',
  },
});

let db;
async function connectToDatabase() {
  const uri = ATLAS_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('Connected to MongoDB!');
    db = client.db('bubbleMath');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

app.use(cors());

app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome message
 *     responses:
 *       200:
 *         description: Welcome to BubbleMath API - ExpressJS Backend
 */
app.get('/', (req, res) => {
  res.send('Welcome to BubbleMath API - ExpressJS Backend<br>Checkout our API Swagger Page: <a href="/api-docs">/api-docs</a>');
});

/**
 * @swagger
 * /questions:
 *   get:
 *     summary: Retrieve questions from questions collection -- MongoDB Atlas
 *     responses:
 *       200:
 *         description: A list of questions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
app.get('/questions', async (req, res) => {
  try {
    const collection = db.collection('questions');
    const questions = await collection.find({}).toArray();
    res.json(questions);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * @swagger
 * /collection/{name}:
 *   post:
 *     summary: Add a document to a collection
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Document added
 *       500:
 *         description: Internal server error
 */
app.post('/collection/:name', async (req, res) => {
  const collectionName = req.params.name;
  const document = req.body;
 
  try {
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(document);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

/**
 * @swagger
 * /ping:
 *   get:
 *     summary: Health check 
 *     responses:
 *       200:
 *         description: Pong response
 */
app.get('/ping', (req, res) => {
  res.json({ status: 'pong' });
});

// Handle Multi-session
let waitingUsers = [[], [], []];

io.on('connection', (socket) => {
  console.log('[*] a user connected');

  socket.on('joinRoom', (lobbyIndex) => {
    const userId = socket.id;
    waitingUsers[lobbyIndex].push(userId);
    io.emit('waitingUsersUpdate', waitingUsers);

    if (lobbyIndex === 0 && waitingUsers[lobbyIndex].length === 2) {
      io.to(waitingUsers[lobbyIndex][0]).emit('startGame');
      io.to(waitingUsers[lobbyIndex][1]).emit('startGame');
      waitingUsers[lobbyIndex] = [];
    }
  });

  socket.on('disconnect', () => {
    waitingUsers = waitingUsers.map((lobby) => lobby.filter((user) => user !== socket.id));
    io.emit('waitingUsersUpdate', waitingUsers);
    console.log('[*] user disconnected');
  });
});

connectToDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`Express Server is running on port ${PORT}`);
  });
});
