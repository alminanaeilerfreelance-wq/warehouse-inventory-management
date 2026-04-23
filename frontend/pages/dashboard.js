import React, { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Badge from '@mui/material/Badge';
import IconButton from '@mui/material/IconButton';

import InventoryIcon from '@mui/icons-material/Inventory';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BusinessIcon from '@mui/icons-material/Business';
import NotificationsIcon from '@mui/icons-material/Notifications';
import StoreIcon from '@mui/icons-material/Store';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import dayjs from 'dayjs';

import MainLayout from '../components/Layout/MainLayout';
import StatsCard from '../components/Dashboard/StatsCard';
import NotificationList from '../components/Dashboard/NotificationList';
import api, { getDashboard, getNotifications } from '../utils/api';
import { useSocket } from '../utils/useSocket';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  paid: 'success',
  pending: 'warning',
  overdue: 'error',
  draft: 'default',
  cancelled: 'default',
  open: 'info',
};

const PIE_COLORS = ['#2e7d32', '#ed6c02', '#d32f2f'];

const MOCK_MONTHLY_SALES = [
  { month: 'Nov', sales: 42000, pos: 18000 },
  { month: 'Dec', sales: 68000, pos: 23000 },
  { month: 'Jan', sales: 53000, pos: 15000 },
  { month: 'Feb', sales: 71000, pos: 28000 },
  { month: 'Mar', sales: 60000, pos: 21000 },
  { month: 'Apr', sales: 85000, pos: 32000 },
];

const MOCK_STOCK_DISTRIBUTION = [
  { name: 'In Stock', value: 68 },
  { name: 'Low Stock', value: 22 },
  { name: 'Out of Stock', value: 10 },
];

const MOCK_TOP_PRODUCTS = [
  { name: 'Product A', quantity: 340 },
  { name: 'Product B', quantity: 280 },
  { name: 'Product C', quantity: 220 },
  { name: 'Product D', quantity: 190 },
  { name: 'Product E', quantity: 150 },
];

const fmtCurrency = (val) =>
  typeof val === 'number'
    ? val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '0.00';

const fmtYAxis = (val) => `₱${(val / 1000).toFixed(0)}k`;

const renderPieLabel = ({ name, percent }) => `${(percent * 100).toFixed(0)}%`;

