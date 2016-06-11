var express = require('express');
var http = require('http');
var io = require('socket.io');
var chalk = require('chalk');
var random = require('./random');
var uuid = require('node-uuid');

var app = express();

var server = http.createServer(app);


// Custom CONSOLE.LOG function that uses Chalk

const log = (color, text) => {

  console.log( chalk[color](text) );

};

// Run Express on port 5000

server.listen(5000);
log( 'green' , ' :: Express App :: Running');

app.get('*', (req, res) => {
	res.sendFile(__dirname + req.url);
});




var socket = io.listen(server);

var _now = function () { return +new Date }

var ServerNetwork = function () {

	log( 'blue' , 'ServerNetwork Module init');

	this.Messages = [];
	this.Fake_Lag_MS = 0;

	var _this = this;

	socket.on('connection', (Client) => {

		var ID = server.Connection( Client );

		log('white', ' :: User :: Connected | ' + ID);

		Client.on('Key', (Data) => {

			_this.Messages.push({
				timestamp: _now(),
				payload: Data
			});

		});

		Client.on('cmd', (Data) => {

			var cmd = Data[0];
			var val = Data[1];

			if(cmd == '/sv_tickrate') {

				StopServerInterval();
				StartServerInterval(val);

			}

			if(cmd == '/sv_fake_lag') {
				this.Fake_Lag_MS = val;
			}

			if(cmd == '/sv_exit') {
				process.exit();
			}

			log('blue', ' :: Command :: Got following command packet: { Cmd: '+cmd+', Val: '+val+' }');

		});



		Client.on('disconnect', (e) => {

			log('white', ' :: User :: Disconnected | ' + ID + ' | ' + e);

			server.Disconnect(Client, e, ID);

		});

	});

};

ServerNetwork.prototype.Send = function(Packet, Val, Socket) {

	Socket = Socket || socket;

	setTimeout(function () {
		Socket.emit(Packet, Val);
	}, this.Fake_Lag_MS);

};

ServerNetwork.prototype.getMessages = function () {

	var now = _now();

	for ( var i = 0; i < this.Messages.length; i++ ) {
		var message = this.Messages[i];

		if(message.timestamp <= now) {
			this.Messages.splice(i, 1);
			return message.payload;
		}

	}
};

var Entity = function () {
	this.x = 0;
	this.y = 0;
	this.speed = 0;
};

Entity.prototype.applyInput = function (input) {
	if([37, 39].indexOf(input.key) > -1) {
		this.x += input.press_time*this.speed;
	}
	if([38, 40].indexOf(input.key) > -1) {
		this.y += input.press_time*this.speed;
	}
};


var Server = function () {

	this.clients = { };
	this.entities = { };

	this.sockets = { };

	this.last_processed_input = [];

	this.network = new ServerNetwork();

};

Server.prototype.Connection = function(Socket) {

	var ID = uuid();

	var entity = new Entity();
	entity.entity_id = ID;

	this.sockets[ID] = Socket;

	entity.x = random(50, 450);
	entity.y = random(50, 450);
	entity.speed = 200;

	this.entities[ID] = entity;
	this.clients[ID] = Socket;

	this.network.Send('Connected', entity, Socket);

	return entity.entity_id;

};

Server.prototype.Disconnect = function(Socket, Event, ID) {
	
	delete this.sockets[ID];
	delete this.entities[ID];
	delete this.clients[ID];

};

Server.prototype.update = function() {
	
	this.processInputs();
	this.sendWorldState();

};

Server.prototype.validateInput = function(input) {
		
	if(Math.abs(input.press_time) > 1 / 40) {
		return false;
	}

	return true;

};

Server.prototype.processInputs = function() {

	while ( true ) {

		var message = this.network.getMessages();

		if(!message) break;

		if(this.validateInput(message)) {
			var id = message.entity_id;
			this.entities[id].applyInput(message);
			this.last_processed_input[id] = message.input_sequence_number;
		}

	}

};

Server.prototype.sendWorldState = function() {

	var worldState = [];
	var num_clients = this.clients.length;

	for ( Client in this.clients ) {
		var entity = this.entities[Client];

		worldState.push({
			entity_id: entity.entity_id,
			x: entity.x,
			y: entity.y,
			speed: entity.speed,
			last_processed_input: this.last_processed_input[Client],
			timestamp: _now()
		});

	}

	for ( Socket in this.sockets ) {
		Socket = this.sockets[Socket];

		this.network.Send('serverstate', worldState, Socket);

	}

};

var server = new Server();

var updateServer = function() {


  server.update();



};

var server_interval;

var StartServerInterval = function (Tickrate) {

	server_interval = setInterval(updateServer, 1000 / Tickrate);

};

var StopServerInterval = function () {

	clearInterval(server_interval);

};

StartServerInterval(5);