"use strict";

const sql = require("mssql");

/**
 * Retrieve the globally shared database pool.
 * The pool is created in server.js and attached to the sql module
 * so all routers can reuse it.
 *
 * @returns {sql.ConnectionPool}
 * @throws {Error} If the pool has not been initialized yet.
 */
function getDatabasePool() {
    if (!sql.globalDatabasePool) {
        throw new Error("Database connection pool has not been initialized.");
    }
    return sql.globalDatabasePool;
}

/**
 * Send a consistent JSON error response.
 * Keeping this logic centralized makes route handlers easier to read.
 *
 * @param {object} response - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Human-readable error message.
 */
function sendErrorResponse(response, statusCode, message) {
    return response.status(statusCode).json({
        success: false,
        message: message
    });
}

module.exports = {
    getDatabasePool,
    sendErrorResponse
};
