# FanBar 风扇控制

在 Vectracast 中直接使用 [FanBar](https://github.com/helson-lin/FanBar) 的风扇控制服务，查看转速和控制模式，切换散热预设、设置 80% 转速或恢复自动控制。

## 使用

在启动台中输入 `fanbar`、`fan`、`cooling` 或 `temperature`。插件会检测 FanBar 控制服务，展示每个风扇的当前 RPM 和手动状态，并提供静音、均衡、性能、极速、80% 转速和恢复自动控制等操作。操作仍由 FanBar 的特权 helper 执行。

FanBar 负责风扇控制和系统授权；本插件不会直接读写 SMC，也不会绕过 FanBar 的安全授权流程。首次使用前请先打开 FanBar 并完成控制服务授权。

## 权限

- 应用程序：读取已安装的应用并打开用户选择的 FanBar。
- FanBar：读取 FanBar 的风扇状态，并在用户选择操作后切换预设、设置转速或恢复自动控制。
- 浏览器：打开 FanBar 项目页和发布页。
