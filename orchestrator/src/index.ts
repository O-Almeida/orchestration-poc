// orchestrator/src/index.ts
// @ts-nocheck
import express from 'express';
import amqp from 'amqplib';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

interface Result {
  taskId: string;
  scriptName: string;
  output: string;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

const PORT = 3000;
const RABBITMQ_URL = 'amqp://guest:guest@rabbitmq:5672';

const results: { [key: string]: Result } = {};

// Load scripts from JSON file
const scriptsFilePath = path.join(__dirname, '../../scripts/scripts.json');
let scripts: { [key: string]: string } = {};

try {
  const data = fs.readFileSync(scriptsFilePath, 'utf8');
  scripts = JSON.parse(data);
} catch (err) {
  console.error('Error reading scripts.json:', err);
}


// Endpoint to list available scripts
app.get('/scripts', (req, res) => {
  res.json(Object.keys(scripts));
});

// Endpoint to start an automation
app.post('/start-automation', async (req, res) => {
  const { scriptName } = req.body;

  if (!scriptName || !scripts[scriptName]) {
    return res.status(400).send('Invalid or missing scriptName');
  }

  try {
    // Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const queue = 'tasks';

    await channel.assertQueue(queue, { durable: true });

    // Generate a unique task ID
    const taskId = uuidv4();

    const task = { scriptName, taskId };
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(task)), {
      persistent: true,
    });

    console.log(`Dispatched task [${taskId}] for script: ${scriptName}`);

    await channel.close();
    await connection.close();

    res.json({ message: `Task for ${scriptName} has been dispatched`, taskId });
  } catch (err) {
    console.error('Error dispatching task:', err);
    res.status(500).send('Failed to dispatch task');
  }
});

// Serve script content
app.get('/scripts/:scriptName', (req, res) => {
  const { scriptName } = req.params;

  if (!scriptName || !scripts[scriptName]) {
    return res.status(404).send('Script not found');
  }

  const scriptPath = path.join(__dirname, '../../scripts', scripts[scriptName]);

  res.sendFile(scriptPath);
});

app.post('/results', (req, res) => {
  const result: Result = req.body;
  console.log('Received result from worker:', result);

  // Store the result in memory
  results[result.taskId] = result;

  res.send('Result received');
});

// Endpoint to get result by taskId
app.get('/results/:taskId', (req, res) => {
  const { taskId } = req.params;
  const result = results[taskId];

  if (result) {
    res.json(result);
  } else {
    res.status(404).send('Result not found');
  }
});


app.listen(PORT, () => {
  console.log(`Orchestrator server is running on port ${PORT}`);
});
