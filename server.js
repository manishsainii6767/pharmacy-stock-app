// server.js
const express = require('express');
const path = require('path');

const { requireAuth } = require('./src/auth');
const authRoutes = require('./src/routes/auth');
const medicineRoutes = require('./src/routes/medicines');
const batchRoutes = require('./src/routes/batches');
const dispenseRoutes = require('./src/routes/dispense');
const alertRoutes = require('./src/routes/alerts');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Public
app.use('/api/auth', authRoutes);

// Protected - everything below requires a valid JWT (Authorization: Bearer <token>)
app.use('/api/medicines', requireAuth, medicineRoutes);
app.use('/api/batches', requireAuth, batchRoutes);
app.use('/api/dispense', requireAuth, dispenseRoutes);
app.use('/api/alerts', requireAuth, alertRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Pharmacy Stock API running at http://localhost:${PORT}`);
});
