/**
 * Parse student identity from MNIT email
 * Supports formats:
 * - 2024ucp1566@mnit.ac.in (no dashes)
 * - 2024-UCP-1566@mnit.ac.in (with dashes)
 * 
 * Branch Codes:
 * - UCH/uch: Chemical Engineering
 * - UCP/ucp: Computer Science
 * - UME/ume: Mechanical Engineering  
 * - UMT/umt: Metallurgy
 * - UCE/uce: Civil Engineering
 * - UEC/uec: Electronics & Communication
 * - UEE/uee: Electrical Engineering
 */

// Standard branch code mapping (lowercase)
export const BRANCH_CODES = {
    'uch': { name: 'Chemical Engineering', shortName: 'Chemical' },
    'ucp': { name: 'Computer Science Engineering', shortName: 'CSE' },
    'ume': { name: 'Mechanical Engineering', shortName: 'Mech' },
    'umt': { name: 'Metallurgical Engineering', shortName: 'Metallurgy' },
    'uce': { name: 'Civil Engineering', shortName: 'Civil' },
    'uec': { name: 'Electronics & Communication Engineering', shortName: 'ECE' },
    'uee': { name: 'Electrical Engineering', shortName: 'EE' }
};

// All valid branch codes (for validation)
export const VALID_BRANCH_CODES = Object.keys(BRANCH_CODES);

export const parseIdentityFromEmail = (email) => {
    try {
        if (!email.endsWith('@mnit.ac.in')) {
            throw new Error('Invalid domain');
        }

        const localPart = email.split('@')[0].toLowerCase();

        let admissionYear, branchCode, rollSuffix;

        // Try format WITH dashes: 2024-uch-1566
        if (localPart.includes('-')) {
            const parts = localPart.split('-');
            if (parts.length !== 3) {
                throw new Error('Invalid email format');
            }
            admissionYear = parseInt(parts[0], 10);
            branchCode = parts[1].toLowerCase();
            rollSuffix = parts[2];
        }
        // Try format WITHOUT dashes: 2024uch1566
        else {
            // Pattern: 4 digits (year) + 2-3 letters (branch) + digits (roll)
            const match = localPart.match(/^(\d{4})([a-z]{2,3})(\d+)$/i);
            if (!match) {
                throw new Error('Invalid email format');
            }
            admissionYear = parseInt(match[1], 10);
            branchCode = match[2].toLowerCase();
            rollSuffix = match[3];
        }

        // Validate year is reasonable (2000-2099)
        if (admissionYear < 2000 || admissionYear > 2099) {
            throw new Error('Invalid admission year');
        }

        // Check if branch code is valid
        const branchInfo = BRANCH_CODES[branchCode];

        if (!branchInfo) {
            // Not a standard branch code - might need admin review
            return {
                admissionYear,
                branchCode: branchCode,
                branchName: branchCode.toUpperCase(),
                rollNo: localPart,
                needsReview: true // Flag for non-standard branch
            };
        }

        return {
            admissionYear,
            branchCode: branchCode, // Normalized to lowercase
            branchName: branchInfo.name,
            rollNo: localPart
        };
    } catch (error) {
        console.error('Email parsing error:', error.message);
        return null;
    }
};

/**
 * Check if an @mnit.ac.in email is a valid student email
 * Returns false if it's a staff/professor email format
 */
export const isValidStudentEmail = (email) => {
    if (!email.endsWith('@mnit.ac.in')) return false;

    const localPart = email.split('@')[0].toLowerCase();

    // Student emails start with 4-digit year
    const studentPattern = /^\d{4}/;
    return studentPattern.test(localPart);
};

export const calculateAcademicState = (admissionYear) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Academic year calculation:
    // - Academic year starts in July/August
    // - A student admitted in year X is in Year 1 from Aug-X to Jul-(X+1)
    // - They move to Year 2 in Aug-(X+1) and so on
    //
    // Example (for student admitted in 2024):
    // - Aug 2024 to Jul 2025: Year 1
    // - Aug 2025 to Jul 2026: Year 2
    // - Aug 2026 to Jul 2027: Year 3
    // - Aug 2027 to Jul 2028: Year 4
    //
    // So in January 2026 (currentMonth=0, currentYear=2026):
    // - 2024 admission → Year 2 (since we're between Aug 2025 and Jul 2026)
    // - 2025 admission → Year 1 (since we're between Aug 2025 and Jul 2026)
    // - 2023 admission → Year 3
    // - 2022 admission → Year 4

    let yearOfStudy;

    if (currentMonth >= 7) {
        // Aug-Dec: New academic year has started
        // yearOfStudy = currentYear - admissionYear + 1
        yearOfStudy = currentYear - admissionYear + 1;
    } else {
        // Jan-Jul: Still in the previous academic year's session
        // yearOfStudy = currentYear - admissionYear
        // (because the academic year that started in Aug of previous year is still ongoing)
        yearOfStudy = currentYear - admissionYear;
    }

    // Ensure valid year (1-4)
    if (yearOfStudy < 1) yearOfStudy = 1;
    if (yearOfStudy > 4) yearOfStudy = 4;

    // Semester calculation:
    // - Odd semesters (1,3,5,7) run from Aug-Dec
    // - Even semesters (2,4,6,8) run from Jan-Jul (approx)
    let semester;
    if (currentMonth >= 7) { // Aug-Dec
        semester = (yearOfStudy * 2) - 1; // Odd: 1,3,5,7
    } else { // Jan-Jul
        semester = yearOfStudy * 2; // Even: 2,4,6,8
    }

    // Clamp semester to valid range
    if (semester < 1) semester = 1;
    if (semester > 8) semester = 8;

    return {
        year: yearOfStudy,
        semester: semester
    };
};

/**
 * Get current academic year string (e.g., "2024-2025")
 */
export const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Academic year starts in July/August
    if (month >= 6) { // Jul onwards
        return `${year}-${year + 1}`;
    } else {
        return `${year - 1}-${year}`;
    }
};
