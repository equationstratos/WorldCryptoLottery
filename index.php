<?php
session_start();
require_once 'db_connect.php';
require_once 'fonctions.php';

$estConnecte = isset($_SESSION['user_id']) && isset($_SESSION['username']);

try {
    $tirage = getProchainTirage($pdo);
} catch (PDOException $e) {
    error_log('Tirage : ' . $e->getMessage());
    $tirage = null;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>World Crypto Lottery — Tentez de gagner la cagnotte en Bitcoin</title>
    <?php afficherHeadCommun(); ?>
</head>
<body>
    <?php afficherEntete(); ?>

    <main class="page">
        <section class="hero">
            <span class="badge"><span class="dot"></span> Tirage en cours</span>

            <p class="jackpot-label">Cagnotte actuelle</p>
            <?php if ($tirage): ?>
                <h1 class="jackpot"><?= number_format($tirage['cagnotte_btc'], 8, ',', ' ') ?> <small>BTC</small></h1>
                <p class="jackpot-meta">À gagner en trouvant les 5 bons numéros</p>

                <p class="draw-date">🗓️ Prochain tirage : <strong><?= e(formatDateFr($tirage['date'])) ?></strong></p>
                <div class="countdown" id="countdown" data-date="<?= e($tirage['date']->format(DATE_ATOM)) ?>">
                    <div class="unit"><span class="value" id="cd-j">--</span><span class="label">Jours</span></div>
                    <div class="unit"><span class="value" id="cd-h">--</span><span class="label">Heures</span></div>
                    <div class="unit"><span class="value" id="cd-m">--</span><span class="label">Min</span></div>
                    <div class="unit"><span class="value" id="cd-s">--</span><span class="label">Sec</span></div>
                </div>
            <?php else: ?>
                <h1 class="jackpot">Bientôt</h1>
                <p class="jackpot-meta">Le prochain tirage sera annoncé très prochainement. Préparez vos grilles !</p>
            <?php endif; ?>

            <a href="#jouer" class="btn btn-gold btn-lg">🎲 Je joue maintenant</a>

            <div class="hero-stats">
                <span class="pill">🎟️ Grille à <strong><?= number_format(PRIX_PAR_GRILLE_BTC, 8, ',', ' ') ?> BTC</strong></span>
                <?php if ($tirage): ?>
                    <span class="pill">🔥 <strong><?= $tirage['nb_grilles'] ?></strong> grille(s) en jeu</span>
                    <span class="pill">👥 <strong><?= $tirage['nb_joueurs'] ?></strong> joueur(s) inscrit(s)</span>
                <?php endif; ?>
            </div>
        </section>

        <h2 class="section-title">Comment ça marche ?</h2>
        <p class="section-sub">Trois étapes pour tenter votre chance</p>
        <div class="steps">
            <div class="card step">
                <div class="icon">🎯</div>
                <h3>1. Choisissez</h3>
                <p>Sélectionnez 5 numéros sur 50. Créez autant de grilles que vous le souhaitez.</p>
            </div>
            <div class="card step">
                <div class="icon">₿</div>
                <h3>2. Validez</h3>
                <p>Connectez-vous et réglez vos grilles en Bitcoin, simplement et rapidement.</p>
            </div>
            <div class="card step">
                <div class="icon">🏆</div>
                <h3>3. Gagnez</h3>
                <p>Au tirage, trouvez les 5 bons numéros et remportez la cagnotte !</p>
            </div>
        </div>

        <h2 class="section-title" id="jouer">Composez vos grilles</h2>
        <p class="section-sub">Choisissez 5 numéros sur 50</p>

        <div class="game">
            <div class="card selection">
                <p class="game-hint">Cliquez sur les numéros pour composer votre grille (5 maximum)</p>
                <div class="grille" id="grille"></div>
                <div class="selection-status">
                    <div id="resultats">Numéros sélectionnés : <span id="liste">aucun</span></div>
                    <div id="compteur">Nombre de numéros choisis : <span id="total">0</span> / 5</div>
                </div>
                <div id="message"></div>
                <div class="boutons">
                    <button class="btn btn-ghost" id="flash" onclick="flash()">⚡ Flash (au hasard)</button>
                    <button class="btn btn-danger" id="reinitialiser" onclick="reinitialiser()">Réinitialiser</button>
                    <button class="btn btn-violet" id="valider" onclick="validerSelection()" disabled>Valider la grille</button>
                </div>
            </div>

            <div class="card grilles-validees">
                <h2>🎟️ Mes grilles</h2>
                <div id="liste-grilles">
                    <div class="no-grille">Aucune grille validée pour le moment</div>
                </div>
                <div id="total-btc">Montant total : 0.00000000 BTC</div>
                <button class="btn btn-gold btn-block" id="bouton-tout-valider" onclick="toutValider()">Tout valider</button>
            </div>
        </div>
    </main>

    <?php afficherPiedDePage(); ?>

    <script>
        // ----- Compte à rebours -----
        const countdown = document.getElementById('countdown');
        if (countdown) {
            const cible = new Date(countdown.dataset.date).getTime();
            const pad = n => String(n).padStart(2, '0');
            const tick = () => {
                const reste = Math.max(0, cible - Date.now());
                const s = Math.floor(reste / 1000);
                document.getElementById('cd-j').textContent = pad(Math.floor(s / 86400));
                document.getElementById('cd-h').textContent = pad(Math.floor(s % 86400 / 3600));
                document.getElementById('cd-m').textContent = pad(Math.floor(s % 3600 / 60));
                document.getElementById('cd-s').textContent = pad(s % 60);
                if (reste === 0) clearInterval(timer);
            };
            const timer = setInterval(tick, 1000);
            tick();
        }

        // ----- Sélection des grilles -----
        const grille = document.getElementById('grille');
        const liste = document.getElementById('liste');
        const total = document.getElementById('total');
        const message = document.getElementById('message');
        const listeGrilles = document.getElementById('liste-grilles');
        const totalBtc = document.getElementById('total-btc');
        const boutonValider = document.getElementById('valider');
        const boutonToutValider = document.getElementById('bouton-tout-valider');

        const MAX_SELECTION = 5;
        const PRIX_PAR_GRILLE = <?= number_format(PRIX_PAR_GRILLE_BTC, 8, '.', '') ?>;

        let numerosSelectionnes = [];
        let grillesStockees = [];
        let timerMessage = null;

        for (let i = 1; i <= 50; i++) {
            const div = document.createElement('div');
            div.classList.add('numero');
            div.textContent = i;
            div.dataset.num = i;
            div.onclick = () => toggleNumero(i, div);
            grille.appendChild(div);
        }

        function afficherMessage(texte, type, duree = 3000) {
            message.textContent = texte;
            message.className = type;
            clearTimeout(timerMessage);
            if (duree) timerMessage = setTimeout(() => { message.textContent = ''; }, duree);
        }

        function mettreAJourSelection() {
            numerosSelectionnes.sort((a, b) => a - b);
            liste.textContent = numerosSelectionnes.length === 0 ? 'aucun' : numerosSelectionnes.join(' - ');
            total.textContent = numerosSelectionnes.length;
            boutonValider.disabled = numerosSelectionnes.length !== MAX_SELECTION;
        }

        function toggleNumero(num, element) {
            message.textContent = '';
            if (numerosSelectionnes.includes(num)) {
                numerosSelectionnes = numerosSelectionnes.filter(n => n !== num);
                element.classList.remove('selected');
            } else {
                if (numerosSelectionnes.length >= MAX_SELECTION) {
                    afficherMessage('⚠️ Maximum 5 numéros ! Désélectionnez-en un pour en ajouter un autre.', 'err');
                    return;
                }
                numerosSelectionnes.push(num);
                element.classList.add('selected');
            }
            mettreAJourSelection();
        }

        function reinitialiser() {
            numerosSelectionnes = [];
            document.querySelectorAll('.numero').forEach(el => el.classList.remove('selected'));
            mettreAJourSelection();
        }

        function flash() {
            reinitialiser();
            const pool = Array.from({ length: 50 }, (_, i) => i + 1);
            for (let k = 0; k < MAX_SELECTION; k++) {
                const num = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
                numerosSelectionnes.push(num);
                grille.querySelector(`[data-num="${num}"]`).classList.add('selected');
            }
            mettreAJourSelection();
        }

        function afficherGrilles() {
            if (grillesStockees.length === 0) {
                listeGrilles.innerHTML = '<div class="no-grille">Aucune grille validée pour le moment</div>';
            } else {
                listeGrilles.innerHTML = '';
                grillesStockees.forEach((g, i) => {
                    const item = document.createElement('div');
                    item.className = 'grille-item';
                    item.innerHTML = `
                        <div class="supprimer-grille" title="Supprimer cette grille">🗑️</div>
                        <div class="titre">Grille ${i + 1}</div>
                        <div class="grille-numeros">${g.join(' - ')}</div>
                    `;
                    item.querySelector('.supprimer-grille').onclick = () => supprimerGrille(i);
                    listeGrilles.prepend(item);
                });
            }
            boutonToutValider.style.display = grillesStockees.length ? 'flex' : 'none';
            totalBtc.textContent = `Montant total : ${(grillesStockees.length * PRIX_PAR_GRILLE).toFixed(8)} BTC`;
        }

        function validerSelection() {
            if (numerosSelectionnes.length !== MAX_SELECTION) return;
            grillesStockees.push([...numerosSelectionnes]);
            afficherGrilles();
            reinitialiser();
            afficherMessage('✅ Grille ajoutée !', 'ok');
        }

        function supprimerGrille(index) {
            grillesStockees.splice(index, 1);
            afficherGrilles();
        }

        function toutValider() {
            if (grillesStockees.length === 0) {
                afficherMessage('⚠️ Veuillez d\'abord sélectionner et valider au moins une grille !', 'err', 5000);
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
                        grillesStockees = [];
                        afficherGrilles();
                        afficherMessage('🎉 ' + data.message, 'ok', 6000);
                    } else {
                        afficherMessage('Erreur : ' + data.message, 'err', 6000);
                    }
                })
                .catch(() => afficherMessage('Erreur de connexion au serveur.', 'err', 5000));
            <?php else: ?>
                localStorage.setItem('grillesAValider', JSON.stringify(grillesStockees));
                localStorage.setItem('montantTotalBTC', (grillesStockees.length * PRIX_PAR_GRILLE).toFixed(8));
                window.location.href = 'login.html';
            <?php endif; ?>
        }

        afficherGrilles();
        localStorage.removeItem('grillesAValider');
        localStorage.removeItem('montantTotalBTC');
    </script>
</body>
</html>
