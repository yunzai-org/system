import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'yunzai/rollup'
export default defineConfig({
  plugins: [
    typescript({
      compilerOptions: {
        declaration: true,
        declarationDir: 'lib/types'
      },
      include: ['src/**/*']
    })
  ]
})
