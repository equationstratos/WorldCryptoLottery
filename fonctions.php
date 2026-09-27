<?php
// Fonctions partagées entre les pages

date_default_timezone_set('Europe/Paris');

const PRIX_PAR_GRILLE_BTC = 0.00001000;

/**
 * Enregistre les grilles (JSON venant du navigateur) pour un utilisateur.
 * Retourne le nombre de grilles enregistrées.
 */
function enregistrerGrilles(PDO $pdo, int $userId, string $grillesJson): int
{
    $grilles = json_decode($grillesJson, true);
    if (!is_array($grilles) || count($grilles) === 0) {
        return 0;
    }

    $stmt = $pdo->prepare("
        INSERT INTO grilles (user_id, numeros, montant_btc, statut, date_creation)
        VALUES (?, ?, ?, 'en_attente', ?)
    ");

    $count = 0;
    foreach ($grilles as $grille) {
        if (!is_array($grille) || count($grille) !== 5) {
            continue;
        }
        $grille = array_map('intval', $grille);
        // 5 numéros distincts entre 1 et 50
        if (count(array_unique($grille)) !== 5 || min($grille) < 1 || max($grille) > 50) {
            continue;
        }
        sort($grille, SORT_NUMERIC);
        $stmt->execute([$userId, implode(',', $grille), PRIX_PAR_GRILLE_BTC, date('Y-m-d H:i:s')]);
        $count++;
    }
    return $count;
}

/**
 * Prochain tirage à venir avec la cagnotte en cours.
 * La cagnotte = cagnotte initiale + part (%) des grilles payées depuis le tirage précédent.
 * Retourne null si aucun tirage n'est programmé.
 */
function getProchainTirage(PDO $pdo): ?array
{
    $maintenant = date('Y-m-d H:i:s');

    $stmt = $pdo->prepare("
        SELECT id, date_tirage, cagnotte_initiale_btc, part_cagnotte
        FROM tirages
        WHERE statut = 'a_venir' AND date_tirage > ?
        ORDER BY date_tirage ASC
        LIMIT 1
    ");
    $stmt->execute([$maintenant]);
    $tirage = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$tirage) {
        return null;
    }

    $stmt = $pdo->prepare("SELECT MAX(date_tirage) FROM tirages WHERE date_tirage < ?");
    $stmt->execute([$tirage['date_tirage']]);
    $debut = $stmt->fetchColumn() ?: '1970-01-01 00:00:00';

    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS nb, COALESCE(SUM(montant_btc), 0) AS total
        FROM grilles
        WHERE statut = 'payee' AND date_creation > ? AND date_creation <= ?
    ");
    $stmt->execute([$debut, $tirage['date_tirage']]);
    $ventes = $stmt->fetch(PDO::FETCH_ASSOC);

    $cagnotte = (float) $tirage['cagnotte_initiale_btc']
        + (float) $ventes['total'] * ((float) $tirage['part_cagnotte'] / 100);

    $stmt = $pdo->query("SELECT COUNT(*) FROM users WHERE is_active = 1");

    return [
        'date' => new DateTime($tirage['date_tirage']),
        'cagnotte_btc' => $cagnotte,
        'nb_grilles' => (int) $ventes['nb'],
        'nb_joueurs' => (int) $stmt->fetchColumn(),
    ];
}

/** "samedi 3 octobre 2026 à 21h00" */
function formatDateFr(DateTime $date): string
{
    $jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    $mois = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août',
             'septembre', 'octobre', 'novembre', 'décembre'];
    return $jours[(int) $date->format('w')] . ' ' . $date->format('j') . ' '
        . $mois[(int) $date->format('n') - 1] . ' ' . $date->format('Y')
        . ' à ' . $date->format('H\hi');
}

function tokenCsrf(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifierCsrf(?string $token): bool
{
    return is_string($token) && !empty($_SESSION['csrf_token'])
        && hash_equals($_SESSION['csrf_token'], $token);
}

function e(?string $texte): string
{
    return htmlspecialchars($texte ?? '', ENT_QUOTES, 'UTF-8');
}

/** En-tête commun (logo + navigation). */
function afficherEntete(): void
{
    $connecte = isset($_SESSION['user_id'], $_SESSION['username']);
    ?>
    <header class="site-header">
        <a href="index.php" class="logo"><span class="logo-coin">₿</span> World<span class="accent">Crypto</span>Lottery</a>
        <nav class="nav">
            <?php if ($connecte): ?>
                <span class="welcome">Bienvenue, <strong><?= e($_SESSION['username']) ?></strong></span>
                <a href="dashboard.php" class="btn btn-ghost">Tableau de bord</a>
                <a href="logout.php" class="btn btn-danger">Déconnexion</a>
            <?php else: ?>
                <a href="login.html" class="btn btn-ghost">Connexion</a>
                <a href="inscription.php" class="btn btn-gold">Créer un compte</a>
            <?php endif; ?>
        </nav>
    </header>
    <?php
}

function afficherPiedDePage(): void
{
    ?>
    <footer class="site-footer">
        <span class="age">18+</span> Jeu réservé aux personnes majeures. Jouez de manière responsable.
        <br>© <?= date('Y') ?> World Crypto Lottery
    </footer>
    <?php
}

/** Balises <head> communes (police + feuille de style). */
function afficherHeadCommun(): void
{
    ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/style.css">
    <?php
}
