import { Application, makeForwardMsg, execAsync, PLUGINS_PATH } from 'yunzai'
import { trim } from 'lodash-es'
import { existsSync } from 'node:fs'
import { BOT_NAME } from 'yunzai'
import { Restart } from './restart.js'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

// id
let oldCommitId = null
// 执行锁
let lock = false

/**
 * 得到插件
 * @param plugin
 * @returns
 */
function getPlugin(name = '', name2 = '') {
  if (!name || name == '') {
    if (!name2 || name2 == '') return ''
    name = name2
  }
  // 指定插件不存在
  if (!existsSync(join(PLUGINS_PATH, name, '.git'))) return false
  // 存在则返回
  return name
}

/**
 *
 * @param name
 * @returns
 */
async function getcommitId(pluginName = '') {
  const Shells = ['git rev-parse --short HEAD']
  if (pluginName && pluginName != '') {
    Shells.unshift(`cd "plugins/${pluginName}"`)
  }
  const commitId = await execAsync(Shells.join(' && '))
  return trim(commitId?.stderr ?? commitId.stdout)
}

/**
 *
 * @param plugin
 * @returns
 */
async function getTime(pluginName = '') {
  const Shells = ['git log -1 --pretty=%cd --date=format:"%F %T"']
  if (pluginName) {
    Shells.unshift(`cd "plugins/${pluginName}"`)
  }
  try {
    const res = await execAsync(Shells.join(' && '))
    return trim(res?.stdout)
  } catch (error) {
    logger.error(error.toString())
    return '获取时间失败'
  }
}

