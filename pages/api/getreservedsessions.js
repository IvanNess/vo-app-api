// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

const stripe = require('stripe')(process.env.SECRET_KEY_FROM_STRIPE_DASHBOARD)
var admin = require('firebase-admin');
import Cors from 'cors'
import initMiddleware from '../../init-middleware'

// Initialize the cors middleware
const cors = initMiddleware(
    // You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
    Cors({
        // origin: process.env.ORIGIN,
        origin: false
        // credentials: true
    })
)

const serviceAccount = {
    "type": process.env.TYPE,
    "project_id": process.env.PROJECT_ID,
    "private_key_id": process.env.PRIVATE_KEY_ID,
    "private_key": process.env.PRIVATE_KEY.replace(/\\n/g, '\n') ,
    "client_email": process.env.CLIENT_EMAIL,
    "client_id": process.env.CLIENT_ID,
    "auth_uri": process.env.AUTH_URI,
    "token_uri": process.env.TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.AUTH_PROVIDER_CERT_URL,
    "client_x509_cert_url": process.env.CLIENT_CERT_URL
}  

export default async(req, res) => {
    // console.log('req', req)
    // Run cors
    await cors(req, res)

    // const month = req.query.month;
    // const day = req.query.day;
    // const year = req.query.year;

    const month = req.body.month;
    const day = req.body.day;
    const year = req.body.year;

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch(err){
        if (!/already exists/.test(err.message)) {
            console.error('Firebase initialization error', err.stack)
        }
    }

    try{
        const sessionsRes = await admin.firestore().collection('reservedSessions')
            .where('isCanceled', "!=", true)
            .where('month', '==', month)
            .where('day', '==', day)
            .where('year', '==', year)
            .get()
        const sessions = sessionsRes.docs.map(session=>session.data())

        // console.log('sessions', sessions)
        res.status(200).send(sessions);
    } catch(err){
        console.log(err.message)
        res.status(503).send(err)
    }


    // stripe.charges.create({
    //     amount: total,
    //     currency: 'pln',
    //     source: token,
    //     receipt_email: 'chai@bk.ru',
    //     shipping: {
    //       name: 'test customer',
    //       address: {
    //         line1: "Gdańsk"
    //       }
    //     }
    // }).then(charge => {
    //     console.log('charges', charge)
    //     res.status(200).send(charge);
    // }).catch(e =>{
    //     console.log(e)
    //     res.status(404).send(e);
    // });
}
