const express = require('express');
const rateLimit = require('express-rate-limit');
const client = require('prom-client');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware untuk parsing JSON
app.use(express.json());

// Prometheus: collect default metrics
client.collectDefaultMetrics();

// Prometheus: total request webhook
const requestCounter = new client.Counter({
  name: 'webhook_requests_total',
  help: 'Total webhook requests received',
  labelNames: ['webhookid']
});

// Prometheus: total forwarded webhook
const forwardCounter = new client.Counter({
  name: 'webhook_forward_total',
  help: 'Total webhook requests forwarded',
  labelNames: ['webhookid']
});

// Prometheus: histogram durasi request masuk
const requestDurationHistogram = new client.Histogram({
  name: 'webhook_request_duration_seconds',
  help: 'Histogram of request duration for webhook requests',
  labelNames: ['webhookid'],
  buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10]
});

// Prometheus: histogram durasi forwarding
const forwardDurationHistogram = new client.Histogram({
  name: 'webhook_forward_duration_seconds',
  help: 'Histogram of forward duration to external URL',
  labelNames: ['webhookid'],
  buckets: [0.1, 0.2, 0.5, 1, 2, 5, 10]
});

// Rate limiter per webhookid
const webhookLimiter = rateLimit({
  windowMs: 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.params.webhookid || req.ip,
  message: 'Rate limit exceeded: Max 30 requests per second per webhookid.'
});

// Hitung TPS
let requestCount = 0;
setInterval(() => {
  console.log(`TPS: ${requestCount}`);
  requestCount = 0;
}, 1000);

// Webhook endpoint
app.post('/webhook/:webhookid', webhookLimiter, async (req, res) => {
  const webhookId = req.params.webhookid;
  const payload = req.body;

  requestCount++;
  requestCounter.inc({ webhookid: webhookId });

  // Start hitung durasi request
  const endRequestTimer = requestDurationHistogram.startTimer({ webhookid: webhookId });

  try {
    // Forwarding ke URL target (sesuaikan dengan kebutuhan)
    const forwardUrl = 'https://test.com/target-endpoint';

    const endForwardTimer = forwardDurationHistogram.startTimer({ webhookid: webhookId });
    axios.post(forwardUrl, payload);
    endForwardTimer(); // stop timer setelah berhasil

    forwardCounter.inc({ webhookid: webhookId });
  } catch (error) {
    console.error(`Forwarding failed for ${webhookId}:`, error.message);
  }

  // Akhiri penghitungan waktu request
  endRequestTimer();

  res.status(200).json({ message: `Webhook ${webhookId} received and forwarded.` });
});

// Prometheus metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Webhook API running on port ${PORT}`);
});
