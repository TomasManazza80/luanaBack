import { AppDataSource } from './server/database.js';

async function test() {
    await AppDataSource.initialize();
    console.log("SYNC SUCCESS");
    process.exit(0);
}
test();
