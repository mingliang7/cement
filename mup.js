module.exports = {
 servers: {
   one: {
     host: '128.199.190.236',
     username: 'root',
     // pem: "/home/kevin/.ssh/id_rsa"
     password: 'babyface10'
     // or leave blank for authenticate from ssh-agent
   }
 },

 meteor: {
   name: 'Cement',
   path: '../cement-ls',
   servers: {
     one: {}
   },
   buildOptions: {
     serverOnly: true,
   },
   env: {
     // PORT: 8080,
     ROOT_URL: 'http://128.199.190.236',
     MONGO_URL: 'mongodb://localhost/cement'
   },
   dockerImage: 'abernix/meteord:base',
   deployCheckWaitTime: 120
 },
 mongo: {
   oplog: true,
   port: 27017,
   servers: {
     one: {},
   },
 },
};
