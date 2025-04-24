1. Run Promoetheus
docker run -d \
  -p 9090:9090 \
  -v $PWD/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

2. Run Grafana
docker run -d -p 3001:3000 grafana/grafana

3. Run Load test
k6 run k6_webhook_test.js 

4. Open Grafana at http://localhost:3001/
import dashboard use Webhook Monitoring Dashboard.json file