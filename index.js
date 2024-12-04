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

// Function to dynamically generate the ping URL based on task details
const generatePingURL = (task) => {
    const baseURL = 'http://localhost:3000/tasks'; 
    return `${baseURL}/${task._id}/heartbeat`; // URL to which the heartbeat is sent
};

app.post("/tasks", async (req, res) => {
    try {
        const { userId, name, interval } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const task = new Task({
            name,
            user: userId,
            interval,
            lastPing: Date.now(),
            status: 'alive',
        });

        await task.save();

        user.tasks.push(task._id);
        await user.save();

        res.status(201).json(task);

        startTaskPinging(task);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Function to start pinging the task
const startTaskPinging = (task) => {
    console.log(`Started pinging task "${task.name}" at intervals of ${task.interval} seconds}`);

    setInterval(async () => {
        try {
            const pingURL = generatePingURL(task);

            console.log(`Sending ping for task "${task.name}" to URL: ${pingURL}`);

            // Send the ping request to the ping url using axios
            const response = await axios.post(pingURL);
            console.log(response.status)

            if (response.status === 200) {
                task.lastPing = Date.now();
                task.status = 'alive'; // Mark task as alive
                await task.save();
                console.log(`Task "${task.name}" marked as alive after successful ping.`);
            } else {
                task.status = 'dead';
                await task.save();
                console.log(`Task "${task.name}" marked as dead due to failed ping.`);
            }
        } catch (error) {
            console.log(`error=${error}`);
            task.status = 'dead';
            await task.save();
            console.log(`Task "${task.name}" marked as dead due to failed ping.`);
        }
    }, task.interval * 1000); // The interval is in seconds, so multiply by 1000 to convert to milliseconds
};

app.post("/tasks/:taskId/heartbeat", async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = await Task.findById(taskId);

        if (!task) return res.status(404).json({ error: "Task not found" });

        task.lastPing = Date.now();
        task.status = "alive";
        await task.save();

        res.status(200).json({ message: "Heartbeat received" });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.get("/users/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate("tasks");
        if (!user) return res.status(404).json({ error: "User not found" });

        res.status(200).json(user);
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
        startTaskPinging(task);
        const lastPingDifference = now - new Date(task.lastPing).getTime();
        
        // If the task hasn't been pinged within the expected interval, mark it as 'dead'
        if (lastPingDifference > task.interval * 1000) {
            task.status = 'dead';
            await task.save();
            console.log(`Task "${task.name}" marked as dead due to missed ping.`);
        }
    });
};

const startTaskMonitor = () => {
    console.log("Starting task status monitor...");
    setInterval(checkTaskStatus, 20000); // Monitor tasks every minute
};


app.listen(3000, () => {
    console.log("Server running on port 3000");
    startTaskMonitor();
});
