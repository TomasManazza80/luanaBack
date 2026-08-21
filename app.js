const dotenv = require('dotenv');
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

dotenv.config();

const reqRoute = (p) => {
    const m = require(p);
    return m.default || m;
};

// Rutas
const indexRouter = reqRoute('./routes/index.js');
const usersRouter = reqRoute('./routes/users.js');
const productRouter = reqRoute('./routes/product.js');
const reparacionesRouter = reqRoute('./routes/encargosRoutes.js');
const paymentRouter = reqRoute('./routes/paymentRoutes.js');
const productBought = reqRoute('./routes/productBoughtRoute.js');
const recaudationRouter = reqRoute('./routes/recaudationRoutes.js');
const pagoCaja = reqRoute('./routes/pagoCajaRoutes.js');
const recaudacionFinalRouter = reqRoute('./routes/recaudacionFinalRoutes.js');
const balanceMensualRouter = reqRoute('./routes/balance/balanceMensualRoutes.js');
const egresosRouter = reqRoute('./routes/balance/egresosRoutes.js');
const balancePersonalRouter = reqRoute('./routes/balance/balancePersonalRoutes.js');
const gastosMensualesRouter = reqRoute('./routes/balance/gastosMensualesRoutes.js');
const deudaPersonalRouter = reqRoute('./routes/balance/deudaPersonalRoutes.js');
const contenidoRouter = reqRoute('./routes/cargaDeContenidoRoutes/contenidoRoutes.js');
const devolucionProductosRouter = reqRoute('./routes/devolucionProductos/devolucionProductosRoutes.js');
const remitoRouter = reqRoute('./routes/remito/remitoRoutes.js');
const gastosRouter = reqRoute('./routes/gastosRoutes.js');
const qrRouter = reqRoute('./routes/qrRoutes.js');
const ventasEcommerceRouter = reqRoute('./routes/ventasEcommerce/ventasEcommerceRoutes.js');
const reportRouter = reqRoute('./routes/reportRoutes.js');
const clientRouter = reqRoute('./routes/clientRoutes.js');
const imagekitRouter = reqRoute('./routes/imagekitRoutes.js');
const categoryRouter = reqRoute('./routes/categoryRoutes.js');
const providerRouter = reqRoute('./routes/providerRoutes.js');
const successCasesRouter = reqRoute('./routes/successCase/successCaseRoutes.js');
const heroSliderRouter = reqRoute('./routes/heroSlider/heroSliderRoutes.js');
const pronunciationRouter = reqRoute('./routes/pronunciationRoutes.js');
const homeContentRouter = reqRoute('./routes/homeContentRoutes.js');

const app = express();

// Settings
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(logger('dev'));
// Se reduce el límite global a un valor más seguro.
// Rutas específicas que necesiten más (ej. carga de archivos) deben manejarlo individualmente.
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use('/egresos', egresosRouter);
// Rutas
console.log("SERVER_INIT: Registering middleares and routes...");
app.use('/', indexRouter);
app.use('/', usersRouter);
app.use('/', productRouter);
app.use('/ecommerce', ventasEcommerceRouter);
app.use('/payment', paymentRouter);
app.use('/boughtProduct', productBought);
app.use('/recaudation', recaudationRouter);
app.use('/encargos', reparacionesRouter);
app.use('/pagoCaja', pagoCaja);
app.use('/recaudacionFinal', recaudacionFinalRouter);
app.use('/balanceMensual', balanceMensualRouter);
app.use('/balancePersonal', balancePersonalRouter);
app.use('/gastosMensuales', gastosMensualesRouter);
app.use('/deudaPersonal', deudaPersonalRouter);
app.use('/contenido', contenidoRouter);
app.use('/devolucionProductos', devolucionProductosRouter);
app.use('/remito', remitoRouter);
app.use('/gastos', gastosRouter);
app.use('/qr', qrRouter);
app.use('/api/whatsapp', qrRouter);
app.use('/reports', reportRouter);
app.use('/api/auth/imagekit', imagekitRouter);
app.use('/', clientRouter);
app.use('/api/categories', categoryRouter);
app.use('/', providerRouter);

app.use('/success-cases', successCasesRouter);
app.use('/api/hero-slider', heroSliderRouter);
app.use('/api/pronunciation', pronunciationRouter);
app.use('/home-content', homeContentRouter);
// Kinesio Routes (ES Module)
let kinesioRouter = null;
let kinesioRouterError = null;

let publicRouterEsm = null;
let publicRouterError = null;

// Initialize Kinesio DB connection and routes
Promise.all([
    import('./server/database.js').then(db => db.AppDataSource.initialize()),
    import('./server/routes/kinesioRoutes.js'),
    import('./server/routes/publicRoutes.js')
])
    .then(([db, kinesioModule, publicModule]) => {
        kinesioRouter = kinesioModule.default || kinesioModule;
        publicRouterEsm = publicModule.default || publicModule;
        console.log("Kinesio DB and routes loaded successfully.");
    })
    .catch(err => {
        kinesioRouterError = err;
        publicRouterError = err;
        console.error("Error loading kinesio/public modules:", err);
    });

app.use('/api/kinesio', (req, res, next) => {
    if (kinesioRouter) {
        return kinesioRouter(req, res, next);
    }
    if (kinesioRouterError) {
        return next(new Error("Kinesio routes error: " + kinesioRouterError.message + "\n" + kinesioRouterError.stack));
    }
    next(new Error("Kinesio routes not loaded yet."));
});

app.use('/api/public', (req, res, next) => {
    if (publicRouterEsm) {
        return publicRouterEsm(req, res, next);
    }
    if (publicRouterError) {
        return next(new Error("Public routes error: " + publicRouterError.message + "\n" + publicRouterError.stack));
    }
    next(new Error("Public routes not loaded yet."));
});

// Catch 404
app.use((req, res, next) => {
    next(createError(404));
});

// Error handler
app.use((err, req, res, next) => {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status || 500);
    res.render('error');
});

// Exporta la aplicación para que el script 'www.js' pueda importarla y arrancar el servidor.
module.exports = app;