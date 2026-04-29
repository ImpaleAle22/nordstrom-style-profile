/**
 * Global Navigation Component
 *
 * Updated April 28, 2026: Streamlined navigation with 5 main categories
 * - Recipes: Direct link to recipe management
 * - Outfits: Browse, Cook, Validate
 * - Tagging: Tag Outfits, Coverage, Analysis (PRIMARY WORKFLOW)
 * - Products: Coverage, Vision Import, CLIP Search
 * - Data: Export, Analytics
 */

'use client';

import { useState } from 'react';
import { AppBar, Toolbar, Button, Box, Typography, Menu, MenuItem } from '@mui/material';
import {
  Restaurant as RecipeIcon,
  Checkroom as OutfitIcon,
  LocalOffer as TagIcon,
  Inventory as ProductIcon,
  Build as ToolsIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  icon: JSX.Element;
  primary?: boolean;
  type: 'link' | 'dropdown' | 'button-dropdown';
  href?: string; // For single links
  items?: { label: string; href: string }[]; // For dropdowns
  onClick?: () => void; // For button actions
}

export default function AppNav() {
  const pathname = usePathname();
  const [anchorEls, setAnchorEls] = useState<{ [key: string]: HTMLElement | null }>({});

  const handleMenuOpen = (label: string, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEls({ ...anchorEls, [label]: event.currentTarget });
  };

  const handleMenuClose = (label: string) => {
    setAnchorEls({ ...anchorEls, [label]: null });
  };

  const navItems: NavItem[] = [
    {
      label: 'Recipes',
      icon: <RecipeIcon />,
      type: 'link',
      href: '/recipes',
    },
    {
      label: 'Outfits',
      icon: <OutfitIcon />,
      type: 'dropdown',
      items: [
        { label: 'Browse Outfits', href: '/outfits' },
        { label: 'Cook Outfits', href: '/cooker' },
        { label: 'Validate Outfits', href: '/outfits/validate' },
      ],
    },
    {
      label: 'Tagging',
      icon: <TagIcon />,
      primary: true, // Highlight as primary workflow
      type: 'dropdown',
      items: [
        { label: 'Tag Outfits', href: '/test-tagging' },
        { label: 'Outfit Coverage', href: '/outfit-coverage' },
        { label: 'Auto Analysis', href: '/auto-analysis' },
      ],
    },
    {
      label: 'Products',
      icon: <ProductIcon />,
      type: 'dropdown',
      items: [
        { label: 'Product Coverage', href: '/products' },
        { label: 'Vision Import', href: '/vision-import' },
        { label: 'CLIP Search', href: '/clip-search' },
      ],
    },
    {
      label: 'Data',
      icon: <ToolsIcon />,
      type: 'dropdown',
      items: [
        { label: 'Export Data', href: '/export-indexeddb' },
        { label: 'Analytics', href: '/analytics' },
      ],
    },
  ];

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Recipe Builder
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
          {navItems.map((item) => {
            if (item.type === 'link') {
              // Single link button
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.label}
                  component={Link}
                  href={item.href!}
                  startIcon={item.icon}
                  variant={isActive ? 'contained' : 'text'}
                  color={isActive ? 'primary' : 'inherit'}
                >
                  {item.label}
                </Button>
              );
            } else {
              // Dropdown menu
              const isOpen = Boolean(anchorEls[item.label]);
              const isActive = item.items?.some(subItem => pathname === subItem.href) || false;

              return (
                <Box key={item.label}>
                  <Button
                    startIcon={item.icon}
                    endIcon={<ArrowDownIcon />}
                    onClick={(e) => handleMenuOpen(item.label, e)}
                    variant={isActive ? 'contained' : 'text'}
                    color={item.primary ? 'primary' : isActive ? 'primary' : 'inherit'}
                    sx={{
                      ...(item.primary && !isActive && {
                        bgcolor: 'primary.50',
                        color: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.100',
                        },
                      }),
                    }}
                  >
                    {item.label}
                  </Button>
                  <Menu
                    anchorEl={anchorEls[item.label]}
                    open={isOpen}
                    onClose={() => handleMenuClose(item.label)}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'left',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'left',
                    }}
                  >
                    {item.items?.map((subItem) => (
                      <MenuItem
                        key={subItem.href}
                        component={Link}
                        href={subItem.href}
                        onClick={() => handleMenuClose(item.label)}
                        selected={pathname === subItem.href}
                      >
                        {subItem.label}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              );
            }
          })}
        </Box>

      </Toolbar>
    </AppBar>
  );
}
