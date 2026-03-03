'use client';
import { useEffect, useRef } from 'react';

export default function DIDAgent() {
    const managerRef = useRef<any>(null);

    useEffect(() => {
        let agentManager: any;

        async function init() {
            const sdk = await import('@d-id/client-sdk');

            agentManager = await sdk.createAgentManager('v2_agt_ODP2-9pe', {
            auth: {
                type: 'key',
                clientKey: 'Z29vZ2xlLW9hdXRoMnwxMDcwNzg4NzgxMDI0ODU2Nzc4Mjc6RnBkelluWlEzREJKTE1JZjZIa3V5'
            },
            baseURL: 'https://avatars.labskit.ru/did-proxy/api',
            wsURL: 'wss://avatars.labskit.ru/did-proxy/agent',
            callbacks: {
                onSrcObjectReady(value: MediaStream) {
                    const video = document.querySelector('#did-video') as HTMLVideoElement;
                    if (video) video.srcObject = value;
                },
                onConnectionStateChange(state) {
                    console.log('Connection state:', state);
                },
                onVideoStateChange(state) {
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
            managerRef.current?.disconnect?.();
        };
    }, []);

    return (
        <div id="wrapper-id">
            <video id="did-video" autoPlay playsInline />
        </div>
    );
}