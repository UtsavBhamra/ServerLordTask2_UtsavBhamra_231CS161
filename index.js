const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost/task-tracker')
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log("Error connecting MongoDB: ", err);
  });

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Task" }],
});

const TaskSchema = new mongoose.Schema({
    name: { type: String, required: true },
    pingURL: { type: String},
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastPing: { type: Date, default: Date.now },
    interval: { type: Number, required: true },
    taskNumber: {type: Number, required: true },
    status: { type: String, enum: ['alive', 'dead'], default: 'alive' },
});

const User = mongoose.model("User", UserSchema);
const Task = mongoose.model("Task", TaskSchema);

app.post("/register", async (req, res) => {
    try {
        const { username, email } = req.body;
        const newUser = new User({ username, email });
        await newUser.save();
        res.status(201).json(newUser);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.post("/tasks", async (req, res) => {
    try {
        const { userId, name, interval, pingURL, taskNumber } = req.body; // Accept pingURL from the client

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const task = new Task({
            name,
            user: userId,
            interval,
            pingURL, // Use the pingURL provided by the client
            taskNumber,
            lastPing: Date.now(),
            status: 'alive',
        });

        await task.save();

        user.tasks.push(task._id);
        await user.save();

        res.status(201).json(task);

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

//get details of all users in the table
app.get("/users/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("tasks");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json(user);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// receives unique heartbeats
app.post("/tasks/:taskId/heartbeat", async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findOne({taskNumber: taskId});

        if (!task) return res.status(404).json({ error: "Task not found" });

        task.lastPing = Date.now();
        task.status = "alive";
        await task.save();

        res.status(200).json({ message: "Heartbeat received" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Task status monitoring function
const checkTaskStatus = async () => {
    const tasks = await Task.find();

    tasks.forEach(async (task) => {
        // Check if the task is marked as 'alive' but hasn't been pinged for a while
        const now = Date.now();
        const lastPingDifference = now - new Date(task.lastPing).getTime();
        
        // If the task hasn't been pinged within the expected interval, mark it as 'dead'
        if (lastPingDifference > task.interval * 1000) {
            task.status = 'dead';
            await task.save();
            console.log(`Task "${task.name}" marked as dead due to missed ping.`);
        }
        else{
            console.log(`Task "${task.name}" marked as alive.\n`)
        }
    });
};

const startTaskMonitor = () => {
    console.log("Starting task status monitor...");
    setInterval(checkTaskStatus, 2000); // Monitor tasks every interval
};


app.listen(3000, () => {
    console.log("Server running on port 3000");
    startTaskMonitor();
});
