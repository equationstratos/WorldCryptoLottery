<?php
session_start();
require_once 'db_connect.php';
require_once 'fonctions.php';

if (isset($_SESSION['user_id'])) {
    header('Location: dashboard.php');
    exit();
}

$erreurs = [];
$username = '';
$email = '';
$grilles_json = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmation = $_POST['password_confirm'] ?? '';
    $grilles_json = $_POST['grilles_json'] ?? '';

    if (!verifierCsrf($_POST['csrf_token'] ?? null)) {
        $erreurs[] = 'Session expirée, veuillez réessayer.';
    }
    if (!preg_match('/^[A-Za-z0-9_.-]{3,30}$/', $username)) {
        $erreurs[] = "Le pseudo doit contenir 3 à 30 caractères (lettres, chiffres, _ . -).";
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
        $erreurs[] = 'Adresse email invalide.';
    }
    if (strlen($password) < 8) {
        $erreurs[] = 'Le mot de passe doit contenir au moins 8 caractères.';
    }
    if ($password !== $confirmation) {
        $erreurs[] = 'Les deux mots de passe ne correspondent pas.';
    }
    if (empty($_POST['majeur'])) {
        $erreurs[] = 'Vous devez certifier être majeur et accepter les conditions.';
    }

    if (!$erreurs) {
        try {
            $stmt = $pdo->prepare("SELECT username, email FROM users WHERE username = ? OR email = ?");
            $stmt->execute([$username, $email]);
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $existant) {
                if (strcasecmp($existant['email'], $email) === 0) {
                    $erreurs[] = 'Un compte existe déjà avec cette adresse email.';
                }
                if (strcasecmp($existant['username'], $username) === 0) {
                    $erreurs[] = 'Ce pseudo est déjà pris.';
                }
            }

            if (!$erreurs) {
                $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
                $stmt->execute([$username, $email, password_hash($password, PASSWORD_DEFAULT)]);
                $userId = (int) $pdo->lastInsertId();

                session_regenerate_id(true);
                $_SESSION['user_id'] = $userId;
                $_SESSION['username'] = $username;

                if ($grilles_json !== '' && $grilles_json !== '[]') {
                    enregistrerGrilles($pdo, $userId, $grilles_json);
                }

                header('Location: dashboard.php?bienvenue=1');
                exit();
            }
        } catch (PDOException $e) {
            error_log('Erreur inscription : ' . $e->getMessage());
            $erreurs[] = 'Une erreur est survenue. Réessayez plus tard.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Créer un compte — World Crypto Lottery</title>
    <?php afficherHeadCommun(); ?>
</head>
<body>
    <?php afficherEntete(); ?>

    <main class="auth-wrap">
        <div class="card auth-card">
            <h1>🚀 Créer un compte</h1>
            <p class="subtitle">Rejoignez la partie et tentez de remporter la cagnotte</p>

            <div class="recap" id="recap-grilles"></div>

            <?php if ($erreurs): ?>
                <div class="alert alert-error">
                    <ul>
                        <?php foreach ($erreurs as $erreur): ?>
                            <li><?= e($erreur) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <form method="POST" action="inscription.php" novalidate>
                <input type="hidden" name="csrf_token" value="<?= e(tokenCsrf()) ?>">
                <input type="hidden" name="grilles_json" id="grilles_json" value="<?= e($grilles_json) ?>">

                <div class="field">
                    <label for="username">Pseudo</label>
                    <input type="text" id="username" name="username" value="<?= e($username) ?>"
                           placeholder="ex. CryptoChanceux" required minlength="3" maxlength="30" autocomplete="username">
                </div>
                <div class="field">
                    <label for="email">Adresse email</label>
                    <input type="email" id="email" name="email" value="<?= e($email) ?>"
                           placeholder="vous@exemple.com" required maxlength="100" autocomplete="email">
                </div>
                <div class="field">
                    <label for="password">Mot de passe</label>
                    <input type="password" id="password" name="password" required minlength="8" autocomplete="new-password">
                    <div class="hint">8 caractères minimum</div>
                </div>
                <div class="field">
                    <label for="password_confirm">Confirmer le mot de passe</label>
                    <input type="password" id="password_confirm" name="password_confirm" required minlength="8" autocomplete="new-password">
                </div>

                <label class="checkbox">
                    <input type="checkbox" name="majeur" value="1" required>
                    <span>Je certifie avoir 18 ans ou plus et j'accepte les conditions de jeu.</span>
                </label>

                <button type="submit" class="btn btn-gold btn-block btn-lg" id="submit-btn">Créer mon compte</button>
            </form>

            <div class="auth-links">
                Déjà inscrit ? <a href="login.html">Se connecter</a>
                <a href="index.php" class="retour">← Retour à la sélection de grilles</a>
            </div>
        </div>
    </main>

    <?php afficherPiedDePage(); ?>

    <script>
        // Récupère les grilles préparées sur l'accueil (visiteur non connecté)
        const grillesInput = document.getElementById('grilles_json');
        const stockees = localStorage.getItem('grillesAValider');
        if (!grillesInput.value && stockees && stockees !== '[]') {
            grillesInput.value = stockees;
        }
        try {
            const grilles = JSON.parse(grillesInput.value || '[]');
            if (grilles.length > 0) {
                const recap = document.getElementById('recap-grilles');
                const montant = (grilles.length * 0.00001).toFixed(8);
                recap.innerHTML = `Vous avez <strong>${grilles.length}</strong> grille(s) prête(s) à valider<br>Montant total : <strong>${montant} BTC</strong>`;
                recap.classList.add('visible');
                document.getElementById('submit-btn').textContent = 'Créer mon compte et valider mes grilles';
            }
        } catch (e) {
            grillesInput.value = '';
        }
    </script>
</body>
</html>
