import { AppDataSource } from '../database.js';
import bcrypt from 'bcryptjs';

function getUserRepo() {
    return AppDataSource.getRepository('User');
}

export async function getAllUsers() {
    return getUserRepo().find({
        select: { id: true, email: true, name: true, role: true, specialty: true, createdAt: true, updatedAt: true }
    });
}

export async function getProfessionals() {
    return getUserRepo().find({
        where: [
            { role: 'EMPLOYEE' },
            { role: 'ADMIN' },
            { role: 'USER' }
        ],
        relations: { patients: true },
        select: { 
            id: true, email: true, name: true, specialty: true, role: true, 
            session_fee: true, require_payment: true, requires_deposit: true, deposit_amount: true, payment_timeout_minutes: true,
            mp_access_token: true, profile_picture: true, service_images: true, is_public: true,
            whatsapp_connected: true, whatsapp_creation_template: true, whatsapp_reminder_template: true, whatsapp_reminder_minutes: true
        }
    });
}

export async function getUserById(id) {
    return getUserRepo().findOne({
        where: { id },
        relations: { patients: true },
        select: {
            id: true, email: true, name: true, role: true, specialty: true,
            session_fee: true, require_payment: true, requires_deposit: true, deposit_amount: true, payment_timeout_minutes: true,
            mp_access_token: true, createdAt: true, updatedAt: true, profile_picture: true, service_images: true, is_public: true,
            whatsapp_connected: true, whatsapp_creation_template: true, whatsapp_reminder_template: true, whatsapp_reminder_minutes: true
        }
    });
}

export async function createUser(userData) {
    const { email, password, firstName, lastName, role, specialty, is_public } = userData;
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Support both name and firstName/lastName formats
    let finalName = userData.name;
    if (!finalName && (firstName || lastName)) {
        finalName = (firstName || '') + ' ' + (lastName || '');
    }

    const userRepo = getUserRepo();

    let newUser = userRepo.create({
        email,
        password: hashedPassword,
        name: finalName ? finalName.trim() : '',
        role: (role || 'USER').toUpperCase(),
        specialty,
        is_public: is_public !== undefined ? is_public : true
    });

    newUser = await userRepo.save(newUser);

    return {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        specialty: newUser.specialty
    };
}

export async function updateUserRole(id, role) {
    await getUserRepo().update(id, { role: role ? role.toUpperCase() : 'USER' });
    return getUserRepo().findOne({
        where: { id },
        select: { id: true, email: true, role: true }
    });
}

export async function updateUser(id, updateData) {
    const allowedFields = [
        'name', 'email', 'role', 'specialty', 'session_fee', 
        'require_payment', 'requires_deposit', 'deposit_amount', 'payment_timeout_minutes',
        'mp_access_token', 'profile_picture', 'service_images', 'is_public',
        'whatsapp_creation_template', 'whatsapp_reminder_template', 'whatsapp_reminder_minutes'
    ];

    const cleanData = {};
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            cleanData[field] = updateData[field];
        }
    }

    if (cleanData.requires_deposit !== undefined && cleanData.require_payment === undefined) {
        cleanData.require_payment = cleanData.requires_deposit;
    } else if (cleanData.require_payment !== undefined && cleanData.requires_deposit === undefined) {
        cleanData.requires_deposit = cleanData.require_payment;
    }

    if (cleanData.deposit_amount !== undefined && cleanData.session_fee === undefined) {
        cleanData.session_fee = cleanData.deposit_amount;
    }

    if (cleanData.role) {
        cleanData.role = cleanData.role.toUpperCase();
    }
    
    await getUserRepo().update(id, cleanData);

    // Si se actualiza la configuración global de seña desde el panel Admin, sincronizar a todos los profesionales
    if (updateData.apply_deposit_globally) {
        const globalDepositFields = {};
        if (cleanData.requires_deposit !== undefined) {
            globalDepositFields.requires_deposit = cleanData.requires_deposit;
            globalDepositFields.require_payment = cleanData.requires_deposit;
        }
        if (cleanData.deposit_amount !== undefined) {
            globalDepositFields.deposit_amount = cleanData.deposit_amount;
        }
        if (cleanData.payment_timeout_minutes !== undefined) {
            globalDepositFields.payment_timeout_minutes = cleanData.payment_timeout_minutes;
        }
        if (cleanData.mp_access_token) {
            globalDepositFields.mp_access_token = cleanData.mp_access_token;
        }
        if (Object.keys(globalDepositFields).length > 0) {
            await getUserRepo()
                .createQueryBuilder()
                .update('User')
                .set(globalDepositFields)
                .execute();
        }
    }
    
    return getUserRepo().findOne({
        where: { id },
        select: {
            id: true, email: true, name: true, role: true, specialty: true,
            session_fee: true, require_payment: true, requires_deposit: true, deposit_amount: true, payment_timeout_minutes: true,
            mp_access_token: true, profile_picture: true, service_images: true, is_public: true,
            whatsapp_connected: true, whatsapp_creation_template: true, whatsapp_reminder_template: true, whatsapp_reminder_minutes: true
        }
    });
}

export async function deleteUser(id) {
    return getUserRepo().delete(id);
}
