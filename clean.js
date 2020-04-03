const sqlite = require('sqlite')

sqlite.open('./griddy.db').then(async (db) => {
  await db.run('drop table users;')
  await db.run(
    'create table users (account_id text primary key, stripe_id text);'
  )
})
