// api/index.js - Vercel API route entry point
import server from '../server/server.js';
import { createServer } from 'http';
import { parse } from 'url';

export default async function handler(req, res) {
  // Create a mock server to handle the request
  const httpServer = createServer((req, res) => {
    // This is a simplified approach - in practice, you'd want to properly
    // integrate your Express app with the Vercel function
    server(req, res);
  });

  // Handle the request using the Express server
  return new Promise((resolve, reject) => {
    const url = parse(req.url, true);
    req.query = url.query;
    
    // Call the Express app
    server(req, res);
    
    res.on('finish', resolve);
    res.on('error', reject);
  });
}

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
};