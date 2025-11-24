const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.'))); // Serve static files from root

// Data Paths
const PRODUCTS_FILE = path.join(__dirname, 'data', 'products.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Helper: Read Data
const readData = (file) => {
    if (!fs.existsSync(file)) return [];
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error(`Error reading ${file}:`, err);
        return [];
    }
};

// Helper: Write Data
const writeData = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error(`Error writing ${file}:`, err);
        return false;
    }
};

// --- API Routes ---

// GET /api/products
app.get('/api/products', (req, res) => {
    const products = readData(PRODUCTS_FILE);
    res.json(products);
});

// POST /api/signup
app.post('/api/signup', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const users = readData(USERS_FILE);
    if (users.find(u => u.email === email)) {
        return res.status(409).json({ error: 'User already exists' });
    }

    const newUser = { id: Date.now(), name, email, password }; // In prod, hash password!
    users.push(newUser);

    if (writeData(USERS_FILE, users)) {
        res.status(201).json({ message: 'User created successfully', user: { name, email } });
    } else {
        res.status(500).json({ error: 'Failed to save user' });
    }
});

// POST /api/login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    const users = readData(USERS_FILE);
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// POST /api/ai-build
// (Optional: Logic can remain on frontend, but here's an endpoint if needed)
app.post('/api/ai-build', (req, res) => {
    const { budget, usage } = req.body;
    const products = readData(PRODUCTS_FILE);

    // Simple heuristic (same as frontend logic)
    let ratios = { cpu: 0.25, gpu: 0.35, motherboard: 0.12, ram: 0.08, storage: 0.08, psu: 0.08, cabinet: 0.04 };
    if (usage === 'gaming') { ratios.gpu = 0.40; ratios.cpu = 0.20; }
    else if (usage === 'editing') { ratios.cpu = 0.35; ratios.gpu = 0.25; ratios.ram = 0.12; }

    const findBest = (cat, maxPrice) => {
        return products
            .filter(p => p.category === cat && p.price <= maxPrice)
            .sort((a, b) => b.price - a.price)[0];
    };

    const build = [];
    const cats = ['cpu', 'gpu', 'motherboard', 'ram', 'storage', 'psu', 'cabinet'];

    cats.forEach(cat => {
        const item = findBest(cat, budget * ratios[cat]);
        if (item) build.push(item);
    });

    res.json({ build, total: build.reduce((sum, i) => sum + i.price, 0) });
});

// POST /api/orders
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');

app.post('/api/orders', (req, res) => {
    const orderData = req.body;

    // Basic Validation
    if (!orderData.items || orderData.items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!orderData.user || !orderData.address) {
        return res.status(400).json({ error: 'Missing user or address details' });
    }

    const orders = readData(ORDERS_FILE);
    const newOrder = {
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'Pending',
        ...orderData
    };

    orders.push(newOrder);

    if (writeData(ORDERS_FILE, orders)) {
        res.status(201).json({ message: 'Order placed successfully', orderId: newOrder.id });
    } else {
        res.status(500).json({ error: 'Failed to save order' });
    }
});

// GET /api/admin/stats
app.get('/api/admin/stats', (req, res) => {
    const orders = readData(ORDERS_FILE);
    const products = readData(PRODUCTS_FILE);
    const users = readData(USERS_FILE);

    // Calculate Metrics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const activeCustomers = users.length; // Simple proxy for now

    // Recent Orders (Last 5)
    const recentOrders = orders
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    // Inventory (Mocking stock for now since it's not in DB)
    // We'll just return first 5 products as "Low Stock" candidates for demo
    const inventory = products.slice(0, 5).map(p => ({
        name: p.name,
        category: p.category,
        stock: Math.floor(Math.random() * 20) + 1 // Random stock for demo
    }));

    res.json({
        totalOrders,
        totalRevenue,
        activeCustomers,
        recentOrders,
        inventory
    });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
