import * as main from './apps.js'
import { Store } from './store.js'
import { Options } from './types.js'

/**
 * 
 */
class App {
    // 插件名
    static stattu = 'system'

    //
    #data = []

    /**
     * 这里是用户个性化配置信息
     * @param config 
     */
    constructor(config?: Options) {
        if (config.reStartKey) Store.RESTART_KEY = config.reStartKey
        // 个性化配置，代替文件形式
    }

    /**
     * 插件创建时
     * 处理的函数
     * @param config 
     */
    create(config) {
        // yunzai.congi.js 配置信息
        
        // 对应用进行排序
        for (const key in main) {
            this.#data.push(new main[key]())
        }
    }

    /**
     * 安装中间件之前的函数
     */
    beforeMount(event) {
        //
    }

    /**
     * 安装中间件之上会执行的函数
     * 也就是响应前处理的函数
     * @returns 
     */
    mounted(event) {


        // 把处理好的 this.data 丢给机器人
        return this.#data
    }


    /**
     * 每条响应时会都处理的函数
     * @returns 
     */
    response() {
        //
    }

    
    /**
     * 响应后
     */
    afterResponse(){
        // 完成响应后，处理的函数
    }


}

/**
 * 
 */
export default (config: Options) => new App(config)