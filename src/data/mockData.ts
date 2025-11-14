// Fichier de données de simulation pour le développement

export const modules = [
    { id: 'math', name: 'Mathématiques', iconUrl: '📚' },
    { id: 'info', name: 'Informatique', iconUrl: '💻' },
    { id: 'phys', name: 'Physique', iconUrl: '🔬' },
];

export const carouselItems = [
    { id: 1, title: 'Nouvelles inscriptions 2024-2025', imageUrl: 'https://via.placeholder.com/400x200/3B82F6/FFFFFF?text=Inscriptions', alt: 'Information sur les inscriptions', learnMoreUrl: '#' },
    { id: 2, title: 'Conférence sur l\'Intelligence Artificielle', imageUrl: 'https://via.placeholder.com/400x200/10B981/FFFFFF?text=Conférence+IA', alt: 'Conférence sur l\'IA', learnMoreUrl: '#' },
    { id: 3, title: 'Journée portes ouvertes de l\'UFR/SDS', imageUrl: 'https://via.placeholder.com/400x200/F59E0B/FFFFFF?text=Portes+Ouvertes', alt: 'Événement portes ouvertes', learnMoreUrl: '#' },
];



export const drives = [
    { id: 'drive-001', title: 'Cours de Mathématiques L1', description: 'Contient tous les cours, TD et examens de la première année de licence en mathématiques.' },
    { id: 'drive-002', title: 'Ressources Informatique L2', description: 'Projets, cours et notes pour la deuxième année de licence en informatique.' },
    { id: 'drive-003', title: 'Archives de Physique', description: 'Anciens sujets et corrigés de physique de 2015 à 2022.' },
    { id: 'drive-004', title: 'Méthodologie de la recherche', description: 'Guides et exemples pour la rédaction de mémoires et rapports de stage.' },
];

export const booksByModule = {
    math: [
        { id: 'book-math-001', title: 'Analyse pour la Licence', coverUrl: 'https://via.placeholder.com/150x200/A5B4FC/FFFFFF?text=Analyse', pageCount: 350, fileSize: '15 MB', pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
        { id: 'book-math-002', title: 'Algèbre et Géométrie', coverUrl: 'https://via.placeholder.com/150x200/A5B4FC/FFFFFF?text=Algèbre', pageCount: 420, fileSize: '22 MB', pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    ],
    info: [
        { id: 'book-info-001', title: 'Introduction à l\'Algorithmique', coverUrl: 'https://via.placeholder.com/150x200/A7F3D0/FFFFFF?text=Algo', pageCount: 1200, fileSize: '55 MB', pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    ],
    phys: [
        { id: 'book-phys-001', title: 'Mécanique Quantique', coverUrl: 'https://via.placeholder.com/150x200/FCA5A5/FFFFFF?text=Quantique', pageCount: 800, fileSize: '40 MB', pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
    ]
};

export const universitiesByModule = {
    math: [
        { id: 'uni-jkz', name: 'Université Joseph Ki-Zerbo', logoUrl: 'https://via.placeholder.com/100', subjectCount: 15 },
        { id: 'uni-nk', name: 'Université Norbert Zongo', logoUrl: 'https://via.placeholder.com/100', subjectCount: 8 },
    ],
    info: [
        { id: 'uni-jkz', name: 'Université Joseph Ki-Zerbo', logoUrl: 'https://via.placeholder.com/100', subjectCount: 22 },
        { id: 'uni-aube-nouvelle', name: 'Aube Nouvelle', logoUrl: 'https://via.placeholder.com/100', subjectCount: 12 },
    ],
};

export const teamMembers = [
    { id: 'dev-01', name: 'Savadogo Alima', role: 'Développeuse Principale', avatarUrl: 'https://via.placeholder.com/150/3B82F6/FFFFFF?text=SA', facebookUrl: 'https://facebook.com' },
    { id: 'design-01', name: 'John Designer', role: 'UI/UX Designer', avatarUrl: 'https://via.placeholder.com/150/F59E0B/FFFFFF?text=JD', facebookUrl: 'https://facebook.com' },
    { id: 'qa-01', name: 'Jane Testeuse', role: 'Testeuse Qualité', avatarUrl: 'https://via.placeholder.com/150/10B981/FFFFFF?text=JT', facebookUrl: 'https://facebook.com' },
    { id: 'dev-02', name: 'Bob Développeur', role: 'Développeur Backend', avatarUrl: 'https://via.placeholder.com/150/6366F1/FFFFFF?text=BD', facebookUrl: 'https://facebook.com' },
];

export const notifications = [
    { id: 'notif-001', title: 'Nouveau sujet disponible', message: 'Un nouveau sujet d\'Analyse 1 a été ajouté pour l\'Université Joseph Ki-Zerbo.', date: '2024-10-30T10:00:00Z', isRead: false },
    { id: 'notif-002', title: 'Maintenance programmée', message: 'Une maintenance de l\'application est prévue ce soir à 23h00.', date: '2024-10-29T18:30:00Z', isRead: false },
    { id: 'notif-003', title: 'Bienvenue !', message: 'Merci d\'avoir rejoint Ma Faculté. Explorez toutes les fonctionnalités !', date: '2024-10-28T12:00:00Z', isRead: true },
    { id: 'notif-004', title: 'Abonnement', message: 'Votre abonnement expire dans 15 jours. Pensez à le renouveler.', date: '2024-10-25T09:00:00Z', isRead: true },
];

export const adminDashboardStats = {
    totalUsers: 152,
    totalSubjects: 78,
    totalBooks: 25,
    totalDrives: 4,
};

export const recentActivities = [
    { id: 1, type: 'user_signup', description: 'Nouvel utilisateur : Jean Dupont', time: 'il y a 5 minutes' },
    { id: 2, type: 'subject_add', description: 'Nouveau sujet ajouté : "Analyse 2 - Partiel 2024"', time: 'il y a 1 heure' },
    { id: 3, type: 'book_add', description: 'Nouveau livre ajouté : "Physique des Ondes"', time: 'il y a 3 heures' },
    { id: 4, type: 'user_subscription', description: 'Abonnement renouvelé pour Marie Claire', time: 'il y a 5 heures' },
];

export const userSignupsData = [
    { name: 'Mai', utilisateurs: 20 },
    { name: 'Juin', utilisateurs: 35 },
    { name: 'Juil', utilisateurs: 30 },
    { name: 'Août', utilisateurs: 45 },
    { name: 'Sept', utilisateurs: 60 },
    { name: 'Oct', utilisateurs: 82 },
];

export const subjectsDistributionData = [
    { name: 'Maths', sujets: 12 },
    { name: 'Physique', sujets: 15 },
    { name: 'Informatique', sujets: 25 },
    { name: 'Géographie', sujets: 5 },
];