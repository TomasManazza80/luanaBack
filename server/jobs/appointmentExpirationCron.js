import cron from 'node-cron';
import { AppDataSource } from '../database.js';
import { In, LessThanOrEqual } from 'typeorm';

export const expireOverdueAppointments = async () => {
    try {
        if (!AppDataSource.isInitialized) return 0;
        const appointmentRepo = AppDataSource.getRepository('Appointment');
        const now = new Date();

        const result = await appointmentRepo
            .createQueryBuilder()
            .update('Appointment')
            .set({
                estado: 'EXPIRED',
                payment_status: 'expired'
            })
            .where('estado IN (:...states)', { states: ['PENDING_PAYMENT', 'pendiente_pago'] })
            .andWhere(
                '(expires_at IS NOT NULL AND expires_at <= :now) OR (expires_at IS NULL AND created_at <= :fallbackTime)',
                {
                    now,
                    fallbackTime: new Date(now.getTime() - 15 * 60 * 1000)
                }
            )
            .execute();

        if (result.affected > 0) {
            console.log(`[EXPIRATION] ${result.affected} turno(s) vencido(s) marcado(s) como EXPIRED.`);
        }
        return result.affected || 0;
    } catch (error) {
        console.error('[EXPIRATION] Error expirando turnos vencidos:', error);
        return 0;
    }
};

export const startExpirationCron = () => {
    // Ejecutar cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
        await expireOverdueAppointments();
    });
};

