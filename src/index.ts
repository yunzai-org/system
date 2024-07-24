import { applicationOptions, useAppStorage } from 'yunzai'
import * as apps from './apps.js'
import { Options } from './types/types.js'
import { Store } from './model/store.js'
import { Init } from './model/init.js'
export * from './apps.js'
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
    mounted() {
      return data
    }
  })
}
