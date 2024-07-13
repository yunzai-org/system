# System-Plugin

提供一些必要的，对机器人进行管理的功能。

## 使用教程

- install

```sh
# npm
npm install yz-system
# yarn
yarn add yz-system -W
```

- yunzai.config.js

```js
import system from 'yz-system'
export default {
    application: [system()]
}
```

## 功能列表

| 功能 | 指令                | 说明 |
| ---- | ------------------- | ---- |
| 日志 | #更新日志 #运行日志 | 嘎嘎 |
| 更新 | #更新 #全部更新     | 嘎嘎 |
| 状态 | #状态               | 嘎嘎 |
| 运行 | #重启 #关机         | 嘎嘎 |
