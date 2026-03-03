'use client';
import { useEffect } from 'react';

export default function DIDAgent() {
    useEffect(() => {
        if (document.querySelector('script[data-name="did-agent"]')) return;

        // Перехватываем fetch
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            if (typeof url === 'string') {
                url = url
                    .replace('https://agent.d-id.com/', '/did-proxy/agent/')
                    .replace('https://api.d-id.com/', '/did-proxy/api/');
            }
            return originalFetch.call(this, url, options);
        };

        // Перехватываем WebSocket
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
            if (typeof url === 'string') {
                url = url
                    .replace('wss://agent.d-id.com/', 'wss://avatars.labskit.ru/did-proxy/agent/')
                    .replace('wss://api.d-id.com/', 'wss://avatars.labskit.ru/did-proxy/api/');
            }
            return new OriginalWebSocket(url, protocols);
        };
        Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);

        const script = document.createElement('script');
        script.type = 'module';
        script.src = '/did-sdk/v2/index.js';
        script.setAttribute('data-mode', 'full');
        script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcwNzg4NzgxMDI0ODU2Nzc4Mjc6RnBkelluWlEzREJKTE1JZjZIa3V5');
        script.setAttribute('data-agent-id', 'v2_agt_ODP2-9pe');
        script.setAttribute('data-name', 'did-agent');
        script.setAttribute('data-monitor', 'true');
        script.setAttribute('data-target-id', 'wrapper-id');
        document.body.appendChild(script);

        return () => {
            document.querySelector('script[data-name="did-agent"]')?.remove();
            window.fetch = originalFetch;
            window.WebSocket = OriginalWebSocket;
        };
    }, []);

    return null;
}