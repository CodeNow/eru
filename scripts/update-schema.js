import fs from 'fs'
import path from 'path'
import { schema } from '../data/schema'
import { graphql } from 'graphql'
import { introspectionQuery, printSchema } from 'graphql/utilities'

// Save JSON of full schema introspection for Babel Relay Plugin to use
graphql(schema, introspectionQuery)
  .then((result) => {
    if (result.errors) {
      console.error(
        'ERROR introspecting schema: ',
        JSON.stringify(result.errors, null, 2)
      )
    } else {
      fs.writeFileSync(
        path.join(__dirname, '../data/schema.json'),
        JSON.stringify(result, null, 2)
      )
    }
  })
  .then(() => {
    // Save user readable type system shorthand of schema
    fs.writeFileSync(
      path.join(__dirname, '../data/schema.graphql'),
      printSchema(schema)
    )
  })
  .then(() => {
    console.log('done!')
  })
