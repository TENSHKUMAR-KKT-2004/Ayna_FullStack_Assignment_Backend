module.exports = ({ env }) => ({
	io: {
		enabled: true,
		config: {
			socket: {
				serverOptions: {
					cors: {
						origin: 'https://echo-chat-2h3n.onrender.com/', methods: ['GET', 'POST'],allowedHeaders: ["my-custom-header"],
						credentials: true,
					},
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
	upload: {
		config: {
			provider: 'cloudinary',
			providerOptions: {
				cloud_name: env('CLOUDINARY_NAME'),
				api_key: env('CLOUDINARY_KEY'),
				api_secret: env('CLOUDINARY_SECRET'),
			},
			actionOptions: {
				upload: {},
				delete: {},
			},
		},
	},
});
