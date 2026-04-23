import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import dayjs from 'dayjs';

import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TodayIcon from '@mui/icons-material/Today';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

import MainLayout from '../../components/Layout/MainLayout';
import AdminConfirmDialog from '../../components/Common/AdminConfirmDialog';
import PageHeader from '../../components/Common/PageHeader';
import api from '../../utils/api';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COLOR_OPTIONS = [
  { label: 'Blue', value: '#1565c0' },
  { label: 'Green', value: '#2e7d32' },
  { label: 'Red', value: '#c62828' },
  { label: 'Orange', value: '#e65100' },
  { label: 'Purple', value: '#6a1b9a' },
  { label: 'Teal', value: '#00695c' },
  { label: 'Pink', value: '#ad1457' },
  { label: 'Brown', value: '#4e342e' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  startDate: dayjs().format('YYYY-MM-DDTHH:mm'),
  endDate: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
  color: '#1565c0',
};

export default function CalendarPage() {
  const { enqueueSnackbar } = useSnackbar();

  const [currentDate, setCurrentDate] = useState(dayjs());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const year = currentDate.year();
      const month = currentDate.month() + 1;
      const res = await api.get('/calendar', { params: { year, month } });
      const data = res.data.data || res.data;
      const items = Array.isArray(data) ? data : data.items || data.events || [];
      setEvents(items);
    } catch {
      enqueueSnackbar('Failed to load events', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentDate, enqueueSnackbar]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Build calendar grid
  const buildCalendarGrid = () => {
    const startOfMonth = currentDate.startOf('month');
    const daysInMonth = currentDate.daysInMonth();
    // day of week: 0=Sun, 1=Mon... we want Mon=0
    let startDow = startOfMonth.day(); // 0=Sun
    startDow = startDow === 0 ? 6 : startDow - 1; // shift so Mon=0

    const cells = [];
    // empty cells before start
    for (let i = 0; i < startDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const getEventsForDay = (day) => {
    if (!day) return [];
    const dateStr = currentDate.date(day).format('YYYY-MM-DD');
    return events.filter((ev) => {
      const start = dayjs(ev.startDate || ev.start).format('YYYY-MM-DD');
      const end = dayjs(ev.endDate || ev.end).format('YYYY-MM-DD');
      return dateStr >= start && dateStr <= end;
    });
  };

  const openAdd = (day) => {
    const base = day ? currentDate.date(day) : dayjs();
    setFormData({
      ...EMPTY_FORM,
      startDate: base.format('YYYY-MM-DDTHH:mm'),
      endDate: base.add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    });
    setEditId(null);
    setFormOpen(true);
  };

  const openEdit = (ev) => {
    setFormData({
      title: ev.title || '',
      description: ev.description || '',
      startDate: ev.startDate ? dayjs(ev.startDate).format('YYYY-MM-DDTHH:mm') : ev.start || '',
      endDate: ev.endDate ? dayjs(ev.endDate).format('YYYY-MM-DDTHH:mm') : ev.end || '',
      color: ev.color || '#1565c0',
    });
    setEditId(ev._id || ev.id);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title) { enqueueSnackbar('Title is required', { variant: 'warning' }); return; }
    setFormLoading(true);
    try {
      if (editId) {
        await api.put(`/calendar/${editId}`, formData);
        enqueueSnackbar('Event updated', { variant: 'success' });
      } else {
        await api.post('/calendar', formData);
        enqueueSnackbar('Event created', { variant: 'success' });
      }
      setFormOpen(false);
      fetchEvents();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Save failed', { variant: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/calendar/${deleteId}`);
      enqueueSnackbar('Event deleted', { variant: 'success' });
      setDeleteOpen(false);
      setDetailOpen(false);
      fetchEvents();
    } catch (err) {
      enqueueSnackbar(err?.response?.data?.message || 'Delete failed', { variant: 'error' });
    }
  };

  const handleEventClick = (ev) => {
    setSelectedEvent(ev);
    setDetailOpen(true);
  };

  const cells = buildCalendarGrid();
  const today = dayjs();
  const isCurrentMonth = currentDate.isSame(today, 'month');

  return (
    <MainLayout title="Calendar">
      <PageHeader
        title="Calendar"
        subtitle={`${events.length} event${events.length !== 1 ? 's' : ''} this month`}
        icon={<CalendarMonthIcon />}
        color="#1565c0"
        breadcrumbs={[{ label: 'Master Data' }, { label: 'Calendar' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAdd(null)}>
            Add Event
          </Button>
        }
      />

      {/* Month navigation */}
      <Card elevation={2} sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <IconButton onClick={() => setCurrentDate((d) => d.subtract(1, 'month'))}>
              <ChevronLeftIcon />
            </IconButton>
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography variant="h6" fontWeight={700}>
                {currentDate.format('MMMM YYYY')}
              </Typography>
              {!isCurrentMonth && (
                <Tooltip title="Go to today">
                  <IconButton size="small" onClick={() => setCurrentDate(dayjs())}>
                    <TodayIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
            <IconButton onClick={() => setCurrentDate((d) => d.add(1, 'month'))}>
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {/* Day headers */}
          <Grid container columns={7} sx={{ mb: 0.5 }}>
            {DAYS_OF_WEEK.map((d) => (
              <Grid item xs={1} key={d}>
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', py: 0.5 }}
                >
                  {d}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ mb: 0.5 }} />

          {/* Calendar grid */}
          <Grid container columns={7}>
            {cells.map((day, idx) => {
              const dayEvents = getEventsForDay(day);
              const isToday = day && isCurrentMonth && today.date() === day;

              return (
                <Grid item xs={1} key={idx}>
                  <Box
                    sx={{
                      minHeight: 80,
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      bgcolor: day ? (isToday ? 'primary.50' : 'background.paper') : 'grey.50',
                      cursor: day ? 'pointer' : 'default',
                      '&:hover': day ? { bgcolor: 'action.hover' } : {},
                    }}
                    onClick={() => day && openAdd(day)}
                  >
                    {day && (
                      <>
                        <Typography
                          variant="caption"
                          fontWeight={isToday ? 700 : 400}
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            bgcolor: isToday ? 'primary.main' : 'transparent',
                            color: isToday ? 'white' : 'text.primary',
                            mb: 0.25,
                          }}
                        >
                          {day}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, mt: 0.25 }}>
                          {dayEvents.slice(0, 3).map((ev) => (
                            <Chip
                              key={ev._id || ev.id}
                              label={ev.title}
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleEventClick(ev); }}
                              sx={{
                                bgcolor: ev.color || '#1565c0',
                                color: 'white',
                                fontSize: 10,
                                height: 18,
                                '& .MuiChip-label': { px: 0.5 },
                              }}
                            />
                          ))}
                          {dayEvents.length > 3 && (
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                              +{dayEvents.length - 3} more
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Add/Edit Form Dialog */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle>{editId ? 'Edit Event' : 'Add Event'}</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select
                value={formData.color}
                label="Color"
                onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
              >
                {COLOR_OPTIONS.map((c) => (
                  <MenuItem key={c.value} value={c.value}>
                    <Stack direction="row" alignItems="center" gap={1}>
                      <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: c.value }} />
                      {c.label}
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 1.5 }}>
          <Button onClick={() => setFormOpen(false)} disabled={formLoading} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={formLoading}
            startIcon={formLoading ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {formLoading ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        {selectedEvent && (
          <>
            <DialogTitle>
              <Stack direction="row" alignItems="center" gap={1}>
                <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: selectedEvent.color || '#1565c0', flexShrink: 0 }} />
                {selectedEvent.title}
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent>
              {selectedEvent.description && (
                <Typography variant="body2" mb={1}>{selectedEvent.description}</Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                Start: {dayjs(selectedEvent.startDate || selectedEvent.start).format('MMM DD, YYYY HH:mm')}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                End: {dayjs(selectedEvent.endDate || selectedEvent.end).format('MMM DD, YYYY HH:mm')}
              </Typography>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 2, py: 1 }}>
              <Button onClick={() => setDetailOpen(false)} color="inherit" size="small">Close</Button>
              <Button
                startIcon={<EditIcon />}
                size="small"
                color="warning"
                onClick={() => openEdit(selectedEvent)}
              >
                Edit
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                size="small"
                color="error"
                onClick={() => { setDeleteId(selectedEvent._id || selectedEvent.id); setDeleteOpen(true); setDetailOpen(false); }}
              >
                Delete
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Delete Confirm */}
      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Event"
        description="Are you sure you want to delete this event? Enter admin password to confirm."
      />
    </MainLayout>
  );
}
