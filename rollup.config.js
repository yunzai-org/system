import { defineConfig } from 'yunzai/rollup'
import typescript from '@rollup/plugin-typescript'
import babel from '@rollup/plugin-babel'
export default defineConfig({
  plugins: [
    babel({
      presets: [
        '@babel/preset-env',
        '@babel/preset-react',
        '@babel/preset-typescript'
      ],
      // 编译插件
      plugins: [
        [
          'module-resolver',
          {
            // 根
            root: ['./'],
            // @ 别名 -> 当前目录
            alias: {
              '@': './'
            }
          }
        ]
      ]
    }),
    typescript({
      compilerOptions: {
        // 生产声明文件
        declaration: true,
        // 输出目录
        declarationDir: 'lib',
        // 输出目录
        outDir: 'lib'
      },
      // 包含
      include: ['src/**/*']
    })
  ]
})
