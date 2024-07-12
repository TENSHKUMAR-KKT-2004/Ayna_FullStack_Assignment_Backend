'use strict'

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) { },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {

    let interval
    let { Server } = require('socket.io')
    var axios = require("axios")

    var io = new Server(strapi.server.httpServer, {
      cors: {
        origin: "https://echo-chat-2h3n.onrender.com/*",
        methods: ["GET", "POST"],
        allowedHeaders: ["my-custom-header"],
        credentials: true,
      }
    })

    var socketUser = ''
    var socketUserToken = ''
    io.use(async (socket, next) => {
      try {
        //Socket Authentication
        let result = await strapi.plugins[
          'users-permissions'
        ].services.jwt.verify(socket.handshake.query.token)
        socketUserToken = result.id
        socketUser = result.username
        console.log(`Socket authenticated: ${socketUser}`)

        next()
      } catch (error) {
        console.error('Socket authentication failed:', error)
        next(new Error('Authentication error'))
      }
    }).on("connection", function (socket) {
      console.log(`New client connected: ${socket.id}`);

      socket.emit("welcome", {
        user: "server",
        text: `Welcome to EchoChat, your socket id - ${socket.id}`
      })

      socket.on("sendMessage", async (data) => {

        if (!data.sessionId) {
          const sessionCount = await strapi.db.query('api::session.session').count({
            where: {
              users_permissions_user: data.userId,
            },
          });

          const newSession = await strapi.db.query('api::session.session').create({
            data: {
              name: `Session ${sessionCount + 1}`,
              start_time: new Date(),
              active: true,
              last_message: data.message,
              users_permissions_user: data.userId,
              publishedAt: new Date()
            },
          });

          const newMessage = [
            {
              session: newSession.id,
              users_permissions_user: data.userId,
              is_read: true,
              sender: data.username,
              content: data.message,
            },
            {
              session: newSession.id,
              users_permissions_user: data.userId,
              is_read: true,
              sender: 'server',
              content: data.message,
            },
          ];

          try {
            const token = socket.handshake.query.token;
            const headers = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
            const sendMessage = async (message) => {
              const response = await fetch('https://genuine-confidence-10f0398c7f.strapiapp.com/api/messages', {
                method: 'POST',
                headers,
                body: JSON.stringify({ data: message }),
              });
              return response.json();
            };

            const firstResponse = await sendMessage(newMessage[0]);
            const secondResponse = await sendMessage(newMessage[1]);

            socket.emit('newSession', { newSession })
            socket.emit('resMessage', [firstResponse, secondResponse]);
          } catch (error) {
            console.error('Error:', error);
            socket.emit('resMessageError', 'Failed to fetch messages');
          }

        } else {
          const messages = [
            {
              session: data.sessionId,
              users_permissions_user: data.userId,
              is_read: true,
              sender: data.username,
              content: data.message,
            },
            {
              session: data.sessionId,
              users_permissions_user: data.userId,
              is_read: true,
              sender: 'server',
              content: data.message,
            },
          ]

          try {
            const sessionToUpdate = await strapi.db.query('api::session.session').update({
              where: { id: data.sessionId },
              data: {
                start_time: new Date(),
                last_message: data.message
              },
            })

            const token = socket.handshake.query.token;
            const headers = {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }
            const sendMessage = async (message) => {
              const response = await fetch('https://genuine-confidence-10f0398c7f.strapiapp.com/api/messages', {
                method: 'POST',
                headers,
                body: JSON.stringify({ data: message }),
              });
              return response.json();
            };

            const firstResponse = await sendMessage(messages[0]);
            const secondResponse = await sendMessage(messages[1]);

            socket.emit('updatedSession', sessionToUpdate)
            socket.emit('resMessage', [firstResponse, secondResponse]);
          } catch (error) {
            console.error('Error:', error)
            socket.emit('resMessageError', 'Failed to fetch messages')
          }
        }
      })

      socket.on('fetchMessages', async ({ userId, sessionId }) => {
        try {
          const messages = await strapi.db.query('api::message.message').findMany({
            where: {
              users_permissions_user: userId,
              session: sessionId,
            },
            populate: ['users_permissions_user', 'session'],
          });

          socket.emit('messages', { messages });
        } catch (error) {
          socket.emit('messages', { error: 'Failed to fetch messages' });
        }
      })

      socket.on('deleteSession', async ({ userId, sessionId }) => {

        try {
          const messagesToDelete = await strapi.db.query('api::message.message').findMany({
            where: { session: sessionId },
          });

          const messageIds = messagesToDelete.map(message => message.id);

          await strapi.db.query('api::message.message').deleteMany({
            where: { id: { $in: messageIds } },
          });

          await strapi.db.query('api::session.session').delete({
            where: { id: sessionId, users_permissions_user: userId },
          });

          socket.emit('sessionDeleted', { sessionId });
        } catch (error) {
          console.error('Error deleting session:', error);
          socket.emit('error', { message: 'Failed to delete session' });
        }

      });

      socket.on("kick", (data) => {
        io.sockets.sockets.forEach((socket) => {
          if (socket.id === data.socketid) {
            socket.disconnect()
            socket.removeAllListeners()
            return console.log("kicked", socket.id, data.socketid)
          } else {
            console.log("Couldn't kick", socket.id, data.socketid)
          }
        })
      })

    })
  },
}
