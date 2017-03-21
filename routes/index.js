var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

});

/* Page de login. */
router.get('/view', function(req, res, next) {
	
	
});

//Retourne le numero de joueur (index) au client pour qu'il sache quel joueur il est.
router.post('/start', function(req, res, next) {
	
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	var numJoueur;
	
	
	var jeu = getEtat(req);
	
	//Si le jeu n'existe pas il faut l'initialiser.
	if (jeu == undefined)
	{
		jeu = {};
		console.log("Jeu etait undefined");
		jeu.etat = "WAITING_FOR_3";
		jeu.joueurs = initJoueurs();
		//C'est le joueur avec le deux de trefle qui commence.
		jeu.tour = trouveDeuxTrefle(jeu.joueurs);
		jeu.coeurBrise = false;
		jeu.compteurTour = 0;
		console.log(jeu);
		numJoueur = 0;
		jeu.placesDispo = [1,2,3];
	}
	else
	{
		//Le jeu est une machine a état finis. On peut jouer lorsqu'il entre dans l'état READY.
		switch (jeu.etat)
		{
			case "WAITING_FOR_4":
				numJoueur = jeu.placesDispo.pop();
				jeu.etat = "WAITING_FOR_3";
				console.log("WAITING_FOR_4");
			break;
			case "WAITING_FOR_3":
				numJoueur = jeu.placesDispo.pop();
				jeu.etat = "WAITING_FOR_2";
				console.log("WAITING_FOR_3");
			break;
			
			case "WAITING_FOR_2":
				numJoueur = jeu.placesDispo.pop();
				jeu.etat = "WAITING_FOR_1";
				console.log("WAITING_FOR_2");
			break;
			
			case "WAITING_FOR_1":
				numJoueur = jeu.placesDispo.pop();
				jeu.etat = "READY";
				if (jeu.compteurTour == 0) {
					//on active tout et on ilimine
					activeToutes(jeu.joueurs, true);
					desactiveAutresJoueurs(jeu.joueurs, jeu.tour);
					//Pas le droit de jouer la dame de pique au premier tour.
					desactiveCarte(jeu.joueurs, { numero: 12, genre: "Pique"});
					//Pas le droit de jouer du coeur au premier tour.
					desactiveCoeur(jeu.joueurs[jeu.tour].main, true);
				}
				console.log("WAITING_FOR_1");
			break;
			default:
				res.status(400);
				var erreur = "/Start appelé lorsqu'on attend pas de joueur.";
				console.log(erreur);
				res.end(erreur);
				return;
		}
	}
	
	console.log("Sortie du if");
	
	ref.set(jeu);
	setEtat(req,jeu);
	
	
	res.status(200);
	res.json({joueur: numJoueur});
});

router.post("/leave", function(req, res, next) {
	console.log("/leave appelé");
	console.log(req.body);
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	var jeu = getEtat(req);
	var numJoueur = req.body.joueur;
	
	if (jeu == undefined) {
		res.status(400);
		var erreur = "Peux pas quitter un jeu non commencé";
		console.log(erreur);
		res.end(erreur);
		return;
	}
	
	switch (jeu.etat) {
		case "READY":
			jeu.etat = "WAITING_FOR_1";
		break;
		case "WAITING_FOR_1":
			jeu.etat = "WAITING_FOR_2";
		break;
		case "WAITING_FOR_2":
			jeu.etat = "WAITING_FOR_3";
		break;
		case "WAITING_FOR_3":
			jeu.etat = "WAITING_FOR_4";
		break;
		default:
			res.status(400);
			res.end("/leave n'est pas permis dans cet etat du jeu.");	
	}
	
	var dejaLa = false;
	
	for (var i=0; i<jeu.placesDispo.length; i++) {
		if (jeu.placesDispo[i] == numJoueur) {
			dejaLa = true;
		}
	}
	
	if (!dejaLa)
		jeu.placesDispo.push(numJoueur);
	
	ref.set(jeu);
	setEtat(req, jeu);
	
	res.status(200);
	console.log(jeu.placesDispo);
	res.end("Success");
});

