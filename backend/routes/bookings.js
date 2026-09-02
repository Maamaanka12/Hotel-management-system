"use strict";
const express = require("express");
const sql = require("mssql");
const router = express.Router();
const { getDatabasePool, sendErrorResponse } = require("../utils/helpers");

const statusMap = {
    "Pending": 1,
    "Confirmed": 2,
    "Checked-In": 3,
    "Checked-Out": 4,
    "Cancelled": 5
};

// GET all bookings
router.get("/", async (request, response) => {
    try {
        const databasePool = getDatabasePool();

        // ── Auto-checkout: transition overdue Confirmed / Checked-In bookings ──
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');

        // 1. Find all active bookings whose Check_Out_Date has passed
        const overdueResult = await databasePool
            .request()
            .input("Today", sql.Date, todayStr)
            .query(`
                SELECT Booking_ID, Room_ID
                FROM BOOKINGS
                WHERE Booking_Status_ID IN (2, 3)
                  AND Check_Out_Date < @Today
            `);

        // 2. Transition each one to Checked-Out and free the room
        for (const overdue of overdueResult.recordset) {
            await databasePool
                .request()
                .input("BookingId", sql.Int, overdue.Booking_ID)
                .query(`
                    UPDATE BOOKINGS
                    SET Booking_Status_ID = 4
                    WHERE Booking_ID = @BookingId
                `);

            // Free the room only if no other active bookings remain for it
            const otherActive = await databasePool
                .request()
                .input("RoomId", sql.Int, overdue.Room_ID)
                .input("BookingId", sql.Int, overdue.Booking_ID)
                .query(`
                    SELECT TOP 1 Booking_ID FROM BOOKINGS
                    WHERE Room_ID = @RoomId AND Booking_ID != @BookingId
                      AND Booking_Status_ID IN (2, 3)
                `);
            if (otherActive.recordset.length === 0) {
                await databasePool
                    .request()
                    .input("RoomId", sql.Int, overdue.Room_ID)
                    .query(`UPDATE ROOMS SET Status_ID = 1 WHERE Room_ID = @RoomId`);
            }
        }
        // ── End auto-checkout ──

        const result = await databasePool.request().query(`
            SELECT 
                b.Booking_ID,
                b.Guest_ID,
                g.Full_Name ,
                b.Room_ID,
                r.Room_Number,
                b.Check_In_Date,
                b.Check_Out_Date,
                b.Total_Amount,
                b.Booking_Status_ID,
                bs.Status_Name AS Booking_Status
            FROM BOOKINGS b
            INNER JOIN GUESTS g ON b.Guest_ID = g.Guest_ID
            INNER JOIN ROOMS r ON b.Room_ID = r.Room_ID
            INNER JOIN BOOKING_STATUS bs ON b.Booking_Status_ID = bs.Booking_Status_ID
            ORDER BY b.Booking_ID DESC
        `);
        return response.status(200).json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error("Get bookings error:", error);
        return sendErrorResponse(response, 500, "Failed to fetch bookings.");
    }
});

// GET single booking
router.get("/:id", async (request, response) => {
    try {
        const bookingId = parseInt(request.params.id);
        const databasePool = getDatabasePool();
        const result = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .query(`
                SELECT 
                    b.Booking_ID,
                    b.Guest_ID,
                    g.Full_Name,
                    b.Room_ID,
                    r.Room_Number,
                    b.Check_In_Date,
                    b.Check_Out_Date,
                    b.Total_Amount,
                    b.Booking_Status_ID,
                    bs.Status_Name AS Booking_Status
                FROM BOOKINGS b
                INNER JOIN GUESTS g ON b.Guest_ID = g.Guest_ID
                INNER JOIN ROOMS r ON b.Room_ID = r.Room_ID
                INNER JOIN BOOKING_STATUS bs ON b.Booking_Status_ID = bs.Booking_Status_ID
                WHERE b.Booking_ID = @BookingId
            `);
        if (result.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Booking not found.");
        }
        return response.status(200).json({
            success: true,
            data: result.recordset[0]
        });
    } catch (error) {
        console.error("Get booking error:", error);
        return sendErrorResponse(response, 500, "Failed to fetch booking.");
    }
});

