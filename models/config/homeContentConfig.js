const { DataTypes } = require("sequelize");
const Sequelize = require("../../dbconnection/db");

const HomeContentConfig = Sequelize.define("home_content_config", {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('content');
            try {
                return rawValue ? JSON.parse(rawValue) : null;
            } catch (e) {
                return null;
            }
        },
        set(value) {
            this.setDataValue('content', typeof value === 'object' ? JSON.stringify(value) : value);
        }
    }
}, {
    timestamps: true,
    tableName: 'home_content_configs'
});

module.exports = HomeContentConfig;
