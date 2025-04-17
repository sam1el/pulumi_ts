

const express = require('express');

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// Retrieve MOTD from environment variables with a fallback
const motd = process.env.MOTD || 'Default Message';

// App
const app = express();
app.get('/', (req, res) => {
  res.send(`Hello World ${motd}\n`);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);