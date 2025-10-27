// download-hijacker.js
// 增强版下载链接劫持脚本
// 由 unsiao 开发
// 遵循 Apache 2.0 许可证

(function() {
    'use strict';
    
    console.log('🔧 下载劫持脚本开始加载...');
    
    // 配置设置
    const CONFIG = {
        originalDomain: 'https://demo.com',
        targetDomain: 'https://down.demo.com',
        stunApi: 'https://stun.demo.com/api/stun',
        debug: true,
        iframeCleanupTime: 3000
    };
    
    // 工具函数
    const utils = {
        // 调试日志
        log(message, data = null) {
            if (CONFIG.debug) {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`%c[${timestamp}] ${message}`, 'color: #3498db; font-weight: bold;', data || '');
            }
        },
        
        // 错误日志
        error(message, error = null) {
            const timestamp = new Date().toLocaleTimeString();
            console.error(`%c[${timestamp}] ❌ ${message}`, 'color: #e74c3c; font-weight: bold;', error || '');
        },
        
        // 检查URL是否匹配目标模式
        isTargetUrl(url) {
            if (!url || typeof url !== 'string') return false;
            return [CONFIG.originalDomain, 'demo.com'].some(pattern => url.includes(pattern));
        },
        
        // 生成备用端口
        generateFallbackPort() {
            return Math.floor(Math.random() * 5000) + 2000;
        }
    };
    
    // 端口管理
    const portManager = {
        // 获取动态端口
        async getDynamicPort() {
            try {
                utils.log('🔄 正在请求动态端口...');
                
                const response = await fetch(CONFIG.stunApi, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                const port = data?.port || data?.data?.port;
                
                if (!port) throw new Error('响应中未找到端口信息');
                
                utils.log(`✅ 获取到端口: ${port}`);
                return port.toString();
                
            } catch (error) {
                utils.error('获取端口失败', error);
                const fallbackPort = utils.generateFallbackPort();
                utils.log(`🔄 使用备用端口: ${fallbackPort}`);
                return fallbackPort.toString();
            }
        }
    };
    
    // URL处理器
    const urlProcessor = {
        // 构建新的下载URL
        buildNewUrl(originalUrl, port) {
            if (!port) return originalUrl;
            
            try {
                const urlObj = new URL(originalUrl);
                
                // 替换域名
                if (CONFIG.targetDomain) {
                    const targetUrl = new URL(CONFIG.targetDomain);
                    urlObj.hostname = targetUrl.hostname;
                    urlObj.protocol = targetUrl.protocol;
                }
                
                // 替换端口
                urlObj.port = port;
                const newUrl = urlObj.toString();
                
                utils.log('🔗 URL重写完成', { 
                    original: originalUrl, 
                    new: newUrl,
                    replacedDomain: CONFIG.targetDomain,
                    replacedPort: port
                });
                
                return newUrl;
                
            } catch (error) {
                utils.error('URL解析失败', error);
                return originalUrl;
            }
        }
    };
    
    // 下载处理器
    const downloadHandler = {
        // 处理下载请求
        async processDownload(originalUrl, source = 'unknown') {
            utils.log(`🎯 检测到下载请求 (来源: ${source})`, originalUrl);
            
            if (!utils.isTargetUrl(originalUrl)) {
                utils.log('⏭️ 非目标URL，跳过处理');
                return false;
            }
            
            try {
                const port = await portManager.getDynamicPort();
                const newUrl = urlProcessor.buildNewUrl(originalUrl, port);
                
                this.triggerDownload(newUrl);
                utils.log('✅ 下载已触发', newUrl);
                return true;
                
            } catch (error) {
                utils.error('下载处理失败', error);
                return false;
            }
        },
        
        // 触发下载
        triggerDownload(url) {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            
            // 清理iframe
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                    utils.log('🧹 清理下载iframe');
                }
            }, CONFIG.iframeCleanupTime);
        }
    };
    
    // 劫持方法
    const hijackMethods = {
        // 劫持链接点击事件
        linkClicks() {
            document.addEventListener('click', (e) => {
                let target = e.target;
                
                while (target && target !== document) {
                    if (target.tagName === 'A' && target.href && utils.isTargetUrl(target.href)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        utils.log('🚫 阻止默认行为，开始处理下载', target.href);
                        downloadHandler.processDownload(target.href, 'link_click');
                        return;
                    }
                    target = target.parentElement;
                }
            }, true);
        },
        
        // 劫持window.open
        windowOpen() {
            const originalOpen = window.open;
            window.open = function(url, name, features) {
                if (url && utils.isTargetUrl(url)) {
                    utils.log('🪟 拦截window.open调用', url);
                    downloadHandler.processDownload(url, 'window_open');
                    return null;
                }
                return originalOpen.call(this, url, name, features);
            };
        },
        
        // 劫持动态创建的链接
        dynamicLinks() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        
                        // 检查新添加的链接
                        const links = node.querySelectorAll?.('a[href*="demo.com"]') || [];
                        links.forEach(link => this.setupLinkListener(link));
                        
                        // 检查节点本身是否是链接
                        if (node.tagName === 'A' && node.href && utils.isTargetUrl(node.href)) {
                            this.setupLinkListener(node);
                        }
                    });
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        },
        
        // 设置链接监听器
        setupLinkListener(link) {
            utils.log('🔍 发现动态创建的链接', link.href);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                downloadHandler.processDownload(link.href, 'dynamic_link');
            });
        },
        
        // 劫持fetch请求
        fetchRequests() {
            const originalFetch = window.fetch;
            window.fetch = function(resource, options) {
                const url = typeof resource === 'string' ? resource : resource.url;
                
                if (url && utils.isTargetUrl(url)) {
                    utils.log('🌐 拦截fetch请求', url);
                    return downloadHandler.processDownload(url, 'fetch')
                        .then(() => new Response(null, { status: 200 }))
                        .catch(() => originalFetch.call(this, resource, options));
                }
                
                return originalFetch.call(this, resource, options);
            };
        },
        
        // 劫持XMLHttpRequest
        xmlHttpRequests() {
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                if (url && utils.isTargetUrl(url)) {
                    utils.log('📡 拦截XMLHttpRequest请求', url);
                    downloadHandler.processDownload(url, 'xhr')
                        .then(() => {
                            // 模拟成功响应
                            this.status = 200;
                            this.statusText = 'OK';
                            this.readyState = 4;
                            this.onreadystatechange?.();
                        })
                        .catch(() => {
                            // 如果劫持失败，继续原始请求
                            originalOpen.call(this, method, url, async, user, password);
                        });
                    return;
                }
                
                originalOpen.call(this, method, url, async, user, password);
            };
        }
    };
    
    // 初始化函数
    function initialize() {
        utils.log('🚀 初始化下载链接劫持...');
        utils.log('📋 配置信息', CONFIG);
        
        // 应用所有劫持方法
        Object.values(hijackMethods).forEach(method => method());
        
        // 设置现有链接
        setupExistingLinks();
        utils.log('✅ 下载链接劫持已激活');
    }
    
    // 设置现有链接监听
    function setupExistingLinks() {
        const existingLinks = document.querySelectorAll('a[href*="demo.com"]');
        utils.log(`📊 发现 ${existingLinks.length} 个目标链接`);
        
        existingLinks.forEach((link, index) => {
            utils.log(`🔗 目标链接 ${index + 1}:`, link.href);
            
            link.addEventListener('click', (e) => {
                if (utils.isTargetUrl(link.href)) {
                    e.preventDefault();
                    downloadHandler.processDownload(link.href, 'existing_link');
                }
            });
        });
    }
    
    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // 暴露到全局用于测试和配置
    window.downloadHijacker = {
        isTargetUrl: utils.isTargetUrl,
        processDownload: downloadHandler.processDownload,
        getDynamicPort: portManager.getDynamicPort,
        buildNewUrl: urlProcessor.buildNewUrl,
        CONFIG,
        // 动态更新配置的方法
        updateConfig(newConfig) {
            Object.assign(CONFIG, newConfig);
            utils.log('⚙️ 配置已更新', CONFIG);
        }
    };
    
})();