//Appelé par le client. Il nous envoie une carte et son numero de joueur.
router.post("/jouer", function(req, res, next) {
	
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	var move = req.body;
	var main;
	
	var jeu = getEtat(req);
	
	//Si le jeu n'est pas dans l'etat READY alors on ne devrait pas être ici.
	if (jeu == undefined || jeu.etat != "READY") {
		res.status(400);
		res.end("Pas le droit de jouer tant que le jeu n'a pas commencé");
		return;
	}
	
	//si le numero de joueur n'est pas égal au tour dans l'état du jeu alors c'est pas le tour de ce joueur de jouer.
	if (move.joueur != jeu.tour) {
		res.status(400);
		res.end("Ce n'est pas votre tour.");
		return;
	}
	
	var index;
	
	//Prendre la main du joueur qui joue.
	main = jeu.joueurs[move.joueur].main;

	//Enlever la carte jouée de la main
	index = trouveCarte(main, move.carte);
	main.splice(index, 1);
	
	//Mettre la carte en jeu
	jeu.joueurs[move.joueur].enJeu = move.carte;
	
	//Avancer le tour de 1 si on est pas le dernier tour de la round.
	if (jeu.compteurTour != 3)
		jeu.tour = (jeu.tour+1)%4
	
	//Si le joueur joue du coeur il a brisee le coeur
	if (move.carte.genre == "Coeur")
		jeu.coeurBrise = true;
	
	//On active toutes les cartes et on y va par elimination
	activeToutes(jeu.joueurs, true);
	
	
	
	//C'est le debut d'une round
	if (jeu.compteurTour == 0 ) {
		//On initialise le type de carte demandé au type que le premier joueur de la round a joué.
		jeu.genreDemande = move.carte.genre;
		//Sinon si c'est le dernier tour d'une round.
	} else if (jeu.compteurTour == 3) {
		//On laisse le temps de montrer a tous le monde le dernier move
		jeu.etat = "DELAY";
		ref.set(jeu);
		setEtat(req, jeu);
		
		//Cette fonction s'active après un délai de 5 secondes.
		setTimeout(function(data) {
			var resultat = evaluerRamasse(data.jeu);
			console.log(resultat);
			var ramasseux = data.jeu.joueurs[resultat.joueur];
			
			for (var i=0; i<4; i++) {
				var laCarte = data.jeu.joueurs[i].enJeu;
				ramasseux.pile.push(laCarte);
				data.jeu.joueurs[i].enJeu = {};
			}
			
			ramasseux.pts += resultat.pts;

			//Le tour est a celui qui ramasse
			console.log("Le joueur qui ramasse est: " + (resultat.joueur + 1));
			jeu.tour = resultat.joueur;

			//Si le coeur n'a pas ete brise et que le prochain joueur a autre chose que du coeur.
			//alors on dois desactivé le coeur.
			if (!jeu.coeurBrise && !justeDuCoeur(jeu.joueurs[jeu.tour].main))
				desactiveCoeur(jeu.joueurs[jeu.tour].main, true);

			data.jeu.etat = "READY";
			doRest(data);
		}, 5*1000, {request: req, response: res, jeu: jeu, ref: ref} );
		return;
	}

	//On est au début ou au milieu de la round.
	
	//Si le coeur n'a pas ete brise et que le prochain joueur a autre chose que du coeur.
	//alors on dois desactivé le coeur.
	if (!jeu.coeurBrise && !justeDuCoeur(jeu.joueurs[jeu.tour].main))
		desactiveCoeur(jeu.joueurs[jeu.tour].main, true);

	//Avance le compteur de tour
	jeu.compteurTour = (jeu.compteurTour+1)%4;
	
	//Si le prochain tour est le tour 2,3 ou 4 de la round
	if (jeu.compteurTour != 0 ) {
		//Si le joueur peut repondre au genre demande
		if (resteDu(jeu.joueurs[jeu.tour].main, jeu.genreDemande)) {
			desactiveAutresGenres(jeu.joueurs[jeu.tour].main, jeu.genreDemande);
		} else {
			//sinon il a le droit de jouer du coeur
			desactiveCoeur(jeu.joueurs[jeu.tour].main, false)
		}
	}

	
	desactiveAutresJoueurs(jeu.joueurs, jeu.tour);
	
	
	
	ref.set(jeu);
	setEtat(req, jeu);
	res.status(200);
	res.end("Success");
});

function doRest(data) {
	var res = data.response;
	var req = data.request;
	var jeu = data.jeu;
	var ref = data.ref;
	
	//Avance le compteur de tour
	jeu.compteurTour = (jeu.compteurTour+1)%4;
	
	//Si le prochain tour est le tour 2,3 ou 4 de la round
	if (jeu.compteurTour != 0 ) {
		if (resteDu(jeu.joueurs[jeu.tour].main, jeu.genreDemande)) {
			desactiveAutresGenres(jeu.joueurs[jeu.tour].main, jeu.genreDemande);
		}
	}

	
	desactiveAutresJoueurs(jeu.joueurs, jeu.tour);
	
	
	ref.set(jeu);
	setEtat(req, jeu);
	res.status(200);
	res.end("Success");
}

