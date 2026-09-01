/**
 * routes/auth.js
 *
 * This router handles authentication-related operations for hotel staff users.
 * It includes registration and login endpoints and uses parameterized MSSQL queries
 * so that user input is treated as data rather than executable SQL.
 */

"use strict";

/**
 * Import Express so we can create a modular router.
 * Express routers allow us to isolate authentication logic from the main server file.
 */
const express = require("express");

/**
 * Import MSSQL so we can define strongly typed input parameters and execute SQL queries.
 */
const sql = require("mssql");

/**
 * Import the child_process spawn function to run the Python face scanner script.
 */
const { spawn } = require("child_process");
const path = require("path");

/**
 * Create the router instance that will hold authentication endpoints.
 */
const router = express.Router();

/**
 * Helper function that retrieves the globally shared database pool.
 * The pool is created in server.js and attached to the sql module so all routers can reuse it.
 *
 * This function throws a descriptive error if the pool is not available, which helps
 * detect startup or configuration issues early.
 */
function getDatabasePool() {
    if (!sql.globalDatabasePool) {
        throw new Error("Database connection pool has not been initialized.");
    }

    return sql.globalDatabasePool;
}

/**
 * Helper function that sends a consistent JSON error response.
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

/**
 * POST /api/auth/register
 *
 * Purpose:
 * Register a new hotel staff user in the USERS table.
 *
 * Validation flow:
 * 1. Ensure the request body contains the required fields.
 * 2. Verify that the username is not already in use.
 * 3. Insert the new staff record using parameterized inputs.
 *
 * Request body:
 * {
 *   "userName": "admin",
 *   "password": "secret123",
 *   "userRole": "ADMIN"
 * }
 */
router.post("/register", async (request, response) => {
    try {
        /**
         * Extract incoming values from the request body.
         * These values come from the frontend or API consumer.
         */
        const userName = request.body.userName;
        const password = request.body.password;
        const userRole = request.body.userRole || "STAFF";

        /**
         * Validate required inputs before touching the database.
         */
        if (!userName || !password) {
            return sendErrorResponse(response, 400, "User name and password are required.");
        }

        /**
         * Retrieve the shared database pool.
         */
        const databasePool = getDatabasePool();

        /**
         * Check whether the requested username already exists.
         * This prevents duplicate staff accounts and preserves uniqueness.
         */
        const duplicateUserCheck = await databasePool
            .request()
            .input("UserName", sql.NVarChar(100), userName)
            .query(`
                SELECT User_ID
                FROM USERS
                WHERE User_Name = @UserName
            `);

        if (duplicateUserCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "User name already exists.");
        }

        /**
         * Insert the new user into the USERS table.
         *
         * SQL parameter definitions:
         * - @UserName: the staff username string.
         * - @Password: the staff password string.
         * - @UserRole: the assigned role, such as ADMIN or STAFF.
         *
         * Note:
         * In a production environment, passwords should be hashed before storage.
         */
        const insertResult = await databasePool
            .request()
            .input("UserName", sql.NVarChar(100), userName)
            .input("Password", sql.NVarChar(255), password)
            .input("UserRole", sql.NVarChar(50), userRole)
            .query(`
                INSERT INTO USERS (User_Name, Password, User_Role)
                OUTPUT INSERTED.User_ID, INSERTED.User_Name, INSERTED.User_Role
                VALUES (@UserName, @Password, @UserRole)
            `);

        /**
         * Return a successful registration response with the inserted row data.
         */
        return response.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: insertResult.recordset[0]
        });
    } catch (error) {
        /**
         * Any database or runtime error is returned as a server-side failure.
         */
        console.error("Registration error:", error);
        return sendErrorResponse(response, 500, "Failed to register user.");
    }
});

/**
 * POST /api/auth/login
 *
 * Purpose:
 * Validate a staff user's credentials against the USERS table.
 *
 * Request body:
 * {
 *   "userName": "admin",
 *   "password": "secret123"
 * }
 *
 * Authentication flow:
 * 1. Validate input.
 * 2. Search the USERS table for a matching username and password.
 * 3. Return the matched user if credentials are valid.
 */
