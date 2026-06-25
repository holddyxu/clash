function operator(proxies = [], targetPlatform, context) {
  if (!Array.isArray(proxies)) {
    return proxies; // 如果不是数组，直接返回
  }

  const processedProxies = [];
  const otherProxies = [];

  for (const proxy of proxies) {
    if (proxy && typeof proxy === 'object' && proxy.name) {
      // 删除节点名称最后一个 - 及其后内容
      if (proxy.name.includes('-')) {
        const parts = proxy.name.split('-');
        if (parts.length > 1) {
          proxy.name = parts.slice(0, -1).join('-');
        }
      }

      // 如果节点名称包含 "中转加速" 或 "Claw 中转"：
      if (proxy.name.includes("中转加速") || proxy.name.includes("Claw 中转")) {
        // 修改 server 字段
        if (proxy.server) {
          proxy.server = "relayhk.example.com";
        }

        // 删除 "中转加速" 或 "Claw 中转"
        proxy.name = proxy.name.replace("中转加速", "").replace("Claw 中转", "").trim();

        // 在节点名称最后面添加 "🚀" emoji
        proxy.name = proxy.name + " 🚀";
      }

      // 如果节点名称包含 "Claw加速"：
      if (proxy.name.includes("Claw加速")) {
        // 修改 server 字段
        if (proxy.server) {
          proxy.server = "relayjp.example.com";
        }
        // 在节点名称最后面添加 "🚀" emoji
        proxy.name = proxy.name + " 🚀";
      }

      // 将处理后的节点放入不同的数组
      if (proxy.name.endsWith("🚀")) {
        processedProxies.push(proxy);
      } else {
        otherProxies.push(proxy);
      }
    }
  }

  // 随机排列 otherProxies
  for (let i = otherProxies.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [otherProxies[i], otherProxies[j]] = [otherProxies[j], otherProxies[i]];
  }

  // 将以 "🚀" 结尾的节点放在前面，然后是随机排列的其他节点
  return [...processedProxies, ...otherProxies];
}
