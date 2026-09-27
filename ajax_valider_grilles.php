<?php
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Session expirée.']);
    exit();
}

require_once 'db_connect.php';
require_once 'fonctions.php';

try {
    $count = enregistrerGrilles($pdo, (int) $_SESSION['user_id'], file_get_contents('php://input'));

    if ($count === 0) {
        echo json_encode(['success' => false, 'message' => 'Aucune grille valide reçue.']);
        exit();
    }

    echo json_encode([
        'success' => true,
        'message' => "$count grille(s) enregistrée(s) !"
    ]);
} catch (Exception $e) {
    error_log($e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur.']);
}
