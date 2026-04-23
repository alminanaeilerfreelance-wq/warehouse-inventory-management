import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import Image from 'next/image';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';

import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import StorageIcon from '@mui/icons-material/Storage';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import CategoryIcon from '@mui/icons-material/Category';
import PlaceIcon from '@mui/icons-material/Place';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import TuneIcon from '@mui/icons-material/Tune';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import BuildIcon from '@mui/icons-material/Build';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PaymentsIcon from '@mui/icons-material/Payments';
import HistoryIcon from '@mui/icons-material/History';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { getNotifications } from '../../utils/api';

const DRAWER_WIDTH = 264;

// ─── Nav tree ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    href: '/dashboard',
  },
  {
    group: 'Data Management',
    label: 'Master Data',
    icon: <StorageIcon />,
    children: [
      { label: 'Brands', href: '/master/brands' },
      { label: 'Designs', href: '/master/designs' },
      { label: 'Customers', href: '/master/customers', icon: <PeopleIcon /> },
      { label: 'Suppliers', href: '/master/suppliers', icon: <BusinessIcon /> },
      { label: 'Employees', href: '/master/employees', icon: <PeopleIcon /> },
      { label: 'Categories', href: '/master/categories', icon: <CategoryIcon /> },
      { label: 'Products', href: '/master/products', icon: <InventoryIcon /> },
      { label: 'Zones', href: '/master/zones', icon: <PlaceIcon /> },
      { label: 'Bins', href: '/master/bins', icon: <PlaceIcon /> },
      { label: 'Racks', href: '/master/racks', icon: <PlaceIcon /> },
      { label: 'Locations', href: '/master/locations', icon: <PlaceIcon /> },
      { label: 'Warehouses', href: '/master/warehouses', icon: <BusinessIcon /> },
      { label: 'Store Branches', href: '/master/store-branches', icon: <BusinessIcon /> },
      { label: 'Calendar', href: '/master/calendar', icon: <CalendarMonthIcon /> },
      { label: 'Types', href: '/master/types', icon: <TuneIcon /> },
      { label: 'Units', href: '/master/units', icon: <TuneIcon /> },
      { label: 'Services', href: '/master/services', icon: <BuildIcon /> },
      { label: 'Expenses', href: '/master/expenses', icon: <ReceiptIcon /> },
    ],
  },
  {
    group: 'Operations',
    label: 'Inventory',
    icon: <InventoryIcon />,
    children: [
      { label: 'Stock List', href: '/inventory' },
      { label: 'Adjustment', href: '/inventory/adjustment' },
      { label: 'Scanner', href: '/inventory/scanner', icon: <QrCodeScannerIcon /> },
      { label: 'Bulk Import', href: '/inventory/bulk-import', icon: <CloudUploadIcon /> },
    ],
  },
  {
    label: 'Invoices',
    icon: <ReceiptIcon />,
    children: [
      { label: 'Customer Invoices', href: '/invoices/customer' },
      { label: 'Service Invoices', href: '/invoices/service' },
      { label: 'Purchase Orders', href: '/invoices/purchase-orders', icon: <ShoppingCartIcon /> },
      { label: 'Return Orders', href: '/invoices/return-orders' },
      { label: 'Payments', href: '/invoices/payments', icon: <PaymentsIcon /> },
    ],
  },
  {
    label: 'Transfer Orders',
    icon: <SwapHorizIcon />,
    href: '/transfers',
  },
  {
    group: 'Analytics',
    label: 'Reports',
    icon: <AssessmentIcon />,
    children: [
      { label: 'Sales Report', href: '/reports/sales' },
      { label: 'Services Report', href: '/reports/services' },
      { label: 'Supplier Report', href: '/reports/supplier' },
    ],
  },
  {
    group: 'System',
    label: 'Users',
    icon: <ManageAccountsIcon />,
    href: '/users',
  },
  {
    group: 'System',
    label: 'Settings',
    icon: <SettingsIcon />,
    children: [
      { label: 'Company', href: '/settings/company' },
      { label: 'General', href: '/settings/general' },
    ],
  },
];

// ─── Single nav item (leaf) ───────────────────────────────────────────────────
function NavLeaf({ label, href, icon, depth = 1, onNavigate, isActive }) {
  const active = isActive;

  return (
    <ListItemButton
      component={NextLink}
      href={href}
      onClick={onNavigate}
      selected={active}
      sx={{
        pl: depth === 0 ? 2 : depth * 2 + 1.5,
        pr: 1.5,
        borderRadius: 1.5,
        mx: 1,
        mb: 0.25,
        minHeight: 36,
        position: 'relative',
        transition: 'background-color 0.15s ease',
        '&.Mui-selected': {
          bgcolor: '#e3f2fd',
          color: '#1565c0',
          borderLeft: '3px solid #1565c0',
          pl: depth === 0 ? 1.625 : depth * 2 + 1.125,
          '& .MuiListItemIcon-root': { color: '#1565c0' },
          '&:hover': { bgcolor: '#d6eaf8' },
        },
        '&:not(.Mui-selected):hover': {
          bgcolor: 'rgba(21,101,192,0.06)',
        },
      }}
    >
      {icon && (
        <ListItemIcon
          sx={{
            minWidth: 30,
            '& .MuiSvgIcon-root': { fontSize: 18 },
          }}
        >
          {icon}
        </ListItemIcon>
      )}
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontSize: depth === 0 ? 14 : 13,
          fontWeight: active ? 600 : 400,
          lineHeight: 1.4,
        }}
      />
    </ListItemButton>
  );
}

