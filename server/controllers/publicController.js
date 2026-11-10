import { AppDataSource } from '../database.js';
import * as userService from '../services/userService.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import moment from 'moment-timezone';
import { Between } from 'typeorm';
import dotenv from 'dotenv';
import * as whatsappService from '../services/whatsappService.js';
import { expireOverdueAppointments } from '../jobs/appointmentExpirationCron.js';
dotenv.config();

const resolveDepositConfig = (prof) => {
    const requiresDeposit = Boolean(prof.requires_deposit ?? prof.require_payment ?? false);
    const rawDeposit = Number(prof.deposit_amount) > 0 ? Number(prof.deposit_amount) : Number(prof.session_fee || 0);
    const timeoutMinutes = Number(prof.payment_timeout_minutes) > 0 ? Number(prof.payment_timeout_minutes) : 15;
    return {
        requires_deposit: requiresDeposit && rawDeposit > 0,
        deposit_amount: rawDeposit,
        payment_timeout_minutes: timeoutMinutes
    };
};

const isAppointmentBlockingSlot = (app, now = new Date()) => {
    const status = (app.estado || '').toUpperCase();
    if (status === 'CANCELLED' || status === 'CANCELADO' || status === 'EXPIRED' || status === 'EXPIRADO') {
        return false;
    }
    if (status === 'PENDING_PAYMENT' || status === 'PENDIENTE_PAGO') {
        if (app.expires_at) {
            return new Date(app.expires_at) > now;
        }
        return moment(now).diff(moment(app.createdAt), 'minutes') <= 15;
    }
    // CONFIRMED, CONFIRMADO, PENDIENTE, COMPLETADO
    return true;
};

const sendAppointmentConfirmationWhatsApp = async (prof, patient, fechaHora, service) => {
    try {
        const phone = patient?.datos_contacto?.telefono || patient?.datos_contacto?.phone;
        const template = prof?.whatsapp_creation_template || prof?.whatsapp_message_template;
        if (!phone || !prof?.whatsapp_connected || !template) return;

        let msg = template;
        msg = msg.replace(/{{patient_name}}/g, patient.nombre || '');
        const dateObj = moment(fechaHora).tz('America/Argentina/Buenos_Aires').locale('es');
        msg = msg.replace(/{{date}}/g, dateObj.format('DD [de] MMMM'));
        msg = msg.replace(/{{time}}/g, dateObj.format('HH:mm'));
        msg = msg.replace(/{{service}}/g, service || 'Turno');
        msg = msg.replace(/{{professional_name}}/g, prof.name || '');

        await whatsappService.sendMessage(prof.id, phone, msg);
    } catch (err) {
        console.error('[WhatsApp Confirmation] Error enviando mensaje:', err.message);
    }
};

export const getPublicProfessionals = async (req, res) => {
    try {
        const professionals = await userService.getProfessionals();
        const availabilityRepo = AppDataSource.getRepository('Availability');
        const allAvailabilities = await availabilityRepo.find({
            relations: { professional: true }
        });

        const publicProfessionals = professionals
            .filter(p => p.is_public === true || p.is_public === 'true' || p.is_public === 1)
            .map(p => {
                const depositCfg = resolveDepositConfig(p);
                const profAvailabilities = allAvailabilities.filter(a => a.professional?.id === p.id);
                const cancelled_dates = profAvailabilities
                    .filter(a => a.is_exception && a.exception_date && !a.start_time)
                    .map(a => typeof a.exception_date === 'string'
                        ? a.exception_date.substring(0, 10)
                        : moment(a.exception_date).format('YYYY-MM-DD')
                    );

                return {
                    id: p.id,
                    name: p.name,
                    specialty: p.specialty,
                    profile_picture: p.profile_picture,
                    service_images: p.service_images,
                    session_fee: Number(p.session_fee || 0),
                    require_payment: depositCfg.requires_deposit,
                    requires_deposit: depositCfg.requires_deposit,
                    deposit_amount: depositCfg.deposit_amount,
                    payment_timeout_minutes: depositCfg.payment_timeout_minutes,
                    cancelled_dates
                };
            });
        res.status(200).json({ data: publicProfessionals });
    } catch (error) {
        console.error("Error getting public professionals:", error);
        res.status(500).json({ message: "Error getting professionals" });
    }
};