// #更新日志 #更新 #插件列表

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
        reg: /^#(全部)?(静默)?(强制)?更新/,
        fnc: this.mandatoryUpdate.name,
        permission: 'master'
      }
    ]
  }

  /**
   * 更新
   * @returns
   */
  async mandatoryUpdate() {
    // 不是主人
    if (!this.e.isMaster) return
    // 执行锁
    if (lock) {
      this.e.reply('正在更新中..请勿重复操作')
      return
    }
    // 其他指令重合反弹
    if (/详细|详情|面板|面版/.test(this.e.msg)) {
      lock = false
      return
    }
    // 获取插件
    const name = getPlugin(
      '',
      this.e.msg.replace(/^#(全部)?(静默)?(强制)?更新/, '')
    )
    // false 错误
    if (name === false) {
      lock = false
      this.e.reply('插件名不存在')
      return
    }

    const Update = async (name: string) => {
      // 运行更新
      const IsUpdate = await this.runUpdate(name)
      //是否需要重启
      if (IsUpdate) {
        setTimeout(() => {
          new Restart(this.e).buidlRestart()
        }, 2000)
      } else {
        lock = false
      }
    }

    if (!/全部/.test(this.e.msg)) {
      Update(name)
      return
    }

    //
    const names = (await readdir(PLUGINS_PATH, { withFileTypes: true }))
      .filter(file => !file.isFile())
      .map(dir => dir.name)

    //
    if (names.length <= 0) {
      Update(name)
      return
    }

    // 全部更新

    let IsU = false

    for (const name of names) {
      // 运行更新
      const IsUpdate = await this.runUpdate(name)
      //是否需要重启
      if (IsUpdate) IsU = true
    }

    if (IsU) {
      setTimeout(() => {
        new Restart(this.e).buidlRestart()
      }, 2000)
    } else {
      lock = false
    }

    //
  }

  /**
   * 运行更新
   * @param plugin
   * @returns
   */
  async runUpdate(pluginName = '') {
    const Shells: string[] = []
    if (pluginName) Shells.push(`cd "plugins/${pluginName}"`)
    if (/强制/.test(this.e.msg)) {
      Shells.push('git reset --hard')
      Shells.push('git pull --rebase --allow-unrelated-histories')
    } else {
      Shells.push('git pull --no-rebase')
    }
    // id
    oldCommitId = await getcommitId(pluginName)
    // name
    const Name = pluginName == '' ? BOT_NAME : pluginName
    // 记录
    logger.mark(`开始更新 : ${Name}`)
    const msg = [`开始更新 : ${Name}`]
    // res
    const res = await execAsync(Shells.join(' && '))
    // 发送错误
    if (res?.stderr) {
      logger.mark(`更新失败：${Name}`)
      if (!/静默/.test(this.e.msg)) {
        this.gitErr(res.stderr.toString(), res.stdout.toString(), Name)
      }
      return
    }
    const time = await getTime(pluginName)
    logger.mark(`最后更新时间：${time}`)
    if (/Already up|已经是最新/g.test(res.stdout)) {
      msg.push(`已是最新:${Name}\nDATE:${time}`)
      if (!/静默/.test(this.e.msg)) {
        console.log('this.e.msg', this.e.msg)
        this.e.reply(await makeForwardMsg(this.e, msg, `${Name} 运行记录`))
      }
    } else {
      if (!/静默/.test(this.e.msg)) {
        msg.push(`更新成功:${Name}\nDATE:${time}`)
        // 更新成功
        this.sendLog(pluginName, msg)
      }
      return true
    }
    return
  }

  /**
   * git 错误
   * @param err
   * @param stdout
   * @returns
   */
  async gitErr(stdErr: string, stdout: string, name: string) {
    const MSG = ['更新失败！']
    if (stdErr.includes('Timed out')) {
      MSG.push(`连接超时:${stdErr.match(/'(.+?)'/g)[0].replace(/'/g, '')}`)
      this.e.reply(MSG.join('\n'))
      return
    }
    if (/Failed to connect|unable to access/g.test(stdErr)) {
      MSG.push(`连接失败：${stdErr.match(/'(.+?)'/g)[0].replace(/'/g, '')}`)
      this.e.reply(MSG.join('\n'))
      return
    }
    if (
      stdErr.includes('be overwritten by merge') ||
      stdout.includes('CONFLICT')
    ) {
      MSG.push(`存在冲突：\n${stdErr}`)
      MSG.push('请解决冲突后再更新，或者执行#强制更新，放弃本地修改')
      this.e.reply(MSG.join('\n'))
      return
    }
    this.e.reply(
      await makeForwardMsg(this.e, [stdErr, stdout], `${name} 更新记录`)
    )
    return
  }

  /**
   * 更新记录
   * @returns
   */
  async updateLog() {
    const name = getPlugin('', this.e.msg.replace(/^#更新日志/, ''))
    if (name === false) return
    this.sendLog(name)
    return
  }

  /**
   * 发送指定插件的更新记录
   * @param name
   * @returns
   */
  async sendLog(name: string, startLogs?: string[]) {
    const Shells = [
      'git log -100 --pretty="%h||[%cd] %s" --date=format:"%F %T"'
    ]
    // 进入插件
    if (name) {
      Shells.unshift(`cd "plugins/${name}`)
    }
    // 执行
    const res = await execAsync(Shells.join(' && '))
    if (!res.stdout) {
      this.e.reply('记录不存在')
      return
    }
    // 去除前后空格，并转为数组
    const LogArray = res.stdout.trim().split('\n')
    // logs记录
    const Logs: string[] = []
    for (let str of LogArray) {
      const strArr = str.split('||')
      if (strArr[0] == oldCommitId) break
      if (strArr[1].includes('Merge branch')) continue
      if (strArr[1] && strArr[1] !== '') {
        Logs.push(strArr[1])
      }
    }

    // 记录为空
    if (Logs.length <= 0) {
      this.e.reply('记录不存在')
      return
    }
    // 记录条数
    const Size = Logs.length

    try {
      const Shell2 = ['git config -l', `cd "plugins/${name}"`]
      const res = await execAsync(Shell2.join(' && '))
      if (res?.stdout) {
        const end = res.stdout
          .match(/remote\..*\.url=.+/g)
          .join('\n\n')
          .replace(/remote\..*\.url=/g, '')
          .replace(/\/\/([^@]+)@/, '//')
        Logs.push(end)
      }
    } catch (error) {
      //
      logger.error(error.toString())
    }

    //
    const msg = await makeForwardMsg(
      this.e,
      Array.isArray(startLogs) ? [...startLogs, ...Logs] : Logs,
      `${name || BOT_NAME} 更新日志，共${Size}条`
    )

    //
    if (msg) {
      this.e.reply(msg)
    } else {
      this.e.reply('日志获取失败~')
    }

    //
    return
  }
}