// POST create booking
router.post("/", async (request, response) => {
    try {
        const guestId = request.body.guestId;
        const roomId = request.body.roomId;
        const checkIn = request.body.checkIn;
        const checkOut = request.body.checkOut;
        const totalPrice = request.body.totalPrice;
        const statusLabel = request.body.status || "Confirmed";
        const statusId = statusMap[statusLabel] || 1;

        if (!guestId || !roomId || !checkIn || !checkOut) {
            return sendErrorResponse(response, 400, "Guest, room, check-in, and check-out are required.");
        }

        const databasePool = getDatabasePool();

        const insertResult = await databasePool
            .request()
            .input("GuestId", sql.Int, guestId)
            .input("RoomId", sql.Int, roomId)
            .input("CheckIn", sql.Date, checkIn)
            .input("CheckOut", sql.Date, checkOut)
            .input("TotalAmount", sql.Decimal(10, 2), totalPrice || 0)
            .input("StatusId", sql.Int, statusId)
            .query(`
                INSERT INTO BOOKINGS (Guest_ID, Room_ID, Check_In_Date, Check_Out_Date, Total_Amount, Booking_Status_ID)
                OUTPUT INSERTED.Booking_ID, INSERTED.Guest_ID, INSERTED.Room_ID, INSERTED.Check_In_Date, INSERTED.Check_Out_Date, INSERTED.Total_Amount, INSERTED.Booking_Status_ID
                VALUES (@GuestId, @RoomId, @CheckIn, @CheckOut, @TotalAmount, @StatusId)
            `);

        // Sync room status: mark as Occupied if booking is Confirmed or Checked-In
        if (statusId === 2 || statusId === 3) {
            await databasePool
                .request()
                .input("RoomId", sql.Int, roomId)
                .query(`UPDATE ROOMS SET Status_ID = 2 WHERE Room_ID = @RoomId`);
        }

        return response.status(201).json({
            success: true,
            message: "Booking created successfully.",
            data: insertResult.recordset[0]
        });
    } catch (error) {
        console.error("Create booking error:", error);
        return sendErrorResponse(response, 500, "Failed to create booking.");
    }
});

