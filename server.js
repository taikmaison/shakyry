import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Proxy for Tilda / Next.js assets
app.use('/_next', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/fonts', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/kz', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/ru', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/view', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/sounds', createProxyMiddleware({
  target: 'https://shaqyru24.kz',
  changeOrigin: true,
  secure: false,
}));

app.use('/uploads', createProxyMiddleware({
  target: 'https://tyrasoft.kz',
  changeOrigin: true,
  secure: false,
}));

// Serve static files from the React dist folder
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback to index.html for React Router (if used)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
