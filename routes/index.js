var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

});

/* Page de login. */
router.get('/view', function(req, res, next) {
	
	
});

router.post('/start', function(req, res, next) {
	
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	
	var jeu = {};
	jeu.etat = "pret";
	jeu.joueurs = initJoueurs();
	jeu.tour = Math.floor(Math.random() * 4);
	console.log(jeu);
	
	ref.set(jeu);
	
	res.status(200);
	res.end("Success");
});

function initJoueurs() {
	var joueurs = [];
	var paquet = createPaquet();
	var current;
	var i = 0;

	
	for (var j=0; j<4; j++) {
		joueurs[j] = {}
		joueurs[j].main = [];
		joueurs[j].enJeu = [];
		joueurs[j].pts = 0;
		joueurs[j].IA = false;
	}
	
	
	while ((current = paquet.pop()) != undefined) {
		joueurs[i].main.push(current);
		i= ++i%4
	}
	
	return joueurs;
}

function getEtat(req) {
	var myCache = req.app.get("myCache");
	return myCache.get("jeu");
}

function setEtat(req, jeu) {
	var myCache = req.app.get("myCache");
	myCache.set("jeu", jeu);
}

function createPaquet() {
	var genre = ['Trefle', 'Pique', 'Coeur', 'Carreau'];
	var paquet = [];
	
	
	genre.forEach(
		function(item, index) {
			for (var i=1; i<=13; i++) {
				var carte = {
					genre: item,
					numero: i
				}
				paquet.push(carte);
			}
			
		}
	)
	
	return shuffle(paquet);
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}



module.exports = router;
