import { Application, ConfigController } from 'yunzai'
import { Store } from '../model/store'
import pm2 from 'pm2'
import { getCommandOutput } from '../model/utils'

// 执行锁
let lock = false

// 时间锁 5 秒 时间锁
// 重启速度太快，icqq重复接收消息。
const RESTART_TIME = 5 * 1000

export class Restart extends Application<'message'> {
  constructor(e) {
    // 消息
    super('message')
    // event
    if (e) this.e = e
    // rule
    this.rule = [
      {
        reg: /^#(后台)?(编译)?重启$/,
        fnc: this.buidlRestart.name,
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
  async buidlRestart() {
    if (/^编译/.test(this.e.msg)) {
      this.restart()
      return
    }

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
                // 解锁
                lock = false
                //
                this.restart()
              })
              .catch(err => {
                logger.error(err)
                // 解锁
                lock = false
                this.e.reply('yarn 编译错误,请手动检查！')
              })
          })
          .catch(() => {
            // 解锁
            lock = false
            this.e.reply('yarn 依赖存在错误，请手动检查！')
          })
      })
      .catch(() => {
        // 解锁
        lock = false
        this.e.reply('找不到 yarn , 请安装\nnpm i yarn@1.19.1 -g')
      })
  }

  /**
   * 重启方法
   * @returns {Promise<void>}
   */
  async restart() {
    if (lock) {
      this.e.reply('正在调控，请勿重复进行...')
      return
    }

    /**
     * 时间锁
     */
    const time = await redis.get(Store.RESTART_ACTION_KEY)
    if (time && Number(time) + RESTART_TIME > Date.now()) return
    await redis.set(Store.RESTART_ACTION_KEY, Date.now().toString())

    // 执行锁
    lock = true

    //
    const Error = (err: any, msg?: string) => {
      lock = false
      if (err) logger.error(err)
      if (msg) {
        logger.error(msg)
        this.e.reply(msg)
      }
      pm2.disconnect()
      // delete
      redis.del(Store.RESTART_KEY)
    }

    // delete
    redis.del(Store.RESTART_KEY)

    //
    const send = async () => {
      await this.e.reply('开始重启...')
      // set
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
    }

    // config
    const cfg = ConfigController.pm2

    // 查看情况
    pm2.connect(err => {
      if (err) {
        Error(err?.message, 'pm2出错')
        return
      }
      // 得到列表
      pm2.list(async (err, processList) => {
        if (err) {
          Error(err?.message, 'pm2 list 获取失败')
          return
        }
        //
        if (processList.length <= 0) {
          Error(undefined, 'pm2 进程配置为空, 你从未有pm2进程记录,无法使用重启')
          return
        }
        //
        const app = processList.find(p => p.name === cfg.apps[0].name)
        //
        if (!app) {
          Error(undefined, 'pm2 未匹配到进程配置，配置可能被修改了')
          return
        }
        // 记录重启
        await send()
        // 尝试重启
        pm2.restart(cfg.apps[0].name, async err => {
          if (err) {
            Error(err?.message, 'pm2 重启错误')
          } else {
            lock = false

            if (/^后台/.test(this.e.msg)) {
              process.exit()
            }

            // 下线
            global.Bot.logout()
            // 打印记录
            pm2.launchBus((err, bus) => {
              if (err) {
                console.error(err)
                process.exit(2)
              }
              bus.on('log:out', packet => {
                if (packet?.data) console.log(packet.data)
              })
              bus.on('log:err', packet => {
                if (packet?.data) console.log(packet.data)
              })
            })
            //
          }
        })
      })
    })
  }

  /**
   *
   * @returns
   */
  async stop() {
    if (lock) {
      this.e.reply('正在调控，请勿重复进行...')
      return
    }
    //
    lock = true
    //
    await this.e.reply('准备杀死进程...')
    // 关闭进程
    process.exit()
  }
}
