// Cached SQL connection pool with resume-aware retry, shared across all
// invocations on a warm instance.
//
// Two problems this solves:
//  1) The v3 functions opened and closed a fresh connection every request.
//     We build the pool once per process and reuse it (rebuilding on error).
//  2) The Azure SQL database is on the serverless tier and pauses after idle
//     time. The first connection while it resumes fails for ~30-60s with error
//     40613 ("not currently available"). Instead of surfacing that error to the
//     user (who then has to refresh), we retry the connection until the database
//     is back, so the first load succeeds on its own, just a little slower.

const sql = require('mssql');

let poolPromise;

// Transient SQL error numbers that mean "try again shortly" (resume, throttle,
// failover), per Azure SQL transient-fault guidance.
const TRANSIENT_ERRORS = [40613, 40197, 40501, 49918, 49919, 49920, 4060, 10928, 10929, 233];
const MAX_ATTEMPTS = 10;
const RETRY_DELAY_MS = 5000; // up to ~50s of retrying while the DB resumes

function isTransient(err) {
    const num = Number(err && (err.number ?? err.code));
    const msg = (err && err.message) || '';
    return TRANSIENT_ERRORS.includes(num)
        || /not currently available|is paused|resuming|connection is broken|timeout/i.test(msg);
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
    let lastErr;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const pool = new sql.ConnectionPool(process.env.SQL_CONN_STRING);
            pool.on('error', (err) => {
                console.error('SQL pool error, dropping cached pool:', err);
                poolPromise = undefined;
            });
            return await pool.connect();
        } catch (err) {
            lastErr = err;
            if (!isTransient(err) || attempt === MAX_ATTEMPTS) {
                break;
            }
            console.warn(`SQL connect attempt ${attempt} failed (${err.number || err.code || err.message}); database may be resuming, retrying in ${RETRY_DELAY_MS}ms`);
            await delay(RETRY_DELAY_MS);
        }
    }
    throw lastErr;
}

function getPool() {
    if (!poolPromise) {
        poolPromise = connectWithRetry().catch((err) => {
            poolPromise = undefined; // allow a fresh attempt on the next invocation
            throw err;
        });
    }
    return poolPromise;
}

module.exports = { sql, getPool };
