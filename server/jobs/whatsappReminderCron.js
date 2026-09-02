import cron from 'node-cron';
import { AppDataSource } from '../database.js';
import * as whatsappService from '../services/whatsappService.js';
import { Between, In, Not } from 'typeorm';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/index.js';

export const startReminderCron = () => {
    // Check every minute
    cron.schedule('* * * * *', async () => {
        try {
            console.log('[CRON] Verificando recordatorios de WhatsApp...');
            
            const userRepo = AppDataSource.getRepository('User');
            const appointmentRepo = AppDataSource.getRepository('Appointment');
            
            // Find all users who have WhatsApp connected and a reminder template
            const users = await userRepo.find({
                where: { whatsapp_connected: true }
            });
            
            for (const user of users) {
                if (!user.whatsapp_reminder_template) continue;
                
                const reminderMinutes = user.whatsapp_reminder_minutes || 60;
                
                const now = new Date();
                const targetTimeStart = new Date(now.getTime() + reminderMinutes * 60000 - 60000); // Check 1 min window
                const targetTimeEnd = new Date(now.getTime() + reminderMinutes * 60000 + 60000);
                
                const upcomingAppointments = await appointmentRepo.find({
                    where: {
                        professional: { id: user.id },
                        reminder_sent: false,
                        estado: Not(In(['cancelado', 'completado'])), // Exclude cancelled and completed
                        fecha_hora: Between(targetTimeStart, targetTimeEnd)
                    },
                    relations: { patient: true }
                });
                
                for (const appt of upcomingAppointments) {
                    const phone = appt.patient?.datos_contacto?.telefono || appt.patient?.datos_contacto?.phone;
                    if (!phone) continue;
                    
                    let msg = user.whatsapp_reminder_template;
                    msg = msg.replace(/{{patient_name}}/g, appt.patient.nombre || '');
                    msg = msg.replace(/{{date}}/g, format(new Date(appt.fecha_hora), "dd 'de' MMMM", { locale: es }));
                    msg = msg.replace(/{{time}}/g, format(new Date(appt.fecha_hora), 'HH:mm'));
                    msg = msg.replace(/{{service}}/g, appt.motivo || 'Turno');
                    msg = msg.replace(/{{professional_name}}/g, user.name || '');

                    try {
                        await whatsappService.sendMessage(user.id, phone, msg);
                        appt.reminder_sent = true;
                        await appointmentRepo.save(appt);
                        console.log(`[CRON] Recordatorio enviado para turno ID ${appt.id}`);
                    } catch (error) {
                        console.error(`[CRON] Error enviando recordatorio para turno ID ${appt.id}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('[CRON] Error global en el proceso de recordatorios:', error);
        }
    });
};
