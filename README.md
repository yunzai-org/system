# Yunzai-System

提供一些必要的，对机器人进行管理的功能。

## 使用教程

- install

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

- use

v1.0.3以上版本可聊天窗口发送`#系统帮助`

- update

```sh
# delete
yarn remove yz-system
# add
yarn add yz-system@latest -W
```

## 开发

```sh
git clone git@github.com:yunzai-org/system.git
cd system
```

```sh
git clone https://github.com/yunzai-org/system.git
cd system
```

```sh
npm install yarn@1.19.1 -g
yarn
```

```sh
yarn app
```
