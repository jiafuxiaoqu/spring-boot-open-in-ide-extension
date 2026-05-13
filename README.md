# Spring Boot Open in IDE

一个 Chrome 扩展，在页面上以浮窗形式实时捕获 Spring Boot 应用的网络请求，并一键在 IntelliJ IDEA 中打开对应的控制器代码。

## 功能

- 在页面右下角显示可拖拽的浮窗面板，实时列出 Spring Boot 应用的 HTTP 请求
- 自动过滤静态资源（CSS、JS、图片、字体等），只保留业务请求
- 点击「📂 打开IDEA」按钮，直接跳转到 IDEA 中对应的 Controller 方法
- 支持最小化/展开、清空列表、拖拽移动
- 最多保留 100 条请求记录，最新的请求显示在最上方

## 前置条件

1. Spring Boot 应用运行在 `localhost:8080`
2. Spring Boot 项目中已集成 `OpenInIdeController`，该控制器监听 `localhost:8090/__open_in_idea` 接口
3. 系统已安装 IntelliJ IDEA 且命令行工具可用

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目目录
4. 安装完成

## 使用

1. 打开正在运行的 Spring Boot 应用页面（`http://localhost:8080`）
2. 页面右下角会自动出现浮窗面板
3. 操作页面触发请求，面板中会实时列出捕获到的请求
4. 点击请求行的「📂 打开IDEA」按钮，IDEA 会自动定位到对应的 Controller 代码
5. 可拖拽标题栏移动面板位置，点击 `_` 最小化面板

## 工作原理

```
浏览器请求 → background.js 通过 webRequest 捕获 → 转发给 content.js → 浮窗展示
点击按钮 → POST http://localhost:8090/__open_in_idea → IDEA 打开对应代码
```

- `background.js` 使用 `chrome.webRequest` API 监听 `localhost:8080` 的请求
- 请求信息通过消息传递发送到 `content.js`
- `content.js` 在页面上注入浮窗 UI 并展示请求列表
- 点击按钮时，将请求 URL 和 HTTP 方法发送到本地后端服务，后端解析路由映射并调用 IDEA 打开文件

## 项目结构

| 文件 | 说明 |
|---|---|
| `manifest.json` | 扩展配置，声明权限、content script 和后台服务 |
| `content.js` | 页面浮窗 UI：请求展示、过滤、拖拽、调用后端 |
| `inject.js` | 在页面主世界注入的脚本，负责拦截请求并与 content script 通信 |
| `background.js` | 后台服务：通过 webRequest 监听请求并转发给 content script |

## 后端接口

扩展调用 `http://localhost:8090/__open_in_idea`，请求格式：

```json
{
  "requestUrl": "http://localhost:8080/api/users",
  "method": "GET"
}
```

成功响应：

```json
{
  "success": true,
  "message": "已打开 UserController.getUsers()"
}
```

你需要在 Spring Boot 项目中添加对应的 `OpenInIdeController` 来处理这个请求。

## 注意事项

- 扩展仅在 `http://localhost:8080` 页面上自动注入浮窗
- 静态资源路径（如 `/static`）和后端服务端口（`8090`）的请求会被自动忽略
- 如果浮窗未出现，请刷新页面或检查扩展是否已启用
- 如果点击按钮无反应，请确认 Spring Boot 应用已启动且集成了后端接口