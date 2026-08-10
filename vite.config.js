import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The saved demo pages under public/demos still pull their Next.js runtime,
// fonts and audio from shaqyru24.kz / tyrasoft.kz using absolute root paths
// (/_next/..., /fonts/..., /sounds/..., /uploads/...). Without these rules the
// demos hydrate into a blank page. `preview` needs the same rules as `server`
// — and so does whatever hosts the production build, since a plain static host
// has no way to answer those paths. See README for the deployment note.
const demoProxy = {
  '/_next': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/kz': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/ru': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/view': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/fonts': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/sounds': { target: 'https://shaqyru24.kz', changeOrigin: true, secure: false },
  '/uploads': { target: 'https://tyrasoft.kz', changeOrigin: true, secure: false },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: demoProxy },
  preview: { proxy: demoProxy },
})
