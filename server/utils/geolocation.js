/**
 * Enhanced Geolocation Validation
 * Implements hardened location verification to reduce spoofing effectiveness
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Validate location data format
 * @param {object} location 
 * @returns {object} { valid, reason }
 */
export const validateLocationFormat = (location) => {
    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, timestamp } = location;

    // Basic presence check
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        return { valid: false, reason: 'MISSING_COORDINATES' };
    }

    // Valid coordinate ranges
    if (latitude < -90 || latitude > 90) {
        return { valid: false, reason: 'INVALID_LATITUDE' };
    }
    if (longitude < -180 || longitude > 180) {
        return { valid: false, reason: 'INVALID_LONGITUDE' };
    }

    // Accuracy check (if provided)
    if (typeof accuracy === 'number') {
        if (accuracy < 0) {
            return { valid: false, reason: 'NEGATIVE_ACCURACY' };
        }
    }

    return { valid: true };
};

/**
 * Detect potential GPS spoofing indicators
 * @param {object} location Current location data
 * @param {object} previousLocation Previous location data (optional)
 * @returns {object} { suspicious, flags, score }
 */
export const detectSpoofing = (location, previousLocation = null) => {
    const flags = [];
    let suspicionScore = 0;

    const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed, timestamp } = location;

    // Flag 1: Perfect accuracy (< 3 meters is suspiciously perfect)
    if (typeof accuracy === 'number' && accuracy < 3) {
        flags.push('PERFECT_ACCURACY');
        suspicionScore += 20;
    }

    // Flag 2: Accuracy too poor to be useful (> 500 meters)
    if (typeof accuracy === 'number' && accuracy > 500) {
        flags.push('POOR_ACCURACY');
        suspicionScore += 10;
    }

    // Flag 3: Missing accuracy when it should be present
    if (accuracy === undefined || accuracy === null) {
        flags.push('MISSING_ACCURACY');
        suspicionScore += 5;
    }

    // Flag 4: Altitude at exact 0 (common in spoofed locations)
    if (typeof altitude === 'number' && altitude === 0) {
        flags.push('ZERO_ALTITUDE');
        suspicionScore += 10;
    }

    // Flag 5: Exactly round coordinates (common in mock locations)
    const latDecimals = (latitude.toString().split('.')[1] || '').length;
    const lonDecimals = (longitude.toString().split('.')[1] || '').length;
    if (latDecimals < 4 || lonDecimals < 4) {
        flags.push('LOW_PRECISION_COORDINATES');
        suspicionScore += 15;
    }

    // Flag 6: Exactly matching hundredths (very unlikely naturally)
    const latStr = latitude.toFixed(6);
    const lonStr = longitude.toFixed(6);
    if (latStr.endsWith('000000') || lonStr.endsWith('000000')) {
        flags.push('SUSPICIOUS_PRECISION');
        suspicionScore += 15;
    }

    // Flag 7: Location jump detection (if previous location available)
    if (previousLocation && previousLocation.latitude && previousLocation.longitude) {
        const distance = calculateDistance(
            previousLocation.latitude,
            previousLocation.longitude,
            latitude,
            longitude
        );
        const timeDiff = (timestamp || Date.now()) - (previousLocation.timestamp || 0);
        const timeSeconds = timeDiff / 1000;

        if (timeSeconds > 0) {
            const speedMps = distance / timeSeconds;

            // Teleportation: > 300 m/s (faster than any vehicle)
            if (speedMps > 300) {
                flags.push('TELEPORTATION');
                suspicionScore += 50;
            }
            // Very fast movement: > 50 m/s (180 km/h)
            else if (speedMps > 50 && timeSeconds < 60) {
                flags.push('RAPID_MOVEMENT');
                suspicionScore += 20;
            }
        }
    }

    // Flag 8: Inconsistent reported speed vs calculated speed
    if (previousLocation && typeof speed === 'number' && previousLocation.timestamp) {
        const distance = calculateDistance(
            previousLocation.latitude,
            previousLocation.longitude,
            latitude,
            longitude
        );
        const timeDiff = ((timestamp || Date.now()) - previousLocation.timestamp) / 1000;
        const calculatedSpeed = timeDiff > 0 ? distance / timeDiff : 0;

        // More than 50% difference
        if (speed > 0 && Math.abs(calculatedSpeed - speed) > speed * 0.5) {
            flags.push('SPEED_MISMATCH');
            suspicionScore += 25;
        }
    }

    return {
        suspicious: suspicionScore >= 30,
        flags,
        score: suspicionScore,
        maxScore: 100
    };
};

/**
 * Validate location against session center
 * @param {object} studentLocation 
 * @param {object} sessionLocation 
 * @returns {object} Validation result
 */
