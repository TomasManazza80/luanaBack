const { product } = require("./models/index.js");
const Sequelize = require("./dbconnection/db.js");

const beautyProducts = [
  {
    nombre: "Crema Facial Hidratante Antiedad",
    marca: "L'Oréal",
    categoria: "Skincare",
    proveedor: "Proveedor Local",
    descripcion: "Crema facial de día con ácido hialurónico, especial para mantener la piel hidratada y suave.",
    variantes: [
      {
        color: "Blanco",
        almacenamiento: "50ml",
        stock: 20,
        precioAlPublico: 15000,
        precioRevendedor: 12000,
        precioMayorista: 10000,
        costoDeCompra: 8000
      }
    ]
  },
  {
    nombre: "Serum Vitamina C",
    marca: "Garnier",
    categoria: "Skincare",
    proveedor: "Distribuidora Belleza",
    descripcion: "Serum iluminador con Vitamina C pura, combate manchas y da luminosidad.",
    variantes: [
      {
        color: "Transparente",
        almacenamiento: "30ml",
        stock: 15,
        precioAlPublico: 18500,
        precioRevendedor: 15000,
        precioMayorista: 13000,
        costoDeCompra: 9000
      }
    ]
  },
  {
    nombre: "Esmalte Semipermanente",
    marca: "Meliné",
    categoria: "Uñas",
    proveedor: "Insumos Nails",
    descripcion: "Esmalte en gel UV/LED de larga duración, ideal para manicuría profesional.",
    variantes: [
      {
        color: "Rojo Pasión",
        almacenamiento: "15ml",
        stock: 50,
        precioAlPublico: 4500,
        precioRevendedor: 3500,
        precioMayorista: 3000,
        costoDeCompra: 2000
      },
      {
        color: "Nude Clásico",
        almacenamiento: "15ml",
        stock: 45,
        precioAlPublico: 4500,
        precioRevendedor: 3500,
        precioMayorista: 3000,
        costoDeCompra: 2000
      }
    ]
  }
];

async function seed() {
  try {
    await Sequelize.sync(); // Asegurar que las tablas existan
    console.log("DB sincronizada, eliminando productos anteriores de prueba...");
    
    // Opcional: Eliminar los anteriores si queremos empezar de cero
    // await product.destroy({ where: {} });

    for (const prod of beautyProducts) {
      await product.create(prod);
      console.log(`Producto creado: ${prod.nombre}`);
    }

    console.log("¡Productos ficticios de belleza cargados exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error cargando productos:", error);
    process.exit(1);
  }
}

seed();
