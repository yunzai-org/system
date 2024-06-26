import { Plugin, makeForwardMsg } from 'yunzai/core'
import lodash from 'lodash'
import { existsSync, readdirSync } from 'node:fs'
import { BOT_NAME } from 'yunzai/config'
import { exec, execSync } from 'child_process'
import { Restart } from './restart.js'
import { sleep } from 'yunzai/utils'
let uping = false

/**
 * 
 */
export class update extends Plugin {
  typeName = BOT_NAME
  messages = []
  constructor() {
    super()
    this.priority = 4000
    this.rule = [
      {
        reg: /^#更新日志/,
        fnc: this.updateLog.name
      },
      {
        reg: /^#(强制)?更新/,
        fnc: this.update.name
      },
      {
        reg: /^#(静默)?全部(强制)?更新$/,
        fnc: this.updateAll.name,
        permission: 'master'
      }
    ]
  }

  async update() {
    if (!this.e.isMaster) return false
    if (uping) return this.e.reply('已有命令更新中..请勿重复操作')

    if (/详细|详情|面板|面版/.test(this.e.msg)) return false

    /** 获取插件 */
    let plugin = this.getPlugin()
    if (plugin === false) return false

    /** 执行更新 */
    if (plugin === '') {
      await this.runUpdate('')
      await sleep(1000)
      plugin = this.getPlugin('miao-plugin')
      await this.runUpdate(plugin)
    } else {
      await this.runUpdate(plugin)
    }

    /** 是否需要重启 */
    if (this.isUp) {
      // await this.e.reply('即将执行重启，以应用更新')
      setTimeout(() => this.restart(), 2000)
    }
  }

  getPlugin(plugin = '') {
    if (!plugin) {
      plugin = this.e.msg.replace(/#(强制)?更新(日志)?/, '')
      if (!plugin) return ''
    }

    if (!existsSync(`plugins/${plugin}/.git`)) return false

    this.typeName = plugin
    return plugin
  }

  async execSync(cmd) {
    return new Promise(resolve => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  isUp = null
  isNowUp = null
  oldCommitId = null

  async runUpdate(plugin = '') {
    this.isNowUp = false

    let cm = 'git pull --no-rebase'

    let type = '更新'
    if (this.e.msg.includes('强制')) {
      type = '强制更新'
      cm = `git reset --hard && git pull --rebase --allow-unrelated-histories`
    }
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    this.oldCommitId = await this.getcommitId(plugin)

    logger.mark(`${this.e.logFnc} 开始${type}：${this.typeName}`)

    await this.e.reply(`开始${type} ${this.typeName}`)
    uping = true
    const ret = await this.execSync(cm)
    uping = false

    if (ret.error) {
      logger.mark(`${this.e.logFnc} 更新失败：${this.typeName}`)
      this.gitErr(ret.error, ret.stdout)
      return false
    }

    const time = await this.getTime(plugin)

    if (/Already up|已经是最新/g.test(ret.stdout)) {
      await this.e.reply(`${this.typeName} 已是最新\n最后更新时间：${time}`)
    } else {
      await this.e.reply(`${this.typeName} 更新成功\n更新时间：${time}`)
      this.isUp = true
      await this.e.reply(await this.getLog(plugin))
    }

    logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)
    return true
  }

  async getcommitId(plugin = '') {
    let cm = 'git rev-parse --short HEAD'
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    const commitId = await execSync(cm, { encoding: 'utf-8' })
    return lodash.trim(commitId)
  }

  async getTime(plugin = '') {
    let cm = 'git log -1 --pretty=%cd --date=format:"%F %T"'
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    let time = ''
    try {
      time = await execSync(cm, { encoding: 'utf-8' })
      time = lodash.trim(time)
    } catch (error) {
      logger.error(error.toString())
      time = '获取时间失败'
    }

    return time
  }

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

  async updateAll() {
    const dirs = readdirSync('./plugins/')
    const MSG = message => {
      // 收集
      this.messages.push(message)
    }
    const testReg = /^#静默全部(强制)?更新$/.test(this.e.msg)
    if (testReg) {
      await this.e.reply(`开始执行静默全部更新,请稍等...`)
    }
    await this.runUpdate()
    for (const plu of dirs) {
      const Plu = this.getPlugin(plu)
      if (Plu === false) continue
      await sleep(1500)
      await this.runUpdate(Plu)
    }
    if (testReg) {
      const msg = await makeForwardMsg(this.e, this.messages)
      MSG(msg)
    }
    if (this.isUp) {
      // await this.e.reply('即将执行重启，以应用更新')
      setTimeout(() => this.restart(), 2000)
    }
  }

  /**
   * 重启
   */
  restart() {
    const con = new Restart()
    con.e = this.e
    con.restart()
  }

  /**
   * 
   * @param plugin 
   * @returns 
   */
  async getLog(plugin = '') {
    let cm = 'git log -100 --pretty="%h||[%cd] %s" --date=format:"%F %T"'
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    let logAll
    try {
      logAll = await execSync(cm, { encoding: 'utf-8' })
    } catch (error) {
      logger.error(error.toString())
      await this.e.reply(error.toString())
    }

    if (!logAll) return false

    logAll = logAll.trim().split('\n')

    let log = []
    for (let str of logAll) {
      str = str.split('||')
      if (str[0] == this.oldCommitId) break
      if (str[1].includes('Merge branch')) continue
      log.push(str[1])
    }
    let line = log.length
    log = log.join('\n\n')

    if (log.length <= 0) return ''

    let end = ''
    try {
      cm = 'git config -l'
      if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`
      end = await execSync(cm, { encoding: 'utf-8' })
      end = end
        .match(/remote\..*\.url=.+/g)
        .join('\n\n')
        .replace(/remote\..*\.url=/g, '')
        .replace(/\/\/([^@]+)@/, '//')
    } catch (error) {
      logger.error(error.toString())
      await this.e.reply(error.toString())
    }

    return makeForwardMsg(
      this.e,
      [log, end],
      `${plugin || BOT_NAME} 更新日志，共${line}条`
    )
  }

  async updateLog() {
    const plugin = this.getPlugin()
    if (plugin === false) return false
    return this.e.reply(await this.getLog(plugin))
  }
}
