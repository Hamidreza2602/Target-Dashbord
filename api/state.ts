import { put, list } from '@vercel/blob';

const BLOB_PATH = 'app-state.json';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req: any, res: any) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      // List blobs to find our state file
      const { blobs } = await list({ prefix: BLOB_PATH });
      if (blobs.length === 0) {
        return res.status(200).json(null);
      }
      // Fetch the blob content
      const response = await fetch(blobs[0].url);
      const data = await response.json();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      await put(BLOB_PATH, body, {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('State API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
