const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const WhatsappSession = require('../../models/whatsappSession'); // Ruta al modelo

const useSequelizeAuthState = async () => {
    // Función auxiliar para leer un dato por ID
    const readData = async (id) => {
        try {
            const data = await WhatsappSession.findOne({ where: { id } });
            if (data && data.data) {
                return JSON.parse(data.data, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error('Error leyendo sesión de DB:', error);
            return null;
        }
    };

    // Función auxiliar para escribir un dato
    const writeData = async (id, data) => {
        try {
            const dataString = JSON.stringify(data, BufferJSON.replacer);
            await WhatsappSession.upsert({ id, data: dataString });
        } catch (error) {
            console.error('Error guardando sesión en DB:', error);
        }
    };

    // Función auxiliar para eliminar un dato
    const removeData = async (id) => {
        try {
            await WhatsappSession.destroy({ where: { id } });
        } catch (error) {
            console.error('Error eliminando sesión en DB:', error);
        }
    };

    // Leer credenciales iniciales
    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData('creds', creds);
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            const value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                data[id] = value;
                            } else if (value) {
                                data[id] = value;
                            }
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(key, value) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData('creds', creds);
        }
    };
};

module.exports = useSequelizeAuthState;
