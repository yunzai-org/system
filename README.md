# Yunzai-System

提供一些必要的，对机器人进行管理的功能。

> Yunzai最低版本4.1

> 若使用4.0版本请翻看4.0分支

## 使用教程

- install

> 请确保已经安装yunzaijs

```sh
yarn add yunzai -W
```

> 添加system应用

```sh
# yarn
yarn add yz-system@latest -W
```

- yunzai.config.js

```js
import system from 'yz-system'
export default {
  application: [system()]
}
```

- update

```sh
# delete
yarn remove yz-system
# add
yarn add yz-system@latest -W
```

## 功能列表

| 功能 | 指令                | 说明            |
| ---- | ------------------- | --------------- |
| 日志 | #更新日志 #运行日志 | 查看git         |
| 更新 | #更新 #全部更新     | 调用git进行更新 |
| 状态 | #状态               | 机器人状态      |
| 运行 | #重启 #关机         | 调用npm指令     |
