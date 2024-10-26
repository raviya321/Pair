const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const id = makeid();
const fs = require('fs');
const pino = require('pino');
const {
    default: makeWASocket,
    Browsers,
    delay,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    PHONENUMBER_MCC,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const NodeCache = require("node-cache");
const chalk = require("chalk");

let phoneNumber = "923231371782";
const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code");

async function qr() {
    let { version, isLatest } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState('./session/' + id);
    const msgRetryCounterCache = new NodeCache();

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: !pairingCode,
        browser: Browsers.windows('Firefox'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
        },
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        msgRetryCounterCache,
        defaultQueryTimeoutMs: undefined,
    });

    sock.ev.on("connection.update", async (s) => {
        const { connection, lastDisconnect } = s;
        if (connection === "open") {
            await delay(1000 * 10);
            try {
                // Upload session data to Pastebin and retrieve the unique identifier
                const output = await pastebin.createPasteFromFile(__dirname + `/session/${id}/creds.json`, "Session ID", null, 1, "N");
                
                // Extract Pastebin ID from the URL (e.g., pastebin.com/XXXX)
                const pastebinId = output.split('/').pop();
                
                // Format session ID with "RCD-MD&" prefix and the Pastebin ID
                const sessionId = `RCD-MD&${pastebinId}`;
                
                // Send the session ID to the user on WhatsApp
                const ethix = await sock.sendMessage(sock.user.id, { text: sessionId });
                
                // Additional notification for the user
                await sock.sendMessage(sock.user.id, { text: `> ❌ DO NOT SHARE THIS SESSION-ID WITH ANYBODY RCD MD` }, { quoted: ethix });
                
                await delay(1000 * 2);
                process.exit(0);
            } catch (error) {
                console.error("Error uploading session to Pastebin:", error);
                await sock.sendMessage(sock.user.id, { text: "Failed to generate session ID. Please try again later." });
            }
        }
        
        if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
            qr();
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on("messages.upsert", () => { });
}

qr();

process.on('uncaughtException', function (err) {
    let e = String(err);
    const ignoredErrors = ["conflict", "not-authorized", "Socket connection timeout", "rate-overlimit", "Connection Closed", "Timed Out", "Value not found"];
    if (!ignoredErrors.some(errorText => e.includes(errorText))) {
        console.log('Caught exception: ', err);
    }
});
