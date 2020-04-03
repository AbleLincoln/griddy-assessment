const express = require('express')
const stripe = require('stripe')('sk_test_9EXC63FPEjuXMkv2VlJLWUrg00Du9irrKp')
const sqlite = require('sqlite')

const app = express()

// middleware
app.use(express.json())

// routes
app.post('/payments', async (request, response) => {
  const { account_id: accountId, amount } = request.body

  if (!accountId || !amount)
    return response.status(400).send('Must include account_id and amount')

  try {
    // look for customer in db
    const db = await sqlite.open('./griddy.db')

    const user = await db.get(
      `SELECT * FROM users WHERE account_id='${accountId}'`
    )

    let stripeId
    if (user) {
      stripeId = user.stripe_id
    } else {
      const customer = await stripe.customers.create()
      stripeId = customer.id

      db.run(`INSERT INTO users VALUES ('${accountId}', '${stripeId}')`)
    }

    const { id, status } = await stripe.paymentIntents.create({
      amount: parseFloat(amount),
      currency: 'usd',
      customer: stripeId,
    })

    response.send({ id, status, amount })
  } catch (error) {
    response.status(400).send(error)
  }
})

app.get('/:accountId/payments', async (request, response) => {
  const { accountId } = request.params

  try {
    const db = await sqlite.open('./griddy.db')

    const user = await db.get(
      `SELECT * FROM users WHERE account_id='${accountId}'`
    )

    if (!user) {
      return response
        .status(400)
        .send(`User with id ${accountId} does not exist!`)
    }

    const { data } = await stripe.paymentIntents.list({
      customer: user.stripe_id,
    })

    const payments = data.map(({ id, amount, status }) => ({
      id,
      amount,
      status,
    }))

    response.send({ payments })
  } catch (error) {
    response.status(400).send(error)
  }
})

app.listen(5000, () => console.log('Server running on port 5000'))
