# Spring Boot Open in IDE

一个 Chrome 扩展，在页面上以浮窗形式实时捕获 Spring Boot 应用的网络请求，并一键在 IntelliJ IDEA 中打开对应的控制器代码。

## 功能

- 在页面右下角显示可拖拽的浮窗面板，实时列出 Spring Boot 应用的 HTTP 请求
- 自动过滤静态资源（CSS、JS、图片、字体等），只保留业务请求
- 点击「📂 打开IDEA」按钮，直接跳转到 IDEA 中对应的 Controller 方法
- 支持最小化/展开、清空列表、拖拽移动
- 最多保留 100 条请求记录，最新的请求显示在最上方

## 前置条件

1. 配合使用java工程：https://github.com/jiafuxiaoqu/open-in-idea
2. Spring Boot 项目中已集成 `OpenInIdeController`，
3. 系统已安装 IntelliJ IDEA

## 安装

1. 打开 Chrome，进入 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」，选择本项目目录
4. 安装完成

## 使用

1. 打开正在运行的 Spring Boot 应用页面（`http://localhost`）
2. IDEA执行文件目录，IDEA执行文件名称，请求地址 在悬浮窗面板中配置，一定要配置.
3. 页面右下角会自动出现浮窗面板
4. 操作页面触发请求，面板中会实时列出捕获到的请求
5. 点击请求行的「📂 打开IDEA」按钮，IDEA 会自动定位到对应的 Controller 代码
6. 可拖拽标题栏移动面板位置，点击 `_` 最小化面板



## 后端接口

扩展调用 `http://localhost:8090/__open_in_idea` 也可自定义，自己拓展


你需要在 Spring Boot 项目中添加对应的 `OpenInIdeController` 来处理这个请求。

## 联系方式
QQ群：1172212917

## 注意事项

- 扩展仅在 `http://localhost` 页面上自动注入浮窗
- 静态资源路径（如 `/static`）的请求会被自动忽略
- 如果浮窗未出现，请刷新页面或检查扩展是否已启用
- 如果点击按钮无反应，请确认 Spring Boot 应用已启动且集成了后端接口