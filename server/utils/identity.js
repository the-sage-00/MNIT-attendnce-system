/**
 * Parse student identity from MNIT email
 * Supports formats:
 * - 2024ucp1566@mnit.ac.in (no dashes)
 * - 2024-UCP-1566@mnit.ac.in (with dashes)
 */
export const parseIdentityFromEmail = (email) => {
    try {
        if (!email.endsWith('@mnit.ac.in')) {
            throw new Error('Invalid domain');
        }

        const localPart = email.split('@')[0].toLowerCase();

        let admissionYear, branchCode, rollSuffix;

        // Try format WITH dashes: 2024-ucp-1566
        if (localPart.includes('-')) {
            const parts = localPart.split('-');
            if (parts.length !== 3) {
                throw new Error('Invalid email format');
            }
            admissionYear = parseInt(parts[0], 10);
            branchCode = parts[1].toUpperCase();
            rollSuffix = parts[2];
        }
        // Try format WITHOUT dashes: 2024ucp1566
        else {
            // Pattern: 4 digits (year) + 2-3 letters (branch) + digits (roll)
            const match = localPart.match(/^(\d{4})([a-z]{2,3})(\d+)$/i);
            if (!match) {
                throw new Error('Invalid email format');
            }
            admissionYear = parseInt(match[1], 10);
            branchCode = match[2].toUpperCase();
            rollSuffix = match[3];
        }

        // Validate year is reasonable (2000-2099)
        if (admissionYear < 2000 || admissionYear > 2099) {
            throw new Error('Invalid admission year');
        }

        // Map Branch Code to Name
        const branchMap = {
            'UCP': 'Computer Science Engineering',
            'CSE': 'Computer Science Engineering',
            'UEC': 'Electronics & Communication',
            'ECE': 'Electronics & Communication',
            'UEE': 'Electrical Engineering',
            'EE': 'Electrical Engineering',
            'UME': 'Mechanical Engineering',
            'ME': 'Mechanical Engineering',
            'UCE': 'Civil Engineering',
            'CE': 'Civil Engineering',
            'UCH': 'Chemical Engineering',
            'CH': 'Chemical Engineering',
            'UAR': 'Architecture',
            'AR': 'Architecture'
        };

        const branchName = branchMap[branchCode] || branchCode;

        return {
            admissionYear,
            branchCode,
            branchName,
            rollNo: localPart // Full local part as roll number
        };
    } catch (error) {
        console.error('Email parsing error:', error.message);
        return null;
    }
};

export const calculateAcademicState = (admissionYear) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Simple calculation: Year = Current Year - Admission Year + 1
    // If current year is 2025:
    // 2024 admission → Year 2
    // 2025 admission → Year 1
    // 2023 admission → Year 3
    // 2022 admission → Year 4

    let yearOfStudy = currentYear - admissionYear + 1;

    // Ensure valid year (1-4)
    if (yearOfStudy < 1) yearOfStudy = 1;
    if (yearOfStudy > 4) yearOfStudy = 4;

    // Semester: odd semesters in Aug-Dec, even in Jan-Jul
    let semester;
    if (currentMonth >= 7) {
        semester = (yearOfStudy * 2) - 1; // Odd: 1,3,5,7
    } else {
        semester = (yearOfStudy - 1) * 2 + 2; // Even: 2,4,6,8
        if (semester < 2) semester = 2;
    }

    return {
        year: yearOfStudy,
        semester: semester
    };
};
