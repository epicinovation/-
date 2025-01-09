const express = require("express");
const bodyParser = require("body-parser");
const { Low, JSONFile } = require("lowdb");

const app = express();
const port = 3000;

// Initialize lowdb with a JSON file store
const db = new Low(new JSONFile('db.json'));
db.data = db.data || { users: {}, loggedInUser: null };

// Middleware to parse JSON requests
app.use(bodyParser.json());

// API: Register a new user
app.post("/register", async (req, res) => {
    const { username, password, email } = req.body;
    
    // Check if user already exists
    if (db.data.users[username]) {
        return res.status(400).json({ message: "Username already exists." });
    }

    // Create new user
    db.data.users[username] = {
        password,
        email,
        balance: 0,
        transactions: []
    };

    await db.write();
    res.status(200).json({ message: "Account created successfully!" });
});

// API: Login a user
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    
    // Check if user exists and password is correct
    const user = db.data.users[username];
    if (!user || user.password !== password) {
        return res.status(400).json({ message: "Invalid credentials." });
    }

    // Set logged-in user
    db.data.loggedInUser = username;
    await db.write();

    res.status(200).json({ message: "Login successful!" });
});

// API: Get account details
app.get("/account", (req, res) => {
    const loggedInUser = db.data.loggedInUser;
    if (!loggedInUser) {
        return res.status(400).json({ message: "User not logged in." });
    }
    
    const user = db.data.users[loggedInUser];
    res.status(200).json({
        username: loggedInUser,
        balance: user.balance,
        email: user.email
    });
});

// API: Transfer funds between users
app.post("/transfer", async (req, res) => {
    const { recipient, amount } = req.body;
    const loggedInUser = db.data.loggedInUser;
    
    if (!loggedInUser) {
        return res.status(400).json({ message: "User not logged in." });
    }
    
    const sender = db.data.users[loggedInUser];
    const receiver = db.data.users[recipient];

    if (!receiver) {
        return res.status(400).json({ message: "Recipient not found." });
    }

    if (sender.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance." });
    }

    // Perform the transfer
    sender.balance -= amount;
    receiver.balance += amount;

    // Record the transaction
    sender.transactions.push(`Transferred ₹${amount} to ${recipient}`);
    receiver.transactions.push(`Received ₹${amount} from ${loggedInUser}`);

    await db.write();
    res.status(200).json({ message: "Transfer successful!" });
});

// API: Get transaction history
app.get("/transactions", (req, res) => {
    const loggedInUser = db.data.loggedInUser;
    if (!loggedInUser) {
        return res.status(400).json({ message: "User not logged in." });
    }

    const user = db.data.users[loggedInUser];
    res.status(200).json({ transactions: user.transactions });
});

// Admin endpoint to manage users
app.get("/admin/users", (req, res) => {
    const loggedInUser = db.data.loggedInUser;
    if (!loggedInUser || loggedInUser !== "Admin") {
        return res.status(400).json({ message: "Admin privileges required." });
    }

    const users = db.data.users;
    res.status(200).json({ users });
});

// Admin: Add balance to user account
app.post("/admin/addBalance", async (req, res) => {
    const { username, amount } = req.body;
    const loggedInUser = db.data.loggedInUser;

    if (!loggedInUser || loggedInUser !== "Admin") {
        return res.status(400).json({ message: "Admin privileges required." });
    }

    if (!db.data.users[username]) {
        return res.status(400).json({ message: "User not found." });
    }

    const user = db.data.users[username];
    user.balance += amount;
    user.transactions.push(`₹${amount} added by Admin`);

    await db.write();
    res.status(200).json({ message: `₹${amount} added to ${username}'s balance.` });
});

// Admin: Remove balance from user account
app.post("/admin/removeBalance", async (req, res) => {
    const { username, amount } = req.body;
    const loggedInUser = db.data.loggedInUser;

    if (!loggedInUser || loggedInUser !== "Admin") {
        return res.status(400).json({ message: "Admin privileges required." });
    }

    if (!db.data.users[username]) {
        return res.status(400).json({ message: "User not found." });
    }

    const user = db.data.users[username];
    if (user.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance." });
    }

    user.balance -= amount;
    user.transactions.push(`₹${amount} removed by Admin`);

    await db.write();
    res.status(200).json({ message: `₹${amount} removed from ${username}'s balance.` });
});

// Admin: Delete a user
app.delete("/admin/deleteUser", async (req, res) => {
    const { username } = req.body;
    const loggedInUser = db.data.loggedInUser;

    if (!loggedInUser || loggedInUser !== "Admin") {
        return res.status(400).json({ message: "Admin privileges required." });
    }

    if (!db.data.users[username]) {
        return res.status(400).json({ message: "User not found." });
    }

    delete db.data.users[username];
    await db.write();
    res.status(200).json({ message: `${username} account deleted successfully.` });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
