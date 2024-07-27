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

## 功能列表

- #更新日志

> 查看根目录git记录

- #更新日志xxx

> 查看plugins/xxx的git目录

- #运行日志

> 查看logs目录文件

- #更新

> 也指定`#更新XXX`,可选组合`全部`、`强制`、`静默`,如`#全部更新`

- #依赖配置

> 查看 package.json -> { dependencies:{} }

- #依赖检查XXX

> 检查

> ./package.json -> { dependencies:{XXX:""} }

> ./node_modules/XXX/package.json -> { version:"" }

- #依赖添加

> `#依赖添加yunzai`

> `#依赖添加yz-system@latest`

> `#依赖添加puppeteer@22`

- #云崽配置

> 查看yunzai.config.js

- #云崽写入配置XXX

> 修改yunzai.config.js

- #源码编译

> 执行yarn && yarn build

- #重启

> 执行yarn start

> 可选组合`后台`、`编译`,如`#编译重启`

- #关机

> 结束进行

- #状态
