var io = require('socket.io-client');
var chalk = require('chalk');
var random = require('./random');


// **********************************
// ********** Bot Instance **********
// **********************************

var Bot = function (id) {
	this.socket = null;
	this.id = id;
	this.entity_id = null;
	this.input_sequence_number = 0;
	this.connected = false;
	this.lastInputSent = 0;
};

Bot.prototype.Connect = function() {
	var _this = this;

	_this.socket = io.connect(MainServerAddress, {
		reconnection: false
	});


	_this.socket.on('Connected', (entity) => {

		_this.entity_id = entity.entity_id;
		_this.connected = true;

		log('white', ' :: Bot w/ entity_id ' + _this.entity_id + ' :: Connected');

	});

	_this.socket.on('disconnect', function (e) {
		log('white', ' :: Bot w/ entity_id ' + _this.entity_id + ' :: Disconnected | ' + e);
	});

};

Bot.prototype.Disconnect = function() {
	var _this = this;

	_this.socket.disconnect();
};

Bot.prototype.SendPacket = function(Packet, Value) {
	var _this = this;

	_this.socket.emit(Packet, Value);
};



const log = (color, text) => {

  console.log( chalk[color](text) );

};


var NumBots = process.argv[2] || 100;
log('blue', 'Connecting ' + NumBots + ' bots...');
var BotID = 0;
var Bots = [ ];
var MainServerAddress = 'http://localhost:5000';

for ( var i = 0; i < NumBots; i++ ) {

	setTimeout(function () {

		Bots[BotID] = new Bot ( BotID );
		Bots[BotID].Connect();

	}, BotID * 100);

	BotID++;

}

// for ( bot in Bots ) {

// 	setTimeout(function () {

// 		Bots[bot].Connect();

// 	}, 100 * bot)

// }

// ********************************
// ********** Keep Alive **********
// ********************************

setInterval(function () {

	// Just to keep the Bots.js alive even if all Bots are disconnected...

	// And when i've got a interval running, i can use it to send packets to server, to simulate a real client.

	for ( var i = 0; i < NumBots; i++ ) {

		if( Bots[i] && Bots[i].entity_id && Bots[i].connected ) {

			var _this = Bots[i];

			var input = {

				press_time: (_this.lastInputSent == 37) ? 0.016 : -0.016,
				key: _this.lastInputSent

			};

			_this.lastInputSent = (_this.lastInputSent == 39) ? 37 : 39

			input.input_sequence_number = _this.input_sequence_number++;
			input.entity_id = _this.entity_id;

			_this.SendPacket ( 'Key', input );

		}

	}

}, 1000 / 60);