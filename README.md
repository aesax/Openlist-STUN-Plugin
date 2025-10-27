# 下载劫持代理脚本

## 项目描述

这是一个专为 Openlist Proxy 设计的下载链接劫持脚本，能够将网页中的下载请求自动重定向到内网中的 Openlist 代理服务器，实现下载流量的智能分流。

## 技术原理

- **域名替换**: 将原始下载域名替换为 Openlist 代理服务器地址
- **动态端口**: 通过 STUN 协议获取动态打洞端口
- **多方式劫持**: 支持链接点击、window.open、fetch、XMLHttpRequest 等多种下载方式
- **无缝集成**: 无感替换，用户操作不受影响

## 配置说明

```javascript
const CONFIG = {
    // Openlist 代理服务器地址（要替换的原始域名）
    originalDomain: 'https://your-original-domain.com',
    
    // 目标代理服务器地址（Openlist Proxy 地址）
    targetDomain: 'https://your-openlist-proxy.com',
    
    // STUN 打洞服务的 WebSocket API 地址
    stunApi: 'https://your-stun-server.com/api/stun',
    
    // 调试模式
    debug: true,
    
    // iframe 清理时间（毫秒）
    iframeCleanupTime: 3000
};
```

## 安装和使用

### 基础集成

```html
<script src="download-hijacker.js"></script>
<script>
// 可选：动态更新配置
window.downloadHijacker.updateConfig({
    originalDomain: 'https://your-cdn.com',
    targetDomain: 'https://openlist-proxy.local',
    stunApi: 'https://stun-server.com/api/port'
});
</script>
```

## 应用场景

### 场景1：企业内网下载加速
```javascript
// 配置示例
{
    originalDomain: 'https://public-cdn.com',
    targetDomain: 'https://openlist-proxy.corp.com',
    stunApi: 'https://stun-gateway.corp.com/api/stun'
}
```
**效果**: 企业员工下载公共资源时，自动通过内网 Openlist Proxy 加速

### 场景2：多地域代理分发
```javascript
// 为不同地域配置不同代理
const regionConfigs = {
    'beijing': {
        targetDomain: 'https://openlist-bj.company.com',
        stunApi: 'https://stun-bj.company.com/api/stun'
    },
    'shanghai': {
        targetDomain: 'https://openlist-sh.company.com',
        stunApi: 'https://stun-sh.company.com/api/stun'
    }
};
```

### 场景3：CDN 回源优化
```javascript
{
    originalDomain: 'https://origin-server.com',
    targetDomain: 'https://openlist-edge.com',
    stunApi: 'https://stun-manager.com/api/stun'
}
```
**效果**: 将回源流量通过 Openlist Proxy 优化，减少公网带宽消耗

## 工作流程

1. **检测下载请求**: 监控页面中的所有下载链接和请求
2. **STUN 端口获取**: 向 STUN 服务请求当前可用的打洞端口
3. **URL 重写**: 将原始 URL 的域名和端口替换为代理服务器地址
4. **触发下载**: 通过隐藏 iframe 方式发起下载
5. **自动清理**: 下载完成后清理临时创建的 iframe

## API 参考

### 全局对象
```javascript
window.downloadHijacker
```

### 方法列表

#### `processDownload(url, source)`
手动触发下载处理
```javascript
downloadHijacker.processDownload('https://example.com/file.zip', 'manual');
```

#### `getDynamicPort()`
获取动态端口（Promise）
```javascript
const port = await downloadHijacker.getDynamicPort();
```

#### `buildNewUrl(originalUrl, port)`
构建新的代理 URL
```javascript
const newUrl = downloadHijacker.buildNewUrl('https://example.com/file.zip', '8080');
```

#### `updateConfig(newConfig)`
动态更新配置
```javascript
downloadHijacker.updateConfig({
    debug: false,
    targetDomain: 'https://new-proxy.com'
});
```

#### `isTargetUrl(url)`
检查 URL 是否匹配目标模式
```javascript
const shouldHijack = downloadHijacker.isTargetUrl('https://example.com/file.zip');
```

## 部署要求

### 网络要求
- Openlist Proxy 服务器需支持 STUN 打洞
- STUN 服务需要提供 WebSocket API 接口
- 客户端与代理服务器网络可达

### 服务器配置
```javascript
// STUN API 响应格式要求
{
    "port": 8080,
    // 或
    "data": {
        "port": 8080
    }
}
```

## 故障排除

### 常见问题

1. **下载不触发**
   - 检查 `originalDomain` 配置是否正确
   - 确认 STUN API 可正常访问
   - 查看浏览器控制台错误信息

2. **端口获取失败**
   - 检查 STUN 服务状态
   - 确认网络连接正常
   - 脚本会自动使用备用随机端口

3. **代理连接失败**
   - 确认 Openlist Proxy 服务运行正常
   - 检查防火墙规则
   - 验证域名解析是否正确

### 调试模式
启用调试模式查看详细日志：
```javascript
downloadHijacker.updateConfig({ debug: true });
```

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 许可证

Apache License 2.0


## 注意事项

1. 本脚本仅用于合法的网络优化和流量管理
2. 请确保拥有相关域名的操作权限
3. 在生产环境使用前请充分测试
4. 建议配合 HTTPS 使用以确保安全性

## 技术支持

如有问题请联系开发团队或提交 Issue。
