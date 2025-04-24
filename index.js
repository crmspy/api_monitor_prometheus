const express = require('express');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON jika kamu butuh
app.use(express.json());

// Prometheus: collect default metrics
client.collectDefaultMetrics();

// Prometheus: counter untuk total request webhook
const requestCounter = new client.Counter({
  name: 'webhook_requests_total',
  help: 'Total webhook requests received',
  labelNames: ['webhookid']
});

// Rate limiter: max 30 TPS per webhookid
const webhookLimiter = rateLimit({
  windowMs: 1000, // 1 detik
  max: 1000, // max 30 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.webhookid || req.ip,
  message: 'Rate limit exceeded: Max 30 requests per second per webhookid.'
});

// Histogram untuk menghitung rate per detik
const requestDurationHistogram = new client.Histogram({
  name: 'webhook_request_duration_seconds',
  help: 'Histogram of request duration for webhook requests',
  labelNames: ['webhookid'],
  buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10] // Bisa menyesuaikan waktu dalam detik
});

// Rate limiter per webhook
let requestCount = 0;
setInterval(() => {
  console.log(`TPS: ${requestCount}`);
  requestCount = 0;
}, 1000);

// Endpoint dinamis
app.post('/webhook/:webhookid', webhookLimiter, async (req, res) => {
  const webhookId = req.params.webhookid;
  
  // Mulai hitung durasi request
  const end = requestDurationHistogram.startTimer({ webhookid: webhookId });

  requestCount++;
  requestCounter.inc({ webhookid: webhookId });

  // Akhiri penghitungan waktu request
  end();

  res.status(200).json({ message: `Webhook ${webhookId} received.` });
});

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook API running on port ${PORT}`);
});
