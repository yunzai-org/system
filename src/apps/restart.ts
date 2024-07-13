import fetch from 'node-fetch'
import { exec } from 'child_process'
import { Plugin } from 'yunzai'
import { join } from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { Store } from '../store'
import { isPortTaken } from '../model'
const require = createRequire(import.meta.url)

//
export class Restart extends Plugin {
  constructor() {
    super()
    this.priority = 10
    this.rule = [
      {
        reg: /^#重启$/,
        fnc: this.restart.name,
        permission: 'master'
      },
      {
        reg: /^#(停机|关机)$/,
        fnc: this.stop.name,
        permission: 'master'
      }
    ]
  }

  /**
   *
   */
  async init() {
    const data = await redis.get(Store.RESTART_KEY)
    if (data) {
      const restart = JSON.parse(data)
      const uin = restart?.uin || Bot.uin
      let time = restart.time || new Date().getTime()
      time = (new Date().getTime() - time) / 1000
      let msg = `重启成功：耗时${time.toFixed(2)}秒`
      try {
        if (restart.isGroup) {
          Bot[uin].pickGroup(restart.id).sendMsg(msg)
        } else {
          Bot[uin].pickUser(restart.id).sendMsg(msg)
        }
      } catch (error) {
        /** 不发了，发不出去... */
        logger.debug(error)
      }
      redis.del(Store.RESTART_KEY)
    }

    // 如果 return 'return' 则跳过解析
  }

  /**
   *
   * @returns
   */
  async restart() {
    // 开始询问是否有正在运行的同实例进程
    const dir = join(process.cwd(), 'pm2.config.cjs')
    if (!existsSync(dir)) {
      // 不存在配置，错误
      this.e.reply('pm2 配置丢失')
      return
    }
    const cfg = require(dir)
    const restart_port = cfg?.restart_port || 27881
    await this.e.reply('开始执行重启，请稍等...')
    logger.mark(`${this.e.logFnc} 开始执行重启，请稍等...`)
    /**
     *
     */
    const data = JSON.stringify({
      uin: this.e?.self_id || this.e.bot.uin,
      isGroup: !!this.e.isGroup,
      id: this.e.isGroup ? this.e.group_id : this.e.user_id,
      time: new Date().getTime()
    })
    const npm = await this.checkPnpm()
    await redis.set(Store.RESTART_KEY, data, { EX: 120 })

    /**
     *
     */
    if (await isPortTaken(restart_port)) {
      try {
        const result = await fetch(
          `http://localhost:${restart_port}/restart`
        ).then(res => res.text())
        if (result !== `OK`) {
          redis.del(Store.RESTART_KEY)
          this.e.reply(`操作失败！`)
          logger.error(`重启失败`)
        }
      } catch (error) {
        redis.del(Store.RESTART_KEY)
        this.e.reply(`操作失败！\n${error}`)
      }
    } else {
      /**
       *
       */
      try {
        exec(`${npm} run start`, { windowsHide: true }, (error, stdout, _) => {
          if (error) {
            redis.del(Store.RESTART_KEY)
            this.e.reply(`操作失败！\n${error.stack}`)
            logger.error(`重启失败\n${error.stack}`)
          } else if (stdout) {
            logger.mark('重启成功，运行已由前台转为后台')
            logger.mark(`查看日志请用命令：${npm} run logs`)
            logger.mark(`停止后台运行命令：${npm} run stop`)
            process.exit()
          }
        })
      } catch (error) {
        redis.del(Store.RESTART_KEY)
        this.e.reply(`操作失败！\n${error.stack ?? error}`)
      }
    }

    return true
  }

  /**
   *
   * @returns
   */
  async checkPnpm() {
    return 'npm'
  }

  /**
   *
   * @param cmd
   * @returns
   */
  async execSync(cmd) {
    return new Promise(resolve => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }

  /**
   *
   * @returns
   */
  async stop() {
    // 开始询问是否有正在运行的同实例进程
    const dir = join(process.cwd(), 'pm2.config.cjs')
    if (!existsSync(dir)) {
      // 不存在配置，错误
      this.e.reply('pm2 配置丢失')
      return
    }
    const cfg = require(dir)
    const restart_port = cfg?.restart_port || 27881
    if (await isPortTaken(restart_port)) {
      try {
        logger.mark('关机成功，已停止运行')
        await this.e.reply(`关机成功，已停止运行`)
        await fetch(`http://localhost:${restart_port}/exit`)
        return
      } catch (error) {
        this.e.reply(`操作失败！\n${error}`)
        logger.error(`关机失败\n${error}`)
      }
    }
    if (!process.argv[1].includes('pm2')) {
      logger.mark('关机成功，已停止运行')
      await this.e.reply('关机成功，已停止运行')
      process.exit()
    }
    logger.mark('关机成功，已停止运行')
    await this.e.reply('关机成功，已停止运行')
    const npm = await this.checkPnpm()
    exec(`${npm} run stop`, { windowsHide: true }, error => {
      if (error) {
        this.e.reply(`操作失败！\n${error.stack}`)
        logger.error(`关机失败\n${error.stack}`)
      }
    })
  }
}