export const getAvailableSlots = async (req, res) => {
    try {
        const { professional_id, date } = req.query;
        
        if (!professional_id || !date) {
            return res.status(400).json({ message: "professional_id and date are required" });
        }

        // Evaluación perezosa de turnos expirados
        await expireOverdueAppointments();

        const profId = parseInt(professional_id);
        const requestDate = moment.tz(date, 'YYYY-MM-DD', 'America/Argentina/Buenos_Aires');
        
        if (!requestDate.isValid()) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }

        const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayOfWeek = daysMap[requestDate.day()];
        const targetDateStr = requestDate.format('YYYY-MM-DD');

        const availabilityRepo = AppDataSource.getRepository('Availability');
        const appointmentRepo = AppDataSource.getRepository('Appointment');

        const availabilities = await availabilityRepo.find({
            where: { professional: { id: profId } }
        });

        const exception = availabilities.find(a => {
            if (!a.is_exception || !a.exception_date) return false;
            const excDate = typeof a.exception_date === 'string'
                ? a.exception_date.substring(0, 10)
                : moment(a.exception_date).format('YYYY-MM-DD');
            return excDate === targetDateStr;
        });

        if (exception && !exception.start_time) {
            return res.status(200).json({
                data: [],
                is_cancelled: true,
                exception_title: exception.exception_title || 'Día no disponible'
            });
        }

        const regularSchedules = availabilities.filter(a => !a.is_exception && a.day_of_week === dayOfWeek);

        const startOfDay = requestDate.clone().startOf('day').toDate();
        const endOfDay = requestDate.clone().endOf('day').toDate();

        const existingAppointments = await appointmentRepo.find({
            where: {
                professional: { id: profId },
                fecha_hora: Between(startOfDay, endOfDay)
            }
        });

        const now = new Date();
        const validAppointments = existingAppointments.filter(app => isAppointmentBlockingSlot(app, now));

        let availableSlots = [];

        for (const schedule of regularSchedules) {
            if (!schedule.start_time || !schedule.end_time) continue;
            
            const slotDurationMinutes = schedule.session_duration || 30;
            let currentSlot = moment.tz(`${date} ${schedule.start_time}`, 'YYYY-MM-DD HH:mm', 'America/Argentina/Buenos_Aires');
            const endTime = moment.tz(`${date} ${schedule.end_time}`, 'YYYY-MM-DD HH:mm', 'America/Argentina/Buenos_Aires');

            while (currentSlot.isBefore(endTime)) {
                const slotStart = currentSlot.toDate();
                const slotEnd = moment(currentSlot).add(slotDurationMinutes, 'minutes').toDate();
                
                const isOverlapping = validAppointments.some(app => {
                    const appStart = moment(app.fecha_hora).toDate();
                    const appEnd = app.end_time ? moment(app.end_time).toDate() : moment(appStart).add(30, 'minutes').toDate();
                    return (slotStart < appEnd && slotEnd > appStart);
                });

                if (!isOverlapping) {
                    availableSlots.push(currentSlot.format('HH:mm'));
                }

                currentSlot.add(slotDurationMinutes, 'minutes');
            }
        }

        availableSlots = [...new Set(availableSlots)].sort();

        res.status(200).json({ data: availableSlots });
    } catch (error) {
        console.error("Error getting available slots:", error);
        res.status(500).json({ message: "Error calculating availability", details: error.message });
    }
};

