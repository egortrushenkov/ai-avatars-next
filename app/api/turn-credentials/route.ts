import { createHmac } from 'crypto';
import { NextResponse } from 'next/server';

// Standard coturn static-auth-secret HMAC-SHA1 algorithm:
// username = "<unix_timestamp_expiry>:<optional_user_id>"
// password = base64(HMAC-SHA1(TURN_SECRET, username))

const TURN_SECRET = process.env.TURN_SECRET!;
const TURN_HOST = process.env.TURN_HOST!;
const TURN_PORT = process.env.TURN_PORT ?? '8443';
const TTL = 24 * 3600; // credentials valid 24 hours

export async function GET() {
    if (!TURN_SECRET || !TURN_HOST) {
        return NextResponse.json(
            { error: 'TURN server not configured' },
            { status: 500 }
        );
    }

    const expiry = Math.floor(Date.now() / 1000) + TTL;
    const username = `${expiry}:diduser`;
    const password = createHmac('sha1', TURN_SECRET)
        .update(username)
        .digest('base64');

    const iceServers = [
        {
            // TURNS over TLS port 8443 — выглядит как HTTPS, низкая вероятность блокировки
            urls: `turns:${TURN_HOST}:${TURN_PORT}?transport=tcp`,
            username,
            credential: password,
        },
        {
            // Fallback: стандартный TURN/UDP (если TCP-443-подобный заблокирован)
            urls: `turn:${TURN_HOST}:3478?transport=udp`,
            username,
            credential: password,
        },
    ];

    return NextResponse.json({ iceServers });
}
