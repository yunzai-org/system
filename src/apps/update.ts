import { Application, makeForwardMsg } from 'yunzai'
import { trim } from 'lodash-es'
import { existsSync, readdirSync } from 'node:fs'
import { BOT_NAME, PLUGINS_PATH } from 'yunzai'
import { execSync } from 'child_process'
import { Restart } from './restart.js'
import { sleep } from 'yunzai'
import { Store } from '../model/store.js'

let typeName = BOT_NAME
let messages = []
let isUp = null
let isNowUp = null
let oldCommitId = null

/**
 *
 * @param plugin
 * @returns
 */
function getPlugin(name = '') {
  if (!name || name == '') {
    // 没有设置  - 就捕获指令上的
    name = this.e.msg.replace(/#(强制)?更新(日志)?/, '')
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
  const commitId = await execSync(cm, { encoding: 'utf-8' })
  return trim(commitId)
}

/**
 *
 * @param name
 * @returns
 */
async function getLog(name = '') {
  let cm = 'git log -100 --pretty="%h||[%cd] %s" --date=format:"%F %T"'
  if (name) cm = `cd "plugins/${name}" && ${cm}`

  // 所有记录
  let logAll: string | null = null

  //
  try {
    logAll = await execSync(cm, { encoding: 'utf-8' })
  } catch (error) {
    // 不错啦
    logger.error(error.toString())
    // await this.e.reply(error.toString())
  }

  // 记录不存在
  if (!logAll) return false

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

  if (logStr.length <= 0) return ''

  let end = ''

  try {
    cm = 'git config -l'
    if (name) cm = `cd "plugins/${name}" && ${cm}`
    end = await execSync(cm, { encoding: 'utf-8' })
    end = end
      .match(/remote\..*\.url=.+/g)
      .join('\n\n')
      .replace(/remote\..*\.url=/g, '')
      .replace(/\/\/([^@]+)@/, '//')
    //
  } catch (error) {
    //
    logger.error(error.toString())
    await this.e.reply(error.toString())
  }

  /**
   * tudo
   * 合成转发
   */
  return makeForwardMsg(
    this.e,
    [logStr, end],
    `${name || BOT_NAME} 更新日志，共${length}条`
  )
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
    time = await execSync(cm, { encoding: 'utf-8' })
    time = trim(time)
  } catch (error) {
    logger.error(error.toString())
    time = '获取时间失败'
  }
  return time
}

export class Update extends Application<'message'> {
  constructor() {
    super('message')
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

  /**
   * 更新
   * @returns
   */
  async update() {
    // 不是主人
    if (!this.e.isMaster) return false
    if (Store.uping) {
      this.e.reply('正在更新中..请勿重复操作')
      return false
    }
    // 其他指令重合反弹
    if (/详细|详情|面板|面版/.test(this.e.msg)) return false

    // 获取插件
    const name = getPlugin()

    // false 错误
    if (name === false) return false

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
    isNowUp = false

    let cm = 'git pull --no-rebase'

    let type = '更新'

    //
    if (this.e.msg.includes('强制')) {
      //
      type = '强制更新'
      cm = `git reset --hard && git pull --rebase --allow-unrelated-histories`

      //
    }
    //
    if (plugin) cm = `cd "plugins/${plugin}" && ${cm}`

    oldCommitId = await getcommitId(plugin)

    //
    logger.mark(`${this.e.logFnc} 开始${type}：${typeName}`)

    await this.e.reply(`开始${type} ${typeName}`)

    //
    Store.uping = true

    //
    const ret = await execSync(cm)

    //
    Store.uping = false

    //
    if (ret.error) {
      logger.mark(`${this.e.logFnc} 更新失败：${typeName}`)
      this.gitErr(ret.error, ret.stdout)
      return false
    }

    const time = await getTime(plugin)

    if (/Already up|已经是最新/g.test(ret.stdout)) {
      await this.e.reply(`${typeName} 已是最新\n最后更新时间：${time}`)
    } else {
      await this.e.reply(`${typeName} 更新成功\n更新时间：${time}`)
      isUp = true
      const msg = await this.getLog(plugin)
      if (msg) await this.e.reply(msg)
    }

    logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)
    return true
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
      const Plu = getPlugin(plu)
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
  restart = () => {
    const con = new Restart()
    con.e = this.e
    con.restart()
  }

  /**
   * 更新记录
   * @returns
   */
  async updateLog() {
    const name = getPlugin()
    if (name === false) return false
    // 得到指令插件的记录
    const msg = await getLog(name)
    // 记录错误
    if (msg) {
      this.e.reply(msg)
    } else {
      this.e.reply('日志获取失败~')
    }
    return
  }
}
