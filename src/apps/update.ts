import { Application, makeForwardMsg, execAsync } from 'yunzai'
import { trim } from 'lodash-es'
import { existsSync, readdirSync } from 'node:fs'
import { BOT_NAME, PLUGINS_PATH } from 'yunzai'
import { Restart } from './restart.js'
import { sleep } from 'yunzai'
import { getCommandOutput } from '../model/utils.js'

let typeName = BOT_NAME
let messages = []
let isUp = null
let oldCommitId = null

let lock = false

/**
 * 得到插件
 * @param plugin
 * @returns
 */
function getPlugin(name = '', msg: string) {
  if (!name || name == '') {
    // 没有设置  - 就捕获指令上的
    name = msg.replace(/#(强制)?更新(日志)?/, '')
    // 不存在
    if (!name || name == '') return ''
  }
  // 指定插件不存在
  if (!existsSync(`plugins/${name}/.git`)) return false
  typeName = name
  // 存在则返回
  return name
}

/**
 *
 * @param name
 * @returns
 */
async function getcommitId(name = '') {
  //
  let cm = 'git rev-parse --short HEAD'
  //
  if (name) cm = `cd "plugins/${name}" && ${cm}`
  const commitId = await execAsync(cm)
  return trim(commitId?.stderr ?? commitId.stdout)
}

/**
 *
 * @param plugin
 * @returns
 */
async function getTime(plugin = '') {
  let cm = 'git log -1 --pretty=%cd --date=format:"%F %T"'
  if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`
  let time = ''
  try {
    time = (await execAsync(cm)).stdout
    time = trim(time)
  } catch (error) {
    logger.error(error.toString())
    time = '获取时间失败'
  }
  return time
}

export class Update extends Application<'message'> {
  constructor(e) {
    super('message')
    // event
    if (e) this.e = e
    this.rule = [
      {
        reg: /^#更新日志/,
        fnc: this.updateLog.name,
        permission: 'master'
      },
      {
        reg: /^#(强制)?更新/,
        fnc: this.update.name,
        permission: 'master'
      },
      {
        reg: /^#(静默)?全部(强制)?更新$/,
        fnc: this.updateAll.name,
        permission: 'master'
      },
      {
        reg: /test3/,
        fnc: this.restart.name,
        permission: 'master'
      }
    ]
  }

  /**
   * 更新
   * @returns
   */
  async update() {
    // 不是主人
    if (!this.e.isMaster) {
      return
    }
    if (lock) {
      this.e.reply('正在更新中..请勿重复操作')
      return
    }
    // 其他指令重合反弹
    if (/详细|详情|面板|面版/.test(this.e.msg)) {
      return
    }

    // 获取插件
    const name = getPlugin('', this.e.msg)

    // false 错误
    if (name === false) {
      this.e.reply('插件获取错误')
      return
    }

    // 空的，全部更新
    if (name === '') {
      // 执行更新
      await this.runUpdate('')
    } else {
      //
      await this.runUpdate(name)
    }

    //是否需要重启
    if (isUp) {
      setTimeout(() => {
        this.restart()
      }, 2000)
    }
  }

  /**
   * 运行更新
   * @param plugin
   * @returns
   */
  async runUpdate(plugin = '') {
    let cm = 'git pull --no-rebase'
    let type = '更新'
    if (this.e.msg.includes('强制')) {
      type = '强制更新'
      cm = `git reset --hard && git pull --rebase --allow-unrelated-histories`
    }
    //
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    oldCommitId = await getcommitId(plugin)

    //
    logger.mark(`${this.e.logFnc} 开始${type}：${typeName}`)

    await this.e.reply(`开始${type} ${typeName}`)

    //
    lock = true

    //
    const ret = await execAsync(cm)

    //
    lock = false

    //
    if (ret.stderr) {
      logger.mark(`${this.e.logFnc} 更新失败：${typeName}`)
      this.gitErr(ret.stderr, ret.stdout)
      return
    }

    const time = await getTime(plugin)

    logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)

    if (/Already up|已经是最新/g.test(ret.stdout)) {
      await this.e.reply(`${typeName} 已是最新\n最后更新时间：${time}`)
    } else {
      await this.e.reply(`${typeName} 更新成功\n更新时间：${time}`)
      // 更新成功
      isUp = true
      this.sendLog(plugin)
    }

    return
  }

  /**
   * git 错误
   * @param err
   * @param stdout
   * @returns
   */
  async gitErr(err, stdout) {
    const msg = '更新失败！'
    const errMsg = err.toString()
    stdout = stdout.toString()

    if (errMsg.includes('Timed out')) {
      const remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      return this.e.reply(`${msg}\n连接超时：${remote}`)
    }

    if (/Failed to connect|unable to access/g.test(errMsg)) {
      const remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      return this.e.reply(`${msg}\n连接失败：${remote}`)
    }

    if (errMsg.includes('be overwritten by merge')) {
      return this.e.reply(
        `${msg}\n存在冲突：\n${errMsg}\n请解决冲突后再更新，或者执行#强制更新，放弃本地修改`
      )
    }

    if (stdout.includes('CONFLICT')) {
      return this.e.reply(
        `${msg}\n存在冲突：\n${errMsg}${stdout}\n请解决冲突后再更新，或者执行#强制更新，放弃本地修改`
      )
    }

    return this.e.reply([errMsg, stdout])
  }

  /**
   * 更新所有插件
   */
  async updateAll() {
    // 得到目录下的所有插件
    const dirs = readdirSync(PLUGINS_PATH)
    // 校验
    const testReg = /^#静默全部(强制)?更新$/.test(this.e.msg)
    if (testReg) {
      // 等待发送
      await this.e.reply(`开始执行静默全部更新,请稍等...`)
    }
    // 运行更新
    await this.runUpdate()
    //
    for (const plu of dirs) {
      // 得到
      const Plu = getPlugin(plu, this.e.msg)
      if (Plu === false) continue
      await sleep(1500)
      await this.runUpdate(Plu)
    }
    if (testReg) {
      const msg = await makeForwardMsg(this.e, messages)
      messages.push(msg)
    }
    if (isUp) {
      setTimeout(() => {
        this.restart()
      }, 2000)
    }
  }

  /**
   * 重启
   */
  restart = async () => {
    await this.e.reply('yarn正在校验依赖...')
    // 重启之前 ，进行  yarn -v yran && yarn build
    getCommandOutput('yarn -v')
      .then(() => {
        getCommandOutput('yarn && yarn build')
          .then(async message => {
            logger.mark(message)
            await this.e.reply('yarn依赖校验完成&&编译完成!')
            new Restart(this.e).restart()
          })
          .catch(() => {
            this.e.reply('yarn 依赖存在错误，请手动检查')
          })

        //
      })
      .catch(() => {
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })
  }

  /**
   * 更新记录
   * @returns
   */
  async updateLog() {
    const name = getPlugin('', this.e.msg)
    if (name === false) {
      return
    }
    this.sendLog(name)
    return
  }

  /**
   * 发送指定插件的更新记录
   * @param name
   * @returns
   */
  async sendLog(name: string) {
    let cm = 'git log -100 --pretty="%h||[%cd] %s" --date=format:"%F %T"'
    if (name) cm = `cd "plugins/${name}" && ${cm}`
    // 所有记录
    let logAll: string | null = null
    try {
      logAll = (await execAsync(cm)).stdout
    } catch (error) {
      // 不错啦
      logger.error(error.toString())
      // await this.e.reply(error.toString())
    }
    // 记录不存在
    if (!logAll) {
      this.e.reply('记录不存在')
      return
    }
    const logArray = logAll.trim().split('\n')
    const log = []
    for (let str of logArray) {
      const strArr = str.split('||')
      if (strArr[0] == oldCommitId) break
      if (strArr[1].includes('Merge branch')) continue
      log.push(strArr[1])
    }
    const length = log.length
    const logStr = log.join('\n\n')
    if (logStr.length <= 0) {
      this.e.reply('记录不存在')
      return
    }
    let end = ''
    try {
      cm = 'git config -l'
      if (name) cm = `cd "plugins/${name}" && ${cm}`
      end = (await execAsync(cm)).stdout
      end = end
        .match(/remote\..*\.url=.+/g)
        .join('\n\n')
        .replace(/remote\..*\.url=/g, '')
        .replace(/\/\/([^@]+)@/, '//')
      //
    } catch (error) {
      //
      logger.error(error.toString())
    }

    const msg = await makeForwardMsg(
      this.e,
      [logStr, end],
      `${name || BOT_NAME} 更新日志，共${length}条`
    )

    if (msg) {
      this.e.reply(msg)
    } else {
      this.e.reply('日志获取失败~')
    }

    return
  }
}
