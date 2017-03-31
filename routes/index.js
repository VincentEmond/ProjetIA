var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

});

/* Page de login. */
router.get('/view', function(req, res, next) {
	
	
});

router.options("/jouerAI", function(req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
  	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
    res.send(200);
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

//Retourne le numero de joueur (index) au client pour qu'il sache quel joueur il est.
router.post('/startAI', function(req, res, next) {
	
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	var numJoueur;
	
	
	var jeu = getEtat(req);
	
	//Si le jeu n'existe pas il faut l'initialiser.
	if (jeu == undefined)
	{
		jeu = {};
		jeu.etat = "READY";
		jeu.joueurs = initJoueursAI();
		//C'est le joueur avec le deux de trefle qui commence.
		jeu.tour = trouveDeuxTrefle(jeu.joueurs);
		jeu.coeurBrise = false;
		jeu.compteurTour = 0;
		numJoueur = 0;
		jeu.placesDispo = [1,2,3];

		if (jeu.compteurTour == 0) {
			//on active tout et on ilimine
			activeToutes(jeu.joueurs, true);
			desactiveAutresJoueurs(jeu.joueurs, jeu.tour);
			//Pas le droit de jouer la dame de pique au premier tour.
			desactiveCarte(jeu.joueurs, { numero: 12, genre: "Pique"});
			//Pas le droit de jouer du coeur au premier tour.
			desactiveCoeur(jeu.joueurs[jeu.tour].main, true);
		}
	}
	else
	{
		//Juste un joueur humain en mode AI
		res.status(400);
		var erreur = "/Start appelé lorsqu'on attend pas de joueur.";
		console.log(erreur);
		res.end(erreur);
		return;
		
	}

	//Il faut voir si c'est l'IA qui joue en premier
	/*while (jeu.joueurs[jeu.tour].IA) {
		var moveIA = IAJouer(jeu);
		jeu = jouer(jeu, moveIA);		
		ref.set(jeu);
		console.log("Carte joue.");
		setEtat(req,jeu);
	}*/
	
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
	if (move.carte.genre == "Coeur" && !jeu.coeurBrise) {
		jeu.coeurBrise = true;

		//Dans le cas echeant on sait que le joueur n'a que du coeur
		if (jeu.compteurTour == 0) {
			jeu.joueurs[move.joueur].aDuCarreau = false;
			jeu.joueurs[move.joueur].aDuPique = false;
			jeu.joueurs[move.joueur].aDuTrefle = false;
		}
	}
		
	
	//On active toutes les cartes et on y va par elimination
	activeToutes(jeu.joueurs, true);
	
	
	
	//C'est le debut d'une round
	if (jeu.compteurTour == 0 ) {
		//On initialise le type de carte demandé au type que le premier joueur de la round a joué.
		jeu.genreDemande = move.carte.genre;
		//Sinon si c'est le dernier tour d'une round.
	} else if (jeu.compteurTour == 3) {

		//Le joueur n'a plus de ce genre dans ses mains.
		if (jeu.genreDemande != move.carte.genre) {
			console.log("Detecte " + jeu.genreDemande + " != " + move.carte.genre);
			switch (jeu.genreDemande) {
				case "Pique":
					jeu.joueurs[move.joueur].aDuPique = false;
				break;
				case "Trefle":
					jeu.joueurs[move.joueur].aDuTrefle = false;
				break;
				case "Coeur":
					jeu.joueurs[move.joueur].aDuCoeur = false;
				break;
				case "Carreau":
					jeu.joueurs[move.joueur].aDuCarreau = false;
				break;
			}
		}

		//On laisse le temps de montrer a tous le monde le dernier move
		jeu.etat = "DELAY";
		ref.set(jeu);
		setEtat(req, jeu);
		
		//Cette fonction s'active après un délai de 5 secondes.
		setTimeout(function(data) {
			var resultat = evaluerRamasse(data.jeu);
	
			var ramasseux = data.jeu.joueurs[resultat.joueur];
			
			for (var i=0; i<4; i++) {
				var laCarte = data.jeu.joueurs[i].enJeu;
				ramasseux.pile.push(laCarte);
				data.jeu.joueurs[i].enJeu = {};
			}
			
			ramasseux.pts += resultat.pts;


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

	//Le joueur n'a plus de ce genre dans ses mains.
	if (jeu.genreDemande != move.carte.genre) {
		console.log("Detecte " + jeu.genreDemande + " != " + move.carte.genre);
		switch (jeu.genreDemande) {
			case "Pique":
				jeu.joueurs[move.joueur].aDuPique = false;
			break;
			case "Trefle":
				jeu.joueurs[move.joueur].aDuTrefle = false;
			break;
			case "Coeur":
				jeu.joueurs[move.joueur].aDuCoeur = false;
			break;
			case "Carreau":
				jeu.joueurs[move.joueur].aDuCarreau = false;
			break;
		}
	}
	
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

//Appelé par le client. Il nous envoie une carte et son numero de joueur.
router.post("/jouerAI", function(req, res, next) {
	
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
	if (move.carte.genre == "Coeur" && !jeu.coeurBrise) {
		jeu.coeurBrise = true;

		//Dans le cas echeant on sait que le joueur n'a que du coeur
		if (jeu.compteurTour == 0) {
			jeu.joueurs[move.joueur].aDuCarreau = false;
			jeu.joueurs[move.joueur].aDuPique = false;
			jeu.joueurs[move.joueur].aDuTrefle = false;
		}
	}
		
	
	//On active toutes les cartes et on y va par elimination
	activeToutes(jeu.joueurs, true);
	
	
	
	//C'est le debut d'une round
	if (jeu.compteurTour == 0 ) {
		//On initialise le type de carte demandé au type que le premier joueur de la round a joué.
		jeu.genreDemande = move.carte.genre;
		//Sinon si c'est le dernier tour d'une round.
	} else if (jeu.compteurTour == 3) {

		//Le joueur n'a plus de ce genre dans ses mains.
		if (jeu.genreDemande != move.carte.genre) {
			console.log("Detecte " + jeu.genreDemande + " != " + move.carte.genre);
			switch (jeu.genreDemande) {
				case "Pique":
					jeu.joueurs[move.joueur].aDuPique = false;
				break;
				case "Trefle":
					jeu.joueurs[move.joueur].aDuTrefle = false;
				break;
				case "Coeur":
					jeu.joueurs[move.joueur].aDuCoeur = false;
				break;
				case "Carreau":
					jeu.joueurs[move.joueur].aDuCarreau = false;
				break;
			}
		}

		//On laisse le temps de montrer a tous le monde le dernier move
		jeu.etat = "DELAY";
		ref.set(jeu);
		setEtat(req, jeu);
		
		//Cette fonction s'active après un délai de 5 secondes.
		setTimeout(function(data) {
			var resultat = evaluerRamasse(data.jeu);
	
			var ramasseux = data.jeu.joueurs[resultat.joueur];
			
			for (var i=0; i<4; i++) {
				var laCarte = data.jeu.joueurs[i].enJeu;
				ramasseux.pile.push(laCarte);
				data.jeu.joueurs[i].enJeu = {};
			}
			
			ramasseux.pts += resultat.pts;

	
			jeu.tour = resultat.joueur;

			//Si le coeur n'a pas ete brise et que le prochain joueur a autre chose que du coeur.
			//alors on dois desactivé le coeur.
			if (!jeu.coeurBrise && !justeDuCoeur(jeu.joueurs[jeu.tour].main))
				desactiveCoeur(jeu.joueurs[jeu.tour].main, true);

			data.jeu.etat = "READY";
			doRestAI(data);
		}, 5*1000, {request: req, response: res, jeu: jeu, ref: ref} );
		return;
	}

	//On est au début ou au milieu de la round.

	//Le joueur n'a plus de ce genre dans ses mains.
	if (jeu.genreDemande != move.carte.genre) {
		console.log("Detecte " + jeu.genreDemande + " != " + move.carte.genre);
		switch (jeu.genreDemande) {
			case "Pique":
				jeu.joueurs[move.joueur].aDuPique = false;
			break;
			case "Trefle":
				jeu.joueurs[move.joueur].aDuTrefle = false;
			break;
			case "Coeur":
				jeu.joueurs[move.joueur].aDuCoeur = false;
			break;
			case "Carreau":
				jeu.joueurs[move.joueur].aDuCarreau = false;
			break;
		}
	}
	
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
	

	//fais jouer l'IA
	/*while (jeu.joueurs[jeu.tour].IA && !gagnant(jeu)) {
		var moveIA = IAJouer(jeu);
		jeu = jouer(jeu, moveIA);
		ref.set(jeu);
		console.log("Carte joue.");
		setEtat(req,jeu);
	}*/

	ref.set(jeu);
	setEtat(req, jeu);

	var gagnants = gagnant(jeu);

	if (gagnants)
	{
		console.log("Partie termine le ou le ou les gagnant sont: ");
		for (var i = 0; i< gagnants.length; i++)
		 	console.log(gagnants[i]);
	}

	res.header('Access-Control-Allow-Origin', '*');
  	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

	res.status(200);
	res.end("Success");
});

//Appelé par le client. Il nous envoie une carte et son numero de joueur.
router.post("/nextMove", function(req, res, next) {
	try {
	var db = res.app.get('firebase').database();
	var ref = db.ref("jeu");
	
	var jeu = getEtat(req);
	
	//Si le jeu n'est pas dans l'etat READY alors on ne devrait pas être ici.
	if (jeu == undefined || jeu.etat != "READY") {
		res.status(400);
		res.end("Pas le droit de jouer tant que le jeu n'a pas commencé");
		return;
	}
	
	if (!jeu.joueurs[jeu.tour].IA) {
		res.status(400);
		res.end("Pas le tour d'une IA");
		return;
	}
	
	var moveIA = IAJouer(jeu);
	jeu = jouer(jeu, moveIA);

	ref.set(jeu);
	setEtat(req, jeu);

	var gagnants = gagnant(jeu);

	if (gagnants)
	{
		console.log("Partie termine le ou le ou les gagnant sont: ");
		for (var i = 0; i< gagnants.length; i++)
		 	console.log(gagnants[i]);
	}

	res.header('Access-Control-Allow-Origin', '*');
  	res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  	res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

	res.status(200);
	res.end("Success");
	} catch(err) {console.log(err);}
});

function doRestAI(data) {
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

	console.log("Dans doRestAI");

	/*while (jeu.joueurs[jeu.tour].IA) {
		console.log("AI round finale");
		var moveIA = IAJouer(jeu);
		console.log(moveIA);
		jeu = jouer(jeu, moveIA);
		console.log("Tour est maintenant " + jeu.tour);
		ref.set(jeu);
		console.log("Carte joue.");
		setEtat(req,jeu);
	}*/
	
	
	ref.set(jeu);
	setEtat(req, jeu);
	res.status(200);
	res.end("Success");
}

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
		joueurs[j].aDuCoeur = true;
		joueurs[j].aDuTrefle = true;
		joueurs[j].aDuPique = true;
		joueurs[j].aDuCarreau = true;
	}
	
	//Distribue les cartes en alternant entre chaque joueur.
	while ((current = paquet.pop()) != undefined) {
		joueurs[i].main.push(current);
		i= ++i%4
	}
	
	return joueurs;
}

function initJoueursAI() {
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
		joueurs[j].IA = j > 0;
		joueurs[j].pile = [];
		joueurs[j].aDuCoeur = true;
		joueurs[j].aDuTrefle = true;
		joueurs[j].aDuPique = true;
		joueurs[j].aDuCarreau = true;
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

function printMains(etat) {
	for (var i=0; i<etat.joueurs.length; i++) {
		var joueur = etat.joueurs[i];
		console.log("Joueur: " + i);
		console.log("nbCartes: " + joueur.main.length);

		for (var j=0; j<joueur.main.length; j++) {
			console.log(joueur.main[j]);
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

//Retourne un tableau avec les cartes qu'on peut jouer dedans.
function getCartesValides(etat) {
	var lesMoveValides = [];
	var main = etat.joueurs[etat.tour].main;

	for (var i = 0; i < main.length; i++) {
		var carte = main[i];

		if (carte.valide)
			lesMoveValides.push(carte);
	}
	return lesMoveValides;
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
					valide: false,
					etat: "rien"
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

//fonction de debogage pour s'assurer que les devinettes de l'IA fonctionne correctement.
function afficherDevinette(jeu) {
	for (var i=0; i<jeu.joueurs.length; i++) {
		var joueur = jeu.joueurs[i];

		console.log("Le joueur " + (i+1));
		console.log("A du coeur: " + joueur.aDuCoeur);
		console.log("A du carreau: " + joueur.aDuCarreau);
		console.log("A du pique: " + joueur.aDuPique);
		console.log("A du trefle: " + joueur.aDuTrefle);

	}
}

function jouer(etat, move) {
	var main;
	
	var jeu = etat;
	
	//Si le jeu n'est pas dans l'etat READY alors on ne devrait pas être ici.
	if (jeu == undefined || jeu.etat != "READY") {
		console.log("Bug IA: Pas le droit de jouer tant que le jeu n'a pas commencé");
		return;
	}
	
	//si le numero de joueur n'est pas égal au tour dans l'état du jeu alors c'est pas le tour de ce joueur de jouer.
	if (move.joueur != jeu.tour) {
		console.log("Bug IA: Ce n'est pas votre tour.");
		return;
	}

	if (!move.carte.valide) {
		console.log("Bug IA: La carte jouée est illégale");
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
	if (move.carte.genre == "Coeur" && !jeu.coeurBrise) {
		jeu.coeurBrise = true;

		//Dans le cas echeant on sait que le joueur n'a que du coeur
		if (jeu.compteurTour == 0) {
			jeu.joueurs[move.joueur].aDuCarreau = false;
			jeu.joueurs[move.joueur].aDuPique = false;
			jeu.joueurs[move.joueur].aDuTrefle = false;
		}
	}
	
	//On active toutes les cartes et on y va par elimination
	activeToutes(jeu.joueurs, true);
	
	
	
	//C'est le debut d'une round
	if (jeu.compteurTour == 0 ) {
		//On initialise le type de carte demandé au type que le premier joueur de la round a joué.
		jeu.genreDemande = move.carte.genre;
		//Sinon si c'est le dernier tour d'une round.
	} else if (jeu.compteurTour == 3) {



		//Le joueur n'a plus de ce genre dans ses mains.
		if (jeu.genreDemande != move.carte.genre) {
			switch (jeu.genreDemande) {
				case "Pique":
					jeu.joueurs[move.joueur].aDuPique = false;
				break;
				case "Trefle":
					jeu.joueurs[move.joueur].aDuTrefle = false;
				break;
				case "Coeur":
					jeu.joueurs[move.joueur].aDuCoeur = false;
				break;
				case "Carreau":
					jeu.joueurs[move.joueur].aDuCarreau = false;
				break;
			}
		}

		var resultat = evaluerRamasse(jeu);
		var ramasseux = jeu.joueurs[resultat.joueur];
		
		for (var i=0; i<4; i++) {
			var laCarte = jeu.joueurs[i].enJeu;
			ramasseux.pile.push(laCarte);
			jeu.joueurs[i].enJeu = {};
		}
		
		ramasseux.pts += resultat.pts;


		jeu.tour = resultat.joueur;

		//Si le coeur n'a pas ete brise et que le prochain joueur a autre chose que du coeur.
		//alors on dois desactivé le coeur.
		if (!jeu.coeurBrise && !justeDuCoeur(jeu.joueurs[jeu.tour].main))
			desactiveCoeur(jeu.joueurs[jeu.tour].main, true);

		//Avance le compteur de tour
		jeu.compteurTour = (jeu.compteurTour+1)%4;
		
		//Si le prochain tour est le tour 2,3 ou 4 de la round
		if (jeu.compteurTour != 0 ) {
			if (resteDu(jeu.joueurs[jeu.tour].main, jeu.genreDemande)) {
				desactiveAutresGenres(jeu.joueurs[jeu.tour].main, jeu.genreDemande);
			}
		}

	
		desactiveAutresJoueurs(jeu.joueurs, jeu.tour);

		return etat;
	}

	//On est au début ou au milieu de la round.

	//Le joueur n'a plus de ce genre dans ses mains.
	if (jeu.genreDemande != move.carte.genre) {
		switch (jeu.genreDemande) {
			case "pique":
				jeu.joueurs[move.joueur].aDuPique = false;
			break;
			case "trefle":
				jeu.joueurs[move.joueur].aDuTrefle = false;
			break;
			case "coeur":
				jeu.joueurs[move.joueur].aDuCoeur = false;
			break;
			case "carreau":
				jeu.joueurs[move.joueur].aDuCarreau = false;
			break;
		}
	}

	
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

	return etat;
}

//La fonction d'IA
//Pour l'instant c'est un algorithme stupide qui choisi un move valide au hasard.
/*function IAJouer(etat) {
	var tour = etat.tour;
	var moveValides = getCartesValides(etat);
	var i = getRandomInt(0, moveValides.length);
	var carteChoisie = moveValides[i];
	return { joueur: tour, carte: carteChoisie };
}*/

function Node(nbVisites, nbVictoires, joueur, parent, level, choix) {
	this.nbVisites = nbVisites;
	this.nbVictoires = nbVictoires;
	this.parent = parent;
	this.children = [];
	this.joueur = joueur;
	this.etat = null;
	this.level = level;
	this.choix = choix;

	this.knowAllStats = function() {
		if (!this.children || this.children.length == 0)
			return false;
		
		for (var i=0; i<this.children.length; i++) {
			if (this.children[i].etat == null)
				return false;
		}

		return true;
	}
	this.selectionUCB = function() {
		var max = -1;
		var indexMax = -1;
		
		for (var i = 0; i<this.children.length; i++) {
			var child = this.children[i];
			var moyenne = child.nbVictoires / child.nbVisites;
			var ni = child.nbVisites;
			var n = this.nbVisites;
			var c = 1.4 //Param d'exploration
			var ucb = moyenne + c*Math.sqrt((2*Math.log(n))/ni);
			
			if (ucb >= max) {
				max = ucb;
				indexMax = i;
			}
		}

		return indexMax;
	}
	this.selectionBest = function() {
		var max = -1;
		var indexMax = -1;	
		
		for (var i = 0; i<this.children.length; i++) {
			var child = this.children[i];
			var moyenne = child.nbVictoires / child.nbVisites;
			
			if (moyenne >= max) {
				max = moyenne;
				indexMax = i;
			}
		}

		return indexMax;
	}
	this.getRandomInt = function (min, max) {
  		min = Math.ceil(min);
  		max = Math.floor(max);
  		return Math.floor(Math.random() * (max - min)) + min;
	}
	this.selectionExpansion = function() {
		var indexChoix = 0;

		do {
			indexChoix = this.getRandomInt(0, this.children.length);
		} while (this.children[indexChoix].visited());

		return indexChoix;
	}
	this.visited = function () {
		return this.etat != null;
	}
	this.setEtat = function(etat) {
		this.etat = etat;
		var moveValides = getCartesValides(this.etat);

		for (var i=0; i<moveValides.length; i++) {
			this.children.push(new Node(0,0,this.etat.tour, this, this.level + 1, i));
		}
	}
	this.printNode = function() {
		console.log("\tNode: " + this.level + "-" + this.choix + " (" + this.nbVictoires + "/" + this.nbVisites + ") " + "J" + this.joueur);
	}
	this.printAllChildrens = function() {
		for (var i = 0; i<this.children.length; i++) {
			this.children[i].printNode();
		}
	}

}

function IAJouer(etat) {
	try {

	
		var tour = etat.tour;
		
		var etatRech = copierEtat(etat);		//copies utilisées pour la recherche
		
		var it=0;

		//Initialisation de l'arbre de jeu

		var root = new Node(0,0,tour,null, 0, 0); 	//emplacement de départ
		printMains(etatRech);
		devinerCartes(etatRech);
		printMains(etatRech);
		root.setEtat(etatRech);
		

		var begin = Date.now();

		//Calcul pendant 5 secondes.
		while ((Date.now() -  begin) < (5*1000)) {
			var current = root;
			current.printNode();

			//Phase de selection
			it++;
			console.log("Iteration: " + it);
			console.log("Phase de selection");
			console.log("\tTour: " + tour);
			console.log("\tnbDeChoix: " + current.children.length + " Toutes les stats: " + current.knowAllStats());
			while (current.knowAllStats()) {
				var isel = current.selectionUCB();
				current = current.children[isel];
				current.printNode();
			}

			//Phase d'expansion
			console.log("Phase d'expansion");
			var etatExpansion = copierEtat(current.etat);
			var moves = getCartesValides(etatExpansion);
			var indexExpansion;

			//Si on peut faire l'expansion
			if (moves && moves.length > 0) {
				indexExpansion = current.selectionExpansion();
				etatExpansion = jouer(etatExpansion, { joueur: etatExpansion.tour, carte: moves[indexExpansion] });
				current.children[indexExpansion].setEtat(etatExpansion);
				current = current.children[indexExpansion];
				current.printNode();
			} 
			else {
				console.log("\tOn est dans un etat final. Pas d'expansion.")
			}
			

			//Phase de simulation
			console.log("Phase de simulation");
			var etatSimulation = copierEtat(current.etat);
			var lesGagnants = gagnant(etatSimulation);

			while (!lesGagnants) {
				var move = selectionAleatoire(etatSimulation);
				etatSimulation = jouer(etatSimulation, move);
				lesGagnants = gagnant(etatSimulation);
			}

			console.log("\tLa partie est terminee les joueurs gagnant sont: " + lesGagnants)

			//Phase de propagation arriere
			console.log("Phase de propagation arriere");
			while (current != null) {
				current.nbVisites++;
				for (var i = 0; i<lesGagnants.length; i++) {
					if (current.joueur == lesGagnants[i]) {
						current.nbVictoires++;
						break;
					}
				}
				current.printNode();
				current = current.parent;
					
			}
		}
		
		var indexIAChoix = root.selectionBest();
		var moveValidesIA = getCartesValides(root.etat);
		console.log("All childrens");
		root.printAllChildrens()
		console.log("Selected");
		root.children[indexIAChoix].printNode();

		return { joueur: root.etat.tour, carte: moveValidesIA[indexIAChoix] };
	}
	catch (err) {
		console.log(err);
	}

}

function devinerCartes(etat) {
	var paquet = createPaquet();
	var joueursLengths = [];
	var carteRestantes = [];
	var joueurDeuxTrefle = trouveDeuxTrefle(etat.joueurs);

	console.log("DevinerCarte: Je suis joueur: " + etat.tour);

	for (var i=0; i<etat.joueurs.length; i++) {
		
		if (etat.tour != i)
		{
			joueursLengths.push(etat.joueurs[i].main.length);
			etat.joueurs[i].main = [];
		}
		else
		{
			joueursLengths.push(0);
		}
			
	}

	console.log("NbCartes chaque joueurs: " + joueursLengths);

	for (var i=0; i<paquet.length; i++) {
		if (!carteObservee(etat, paquet[i])) {
			if (!(paquet[i].genre == "Trefle" && paquet[i].numero == 2))
				carteRestantes.push(paquet[i]);
		}
			
	}

	if (!carteObservee(etat, {numero: 2, genre:"Trefle"}))	{
		console.log("Donner deux de trefle a " + joueurDeuxTrefle);
		etat.joueurs[joueurDeuxTrefle].main.push({genre:"Trefle", numero: 2, valide: false, etat: "rien"});
		joueursLengths[joueurDeuxTrefle]--;
		console.log("Nb carte a distribue: " + (carteRestantes.length + 1));
	}
	else {
		console.log("Nb carte a distribue: " + carteRestantes.length);
	}



	for (var i=0; i<carteRestantes.length; i++) {
		var carte = carteRestantes[i];
		var j = 0;

		
		switch (carte.genre) {
			case "Trefle":
				while (joueursLengths[j] == 0 || !etat.joueurs[j].aDuTrefle) {
					j++;
					if (j > 3)
						console.log("j est out of bound: " + j);
				}
			break;
			case "Coeur":
				while (joueursLengths[j] == 0 || !etat.joueurs[j].aDuCoeur) {
						j++;
						if (j > 3)
						console.log("j est out of bound: " + j);
					}
			break;
			case "Carreau":
				while (joueursLengths[j] == 0 || !etat.joueurs[j].aDuCarreau) {
							j++;
							if (j > 3)
						console.log("j est out of bound: " + j);
						}
			break;
			case "Pique":
				while (joueursLengths[j] == 0 || !etat.joueurs[j].aDuPique) {
						j++;
						if (j > 3)
						console.log("j est out of bound: " + j);
					}
			break;
		}

		etat.joueurs[j].main.push(carte);
		joueursLengths[j]--;
		
	}

	console.log("NbCartes chaque joueurs: " + joueursLengths);

}

function carteObservee(etat, carte) {

	for (var i=0; i<etat.joueurs.length; i++) {
		var joueur = etat.joueurs[i];

		if(joueur.enJeu && 
		joueur.enJeu.numero == carte.numero && 
		joueur.enJeu.genre == carte.genre) {
			return true;
		}

		if (joueur.pile) {
			for (var j=0; j<joueur.pile.length; j++) {
				var pileCarte = joueur.pile[j];

				if (pileCarte.genre == carte.genre && pileCarte.numero == carte.numero)
					return true;
			}
		}

		if (i == etat.tour) {
			if (joueur.main) {
				for (var j = 0; j<joueur.main.length; j++) {
					var pileCarte = joueur.main[j];

					if (pileCarte.genre == carte.genre && pileCarte.numero == carte.numero)
						return true;
				}
			}
		}
	}

	return false;

}

function selectionAleatoire(etat) {
	var tour = etat.tour;
	var moveValides = getCartesValides(etat);
	var i = getRandomInt(0, moveValides.length);
	var carteChoisie = moveValides[i];
	return { joueur: tour, carte: carteChoisie };
}

//Retourne un nombre entier aleatoire entre min et max peut etre = a min mais est < que max.
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

//Retourne une liste de gagnant. Il peut y avoir plusieurs joueur a egalite. Si le jeu n'est pas termine
//retourne false. Si le jeu est termine regarde aussi si un joueur a fais un controle.
function gagnant(etat) {

	var joueurs = etat.joueurs;
	var indexControle = -1;
	var min = 9999;
	var indexMin = [];
	var acum = 0;

	for (var i=0; i<joueurs.length; i++) {
		
		if (!joueurs[i].pile)
			return false;
		else
			acum += joueurs[i].pile.length;

		if (joueurs[i].pts == 26)
			indexControle = i;
	}

	//La partie est termine
	if (acum == 52) {
		if (indexControle != -1) {
			for (var i=0; i<joueurs.length; i++) {
				if (i == indexControle)
					joueurs[i].pts = 0;
				else
					joueurs[i].pts = 26;
			}
		}

		//Calcule le ou les gagnant.
		for (var i=0; i<joueurs.length; i++) {		
			if (joueurs[i].pts < min) {
				indexMin = [];
				indexMin.push(i);
				min = joueurs[i].pts;
			} 
			else if (joueurs[i].pts == min) {
				indexMin.push(i);
			}
		}

		return indexMin;
	}

	return false;

}

function wait(ms) {
	var begin = Date.now();
	var mtn = Date.now();

	while ((mtn - begin) < ms) {
		mtn = Date.now();
	}
		
}

function copierEtat(etat)
{
	var copie = {};
	copie.coeurBrise = etat.coeurBrise;
	copie.compteurTour = etat.compteurTour;
	copie.etat = etat.etat;
	copie.genreDemande = etat.genreDemande;
	copie.tour = etat.tour;
	copie.joueurs = [];

	if (etat.joueurs) {

		//Copie chaque joueurs
		for (var i = 0; i<etat.joueurs.length; i++) {
			var joueur = {};
			var courrant = etat.joueurs[i];
			joueur.IA = courrant.IA;
			joueur.pts = courrant.pts;
			joueur.aDuCarreau = courrant.aDuCarreau;
			joueur.aDuCoeur = courrant.aDuCoeur;
			joueur.aDuPique = courrant.aDuPique;
			joueur.aDuTrefle = courrant.aDuTrefle;

			if (courrant.main) {
				var main = [];

				//Copie la main
				for (var j = 0; j<courrant.main.length; j++) {
					var carte = {};
					var carteCour = courrant.main[j];

					carte.genre = carteCour.genre;
					carte.numero = carteCour.numero;
					carte.valide = carteCour.valide;
					carte.etat = carteCour.etat;

					main.push(carte);
				}

				joueur.main = main;
			}
			
			//Copie la pile (carte ramassees)
			if (courrant.pile) {
				var pile = [];

				for (var j = 0; j<courrant.pile.length; j++) {
					var carte = {};
					var carteCour = courrant.pile[j];

					carte.genre = carteCour.genre;
					carte.numero = carteCour.numero;
					if (carteCour.valide)
						carte.valide = carteCour.valide;
					if (carteCour.etat)
						carte.etat = carteCour.etat;

					pile.push(carte);
				}

				joueur.pile = pile;
			}

			//Copie la carte en jeu.
			if (courrant.enJeu) {
				var carte = {};

				carte.genre = courrant.enJeu.genre;
				carte.numero = courrant.enJeu.numero;
				if (courrant.enJeu.valide)
					carte.valide = courrant.enJeu.valide;
				if (courrant.enJeu.etat)
					carte.etat = courrant.enJeu.etat;
				
				joueur.enJeu = carte;
			}

			copie.joueurs.push(joueur);
		}

	}

	return copie;
}



module.exports = router;
