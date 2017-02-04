var express = require('express');
var router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
	
	var myCache = req.app.get('myCache');
	
	if (myCache.get("x") == undefined) {
		var x = {
			name: "Vincent",
			hit: 0
		};
		console.log("x is undefined");
		myCache.set("x", x);
	}
	
	x = myCache.get("x");
	x.hit = ++(x.hit);
	myCache.set("x", x);
	
	res.render('index', { title: x.hit });
});

/* Page de login. */
router.get('/view', function(req, res, next) {
	
	
});



module.exports = router;
