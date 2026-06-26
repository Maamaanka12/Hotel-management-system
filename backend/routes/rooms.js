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

const statusMap = {
    Available: 1,
    Occupied: 2,
    Maintenance: 3
};


///


router.get("/", async (request, response) => {
    try {
        const databasePool = getDatabasePool();

        const roomResult = await databasePool.request().query(`
            SELECT
                room.Room_ID,
                room.Room_Number,
                room.Price_Per_Night,
                room.Status_ID,
                room.Room_Type_ID,
                roomType.Room_Type
            FROM ROOMS AS room
            INNER JOIN ROOM_TYPE AS roomType
                ON room.Room_Type_ID = roomType.Room_Type_ID
            ORDER BY room.Room_Number
        `);

        return response.status(200).json({
            success: true,
            message: "Rooms retrieved successfully.",
            data: roomResult.recordset
        });
    } catch (error) {
        console.error("GET ROOMS ERROR");
        console.error(error);
        console.error("MESSAGE:", error.message);
        return sendErrorResponse(response, 500, error.message);
    }
});

//


router.get("/:roomId", async (request, response) => {
    try {
        const roomId = Number(request.params.roomId);

        if (!roomId) {
            return sendErrorResponse(response, 400, "Valid room ID is required.");
        }

        const databasePool = getDatabasePool();

        const roomResult = await databasePool
            .request()
            .input("RoomId", sql.Int, roomId)
            .query(`
                SELECT
                    room.Room_ID,
                    room.Room_Number,
                    room.Price_Per_Night,
                    room.Status_ID,
                    room.Room_Type_ID,
                    roomType.Room_Type
                FROM ROOMS AS room
                INNER JOIN ROOM_TYPE AS roomType
                    ON room.Room_Type_ID = roomType.Room_Type_ID
                WHERE room.Room_ID = @RoomId
            `);

        if (roomResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Room not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Room retrieved successfully.",
            data: roomResult.recordset[0]
        });
    } catch (error) {
        console.error("Get room by ID error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve room.");
    }
});


//


router.post("/", async (request, response) => {
    try {
        const roomNumber = request.body.roomNumber;
        const price = request.body.price;
        const statusName = request.body.status || "Available";
        const statusId = statusMap[statusName] || 1;
        const roomTypeId = request.body.roomTypeId;

        if (!roomNumber || price === undefined || !roomTypeId) {
            return sendErrorResponse(response, 400, "Room number, price, and room type ID are required.");
        }

        const databasePool = getDatabasePool();

        const insertResult = await databasePool
            .request()
            .input("RoomNumber", sql.NVarChar(50), roomNumber)
            .input("Price", sql.Decimal(18, 2), price)
            .input("StatusId", sql.Int, statusId)
            .input("RoomTypeId", sql.Int, roomTypeId)
            .query(`
                INSERT INTO ROOMS (Room_Number, Price_Per_Night, Status_ID, Room_Type_ID)
                OUTPUT INSERTED.Room_ID, INSERTED.Room_Number, INSERTED.Price_Per_Night, INSERTED.Status_ID, INSERTED.Room_Type_ID
                VALUES (@RoomNumber, @Price, @StatusId, @RoomTypeId)
            `);

        return response.status(201).json({
            success: true,
            message: "Room created successfully.",
            data: insertResult.recordset[0]
        });
    } catch (error) {
        console.error("Create room error:", error);
        return sendErrorResponse(response, 500, "Failed to create room.");
    }
});


//


router.put("/:roomId", async (request, response) => {
    try {
        const roomId = Number(request.params.roomId);

        if (!roomId) {
            return sendErrorResponse(response, 400, "Valid room ID is required.");
        }

        const statusId = request.body.status ? (statusMap[request.body.status] || null) : null;

        const databasePool = getDatabasePool();

        const updateResult = await databasePool
            .request()
            .input("RoomId", sql.Int, roomId)
            .input("RoomNumber", sql.NVarChar(50), request.body.roomNumber ?? null)
            .input("Price", sql.Decimal(18, 2), request.body.price ?? null)
            .input("StatusId", sql.Int, statusId)
            .input("RoomTypeId", sql.Int, request.body.roomTypeId ?? null)
            .query(`
                UPDATE ROOMS
                SET
                    Room_Number = COALESCE(@RoomNumber, Room_Number),
                    Price_Per_Night = COALESCE(@Price, Price_Per_Night),
                    Status_ID = COALESCE(@StatusId, Status_ID),
                    Room_Type_ID = COALESCE(@RoomTypeId, Room_Type_ID)
                WHERE Room_ID = @RoomId

                SELECT
                    Room_ID,
                    Room_Number,
                    Price_Per_Night,
                    Status_ID,
                    Room_Type_ID
                FROM ROOMS
                WHERE Room_ID = @RoomId
            `);

        if (updateResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Room not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Room updated successfully.",
            data: updateResult.recordset[0]
        });
    } catch (error) {
        console.error("Update room error:", error);
        return sendErrorResponse(response, 500, "Failed to update room.");
    }
});


//


router.delete("/:roomId", async (request, response) => {
    try {
        const roomId = Number(request.params.roomId);

        if (!roomId) {
            return sendErrorResponse(response, 400, "Valid room ID is required.");
        }

        const databasePool = getDatabasePool();

        const bookingCheck = await databasePool
            .request()
            .input("RoomId", sql.Int, roomId)
            .query(`
                SELECT TOP 1 Booking_ID FROM BOOKINGS
                WHERE Room_ID = @RoomId
                  AND Booking_Status_ID IN (1, 2, 3)
            `);

        if (bookingCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "Cannot delete room with active bookings.");
        }

        const deleteResult = await databasePool
            .request()
            .input("RoomId", sql.Int, roomId)
            .query(`
                DELETE FROM ROOMS
                WHERE Room_ID = @RoomId
            `);

        if (deleteResult.rowsAffected[0] === 0) {
            return sendErrorResponse(response, 404, "Room not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Room deleted successfully."
        });
    } catch (error) {
        console.error("Delete room error:", error);
        return sendErrorResponse(response, 500, "Failed to delete room.");
    }
});

module.exports = router;