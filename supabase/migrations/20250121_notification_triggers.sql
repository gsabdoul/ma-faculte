-- ============================================
-- SYSTÈME DE NOTIFICATIONS AUTOMATIQUES
-- ============================================
-- Notifie automatiquement les étudiants lorsqu'un nouveau sujet, livre ou drive est ajouté

-- ============================================
-- 1. FONCTION POUR NOUVEAUX SUJETS
-- ============================================
CREATE OR REPLACE FUNCTION notify_students_new_sujet()
RETURNS TRIGGER AS $$
DECLARE
    v_module_nom TEXT;
    v_universite_nom TEXT;
BEGIN
    -- Récupérer le nom du module et de l'université
    SELECT m.nom INTO v_module_nom
    FROM modules m
    WHERE m.id = NEW.module_id;

    SELECT u.nom INTO v_universite_nom
    FROM universites u
    WHERE u.id = NEW.universite_id;

    -- Créer une notification pour tous les étudiants ayant ce module dans leur faculté/niveau
    INSERT INTO notifications (user_id, titre, message)
    SELECT DISTINCT p.id,
           '📄 Nouveau sujet disponible',
           'Un nouveau sujet de ' || v_module_nom || ' (' || v_universite_nom || ') est maintenant disponible !'
    FROM profiles p
    INNER JOIN module_faculte_niveau mfn 
        ON mfn.module_id = NEW.module_id 
        AND mfn.faculte_id = p.faculte_id 
        AND mfn.niveau_id = p.niveau_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. FONCTION POUR NOUVEAUX LIVRES
-- ============================================
CREATE OR REPLACE FUNCTION notify_students_new_livre()
RETURNS TRIGGER AS $$
DECLARE
    v_module_nom TEXT;
BEGIN
    -- Récupérer le nom du module
    SELECT m.nom INTO v_module_nom
    FROM modules m
    WHERE m.id = NEW.module_id;

    -- Notifier TOUS les étudiants de TOUTES les facultés/niveaux qui ont ce module
    INSERT INTO notifications (user_id, titre, message)
    SELECT DISTINCT p.id,
           '📚 Nouveau livre disponible',
           'Un nouveau livre de ' || v_module_nom || ' (' || NEW.titre || ') est maintenant disponible dans la bibliothèque !'
    FROM profiles p
    INNER JOIN module_faculte_niveau mfn 
        ON mfn.module_id = NEW.module_id 
        AND mfn.faculte_id = p.faculte_id 
        AND mfn.niveau_id = p.niveau_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. FONCTION POUR NOUVEAUX DRIVES
-- ============================================
CREATE OR REPLACE FUNCTION notify_students_new_drive()
RETURNS TRIGGER AS $$
DECLARE
    v_faculte_nom TEXT;
    v_niveau_nom TEXT;
BEGIN
    -- Récupérer le nom de la faculté et du niveau
    SELECT f.nom INTO v_faculte_nom
    FROM facultes f
    WHERE f.id = NEW.faculte_id;

    SELECT n.nom INTO v_niveau_nom
    FROM niveaux n
    WHERE n.id = NEW.niveau_id;

    -- Créer une notification pour tous les étudiants de cette faculté et ce niveau
    INSERT INTO notifications (user_id, titre, message)
    SELECT p.id,
           '💾 Nouveau drive partagé',
           'Un nouveau drive (' || NEW.titre || ') est disponible pour ' || v_faculte_nom || ' - ' || v_niveau_nom || ' !'
    FROM profiles p
    WHERE p.faculte_id = NEW.faculte_id 
      AND p.niveau_id = NEW.niveau_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CRÉATION DES TRIGGERS
-- ============================================

-- Trigger pour les sujets
DROP TRIGGER IF EXISTS trigger_notify_new_sujet ON sujets;
CREATE TRIGGER trigger_notify_new_sujet
    AFTER INSERT ON sujets
    FOR EACH ROW
    EXECUTE FUNCTION notify_students_new_sujet();

-- Trigger pour les livres
DROP TRIGGER IF EXISTS trigger_notify_new_livre ON livres;
CREATE TRIGGER trigger_notify_new_livre
    AFTER INSERT ON livres
    FOR EACH ROW
    EXECUTE FUNCTION notify_students_new_livre();

-- Trigger pour les drives
DROP TRIGGER IF EXISTS trigger_notify_new_drive ON drives;
CREATE TRIGGER trigger_notify_new_drive
    AFTER INSERT ON drives
    FOR EACH ROW
    EXECUTE FUNCTION notify_students_new_drive();

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Les triggers sont maintenant actifs et créeront automatiquement des notifications
-- pour tous les étudiants concernés lorsqu'un nouveau contenu sera ajouté.
