---
title: vue-router3源码分析(1)
excerpt: ' '
date: 2022-05-11 17:33:57
tags: [vue全家桶, vue-router, vue-router3, 源码分析]
---

### 地址

[源码地址:vuejs/vue-router@3.1.5](https://github.com/vuejs/vue-router/tree/v3.1.5)

[myGithub:2460392754/source-analysis](https://github.com/2460392754/source-analysis/tree/dev/vue-router)

## 项目结构

```
vue-router
├── src
│   ├── components
│   │   ├── link.js
│   │   └── view.js
│   ├── history
│   │   ├── abstract.js
│   │   ├── base.js
│   │   ├── errors.js
│   │   ├── hash.js
│   │   └── html5.js
│   ├── util
│   │   ├── async.js
│   │   ├── dom.js
│   │   ├── location.js
│   │   ├── misc.js
│   │   ├── params.js
│   │   ├── path.js
│   │   ├── push-state.js
│   │   ├── query.js
│   │   ├── resolve-components.js
│   │   ├── route.js
│   │   ├── scroll.js
│   │   ├── state-key.js
│   │   └── warn.js
│   ├── create-matcher.js
│   ├── create-route-map.js
│   ├── index.js
│   └── install.js
└── README.md
```
