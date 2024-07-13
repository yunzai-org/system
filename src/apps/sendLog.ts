import { Plugin } from 'yunzai'
import { makeForwardMsg } from 'yunzai'
import { readFileSync } from 'node:fs'
import { slice, isEmpty } from 'lodash-es'
import moment from 'moment'

/**
 *
 */
export class sendLog extends Plugin {
  lineNum = 100
  maxNum = 1000
  errFile = 'logs/error.log'
  logFile = `logs/command.${moment().format('YYYY-MM-DD')}.log`
  keyWord = null
  constructor() {
    /**
      name: "发送日志",
      dsc: "发送最近100条运行日志",
     */
    super()
    /**
     *
     */
    this.rule = [
      {
        reg: /^#(运行|错误)*日志[0-9]*(.*)/,
        fnc: this.sendLog.name,
        permission: 'master'
      }
    ]
  }

  /**
   *
   * @returns
   */
  async sendLog() {
    const lineNum = this.e.msg.match(/\d+/g)
    if (lineNum) {
      this.lineNum = Number(lineNum[0])
    } else {
      this.keyWord = this.e.msg.replace(/#|运行|错误|日志|\d/g, '')
    }
    let logFile = this.logFile
    let type = '运行'
    if (this.e.msg.includes('错误')) {
      logFile = this.errFile
      type = '错误'
    }
    if (this.keyWord) type = this.keyWord
    const log = this.getLog(logFile)
    if (isEmpty(log)) {
      this.reply(`暂无相关日志：${type}`)
      return
    }
    const data = await makeForwardMsg(
      this.e,
      [log.join('\n')],
      `最近${log.length}条${type}日志`
    )
    if (typeof data == 'string') {
      this.reply(data)
      return
    } else {
      this.reply(JSON.stringify(data))
      return
    }
  }

  /**
   *
   * @param logFile
   * @returns
   */
  getLog(logFile: string) {
    const data = readFileSync(logFile, { encoding: 'utf-8' })
    let log = data.split('\n')
    if (this.keyWord) {
      for (const i in log) if (!log[i].includes(this.keyWord)) delete log[i]
    } else {
      log = slice(log, (Number(this.lineNum) + 1) * -1)
    }
    log = log.reverse()
    const tmp = []
    for (let i of log) {
      if (!i) continue
      if (this.keyWord && tmp.length >= this.maxNum) return
      /* eslint-disable no-control-regex */
      i = i.replace(/\x1b[[0-9;]*m/g, '')
      i = i.replace(/\r|\n/, '')
      tmp.push(i)
    }
    return tmp
  }
}
