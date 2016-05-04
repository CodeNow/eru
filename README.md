# Eru

> Eru is the supreme deity of Arda. He was the single creator, above the Valar, but has delegated most direct action within Eä to the Ainur, including the shaping of the Earth (Arda) itself.


## Charges

Eru has become responsible for the following actions on Runnable:

* Docks, Customer Clusters
  * Quick views of Auto Scale Groups and memory usage
  * Ability to change Auto Scale Group sizes
  * Disable Auto Scale Groups (size to 0)
* Services
  * Provide overview of deployed versions in infrastructure
* Users
  * Moderation
  * Adding to the whitelist
  * Disabling accounts
  * Removing accounts

## Development

This project includes React, Relay, GraphQL, and Express. In order to work on this project and be able to quickly test functionally, the following steps need to be taken:

1. `npm install` to get all dependencies
1. Start a Redis service; connection defined with `REDIS_HOSTNAME` and `REDIS_PORT` environment variables
1. Start a Mongo service; connection defined with `MONGODB_*` environment variables
1. Start a RabbitMQ service; connection defined with `RABBITMQ_*` environment variables

### User Data

In order to make everything function correctly, it is required that you provide a stub of your GitHub user to the development server. This stub is located in `test/fixtures/user-data.js`, and should include the following:

```javascript
export default {
  username: "githubUsername",
  id: githubID, // an integer
  accessToken: "accessToken" // GitHub token w/ org:read access
}
```

### Frontend

To work on the frontend, you simply need to build the GraphQL scheme once and then run the development server.

```bash
npm run build:schema
NODE_ENV=development npm run start:dev-server
```

Open http://localhost:5501/app in your browser. Any changes made to the React application (`app/*`) will be automatically built and the application refreshed.

This _is_ a React application: having the React toolkit extension installed in Chrome will make your life easier.

### Backend

To make changes to the backend, specifically making changes to the data layer, you will need to constantly rebuild the schema - it does not automatically rebuild. The following makes things a little quicker when restarting the server:

```bash
# make changes to `data/*`
npm run build:schema && NODE_ENV=development npm run start:dev-server
```

### Testing

Currently, the only tests that are enforced are the following:

1. `npm run lint` must pass - it uses `standard`
1. `npm run build` must pass - it builds the schema and frontend webpack
