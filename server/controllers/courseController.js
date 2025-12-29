import { Course, Session } from '../models/index.js';
import { calculateAcademicState } from '../utils/identity.js';

/**
 * @route   POST /api/courses
 * @desc    Create a new course
 * @access  Private (Professor)
 */
export const createCourse = async (req, res) => {
    try {
        const {
            courseCode,
            courseName,
            description,
            branch,
            year,
            semester,
            defaultLocation,
            defaultDuration,
            lateThreshold
        } = req.body;

        if (!courseCode || !courseName || !branch || !year || !semester) {
            return res.status(400).json({
                success: false,
                error: 'Course code, name, branch, year, and semester are required'
            });
        }

        // Check if course code already exists for this professor
        const existingCourse = await Course.findOne({
            courseCode: courseCode.toUpperCase(),
            professor: req.user._id
        });

        if (existingCourse) {
            return res.status(400).json({
                success: false,
                error: 'Course with this code already exists'
            });
        }

        const course = await Course.create({
            courseCode: courseCode.toUpperCase().trim(),
            courseName: courseName.trim(),
            description: description?.trim() || '',
            branch: branch.toUpperCase().trim(), // Normalize branch code
            year: parseInt(year, 10),
            semester: parseInt(semester, 10),
            defaultLocation,
            defaultDuration: defaultDuration || 60,
            lateThreshold: lateThreshold || 15,
            professor: req.user._id
        });

        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error) {
        console.error('Create Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create course'
        });
    }
};

/**
 * @route   GET /api/courses
 * @desc    Get all courses for professor
 * @access  Private (Professor)
 */
export const getCourses = async (req, res) => {
    try {
        const { archived } = req.query;

        const query = { professor: req.user._id };
        if (archived !== 'true') {
            query.isArchived = false;
        }

        const courses = await Course.find(query)
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: courses.length,
            data: courses
        });
    } catch (error) {
        console.error('Get Courses Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get courses'
        });
    }
};

/**
 * @route   GET /api/courses/:id
 * @desc    Get course details
 * @access  Private (Professor)
 */
export const getCourse = async (req, res) => {
    try {
        const course = await Course.findOne({
            _id: req.params.id,
            professor: req.user._id
        });

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        // Get recent sessions
        const sessions = await Session.find({ course: course._id })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                ...course.toObject(),
                sessions
            }
        });
    } catch (error) {
        console.error('Get Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get course'
        });
    }
};

/**
 * @route   PUT /api/courses/:id
 * @desc    Update course settings
 * @access  Private (Professor)
 */
export const updateCourse = async (req, res) => {
    try {
        const allowedFields = [
            'courseName', 'description',
            'defaultLocation', 'defaultDuration', 'lateThreshold'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, professor: req.user._id },
            updates,
            { new: true, runValidators: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        console.error('Update Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update course'
        });
    }
};

/**
 * @route   DELETE /api/courses/:id
 * @desc    Archive course
 * @access  Private (Professor)
 */
export const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findOneAndUpdate(
            { _id: req.params.id, professor: req.user._id },
            { isArchived: true },
            { new: true }
        );

        if (!course) {
            return res.status(404).json({
                success: false,
                error: 'Course not found'
            });
        }

        res.json({
            success: true,
            message: 'Course archived successfully'
        });
    } catch (error) {
        console.error('Delete Course Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to archive course'
        });
    }
};

/**
 * @route   GET /api/courses/my-courses
 * @desc    Get courses eligible for the student (matched by branch and year)
 * @access  Private (Student)
 */
export const getStudentCourses = async (req, res) => {
    try {
        const user = req.user;

        // Get student's branch code and calculate current academic state
        const branchCode = user.branchCode; // e.g., 'UCP'
        const admissionYear = user.admissionYear;

        if (!branchCode || !admissionYear) {
            console.log('Student missing branch or admission year:', { branchCode, admissionYear });
            return res.json({ success: true, data: [], message: 'Missing academic info' });
        }

        // Calculate current year and semester
        const academicState = calculateAcademicState(admissionYear);
        console.log('Student academic state:', { branchCode, academicState });

        // Find courses matching student's branch and current year
        // Branch in course can be stored as 'UCP' or 'CSE' - we need to match both
        const branchVariants = [branchCode];

        // Add common mappings
        const branchMap = {
            'UCP': ['UCP', 'CSE'],
            'CSE': ['UCP', 'CSE'],
            'UEC': ['UEC', 'ECE'],
            'ECE': ['UEC', 'ECE'],
            'UEE': ['UEE', 'EE'],
            'EE': ['UEE', 'EE'],
            'UME': ['UME', 'ME'],
            'ME': ['UME', 'ME']
        };

        const searchBranches = branchMap[branchCode] || [branchCode];

        const courses = await Course.find({
            branch: { $in: searchBranches },
            year: academicState.year,
            isArchived: false
        })
            .select('courseName courseCode branch year semester professor')
            .populate('professor', 'name email');

        console.log(`Found ${courses.length} courses for ${branchCode} Year ${academicState.year}`);

        res.json({
            success: true,
            count: courses.length,
            data: courses,
            academicInfo: {
                branch: branchCode,
                year: academicState.year,
                semester: academicState.semester
            }
        });
    } catch (error) {
        console.error('Get Student Courses Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch courses'
        });
    }
};
