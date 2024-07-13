import * as main from './apps.js'

/**
 * version 4.1
 */
export default () => {
    return class System {
        /**
         * 插件名
         */
        static name = 'system'

        /**
         * 应用
         */
        get apps() {
            return main
        }
    }
}

// 保持对 4.0的兼容
export * as apps from './apps.js'