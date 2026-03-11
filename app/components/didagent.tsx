'use client';
import { useEffect, useRef } from 'react';

interface IceServer {
    urls: string;
    username: string;
    credential: string;
}

async function fetchTurnCredentials(): Promise<IceServer[]> {
    const res = await fetch('/api/turn-credentials');
    if (!res.ok) return [];
    const { iceServers } = await res.json();
    return iceServers ?? [];
}

/**
 * Патчим глобальный RTCPeerConnection до загрузки D-ID SDK.
 * SDK не поддерживает передачу iceServers через streamOptions,
 * поэтому перехватываем создание PeerConnection на уровне браузера.
 */
function patchRTCPeerConnection(turnServers: IceServer[]) {
    if (typeof window === 'undefined' || turnServers.length === 0) return;

    const OrigRTC = window.RTCPeerConnection;

    // Не патчим повторно
    if ((OrigRTC as any).__patched) return;

    function PatchedRTC(config?: RTCConfiguration) {
        const patched: RTCConfiguration = {
            ...config,
            iceServers: [
                ...turnServers,
                ...(config?.iceServers ?? []),
            ],
            // Только relay — весь медиатрафик идёт через наш TURN в NL,
            // IP-адреса D-ID никогда не достигают клиента
            iceTransportPolicy: 'relay',
        };
        return new OrigRTC(patched);
    }

    PatchedRTC.prototype = OrigRTC.prototype;
    (PatchedRTC as any).__patched = true;

    // Копируем статические методы (generateCertificate и др.)
    Object.setPrototypeOf(PatchedRTC, OrigRTC);

    window.RTCPeerConnection = PatchedRTC as unknown as typeof RTCPeerConnection;
}

function unpatchRTCPeerConnection() {
    if (typeof window === 'undefined') return;
    const current = window.RTCPeerConnection as any;
    if (current.__patched && current.__original) {
        window.RTCPeerConnection = current.__original;
    }
}

export default function DIDAgent() {
    const managerRef = useRef<any>(null);

    useEffect(() => {
        let cancelled = false;

        async function init() {
            // 1. Получаем временные TURN credentials с нашего сервера
            const turnServers = await fetchTurnCredentials();

            if (cancelled) return;

            // 2. Патчим RTCPeerConnection ДО загрузки SDK
            patchRTCPeerConnection(turnServers);

            // 3. Инициализируем D-ID SDK — он подхватит пропатченный RTCPeerConnection
            const sdk = await import('@d-id/client-sdk');

            if (cancelled) return;

            const agentManager = await sdk.createAgentManager('v2_agt_ODP2-9pe', {
                auth: {
                    type: 'key',
                    clientKey: 'Z29vZ2xlLW9hdXRoMnwxMDcwNzg4NzgxMDI0ODU2Nzc4Mjc6RnBkelluWlEzREJKTE1JZjZIa3V5'
                },
                baseURL: 'https://avatars.labskit.ru/did-proxy/api',
                wsURL: 'wss://avatars.labskit.ru/did-proxy/agent',
                callbacks: {
                    onSrcObjectReady(value: MediaStream) {
                        const video = document.querySelector('video') as HTMLVideoElement;
                        if (video) video.srcObject = value;
                    },
                    onConnectionStateChange(state: any) {
                        console.log('Connection state:', state);
                    },
                    onVideoStateChange(state: any) {
                        console.log('Video state:', state);
                    }
                },
                streamOptions: {
                    compatibilityMode: 'auto',
                    streamWarmup: true
                }
            });

            managerRef.current = agentManager;
            await agentManager.connect();
        }

        init().catch(console.error);

        return () => {
            cancelled = true;
            managerRef.current?.disconnect?.();
            unpatchRTCPeerConnection();
        };
    }, []);

    return null;
}