export const validateLocationAgainstSession = (studentLocation, sessionLocation) => {
    const { latitude, longitude, accuracy } = studentLocation;
    const { centerLat, centerLng, radius } = sessionLocation;

    // Calculate distance
    const distance = calculateDistance(latitude, longitude, centerLat, centerLng);

    // Check if within radius
    const withinRadius = distance <= radius;

    // Check with accuracy margin
    // If accuracy is poor, the actual position could be anywhere in that radius
    const effectiveDistance = accuracy ? Math.max(0, distance - accuracy) : distance;
    const withinRadiusWithAccuracy = effectiveDistance <= radius;

    // Distance buffer warning (within 10% of edge)
    const nearEdge = distance > radius * 0.9 && distance <= radius;

    return {
        valid: withinRadius,
        validWithAccuracy: withinRadiusWithAccuracy,
        distance: Math.round(distance),
        allowedRadius: radius,
        nearEdge,
        percentage: Math.min(100, Math.round((distance / radius) * 100)),
        message: withinRadius
            ? `Within range (${Math.round(distance)}m of ${radius}m)`
            : `Out of range (${Math.round(distance)}m from center, max ${radius}m)`
    };
};

/**
 * Comprehensive location validation
 * @param {object} params 
 * @returns {object} Complete validation result
 */
export const validateLocation = (params) => {
    const {
        studentLocation,
        sessionLocation,
        previousLocation = null,
        strictMode = false
    } = params;

    const result = {
        valid: true,
        checks: {},
        flags: [],
        distance: 0,
        details: {}
    };

    // Check 1: Format validation
    const formatCheck = validateLocationFormat(studentLocation);
    result.checks.format = formatCheck.valid;
    if (!formatCheck.valid) {
        result.valid = false;
        result.flags.push(formatCheck.reason);
        result.error = formatCheck.reason;
        return result;
    }

    // Check 2: Distance validation
    const distanceCheck = validateLocationAgainstSession(studentLocation, sessionLocation);
    result.checks.distance = distanceCheck.valid;
    result.distance = distanceCheck.distance;
    result.details.distance = distanceCheck;

    if (!distanceCheck.valid) {
        result.valid = false;
        result.flags.push('OUT_OF_RANGE');
        result.error = distanceCheck.message;
    }

    // Check 3: Spoofing detection
    const spoofCheck = detectSpoofing(studentLocation, previousLocation);
    result.checks.spoofing = !spoofCheck.suspicious;
    result.details.spoofing = spoofCheck;
    result.flags = [...result.flags, ...spoofCheck.flags];

    if (spoofCheck.suspicious) {
        // In strict mode, fail on suspicion
        if (strictMode) {
            result.valid = false;
            result.error = 'SUSPICIOUS_LOCATION';
        }
        result.suspicious = true;
    }

    // Check 4: Accuracy requirement
    const minAccuracy = sessionLocation.requiredAccuracy || 100; // Default 100m
    if (typeof studentLocation.accuracy === 'number' && studentLocation.accuracy > minAccuracy) {
        result.checks.accuracy = false;
        result.flags.push('ACCURACY_TOO_LOW');
        if (strictMode) {
            result.valid = false;
            result.error = `Location accuracy must be within ${minAccuracy}m`;
        }
    } else {
        result.checks.accuracy = true;
    }

    return result;
};

/**
 * Generate location sample requirements
 * For stable location verification, require multiple samples
 */
export const getLocationSampleRequirements = () => {
    return {
        minSamples: 3,
        maxTimeBetweenSamples: 10000, // 10 seconds
        minTimeBetweenSamples: 2000,  // 2 seconds
        maxVariance: 50,              // 50 meters max variance between samples
        requiredAccuracy: 100         // Must be within 100m accuracy
    };
};

/**
 * Validate multiple location samples
 * @param {array} samples Array of location samples
 * @returns {object} Validation result
 */
export const validateLocationSamples = (samples) => {
    const requirements = getLocationSampleRequirements();

    if (!samples || samples.length < requirements.minSamples) {
        return {
            valid: false,
            reason: 'INSUFFICIENT_SAMPLES',
            required: requirements.minSamples,
            provided: samples?.length || 0
        };
    }

    // Calculate centroid
    const avgLat = samples.reduce((sum, s) => sum + s.latitude, 0) / samples.length;
    const avgLon = samples.reduce((sum, s) => sum + s.longitude, 0) / samples.length;

    // Check variance
    const variances = samples.map(s =>
        calculateDistance(s.latitude, s.longitude, avgLat, avgLon)
    );
    const maxVariance = Math.max(...variances);

    if (maxVariance > requirements.maxVariance) {
        return {
            valid: false,
            reason: 'LOCATION_UNSTABLE',
            maxVariance,
            allowedVariance: requirements.maxVariance
        };
    }

    // Check timing
    const timestamps = samples.map(s => s.timestamp || 0).sort((a, b) => a - b);
    for (let i = 1; i < timestamps.length; i++) {
        const diff = timestamps[i] - timestamps[i - 1];
        if (diff < requirements.minTimeBetweenSamples || diff > requirements.maxTimeBetweenSamples) {
            return {
                valid: false,
                reason: 'INVALID_SAMPLE_TIMING',
                message: `Samples must be ${requirements.minTimeBetweenSamples / 1000}-${requirements.maxTimeBetweenSamples / 1000} seconds apart`
            };
        }
    }

    return {
        valid: true,
        centroid: { latitude: avgLat, longitude: avgLon },
        maxVariance,
        sampleCount: samples.length
    };
};

export default {
    calculateDistance,
    validateLocationFormat,
    detectSpoofing,
    validateLocationAgainstSession,
    validateLocation,
    getLocationSampleRequirements,
    validateLocationSamples
};
