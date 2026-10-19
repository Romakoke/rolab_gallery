import { list } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(200).json({ items: [], setupRequired: true });
  try {
    let cursor;
    const items = [];
    do {
      const page = await list({ prefix: 'rolab/', limit: 1000, cursor });
      items.push(...page.blobs.map(blob => ({
        name: blob.pathname.split('/').pop().replace(/-[a-zA-Z0-9]{12,}(?=\.)/, ''),
        url: blob.url,
        type: /\.(mp4|webm|mov)$/i.test(blob.pathname) ? 'video' : 'image',
        uploadedAt: blob.uploadedAt
      })));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor && items.length < 3000);
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
    return res.status(200).json({ items });
  } catch (err) {
    return res.status(500).json({ error: 'Галерея жүктелмеді', detail: err.message });
  }
}
