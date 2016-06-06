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

### Requirements

This entire project uses Babel to transform a lot of the ES6 code. While one can get away with any version of Node, it is _highly_ recommended that Node `4` or better is used along with npm `3` or better. npm `3` has fixes to do better dependency duplication handling as well as an improved (IMO) shrinkwrap function.

To get all the npm modules, `npm install` will do nicely.

### npm shrinkwrap

This project _does_ have an `npm-shrinkwrap.json` file to maintain consistency

### User Data

In order to make everything function correctly, it is required that you provide a stub of your GitHub user to the development server. This stub is located in `test/fixtures/user-data.js`, and should include the following:

```javascript
module.exports = {
  id: githubID, // an integer
  username: 'githubUsername',
  accessToken: 'accessToken' // GitHub token w/ org:read access
}
```

### Services

To get services up and running for working with Eru, install Docker for Mac (the native one) and run the following:

```bash
npm run start:dev-services
npm run seed-database
```

This will spin up a container each for Redis, RabbitMQ, MongoDB, and Consul, and then populate them with some basic data to give Eru basic functionality.

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
