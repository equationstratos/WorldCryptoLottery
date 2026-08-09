<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header('Location: login.html');
    exit();
}

require_once 'db_connect.php';

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
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tableau de bord - Mes grilles</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f0f0f0; margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { text-align: center; color: #333; }
        .welcome { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .welcome h2 { color: #2e7d32; margin: 0 0 10px 0; }
        .solde { font-size: 28px; font-weight: bold; color: #FF9800; margin: 15px 0; }
        .stats { display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; margin: 20px 0; }
        .stat-box { background: #e8f5e9; padding: 15px 25px; border-radius: 10px; border: 2px solid #4CAF50; text-align: center; min-width: 180px; }
        .stat-box strong { display: block; font-size: 24px; color: #2e7d32; }
        .btn-nouvelle-grille { display: block; width: 100%; max-width: 400px; margin: 30px auto; padding: 16px; font-size: 20px; background-color: #2196F3; color: white; text-align: center; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.1); transition: all 0.3s; }
        .btn-nouvelle-grille:hover { background-color: #0d47a1; transform: translateY(-2px); }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        th { background-color: #2196F3; color: white; padding: 15px; text-align: left; }
        td { padding: 12px 15px; border-bottom: 1px solid #ddd; }
        tr:hover { background-color: #f5f5f5; }
        .statut { padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold; }
        .en_attente { background: #fff3e0; color: #e68900; }
        .payee { background: #e8f5e9; color: #2e7d32; }
        .jouee { background: #e3f2fd; color: #1976d2; }
        .gagnante { background: #fffde7; color: #f9a825; border: 2px solid #fdd835; }
        .logout { text-align: center; margin: 40px 0 20px; }
        .logout a { color: #f44336; text-decoration: none; font-weight: bold; font-size: 18px; }
        .logout a:hover { text-decoration: underline; }
        @media (max-width: 700px) {
            table, thead, tbody, th, td, tr { display: block; }
            thead tr { display: none; }
            tr { margin-bottom: 15px; border: 1px solid #ccc; border-radius: 8px; }
            td { text-align: right; position: relative; padding-left: 50%; }
            td:before { content: attr(data-label); position: absolute; left: 15px; width: 45%; font-weight: bold; text-align: left; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎰 Tableau de bord</h1>

        <div class="welcome">
            <h2>Bienvenue, <?= htmlspecialchars($user['username']) ?> !</h2>
            <p>Email : <?= htmlspecialchars($user['email']) ?></p>
            <div class="solde">
                Solde actuel : <?= number_format($user['balance_btc'], 8) ?> BTC
            </div>
        </div>

        <div class="stats">
            <div class="stat-box">
                <span>Total grilles jouées</span>
                <strong><?= $total_grilles ?></strong>
            </div>
            <div class="stat-box">
                <span>Total dépensé</span>
                <strong><?= number_format($total_depense, 8) ?> BTC</strong>
            </div>
        </div>

        <a href="index.php" class="btn-nouvelle-grille">
            🎲 Sélectionner d'autres grilles
        </a>

        <h2 style="text-align:center; color:#333; margin-top:40px;">Historique de mes grilles</h2>

        <?php if ($total_grilles > 0): ?>
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
                            <td data-label="Numéros"><strong><?= str_replace(',', ' - ', $g['numeros']) ?></strong></td>
                            <td data-label="Montant"><?= number_format($g['montant_btc'], 8) ?> BTC</td>
                            <td data-label="Statut">
                                <span class="statut <?= $g['statut'] ?>">
                                    <?= ucfirst(str_replace('_', ' ', $g['statut'])) ?>
                                </span>
                            </td>
                            <td data-label="Paiement">
                                <?= $g['date_paiement'] ? date('d/m/Y H:i', strtotime($g['date_paiement'])) : 'En attente' ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else: ?>
            <p style="text-align:center; font-size:18px; color:#666; padding:60px 20px;">
                Vous n'avez pas encore joué de grille.<br><br>
                <a href="index.php" style="color:#2196F3; font-size:20px; text-decoration:none; font-weight:bold;">
                    ← Commencer à jouer maintenant
                </a>
            </p>
        <?php endif; ?>

        <div class="logout">
            <a href="logout.php">Déconnexion</a>
        </div>
    </div>
</body>
</html>