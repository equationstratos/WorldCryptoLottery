<?php
session_start();
require_once 'db_connect.php';
require_once 'fonctions.php';

$erreur = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $grilles_json = $_POST['grilles_json'] ?? '';

    if (empty($email) || empty($password)) {
        $erreur = 'Veuillez remplir email et mot de passe.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                session_regenerate_id(true);
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                if ($grilles_json !== '' && $grilles_json !== '[]') {
                    enregistrerGrilles($pdo, (int) $user['id'], $grilles_json);
                }

                header('Location: dashboard.php');
                exit();

            } else {
                $erreur = 'Email ou mot de passe incorrect.';
            }
        } catch (Exception $e) {
            error_log('Erreur login : ' . $e->getMessage());
            $erreur = 'Une erreur est survenue. Réessayez.';
        }
    }
} else {
    header('Location: login.html');
    exit();
}

if ($erreur) {
    // Les valeurs sont encodées en JSON pour ne jamais être interprétées comme du code
    $opts = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
    $grilles = json_encode((string) ($_POST['grilles_json'] ?? ''), $opts);
    $montant = json_encode((string) ($_POST['montant_btc'] ?? '0'), $opts);
    $message = json_encode('Erreur : ' . $erreur, $opts);

    echo "<script>
        localStorage.setItem('grillesAValider', $grilles || '[]');
        localStorage.setItem('montantTotalBTC', $montant);
        alert($message);
        window.location.href = 'login.html';
    </script>";
    exit();
}
