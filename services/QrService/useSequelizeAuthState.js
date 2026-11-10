const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');
const { Op } = require('sequelize');
const WhatsappSession = require('../../models/whatsappSession');

const useSequelizeAuthState = async () => {
    const readData = async (id) => {
        try {
            const data = await WhatsappSession.findOne({ where: { id } });
            if (data && data.data) {
                return JSON.parse(data.data, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error('Error leyendo sesión de DB:', error.message);
            return null;
        }
    };

    const writeData = async (id, data) => {
        try {
            const dataString = JSON.stringify(data, BufferJSON.replacer);
            await WhatsappSession.upsert({ id, data: dataString });
        } catch (error) {
            console.error('Error guardando sesión en DB:', error.message);
        }
    };

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
                    if (!ids || ids.length === 0) return data;
                    try {
                        const fullKeys = ids.map(id => `${type}-${id}`);
                        const rows = await WhatsappSession.findAll({
                            where: { id: { [Op.in]: fullKeys } }
                        });
                        for (const row of rows) {
                            if (row && row.data) {
                                const id = row.id.substring(type.length + 1);
                                data[id] = JSON.parse(row.data, BufferJSON.reviver);
                            }
                        }
                    } catch (err) {
                        console.error('Error batch reading keys from DB:', err.message);
                    }
                    return data;
                },
                set: async (data) => {
                    const records = [];
                    const deleteIds = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                records.push({
                                    id: key,
                                    data: JSON.stringify(value, BufferJSON.replacer)
                                });
                            } else {
                                deleteIds.push(key);
                            }
                        }
                    }

                    if (records.length > 0) {
                        await WhatsappSession.bulkCreate(records, {
                            updateOnDuplicate: ['data', 'updatedAt']
                        }).catch(err => console.error('Error bulk saving keys:', err.message));
                    }
                    if (deleteIds.length > 0) {
                        await WhatsappSession.destroy({
                            where: { id: { [Op.in]: deleteIds } }
                        }).catch(err => console.error('Error deleting keys:', err.message));
                    }
                }
            }
        },
        saveCreds: () => {
            return writeData('creds', creds);
        }
    };
};

module.exports = useSequelizeAuthState;
