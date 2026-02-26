'use client';

import { useEffect } from 'react';

export default function DIDAgent() {
    useEffect(() => {
        // Проверяем, не загружен ли скрипт уже
        if (document.querySelector('script[data-name="did-agent"]')) return;

        const script = document.createElement('script');
        script.type = 'module';
        script.src = 'https://agent.d-id.com/v2/index.js';
        script.setAttribute('data-mode', 'full');
        script.setAttribute('data-client-key', 'Z29vZ2xlLW9hdXRoMnwxMDcwNzg4NzgxMDI0ODU2Nzc4Mjc6RnBkelluWlEzREJKTE1JZjZIa3V5');
        script.setAttribute('data-agent-id', 'v2_agt_ODP2-9pe');
        script.setAttribute('data-name', 'did-agent');
        script.setAttribute('data-monitor', 'true');
        script.setAttribute('data-target-id', 'wrapper-id');

        document.body.appendChild(script);

        return () => {
            // Чистим при размонтировании компонента
            const existing = document.querySelector('script[data-name="did-agent"]');
            if (existing) existing.remove();
        };
    }, []);

    return (
        <div id="wrapper-id" style={{ width: '100%', height: '100%' }} />
    );
}