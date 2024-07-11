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
        origin: "http://localhost:3000",
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
        next()
      } catch (error) {
        console.log(error)
      }
    }).on("connection", function (socket) {

      socket.emit("welcome", {
        user: "server",
        text: `${socket.id}, Welcome to the EchoChat`
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
          ]

          try {
            const token = socket.handshake.query.token;
            const fetchPromises = newMessage.map(message =>
              fetch('http://localhost:1337/api/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: message }),
              })
                .then(response => response.json())
            );

            const responses = await Promise.all(fetchPromises);

            socket.emit('newSession', { newSession })
            socket.emit('resMessage', responses);
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
                last_message:data.message
              },
            })
            
            const token = socket.handshake.query.token;
            const fetchPromises = messages.map(message =>
              fetch('http://localhost:1337/api/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ data: message }),
              })
                .then(response => response.json())
            );

            const responses = await Promise.all(fetchPromises);

            socket.emit('updatedSession',sessionToUpdate)
            socket.emit('resMessage', responses)
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
