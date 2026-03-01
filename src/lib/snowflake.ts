import snowflake from 'snowflake-sdk';

export const executeSnowflakeQuery = async (sqlText: string, binds: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const connection = snowflake.createConnection({
            account: process.env.SNOWFLAKE_ACCOUNT as string,
            username: process.env.SNOWFLAKE_USERNAME as string,
            password: process.env.SNOWFLAKE_PASSWORD as string,
            database: process.env.SNOWFLAKE_DATABASE as string,
            schema: process.env.SNOWFLAKE_SCHEMA as string,
            warehouse: process.env.SNOWFLAKE_WAREHOUSE as string,
        });

        connection.connect((err, conn) => {
            if (err) {
                console.error('Unable to connect to Snowflake:', err.message);
                reject(err);
                return;
            }

            conn.execute({
                sqlText,
                binds,
                complete: (err, stmt, rows) => {
                    if (err) {
                        console.error('Failed to execute statement:', err.message);
                        reject(err);
                    } else {
                        resolve(rows || []);
                    }
                }
            });
        });
    });
};

export const initSnowflakeDatabase = async () => {
    try {
        await executeSnowflakeQuery(`
      CREATE TABLE IF NOT EXISTS SIMULATION_LOGS (
        ID VARCHAR(255) DEFAULT UUID_STRING() PRIMARY KEY,
        POLICY_TEXT VARCHAR(10000),
        AYES INTEGER,
        NAYS INTEGER,
        ABSTAINS INTEGER,
        TURNOUT_PERCENTAGE FLOAT,
        TIMESTAMP TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
      )
    `);
        console.log("Snowflake SIMULATION_LOGS table is ready.");
    } catch (err) {
        console.error("Failed to initialize Snowflake Table:", err);
    }
};
