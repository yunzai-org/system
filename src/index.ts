import * as apps from './apps.js'
import { Options } from './types.js'
import { Store } from './store.js'
import { applicationOptions, useAppStorage } from 'yunzai'
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
