import http from 'k6/http';
import { check, sleep } from 'k6';
function randomNumber(min=1, max=3) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
export const options = {
    stages: [
      { duration: '10s', target: 10 },
      { duration: '1000s', target: 30 },
    ],
  };

export default function () {
  const res = http.post('http://localhost:3000/webhook/id_'+randomNumber(), JSON.stringify({ message: 'Hello Webhook' }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1); // opsional delay (kalau mau tes lebih realistis)
}
