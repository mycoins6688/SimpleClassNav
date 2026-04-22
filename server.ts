import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Real backend login endpoint V3
  app.post('/api/auth/v3/login', (req, res) => {
    const { username, password } = req.body;
    const realUsername = process.env.VITE_ADMIN_USERNAME || 'admin';
    const realPassword = process.env.VITE_ADMIN_PASSWORD || '123456';

    if (username === realUsername && password === realPassword) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
