import { join } from 'path'
import { Application, makeForwardMsg } from 'yunzai'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { getCommandOutput } from '../model/utils.js'
export class nodeModules extends Application<'message'> {
  constructor(e) {
    super('message')
    // event
    if (e) this.e = e
    //
    this.rule = [
      {
        reg: /^#云崽配置$/,
        fnc: this.config.name,
        permission: 'master'
      },
      {
        reg: /^#依赖配置$/,
        fnc: this.packagelist.name,
        permission: 'master'
      },
      {
        reg: /^#依赖检查/,
        fnc: this.checkPackagelist.name,
        permission: 'master'
      },
      {
        reg: /^#源码编译$/,
        fnc: this.build.name,
        permission: 'master'
      },
      {
        reg: /^#依赖添加/,
        fnc: this.addPackagelist.name,
        permission: 'master'
      },
      {
        reg: /^#依赖加载$/,
        fnc: this.packagelistInsall.name,
        permission: 'master'
      },
      {
        reg: /^#依赖移除/,
        fnc: this.removePackagelist.name,
        permission: 'master'
      },
      {
        reg: /^#依赖锁删除$/,
        fnc: this.removePackageLock.name,
        permission: 'master'
      },
      {
        reg: /^#云崽写入配置/,
        fnc: this.writeConifig.name,
        permission: 'master'
      }
    ]
  }

  /**
   * 依赖列表
   */
  async packagelist() {
    const dir = join(process.cwd(), 'package.json')
    const pkg = JSON.parse(readFileSync(dir, 'utf-8'))
    if (pkg?.dependencies) {
      const arr = Object.keys(pkg.dependencies)
      if (arr.length <= 0) {
        this.e.reply('是空的package.dependencies')
      } else {
        const msg = await makeForwardMsg(
          this.e,
          arr.map(key => `${key}:${pkg.dependencies[key]}`)
        )
        if (!msg) {
          this.e.reply('出错啦')
        } else {
          this.e.reply(msg)
        }
      }
    } else {
      //
      this.e.reply('未找到package.dependencies')
    }
  }

  /**
   * 校验依赖
   */
  checkPackagelist() {
    const name = this.e.msg.replace(/^#依赖检查/, '')
    const dir = join(process.cwd(), 'node_modules', name)
    if (!existsSync(dir)) {
      this.e.reply(`不存在${name}`)
      return
    }
    const dir2 = join(dir, 'package.json')
    if (!existsSync(dir2)) {
      this.e.reply(`不存在${name}/package.json`)
      return
    }
    const pkg2 = JSON.parse(readFileSync(dir2, 'utf-8'))
    const version2 = pkg2.version
    if (!version2) {
      this.e.reply('依赖版本未知')
      return
    }
    // loacl
    const dir3 = join(process.cwd(), 'package.json')
    const pkg3 = JSON.parse(readFileSync(dir3, 'utf-8'))
    if (pkg3?.dependencies) {
      const version3 = pkg3.dependencies[name]
      if (!version3) {
        this.e.reply('')
        this.e.reply(`依赖未配置${name},请执行：yarn add ${name} -W`)
        return
      }
      if (/link/.test(String(version3))) {
        this.e.reply('link 无法校验')
        return
      }
      if (String(version3).replace('^', '') !== String(version2)) {
        this.e.reply('依赖不对等，请执行 yarn')
        return
      }
      this.e.reply('对等依赖')
    } else {
      this.e.reply(`依赖未配置${name},请执行：yarn add ${name} -W`)
    }
    //
  }

  async packagelistInsall() {
    await this.e.reply('yarn正在校验依赖...')
    getCommandOutput('yarn -v')
      .then(() => {
        getCommandOutput(`yarn`)
          .then(async message => {
            logger.mark(message)
            await this.e.reply('yarn 校验完成!')
          })
          .catch(err => {
            logger.error(err)
            this.e.reply('yarn 依赖存在错误，请手动检查')
          })
      })
      .catch(() => {
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })
  }

  /**
   *
   * @returns
   */
  async removePackagelist() {
    const name = this.e.msg.replace(/^#依赖移除/, '')
    if (!name) {
      this.e.reply('未知字符')
      return
    }
    await this.e.reply('yarn正在校验依赖...')
    getCommandOutput('yarn -v')
      .then(() => {
        getCommandOutput(`yarn remove ${name}`)
          .then(async message => {
            logger.mark(message)
            await this.e.reply('yarn 移除完成!')
          })
          .catch(err => {
            logger.error(err)
            this.e.reply('yarn 依赖存在错误，请手动检查')
          })
      })
      .catch(() => {
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })
  }

  /**
   *
   * @returns
   */
  async removePackageLock() {
    const dir = join(process.cwd(), 'yarn.lock')
    if (!existsSync(dir)) {
      this.e.reply('不存在 yarn.lock')
      return
    }
    unlinkSync(dir)
    this.e.reply('删除完成')
  }

  /**
   *
   * @returns
   */
  async addPackagelist() {
    const name = this.e.msg.replace(/^#依赖添加/, '')
    if (!name) {
      this.e.reply('未知字符')
      return
    }
    await this.e.reply('yarn正在校验依赖...')
    getCommandOutput('yarn -v')
      .then(() => {
        getCommandOutput(`yarn add ${name} -W`)
          .then(async message => {
            logger.mark(message)
            await this.e.reply('yarn 添加完成!')
          })
          .catch(err => {
            logger.error(err)
            this.e.reply('yarn 依赖存在错误，请手动检查')
          })
      })
      .catch(() => {
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })
  }

  /**
   *
   */
  async build() {
    await this.e.reply('yarn正在校验依赖...')
    getCommandOutput('yarn -v')
      .then(() => {
        //
        getCommandOutput('yarn')
          .then(async message => {
            logger.mark(message)
            await this.e.reply('yarn依赖校验完成!')
            //
            getCommandOutput('yarn build')
              .then(async message => {
                logger.mark(message)
                await this.e.reply('yarn编译完成!')
              })
              .catch(err => {
                logger.error(err)
                this.e.reply('yarn 编译错误,请手动检查！')
              })
          })
          .catch(err => {
            logger.error(err)
            this.e.reply('yarn 依赖存在错误，请手动检查！')
          })
      })
      .catch(() => {
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })

    //
  }

  /**
   *
   */
  config() {
    const dir = join(process.cwd(), 'yunzai.config.js')
    if (!existsSync(dir)) {
      this.e.reply('不存在 yunzai.config.js')
      return
    }
    const msg = readFileSync(dir, 'utf-8')
    this.e.reply(msg)
  }

  /**
   *
   */
  writeConifig() {
    const dir = join(process.cwd(), 'yunzai.config.js')
    if (!existsSync(dir)) {
      this.e.reply('不存在 yunzai.config.js')
      return
    }
    const data = this.e.msg.replace(/^#云崽写入配置/, '')
    if (!data) {
      this.e.reply('未知字符串')
      return
    }
    const msg = readFileSync(dir, 'utf-8')
    const dir2 = join(process.cwd(), 'config')
    mkdirSync(dir2, {
      recursive: true
    })
    const dir3 = join(dir2, `${Date.now()}.js`)
    writeFileSync(dir3, msg)
    writeFileSync(dir, data)
    this.e.reply('修改完成')
  }
}
