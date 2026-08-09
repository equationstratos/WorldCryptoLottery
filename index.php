<?php
session_start();

$estConnecte = isset($_SESSION['user_id']) && isset($_SESSION['username']);
$username = $estConnecte ? htmlspecialchars($_SESSION['username']) : '';
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sélecteur de grilles : 5 numéros sur 50</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 0; }
        header { background-color: #2196F3; color: white; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
        header h1 { margin: 0; font-size: 24px; }
        .user-info { display: flex; align-items: center; gap: 20px; font-size: 18px; }
        .user-info .welcome { font-weight: bold; color: white; }
        .user-info .welcome strong { font-size: 22px; color: #fff; }
        .user-info a { background-color: white; color: #2196F3; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: all 0.3s; font-size: 16px; }
        .user-info a:hover { background-color: #e3f2fd; transform: scale(1.05); }
        .login-link { background-color: white; color: #2196F3; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; transition: all 0.3s; }
        .login-link:hover { background-color: #e3f2fd; transform: scale(1.05); }
        .main-content { padding: 20px; }
        h1.main-title { text-align: center; color: #333; margin: 20px 0 30px; }
        .container { display: flex; justify-content: space-between; gap: 40px; max-width: 1200px; margin: 0 auto; flex-wrap: wrap; }
        .selection { flex: 2; min-width: 300px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .grilles-validees { flex: 1; min-width: 280px; max-width: 400px; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .grille { display: grid; grid-template-columns: repeat(auto-fit, minmax(40px, 1fr)); gap: 10px; justify-content: center; margin: 30px 0; padding: 0 10px; box-sizing: border-box; }
        .numero { aspect-ratio: 1 / 1; background-color: #fff; border: 2px solid #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; cursor: pointer; user-select: none; transition: all 0.2s; position: relative; }
        .numero span { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .numero:hover { background-color: #e0e0e0; }
        .numero.selected { background-color: #4CAF50; color: white; border-color: #45a049; transform: scale(1.1); }
        #resultats { margin-top: 20px; font-size: 22px; font-weight: bold; color: #333; text-align: center; }
        #compteur { margin-top: 10px; font-size: 18px; color: #666; text-align: center; }
        #message { margin-top: 15px; font-size: 18px; min-height: 24px; text-align: center; color: #d32f2f; }
        .boutons { margin-top: 30px; text-align: center; }
        button { padding: 12px 24px; font-size: 18px; margin: 0 10px; border: none; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        #reinitialiser { background-color: #f44336; color: white; }
        #reinitialiser:hover { background-color: #d32f2f; }
        #valider { background-color: #2196F3; color: white; }
        #valider:hover { background-color: #0b7dda; }
        #valider:disabled { background-color: #aaa; opacity: 0.6; cursor: not-allowed; }
        .grilles-validees h2 { text-align: center; color: #2e7d32; margin-top: 0; font-size: 22px; }
        #total-btc { text-align: center; font-size: 24px; font-weight: bold; color: #FF9800; margin: 25px 0 15px; padding: 12px; background-color: #fff3e0; border-radius: 8px; border: 2px solid #FF9800; }
        #bouton-tout-valider { display: block; width: 90%; margin: 20px auto; padding: 12px; font-size: 18px; background-color: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer; display: none; }
        #bouton-tout-valider:hover { background-color: #e68900; }
        .grille-item { position: relative; background-color: #e8f5e9; border: 2px solid #4CAF50; border-radius: 10px; padding: 12px; margin-bottom: 18px; text-align: center; font-size: 17px; font-weight: bold; color: #2e7d32; }
        .supprimer-grille { position: absolute; top: 6px; right: 10px; font-size: 20px; cursor: pointer; color: #f44336; opacity: 0.7; transition: opacity 0.2s; }
        .supprimer-grille:hover { opacity: 1; }
        .grille-numeros { font-size: 22px; margin: 10px 0 5px; letter-spacing: 5px; }
        .no-grille { color: #999; font-style: italic; text-align: center; padding: 40px 0; font-size: 17px; }
        @media (max-width: 900px) { header { flex-direction: column; text-align: center; gap: 15px; } .user-info { flex-direction: column; gap: 12px; } .container { flex-direction: column; gap: 25px; } .selection, .grilles-validees { max-width: 100%; } .numero { font-size: 15px; } }
        @media (max-width: 500px) { .numero { font-size: 14px; } button { width: 100%; margin: 10px 0; } #total-btc { font-size: 20px; } .grille-numeros { font-size: 18px; letter-spacing: 3px; } }
    </style>
</head>
<body>
    <header>
        <h1>Sélecteur de grilles</h1>

        <div class="user-info">
            <?php if ($estConnecte): ?>
                <div class="welcome">
                    Bienvenue, <strong><?= $username ?></strong> !
                </div>
                <a href="dashboard.php">Tableau de bord</a>
                <a href="logout.php">Déconnexion</a>
            <?php else: ?>
                <a href="login.html" class="login-link">Connexion</a>
            <?php endif; ?>
        </div>
    </header>

    <div class="main-content">
        <h1 class="main-title">Choisissez 5 numéros sur 50</h1>

        <div class="container">
            <div class="selection">
                <p style="text-align:center;">Clique sur les numéros pour composer ta grille (maximum 5)</p>

                <div class="grille" id="grille"></div>

                <div id="resultats">
                    Numéros sélectionnés : <span id="liste">aucun</span>
                </div>
                <div id="compteur">Nombre de numéros choisis : <span id="total">0</span> / 5</div>
                <div id="message"></div>

                <div class="boutons">
                    <button id="reinitialiser" onclick="reinitialiser()">Réinitialiser</button>
                    <button id="valider" onclick="validerSelection()" disabled>Valider la grille</button>
                </div>
            </div>

            <div class="grilles-validees">
                <h2>Mes grilles validées</h2>

                <div id="liste-grilles">
                    <div class="no-grille">Aucune grille validée pour le moment</div>
                </div>

                <div id="total-btc">Montant total : 0.00000000 BTC</div>

                <button id="bouton-tout-valider" onclick="toutValider()">Tout valider</button>
            </div>
        </div>
    </div>

    <script>
        const grille = document.getElementById('grille');
        const liste = document.getElementById('liste');
        const total = document.getElementById('total');
        const message = document.getElementById('message');
        const listeGrilles = document.getElementById('liste-grilles');
        const totalBtc = document.getElementById('total-btc');
        const boutonValider = document.getElementById('valider');
        const boutonToutValider = document.getElementById('bouton-tout-valider');

        const MAX_SELECTION = 5;
        const PRIX_PAR_GRILLE = 0.00001000;

        let numerosSelectionnes = [];
        let compteurGrilles = 0;
        let grillesStockees = [];

        for (let i = 1; i <= 50; i++) {
            const div = document.createElement('div');
            div.classList.add('numero');

            const span = document.createElement('span');
            span.textContent = i;

            div.appendChild(span);
            div.onclick = () => toggleNumero(i, div);

            grille.appendChild(div);
        }

        function mettreAJourTotalBtc() {
            const totalAmount = compteurGrilles * PRIX_PAR_GRILLE;
            totalBtc.textContent = `Montant total : ${totalAmount.toFixed(8)} BTC`;
        }

        function toggleNumero(num, element) {
            message.textContent = '';

            if (numerosSelectionnes.includes(num)) {
                numerosSelectionnes = numerosSelectionnes.filter(n => n !== num);
                element.classList.remove('selected');
            } else {
                if (numerosSelectionnes.length >= MAX_SELECTION) {
                    message.textContent = '⚠️ Maximum 5 numéros ! Désélectionne-en un pour en ajouter un autre.';
                    return;
                }
                numerosSelectionnes.push(num);
                element.classList.add('selected');
            }

            numerosSelectionnes.sort((a, b) => a - b);

            liste.textContent = numerosSelectionnes.length === 0 ? 'aucun' : numerosSelectionnes.join(' - ');
            total.textContent = numerosSelectionnes.length;

            boutonValider.disabled = (numerosSelectionnes.length !== MAX_SELECTION);
        }

        function reinitialiser() {
            numerosSelectionnes = [];
            document.querySelectorAll('.numero').forEach(el => el.classList.remove('selected'));
            liste.textContent = 'aucun';
            total.textContent = '0';
            message.textContent = '';
            boutonValider.disabled = true;
        }

        function validerSelection() {
            if (numerosSelectionnes.length !== MAX_SELECTION) return;

            compteurGrilles++;
            grillesStockees.push([...numerosSelectionnes]);

            const nouvelleGrille = document.createElement('div');
            nouvelleGrille.classList.add('grille-item');
            nouvelleGrille.innerHTML = `
                <div class="supprimer-grille" onclick="supprimerGrille(this, ${compteurGrilles - 1})" title="Supprimer cette grille">🗑️</div>
                <div>Grille ${compteurGrilles}</div>
                <div class="grille-numeros">${numerosSelectionnes.join(' - ')}</div>
            `;

            if (listeGrilles.querySelector('.no-grille')) {
                listeGrilles.innerHTML = '';
            }

            listeGrilles.prepend(nouvelleGrille);
            boutonToutValider.style.display = 'block';
            mettreAJourTotalBtc();

            reinitialiser();
            message.textContent = '✅ Grille ajoutée !';
            setTimeout(() => { message.textContent = ''; }, 3000);
        }

        function supprimerGrille(element, index) {
            element.parentElement.remove();
            grillesStockees.splice(index, 1);

            const items = listeGrilles.querySelectorAll('.grille-item');
            items.forEach((item, i) => {
                item.querySelector('div:first-child').nextElementSibling.textContent = `Grille ${i + 1}`;
                item.querySelector('.supprimer-grille').setAttribute('onclick', `supprimerGrille(this, ${i})`);
            });

            compteurGrilles = items.length;
            mettreAJourTotalBtc();

            if (compteurGrilles === 0) {
                listeGrilles.innerHTML = '<div class="no-grille">Aucune grille validée pour le moment</div>';
                boutonToutValider.style.display = 'none';
            }
        }

        function toutValider() {
            if (grillesStockees.length === 0) {
                message.textContent = '⚠️ Veuillez d\'abord sélectionner et valider au moins une grille !';
                setTimeout(() => { message.textContent = ''; }, 5000);
                return;
            }

            <?php if ($estConnecte): ?>
                fetch('ajax_valider_grilles.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(grillesStockees)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        message.textContent = '🎉 ' + data.message;
                        message.style.color = '#2e7d32';
                        grillesStockees = [];
                        compteurGrilles = 0;
                        listeGrilles.innerHTML = '<div class="no-grille">Aucune grille validée pour le moment</div>';
                        boutonToutValider.style.display = 'none';
                        mettreAJourTotalBtc();
                    } else {
                        message.textContent = 'Erreur : ' + data.message;
                        message.style.color = '#d32f2f';
                    }
                    setTimeout(() => { message.textContent = ''; message.style.color = ''; }, 6000);
                })
                .catch(() => {
                    message.textContent = 'Erreur de connexion au serveur.';
                    message.style.color = '#d32f2f';
                    setTimeout(() => message.textContent = '', 5000);
                });
            <?php else: ?>
                localStorage.setItem('grillesAValider', JSON.stringify(grillesStockees));
                localStorage.setItem('montantTotalBTC', (compteurGrilles * PRIX_PAR_GRILLE).toFixed(8));
                window.location.href = 'login.html';
            <?php endif; ?>
        }

        mettreAJourTotalBtc();
        localStorage.removeItem('grillesAValider');
        localStorage.removeItem('montantTotalBTC');
    </script>
</body>
</html>