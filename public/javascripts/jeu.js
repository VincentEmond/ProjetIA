$(document).ready(function() {
	
	var premiereFois = true;
	var db = firebase.database();
	var ref = db.ref("jeu");
	var joueurNum = -1;
	
	$("#NewGame").click(function() {
		$.post("/start", function(data) {
			joueurNum = data.joueur;
			$("#NewGame").addClass("invisible");
			$("#tableDeJeu").removeClass("invisible");
			$("#numJoueur").text(joueurNum + 1);
			db = firebase.database();
			ref = db.ref("jeu");
			
			ref.on('value', function(snapshot) 
			{
				var param = snapshot.val();
				param.joueurNum = joueurNum;
				update_table(param);
			},function(err) {console.log(err);}
			);
			
			
		});
	});
	
	
	
	$(document).on('click', '.card.valide', function(obj) {
		var numero = $(obj.toElement).attr("data-carte-numero");
		var genre = $(obj.toElement).attr("data-carte-genre");
		var move = {};
		move.joueur = joueurNum;
		move.carte = {};
		move.carte.numero = numero;
		move.carte.genre = genre;
		
		$.ajax({
			url: '/jouer', 
			type: 'POST', 
			contentType: 'application/json', 
			data: JSON.stringify(move)
		});
	});
	
	window.onbeforeunload = function() {
		$.ajax({
			url: '/leave', 
			type: 'POST', 
			contentType: 'application/json', 
			data: JSON.stringify({joueur: joueurNum})
		});
	};
	
	
});

function update_table(data) {
	var jeu = data;
	
	$(".j1, .j2, .j3, .j4").empty();
	
	if (data.joueurNum == -1)
		return;
	
	data.joueurs.forEach(function(item,indexJoueur) {
		
		if (item.main != undefined && item.main.length != 0) {
			//Mains
			item.main.forEach(function(item,indexCarte) {
				if (data.joueurNum == indexJoueur)
					$('#mains .j' + (indexJoueur+1)).append(createCard(item.numero, item.genre, item.valide));
				else
					$('#mains .j' + (indexJoueur+1)).append(createDos());
			});
		}

		
		
		//EnJeu
		if (item.enJeu != undefined && item.enJeu.numero != undefined)
			$('#enJeu .j' + (indexJoueur+1)).append(createCard(item.enJeu.numero, item.enJeu.genre, item.enJeu.valide));
		else
			$('#enJeu .j' + (indexJoueur+1)).empty();
		
		//points
		$("#pts" + (indexJoueur+1)).text(item.pts);
	});
	
	$("#jeuStatus").append(jeu.etat + "\n");
	
	if (jeu.etat != "READY") {
		$("#tour").text("Pas commencé");
	} else {
		$("#tour").text(jeu.tour + 1);
	}
	
	
}

function createCard(numero, genre, valide)
{
	if (valide)
		return '<img src="images/cartes/' + numero + '_' + genre + '.png" width="50" height="73" data-carte-numero="'+ numero +'" data-carte-genre="'+ genre +'"  alt="carte" class="card valide" ></img>';
	else
		return '<img src="images/cartes/' + numero + '_' + genre + '.png" width="50" height="73" data-carte-numero="'+ numero +'" data-carte-genre="' + genre +'"  alt="carte" class="card invalide" ></img>';
}

function createDos()
{
	return '<img src="images/cartes/dos.jpg" width="50" height="73" alt="carte" class="card" ></img>';
}