// ─── Expandable parent nav item ───────────────────────────────────────────────
function NavParent({ label, icon, children, onNavigate, groupLabel }) {
  const router = useRouter();
  const isChildActive = children.some((c) => router.pathname === c.href || router.pathname.startsWith(c.href + '/'));
  const [open, setOpen] = useState(isChildActive);

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((o) => !o)}
        sx={{
          borderRadius: 1.5,
          mx: 1,
          mb: 0.25,
          minHeight: 38,
          transition: 'background-color 0.15s ease',
          '&:hover': { bgcolor: 'rgba(21,101,192,0.06)' },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 34,
            color: isChildActive ? '#1565c0' : 'text.secondary',
            '& .MuiSvgIcon-root': { fontSize: 20 },
          }}
        >
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: 14,
            fontWeight: isChildActive ? 600 : 500,
            color: isChildActive ? '#1565c0' : 'text.primary',
          }}
        />
        {open
          ? <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          : <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        }
      </ListItemButton>

      <Collapse in={open} timeout={200} unmountOnExit>
        <List disablePadding>
          {children.map((child) => {
            const childActive = router.pathname === child.href || router.pathname.startsWith(child.href + '/');
            return (
              <NavLeaf
                key={child.href}
                label={child.label}
                href={child.href}
                icon={child.icon}
                depth={1}
                onNavigate={onNavigate}
                isActive={childActive}
              />
            );
          })}
        </List>
      </Collapse>
    </>
  );
}

// ─── Group header ─────────────────────────────────────────────────────────────
function NavGroupHeader({ label }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: 'block',
        px: 2.5,
        pt: 2,
        pb: 0.5,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: 'text.disabled',
        fontVariant: 'small-caps',
        userSelect: 'none',
      }}
    >
      {label}
    </Typography>
  );
}

