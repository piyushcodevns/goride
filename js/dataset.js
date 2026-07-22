"use strict";

(function() {
    // =====================================================
    // GO RIDE - AI/ML DATA COLLECTION MODULE
    // Stores booking data in localStorage for ML training
    // =====================================================

    const STORAGE_KEY = 'goride_booking_dataset';
    const MAX_RECORDS = 10000; // Prevent localStorage overflow

    /**
     * Save a booking record to localStorage
     * @param {Object} bookingData - The booking object from booking.js
     */
    window.saveBookingRecord = function(bookingData) {
        try {
            // Get existing records
            const existingRecords = getBookingRecords();
            
            // Create ML-ready record with required fields
            const now = new Date();
            const record = {
                booking_id: bookingData.bookingId || window.generateBookingID(),
                booking_date: bookingData.date || now.toISOString().split('T')[0],
                booking_time: bookingData.time || now.toTimeString().split(' ')[0],
                booking_day: now.toLocaleDateString('en-US', { weekday: 'long' }),
                booking_month: now.toLocaleDateString('en-US', { month: 'long' }),
                pickup: bookingData.pickup?.name || bookingData.pickup || '',
                destination: bookingData.drop?.name || bookingData.drop || '',
                pickup_latitude: bookingData.pickup?.lat || bookingData.pickupCoords?.lat || null,
                pickup_longitude: bookingData.pickup?.lng || bookingData.pickupCoords?.lng || null,
                destination_latitude: bookingData.drop?.lat || bookingData.dropCoords?.lat || null,
                destination_longitude: bookingData.drop?.lng || bookingData.dropCoords?.lng || null,
                distance_km: bookingData.distance || bookingData.route?.distanceKm || 0,
                eta_minutes: bookingData.duration || bookingData.route?.durationMinutes || 0,
                vehicle_type: bookingData.vehicle || bookingData.fare?.vehicle || '',
                fare_amount: bookingData.fare || bookingData.fare?.amount || 0,
                passengers: bookingData.passengers || 1,
                timestamp: now.toISOString()
            };

            // Add to records
            existingRecords.push(record);

            // Enforce max records limit (FIFO)
            if (existingRecords.length > MAX_RECORDS) {
                existingRecords.shift(); // Remove oldest record
            }

            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(existingRecords));
            
            console.log('[Dataset] Booking record saved:', record);
            return true;
        } catch (error) {
            console.error('[Dataset] Error saving booking record:', error);
            return false;
        }
    };

    /**
     * Get all booking records from localStorage
     * @returns {Array} Array of booking records
     */
    function getBookingRecords() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[Dataset] Error reading records:', error);
            return [];
        }
    }

    /**
     * Get the count of stored records
     * @returns {Number} Number of records
     */
    window.getDatasetCount = function() {
        return getBookingRecords().length;
    };

    /**
     * Clear all booking records from localStorage
     */
    window.clearDataset = function() {
        try {
            localStorage.removeItem(STORAGE_KEY);
            console.log('[Dataset] All records cleared');
            return true;
        } catch (error) {
            console.error('[Dataset] Error clearing records:', error);
            return false;
        }
    };

    /**
     * Export booking records as CSV
     * @returns {String} CSV formatted string
     */
    window.exportDatasetToCSV = function() {
        const records = getBookingRecords();
        
        if (records.length === 0) {
            return null;
        }

        // Define CSV headers (ML-ready format)
        const headers = [
            'booking_id',
            'booking_date',
            'booking_time',
            'booking_day',
            'booking_month',
            'pickup',
            'destination',
            'pickup_latitude',
            'pickup_longitude',
            'destination_latitude',
            'destination_longitude',
            'distance_km',
            'eta_minutes',
            'vehicle_type',
            'fare_amount',
            'passengers',
            'timestamp'
        ];

        // Convert records to CSV rows
        const csvRows = [];
        
        // Add header row
        csvRows.push(headers.join(','));

        // Add data rows
        records.forEach(record => {
            const row = headers.map(header => {
                let value = record[header];
                
                // Handle null/undefined
                if (value === null || value === undefined) {
                    return '';
                }
                
                // Convert to string and escape quotes
                value = String(value);
                
                // Escape commas and quotes by wrapping in quotes
                if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                
                return value;
            });
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    };

    /**
     * Trigger CSV download
     */
    window.downloadDatasetCSV = function() {
        const csv = window.exportDatasetToCSV();
        
        if (!csv) {
            window.showToast('No booking records to export.', 'error');
            return;
        }

        try {
            // Create blob and download link
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            // Generate filename with timestamp
            const timestamp = new Date().toISOString().split('T')[0];
            link.setAttribute('href', url);
            link.setAttribute('download', `goride_dataset_${timestamp}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            window.showToast(`Exported ${window.getDatasetCount()} booking records successfully!`, 'success');
        } catch (error) {
            console.error('[Dataset] Error downloading CSV:', error);
            window.showToast('Error exporting dataset. Please try again.', 'error');
        }
    };

    /**
     * Get dataset statistics
     * @returns {Object} Statistics about the dataset
     */
    window.getDatasetStats = function() {
        const records = getBookingRecords();
        
        if (records.length === 0) {
            return {
                totalRecords: 0,
                vehicleTypes: {},
                avgDistance: 0,
                avgFare: 0,
                dateRange: null
            };
        }

        // Calculate statistics
        const vehicleTypes = {};
        let totalDistance = 0;
        let totalFare = 0;

        records.forEach(record => {
            // Count vehicle types
            const vehicle = record.vehicle_type || 'unknown';
            vehicleTypes[vehicle] = (vehicleTypes[vehicle] || 0) + 1;
            
            // Sum distance and fare
            totalDistance += parseFloat(record.distance_km) || 0;
            totalFare += parseFloat(record.fare_amount) || 0;
        });

        // Get date range
        const dates = records.map(r => new Date(r.timestamp)).sort((a, b) => a - b);
        const dateRange = {
            earliest: dates[0]?.toISOString().split('T')[0] || null,
            latest: dates[dates.length - 1]?.toISOString().split('T')[0] || null
        };

        return {
            totalRecords: records.length,
            vehicleTypes,
            avgDistance: (totalDistance / records.length).toFixed(2),
            avgFare: (totalFare / records.length).toFixed(2),
            dateRange
        };
    };

    // =====================================================
    // INITIALIZATION
    // =====================================================
    console.log('[Dataset] AI/ML Data Collection Module initialized');
    console.log('[Dataset] Current record count:', window.getDatasetCount());
})();
