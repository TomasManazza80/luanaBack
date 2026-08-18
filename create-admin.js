const { createUser } = require('./services/userServices');
const { model } = require('./models/index');
const { authHash } = require('./services/auth/auth');

async function run() {
    const email = 'tomas.manazza8@gmail.com';
    const password = '155332332Tomas';
    const name = 'Tomas Manazza';
    const number = '0000000000';
    const role = 'admin';
    
    try {
        let user = await model.user.findOne({ where: { email } });
        if (user) {
            console.log("User already exists. Updating role to admin and resetting password...");
            const EncyPass = await authHash(password);
            await user.update({ role: 'admin', password: EncyPass, name });
            console.log("Updated user successfully!");
        } else {
            console.log("Creating new user...");
            const result = await createUser({ name, email, password, number, role });
            console.log("Created user result:", result);
        }
    } catch (e) {
        console.error("Error creating/updating user:", e);
    } finally {
        process.exit(0);
    }
}
run();