// ─── Drawer content ───────────────────────────────────────────────────────────
function DrawerContent({ onNavigate, company, user }) {
  const router = useRouter();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const navItems = [
    ...NAV_ITEMS,
    ...(isAdmin
      ? [{ group: 'System', label: 'Audit Log', icon: <HistoryIcon />, href: '/audit-log' }]
      : []),
  ];

  // Track rendered groups to avoid duplicate headers
  const renderedGroups = new Set();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ── Logo / brand ── */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: 'linear-gradient(145deg, #0d1b3e 0%, #1a2f6b 60%, #0d47a1 100%)',
          color: '#fff',
          minHeight: 68,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        {company.logo ? (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              overflow: 'hidden',
              position: 'relative',
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              flexShrink: 0,
            }}
          >
            <Image src={company.logo} alt="logo" fill style={{ objectFit: 'contain' }} />
          </Box>
        ) : (
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarehouseIcon sx={{ fontSize: 22, color: '#fff' }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            lineHeight={1.2}
            noWrap
            sx={{ color: '#fff' }}
          >
            {company.name || 'WMS Pro'}
          </Typography>
          <Chip
            label="WMS Pro"
            size="small"
            sx={{
              height: 16,
              fontSize: 9,
              fontWeight: 700,
              bgcolor: 'rgba(100,181,246,0.25)',
              color: '#90caf9',
              border: '1px solid rgba(100,181,246,0.3)',
              mt: 0.3,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        </Box>
      </Box>

      {/* ── Nav list ── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        <List disablePadding>
          {navItems.map((item, idx) => {
            const showGroupHeader = item.group && !renderedGroups.has(item.group);
            if (item.group) renderedGroups.add(item.group);

            const isLeafActive = !item.children && (router.pathname === item.href);

            return (
              <React.Fragment key={item.href || item.label}>
                {showGroupHeader && <NavGroupHeader label={item.group} />}
                {item.children ? (
                  <NavParent
                    label={item.label}
                    icon={item.icon}
                    children={item.children}
                    onNavigate={onNavigate}
                  />
                ) : (
                  <NavLeaf
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    depth={0}
                    onNavigate={onNavigate}
                    isActive={isLeafActive}
                  />
                )}
              </React.Fragment>
            );
          })}
        </List>
      </Box>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: '#fafafa',
        }}
      >
        <Typography variant="caption" color="text.disabled" display="block" sx={{ fontSize: 10 }}>
          {company.name || 'WMS Pro'} &bull; v1.0.0
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Page title from route ────────────────────────────────────────────────────
function usePageTitle(navItems) {
  const router = useRouter();

  const findLabel = (items) => {
    for (const item of items) {
      if (item.href && router.pathname === item.href) return item.label;
      if (item.children) {
        const match = item.children.find(
          (c) => router.pathname === c.href || router.pathname.startsWith(c.href + '/')
        );
        if (match) return match.label;
      }
    }
    return null;
  };

  return findLabel(navItems) || 'Dashboard';
}

// ─── Main layout ──────────────────────────────────────────────────────────────
export default function MainLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const { user, logout } = useAuth();
  const { company } = useSettings();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifAnchor, setNotifAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  const pageTitle = usePageTitle(NAV_ITEMS);

  // Fetch notification count
  useEffect(() => {
    getNotifications()
      .then((res) => {
        const data = res.data.data || res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setNotifCount(items.filter((n) => !n.read).length);
      })
      .catch(() => {});
  }, []);

  const handleDrawerClose = useCallback(() => setMobileOpen(false), []);
  const handleDrawerToggle = useCallback(() => setMobileOpen((o) => !o), []);

  const handleUserMenuOpen = (e) => setUserAnchor(e.currentTarget);
  const handleUserMenuClose = () => setUserAnchor(null);
  const handleNotifOpen = (e) => setNotifAnchor(e.currentTarget);
  const handleNotifClose = () => setNotifAnchor(null);

  const handleLogout = () => {
    handleUserMenuClose();
    logout();
  };

  const drawerSx = {
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: DRAWER_WIDTH,
      boxSizing: 'border-box',
      border: 'none',
      boxShadow: '2px 0 8px rgba(0,0,0,0.06)',
    },
  };

  // User initials
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : 'User';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── AppBar ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          bgcolor: '#fff',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: 64, gap: 1 }}>
          {/* Hamburger */}
          <IconButton
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ color: 'text.secondary', mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          {/* Breadcrumb-style page title */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', fontSize: 12, display: { xs: 'none', sm: 'block' } }}
            >
              {company.name || 'WMS Pro'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.disabled', display: { xs: 'none', sm: 'block' } }}
            >
              /
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary">
              {pageTitle}
            </Typography>
          </Box>

          {/* Notification bell */}
          <Tooltip title="Notifications">
            <IconButton onClick={handleNotifOpen} sx={{ color: 'text.secondary' }}>
              <Badge badgeContent={notifCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={notifAnchor}
            open={Boolean(notifAnchor)}
            onClose={handleNotifClose}
            PaperProps={{
              sx: { minWidth: 260, borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            </Box>
            <Divider />
            <MenuItem disabled sx={{ py: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {notifCount > 0 ? `${notifCount} unread notification${notifCount !== 1 ? 's' : ''}` : 'No new notifications'}
              </Typography>
            </MenuItem>
          </Menu>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5 }} />

          {/* User avatar + name + role */}
          <Tooltip title="Account menu">
            <Box
              onClick={handleUserMenuOpen}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1,
                py: 0.5,
                borderRadius: 2,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  bgcolor: '#1565c0',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {userInitials}
              </Avatar>
              <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="caption" fontWeight={600} display="block" lineHeight={1.3}>
                  {user?.name || 'User'}
                </Typography>
                <Chip
                  label={roleLabel}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 9,
                    fontWeight: 700,
                    bgcolor: user?.role === 'admin' || user?.role === 'superadmin' ? '#e3f2fd' : '#f3e5f5',
                    color: user?.role === 'admin' || user?.role === 'superadmin' ? '#1565c0' : '#6a1b9a',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Box>
            </Box>
          </Tooltip>

          {/* User menu */}
          <Menu
            anchorEl={userAnchor}
            open={Boolean(userAnchor)}
            onClose={handleUserMenuClose}
            PaperProps={{
              sx: { minWidth: 220, borderRadius: 2, mt: 0.5, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {/* User info header */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>{user?.name || 'User'}</Typography>
              <Typography variant="caption" color="text.secondary">{user?.email || user?.username || ''}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => { handleUserMenuClose(); router.push('/profile'); }}
              sx={{ py: 1.2, gap: 1.5 }}
            >
              <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">Profile</Typography>
            </MenuItem>
            <MenuItem
              onClick={() => { handleUserMenuClose(); router.push('/change-password'); }}
              sx={{ py: 1.2, gap: 1.5 }}
            >
              <LockResetIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2">Change Password</Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout} sx={{ py: 1.2, gap: 1.5 }}>
              <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
              <Typography variant="body2" color="error.main" fontWeight={500}>Logout</Typography>
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Permanent drawer — desktop ── */}
      {!isMobile && (
        <Drawer variant="permanent" sx={drawerSx} open>
          <Toolbar sx={{ minHeight: 64 }} />
          <DrawerContent onNavigate={() => {}} company={company} user={user} />
        </Drawer>
      )}

      {/* ── Temporary drawer — mobile ── */}
      {isMobile && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          ModalProps={{ keepMounted: true }}
          sx={drawerSx}
        >
          <DrawerContent onNavigate={handleDrawerClose} company={company} user={user} />
        </Drawer>
      )}

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: 8,
          minHeight: '100vh',
          bgcolor: '#f5f7fa',
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
