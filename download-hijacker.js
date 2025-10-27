// download-hijacker.js
// Enhanced Download Link Hijacking Script
// Developed by unsiao
// Licensed under Apache License 2.0

(function() {
    'use strict';
    
    console.log('🔧 Download hijacker loading...');
    
    // Configuration
    const CONFIG = {
        originalDomain: 'https://demo.com',
        targetDomain: 'https://down.demo.com',
        stunApi: 'https://stun.demo.com/api/stun',
        debug: true,
        iframeCleanupTime: 3000
    };
    
    // Utility functions
    const utils = {
        log(message, data = null) {
            if (CONFIG.debug) {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`%c[${timestamp}] ${message}`, 'color: #3498db; font-weight: bold;', data || '');
            }
        },
        
        error(message, error = null) {
            const timestamp = new Date().toLocaleTimeString();
            console.error(`%c[${timestamp}] ❌ ${message}`, 'color: #e74c3c; font-weight: bold;', error || '');
        },
        
        isTargetUrl(url) {
            if (!url || typeof url !== 'string') return false;
            return [CONFIG.originalDomain, 'demo.com'].some(pattern => url.includes(pattern));
        },
        
        generateFallbackPort() {
            return Math.floor(Math.random() * 5000) + 2000;
        }
    };
    
    // Port management
    const portManager = {
        async getDynamicPort() {
            try {
                utils.log('🔄 Requesting dynamic port...');
                
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
                
                if (!port) throw new Error('No port information found in response');
                
                utils.log(`✅ Port acquired: ${port}`);
                return port.toString();
                
            } catch (error) {
                utils.error('Port acquisition failed', error);
                const fallbackPort = utils.generateFallbackPort();
                utils.log(`🔄 Using fallback port: ${fallbackPort}`);
                return fallbackPort.toString();
            }
        }
    };
    
    // URL processing
    const urlProcessor = {
        buildNewUrl(originalUrl, port) {
            if (!port) return originalUrl;
            
            try {
                const urlObj = new URL(originalUrl);
                
                if (CONFIG.targetDomain) {
                    const targetUrl = new URL(CONFIG.targetDomain);
                    urlObj.hostname = targetUrl.hostname;
                    urlObj.protocol = targetUrl.protocol;
                }
                
                urlObj.port = port;
                const newUrl = urlObj.toString();
                
                utils.log('🔗 URL rewrite completed', { 
                    original: originalUrl, 
                    new: newUrl,
                    replacedDomain: CONFIG.targetDomain,
                    replacedPort: port
                });
                
                return newUrl;
                
            } catch (error) {
                utils.error('URL parsing failed', error);
                return originalUrl;
            }
        }
    };
    
    // Download handler
    const downloadHandler = {
        async processDownload(originalUrl, source = 'unknown') {
            utils.log(`🎯 Download request detected (source: ${source})`, originalUrl);
            
            if (!utils.isTargetUrl(originalUrl)) {
                utils.log('⏭️ Non-target URL, skipping');
                return false;
            }
            
            try {
                const port = await portManager.getDynamicPort();
                const newUrl = urlProcessor.buildNewUrl(originalUrl, port);
                
                this.triggerDownload(newUrl);
                utils.log('✅ Download triggered', newUrl);
                return true;
                
            } catch (error) {
                utils.error('Download processing failed', error);
                return false;
            }
        },
        
        triggerDownload(url) {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            document.body.appendChild(iframe);
            
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                    utils.log('🧹 Download iframe cleaned up');
                }
            }, CONFIG.iframeCleanupTime);
        }
    };
    
    // Hijacking methods
    const hijackMethods = {
        linkClicks() {
            document.addEventListener('click', (e) => {
                let target = e.target;
                
                while (target && target !== document) {
                    if (target.tagName === 'A' && target.href && utils.isTargetUrl(target.href)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        utils.log('🚫 Default behavior prevented, processing download', target.href);
                        downloadHandler.processDownload(target.href, 'link_click');
                        return;
                    }
                    target = target.parentElement;
                }
            }, true);
        },
        
        windowOpen() {
            const originalOpen = window.open;
            window.open = function(url, name, features) {
                if (url && utils.isTargetUrl(url)) {
                    utils.log('🪟 window.open call intercepted', url);
                    downloadHandler.processDownload(url, 'window_open');
                    return null;
                }
                return originalOpen.call(this, url, name, features);
            };
        },
        
        dynamicLinks() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType !== 1) return;
                        
                        // Check newly added links
                        const links = node.querySelectorAll?.('a[href*="demo.com"]') || [];
                        links.forEach(link => this.setupLinkListener(link));
                        
                        // Check if node itself is a link
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
        
        setupLinkListener(link) {
            utils.log('🔍 Dynamic link detected', link.href);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                downloadHandler.processDownload(link.href, 'dynamic_link');
            });
        },
        
        fetchRequests() {
            const originalFetch = window.fetch;
            window.fetch = function(resource, options) {
                const url = typeof resource === 'string' ? resource : resource.url;
                
                if (url && utils.isTargetUrl(url)) {
                    utils.log('🌐 Fetch request intercepted', url);
                    return downloadHandler.processDownload(url, 'fetch')
                        .then(() => new Response(null, { status: 200 }))
                        .catch(() => originalFetch.call(this, resource, options));
                }
                
                return originalFetch.call(this, resource, options);
            };
        },
        
        xmlHttpRequests() {
            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
                if (url && utils.isTargetUrl(url)) {
                    utils.log('📡 XMLHttpRequest intercepted', url);
                    downloadHandler.processDownload(url, 'xhr')
                        .then(() => {
                            this.status = 200;
                            this.statusText = 'OK';
                            this.readyState = 4;
                            this.onreadystatechange?.();
                        })
                        .catch(() => {
                            originalOpen.call(this, method, url, async, user, password);
                        });
                    return;
                }
                
                originalOpen.call(this, method, url, async, user, password);
            };
        }
    };
    
    // Initialization
    function initialize() {
        utils.log('🚀 Initializing download link hijacking...');
        utils.log('📋 Configuration', CONFIG);
        
        // Apply all hijacking methods
        Object.values(hijackMethods).forEach(method => method());
        
        // Setup existing links
        setupExistingLinks();
        utils.log('✅ Download link hijacking activated');
    }
    
    function setupExistingLinks() {
        const existingLinks = document.querySelectorAll('a[href*="demo.com"]');
        utils.log(`📊 Found ${existingLinks.length} target links`);
        
        existingLinks.forEach((link, index) => {
            utils.log(`🔗 Target link ${index + 1}:`, link.href);
            
            link.addEventListener('click', (e) => {
                if (utils.isTargetUrl(link.href)) {
                    e.preventDefault();
                    downloadHandler.processDownload(link.href, 'existing_link');
                }
            });
        });
    }
    
    // Start script
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    // Global exposure for testing and configuration
    window.downloadHijacker = {
        isTargetUrl: utils.isTargetUrl,
        processDownload: downloadHandler.processDownload,
        getDynamicPort: portManager.getDynamicPort,
        buildNewUrl: urlProcessor.buildNewUrl,
        CONFIG,
        updateConfig(newConfig) {
            Object.assign(CONFIG, newConfig);
            utils.log('⚙️ Configuration updated', CONFIG);
        }
    };
    
})();
