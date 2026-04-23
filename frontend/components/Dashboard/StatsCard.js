import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * StatsCard
 *
 * Props:
 *   title    {string}
 *   value    {string|number}
 *   icon     {React.ReactNode}
 *   color    {string}   — hex e.g. '#1565c0'
 *   subtitle {string}   — optional secondary line
 *   trend    {number}   — optional percentage, positive=green, negative=red
 */
export default function StatsCard({
  title,
  value,
  icon,
  color = '#1565c0',
  subtitle,
  trend,
}) {
  const hasTrend = trend !== undefined && trend !== null;
  const trendPositive = hasTrend && trend >= 0;
  const trendColor = trendPositive ? '#2e7d32' : '#c62828';
  const trendBg = trendPositive ? '#e8f5e9' : '#ffebee';

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        borderLeft: `4px solid ${color}`,
        height: '100%',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          {/* Icon box */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              flexShrink: 0,
              '& .MuiSvgIcon-root': { fontSize: 22 },
            }}
          >
            {icon}
          </Box>

          {/* Trend chip */}
          {hasTrend && (
            <Chip
              size="small"
              icon={
                trendPositive
                  ? <TrendingUpIcon style={{ fontSize: 14, color: trendColor }} />
                  : <TrendingDownIcon style={{ fontSize: 14, color: trendColor }} />
              }
              label={`${trendPositive ? '+' : ''}${trend}%`}
              sx={{
                height: 22,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: trendBg,
                color: trendColor,
                border: 'none',
                '& .MuiChip-icon': { ml: 0.5 },
              }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            color: 'text.secondary',
            fontSize: 10,
            display: 'block',
            mb: 0.5,
            fontVariant: 'small-caps',
          }}
        >
          {title}
        </Typography>

        {/* Value */}
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{ color: 'text.primary', lineHeight: 1.1, mb: subtitle ? 0.5 : 0 }}
        >
          {value ?? 0}
        </Typography>

        {/* Subtitle */}
        {subtitle && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
