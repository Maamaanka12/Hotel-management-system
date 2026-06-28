"use strict";

const express = require("express");
const cors = require("cors");
const sql = require("mssql");
const path = require("path");

require("dotenv").config();

const application = express();
const applicationPort = process.env.PORT || 3000;

const databaseConfiguration = {
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_DATABASE || "HMS1",
    options: {
        encrypt: false,
        trustServerCertificate: true,
        instanceName: "SQLEXPRESS"
    },
    authentication:
        process.env.WINDOWS_USER && process.env.WINDOWS_PASS
            ? {
                  type: "ntlm",
                  options: {
                      domain: "",
                      userName: process.env.WINDOWS_USER,
                      password: process.env.WINDOWS_PASS
                  }
              }
            : undefined,
    pool: {
        max: Number(process.env.DB_POOL_MAX || 10),
        min: Number(process.env.DB_POOL_MIN || 0),
        idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_TIMEOUT || 30000)
    }
};

let globalDatabasePool = null;

application.use(cors());
application.use(express.json());
application.use(express.urlencoded({ extended: true }));


const frontendPath = path.join(__dirname, "..", "Front end");
application.use(express.static(frontendPath));
console.log(frontendPath);

application.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

application.get("/:page.html", (req, res) => {
    res.sendFile(path.join(frontendPath, `${req.params.page}.html`));
});
 
// API routes

const authenticationRouter = require(path.join(__dirname, "routes", "auth"));
const roomsRouter = require(path.join(__dirname, "routes", "rooms"));
const guestsRouter = require(path.join(__dirname, "routes", "guests"));
const bookingsRouter = require(path.join(__dirname, "routes", "bookings"));
const paymentsRouter = require(path.join(__dirname, "routes", "payments"));
const faceIdRouter = require(path.join(__dirname, "routes", "faceid"));

application.use("/api/auth", authenticationRouter);
application.use("/api/rooms", roomsRouter);
application.use("/api/guests", guestsRouter);
application.use("/api/bookings", bookingsRouter);
application.use("/api/payments", paymentsRouter);
application.use("/api", faceIdRouter);



// 


application.get("/api/health", (request, response) => {
    response.status(200).json({
        success: true,
        message: "Hotel Management System API is running",
        database: "HMS1"
    });
});

// 

application.use((request, response) => {
    response.status(404).json({
        success: false,
        message: `Route not found: ${request.method} ${request.originalUrl}`
    });
});


//

application.use((error, request, response, next) => {
    console.error(error);
    response.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error"
    });
});

function registerApplicationRoutes() {
    sql.globalDatabasePool = globalDatabasePool;
}

async function initializeDatabaseConnection() {
    try {
        globalDatabasePool = await sql.connect(databaseConfiguration);
        sql.globalDatabasePool = globalDatabasePool;
        registerApplicationRoutes();

        application.listen(applicationPort, () => {
            console.log(`Hotel Management System API listening on port ${applicationPort}`);
            console.log(`Connected to MSSQL database: HMS1`);
        });
    } catch (connectionError) {
        console.error("Failed to connect to MSSQL database:", connectionError);
        process.exit(1);
    }
}

process.on("unhandledRejection", (rejectionReason) => {
    console.error("Unhandled Promise Rejection:", rejectionReason);
});

process.on("uncaughtException", (unexpectedError) => {
    console.error("Uncaught Exception:", unexpectedError);
});

initializeDatabaseConnection();