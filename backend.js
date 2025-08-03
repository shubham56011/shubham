// backend.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());

// Database setup
const db = new sqlite3.Database('ticks.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS ticks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT,
    price REAL,
    time INTEGER
  )`);
});

// Binance WebSocket se tick data save karna
const symbols = ['btcusdt', 'ethusdt', 'solusdt'];

symbols.forEach(symbol => {
  const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol}@trade`);
  
  ws.on('open', () => {
    console.log(`Connected to ${symbol.toUpperCase()} stream`);
  });
  
  ws.on('message', (msg) => {
    const data = JSON.parse(msg);
    const stmt = db.prepare("INSERT INTO ticks (symbol, price, time) VALUES (?, ?, ?)");
    stmt.run(symbol.toUpperCase(), parseFloat(data.p), data.T);
    stmt.finalize();
  });
  
  ws.on('error', (err) => {
    console.error(`Error in ${symbol}:`, err);
  });
});

// API endpoint - tick data dene ke liye
app.get('/api/ticks', (req, res) => {
  const { symbol, from, to } = req.query;
  
  let query = "SELECT * FROM ticks WHERE symbol = ?";
  const params = [symbol];
  
  if (from) {
    query += " AND time >= ?";
    params.push(parseInt(from));
  }
  
  if (to) {
    query += " AND time <= ?";
    params.push(parseInt(to));
  }
  
  query += " ORDER BY time ASC LIMIT 100000";
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Server start
app.listen(3000, () => {
  console.log('Backend running on http://localhost:3000');
  console.log('Tick data is being saved to ticks.db');
});