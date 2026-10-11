import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages 风格的 base 路径（/EndlessQuest/）下，直接访问不带尾斜杠的
 * /EndlessQuest 会落到 vite 的 "did you mean to visit /EndlessQuest/ instead?"
 * 提示页而不是应用。在 dev 与 preview 服务器层把该路径 301 到带尾斜杠的
 * base，使两种入口都能进入应用（生产静态托管由服务器配置兜底，行为一致）。
 */
function redirectBaseWithoutSlash(base: string): Plugin {
  const stripped = base.replace(/\/$/, '') // '/EndlessQuest'
  return {
    name: 'redirect-base-without-slash',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === stripped) {
          res.statusCode = 301
          res.setHeader('Location', base)
          res.end()
          return
        }
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === stripped) {
          res.statusCode = 301
          res.setHeader('Location', base)
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  base: '/EndlessQuest/',
  plugins: [react(), redirectBaseWithoutSlash('/EndlessQuest/')],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
})
