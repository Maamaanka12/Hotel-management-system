"use strict";

const express = require("express");
const sql = require("mssql");
const router = express.Router();

function getDatabasePool() {
    if (!sql.globalDatabasePool) {
        throw new Error("Database connection pool has not been initialized.");
    }
    return sql.globalDatabasePool;
}

function sendErrorResponse(response, statusCode, message) {
    return response.status(statusCode).json({
        success: false,
        message: message
    });
}

function splitFullName(fullName) {
    const parts = fullName.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "-";
    return { firstName, lastName };
}


//


router.get("/", async (request, response) => {
    try {
        const databasePool = getDatabasePool();

        const guestResult = await databasePool.request().query(`
            SELECT
                Guest_ID,
                First_Name + ' ' + Last_Name AS Full_Name,
                First_Name,
                Last_Name,
                Phone,
                Email,
                Address,
                Is_Face_Enrolled,
                Face_Embedding
            FROM GUESTS
            ORDER BY Guest_ID DESC
        `);

        return response.status(200).json({
            success: true,
            message: "Guests retrieved successfully.",
            data: guestResult.recordset
        });
    } catch (error) {
        console.error("Get guests error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve guests.");
    }
});


//


router.get("/:guestId", async (request, response) => {
    try {
        const guestId = Number(request.params.guestId);
        if (!guestId) return sendErrorResponse(response, 400, "Valid guest ID is required.");

        const databasePool = getDatabasePool();

        const guestResult = await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .query(`
                SELECT
                    Guest_ID,
                    First_Name + ' ' + Last_Name AS Full_Name,
                    First_Name,
                    Last_Name,
                    Phone,
                    Email,
                    Address,
                    Is_Face_Enrolled,
                    Face_Embedding
                FROM GUESTS
                WHERE Guest_ID = @GuestId
            `);

        if (guestResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Guest not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Guest retrieved successfully.",
            data: guestResult.recordset[0]
        });
    } catch (error) {
        console.error("Get guest by ID error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve guest.");
    }
});


//


router.post("/", async (request, response) => {
    try {
        const fullName = request.body.fullName;
        const phone = request.body.phone || null;
        const email = request.body.email || null;
        const address = request.body.address || null;
        const nationalId = request.body.nationalId || null;
        const isFaceEnrolled = request.body.isFaceEnrolled ?? 0;
        const faceEmbedding = request.body.faceEmbedding || null;

        if (!fullName) {
            return sendErrorResponse(response, 400, "Full name is required.");
        }

        const { firstName, lastName } = splitFullName(fullName);
        const databasePool = getDatabasePool();

        const insertResult = await databasePool
            .request()
            .input("FirstName", sql.NVarChar(100), firstName)
            .input("LastName", sql.NVarChar(100), lastName)
            .input("Phone", sql.NVarChar(50), phone)
            .input("Email", sql.NVarChar(150), email)
            .input("Address", sql.NVarChar(300), address)
            .input("IsFaceEnrolled", sql.Bit, isFaceEnrolled)
            .input("FaceEmbedding", sql.NVarChar(sql.MAX), faceEmbedding)
            .query(`
                INSERT INTO GUESTS (First_Name, Last_Name, Phone, Email, Address,
                Is_Face_Enrolled, Face_Embedding)
                OUTPUT
                    INSERTED.Guest_ID,
                    INSERTED.First_Name,
                    INSERTED.Last_Name,
                    INSERTED.Phone,
                    INSERTED.Email,
                    INSERTED.Address,
                    INSERTED.Is_Face_Enrolled,
                    INSERTED.Face_Embedding
                VALUES (@FirstName, @LastName, @Phone, @Email, @Address, @IsFaceEnrolled, @FaceEmbedding)
            `);

        const inserted = insertResult.recordset[0];
        inserted.Full_Name = inserted.First_Name + " " + inserted.Last_Name;

        return response.status(201).json({
            success: true,
            message: "Guest created successfully.",
            data: inserted
        });
    } catch (error) {
        console.error("Create guest error:", error);
        return sendErrorResponse(response, 500, "Failed to create guest.");
    }
});

//

router.put("/:guestId", async (request, response) => {
    try {
        const guestId = Number(request.params.guestId);
        if (!guestId) return sendErrorResponse(response, 400, "Valid guest ID is required.");

        let firstName = null;
        let lastName = null;
        if (request.body.fullName) {
            const split = splitFullName(request.body.fullName);
            firstName = split.firstName;
            lastName = split.lastName;
        }

        const databasePool = getDatabasePool();

        await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .input("FirstName", sql.NVarChar(100), firstName)
            .input("LastName", sql.NVarChar(100), lastName)
            .input("Phone", sql.NVarChar(50), request.body.phone ?? null)
            .input("Email", sql.NVarChar(150), request.body.email ?? null)
            .input("Address", sql.NVarChar(300), request.body.address ?? null)
            .input("NationalId", sql.NVarChar(50), request.body.nationalId ?? null)
            .input("IsFaceEnrolled", sql.Bit, request.body.isFaceEnrolled ?? null)
            .input("FaceEmbedding", sql.NVarChar(sql.MAX), request.body.faceEmbedding ?? null)
            .query(`
                UPDATE GUESTS
                SET
                    First_Name       = COALESCE(@FirstName,      First_Name),
                    Last_Name        = COALESCE(@LastName,       Last_Name),
                    Phone            = COALESCE(@Phone,          Phone),
                    Email            = COALESCE(@Email,          Email),
                    Address          = COALESCE(@Address,        Address),
                    Is_Face_Enrolled = COALESCE(@IsFaceEnrolled, Is_Face_Enrolled),
                    Face_Embedding   = COALESCE(@FaceEmbedding,  Face_Embedding)
                WHERE Guest_ID = @GuestId
            `);

        const updatedResult = await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .query(`
                SELECT
                    Guest_ID,
                    First_Name + ' ' + Last_Name AS Full_Name,
                    First_Name,
                    Last_Name,
                    Phone,
                    Email,
                    Address,
                    Is_Face_Enrolled,
                    Face_Embedding
                FROM GUESTS
                WHERE Guest_ID = @GuestId
            `);

        if (updatedResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Guest not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Guest updated successfully.",
            data: updatedResult.recordset[0]
        });
    } catch (error) {
        console.error("Update guest error:", error);
        return sendErrorResponse(response, 500, "Failed to update guest.");
    }
});


//

router.delete("/:guestId", async (request, response) => {
    try {
        const guestId = Number(request.params.guestId);
        if (!guestId) return sendErrorResponse(response, 400, "Valid guest ID is required.");

        const databasePool = getDatabasePool();

        const bookingCheck = await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .query(`
                SELECT TOP 1 Booking_ID FROM BOOKINGS
                WHERE Guest_ID = @GuestId
                  AND Booking_Status_ID IN (1, 2, 3)
            `);

        if (bookingCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "Cannot delete guest with active bookings.");
        }

        const deleteResult = await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .query(`DELETE FROM GUESTS WHERE Guest_ID = @GuestId`);

        if (deleteResult.rowsAffected[0] === 0) {
            return sendErrorResponse(response, 404, "Guest not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Guest deleted successfully."
        });
    } catch (error) {
        console.error("Delete guest error:", error);
        return sendErrorResponse(response, 500, "Failed to delete guest.");
    }
});

module.exports = router;