export const createPublicAppointment = async (req, res) => {
    try {
        const { professional_id, date, time, service, patient_name, patient_phone, patient_email } = req.body;
        
        if (!professional_id || !date || !time || !service || !patient_name || !patient_phone) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        await expireOverdueAppointments();

        const profId = parseInt(professional_id);
        const fechaHoraMoment = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', 'America/Argentina/Buenos_Aires');
        const fechaHora = fechaHoraMoment.toDate();

        const userRepo = AppDataSource.getRepository('User');
        const availabilityRepo = AppDataSource.getRepository('Availability');

        const prof = await userRepo.findOne({ where: { id: profId } });
        if (!prof) {
            return res.status(404).json({ message: "Professional not found" });
        }

        const { requires_deposit, deposit_amount, payment_timeout_minutes } = resolveDepositConfig(prof);
        let mpAccessToken = prof.mp_access_token || process.env.MERCADOPAGO_ACCESS_TOKEN;

        if (requires_deposit && !mpAccessToken) {
            const allUsers = await userRepo.find();
            const userWithToken = allUsers.find(u => u.mp_access_token);
            if (userWithToken) {
                mpAccessToken = userWithToken.mp_access_token;
            }
        }

        if (requires_deposit && !mpAccessToken) {
            return res.status(400).json({
                message: "El cobro de seña está activo pero no se ha configurado el Access Token de Mercado Pago."
            });
        }

        const requestDate = moment(date, 'YYYY-MM-DD');
        const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayOfWeek = daysMap[requestDate.day()];
        const targetDateStr = requestDate.format('YYYY-MM-DD');
        
        const profAvailabilities = await availabilityRepo.find({
            where: { professional: { id: profId } }
        });

        const isCancelledDay = profAvailabilities.some(a => {
            if (!a.is_exception || !a.exception_date) return false;
            const excDate = typeof a.exception_date === 'string'
                ? a.exception_date.substring(0, 10)
                : moment(a.exception_date).format('YYYY-MM-DD');
            return excDate === targetDateStr && !a.start_time;
        });

        if (isCancelledDay) {
            return res.status(409).json({
                message: "El profesional no se encuentra disponible en la fecha seleccionada."
            });
        }

        const availabilities = profAvailabilities.filter(a => !a.is_exception && a.day_of_week === dayOfWeek);

        let duration = 30;
        for (const a of availabilities) {
            if (time >= a.start_time && time < a.end_time) {
                duration = a.session_duration || 30;
                break;
            }
        }
        const endTime = moment(fechaHora).add(duration, 'minutes').toDate();
        const now = new Date();
        const expiresAt = requires_deposit ? new Date(now.getTime() + payment_timeout_minutes * 60 * 1000) : null;

        // Transacción atómica para control de concurrencia y bloqueo temporal
        const { newAppointment, patient } = await AppDataSource.transaction(async (transactionalEntityManager) => {
            const patientRepo = transactionalEntityManager.getRepository('Patient');
            const appointmentRepo = transactionalEntityManager.getRepository('Appointment');

            const startOfDay = requestDate.clone().startOf('day').toDate();
            const endOfDay = requestDate.clone().endOf('day').toDate();

            const dayAppointments = await appointmentRepo.find({
                where: {
                    professional: { id: profId },
                    fecha_hora: Between(startOfDay, endOfDay)
                }
            });

            const hasOverlap = dayAppointments
                .filter(app => isAppointmentBlockingSlot(app, now))
                .some(app => {
                    const appStart = new Date(app.fecha_hora);
                    const appEnd = app.end_time ? new Date(app.end_time) : new Date(appStart.getTime() + 30 * 60 * 1000);
                    return (fechaHora < appEnd && endTime > appStart);
                });

            if (hasOverlap) {
                const conflictError = new Error("El horario seleccionado ya no se encuentra disponible.");
                conflictError.statusCode = 409;
                throw conflictError;
            }

            let existingPatient = await patientRepo.findOne({
                where: {
                    nombre: patient_name,
                    professionals: { id: profId }
                }
            });

            if (!existingPatient) {
                existingPatient = patientRepo.create({
                    nombre: patient_name,
                    email: patient_email,
                    datos_contacto: { telefono: patient_phone, email: patient_email },
                    professionals: [{ id: profId }],
                    status: 'activo'
                });
                existingPatient = await patientRepo.save(existingPatient);
            }

            const createdAppt = appointmentRepo.create({
                patient: { id: existingPatient.id },
                professional: { id: profId },
                fecha_hora: fechaHora,
                end_time: endTime,
                motivo: service,
                estado: requires_deposit ? 'PENDING_PAYMENT' : 'CONFIRMED',
                payment_status: requires_deposit ? 'pending' : 'not_required',
                deposit_amount_paid: 0,
                expires_at: expiresAt
            });

            const savedAppt = await appointmentRepo.save(createdAppt);
            return { newAppointment: savedAppt, patient: existingPatient };
        });

        const appointmentRepo = AppDataSource.getRepository('Appointment');

        // Si requiere seña -> Generar Preferencia en Mercado Pago Checkout Pro (SDK v2)
        if (requires_deposit) {
            try {
                const client = new MercadoPagoConfig({ accessToken: mpAccessToken, options: { timeout: 8000 } });
                const preference = new Preference(client);

                const backendUrl = (process.env.PUBLIC_BACKEND_URL || process.env.API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
                const frontendUrl = (process.env.VITE_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
                const formattedDateTime = fechaHoraMoment.format('DD/MM/YYYY HH:mm');

                const prefData = await preference.create({
                    body: {
                        items: [
                            {
                                id: newAppointment.id.toString(),
                                title: `Seña de turno - ${formattedDateTime}`,
                                description: `${service} con ${prof.name}`,
                                quantity: 1,
                                unit_price: Number(deposit_amount),
                                currency_id: 'ARS'
                            }
                        ],
                        external_reference: newAppointment.id.toString(),
                        back_urls: {
                            success: `${frontendUrl}/turnos/exito`,
                            failure: `${frontendUrl}/turnos/error`,
                            pending: `${frontendUrl}/turnos/pendiente`
                        },
                        auto_return: 'approved',
                        notification_url: `${backendUrl}/webhooks/mercadopago?prof_id=${prof.id}`,
                        expires: true,
                        expiration_date_from: now.toISOString(),
                        expiration_date_to: expiresAt.toISOString()
                    }
                });

                newAppointment.mp_preference_id = prefData.id;
                await appointmentRepo.save(newAppointment);

                return res.status(201).json({
                    message: "Reserva temporal creada. Completá el pago de la seña para confirmar el turno.",
                    data: newAppointment,
                    init_point: prefData.init_point,
                    mp_preference_id: prefData.id,
                    deposit_amount: Number(deposit_amount),
                    expires_at: expiresAt.toISOString()
                });
            } catch (mpError) {
                console.error("MercadoPago Preference Error:", mpError);
                // Si falla la creación de la preferencia en MP, cancelamos la reserva temporal para liberar el horario
                newAppointment.estado = 'CANCELLED';
                newAppointment.payment_status = 'preference_error';
                await appointmentRepo.save(newAppointment);
                return res.status(502).json({
                    message: "No se pudo generar el link de pago en Mercado Pago. El horario ha sido liberado, intentá nuevamente."
                });
            }
        }

        // Si NO requiere seña -> Turno confirmado directamente + notificación WhatsApp
        await sendAppointmentConfirmationWhatsApp(prof, patient, fechaHora, service);

        return res.status(201).json({
            message: "Turno confirmado exitosamente",
            data: newAppointment
        });
    } catch (error) {
        if (error.statusCode === 409) {
            return res.status(409).json({ message: error.message });
        }
        console.error("Error creating public appointment:", error);
        res.status(500).json({ message: "Error al crear turno", details: error.message });
    }
};

export const getPublicAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_id } = req.query;
        const appointmentId = parseInt(id);

        if (isNaN(appointmentId)) {
            return res.status(400).json({ message: "ID de turno inválido" });
        }

        await expireOverdueAppointments();

        const appointmentRepo = AppDataSource.getRepository('Appointment');
        let appointment = await appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: { patient: true, professional: true }
        });

        if (!appointment) {
            return res.status(404).json({ message: "Turno no encontrado" });
        }

        // Si viene payment_id en el retorno y el turno aún figura PENDING_PAYMENT, sincronizamos con MP de forma idempotente
        if (payment_id && (appointment.estado === 'PENDING_PAYMENT' || appointment.estado === 'pendiente_pago')) {
            const mpAccessToken = appointment.professional?.mp_access_token || process.env.MERCADOPAGO_ACCESS_TOKEN;
            if (mpAccessToken) {
                try {
                    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
                    const paymentClient = new Payment(client);
                    const paymentInfo = await paymentClient.get({ id: payment_id });

                    if (paymentInfo && String(paymentInfo.external_reference) === String(appointment.id)) {
                        await reconcileAppointmentWithPayment(appointment, paymentInfo);
                        appointment = await appointmentRepo.findOne({
                            where: { id: appointmentId },
                            relations: { patient: true, professional: true }
                        });
                    }
                } catch (verifyErr) {
                    console.warn("[Return Status Sync] No se pudo verificar payment_id en MP:", verifyErr.message);
                }
            }
        }

        return res.status(200).json({
            data: {
                id: appointment.id,
                estado: appointment.estado,
                payment_status: appointment.payment_status,
                deposit_amount_paid: Number(appointment.deposit_amount_paid || 0),
                mp_preference_id: appointment.mp_preference_id,
                mp_payment_id: appointment.mp_payment_id || appointment.payment_id,
                fecha_hora: appointment.fecha_hora,
                end_time: appointment.end_time,
                motivo: appointment.motivo,
                expires_at: appointment.expires_at,
                patient: appointment.patient ? {
                    nombre: appointment.patient.nombre,
                    email: appointment.patient.email,
                    telefono: appointment.patient.datos_contacto?.telefono
                } : null,
                professional: appointment.professional ? {
                    id: appointment.professional.id,
                    name: appointment.professional.name,
                    specialty: appointment.professional.specialty
                } : null
            }
        });
    } catch (error) {
        console.error("Error getting public appointment status:", error);
        return res.status(500).json({ message: "Error al consultar estado del turno" });
    }
};

