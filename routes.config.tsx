import React from 'react'
import { defineConfig } from 'react-puppeteer'
import { Help } from './src/puppeteer/component/index'
import { parse } from 'yaml'
import { readFileSync } from 'fs'
import { createRequire } from 'react-puppeteer'
const require = createRequire(import.meta.url)
const dir = require('./public/yaml/help.yaml')
const Data = parse(readFileSync(dir, 'utf-8'))
export default defineConfig([
  {
    url: '/help',
    options: {
      html_head: (
        <>
          <link rel="stylesheet" href={require('./public/css/help.css')} />
        </>
      ),
      html_body: <Help helpData={Data} />
    }
  }
])
