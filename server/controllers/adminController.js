import { User } from '../models/index.js';

export const getPendingProfessors = async (req, res) => {
    try {
        const pending = await User.find({ role: 'pending_professor' });
        res.json({ success: true, count: pending.length, data: pending });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

export const approveProfessor = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (user.role !== 'pending_professor') {
            return res.status(400).json({ success: false, error: 'User is not a pending professor' });
        }

        if (action === 'approve') {
            user.role = 'professor';
            await user.save();
            res.json({ success: true, message: 'Professor approved', data: user });
        } else if (action === 'reject') {
            // Option: delete user or set to separate rejected role? 
            // Prompt says "Approves or rejects them".
            // If rejected, maybe they should be deleted so they can try again or just stay stuck?
            // "Access is denied" implies they can't do anything.
            // I'll delete them to keep it clean or just change role to 'student' (if they are wrongly identified?)
            // Safest is to delete or strictly Reject.
            await user.deleteOne();
            res.json({ success: true, message: 'Request rejected and user removed' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid action' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
