<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Session expirée.']);
    exit();
}

require_once 'db_connect.php';

$user_id = $_SESSION['user_id'];
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input) || count($input) === 0) {
    echo json_encode(['success' => false, 'message' => 'Aucune grille reçue.']);
    exit();
}

try {
    $stmt = $pdo->prepare("INSERT INTO grilles (user_id, numeros, montant_btc, statut, date_creation) VALUES (?, ?, 0.00001000, 'en_attente', NOW())");

    $count = 0;
    foreach ($input as $grille) {
        if (is_array($grille) && count($grille) === 5) {
            sort($grille, SORT_NUMERIC);
            $numeros = implode(',', $grille);
            $stmt->execute([$user_id, $numeros]);
            $count++;
        }
    }

    echo json_encode([
        'success' => true,
        'message' => "$count grille(s) enregistrée(s) !"
    ]);
} catch (Exception $e) {
    error_log($e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur.']);
}
?>