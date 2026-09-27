CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `email` VARCHAR(100) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `balance_btc` DECIMAL(20,8) DEFAULT 0.00000000,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `grilles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `numeros` VARCHAR(50) NOT NULL,
    `montant_btc` DECIMAL(20,8) NOT NULL DEFAULT 0.00001000,
    `statut` ENUM('en_attente', 'payee', 'jouee', 'gagnante') DEFAULT 'en_attente',
    `date_creation` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `date_paiement` DATETIME NULL,
    `transaction_id` VARCHAR(100) NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tirages : date du tirage et cagnotte affichées sur la page d'accueil.
-- cagnotte_initiale_btc : montant de départ (ex. report du tirage précédent)
-- part_cagnotte : pourcentage du prix de chaque grille payée reversé dans la cagnotte
CREATE TABLE IF NOT EXISTS `tirages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `date_tirage` DATETIME NOT NULL,
    `cagnotte_initiale_btc` DECIMAL(20,8) NOT NULL DEFAULT 0.00000000,
    `part_cagnotte` DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    `numeros_gagnants` VARCHAR(50) NULL,
    `statut` ENUM('a_venir', 'termine') DEFAULT 'a_venir',
    INDEX (`statut`, `date_tirage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Exemple : programmer le prochain tirage (à adapter)
-- INSERT INTO `tirages` (`date_tirage`, `cagnotte_initiale_btc`) VALUES ('2026-10-03 21:00:00', 0.05000000);
