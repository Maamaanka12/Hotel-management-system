/**
 * routes/faceid.js
 *
 * This router provides the face enrollment API endpoint used by the frontend.
 * It accepts a guest ID, launches a Python OpenCV script, collects the script's
 * stdout stream, parses the final JSON response, and writes the face embedding
 * back to the GUESTS table if the scan succeeds.
 *
 * Endpoint:
 * - POST /api/guests/scan-face
 *
 * Data flow:
 * 1. Client sends guestId in JSON body.
 * 2. Node.js spawns face_scanner.py with guestId as a command-line argument.
 * 3. Python captures the webcam and prints a JSON string to stdout.
 * 4. Node.js buffers stdout, parses the JSON payload after process exit.
 * 5. If success is true, Node.js updates GUESTS.Is_Face_Enrolled and Face_Embedding.
 */

"use strict";

/**
 * Import Express to define a modular API router.
 */
const express = require("express");

/**
 * Import MSSQL to execute parameterized updates against the shared connection pool.
 */
const sql = require("mssql");

/**
 * Import the child_process spawn function to run the Python face scanner script.
 */
const { spawn } = require("child_process");

/**
 * Create the router instance.
 */
const router = express.Router();



const path = require("path");



// const pythonProcess = spawn(pythonCommand, pythonArguments, {
//     stdio: ["ignore", "pipe", "pipe"],
//     cwd: path.join(__dirname, "..")   // points to backend/
// });





/**
 * Get the shared MSSQL pool initialized in server.js.
 *
 * @returns {sql.ConnectionPool}
 * @throws {Error} If the database pool is not available.
 */
function getDatabasePool() {
    if (!sql.globalDatabasePool) {
        throw new Error("Database connection pool has not been initialized.");
    }

    return sql.globalDatabasePool;
}

/**
 * Send a standard JSON error response.
 *
 * @param {object} response - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - Error message.
 */
function sendErrorResponse(response, statusCode, message) {
    return response.status(statusCode).json({
        success: false,
        message: message
    });
}

/**
 * Safely parse JSON from a buffered stdout string.
 * The Python script is expected to print exactly one JSON object at the end.
 *
 * @param {string} outputText - Raw stdout collected from the Python process.
 * @returns {object} Parsed JSON object.
 * @throws {Error} If parsing fails.
 */
function parseScannerOutput(outputText) {
    const trimmedOutput = String(outputText || "").trim();
    return JSON.parse(trimmedOutput);
}

/**
 * POST /api/guests/scan-face
 *
 * Purpose:
 * Trigger the external Python OpenCV face scanner for a specific guest and,
 * when the scan succeeds, persist the returned face vector in the database.
 *
 * Request body:
 * {
 *   "guestId": 1
 * }
 *
 * Python invocation:
 * python face_scanner.py [guestId]
 *
 * Expected Python stdout:
 * {
 *   "success": true,
 *   "faceEmbedding": "[0.1, 0.2, ...]"
 * }
 *
 * Database update on success:
 * - Is_Face_Enrolled = 1
 * - Face_Embedding = returned vector string
 */
router.post("/guests/scan-face", async (request, response) => {
    try {
        const guestId = Number(request.body.guestId);

        if (!guestId) {
            return sendErrorResponse(response, 400, "Valid guest ID is required.");
        }

        /**
         * Build the child process command and arguments.
         * The guest ID is passed as a command-line argument to the Python script.
         */
        const pythonCommand = path.join(__dirname, "..", ".venv311", "Scripts", "python.exe");
        const pythonArguments = ["face_scanner.py", String(guestId)];

        /**
         * Spawn the Python script and begin collecting stdout/stderr streams.
         */
        const pythonProcess = spawn(pythonCommand, pythonArguments, {
            stdio: ["ignore", "pipe", "pipe"],
            cwd: path.join(__dirname, "..")
        });

        let standardOutputBuffer = "";
        let standardErrorBuffer = "";

        /**
         * Collect all standard output emitted by the Python process.
         * The script may print diagnostic text during execution, so we buffer everything.
         */
        pythonProcess.stdout.on("data", (outputChunk) => {
            standardOutputBuffer += outputChunk.toString();
        });

        /**
         * Collect error output separately so we can diagnose Python failures.
         */
        pythonProcess.stderr.on("data", (errorChunk) => {
            standardErrorBuffer += errorChunk.toString();
        });

        /**
         * Handle child process errors such as missing Python binary or script launch failures.
         */
        pythonProcess.on("error", (processError) => {
            console.error("Python spawn error:", processError);
            return sendErrorResponse(response, 500, "Failed to start face scanning process.");
        });

        /**
         * Wait until the Python process exits.
         * Only after it closes do we parse stdout and decide whether to update the database.
         */
        pythonProcess.on("close", async (exitCode) => {
            try {
                if (exitCode !== 0) {
                    console.error("Python process stderr:", standardErrorBuffer);
                    return sendErrorResponse(response, 500, "Face scanner process failed.");
                }

                /**
                 * Parse the final stdout payload as JSON.
                 * The Python blueprint is expected to print one clean JSON object.
                 */
                const scannerResult = parseScannerOutput(standardOutputBuffer);

                if (!scannerResult.success) {
                    return response.status(400).json({
                        success: false,
                        message: scannerResult.message || "Face scan did not succeed.",
                        data: scannerResult
                    });
                }

                /**
                 * Read the face embedding value returned by Python.
                 * The prompt specifies that this value is a stringified array representing
                 * a 128-dimension vector, so we save it directly to Face_Embedding.
                 */
                const faceEmbeddingValue = scannerResult.faceEmbedding || null;

                if (!faceEmbeddingValue) {
                    return sendErrorResponse(response, 500, "Python script did not return a face embedding.");
                }

                /**
                 * Update the guest record with the enrollment flag and embedding data.
                 * SQL parameter definitions:
                 * - @GuestId: The guest primary key.
                 * - @FaceEmbedding: The serialized 128-dimension vector string.
                 */
                const databasePool = getDatabasePool();

                const updateResult = await databasePool
                    .request()
                    .input("GuestId", sql.Int, guestId)
                    .input("FaceEmbedding", sql.NVarChar(sql.MAX), faceEmbeddingValue)
                    .query(`
                        UPDATE GUESTS
                        SET
                            Is_Face_Enrolled = 1,
                            Face_Embedding = @FaceEmbedding
                        WHERE Guest_ID = @GuestId
                    `);

                if (updateResult.rowsAffected[0] === 0) {
                    return sendErrorResponse(response, 404, "Guest not found.");
                }

                return response.status(200).json({
                    success: true,
                    message: "Face enrollment completed successfully.",
                    data: {
                        guestId: guestId,
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
        console.error("Scan face route error:", error);
        return sendErrorResponse(response, 500, "Failed to scan face.");
    }
});

module.exports = router;