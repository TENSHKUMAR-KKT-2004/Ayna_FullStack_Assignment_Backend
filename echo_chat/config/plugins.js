module.exports = () => ({
    io: {
		enabled: true,
		config: {
			contentTypes: ['api::article.article'],
            socket: {
				serverOptions: {
					cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
				},
			},
		},
	},
	graphql: {
		config: {
		  endpoint: '/graphql',
		  shadowCRUD: true,
		  playgroundAlways: false,
		  depthLimit: 15,
		  amountLimit: 100,
		  apolloServer: {
			tracing: false,
		  },
		},
	  },
});
