# FanBar 风扇控制

从 Vectracast 快速打开 [FanBar](https://github.com/helson-lin/FanBar)，查看并管理 Mac 的风扇、温度和散热策略。

## 使用

在启动台中输入 `fanbar`、`风扇` 或 `散热`。插件会检测本机已安装的 FanBar，并提供打开应用、查看项目和查看最新版本的操作。

FanBar 负责风扇控制和系统授权；本插件只负责发现并打开 FanBar，不会直接读写 SMC 或替代 FanBar 的安全授权流程。

## 权限

- 应用程序：读取已安装的应用并打开用户选择的 FanBar。
- 浏览器：打开 FanBar 项目页和发布页。
