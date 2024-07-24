import * as apps from './apps.js'
import { Options } from './types/types.js'
import { Store } from './model/store.js'
import { applicationOptions, useAppStorage } from 'yunzai'

/**
 * 启动时，检查状态
 */
async function Init() {
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
    // 发送成功后删除key
    redis.del(Store.RESTART_KEY)
  }
}

export default (config?: Options) => {
  // 存储
  const data = useAppStorage()
  // options
  return applicationOptions({
    create() {
      // init
      if (config?.reStartKey) Store.RESTART_KEY = config?.reStartKey
      // 对应用进行排序
      for (const key in apps) {
        data.push(new apps[key]())
      }
      // init
      Init()
    },
    /**
     * 安装中间件之上会执行的函数
     * 也就是响应前处理的函数
     * @returns
     */
    mounted() {
      // 把处理好的 this.data 丢给机器人
      return data
    }
  })
}
export * from './apps/restart.js'
export * from './apps/sendLog.js'
export * from './apps/status.js'
export * from './apps/update.js'
