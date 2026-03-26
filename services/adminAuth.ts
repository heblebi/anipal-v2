// Admin kimlik bilgileri — normal kullanıcı sisteminden tamamen bağımsız
// Değiştirmek için bu dosyayı düzenle

const ADMIN_USERS = [
    { username: 'heblebi', password: 'Anipal@2025!' },
];

const SESSION_KEY = 'anipal_admin_session';

export interface AdminSession {
    username: string;
    loginAt: string;
}

export const adminLogin = (username: string, password: string): AdminSession => {
    const match = ADMIN_USERS.find(u => u.username === username && u.password === password);
    if (!match) throw new Error('Geçersiz admin kullanıcı adı veya şifre.');
    const session: AdminSession = { username: match.username, loginAt: new Date().toISOString() };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
};

export const adminLogout = () => sessionStorage.removeItem(SESSION_KEY);

export const getAdminSession = (): AdminSession | null => {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
};