export default function DashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalInventoryItems: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalBranches: 0,
    monthlySales: 0,
    pendingPOs: 0,
    lowStockCount: 0,
  });
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [monthlySalesChart, setMonthlySalesChart] = useState(MOCK_MONTHLY_SALES);
  const [stockDistribution, setStockDistribution] = useState(MOCK_STOCK_DISTRIBUTION);
  const [topProducts, setTopProducts] = useState(MOCK_TOP_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [noBranch, setNoBranch] = useState(false);
  const [branchInfo, setBranchInfo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [notifBadge, setNotifBadge] = useState(0);
  const [lowStockItems, setLowStockItems] = useState([]);

  const handleSocketNotification = useCallback((data) => {
    setNotifBadge((prev) => prev + 1);
    setNotifications((prev) => [{ _id: Date.now(), message: data.message || 'New notification', type: data.type, createdAt: new Date().toISOString(), read: false }, ...prev]);
  }, []);

  useSocket(user?._id || user?.id, handleSocketNotification);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, notifRes] = await Promise.all([
          getDashboard(),
          getNotifications(),
        ]);

        const dashData = dashRes.data.data || dashRes.data;

        // Handle no-branch case for regular users
        if (dashData.noBranchAssigned) {
          setNoBranch(true);
          setLoading(false);
          return;
        }
        setIsAdmin(dashData.isAdmin !== false);
        setBranchInfo(dashData.branchInfo || null);

        setStats({
          totalInventoryItems: dashData.totalInventoryItems || dashData.totalInventory || 0,
          totalCustomers: dashData.totalCustomers || 0,
          totalSuppliers: dashData.totalSuppliers || 0,
          totalBranches: dashData.totalBranches || 0,
          monthlySales: dashData.monthlySales || 0,
          pendingPOs: dashData.pendingPOs || dashData.pendingPurchaseOrders || 0,
          lowStockCount: dashData.lowStockCount || dashData.lowStockItems || 0,
        });

        const invoices = dashData.recentInvoices || dashData.invoices || [];
        setRecentInvoices(invoices.slice(0, 5));

        if (dashData.monthlySalesChart && Array.isArray(dashData.monthlySalesChart) && dashData.monthlySalesChart.length > 0) {
          setMonthlySalesChart(dashData.monthlySalesChart);
        }
        if (dashData.stockDistribution && Array.isArray(dashData.stockDistribution) && dashData.stockDistribution.length > 0) {
          setStockDistribution(dashData.stockDistribution);
        }
        if (dashData.topProducts && Array.isArray(dashData.topProducts) && dashData.topProducts.length > 0) {
          setTopProducts(dashData.topProducts);
        }

        const notifData = notifRes.data.data || notifRes.data;
        const notifItems = Array.isArray(notifData) ? notifData : notifData.items || [];
        setNotifications(notifItems);
        setNotifBadge(notifItems.filter((n) => !n.read).length);

        // Fetch low stock items for alert panel
        try {
          const lsRes = await api.get('/inventory/low-stock');
          const lsData = lsRes.data?.items || lsRes.data?.data || lsRes.data || [];
          setLowStockItems(Array.isArray(lsData) ? lsData.slice(0, 8) : []);
        } catch { /* silent */ }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <MainLayout title="Dashboard">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
          <CircularProgress />
        </Box>
      </MainLayout>
    );
  }

  if (noBranch) {
    return (
      <MainLayout title="Dashboard">
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 3,
          }}
        >
          <Box
            sx={{
              width: 80, height: 80, borderRadius: '50%', bgcolor: '#fff3e0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <WarningAmberIcon sx={{ fontSize: 48, color: '#ed6c02' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} mb={1}>No Branch Assigned</Typography>
            <Typography variant="body1" color="text.secondary" maxWidth={440}>
              Your account has not been assigned to a store branch yet.
              Please contact your administrator to set up your branch assignment.
            </Typography>
          </Box>
          <Box
            sx={{
              p: 2, bgcolor: '#fff3e0', borderRadius: 2, border: '1px solid #ffe0b2',
              maxWidth: 380,
            }}
          >
            <Typography variant="body2" color="#e65100">
              Once assigned, your dashboard will display sales, invoices, and inventory data specific to your store branch.
            </Typography>
          </Box>
        </Box>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Dashboard">
      {/* Branch banner for regular users */}
      {!isAdmin && branchInfo && (
        <Box
          sx={{
            mb: 3, p: 2, borderRadius: 2,
            background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
            color: 'white', display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          <StoreIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>{branchInfo.name}</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Branch Dashboard — Showing data for your assigned store branch
            </Typography>
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin ? 'System-wide overview' : `Branch: ${branchInfo?.name || 'Loading...'}`}
          </Typography>
        </Box>
        <Badge badgeContent={notifBadge} color="error">
          <IconButton onClick={() => setNotifBadge(0)}>
            <NotificationsIcon />
          </IconButton>
        </Badge>
      </Box>

      {/* ── Row 1: 6 Stats Cards ── */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Total Inventory"
            value={stats.totalInventoryItems}
            icon={<InventoryIcon />}
            color="#1565c0"
            subtitle="Items in stock"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Customers"
            value={stats.totalCustomers}
            icon={<PeopleIcon />}
            color="#2e7d32"
            subtitle="Registered"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Suppliers"
            value={stats.totalSuppliers}
            icon={<LocalShippingIcon />}
            color="#e65100"
            subtitle="Active"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Branches"
            value={stats.totalBranches}
            icon={<BusinessIcon />}
            color="#00838f"
            subtitle="Store branches"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Monthly Sales"
            value={`₱${fmtCurrency(stats.monthlySales)}`}
            icon={<AttachMoneyIcon />}
            color="#6a1b9a"
            subtitle="This month"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <StatsCard
            title="Pending POs"
            value={stats.pendingPOs}
            icon={<ShoppingCartIcon />}
            color={stats.pendingPOs > 0 ? '#d32f2f' : '#0277bd'}
            subtitle="Awaiting approval"
          />
        </Grid>
      </Grid>

      {/* ── Row 2: Line chart + Pie chart ── */}
      <Grid container spacing={3} mb={3}>
        {/* Line Chart - 6 months sales */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ borderRadius: 2, p: 2, height: 340 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Sales & Purchase Orders — Last 6 Months
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlySalesChart} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={fmtYAxis} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`₱${value.toLocaleString('en-PH')}`, undefined]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#1565c0"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Sales"
                />
                <Line
                  type="monotone"
                  dataKey="pos"
                  stroke="#e65100"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Purchase Orders"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Pie Chart - Stock distribution */}
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ borderRadius: 2, p: 2, height: 340 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Stock Status Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stockDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  dataKey="value"
                  label={renderPieLabel}
                  labelLine={false}
                >
                  {stockDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, undefined]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Row 3: Recent Invoices + Notifications ── */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={7}>
          <Paper elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>Recent Invoices</Typography>
            </Box>
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.100' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          No recent invoices
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInvoices.map((inv, idx) => (
                      <TableRow key={inv._id || inv.id || idx} hover>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {inv.invoiceNumber || inv.number || `INV-${idx + 1}`}
                        </TableCell>
                        <TableCell>{inv.customerName || inv.customer?.name || '—'}</TableCell>
                        <TableCell>₱{fmtCurrency(inv.total || inv.totalAmount || 0)}</TableCell>
                        <TableCell>
                          <Chip
                            label={inv.status || 'pending'}
                            size="small"
                            color={STATUS_COLORS[inv.status?.toLowerCase()] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell>
                          {inv.createdAt
                            ? dayjs(inv.createdAt).format('MMM DD, YYYY')
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          <Paper elevation={2} sx={{ borderRadius: 2, height: '100%' }}>
            <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="subtitle1" fontWeight={700}>Notifications</Typography>
              {stats.lowStockCount > 0 && (
                <Chip
                  label={`${stats.lowStockCount} Low Stock`}
                  size="small"
                  color="error"
                  icon={<WarningAmberIcon />}
                />
              )}
            </Box>
            <Divider />
            <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
              <NotificationList items={notifications} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Row 4: Top 5 products bar chart ── */}
      <Paper elevation={2} sx={{ borderRadius: 2, p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>
          Top 5 Products by Quantity
        </Typography>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={topProducts}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
            <Tooltip />
            <Bar dataKey="quantity" fill="#1565c0" radius={[0, 4, 4, 0]} name="Qty" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* ── Stock Alerts Panel ── */}
      {lowStockItems.length > 0 && (
        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', mt: 3 }}>
          <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#fff3e0', display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            <WarningAmberIcon sx={{ color: '#e65100' }} />
            <Typography variant="subtitle1" fontWeight={700} color="#e65100">
              Stock Alerts — {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need attention
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Brand</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Warehouse</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lowStockItems.map((item, idx) => {
                  const isOut = item.stockStatus === 'out_of_stock' || item.stockStatus === 'Out of Stock';
                  return (
                    <TableRow
                      key={item._id || idx}
                      sx={{ bgcolor: isOut ? '#fff5f5' : '#fffde7' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {item.productName?.name || item.product?.name || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.brand?.name || '—'}</TableCell>
                      <TableCell>{item.warehouse?.name || '—'}</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700} color={isOut ? 'error.main' : 'warning.main'}>
                          {item.quantity ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={isOut ? 'Out of Stock' : 'Low Stock'}
                          size="small"
                          color={isOut ? 'error' : 'warning'}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </MainLayout>
  );
}
