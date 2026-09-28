# 应用搜索插件

直接输入应用名称、全拼或拼音首字母，选择后回车打开。命令没有关键词，以 `inputMode: "query"` 接入底座。

匹配、排序、条数限制都在 `src/index.ts`：名称/搜索别名精确匹配优先，其次前缀、包含匹配，最多 30 条。适中模式支持英文词首缩写，宽松模式增加从名称开头开始的有序字符模糊匹配；设置来自 SDK `ctx.search.sensitivity`，旧宿主回退为适中。宿主提供目录元数据和系统打开能力，不负责匹配搜索。

## 安装

```sh
npm run platform -- pack extensions/applications
npm run platform -- install extensions/applications/dist/local.applications-0.2.0.launcher-extension --accept-permissions
npm run platform -- search Finder
```

需要 `applications: ["read", "open"]` 权限。应用目录范围：`/Applications`、`/System/Applications`、`~/Applications` 以及 Finder；元数据缓存最多 60 秒，最多 2000 个应用。支持显示原生图标。打开只在用户选择结果后执行；查询代码不能直接打开应用。

在设置 → 扩展 → 应用搜索中停用，应用搜索结果就会消失；重新启用恢复。宿主没有另一个内置应用搜索开关。

Vectracast 0.4.4 起，应用显示名明确按系统首选语言读取应用包的本地化资源；缺失时回退原始 Bundle 名称和文件名。显示中文时仍保留英文名/文件名及拼音搜索，例如 `微信`、`WeChat`、`weixin` 均可找到微信。

宿主 0.4.5 与插件 0.1.2 增加拼音首字母和分词输入：`weixin`、`wei xin`、`wx` 对应微信；`wxkf`/`wxkfzgj` 对应微信开发者工具；`bwl`/`bei wang lu` 对应备忘录。忽略大小写，支持带声调拼音和音节间撇号。按完整命中、前缀、包含排序，中文显示名不变。拼音由系统转写提供，不穷举多音字的全部读音。

宿主 0.4.6 补扫“应用程序”目录的隐藏应用链接，并结合 Launch Services 已登记的 HTTP/HTTPS 应用位置；按真实路径和 Bundle ID 去重，优先常规应用目录，避免显示浏览器更新缓存。SDK 提供 URL scheme 和文档类型元数据；插件 0.1.4 将同时声明 HTTP/HTTPS 与 HTML 文档支持的应用匹配到 `浏览器`、`browser`、`liulanqi`、`llq`。这些名称的解释属于插件，底座不硬编码浏览器品牌。

## 操作菜单（插件 0.2.0 / Vectracast 0.5.0）

选中应用后按 `⌘K` 打开操作面板；底部可按中文标题或动作 ID 筛选，支持上下键选择、回车执行、Esc 返回搜索。应用提供：

| 操作 | 快捷键 |
| --- | --- |
| 打开应用 | Return |
| 在 Finder 中显示 | ⌘Return |
| 在 Finder 中显示简介 | ⌘I |
| 显示包内容 | ⌥⌘I |
| 添加 / 取消收藏 | ⇧⌘F |

这些快捷键在应用结果页也直接可用。收藏在同等匹配分数中优先，精确匹配仍优先于模糊匹配；收藏以 Bundle ID 记录在本插件的独立本地存储，重启和更新插件后保留。空搜索保持收起列表。

“显示简介”调用 Finder 原生信息窗口，系统可能要求自动化授权；异步执行并限制请求等待时间。此版本不包含自动退出、禁用单个应用、单应用配置、排名重置和复制元数据。