const reconcileAppointmentWithPayment = async (appointment, paymentInfo) => {
    const appointmentRepo = AppDataSource.getRepository('Appointment');
    const paymentIdStr = String(paymentInfo.id);
    const currentStatus = (appointment.estado || '').toUpperCase();

    // Idempotencia: si ya está confirmado o ya registró este mp_payment_id, no duplicar
    if (
        (currentStatus === 'CONFIRMED' || currentStatus === 'CONFIRMADO') &&
        (appointment.mp_payment_id === paymentIdStr || appointment.payment_id === paymentIdStr)
    ) {
        return { alreadyProcessed: true };
    }

    if (paymentInfo.status === 'approved') {
        if (currentStatus === 'CONFIRMED' || currentStatus === 'CONFIRMADO') {
            return { alreadyProcessed: true };
        }

        const paidAmount = Number(paymentInfo.transaction_amount || 0);
        appointment.estado = 'CONFIRMED';
        appointment.mp_payment_id = paymentIdStr;
        appointment.payment_id = paymentIdStr;
        appointment.payment_status = 'approved';
        appointment.deposit_amount_paid = paidAmount;
        await appointmentRepo.save(appointment);

        // Registrar ingreso automático en finanzas
        if (appointment.professional?.id) {
            const transactionRepo = AppDataSource.getRepository('Transaction');
            const newTransaction = transactionRepo.create({
                title: `Seña Turno #${appointment.id} - ${appointment.motivo || 'Turno'}`,
                subtitle: appointment.patient ? `${appointment.patient.nombre} (MP #${paymentIdStr})` : `Pago Online MP #${paymentIdStr}`,
                amount: paidAmount || Number(appointment.professional.deposit_amount || appointment.professional.session_fee || 0),
                type: 'income',
                category: 'MP_PAYMENT',
                payment_method: 'Mercado Pago',
                date: new Date(),
                professional: { id: appointment.professional.id }
            });
            await transactionRepo.save(newTransaction);
        }

        // Disparar notificación de confirmación
        if (appointment.professional && appointment.patient) {
            await sendAppointmentConfirmationWhatsApp(
                appointment.professional,
                appointment.patient,
                appointment.fecha_hora,
                appointment.motivo
            );
        }

        return { confirmed: true };
    }

    if (paymentInfo.status === 'rejected' || paymentInfo.status === 'cancelled') {
        appointment.payment_status = paymentInfo.status;
        appointment.mp_payment_id = paymentIdStr;
        if (currentStatus === 'PENDING_PAYMENT' || currentStatus === 'PENDIENTE_PAGO') {
            appointment.estado = 'CANCELLED';
        }
        await appointmentRepo.save(appointment);
        return { cancelled: true };
    }

    // in_process / pending
    appointment.payment_status = paymentInfo.status;
    appointment.mp_payment_id = paymentIdStr;
    await appointmentRepo.save(appointment);
    return { pending: true };
};

