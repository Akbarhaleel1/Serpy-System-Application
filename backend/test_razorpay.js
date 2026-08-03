import http from 'http';

const data = JSON.stringify({
  amount: 249900,
  currency: "INR",
  receipt: "order_STARTER_test",
  notes: {
    planName: "STARTER",
    userId: "current-user"
  }
});

const options = {
  hostname: 'localhost',
  port: 4001,
  path: '/api/razorpay/create-order',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
  console.log(`headers: ${JSON.stringify(res.headers)}`);
  
  res.on('data', (d) => {
    console.log('Response:', d.toString());
  });
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
