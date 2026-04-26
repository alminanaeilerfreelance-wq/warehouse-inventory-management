const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const adminPasswordAuth = require('../middleware/adminPassword');
const { protect } = require('../middleware/auth');

// GET all attendance records
router.get('/', protect, async (req, res) => {
  try {
    const { employeeId, startDate, endDate, status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (employeeId) query.employee = employeeId;
    if (status) query.status = status;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;
    const attendance = await Attendance.find(query)
      .populate('employee', 'name employeeId')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);
    res.json({ data: attendance, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE attendance record (requires admin password)
router.post('/', protect, async (req, res) => {
  try {
    const { employee, date, checkIn, checkOut, status, hoursWorked, remarks } = req.body;
    
    if (!employee || !date) {
      return res.status(400).json({ message: 'Employee and date are required' });
    }

    const existingRecord = await Attendance.findOne({ employee, date: new Date(date).toDateString() });
    if (existingRecord) {
      return res.status(400).json({ message: 'Attendance record already exists for this date' });
    }

    const attendance = new Attendance({
      employee,
      date: new Date(date),
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      status: status || 'present',
      hoursWorked,
      remarks,
      createdBy: req.user.id,
    });

    const savedAttendance = await attendance.save();
    res.status(201).json(savedAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// UPDATE attendance record (requires admin password)
router.put('/:id', protect, async (req, res) => {
  try {
    const { checkIn, checkOut, status, hoursWorked, remarks } = req.body;
    const attendance = await Attendance.findById(req.params.id);
    
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    Object.assign(attendance, {
      checkIn: checkIn ? new Date(checkIn) : attendance.checkIn,
      checkOut: checkOut ? new Date(checkOut) : attendance.checkOut,
      status: status || attendance.status,
      hoursWorked: hoursWorked !== undefined ? hoursWorked : attendance.hoursWorked,
      remarks: remarks || attendance.remarks,
      updatedBy: req.user.id,
    });

    const updatedAttendance = await attendance.save();
    res.json(updatedAttendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE attendance record (requires admin password)
router.delete('/:id', protect, adminPasswordAuth, async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });
    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
