const GlobalConfig = require('../models/gastos/GlobalConfig');

exports.getReservationFee = async (req, res) => {
  try {
    const config = await GlobalConfig.findOne({ where: { key: 'RESERVATION_FEE' } });
    if (!config) {
      // Default to 0 if not set
      return res.status(200).json({ value: 0 });
    }
    res.status(200).json({ value: parseFloat(config.value) });
  } catch (error) {
    console.error('Error fetching reservation fee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.setReservationFee = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount === undefined || isNaN(amount)) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    // Usar upsert para crear o actualizar
    const [config, created] = await GlobalConfig.upsert({
      key: 'RESERVATION_FEE',
      value: amount.toString(),
      description: 'Tarifa o seña requerida para agendar un turno'
    });

    res.status(200).json({ message: 'Tarifa actualizada con éxito', value: parseFloat(config.value) });
  } catch (error) {
    console.error('Error setting reservation fee:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
