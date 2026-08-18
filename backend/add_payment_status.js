"use strict";

// One-off migration: add a Status column to the PAYMENTS table.
// Safe to re-run — it checks whether the column already exists first.

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const sql = require("mssql");

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
            : undefined
};

async function run() {
    const pool = await sql.connect(databaseConfiguration);
    console.log(`Connected to ${databaseConfiguration.database}`);

    const check = await pool.request().query(`
        SELECT 1
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'PAYMENTS' AND COLUMN_NAME = 'Status'
    `);

    if (check.recordset.length > 0) {
        console.log("Status column already exists — nothing to do.");
    } else {
        await pool.request().query(`
            ALTER TABLE PAYMENTS
            ADD Status VARCHAR(20) NOT NULL
                CONSTRAINT DF_PAYMENTS_Status DEFAULT 'Paid'
        `);
        console.log("Added Status column to PAYMENTS (default 'Paid').");
    }

    const verify = await pool.request().query(`
        SELECT TOP 1 Status FROM PAYMENTS
    `);
    console.log("Sample Status value from PAYMENTS:", verify.recordset[0]);

    await pool.close();
}

run().catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
});
