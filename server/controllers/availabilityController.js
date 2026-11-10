import { AppDataSource } from '../database.js';

const resolveProfessionalId = (req) => {
    const authUserId = parseInt(req.user?.userId ?? req.user?.id);
    const requestedId = parseInt(req.query?.professional_id ?? req.body?.professional_id);
    const isAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
    if (isAdmin && !isNaN(requestedId)) {
        return requestedId;
    }
    return authUserId;
};

export const getAvailability = async (req, res) => {
    try {
        const professionalId = resolveProfessionalId(req);
        if (!professionalId || isNaN(professionalId)) {
            return res.status(400).json({ message: "No se pudo identificar al profesional" });
        }

        const availabilityRepo = AppDataSource.getRepository('Availability');
        const availabilities = await availabilityRepo.find({
            where: { professional: { id: professionalId } }
        });

        res.status(200).json({ data: availabilities });
    } catch (error) {
        console.error("Error in getAvailability:", error);
        res.status(500).json({ message: "Error getting availability", details: error.message });
    }
};

export const saveAvailability = async (req, res) => {
    try {
        const professionalId = resolveProfessionalId(req);
        if (!professionalId || isNaN(professionalId)) {
            return res.status(400).json({ message: "No se pudo identificar al profesional" });
        }

        const { schedules, exceptions } = req.body;

        const availabilityRepo = AppDataSource.getRepository('Availability');
        
        // Remove old availability ONLY for this specific professional
        const existing = await availabilityRepo.find({
            where: { professional: { id: professionalId } }
        });
        if (existing.length > 0) {
            await availabilityRepo.remove(existing);
        }

        const newAvailabilities = [];

        // Save schedules
        if (schedules && Array.isArray(schedules)) {
            for (const sched of schedules) {
                newAvailabilities.push(
                    availabilityRepo.create({
                        professional: { id: professionalId },
                        day_of_week: sched.day_of_week,
                        start_time: sched.start_time,
                        end_time: sched.end_time,
                        session_duration: sched.session_duration || 30,
                        is_exception: false
                    })
                );
            }
        }

        // Save exceptions (cancelled days for this professional)
        if (exceptions && Array.isArray(exceptions)) {
            const seenDates = new Set();
            for (const exc of exceptions) {
                if (!exc?.exception_date) continue;
                const cleanDate = String(exc.exception_date).substring(0, 10);
                if (seenDates.has(cleanDate)) continue;
                seenDates.add(cleanDate);

                newAvailabilities.push(
                    availabilityRepo.create({
                        professional: { id: professionalId },
                        is_exception: true,
                        exception_date: cleanDate,
                        exception_title: exc.exception_title || 'Día cancelado'
                    })
                );
            }
        }

        await availabilityRepo.save(newAvailabilities);

        res.status(200).json({ message: "Availability saved successfully", data: newAvailabilities });
    } catch (error) {
        console.error("Error in saveAvailability:", error);
        res.status(500).json({ message: "Error saving availability", details: error.message });
    }
};
