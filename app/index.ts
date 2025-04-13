'use strict';

import express from 'express';

// Constants
const PORT = 80;
const HOST = '0.0.0.0';

// App
const app = express();
interface Request {
  // Add properties as needed
}

interface Response {
  send: (body: string) => void;
}

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);