<?php
session_start();
require_once 'db_connect.php';

$erreur = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $grilles_json = $_POST['grilles_json'] ?? '';
    $montant_btc = $_POST['montant_btc'] ?? '0';

    if (empty($email) || empty($password)) {
        $erreur = 'Veuillez remplir email et mot de passe.';
    } else {
        try {
            $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE email = ? AND is_active = 1");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password_hash'])) {
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];

                if (!empty($grilles_json) && $grilles_json !== '' && $grilles_json !== '[]') {
                    $grilles = json_decode($grilles_json, true);

                    if (is_array($grilles) && count($grilles) > 0) {
                        $stmt_insert = $pdo->prepare("
                            INSERT INTO grilles (user_id, numeros, montant_btc, statut, date_creation)
                            VALUES (?, ?, 0.00001000, 'en_attente', NOW())
                        ");

                        foreach ($grilles as $grille) {
                            if (is_array($grille) && count($grille) === 5) {
                                sort($grille, SORT_NUMERIC);
                                $numeros_str = implode(',', $grille);
                                $stmt_insert->execute([$user['id'], $numeros_str]);
                            }
                        }
                    }
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
}

if ($erreur) {
    $grilles_json_safe = isset($_POST['grilles_json']) ? $_POST['grilles_json'] : '';
    $montant_safe = isset($_POST['montant_btc']) ? $_POST['montant_btc'] : '0';

    echo "<script>
        localStorage.setItem('grillesAValider', JSON.stringify(" . ($grilles_json_safe ?: '[]') . "));
        localStorage.setItem('montantTotalBTC', '$montant_safe');
        alert('Erreur : " . addslashes($erreur) . "');
        window.location.href = 'login.html';
    </script>";
    exit();
}
?>