router.post("/login", async (request, response) => {
    try {
        /**
         * Extract credentials from the request body.
         */
        const userName = request.body.userName;
        const password = request.body.password;

        /**
         * Validate required inputs before querying the database.
         */
        if (!userName || !password) {
            return sendErrorResponse(response, 400, "User name and password are required.");
        }

        /**
         * Retrieve the shared database pool.
         */
        const databasePool = getDatabasePool();

        /**
         * Query for a matching user record.
         *
         * SQL parameter definitions:
         * - @UserName: login identifier.
         * - @Password: supplied password.
         *
         * Important:
         * This example uses plain-text password matching only because the prompt
         * requires validation directly against the USERS table rows.
         * In a real system, password hashing should be added immediately.
         */
        const loginResult = await databasePool
            .request()
            .input("UserName", sql.NVarChar(100), userName)
            .input("Password", sql.NVarChar(255), password)
            .query(`
                SELECT User_ID, User_Name, User_Role
                FROM USERS
                WHERE User_Name = @UserName
                  AND Password = @Password
            `);

        /**
         * If no rows are returned, the credentials are invalid.
         */
        if (loginResult.recordset.length === 0) {
            return sendErrorResponse(response, 401, "Invalid user name or password.");
        }

        /**
         * Return the authenticated user record.
         * A frontend can use this payload to store session information locally.
         */
        return response.status(200).json({
            success: true,
            message: "Login successful.",
            data: loginResult.recordset[0]
        });
    } catch (error) {
        /**
         * Any unhandled database or runtime failure is returned to the client.
         */
        console.error("Login error:", error);
        return sendErrorResponse(response, 500, "Failed to log in.");
    }
});

/**
 * Export the router so server.js can mount it at /api/auth.
 */
/**
 * POST /api/auth/register-face
 *
 * Purpose:
 * Capture a face for a newly registered staff user using the Python OpenCV face scanner,
 * then save the face embedding to the USERS table.
 *
 * Request body:
 * {
 *   "userId": 1
 * }
 */
router.post("/register-face", async (request, response) => {
    try {
        const userId = Number(request.body.userId);

        if (!userId) {
            return sendErrorResponse(response, 400, "Valid user ID is required.");
        }

        const databasePool = getDatabasePool();

        /**
         * Verify the user exists before scanning.
         */
        const userCheck = await databasePool
            .request()
            .input("UserId", sql.Int, userId)
            .query(`SELECT User_ID FROM USERS WHERE User_ID = @UserId`);

        if (userCheck.recordset.length === 0) {
            return sendErrorResponse(response, 404, "User not found.");
        }

        /**
         * Spawn the Python face scanner, passing the userId so it can be used
         * as an identifier in the same way the guest scanner works.
         */
        const pythonCommand = path.join(__dirname, "..", ".venv311", "Scripts", "python.exe");
        const pythonArguments = ["face_scanner.py", String(userId)];

        const pythonProcess = spawn(pythonCommand, pythonArguments, {
            stdio: ["ignore", "pipe", "pipe"],
            cwd: path.join(__dirname, "..")
        });

        let standardOutputBuffer = "";
        let standardErrorBuffer = "";

        pythonProcess.stdout.on("data", (outputChunk) => {
            standardOutputBuffer += outputChunk.toString();
        });

        pythonProcess.stderr.on("data", (errorChunk) => {
            standardErrorBuffer += errorChunk.toString();
        });

        pythonProcess.on("error", (processError) => {
            console.error("Python spawn error:", processError);
            return sendErrorResponse(response, 500, "Failed to start face scanning process.");
        });

        pythonProcess.on("close", async (exitCode) => {
            try {
                if (exitCode !== 0) {
                    console.error("Python process stderr:", standardErrorBuffer);
                    return sendErrorResponse(response, 500, "Face scanner process failed.");
                }

                const scannerResult = JSON.parse(String(standardOutputBuffer || "").trim());

                if (!scannerResult.success) {
                    return response.status(400).json({
                        success: false,
                        message: scannerResult.message || "Face scan did not succeed.",
                        data: scannerResult
                    });
                }

                const faceEmbeddingValue = scannerResult.faceEmbedding || null;

                if (!faceEmbeddingValue) {
                    return sendErrorResponse(response, 500, "Python script did not return a face embedding.");
                }

                /**
                 * Update the user record with the enrollment flag and embedding data.
                 */
                await databasePool
                    .request()
                    .input("UserId", sql.Int, userId)
                    .input("FaceEmbedding", sql.NVarChar(sql.MAX), faceEmbeddingValue)
                    .query(`
                        UPDATE USERS
                        SET
                            Is_Face_Enrolled = 1,
                            Face_Embedding = @FaceEmbedding
                        WHERE User_ID = @UserId
                    `);

                return response.status(200).json({
                    success: true,
                    message: "Face enrollment completed successfully.",
                    data: {
                        userId: userId,
                        faceEmbedding: faceEmbeddingValue
                    }
                });
            } catch (processingError) {
                console.error("Face scan processing error:", processingError);
                console.error("Python stderr output:", standardErrorBuffer);
                return sendErrorResponse(response, 500, "Failed to process face scan results.");
            }
        });
    } catch (error) {
        console.error("Register face route error:", error);
        return sendErrorResponse(response, 500, "Failed to register face.");
    }
});

module.exports = router;