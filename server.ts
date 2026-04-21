import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs-extra';
import bodyParser from 'body-parser';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_PATH = path.join(process.cwd(), 'src', 'data.json');

  app.use(bodyParser.json());

  // 1. 登录 API
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === '1234qwre') {
      res.json({ success: true, token: 'fake-jwt-token' });
    } else {
      res.status(401).json({ success: false, message: '用户名或密码不正确' });
    }
  });

  // 2. 获取数据 (虽然前端可以静态引入，但在管理后台为了确保实时性，可以从 API 拿)
  app.get('/api/data', async (req, res) => {
    try {
      const data = await fs.readJson(DATA_PATH);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: '无法读取数据文件' });
    }
  });

  // 3. 保存数据 (支持全量更新)
  app.post('/api/data', async (req, res) => {
    try {
      const newData = req.body;
      await fs.writeJson(DATA_PATH, newData, { spaces: 2 });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: '无法保存数据文件' });
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
