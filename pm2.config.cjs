const config = require('yunzai/pm2')
config.apps[0].script = './src/main.dev.js'
module.exports = config
