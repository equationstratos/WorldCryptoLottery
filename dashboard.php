<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: login.html');
    exit();
}

require_once 'db_connect.php';
require_once 'fonctions.php';

$user_id = $_SESSION['user_id'];

$stmt = $pdo->prepare("SELECT username, email, balance_btc FROM users WHERE id = ?");
$stmt->execute([$user_id]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

$stmt = $pdo->prepare("
    SELECT id, numeros, montant_btc, statut, date_creation, date_paiement
    FROM grilles
    WHERE user_id = ?
    ORDER BY date_creation DESC
");
$stmt->execute([$user_id]);
$grilles = $stmt->fetchAll(PDO::FETCH_ASSOC);

$total_grilles = count($grilles);
$total_depense = array_sum(array_column($grilles, 'montant_btc'));

try {
    $tirage = getProchainTirage($pdo);
} catch (PDOException $e) {
    $tirage = null;
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de bord — World Crypto Lottery</title>
    <?php afficherHeadCommun(); ?>
</head>
<body>
    <?php afficherEntete(); ?>

    <main class="page">
        <div class="card" style="text-align:center;">
            <h2><?= isset($_GET['bienvenue']) ? '🎉 Compte créé, bienvenue' : '👋 Bienvenue' ?>, <?= e($user['username']) ?> !</h2>
            <p style="color:var(--text-dim); margin:0;"><?= e($user['email']) ?></p>
            <p class="solde">Solde : <?= number_format($user['balance_btc'], 8) ?> BTC</p>
        </div>

        <div class="stats">
            <div class="card stat-box">
                <span>Grilles jouées</span>
                <strong><?= $total_grilles ?></strong>
            </div>
            <div class="card stat-box">
                <span>Total misé</span>
                <strong><?= number_format($total_depense, 8) ?> BTC</strong>
            </div>
            <div class="card stat-box">
                <span>Cagnotte en jeu</span>
                <strong style="color:var(--gold);"><?= $tirage ? number_format($tirage['cagnotte_btc'], 8) . ' BTC' : '—' ?></strong>
            </div>
            <div class="card stat-box">
                <span>Prochain tirage</span>
                <strong style="font-size:17px;"><?= $tirage ? e(formatDateFr($tirage['date'])) : 'Bientôt annoncé' ?></strong>
            </div>
        </div>

        <div style="text-align:center; margin:30px 0;">
            <a href="index.php#jouer" class="btn btn-gold btn-lg">🎲 Jouer d'autres grilles</a>
        </div>

        <h2 class="section-title">Historique de mes grilles</h2>
        <p class="section-sub">Toutes vos participations</p>

        <?php if ($total_grilles > 0): ?>
            <div class="card table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Numéros</th>
                            <th>Montant</th>
                            <th>Statut</th>
                            <th>Paiement</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($grilles as $g): ?>
                            <tr>
                                <td data-label="Date"><?= date('d/m/Y H:i', strtotime($g['date_creation'])) ?></td>
                                <td data-label="Numéros"><strong><?= e(str_replace(',', ' - ', $g['numeros'])) ?></strong></td>
                                <td data-label="Montant"><?= number_format($g['montant_btc'], 8) ?> BTC</td>
                                <td data-label="Statut">
                                    <span class="statut <?= e($g['statut']) ?>">
                                        <?= e(ucfirst(str_replace('_', ' ', $g['statut']))) ?>
                                    </span>
                                </td>
                                <td data-label="Paiement">
                                    <?= $g['date_paiement'] ? date('d/m/Y H:i', strtotime($g['date_paiement'])) : 'En attente' ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php else: ?>
            <div class="card" style="text-align:center; padding:50px 20px;">
                <p style="color:var(--text-dim); font-size:18px; margin-top:0;">Vous n'avez pas encore joué de grille.</p>
                <a href="index.php#jouer" class="btn btn-violet">Commencer à jouer maintenant →</a>
            </div>
        <?php endif; ?>
    </main>

    <?php afficherPiedDePage(); ?>

    <script>
        // Les grilles préparées avant connexion sont désormais enregistrées
        localStorage.removeItem('grillesAValider');
        localStorage.removeItem('montantTotalBTC');
    </script>
</body>
</html>
