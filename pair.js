const express = require('express');
const router = express.Router();
const { makeid } = require('./id'); // Ensure this module exports the makeid function
const fs = require('fs');
const pino = require('pino');
const { useMultiFileAuthState, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');

// Ensure this module exists for file removal

router.get('/', async (req, res) => {
    const id = makeid(); // Generate a unique ID for the session
    let num = req.query.number; // Get the phone number from the query parameters

    async function GHOST_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);

        try {
            // Create an instance of Black_Castro for handling WhatsApp connection
            let Pair_Code_By_Black_Castro = Black_Castro({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Chrome (MacOs)", "Safari (Ubuntu)", "Chrome (Linux)"]
            });

            // Check if the user is registered
            if (!Pair_Code_By_Black_Castro.authState.creds.registered) {
                await delay(1500); // Wait before sending the pairing code
                num = num.replace(/[^0-9]/g, ''); // Clean the phone number
                const code = await Pair_Code_By_Black_Castro.requestPairingCode(num); // Request the pairing code

                if (!res.headersSent) {
                    await res.send({ code }); // Send the pairing code back to the client
                }
            }

            // Save credentials when they update
            Pair_Code_By_Black_Castro.ev.on('creds.update', saveCreds);

            // Handle connection updates
            Pair_Code_By_Black_Castro.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000); // Wait for a moment after connection is established
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`); // Read credentials from file
                    await delay(800);

                    // Create a unique session ID based on the credentials and generated ID
                    let b64data = "RCD-MD&" + Buffer.from(data).toString('base64').substring(0, 6) + id.substring(0, 2);
                    let session = await Pair_Code_By_Black_Castro.sendMessage(Pair_Code_By_Black_Castro.user.id, { text: '' + b64data });

                    let GHOST_MD_TEXT = `
🪀Support/Contact Developer

⎆Welcome to Classic Bot

⎆Telegram Chat: https://t.me/+hhQQxFUABd81MDM0

⎆WhatsApp Gc1: https://chat.whatsapp.com/EPSGKau0IVi7J5lyOJO7Jk

⎆WhatsApp Number: +254104301695

⎆GitHub: https://github.com/Samue-l1/,`;

                    await Pair_Code_By_Black_Castro.sendMessage(Pair_Code_By_Black_Castro.user.id, { text: GHOST_MD_TEXT }, { quoted: session });

                    await delay(100);
                    await Pair_Code_By_Black_Castro.ws.close(); // Close the WebSocket connection
                    return await removeFile('./temp/' + id); // Clean up the session files
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10000); // Wait before retrying
                    GHOST_MD_PAIR_CODE(); // Retry the pairing process
                }
            });
        } catch (err) {
            console.log("Service Restarted due to an error:", err);
            await removeFile('./temp/' + id); // Clean up the session files
            if (!res.headersSent) {
                await res.send({ code: "Service is Currently Unavailable" }); // Inform the client about the error
            }
        }
    }

    return await GHOST_MD_PAIR_CODE(); // Start the pairing process
});

module.exports = router; // Export the router to be used in server.js
