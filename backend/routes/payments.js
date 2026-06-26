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


//


router.get("/methods", async (request, response) => {
    try {
        const databasePool = getDatabasePool();

        const result = await databasePool.request().query(`
            SELECT Method_ID, Method_Name
            FROM PAYMENT_METHODS
            ORDER BY Method_ID
        `);

        return response.status(200).json({
            success: true,
            message: "Payment methods retrieved successfully.",
            data: result.recordset
        });
    } catch (error) {
        console.error("Get payment methods error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve payment methods.");
    }
});


//


router.get("/", async (request, response) => {
    try {
        const databasePool = getDatabasePool();

        const paymentResult = await databasePool.request().query(`
            SELECT
                payment.Payment_ID,
                payment.Booking_ID,
                payment.Amount,
                payment.Method_ID,
                method.Method_Name,
                payment.Payment_Date
            FROM PAYMENTS AS payment
            INNER JOIN PAYMENT_METHODS AS method
                ON payment.Method_ID = method.Method_ID
            ORDER BY payment.Payment_ID DESC
        `);

        return response.status(200).json({
            success: true,
            message: "Payments retrieved successfully.",
            data: paymentResult.recordset
        });
    } catch (error) {
        console.error("Get payments error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve payments.");
    }
});


//


router.get("/:paymentId", async (request, response) => {
    try {
        const paymentId = Number(request.params.paymentId);

        if (!paymentId) {
            return sendErrorResponse(response, 400, "Valid payment ID is required.");
        }

        const databasePool = getDatabasePool();

        const paymentResult = await databasePool
            .request()
            .input("PaymentId", sql.Int, paymentId)
            .query(`
                SELECT
                    payment.Payment_ID,
                    payment.Booking_ID,
                    payment.Amount,
                    payment.Method_ID,
                    method.Method_Name,
                    payment.Payment_Date
                FROM PAYMENTS AS payment
                INNER JOIN PAYMENT_METHODS AS method
                    ON payment.Method_ID = method.Method_ID
                WHERE payment.Payment_ID = @PaymentId
            `);

        if (paymentResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Payment not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Payment retrieved successfully.",
            data: paymentResult.recordset[0]
        });
    } catch (error) {
        console.error("Get payment by ID error:", error);
        return sendErrorResponse(response, 500, "Failed to retrieve payment.");
    }
});



//



router.post("/", async (request, response) => {
    try {
        const bookingId = Number(request.body.bookingId);
        const amount = request.body.amount;
        const methodId = Number(request.body.methodId);
        const paymentDate = request.body.paymentDate || new Date();

        if (!bookingId || amount === undefined || !methodId) {
            return sendErrorResponse(response, 400, "Booking ID, amount, and method ID are required.");
        }

        const databasePool = getDatabasePool();

        const dupCheck = await databasePool
        .request()
        .input("BookingId", sql.Int, bookingId)
        .query(`SELECT TOP 1 Payment_ID FROM PAYMENTS WHERE Booking_ID = @BookingId`);

        if (dupCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "A payment for this booking already exists.");
        }

        const insertResult = await databasePool
            .request()
            .input("BookingId", sql.Int, bookingId)
            .input("Amount", sql.Decimal(18, 2), amount)
            .input("MethodId", sql.Int, methodId)
            .input("PaymentDate", sql.Date, paymentDate)
            .query(`
                INSERT INTO PAYMENTS (Booking_ID, Amount, Method_ID, Payment_Date)
                OUTPUT INSERTED.Payment_ID, INSERTED.Booking_ID, INSERTED.Amount,
                       INSERTED.Method_ID, INSERTED.Payment_Date
                VALUES (@BookingId, @Amount, @MethodId, @PaymentDate)
            `);

        return response.status(201).json({
            success: true,
            message: "Payment created successfully.",
            data: insertResult.recordset[0]
        });
    } catch (error) {
        console.error("Create payment error:", error);
        return sendErrorResponse(response, 500, "Failed to create payment.");
    }
});




//


router.put("/:paymentId", async (request, response) => {
    try {
        const paymentId = Number(request.params.paymentId);

        if (!paymentId) {
            return sendErrorResponse(response, 400, "Valid payment ID is required.");
        }

        const databasePool = getDatabasePool();

        const updateResult = await databasePool
            .request()
            .input("PaymentId", sql.Int, paymentId)
            .input("BookingId", sql.Int, request.body.bookingId ?? null)
            .input("Amount", sql.Decimal(18, 2), request.body.amount ?? null)
            .input("MethodId", sql.Int, request.body.methodId ?? null)
            .input("PaymentDate", sql.Date, request.body.paymentDate ?? null)
            .query(`
                UPDATE PAYMENTS
                SET
                    Booking_ID   = COALESCE(@BookingId,   Booking_ID),
                    Amount       = COALESCE(@Amount,       Amount),
                    Method_ID    = COALESCE(@MethodId,     Method_ID),
                    Payment_Date = COALESCE(@PaymentDate,  Payment_Date)
                WHERE Payment_ID = @PaymentId

                SELECT
                    Payment_ID,
                    Booking_ID,
                    Amount,
                    Method_ID,
                    Payment_Date
                FROM PAYMENTS
                WHERE Payment_ID = @PaymentId
            `);

        if (updateResult.recordset.length === 0) {
            return sendErrorResponse(response, 404, "Payment not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Payment updated successfully.",
            data: updateResult.recordset[0]
        });
    } catch (error) {
        console.error("Update payment error:", error);
        return sendErrorResponse(response, 500, "Failed to update payment.");
    }
});



//


router.delete("/:paymentId", async (request, response) => {
    try {
        const paymentId = Number(request.params.paymentId);

        if (!paymentId) {
            return sendErrorResponse(response, 400, "Valid payment ID is required.");
        }

        const databasePool = getDatabasePool();

        const deleteResult = await databasePool
            .request()
            .input("PaymentId", sql.Int, paymentId)
            .query(`
                DELETE FROM PAYMENTS
                WHERE Payment_ID = @PaymentId
            `);

        if (deleteResult.rowsAffected[0] === 0) {
            return sendErrorResponse(response, 404, "Payment not found.");
        }

        return response.status(200).json({
            success: true,
            message: "Payment deleted successfully."
        });
    } catch (error) {
        console.error("Delete payment error:", error);
        return sendErrorResponse(response, 500, "Failed to delete payment.");
    }
});

module.exports = router;