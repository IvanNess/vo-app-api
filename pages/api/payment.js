// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

const stripe = require('stripe')(process.env.SECRET_KEY_FROM_STRIPE_DASHBOARD)
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

export default async(req, res) => {
  // Run cors
    await cors(req, res)

    const total = req.query.total;
    const token = req.query.token;

    console.log(`Payment Request Recieved for the amount : ${total} >>> token: ${token}`)

    stripe.charges.create({
        amount: total,
        currency: 'pln',
        source: token
    }).then(charge => {
        res.status(200).send(charge);
    }).catch(e => console.log(e));
}
