module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  socket: {
    enabled: true,
    emitErrors: false,
    serverOptions: {
      cors: {
        origin: ["https://echo-chat-2h3n.onrender.com"],
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      },
    },
  },
  proxy: env.bool('IS_PROXIED', true),
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
