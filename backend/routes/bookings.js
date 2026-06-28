// "use strict";

// const express = require("express");
// const sql = require("mssql");
// const router = express.Router();
// const bcrypt = require("bcrypt");

// function getDatabasePool() {
//     if (!sql.globalDatabasePool) {
//         throw new Error("Database connection pool has not been initialized.");
//     }
//     return sql.globalDatabasePool;
// }

// function sendErrorResponse(response, statusCode, message) {
//     return response.status(statusCode).json({
//         success: false,
//         message: message
//     });
// }

// //

// router.post("/register", async (request, response) => {
//     try {
//         const fullName = request.body.fullName;
//         const email = request.body.email;
//         const password = request.body.password;
//         const userRole = request.body.userRole || "STAFF";
//         const hashedPassword = await bcrypt.hash(password, 10);
//         if (!fullName || !email || !password) {
//             return sendErrorResponse(response, 400, "Full name, email, and password are required.");
//         }

//         const databasePool = getDatabasePool();

//         const duplicateCheck = await databasePool
//             .request()
//             .input("Email", sql.NVarChar(150), email)
//             .query(`
//                 SELECT User_ID
//                 FROM USERS
//                 WHERE User_Name = @Email
//             `);

//         if (duplicateCheck.recordset.length > 0) {
//             return sendErrorResponse(response, 409, "This email is already registered. Please sign in instead.");
//         }

//         const insertResult = await databasePool
//             .request()
//             .input("FullName", sql.NVarChar(100), fullName)
//             .input("Email", sql.NVarChar(150), email)
//             .input("Password", sql.NVarChar(255), hashedPassword)
//             .input("UserRole", sql.NVarChar(50), userRole)
//             .query(`
//                 INSERT INTO USERS (User_Name, Full_Name, Email, Password, User_Role)
//                 OUTPUT INSERTED.User_ID, INSERTED.User_Name, INSERTED.Full_Name, INSERTED.User_Role
//                 VALUES (@Email, @FullName, @Email, @Password, @UserRole)
//             `);

//         return response.status(201).json({
//             success: true,
//             message: "Account created successfully.",
//             data: insertResult.recordset[0]
//         });
//     } catch (error) {
//         console.error("Registration error:", error);
//         return sendErrorResponse(response, 500, "Failed to register user.");
//     }
// });


// //

// router.post("/login", async (request, response) => {
//     try {
//         const email = request.body.email;
//         const password = request.body.password;

//         if (!email || !password) {
//             return sendErrorResponse(response, 400, "Email and password are required.");
//         }

//         const databasePool = getDatabasePool();

//         const loginResult = await databasePool
//             .request()
//             .input("Email", sql.NVarChar(150), email)
//             .input("Password", sql.NVarChar(255), hashPassword)
//             .query(`
//                 SELECT User_ID, User_Name, Full_Name, User_Role
//                 FROM USERS
//                 WHERE User_Name = @Email
                
//             `);

//         const user = loginResult.recordset[0];
//         const match = await bcrypt.compare(password, user.Password);
//         if (!match) {
//             return sendErrorResponse(response, 401, "Invalid email or password.");
//         }

//         if (loginResult.recordset.length === 0) {
//             return sendErrorResponse(response, 401, "Invalid email or password.");
//         }

//         return response.status(200).json({
//             success: true,
//             message: "Login successful.",
//             data: loginResult.recordset[0]
//         });
//     } catch (error) {
//         console.error("Login error:", error);
//         return sendErrorResponse(response, 500, "Failed to log in.");
//     }
// });

// module.exports = router;

//-----------------------------------------


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