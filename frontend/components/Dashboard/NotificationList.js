import React from 'react';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const TYPE_CONFIG = {
  lowStock: {
    icon: <InventoryIcon fontSize="small" />,
    color: '#f44336',
    label: 'Low Stock',
  },
  invoice: {
    icon: <ReceiptIcon fontSize="small" />,
    color: '#1565c0',
    label: 'Invoice',
  },
  approval: {
    icon: <ThumbUpAltIcon fontSize="small" />,
    color: '#4caf50',
    label: 'Approval',
  },
};

/**
 * NotificationList
 *
 * Props:
 *   items  {Array<{ type: 'lowStock'|'invoice'|'approval', message, createdAt, id }>}
 */
export default function NotificationList({ items = [] }) {
  if (!items.length) {
    return (
      <List>
        <ListItem>
          <ListItemAvatar>
            <Avatar sx={{ bgcolor: 'grey.300' }}>
              <NotificationsNoneIcon />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary="No notifications"
            secondary="You are all caught up!"
          />
        </ListItem>
      </List>
    );
  }

  return (
    <List disablePadding>
      {items.map((item, idx) => {
        const config = TYPE_CONFIG[item.type] || {
          icon: <NotificationsNoneIcon fontSize="small" />,
          color: '#607d8b',
          label: item.type || 'Notification',
        };

        const timeAgo = item.createdAt
          ? dayjs(item.createdAt).fromNow()
          : '';

        return (
          <React.Fragment key={item.id || idx}>
            <ListItem alignItems="flex-start" sx={{ py: 1 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: config.color, width: 36, height: 36 }}>
                  {config.icon}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500}>
                    {item.message}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {config.label}
                    {timeAgo ? ` · ${timeAgo}` : ''}
                  </Typography>
                }
              />
            </ListItem>
            {idx < items.length - 1 && <Divider component="li" />}
          </React.Fragment>
        );
      })}
    </List>
  );
}
