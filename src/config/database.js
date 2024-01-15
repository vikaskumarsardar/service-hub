/**
 * Database Configuration
 */

module.exports = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/on-demand-platform',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
};

