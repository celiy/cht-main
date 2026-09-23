import net from "node:net";

const MAX_PORT_TRIES = 50;

/**
 * Finds the next TCP port that can be bound on 127.0.0.1.
 *
 * @param {number} startPort First port to try
 * @param {number[]} [reserved] Ports that must not be returned
 * @returns {Promise<number>}
 */
export function findFreePort(startPort, reserved = []) {
    const reservedSet = new Set(reserved);
    let port = startPort;
    let attempts = 0;

    const tryListen = () =>
        new Promise((resolve, reject) => {
            if (attempts >= MAX_PORT_TRIES) {
                reject(
                    new Error(
                        `[ports] No free TCP port found after ${MAX_PORT_TRIES} tries (from ${startPort}).`
                    )
                );

                return;
            }

            attempts += 1;

            if (reservedSet.has(port)) {
                port += 1;
                tryListen().then(resolve, reject);

                return;
            }

            const server = net.createServer();

            server.unref();

            server.on("error", (err) => {
                if (err && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
                    port += 1;
                    tryListen().then(resolve, reject);

                    return;
                }

                reject(err);
            });

            server.listen(port, "127.0.0.1", () => {
                const address = server.address();
                const found =
                    address && typeof address === "object" ? address.port : port;

                server.close((closeErr) => {
                    if (closeErr) {
                        reject(closeErr);

                        return;
                    }

                    resolve(found);
                });
            });
        });

    return tryListen();
}
