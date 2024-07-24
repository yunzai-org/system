import { exec } from 'child_process'
import { Application } from 'yunzai'
import { join } from 'path'
import { createRequire } from 'module'
import { existsSync } from 'fs'
import { Store } from '../model/store'
const require = createRequire(import.meta.url)
/**
 * 重启 ｜ 停机 ｜ 关机
 */
export class Restart extends Application<'message'> {
  constructor() {
    // 消息
    super('message')
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
    // 写入数据
    await redis.set(
      Store.RESTART_KEY,
      JSON.stringify({
        uin: this.e?.self_id || this.e.bot.uin,
        isGroup: !!this.e.isGroup,
        id: this.e.isGroup ? this.e.group_id : this.e.user_id,
        time: new Date().getTime()
      }),
      { EX: 120 }
    )

    /**
     * tudo
     * 需要修改成pm2通讯
     * 而不是使用 npm指令
     */

    // 确保使用最基本的 npm 环境
    try {
      exec(`npm run start`, { windowsHide: true }, (error, stdout, _) => {
        if (error) {
          // 失败了，清理  key
          redis.del(Store.RESTART_KEY)
          this.e.reply(`操作失败！\n${error.stack}`)
          logger.error(`重启失败\n${error.stack}`)
        } else if (stdout) {
          logger.mark('重启成功，运行已由前台转为后台')
          logger.mark(`查看日志请用命令：npm run logs`)
          logger.mark(`停止后台运行命令：npm run stop`)
          // 启动了新的
          // 要关闭当前的
          process.exit()
        }
      })
    } catch (error) {
      // 失败了，清理  key
      redis.del(Store.RESTART_KEY)
      // 发送失败信息
      this.e.reply(`操作失败！\n${error.stack ?? error}`)
    }
    return true
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
    // tudo
    // 关机 即 停止运行
    // 可以设定 关机 ｜ 关机xxxx小时 ｜ 关机到xxx时间
    if (!process.argv[1].includes('pm2')) {
      logger.mark('关机成功，已停止运行')
      await this.e.reply('关机成功，已停止运行')
      process.exit()
    }
    logger.mark('关机成功，已停止运行')
    await this.e.reply('关机成功，已停止运行')
    exec(`npm run stop`, { windowsHide: true }, error => {
      if (error) {
        this.e.reply(`操作失败！\n${error.stack}`)
        logger.error(`关机失败\n${error.stack}`)
      }
    })
  }
}
