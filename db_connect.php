<?php
$host = 'sql111.infinityfree.com'; // ou ton nouveau host
$username = 'if0_40751843'; // ou ton nouveau username
$password = 'fDyYZEnBomoM'; // ou ton nouveau password
$database = 'if0_40751843_wlc'; // ou ton nouveau nom de base

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Erreur de connexion à la base de données.");
}
?>