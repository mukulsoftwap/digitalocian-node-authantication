var express 	= require('express');
var app         = express();
var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
var User   = require('./app/models/user'); // get our mongoose model
var port = process.env.PORT || 80;
mongoose.connect(config.database);
app.set('superSecret', config.secret);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(morgan('dev'));

app.get('/', function(req, res) {
	res.send('Hello! The API is at http://localhost:' + port + '/api');
});

var apiRoutes = express.Router(); 

apiRoutes.post('/register', function(req, res) {
	if(req.body.name!=="" && req.body.password!=""){
		console.log(req.body.name);
		User.findOne({name: req.body.name},function(err, user){
			console.log(user);
			if(user!=null){
				res.status(400).send({ success: false,message: 'User Already Exists..' });
			}else{
				var nick = new User({
					name: req.body.name,
					password: req.body.password
				});
				nick.save(function(err) {
					if (err) throw err;

					console.log('User saved successfully');
					res.json({ success: true,message: 'User Created..' });
				});
			}
		})
	}else{
		res.status(404).send({ success: false,message: 'Something Went Wrong..' });
	}
});

apiRoutes.post('/login', function(req, res) {
	console.log("login "+req.body.name);
	User.findOne({
		name: req.body.name
	}, function(err, user) {
		console.log("login "+user);
		if (err) throw err;

		if (!user) {
			res.status(404).send({ success: false,message: 'Authentication failed. User not found.' });
		} else if (user) {
			console.log("userpass "+ user.password);
			console.log("sendedpass "+ req.body.password);
			// check if password matches
			if (user.password != req.body.password) {
				res.status(404).send({ success: false,message: 'Authentication failed. Wrong password.' });
			} else {

				// if user is found and password is right
				// create a token
				var token = jwt.sign(user, app.get('superSecret'), {
					expiresIn: 86400 // expires in 24 hours
				});

				res.json({
					success: true,
					message: 'successfully login',
					token: token,
					user: user
				});
			}		

		}

	});
});

apiRoutes.use(function(req, res, next) {

	// check header or url parameters or post parameters for token
	var token = req.body.token || req.param('token') || req.headers['x-access-token'];

	// decode token
	if (token) {

		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {			
			if (err) {
				return res.json({ success: false, message: 'Failed to authenticate token.' });		
			} else {
				// if everything is good, save to request for use in other routes
				req.decoded = decoded;	
				next();
			}
		});

	} else {

		// if there is no token
		// return an error
		return res.status(403).send({ 
			success: false, 
			message: 'No token provided.'
		});
		
	}
	
});

apiRoutes.get('/', function(req, res) {
	res.json({ message: 'Welcome to the coolest API on earth!' });
});

apiRoutes.get('/users', function(req, res) {
	User.find({}, function(err, users) {
		res.json(users);
	});
});

apiRoutes.get('/check', function(req, res) {
	res.json(req.decoded);
});

app.use('/api', apiRoutes);

app.listen(port);
console.log('Magic happens at http://localhost:' + port);
