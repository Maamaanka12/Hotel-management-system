"use strict";

const express = require("express");
const sql = require("mssql");
const router = express.Router();
const bcrypt = require("bcrypt");

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

router.post("/register", async (request, response) => {
    try {
        const fullName = request.body.fullName;
        const email = request.body.email;
        const password = request.body.password;
        const userRole = request.body.userRole || "STAFF";
        const hashedPassword = await bcrypt.hash(password, 10);
        if (!fullName || !email || !password) {
            return sendErrorResponse(response, 400, "Full name, email, and password are required.");
        }

        const databasePool = getDatabasePool();

        const duplicateCheck = await databasePool
            .request()
            .input("Email", sql.NVarChar(150), email)
            .query(`
                SELECT User_ID
                FROM USERS
                WHERE User_Name = @Email
            `);

        if (duplicateCheck.recordset.length > 0) {
            return sendErrorResponse(response, 409, "This email is already registered. Please sign in instead.");
        }

        const insertResult = await databasePool
            .request()
            .input("FullName", sql.NVarChar(100), fullName)
            .input("Email", sql.NVarChar(150), email)
            .input("Password", sql.NVarChar(255), hashedPassword)
            .input("UserRole", sql.NVarChar(50), userRole)
            .query(`
                INSERT INTO USERS (User_Name, Full_Name, Email, Password, User_Role)
                OUTPUT INSERTED.User_ID, INSERTED.User_Name, INSERTED.Full_Name, INSERTED.User_Role
                VALUES (@Email, @FullName, @Email, @Password, @UserRole)
            `);

        return response.status(201).json({
            success: true,
            message: "Account created successfully.",
            data: insertResult.recordset[0]
        });
    } catch (error) {
        console.error("Registration error:", error);
        return sendErrorResponse(response, 500, "Failed to register user.");
    }
});


//

router.post("/login", async (request, response) => {
    try {
        const email = request.body.email;
        const password = request.body.password;

        if (!email || !password) {
            return sendErrorResponse(response, 400, "Email and password are required.");
        }

        const databasePool = getDatabasePool();

        const loginResult = await databasePool
            .request()
            .input("Email", sql.NVarChar(150), email)
            .input("Password", sql.NVarChar(255), hashPassword)
            .query(`
                SELECT User_ID, User_Name, Full_Name, User_Role
                FROM USERS
                WHERE User_Name = @Email
                
            `);

        const user = loginResult.recordset[0];
        const match = await bcrypt.compare(password, user.Password);
        if (!match) {
            return sendErrorResponse(response, 401, "Invalid email or password.");
        }

        if (loginResult.recordset.length === 0) {
            return sendErrorResponse(response, 401, "Invalid email or password.");
        }

        return response.status(200).json({
            success: true,
            message: "Login successful.",
            data: loginResult.recordset[0]
        });
    } catch (error) {
        console.error("Login error:", error);
        return sendErrorResponse(response, 500, "Failed to log in.");
    }
});

module.exports = router;