//Retourne un tableau de 4 joueurs initialisé avec leur 13 cartes.
function initJoueurs() {
	var joueurs = [];
	var paquet = createPaquet();
	var current;
	var i = 0;

	//Initialise les propriétés de chaque objet joueur dans le tableau de joueur.
	for (var j=0; j<4; j++) {
		joueurs[j] = {}
		joueurs[j].main = [];
		joueurs[j].enJeu = [];
		joueurs[j].pts = 0;
		joueurs[j].IA = false;
		joueurs[j].pile = [];
	}
	
	//Distribue les cartes en alternant entre chaque joueur.
	while ((current = paquet.pop()) != undefined) {
		joueurs[i].main.push(current);
		i= ++i%4
	}
	
	return joueurs;
}

//Retourne l'etat du jeu sauvegardé dans la cache
function getEtat(req) {
	var myCache = req.app.get("myCache");
	return myCache.get("jeu");
}

//Sauvegarde l'état du jeu dans la cache
function setEtat(req, jeu) {
	var myCache = req.app.get("myCache");
	myCache.set("jeu", jeu);
}

//Retourne l'index d'une carte dans la main d'un joueur.
function trouveCarte(arr, carte) {
	for (var i=0; i<arr.length; i++) {
		if (arr[i].numero == carte.numero && arr[i].genre == carte.genre) {
			return i;
		}
			
	}
}

//Retourne vrai si une main contient juste du coeur sinon faux.
function justeDuCoeur(main) {
	for (var i=0; i<main.length; i++) {
		if (main[i].genre != "Coeur")
			return false;
	}
	return true;
}

//Si desactive est vrai alors desactive tout le coeur d'une main sinon l'active.
function desactiveCoeur(main, desactive) {
	for (var i=0; i<main.length; i++) {
		if (main[i].genre == "Coeur")
			main[i].valide = !desactive;
	}
}

//Retourne l'index du joueur ayant le deux de trefle
function trouveDeuxTrefle(joueurs) {
	for (var i=0; i<4; i++) {
		for (var j=0; j<joueurs[i].main.length; j++) {
			if (joueurs[i].main[j].numero == 2 && joueurs[i].main[j].genre == "Trefle")
				return i;
		}			
	}
}

//Desactive la carte c passée en paramètre.
function desactiveCarte(joueurs, c) {
	for (var i=0; i<4; i++) {
		joueurs[i].main.forEach(function(carte) {
			if (carte.genre == c.genre && carte.numero == c.numero)
				carte.valide = false;
		});
	}
}

//Desactive toutes les cartes des jouers différent de tour
function desactiveAutresJoueurs(joueurs, tour) {
	for (var i=0; i<4; i++) {
		if (i == tour) continue;
		joueurs[i].main.forEach(function(carte) {
			carte.valide = false;
		});
	}
}

//Desactive toutes les cartes d'une main autre que le genre passé en paramètre.
function desactiveAutresGenres(main, genre) {
	for (var i=0; i<main.length; i++) {
		if (main[i].genre != genre)
			main[i].valide = false;
	}
}

//Retourne vrai s'il reste le genre passez en paramètre dans la main passez en paramètre.
function resteDu(main, genre) {
	for (var i=0; i<main.length; i++) {
		if (main[i].genre == genre)
			return true;
	}
	return false;
}

//Activer toutes les cartes de tous les joueurs.
function activeToutes(joueurs, active) {
	for (var i=0; i<4; i++) {
		joueurs[i].main.forEach(function(carte) {
			carte.valide = active;
		});
	}
}

//Retourne le joueur qui ramasse et le nombre de points qu'il se prends.
function evaluerRamasse(jeu) {
	var max = 0;
	var pts = 0;
	var joueur;
	
	for (var i=0; i<4; i++) {
		var laCarte = jeu.joueurs[i].enJeu
		
		if (laCarte.genre == "Coeur")
			pts++;
		
		if (laCarte.genre == "Pique" && laCarte.numero == 12)
			pts+=13;
		
		//Seulement les cartes du genre demande compte
		if (laCarte.genre == jeu.genreDemande) {
			if (laCarte.numero == 1) {
				max = 9000; //L'as bat tout
				joueur = i;
			} else if (laCarte.numero > max) {
				max = parseInt(laCarte.numero);
				joueur = i;
			}
		}
	}

	
	return { joueur: joueur, pts: pts};
}

//Retourne un tableau de 52 cartes mélangé.
function createPaquet() {
	var genre = ['Trefle', 'Pique', 'Coeur', 'Carreau'];
	var paquet = [];
	
	
	genre.forEach(
		function(item, index) {
			for (var i=1; i<=13; i++) {
				var carte = {
					genre: item,
					numero: i,
					valide: false
				}
				paquet.push(carte);
			}
			
		}
	)
	
	return shuffle(paquet);
}

//Mélange un tableau
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
