// ── requireRole ──────────────────────────────────────────────────────────────
const requireRole = (role) => (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole) return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อน' });
    if (userRole !== role) return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงส่วนนี้' });
    next();
};

// ── requireSelf ───────────────────────────────────────────────────────────────
const requireSelf = (req, res, next) => {
    const requesterId = req.headers['x-user-id'];
    if (!requesterId || requesterId !== req.params.userId)
        return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    next();
};

// ── validateNumeric ───────────────────────────────────────────────────────────
const validateNumeric = (req, res, next, val) => {
    if (isNaN(Number(val)))
        return res.status(400).json({ message: `${val} ต้องเป็นตัวเลข` });
    next();
};

module.exports = { requireRole, requireSelf, validateNumeric };