export const handleMercadoPagoWebhook = async (req, res) => {
    try {
        const { query, body } = req;
        const topic = query.topic || query.type || body?.topic || body?.type;
        const action = body?.action || '';
        const isPaymentEvent = topic === 'payment' || action.startsWith('payment.');

        if (!isPaymentEvent) {
            return res.status(200).json({ received: true, ignored: true });
        }

        const paymentId = body?.data?.id || query['data.id'] || query.id;
        if (!paymentId) {
            return res.status(200).json({ received: true, message: 'No payment ID provided' });
        }

        const userRepo = AppDataSource.getRepository('User');
        const appointmentRepo = AppDataSource.getRepository('Appointment');

        // Determinar el accessToken para consultar el pago en Mercado Pago
        let mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
        const profId = query.prof_id;

        if (profId) {
            const prof = await userRepo.findOne({ where: { id: parseInt(profId) } });
            if (prof?.mp_access_token) {
                mpAccessToken = prof.mp_access_token;
            }
        }

        // Si no vino prof_id ni hay token global, buscar algún profesional con mp_access_token configurado
        if (!mpAccessToken) {
            const profsWithToken = await userRepo.find();
            const foundProf = profsWithToken.find(u => u.mp_access_token);
            if (foundProf) mpAccessToken = foundProf.mp_access_token;
        }

        if (!mpAccessToken) {
            console.error('[MP Webhook] No hay access token disponible para consultar el pago.');
            return res.status(200).json({ received: true });
        }

        const client = new MercadoPagoConfig({ accessToken: mpAccessToken, options: { timeout: 8000 } });
        const paymentClient = new Payment(client);
        const paymentInfo = await paymentClient.get({ id: paymentId });

        if (!paymentInfo || !paymentInfo.external_reference) {
            return res.status(200).json({ received: true });
        }

        const appointmentId = parseInt(paymentInfo.external_reference);
        if (isNaN(appointmentId)) {
            return res.status(200).json({ received: true });
        }

        const appointment = await appointmentRepo.findOne({
            where: { id: appointmentId },
            relations: { patient: true, professional: true }
        });

        if (!appointment) {
            return res.status(200).json({ received: true });
        }

        await reconcileAppointmentWithPayment(appointment, paymentInfo);

        return res.status(200).json({ status: 'OK' });
    } catch (error) {
        console.error('[MP Webhook] Error procesando notificación:', error);
        // Responder siempre 200 OK a Mercado Pago para evitar reintentos infinitos
        return res.status(200).json({ status: 'OK' });
    }
};
