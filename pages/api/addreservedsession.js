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

    // console.log(req.body)

    const {email, token, total, day, month, year, startHour, finishHour} = req.body

    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch(err){
        if (!/already exists/.test(err.message)) {
            console.error('Firebase initialization error', err.stack)
        }
    }

    try {

        const sessionsRes = await admin.firestore().collection('reservedSessions')
        .where('month', '==', month)
        .where('day', '==', day)
        .where('year', '==', year)
        .where('isCanceled', '!=', true)
        .get()
        const sessions = sessionsRes.docs.map(session=>session.data())
        // console.log('sessions', sessions)

        const filtered = sessions.filter(session=>{
            return (startHour.msTime <= session.finishHour.msTime && finishHour.msTime >= session.finishHour.msTime) ||
                (finishHour.msTime >= session.startHour.msTime && startHour.msTime <= session.startHour.msTime)
        })

        if(filtered.length === 0){
            //add session to firebase collection
            const session = {
                year, month, day, startHour, finishHour, total,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                isPaid: false,
                isCanceled: false
            }
            const ref = await admin.firestore().collection("reservedSessions").add(session)
            // console.log("ref", ref)
            const privateRef = await ref.collection("privateReservedSessionsData").add({
                email, token
            }) 
            
            try {
                const charge = await stripe.charges.create({
                    amount: total,
                    currency: 'pln',
                    source: token+"1",
                    receipt_email: email
                })  
                // console.log('charge', charge)

                await ref.update({
                    isPaid: true
                })

                await privateRef.update({
                    //charge id, charge receipt
                    chargeId: charge.id,
                    receipt_url: charge.receipt_url
                })

                res.status(200).send('ok'); 

            } catch (error) {
                console.log('error', error.message)
                await ref.update({
                    isCanceled: true
                })
                
                res.status(503).json({
                    message: 'This is an error!'
                });    
            }
               
        }
        
        res.status(409).send({
            message: 'This is an error!'
        })
        
    } catch (error) {
        console.log(error.message)
        res.status(503).json({
            message: 'This is an error!'
        });      
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
