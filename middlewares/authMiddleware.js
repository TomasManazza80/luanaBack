const jwt = require("jsonwebtoken");
const { verifyToken } = require("../services/auth/auth");

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.cookies?.token;

    if (!token) {
        return res.status(401).json({ message: "Acceso no autorizado: Token no proporcionado" });
    }

    try {
        const decoded = await verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Acceso denegado: Token inválido o expirado" });
    }
};

const requireRole = (roles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "No autenticado" });
        }
        
        const userRole = (req.user.role || '').toLowerCase();
        const allowedRoles = Array.isArray(roles) ? roles.map(r => r.toLowerCase()) : [roles.toLowerCase()];

        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Acceso denegado: Permisos insuficientes" });
        }
        
        next();
    };
};

module.exports = {
    authenticateToken,
    requireRole
};
