'use strict';

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

    let interval;
    let { Server } = require('socket.io')
    var axios = require("axios");

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
            ].services.jwt.verify(socket.handshake.query.token);
            //Save the User ID to the socket connection
            socketUserToken = result.id;
            socketUser = result.username
            next();
          } catch (error) {
            console.log(error)
          }
    }).on("connection", function (socket) { 
      socket.emit("welcome", { 
        user: "server",
        text: `${socket.id}, Welcome to the EchoChat`
      });

      // Listening for a session started connection
      socket.on('newSession', async (data) => {
        let strapiData = {
          data : {
            users_permissions_user: data.user,
            start_time: new Date(),
            active: true,
            name: data.name,
          }
        }

        await fetch('http://localhost:1337/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${socket.handshake.query.token}`,
          },
          body: JSON.stringify(strapiData),
        })
        .then(response => {
          if (!response.ok) {
            socket.emit('error',response)
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        }).then(data => {
  console.log('Success:', data);
  socket.emit("message", data);
})
.catch(error => {
  console.error('Error:', error);
});
      })

      // Listening for a sendMessage connection
      socket.on("sendMessage", async (data) => {
        let strapiData = { 
          data: {
            session: data.session,
            users_permissions_user: data.user,
            is_read:true,
            content: data.message,
          },
        };
        await axios
          .post("http://localhost:1337/api/messages", strapiData, {
            headers: {
              Authorization: `Bearer ${socket.handshake.query.token}`,
              'Content-Type': 'application/json',
            },
          })
          .then((e) => {
            socket.emit("message", strapiData);
          })
          .catch((e) => console.log("error", e.message));
      });

      // handle kickout events
      socket.on("kick", (data) => {
        io.sockets.sockets.forEach((socket) => {
          if (socket.id === data.socketid) {
            socket.disconnect();
            socket.removeAllListeners();
            return console.log("kicked", socket.id, data.socketid);
          } else {
            console.log("Couldn't kick", socket.id, data.socketid);
          }
        });
      });

    });
  },
};