// PUT update booking
router.put("/:id", async (request, response) => {
    try {
        const bookingId = parseInt(request.params.id);
        const guestId = request.body.guestId;
        const roomId = request.body.roomId;
        const checkIn = request.body.checkIn;
        const checkOut = request.body.checkOut;
        const totalPrice = request.body.totalPrice;
        const statusLabel = request.body.status;
        const statusId = statusMap[statusLabel] || 1;

        if (!guestId || !roomId || !checkIn || !checkOut) {
            return sendErrorResponse(response, 400, "Guest, room, check-in, and check-out are required.");
        }

        const databasePool = getDatabasePool();

        // Fetch current booking to detect room changes
        const currentBooking = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .query(`SELECT Room_ID FROM BOOKINGS WHERE Booking_ID = @BookingId`);

        const updateResult = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .input("GuestId", sql.Int, guestId)
            .input("RoomId", sql.Int, roomId)
            .input("CheckIn", sql.Date, checkIn)
            .input("CheckOut", sql.Date, checkOut)
            .input("TotalAmount", sql.Decimal(10, 2), totalPrice || 0)
            .input("StatusId", sql.Int, statusId)
            .query(`
                UPDATE BOOKINGS
                SET 
                    Guest_ID = @GuestId,
                    Room_ID = @RoomId,
                    Check_In_Date = @CheckIn,
                    Check_Out_Date = @CheckOut,
                    Total_Amount = @TotalAmount,
                    Booking_Status_ID = @StatusId
                WHERE Booking_ID = @BookingId;
                SELECT @@ROWCOUNT AS AffectedRows;
            `);

        if (updateResult.recordset[0].AffectedRows === 0) {
            return sendErrorResponse(response, 404, "Booking not found.");
        }

        // Sync room statuses after booking update
        const oldRoomId = currentBooking.recordset[0] ? currentBooking.recordset[0].Room_ID : null;

        // Free the old room if it changed or booking is no longer active
        if (oldRoomId && oldRoomId !== roomId) {
            // Check if old room has other active bookings
            const otherActive = await databasePool
                .request()
                .input("OldRoomId", sql.Int, oldRoomId)
                .input("BookingId", sql.Int, bookingId)
                .query(`
                    SELECT TOP 1 Booking_ID FROM BOOKINGS
                    WHERE Room_ID = @OldRoomId AND Booking_ID != @BookingId
                      AND Booking_Status_ID IN (2, 3)
                `);
            if (otherActive.recordset.length === 0) {
                await databasePool
                    .request()
                    .input("OldRoomId", sql.Int, oldRoomId)
                    .query(`UPDATE ROOMS SET Status_ID = 1 WHERE Room_ID = @OldRoomId`);
            }
        }

        // Update new room status based on booking status
        if (statusId === 2 || statusId === 3) {
            await databasePool
                .request()
                .input("RoomId", sql.Int, roomId)
                .query(`UPDATE ROOMS SET Status_ID = 2 WHERE Room_ID = @RoomId`);
        } else if (statusId === 4 || statusId === 5) {
            // Checked-Out or Cancelled — free the room if no other active bookings
            const otherActive = await databasePool
                .request()
                .input("RoomId", sql.Int, roomId)
                .input("BookingId", sql.Int, bookingId)
                .query(`
                    SELECT TOP 1 Booking_ID FROM BOOKINGS
                    WHERE Room_ID = @RoomId AND Booking_ID != @BookingId
                      AND Booking_Status_ID IN (2, 3)
                `);
            if (otherActive.recordset.length === 0) {
                await databasePool
                    .request()
                    .input("RoomId", sql.Int, roomId)
                    .query(`UPDATE ROOMS SET Status_ID = 1 WHERE Room_ID = @RoomId`);
            }
        }

        return response.status(200).json({
            success: true,
            message: "Booking updated successfully."
        });
    } catch (error) {
        console.error("Update booking error:", error);
        return sendErrorResponse(response, 500, "Failed to update booking.");
    }
});

// DELETE booking
router.delete("/:id", async (request, response) => {
    try {
        const bookingId = parseInt(request.params.id);
        const databasePool = getDatabasePool();

        const paymentCheck = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .query(`
                SELECT TOP 1 Payment_ID FROM PAYMENTS
                WHERE Booking_ID = @BookingId
            `);

        if (paymentCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "Cannot delete booking with existing payments.");
        }

        // Fetch booking before delete to free the room
        const bookingToDelete = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .query(`SELECT Room_ID, Booking_Status_ID FROM BOOKINGS WHERE Booking_ID = @BookingId`);

        const deleteResult = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .query(`
                DELETE FROM BOOKINGS WHERE Booking_ID = @BookingId;
                SELECT @@ROWCOUNT AS AffectedRows;
            `);

        if (deleteResult.recordset[0].AffectedRows === 0) {
            return sendErrorResponse(response, 404, "Booking not found.");
        }

        // Free the room if the deleted booking was active and no other active bookings remain
        if (bookingToDelete.recordset.length > 0) {
            const deleted = bookingToDelete.recordset[0];
            if (deleted.Booking_Status_ID === 2 || deleted.Booking_Status_ID === 3) {
                const otherActive = await databasePool
                    .request()
                    .input("RoomId", sql.Int, deleted.Room_ID)
                    .query(`
                        SELECT TOP 1 Booking_ID FROM BOOKINGS
                        WHERE Room_ID = @RoomId AND Booking_Status_ID IN (2, 3)
                    `);
                if (otherActive.recordset.length === 0) {
                    await databasePool
                        .request()
                        .input("RoomId", sql.Int, deleted.Room_ID)
                        .query(`UPDATE ROOMS SET Status_ID = 1 WHERE Room_ID = @RoomId`);
                }
            }
        }

        return response.status(200).json({
            success: true,
            message: "Booking deleted successfully."
        });
    } catch (error) {
        console.error("Delete booking error:", error);
        return sendErrorResponse(response, 500, "Failed to delete booking.");
    }
});

module.exports = router;