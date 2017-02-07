$(document).ready(function() {
	$("#NewGame").click(function() {
		$.post("/start");
	});
	
	var db = firebase.database();
	var ref = db.ref("jeu");
	
	ref.on('value', function(snapshot) {
		afficherMains(snapshot.val());
	}, function(err) {console.log(err)});
});

function afficherMains(data) {
	var jeu = data;
	
	$("#tableDeJeu").empty();
	$("#tableDeJeu").html('<h2>Joueur 1</h2><p id="j1"></p><h2>Joueur 2</h2><p id="j2"></p><h2>Joueur 3</h2><p id="j3"></p><h2>Joueur 4</h2><p id="j4"></p>');
	
	data.joueurs.forEach(function(item,indexJoueur) {
		item.main.forEach(function(item,indexCarte) {
			$('#j' + (indexJoueur+1)).append('<img src="images/cartes/' + item.numero + '_' + item.genre + '.png" width="50" height="73"  alt="carte"></img>');
		});
	});
}