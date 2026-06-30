// Cached SQL connection pool, shared across all invocations on a warm instance.
//
// The v3 functions opened a fresh connection and called pool.close() on every
// request. Under load that both wastes connection setup time and risks one
// request closing the pool while another is mid-query. Here we build the pool
// once per process and reuse it. If the pool emits an error we drop the cached
// promise so the next call transparently rebuilds it.

const sql = require('mssql');

let poolPromise;

function getPool() {
    if (!poolPromise) {
        const pool = new sql.ConnectionPool(process.env.SQL_CONN_STRING);

        pool.on('error', (err) => {
            console.error('SQL pool error, dropping cached pool:', err);
            poolPromise = undefined;
        });

        poolPromise = pool.connect().catch((err) => {
            poolPromise = undefined; // allow a retry on the next invocation
            throw err;
        });
    }
    return poolPromise;
}

module.exports = { sql, getPool };
