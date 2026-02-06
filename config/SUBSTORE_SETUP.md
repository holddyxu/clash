# Sub-Store 完整配置方案 - 使用指南

## 📋 概述

此方案通过让 Sub-Store 输出**完整的 Mihomo 配置文件**来解决 Provider 模式下 `dialer-proxy` 引用失效的问题。

### 核心思路

```
之前（Provider 模式）:
Mihomo ─拉取订阅→ proxy-providers ─动态引用→ dialer-proxy ❌ 失效

现在（完整配置模式）:
Sub-Store ─生成完整配置→ proxies（静态）─引用→ dialer-proxy ✅ 正常
```

---

## 🛠 配置步骤

### 步骤 1: 将模板上传到可访问的 URL

你需要将 `substore_template.yaml` 上传到一个 Sub-Store 能访问的地方：

**选项 A**: GitHub（推荐）
```bash
# 将模板推送到你的 GitHub 仓库
git add config/substore_template.yaml
git commit -m "Add Sub-Store template"
git push

# 使用 raw 链接
# https://raw.githubusercontent.com/holddyxu/clash/main/config/substore_template.yaml
```

**选项 B**: 本地托管（如果 Sub-Store 在同一服务器）
```bash
# 复制到 Sub-Store 可访问的目录
cp substore_template.yaml /path/to/substore/templates/
```

---

### 步骤 2: 在 Sub-Store 创建"文件"

1. 打开 Sub-Store Web 界面
2. 进入 **文件** 页面
3. 点击 **新建**
4. 配置如下：

| 字段 | 值 |
|------|-----|
| **名称** | `Mihomo_Chain_Config` |
| **来源** | 选择你的订阅（已处理链式节点的那个） |
| **目标平台** | `ClashMeta` |
| **配置模板** | 粘贴模板内容 或 输入模板 URL |

#### 配置模板方式：

**方式 A - 直接粘贴**：将 `substore_template.yaml` 的内容粘贴到配置模板框中

**方式 B - 使用 URL**：在模板 URL 中填入：
```
https://raw.githubusercontent.com/holddyxu/clash/main/config/substore_template.yaml
```

5. 保存后，复制生成的**文件下载链接**

---

### 步骤 3: 配置 Mihomo 自动更新

#### 方式 A: 使用 Cron 定时任务（推荐）

在 NAS 或服务器上创建更新脚本：

```bash
#!/bin/bash
# /home/docker/mihomo/update_config.sh

SUBSTORE_URL="https://你的SubStore地址/download/file/Mihomo_Chain_Config"
CONFIG_PATH="/home/docker/mihomo/config.yaml"
BACKUP_PATH="/home/docker/mihomo/config.yaml.bak"

# 备份当前配置
cp "$CONFIG_PATH" "$BACKUP_PATH"

# 下载新配置
if curl -sSL -o "$CONFIG_PATH.new" "$SUBSTORE_URL"; then
    # 验证配置格式
    if /usr/bin/docker exec mihomo /mihomo -t -d /root/.config/mihomo -f /root/.config/mihomo/config.yaml.new 2>/dev/null; then
        mv "$CONFIG_PATH.new" "$CONFIG_PATH"
        docker restart mihomo
        echo "[$(date)] Config updated successfully"
    else
        rm "$CONFIG_PATH.new"
        echo "[$(date)] Config validation failed, keeping old config"
    fi
else
    echo "[$(date)] Failed to download config"
fi
```

设置 Cron：
```bash
# 每 4 小时更新一次
0 */4 * * * /home/docker/mihomo/update_config.sh >> /var/log/mihomo_update.log 2>&1
```

#### 方式 B: Docker Compose 环境变量

如果你的 Mihomo 容器支持，可以直接设置：

```yaml
# docker-compose.yml
services:
  mihomo:
    image: metacubex/mihomo:Alpha
    container_name: mihomo
    volumes:
      - ./config.yaml:/root/.config/mihomo/config.yaml
    environment:
      - SUBSCRIPTION_URL=https://你的SubStore文件链接
    restart: unless-stopped
```

---

## 🔧 模板关键配置说明

### 链式代理组结构

```yaml
# 第一层：线路池（中转节点）
- name: 🚄 日本线路-自动
  type: url-test
  include-all-proxies: true        # ← 从静态 proxies 中筛选
  filter: '(?i)\[Line\].*日本'

# 第二层：链式组（落地节点 + 中转）
- name: 极速日本
  type: select
  include-all-proxies: true
  filter: '(?i)\[Landing\].*日本'
  dialer-proxy: 🚄 日本线路-自动   # ← 关键：指向线路组
```

### 为什么有效？

1. `proxies:` 由 Sub-Store 直接注入，是**静态列表**
2. `include-all-proxies: true` 从静态列表中筛选
3. `dialer-proxy` 引用 proxy-group，而 proxy-group 也基于静态列表
4. 整个引用链都是确定的，不存在动态解析问题

---

## 📝 节点命名规范

为了让过滤器正确工作，你的节点需要遵循命名规范：

| 节点类型 | 命名示例 | 过滤器 |
|---------|---------|--------|
| 线路/中转 | `[Line]JP_Relay-01` | `\[Line\]` |
| 落地 | `[Landing]🇯🇵 日本东京` | `\[Landing\]` |

---

## 🔍 故障排除

### 1. 配置下载失败
```bash
# 测试链接是否可访问
curl -I "https://你的SubStore文件链接"
```

### 2. 配置验证失败
```bash
# 手动验证配置
docker exec mihomo /mihomo -t -f /root/.config/mihomo/config.yaml
```

### 3. 链式代理不工作
```bash
# 检查日志
docker logs mihomo | grep -i "dialer"
```

### 4. 节点未被正确过滤
- 检查节点命名是否包含 `[Line]` 或 `[Landing]`
- 在 Dashboard 中查看策略组内容是否正确

---

## ✅ 验证成功

配置成功后，你应该能在 Mihomo Dashboard 看到：

1. **🚄 日本线路-自动** - 包含所有日本线路节点
2. **极速日本** - 包含日本落地节点，且使用日本线路作为前置代理
3. 流量路径：`你的设备 → 日本线路 → 日本落地 → 目标网站`
